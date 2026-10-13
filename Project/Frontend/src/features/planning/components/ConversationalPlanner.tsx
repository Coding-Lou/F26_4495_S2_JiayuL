import { useEffect } from "react"
import { useAuth } from "@/features/auth"
import { plannerContent } from "../content"
import { usePlannerTurn } from "../hooks/usePlannerTurn"
import { PLANNER_IDS } from "../plannerDom"
import { planSummary } from "../presentation"
import { openPlannerSession, usePlanner } from "../state/plannerStore"
import { NewPlanConfirmation } from "./NewPlanConfirmation"
import { PlannerComposer } from "./PlannerComposer"
import { PlannerConversation } from "./PlannerConversation"
import { PlannerNoteLine } from "./PlannerNoteLine"

/**
 * The conversational trip planner (FEATURE-003): one bounded panel with four
 * zones, top to bottom: title strip, history, note line, composer. Only the
 * history scrolls.
 *
 * It knows nothing about what is behind it. Its readability comes from its
 * own surfaces, and it shares no state with the Home media.
 */
export function ConversationalPlanner() {
  const { status } = useAuth()
  const startTurn = usePlannerTurn()
  const confirming = usePlanner((planner) => planner.ui.confirmingNewPlan)
  const context = usePlanner((planner) => planner.session.context)

  // Only matters in a document whose earlier session ended without a reload.
  useEffect(() => {
    if (status === "authenticated") {
      openPlannerSession()
    }
  }, [status])

  // A rendering of the backend's context, read-only: not a filter.
  const summary = planSummary(context)

  return (
    <section className="planner" aria-labelledby={PLANNER_IDS.title}>
      <div className="planner-title-strip">
        <h1
          id={PLANNER_IDS.title}
          tabIndex={-1}
          className={confirming ? "sr-only" : "planner-title"}
        >
          {plannerContent.title}
        </h1>
        {confirming ? <NewPlanConfirmation /> : null}
        {!confirming && summary !== null ? (
          <p className="planner-summary">{summary}</p>
        ) : null}
      </div>

      <PlannerConversation onRetry={startTurn} />
      <PlannerNoteLine />
      <PlannerComposer onSend={startTurn} />
    </section>
  )
}
