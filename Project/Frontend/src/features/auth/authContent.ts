import type { AuthNoticeKind } from "./authNotices"

/**
 * Every user-facing string authentication adds to the application
 * (FEATURE-002 §5, §21.2.2, §21.3, §21.4). None of them names the identity
 * provider, a status, a code, or an address, and none says that planning has
 * happened or is in progress.
 */
export const authContent = {
  brand: "Outdoor Trip Companion",

  actions: {
    signIn: "Sign in",
    createAccount: "Create account",
    signOut: "Sign out",
  },

  /** Accessible name of the gate's two actions. */
  accountGroupLabel: "Account",

  notices: {
    G1: "Sign in or create an account to plan this trip. Your request is saved in this tab.",
    G2: "Sign in or create an account to plan this trip. Your request couldn't be saved in this browser, so you may need to enter it again.",
    G3: "Sign in or create an account to continue.",
    F1: "We couldn't sign you in. Please try again.",
    F2: "Sign-in was cancelled.",
    F3: "Sign-in is unavailable right now. Please try again in a moment.",
    X1: "Your session has ended. Sign in again to continue.",
    O1: "You're signed out.",
    O2: "Sign-out couldn't be completed right now. To be sure your session has ended, close your browser.",
  } satisfies Record<AuthNoticeKind, string>,

  waiting: {
    /** W1 */
    loading: "Loading…",
    /** W2 */
    signingIn: "Signing you in…",
    /** W3 */
    signingOut: "Signing you out…",
  },

  /** Read before the identity by assistive technology only. */
  signedInAs: "Signed in as ",
} as const

/** Notices that report a problem carry the alert icon; the rest inform. */
const ALERT_NOTICES: ReadonlySet<AuthNoticeKind> = new Set(["F1", "F3", "O2"])

export function authNoticeTone(kind: AuthNoticeKind): "alert" | "info" {
  return ALERT_NOTICES.has(kind) ? "alert" : "info"
}
