import { authContent, authNoticeTone } from "./authContent"
import {
  dismissAuthNotice,
  presentArrivalNotice,
  showAuthNotice,
  takeArrivalFocus,
  useAuthNotice,
  type AuthNotice,
} from "./authNotices"
import { beginAuthentication, type AuthEntry } from "./authSession"
import { useAuth } from "./useAuth"

/**
 * The single authentication boundary of the Public Landing.
 *
 * Every entry into authentication from the landing goes through this file:
 * the planner's primary action and the navigation's Sign in through
 * `requestAuthentication`, the gate's two actions through `chooseGateAction`.
 * What comes back is a notice for the planner's message slot and the state of
 * the controls. The landing imports nothing else from authentication and
 * never touches the OIDC adapter (FEATURE-002 §4, §6).
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

  void beginAuthentication("navigation")
}

/** One of the gate's two actions was activated. */
export function chooseGateAction(action: GateAction): void {
  void beginAuthentication(
    action === "create-account" ? "gate-create-account" : "gate-sign-in",
  )
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
 * The state of the three controls that lead to authentication. While the
 * browser is leaving, the control that was activated is working and the other
 * two are unavailable; otherwise all three are in their default state.
 */
export function useAuthControlStates(): Record<AuthEntry, AuthControlState> {
  const { status, entry } = useAuth()

  const stateOf = (control: AuthEntry): AuthControlState => {
    if (status !== "redirecting") {
      return "default"
    }
    return entry === control ? "working" : "unavailable"
  }

  return {
    navigation: stateOf("navigation"),
    "gate-sign-in": stateOf("gate-sign-in"),
    "gate-create-account": stateOf("gate-create-account"),
  }
}

/**
 * For the landing, once it has rendered: shows a notice that arrived with the
 * visitor. Returns the function that withdraws it when the landing unmounts.
 */
export function presentAuthBoundaryArrival(): () => void {
  return presentArrivalNotice()
}

/** True once when an arrival should move focus to the landing's heading. */
export function takeAuthBoundaryArrivalFocus(): boolean {
  return takeArrivalFocus()
}
