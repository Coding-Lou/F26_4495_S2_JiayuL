import { useEffect, useId, useRef } from "react"
import { useDismissable } from "@/lib/useDismissable"
import { plannerContent } from "../content"
import { PLANNER_IDS, focusComposer, focusPlannerElement } from "../plannerDom"
import { cancelNewPlan, startNewPlan } from "../state/plannerStore"

/**
 * The one confirmation step before a conversation is cleared (FEATURE-003
 * section 14.1.2). It takes the place of the panel's title strip content: no
 * dialog, no overlay, no `confirm()`.
 *
 * It is cancelled by "Keep this plan", Escape, New Plan activated again, or
 * focus leaving it. There is no timeout.
 */
export function NewPlanConfirmation() {
  const textId = useId()
  const groupRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  /** The header's New Plan: a press on it is not "focus leaving". */
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current = document.getElementById(PLANNER_IDS.newPlan)
    startRef.current?.focus()
  }, [])

  useDismissable({
    open: true,
    parts: [groupRef, triggerRef],
    dismissOnOutsidePress: false,
    onDismiss: (reason) => {
      cancelNewPlan()
      if (reason === "escape") {
        focusPlannerElement(PLANNER_IDS.newPlan)
      }
    },
  })

  const { newPlan } = plannerContent

  return (
    <div
      ref={groupRef}
      id={PLANNER_IDS.newPlanConfirmation}
      className="planner-confirm"
      role="group"
      aria-labelledby={textId}
    >
      <p id={textId} className="planner-confirm-text">
        {newPlan.confirm}
      </p>
      <div className="planner-confirm-actions">
        <button
          ref={startRef}
          type="button"
          className="planner-control planner-filled-button"
          onClick={() => {
            startNewPlan()
            focusComposer()
          }}
        >
          {newPlan.start}
        </button>
        <button
          type="button"
          className="planner-control planner-outline-button"
          onClick={() => {
            cancelNewPlan()
            focusPlannerElement(PLANNER_IDS.newPlan)
          }}
        >
          {newPlan.keep}
        </button>
      </div>
    </div>
  )
}
