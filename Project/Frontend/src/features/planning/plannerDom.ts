/**
 * Ids of the planner elements that receive focus from somewhere else: the
 * header's New Plan, the composer, the two trip-context controls, and the
 * panel's heading (FEATURE-003 sections 10.1, 13.3.2, 14.1.2, 18.2).
 */
export const PLANNER_IDS = {
  title: "planner-title",
  textarea: "planner-message",
  note: "planner-note",
  newPlan: "planner-new-plan",
  newPlanConfirmation: "planner-new-plan-confirmation",
  dateControl: "planner-trip-date",
  startControl: "planner-starting-point",
} as const

type PlannerElementId = (typeof PLANNER_IDS)[keyof typeof PLANNER_IDS]

export function focusPlannerElement(id: PlannerElementId) {
  document.getElementById(id)?.focus()
}

/** Focus in the composer, without moving the page or the history. */
export function focusComposer() {
  document.getElementById(PLANNER_IDS.textarea)?.focus({ preventScroll: true })
}

/**
 * Focus in the composer with the caret after its text. The text must already
 * be in the field: a caller that has just replaced it flushes that change
 * first, so focus moves now and cannot arrive late and take it from wherever
 * the user has gone since.
 */
export function focusComposerAtEnd() {
  const textarea = document.getElementById(PLANNER_IDS.textarea)
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.focus({ preventScroll: true })
    const end = textarea.value.length
    textarea.setSelectionRange(end, end)
    textarea.scrollTop = textarea.scrollHeight
  }
}

/** The panel's heading: where focus goes when its control is removed. */
export function focusPlannerTitle() {
  focusPlannerElement(PLANNER_IDS.title)
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
