import { useSyncExternalStore } from "react"

/**
 * What authentication has to tell the visitor on the Public Landing
 * (FEATURE-002 §5, §21.2.2). Ids are the specification's:
 *
 *   G1  gate from Start planning, request saved
 *   G2  gate from Start planning, request could not be saved
 *   G3  gate after being sent here from a protected route
 *   F1  sign-in failed
 *   F2  sign-in was cancelled
 *   F3  sign-in could not start
 *   X1  the session has ended
 *   O1  signed out
 *   O2  sign-out could not be confirmed
 */
export type AuthNoticeKind =
  | "G1"
  | "G2"
  | "G3"
  | "F1"
  | "F2"
  | "F3"
  | "X1"
  | "O1"
  | "O2"

export type AuthNotice = {
  /** Grows with every notice, so a repeat of the same text can be told apart. */
  id: number
  kind: AuthNoticeKind
  /** Whether Sign in and Create account are offered with the message. */
  actions: boolean
}

/**
 * Two slots. `shown` is what the landing renders now. `arrival` is a notice
 * that came with the visitor (a failed sign-in, an ended session, a sign-out,
 * a closed route): it waits here until the landing has rendered once, because
 * a live region only announces text that is inserted after it exists (§21.2.5).
 */
let shown: AuthNotice | null = null
let arrival: AuthNotice | null = null
let arrivalWantsFocus = false
let landingsMounted = 0
let sequence = 0

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getShown() {
  return shown
}

function create(kind: AuthNoticeKind, actions: boolean): AuthNotice {
  sequence += 1
  return { id: sequence, kind, actions }
}

/** A notice caused by something the visitor just did on the landing. */
export function showAuthNotice(kind: AuthNoticeKind, actions: boolean): void {
  arrival = null
  arrivalWantsFocus = false
  shown = create(kind, actions)
  emit()
}

/**
 * A notice that arrives with the visitor. Every arrival notice offers both
 * actions. `replacesRoute` says that the landing is about to replace another
 * route of the running application; focus then goes to the landing's heading.
 * When the landing is already on screen, focus is left where it is.
 */
export function queueArrivalNotice(
  kind: AuthNoticeKind,
  replacesRoute: boolean,
): void {
  arrival = create(kind, true)
  arrivalWantsFocus = replacesRoute && landingsMounted === 0
  shown = landingsMounted > 0 ? arrival : null
  emit()
}

/**
 * Called by the landing once it has rendered: shows a waiting arrival notice.
 * The returned function withdraws what is shown when the landing goes away.
 * The arrival itself is kept until it is dismissed or replaced, so a remount
 * of the same visit shows it again.
 */
export function presentArrivalNotice(): () => void {
  landingsMounted += 1

  if (arrival !== null && shown !== arrival) {
    shown = arrival
    emit()
  }

  return () => {
    landingsMounted -= 1

    if (shown !== null) {
      shown = null
      emit()
    }
  }
}

/** True once per arrival that should move focus to the landing's heading. */
export function takeArrivalFocus(): boolean {
  const wanted = arrivalWantsFocus
  arrivalWantsFocus = false
  return wanted
}

/** Withdraws everything, for example once the visitor edits their request. */
export function dismissAuthNotice(): void {
  arrivalWantsFocus = false

  if (shown !== null || arrival !== null) {
    shown = null
    arrival = null
    emit()
  }
}

/** The notice the landing should render, or null. */
export function useAuthNotice(): AuthNotice | null {
  return useSyncExternalStore(subscribe, getShown, getShown)
}
