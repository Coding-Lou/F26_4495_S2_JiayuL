/**
 * Longest planning prompt the backend accepts: the limit on
 * `RecommendationQueryRequest.message`. Measured on the trimmed value, so a
 * prompt accepted here is accepted when it is sent later.
 */
export const PLANNING_PROMPT_MAX_LENGTH = 2000

export type PlanningPromptCheck = {
  status: "empty" | "too-long" | "valid"
  /** The trimmed value. This is what is saved and, later, sent. */
  prompt: string
  /** Length of the trimmed value. */
  length: number
}

export function checkPlanningPrompt(input: string): PlanningPromptCheck {
  const prompt = input.trim()
  const length = prompt.length

  if (length === 0) {
    return { status: "empty", prompt, length }
  }

  if (length > PLANNING_PROMPT_MAX_LENGTH) {
    return { status: "too-long", prompt, length }
  }

  return { status: "valid", prompt, length }
}
