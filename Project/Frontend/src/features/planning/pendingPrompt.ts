import { checkPlanningPrompt } from "./planningPrompt"

/**
 * The planning prompt a visitor entered before authenticating.
 *
 * It is kept in session storage so it survives a same-tab authentication
 * redirect and is gone when the tab closes. The Public Landing writes it; the
 * Authenticated Home planner is what will read (and then clear) it.
 *
 * This is the only place the storage key is defined.
 */
const PENDING_PROMPT_STORAGE_KEY = "outdoor-trip-companion.pending-prompt"

/**
 * Saves a prompt for the rest of the tab's session.
 * Returns false when it could not be saved (storage unavailable, blocked, or
 * full); the caller must then not claim that it was.
 */
export function savePendingPrompt(prompt: string): boolean {
  try {
    window.sessionStorage.setItem(PENDING_PROMPT_STORAGE_KEY, prompt)
    return true
  } catch {
    return false
  }
}

/** The saved prompt, or null when there is none or storage cannot be read. */
export function readPendingPrompt(): string | null {
  try {
    const stored = window.sessionStorage.getItem(PENDING_PROMPT_STORAGE_KEY)
    if (stored === null) {
      return null
    }

    const check = checkPlanningPrompt(stored)
    return check.status === "valid" ? check.prompt : null
  } catch {
    return null
  }
}

/** Removes the saved prompt. Returns false when storage could not be reached. */
export function clearPendingPrompt(): boolean {
  try {
    window.sessionStorage.removeItem(PENDING_PROMPT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
