import { useSyncExternalStore } from "react"

/**
 * The single authentication boundary of the frontend.
 *
 * Every entry into authentication goes through `requestAuthentication`. In
 * FEATURE-001 its body is a placeholder: authentication does not exist yet, so
 * it navigates nowhere, calls nothing, and only publishes a notice saying so.
 *
 * When real authentication arrives, the body of `requestAuthentication` is
 * what changes (start the sign-in redirect; publish a notice if it is
 * cancelled or fails). Callers and the notice subscription stay as they are.
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

/** What the boundary reports back to the page that invoked it. */
export type AuthBoundaryNotice = {
  /** Grows with every invocation, so a repeat can be told apart. */
  id: number
  /** The only outcome today. Cancelled and failed sign-in will join it. */
  outcome: "sign-in-unavailable"
  reason: AuthBoundaryReason
  /** What happened to the visitor's prompt, so copy never claims a save that did not happen. */
  prompt: "none" | "saved" | "not-saved"
}

let currentNotice: AuthBoundaryNotice | null = null
let invocationCount = 0
const listeners = new Set<() => void>()

function publish(notice: AuthBoundaryNotice | null) {
  currentNotice = notice
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getNotice() {
  return currentNotice
}

/**
 * Invoke the authentication boundary.
 *
 * Placeholder body: no navigation, no network request, no session. The visitor
 * stays where they are and the page is told that sign-in is not available.
 */
export function requestAuthentication(request: AuthBoundaryRequest): void {
  invocationCount += 1

  let prompt: AuthBoundaryNotice["prompt"] = "none"
  if (request.prompt !== undefined) {
    prompt = request.promptSaved ? "saved" : "not-saved"
  }

  publish({
    id: invocationCount,
    outcome: "sign-in-unavailable",
    reason: request.reason,
    prompt,
  })
}

/** Withdraw the current notice, for example once the visitor edits their prompt. */
export function dismissAuthBoundaryNotice(): void {
  if (currentNotice !== null) {
    publish(null)
  }
}

/** The boundary's current notice, or null when there is nothing to report. */
export function useAuthBoundaryNotice(): AuthBoundaryNotice | null {
  return useSyncExternalStore(subscribe, getNotice, getNotice)
}
