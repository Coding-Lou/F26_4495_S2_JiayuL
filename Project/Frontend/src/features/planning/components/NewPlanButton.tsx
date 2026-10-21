import { Plus } from "lucide-react"
import { plannerContent } from "../content"
import { PLANNER_IDS } from "../plannerDom"
import {
  hasUserMessage,
  toggleNewPlanConfirmation,
  usePlanner,
} from "../state/plannerStore"

/**
 * New Plan (FEATURE-003 section 14.1.1). Placed in the Home header, directly
 * above the panel it clears. It opens the in-place confirmation; activated
 * again, it closes it.
 *
 * With no user message there is nothing to clear: the control stays in place
 * and in the tab order, marked unavailable, and does nothing.
 */
export function NewPlanButton() {
  const available = usePlanner((planner) =>
    hasUserMessage(planner.session.messages),
  )
  const confirming = usePlanner((planner) => planner.ui.confirmingNewPlan)

  return (
    <button
      id={PLANNER_IDS.newPlan}
      type="button"
      className="planner-control planner-new-plan"
      aria-disabled={available ? undefined : true}
      aria-expanded={available ? confirming : undefined}
      aria-controls={confirming ? PLANNER_IDS.newPlanConfirmation : undefined}
      onClick={(event) => {
        if (!available) {
          return
        }
        // Some browsers do not focus a button on click. When this closes the
        // confirmation, focus belongs here.
        event.currentTarget.focus()
        toggleNewPlanConfirmation()
      }}
    >
      <Plus aria-hidden="true" strokeWidth={2} />
      {plannerContent.newPlan.action}
    </button>
  )
}
