import { useEffect, useState } from "react"
import {
  dismissAuthBoundaryNotice,
  presentAuthBoundaryArrival,
  requestAuthentication,
} from "@/features/auth/authBoundary"
import {
  readPendingPrompt,
  savePendingPrompt,
} from "@/features/planning/pendingPrompt"
import { checkPlanningPrompt } from "@/features/planning/planningPrompt"

export type PlannerPromptError = "empty" | "over-limit"

export type PlannerPromptController = {
  /** The input's value, exactly as typed. */
  value: string
  /** The validation message the planner should show, if any. */
  error: PlannerPromptError | null
  /** Length of the trimmed value, for the over-limit counter. */
  length: number
  /** Grows each time a submit is refused, so the message is announced again. */
  refusals: number
  change: (value: string) => void
  selectSuggestion: (text: string) => void
  /** The primary action. Returns false when the prompt was refused. */
  submit: () => boolean
  /** The navigation's Sign in. */
  signIn: () => void
}

/**
 * State and rules of the Public Landing's planner (FEATURE-001 §6, §11.4).
 *
 * It lives above the form because two places act on the same prompt: the
 * primary action inside the form and Sign in in the navigation. Both save a
 * valid prompt first and then go through the one auth boundary: the primary
 * action to the authentication gate, Sign in straight to the login page
 * (FEATURE-002 §6).
 */
export function usePlannerPrompt(): PlannerPromptController {
  // A prompt saved before a reload is restored, with no message (§11.11).
  const [value, setValue] = useState(() => readPendingPrompt() ?? "")
  const [emptyRefused, setEmptyRefused] = useState(false)
  const [refusals, setRefusals] = useState(0)

  // A notice that arrived with the visitor (a closed route, a failed sign-in,
  // an ended session, a sign-out) is shown once the landing has rendered, so
  // that it is announced. Whatever is shown belongs to this visit to the page
  // and is withdrawn when the landing goes away.
  useEffect(() => presentAuthBoundaryArrival(), [])

  const check = checkPlanningPrompt(value)

  let error: PlannerPromptError | null = null
  if (check.status === "too-long") {
    // Shown as soon as the value is over the limit, without waiting for a submit.
    error = "over-limit"
  } else if (check.status === "empty" && emptyRefused) {
    error = "empty"
  }

  function change(next: string) {
    setValue(next)
    // The empty-submit message clears on the first non-whitespace character.
    if (next.trim() !== "") {
      setEmptyRefused(false)
    }
    dismissAuthBoundaryNotice()
  }

  function selectSuggestion(text: string) {
    setValue(text)
    setEmptyRefused(false)
    dismissAuthBoundaryNotice()
  }

  function submit() {
    const attempt = checkPlanningPrompt(value)

    if (attempt.status !== "valid") {
      // Nothing is saved and the boundary is not invoked.
      setEmptyRefused(attempt.status === "empty")
      setRefusals((count) => count + 1)
      dismissAuthBoundaryNotice()
      return false
    }

    setEmptyRefused(false)
    const promptSaved = savePendingPrompt(attempt.prompt)
    requestAuthentication({
      reason: "start-planning",
      prompt: attempt.prompt,
      promptSaved,
    })
    return true
  }

  function signIn() {
    // A new activation replaces whatever the message slot shows. An
    // over-limit message is derived from the value, so it stays.
    setEmptyRefused(false)

    const attempt = checkPlanningPrompt(value)
    if (attempt.status === "valid") {
      // Signing in from the navigation must not discard a valid prompt.
      const promptSaved = savePendingPrompt(attempt.prompt)
      requestAuthentication({
        reason: "sign-in",
        prompt: attempt.prompt,
        promptSaved,
      })
      return
    }

    requestAuthentication({ reason: "sign-in" })
  }

  return {
    value,
    error,
    length: check.length,
    refusals,
    change,
    selectSuggestion,
    submit,
    signIn,
  }
}
