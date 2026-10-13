import Keycloak, { type KeycloakInitOptions } from "keycloak-js"
import { clearPendingPrompt } from "@/features/planning/pendingPrompt"
import {
  authRedirects,
  discoveryUrl,
  readAuthConfig,
  type AuthConfig,
} from "./authConfig"
import {
  dismissAuthNotice,
  queueArrivalNotice,
  showAuthNotice,
} from "./authNotices"
import { inspectAuthResponse, removeAuthResponse } from "./authResponse"
import {
  clearReturnDestination,
  saveReturnDestination,
  takeReturnDestination,
} from "./returnDestination"

/**
 * The application's authentication session (FEATURE-002 §4, §5, §7, §9).
 *
 * This is the only file that imports the OIDC adapter. It runs the
 * Authorization Code flow with PKCE (S256) against the identity provider and
 * owns the one auth state the rest of the application reads.
 *
 * Tokens live in the adapter's memory and nowhere else: they are not written
 * to web storage, a cookie, a URL, or the console. After a reload the session
 * comes back from the identity provider's own session, through a hidden-frame
 * check, and never from a copy kept here. Every doubt (a timeout, an
 * unreachable provider, a response that does not validate) ends signed out.
 */

export type AuthStatus =
  | "initializing"
  | "unauthenticated"
  | "redirecting"
  | "callback-processing"
  | "authenticated"
  | "callback-failed"
  | "session-expired"
  | "signing-out"
  | "signed-out"

/** The control that started the trip to the identity provider. */
export type AuthEntry = "navigation" | "gate-sign-in" | "gate-create-account"

export type AuthSnapshot = {
  status: AuthStatus
  /**
   * Name to show for the signed-in user: the `name` claim, else `email`, else
   * `preferred_username`; null when none is present (D19).
   */
  displayName: string | null
  /** Set while `redirecting`: the control that is working. */
  entry: AuthEntry | null
  /** Set by a completed sign-in: the route to open, already validated. */
  destination: string | null
}

/** Raised by `getAccessToken` when there is no session to take a token from. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated")
    this.name = "NotAuthenticatedError"
  }
}

/** Longest any waiting state lasts; inside the 10-second bound of §5. */
const WAIT_LIMIT_MS = 9_000
/** Longest the application waits to learn whether the provider answers. */
const REACHABILITY_LIMIT_MS = 4_000
/** How long before expiry the access token is renewed. */
const RENEWAL_LEAD_MS = 30_000
/** Shortest gap between two session checks caused by navigation or focus. */
const VERIFY_GAP_MS = 2_000

/**
 * Set when sign-out leaves for the identity provider and read once by the
 * next load of the application in this tab, which is how that load knows to
 * report the outcome. It says that a sign-out was started, nothing about
 * anyone being signed in, and no code path grants access because of it.
 */
const SIGN_OUT_MARKER_KEY = "outdoor-trip-companion.sign-out-started"

/**
 * Set when this tab becomes authenticated, read once at startup, and removed
 * when it is read, on sign-out, and when the session ends here (D27). It holds
 * a constant: no token, no identity. It has one effect: when the startup check
 * finds that no session exists, a tab that held one is told that its session
 * has ended (X1) instead of being treated as a first-time visitor. It never
 * opens a route and is read nowhere but in `initialize`.
 */
const SESSION_HELD_MARKER_KEY = "outdoor-trip-companion.session-held"

/** Settings shared by every initialization: code flow, PKCE S256, no logging. */
const BASE_INIT: KeycloakInitOptions = {
  flow: "standard",
  responseMode: "fragment",
  pkceMethod: "S256",
  useNonce: true,
  // The adapter's five-second session polling frame is not used; the session
  // is checked on renewal, on navigation, and when the tab is shown again.
  checkLoginIframe: false,
  enableLogging: false,
}

let state: AuthSnapshot = {
  status: "initializing",
  displayName: null,
  entry: null,
  destination: null,
}

const listeners = new Set<() => void>()
const sessionCleanups = new Set<() => void>()

let started = false
let config: AuthConfig | null = null
let keycloak: Keycloak | null = null

/** Ends the startup check early, when the visitor starts sign-in first. */
let abandonInitialization: (() => void) | null = null
let renewalTimer: number | undefined
let redirectTimer: number | undefined
let signOutTimer: number | undefined
let redirectAttempt = 0
let lastVerifiedAt = 0

function setState(patch: Partial<AuthSnapshot>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribeToAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAuthSnapshot(): AuthSnapshot {
  return state
}

/**
 * Registers something to discard whenever a session ends in this tab (for
 * example cached server data). Returns a function that removes it.
 */
export function registerSessionCleanup(cleanup: () => void): () => void {
  sessionCleanups.add(cleanup)
  return () => {
    sessionCleanups.delete(cleanup)
  }
}

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */

/**
 * Starts authentication. Called once, before the first render; a second call
 * (React StrictMode, hot reload of a caller) does nothing.
 */
export function startAuthSession(): void {
  if (started) {
    return
  }
  started = true

  window.addEventListener("pageshow", handlePageShow)
  document.addEventListener("visibilitychange", handleVisibilityChange)

  void initialize()
}

type InitOutcome = "authenticated" | "no-session" | "unknown"

async function initialize(): Promise<void> {
  const signOutStarted = takeSignOutMarker()
  const heldSession = takeSessionHeldMarker()
  const response = inspectAuthResponse()

  config = readAuthConfig()
  keycloak = config === null ? null : createClient(config)

  if (response.kind === "failed") {
    // Prepared without any request, so that Sign in can still build its own.
    if (keycloak !== null) {
      await boundedInit(keycloak, BASE_INIT)
    }
    failCallback(response.reason)
    return
  }

  if (response.kind === "code") {
    setState({ status: "callback-processing" })

    // The adapter validates the state and the nonce and exchanges the code.
    const outcome =
      keycloak === null ? "unknown" : await boundedInit(keycloak, BASE_INIT)

    // The adapter has already done this; it is repeated so that the code
    // cannot stay in the address bar on any path that ends here.
    removeAuthResponse()

    if (outcome === "authenticated") {
      enterAuthenticated(takeReturnDestination())
    } else {
      failCallback("failed")
    }
    return
  }

  // No response in the address: ask whether a session already exists. The
  // check runs in a hidden frame with `prompt=none`; it never shows a page of
  // the identity provider and never navigates this window (D25).
  const outcome =
    keycloak === null || config === null
      ? "unknown"
      : await boundedInit(
          keycloak,
          {
            ...BASE_INIT,
            onLoad: "check-sso",
            silentCheckSsoRedirectUri: authRedirects.silentCheck(),
            // Without this the adapter would fall back to a full-page redirect.
            silentCheckSsoFallback: false,
          },
          config,
        )

  if (state.status !== "initializing") {
    // The visitor started sign-in while the check was running; that attempt
    // owns the state now.
    return
  }

  if (signOutStarted) {
    // A sign-out left from this tab. It is reported as done only when the
    // provider has just confirmed that no session is left.
    if (outcome === "authenticated") {
      keycloak?.clearToken()
    }
    setState({ status: "signed-out" })
    queueArrivalNotice(
      outcome === "no-session" ? "O1" : "O2",
      openedOffLanding(),
    )
    return
  }

  if (outcome === "authenticated") {
    // A restored session is not a sign-in started from the gate.
    clearReturnDestination()
    enterAuthenticated(null)
    return
  }

  if (heldSession && outcome === "no-session") {
    // The provider has just answered that no session exists, and this tab
    // held one: it ended elsewhere. Only that definite answer is reported.
    // When the answer is unknown (provider unreachable or too slow) the
    // session may still exist, so nothing is claimed and the tab is simply
    // unauthenticated.
    setState({ status: "session-expired" })
    queueArrivalNotice("X1", openedOffLanding())
    return
  }

  setState({ status: "unauthenticated" })
}

function createClient(clientConfig: AuthConfig): Keycloak | null {
  try {
    const client = new Keycloak({
      url: clientConfig.url,
      realm: clientConfig.realm,
      clientId: clientConfig.clientId,
    })

    client.onAuthRefreshSuccess = () => {
      if (state.status !== "authenticated") {
        return
      }
      lastVerifiedAt = Date.now()
      const displayName = readDisplayName(client)
      if (displayName !== state.displayName) {
        setState({ displayName })
      }
      scheduleRenewal(client)
    }
    // Reached when a renewal did not happen in time, for example after sleep.
    client.onTokenExpired = () => {
      void renewSession()
    }
    // The adapter dropped its tokens because the provider refused to renew them.
    client.onAuthLogout = () => {
      expireSession()
    }

    return client
  } catch {
    return null
  }
}

/**
 * Runs the adapter's initialization with an upper bound. When the bound is
 * reached, the provider does not answer, or the visitor moves on, the result
 * is "unknown" and a session that arrives afterwards is discarded.
 */
function boundedInit(
  client: Keycloak,
  options: KeycloakInitOptions,
  probe?: AuthConfig,
): Promise<InitOutcome> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (outcome: InitOutcome) => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timer)
      abandonInitialization = null
      resolve(outcome)
    }

    const timer = window.setTimeout(() => finish("unknown"), WAIT_LIMIT_MS)
    abandonInitialization = () => finish("unknown")

    if (probe !== undefined) {
      // A provider that refuses the connection is known at once; there is no
      // reason to keep a protected route waiting for the full bound.
      void isProviderReachable(probe).then((reachable) => {
        if (!reachable) {
          finish("unknown")
        }
      })
    }

    client.init(options).then(
      (authenticated) => {
        if (settled) {
          client.clearToken()
          return
        }
        finish(authenticated ? "authenticated" : "no-session")
      },
      () => finish("unknown"),
    )
  })
}

/** Whether the realm's public discovery document answers. Sends no credentials. */
async function isProviderReachable(target: AuthConfig): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(
    () => controller.abort(),
    REACHABILITY_LIMIT_MS,
  )

  try {
    const response = await fetch(discoveryUrl(target), {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ *
 * State changes
 * ------------------------------------------------------------------ */

function enterAuthenticated(destination: string | null) {
  const client = keycloak
  if (client === null) {
    return
  }

  lastVerifiedAt = Date.now()
  dismissAuthNotice()
  markSessionHeld()
  setState({
    status: "authenticated",
    displayName: readDisplayName(client),
    entry: null,
    destination,
  })
  scheduleRenewal(client)
}

function failCallback(reason: "cancelled" | "failed") {
  clearReturnDestination()
  setState({ status: "callback-failed", entry: null })
  queueArrivalNotice(
    reason === "cancelled" ? "F2" : "F1",
    openedOffLanding(),
  )
}

/** The session can no longer be renewed: close it here as well. */
function expireSession() {
  if (state.status !== "authenticated") {
    return
  }

  stopRenewal()
  // The ending is reported now; a reload must not report it a second time.
  takeSessionHeldMarker()
  setState({
    status: "session-expired",
    displayName: null,
    destination: null,
  })
  keycloak?.clearToken()
  runSessionCleanups()
  // A session only exists on routes other than the landing.
  queueArrivalNotice("X1", true)
}

/**
 * For a notice decided while the document is loading: true when the browser
 * was opened on a route other than the landing, which the landing will then
 * replace. Read once, at that moment.
 */
function openedOffLanding(): boolean {
  return window.location.pathname !== "/"
}

function runSessionCleanups() {
  sessionCleanups.forEach((cleanup) => cleanup())
}

/** D19: the `name` claim, then `email`, then `preferred_username`. */
function readDisplayName(client: Keycloak): string | null {
  const claims = client.idTokenParsed ?? client.tokenParsed

  for (const claim of ["name", "email", "preferred_username"]) {
    const value: unknown = claims?.[claim]
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return null
}

/**
 * The signed-in user's stable identifier: the `sub` claim, or null when
 * there is no session or the claim is missing.
 *
 * It exists so that state kept in this tab for one user (the planner's
 * conversation) is never restored for another. It is an identifier, not a
 * credential: no token and no other claim leaves this module through it. It
 * is never displayed and never logged.
 */
export function getAuthenticatedSubject(): string | null {
  if (state.status !== "authenticated" && state.status !== "signing-out") {
    return null
  }

  const claims = keycloak?.idTokenParsed ?? keycloak?.tokenParsed
  const subject: unknown = claims?.sub
  return typeof subject === "string" && subject !== "" ? subject : null
}

/* ------------------------------------------------------------------ *
 * Token renewal
 * ------------------------------------------------------------------ */

function stopRenewal() {
  window.clearTimeout(renewalTimer)
  renewalTimer = undefined
}

/** Renews shortly before the access token expires, without user action. */
function scheduleRenewal(client: Keycloak) {
  stopRenewal()

  const expiresAt = client.tokenParsed?.exp
  if (typeof expiresAt !== "number") {
    return
  }

  // `timeSkew` is the adapter's estimate of local time minus server time.
  const remaining = (expiresAt + (client.timeSkew ?? 0)) * 1000 - Date.now()
  const lead = Math.min(RENEWAL_LEAD_MS, remaining / 2)

  renewalTimer = window.setTimeout(
    () => void renewSession(),
    Math.max(remaining - lead, 1_000),
  )
}

function accessTokenExpired(client: Keycloak): boolean {
  try {
    return client.isTokenExpired(0)
  } catch {
    return true
  }
}

/**
 * Asks the identity provider for fresh tokens. A refusal means the session is
 * over (ended elsewhere, idle too long): the state becomes `session-expired`.
 * A request that could not be made leaves a still-valid token in place; the
 * adapter calls back when that token expires and the attempt is repeated.
 */
async function renewSession(): Promise<void> {
  const client = keycloak
  if (state.status !== "authenticated" || client === null) {
    return
  }

  try {
    await withTimeLimit(client.updateToken(-1))
  } catch {
    if (!client.authenticated || accessTokenExpired(client)) {
      expireSession()
    }
  }
}

function withTimeLimit<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Timed out")),
      WAIT_LIMIT_MS,
    )

    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error("Request failed"))
      },
    )
  })
}

/**
 * Checks that the session still exists, by renewing it. Used when the visitor
 * moves to a protected route or returns to the tab, so a session ended
 * elsewhere is noticed then and not only at the next scheduled renewal (§5).
 */
export function verifySession(): void {
  if (state.status !== "authenticated") {
    return
  }
  if (Date.now() - lastVerifiedAt < VERIFY_GAP_MS) {
    return
  }

  lastVerifiedAt = Date.now()
  void renewSession()
}

/**
 * The one way to obtain an access token that is valid now (§4.2). Renews it
 * first when it is about to expire. Rejects with `NotAuthenticatedError` when
 * there is no session. Attach the token only to requests for the
 * application's own API origin (S15).
 */
export async function getAccessToken(): Promise<string> {
  const client = keycloak
  if (state.status !== "authenticated" || client === null) {
    throw new NotAuthenticatedError()
  }

  try {
    await withTimeLimit(client.updateToken(RENEWAL_LEAD_MS / 1000))
  } catch {
    if (!client.authenticated || accessTokenExpired(client)) {
      expireSession()
    }
  }

  const token = client.token
  if (getAuthSnapshot().status !== "authenticated" || token === undefined) {
    throw new NotAuthenticatedError()
  }

  return token
}

/* ------------------------------------------------------------------ *
 * Sign-in and registration
 * ------------------------------------------------------------------ */

const CAN_START_FROM: ReadonlySet<AuthStatus> = new Set([
  "initializing",
  "unauthenticated",
  "callback-failed",
  "session-expired",
  "signed-out",
])

/**
 * Leaves for the identity provider's login page, or its registration page for
 * `gate-create-account`. Only ever called from a control the visitor
 * activated (§7). When the trip cannot start, the state returns to
 * `unauthenticated` and notice F3 is shown.
 */
export async function beginAuthentication(entry: AuthEntry): Promise<void> {
  if (!CAN_START_FROM.has(state.status)) {
    return
  }

  const client = keycloak
  const target = config
  redirectAttempt += 1
  const attempt = redirectAttempt

  const stillThisAttempt = () =>
    state.status === "redirecting" && attempt === redirectAttempt

  const reportUnavailable = () => {
    if (!stillThisAttempt()) {
      return
    }
    window.clearTimeout(redirectTimer)
    setState({ status: "unauthenticated", entry: null })
    showAuthNotice("F3", entry !== "navigation")
  }

  if (entry === "navigation") {
    // A new activation replaces whatever the message slot shows.
    dismissAuthNotice()
  }

  abandonInitialization?.()
  setState({ status: "redirecting", entry })

  // A control is never left working: if the browser is still here at the
  // bound, the attempt is reported as unavailable.
  window.clearTimeout(redirectTimer)
  redirectTimer = window.setTimeout(reportUnavailable, WAIT_LIMIT_MS)

  if (client === null || target === null) {
    reportUnavailable()
    return
  }

  if (!(await isProviderReachable(target))) {
    reportUnavailable()
    return
  }
  if (!stillThisAttempt()) {
    return
  }

  try {
    // The request carries a fresh state, nonce, and S256 code challenge, and a
    // fixed redirect address. Nothing the visitor typed is part of it.
    const options = { redirectUri: authRedirects.callback() }
    const url =
      entry === "gate-create-account"
        ? await client.createRegisterUrl(options)
        : await client.createLoginUrl(options)

    if (stillThisAttempt()) {
      window.location.assign(url)
    }
  } catch {
    reportUnavailable()
  }
}

/* ------------------------------------------------------------------ *
 * Protected routes
 * ------------------------------------------------------------------ */

/**
 * Called when a protected route finds that it must not render. Decides what
 * the landing will say and whether the route is remembered as the return
 * destination. It never starts a trip to the identity provider.
 */
export function noteProtectedRouteClosed(pathname: string): void {
  switch (state.status) {
    case "unauthenticated":
      saveReturnDestination(pathname)
      queueArrivalNotice("G3", true)
      break
    case "session-expired":
      // The notice is already waiting; signing in again continues here.
      saveReturnDestination(pathname)
      break
    default:
      // After a failed attempt or a sign-out there is nothing to return to.
      break
  }
}

/* ------------------------------------------------------------------ *
 * Sign-out
 * ------------------------------------------------------------------ */

/**
 * Ends both sessions (§9): the identity provider's, through its end-session
 * endpoint, and this tab's. The ID token hint is what lets the provider skip
 * its confirmation page; it is sent in a form body so that no token appears
 * in an address.
 */
export async function signOut(): Promise<void> {
  const client = keycloak
  const target = config
  if (state.status !== "authenticated" || client === null || target === null) {
    return
  }

  stopRenewal()
  setState({ status: "signing-out" })

  window.clearTimeout(signOutTimer)
  signOutTimer = window.setTimeout(() => {
    // Still here at the bound: give up on the request that is in flight.
    window.stop()
    finishUnconfirmedSignOut()
  }, WAIT_LIMIT_MS)

  const reachable = await isProviderReachable(target)
  // Read afresh: the state may have changed while the request was in flight.
  if (getAuthSnapshot().status !== "signing-out") {
    return
  }
  if (!reachable) {
    finishUnconfirmedSignOut()
    return
  }

  markSignOutStarted()
  try {
    await client.logout({
      redirectUri: authRedirects.signedOut(),
      logoutMethod: "POST",
    })
  } catch {
    finishUnconfirmedSignOut()
    return
  }

  // The form is on its way. Nothing of the session stays in this document,
  // which matters if the browser later restores it from its page cache.
  clearLocalSession(client)
}

/** Tokens, cached server data, the saved request, the return destination,
 *  and the marker that this tab held a session. */
function clearLocalSession(client: Keycloak) {
  client.clearToken()
  takeSessionHeldMarker()
  runSessionCleanups()
  clearPendingPrompt()
  clearReturnDestination()
}

/**
 * The provider could not be asked, or did not answer in time. Local state is
 * cleared all the same, and the landing says that sign-out is not confirmed.
 */
function finishUnconfirmedSignOut() {
  if (state.status !== "signing-out") {
    return
  }

  window.clearTimeout(signOutTimer)
  takeSignOutMarker()
  if (keycloak !== null) {
    clearLocalSession(keycloak)
  }
  setState({ status: "signed-out", displayName: null, destination: null })
  queueArrivalNotice("O2", true)
}

function markSessionHeld() {
  try {
    window.sessionStorage.setItem(SESSION_HELD_MARKER_KEY, "1")
  } catch {
    // Without the marker a later reload shows the gate instead of X1.
  }
}

/** Reads the marker once and removes it. */
function takeSessionHeldMarker(): boolean {
  try {
    const held = window.sessionStorage.getItem(SESSION_HELD_MARKER_KEY) !== null
    window.sessionStorage.removeItem(SESSION_HELD_MARKER_KEY)
    return held
  } catch {
    return false
  }
}

function markSignOutStarted() {
  try {
    window.sessionStorage.setItem(SIGN_OUT_MARKER_KEY, "1")
  } catch {
    // Without the marker the return is an ordinary signed-out load.
  }
}

/** Reads the marker once and removes it. */
function takeSignOutMarker(): boolean {
  try {
    const marked = window.sessionStorage.getItem(SIGN_OUT_MARKER_KEY) !== null
    window.sessionStorage.removeItem(SIGN_OUT_MARKER_KEY)
    return marked
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 * The document is shown again
 * ------------------------------------------------------------------ */

/**
 * The browser brought this document back from its page cache (Back from the
 * identity provider). Its memory is exactly as it was when the browser left,
 * so states that only make sense while leaving are ended here (§21.2.3).
 */
function handlePageShow(event: PageTransitionEvent) {
  if (!event.persisted) {
    return
  }

  switch (state.status) {
    case "redirecting":
      window.clearTimeout(redirectTimer)
      redirectAttempt += 1
      setState({ status: "unauthenticated", entry: null })
      break
    case "signing-out":
      window.clearTimeout(signOutTimer)
      if (takeSignOutMarker()) {
        // No load of the application came between: nothing confirmed it.
        finishUnconfirmedSignOut()
      } else {
        setState({
          status: "unauthenticated",
          displayName: null,
          destination: null,
        })
      }
      break
    case "authenticated":
      lastVerifiedAt = 0
      verifySession()
      break
    default:
      break
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    verifySession()
  }
}
