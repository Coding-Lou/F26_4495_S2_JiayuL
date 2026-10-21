import { authContent, authNoticeTone } from "./authContent"
import {
  dismissAuthNotice,
  presentArrivalNotice,
  showAuthNotice,
  takeArrivalFocus,
  useAuthNotice,
  type AuthNotice,
} from "./authNotices"
import {
  beginAuthentication,
  getAuthSnapshot,
  type AuthEntry,
} from "./authSession"
import { saveReturnDestination } from "./returnDestination"
import { useAuth } from "./useAuth"

/**
 * The single authentication boundary of the public homepage at `/`: the
 * Hero and Discover (FEATURE-006 section 11), which took over the Public
 * Landing's place.
 *
 * Every entry into authentication from it goes through this file: the
 * header's Sign in through `requestAuthentication`, the Hero gate's two
 * actions through `chooseGateAction`, and the Trail Detail popup's "Sign in
 * to plan this trip" and Create account through `startTrailPlanning`. What
 * comes back is a notice for the Hero's notice slot (or, for a popup start
 * that fails, the popup's) and the state of the controls. The homepage
 * imports nothing else from authentication that starts a sign-in, and never
 * touches the OIDC adapter (FEATURE-002 §4, §6).
 */

/** Why the visitor reached the boundary. */
export type AuthBoundaryReason = "start-planning" | "sign-in"

export type AuthBoundaryRequest = {
  reason: AuthBoundaryReason
  /** The trimmed, valid planning prompt, when the visitor has one. */
  prompt?: string
  /** Whether `prompt` was stored for after authentication before this call. */
  promptSaved?: boolean
}

export type AuthBoundaryNotice = AuthNotice

/** How a control that leads to authentication should present itself (§21.2.3). */
export type AuthControlState = "default" | "working" | "unavailable"

export type GateAction = "sign-in" | "create-account"

/**
 * Where on the homepage an authentication start came from: the page (the
 * header's Sign in, the Hero gate) or the Trail Detail popup. The popup's two
 * actions use the gate's entries, so this tells the two sets apart: while one
 * set is working the other is unavailable (FEATURE-006 16.9.5), and an F3 that
 * a popup start caused is shown in the popup, not in the Hero.
 */
export type AuthSurface = "page" | "popup"

/** Set by every start before the auth status changes; read while rendering. */
let startedFrom: AuthSurface = "page"

/**
 * Invoke the authentication boundary.
 *
 * `start-planning` navigates nowhere: it shows the gate, where the visitor
 * chooses between Sign in and Create account (D1). `sign-in` is the
 * navigation's Sign in and goes straight to the login page (D2). The prompt
 * itself is never passed on; it stays in the tab's session storage.
 */
export function requestAuthentication(request: AuthBoundaryRequest): void {
  if (request.reason === "start-planning") {
    showAuthNotice(request.promptSaved ? "G1" : "G2", true)
    return
  }

  startedFrom = "page"
  void beginAuthentication("navigation")
}

/** One of the gate's two actions was activated. */
export function chooseGateAction(action: GateAction): void {
  startedFrom = "page"
  void beginAuthentication(
    action === "create-account" ? "gate-create-account" : "gate-sign-in",
  )
}

/**
 * "Sign in to plan this trip" or Create account in the Trail Detail popup
 * (FEATURE-006 sections 11, 16.9.5): the trail's authenticated address is
 * kept as the return destination, so a completed sign-in lands on that
 * trail's Trail Detail (FEATURE-004). Then sign-in or registration begins,
 * with the same working and unavailable states as the gate's actions.
 *
 * `trailId` must already be known to be a trail id; the destination module
 * checks the path again and ignores anything that is not a trail address.
 */
export function startTrailPlanning(trailId: string, action: GateAction): void {
  // A working or unavailable control ignores activation: nothing is saved.
  if (getAuthSnapshot().status === "redirecting") {
    return
  }
  saveReturnDestination(`/trails/${encodeURIComponent(trailId)}`)
  startedFrom = "popup"
  void beginAuthentication(
    action === "create-account" ? "gate-create-account" : "gate-sign-in",
  )
}

/**
 * The surface a notice belongs to: F3 after a popup start goes to the popup;
 * every other notice, and F3 after any other start, to the Hero.
 */
export function authBoundaryNoticeSurface(
  notice: AuthBoundaryNotice,
): AuthSurface {
  return notice.kind === "F3" && startedFrom === "popup" ? "popup" : "page"
}

/** Withdraw the current notice, for example once the visitor edits their prompt. */
export function dismissAuthBoundaryNotice(): void {
  dismissAuthNotice()
}

/** The boundary's current notice, or null when there is nothing to report. */
export function useAuthBoundaryNotice(): AuthBoundaryNotice | null {
  return useAuthNotice()
}

/** The text of a notice. */
export function authBoundaryNoticeText(notice: AuthBoundaryNotice): string {
  return authContent.notices[notice.kind]
}

/** Whether a notice reports a problem (alert icon) or informs (info icon). */
export function authBoundaryNoticeTone(
  notice: AuthBoundaryNotice,
): "alert" | "info" {
  return authNoticeTone(notice.kind)
}

/** Labels of the gate's actions and the name of their group. */
export const authBoundaryLabels = {
  signIn: authContent.actions.signIn,
  createAccount: authContent.actions.createAccount,
  group: authContent.accountGroupLabel,
} as const

/**
 * The state of the three controls that lead to authentication, as `surface`
 * shows them. While the browser is leaving, the control that was activated
 * is working on the surface it was activated on, and every other control is
 * unavailable; otherwise all are in their default state. The page (header
 * and Hero gate) is the default surface.
 */
export function useAuthControlStates(
  surface: AuthSurface = "page",
): Record<AuthEntry, AuthControlState> {
  const { status, entry } = useAuth()

  const stateOf = (control: AuthEntry): AuthControlState => {
    if (status !== "redirecting") {
      return "default"
    }
    return entry === control && startedFrom === surface
      ? "working"
      : "unavailable"
  }

  return {
    navigation: stateOf("navigation"),
    "gate-sign-in": stateOf("gate-sign-in"),
    "gate-create-account": stateOf("gate-create-account"),
  }
}

/**
 * For the homepage, once its Hero has rendered: shows a notice that arrived
 * with the visitor. Returns the function that withdraws it when the page
 * unmounts.
 */
export function presentAuthBoundaryArrival(): () => void {
  return presentArrivalNotice()
}

/** True once when an arrival should move focus to the Hero's heading. */
export function takeAuthBoundaryArrivalFocus(): boolean {
  return takeArrivalFocus()
}
