import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { plannerContent } from "../content"
import {
  earlierResultsLabel,
  resultsCaption,
  resultsHeading,
} from "../presentation"
import type { AssistantChatMessage } from "../types/planner"
import { TrailRecommendationCard } from "./TrailRecommendationCard"

type RecommendationGroupProps = {
  /** A reply whose status is `READY_TO_RECOMMEND`. */
  message: AssistantChatMessage
  /**
   * The newest results. An older group with trails collapses to one row that
   * keeps the date and starting point it was made with (section 12.3.3).
   */
  current: boolean
  today: string
}

/**
 * The results of one turn, inside the conversation (FEATURE-003 sections
 * 12.1, 12.3). Cards are in the backend's order, unfiltered. A reply with no
 * trail shows interface guidance instead, visibly not the planner speaking.
 */
export function RecommendationGroup({
  message,
  current,
  today,
}: RecommendationGroupProps) {
  const headingId = useId()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)

  const { recommendations, usedTripDate, usedStartingPoint } = message
  const count = recommendations.length

  const cards = (
    <ol id={listId} className="planner-cards">
      {recommendations.map((trail, index) => (
        <li key={`${index}-${trail.id ?? ""}`}>
          <TrailRecommendationCard
            trail={trail}
            position={index + 1}
            groupId={message.id}
          />
        </li>
      ))}
    </ol>
  )

  if (!current && count > 0) {
    return (
      <section className="planner-group" aria-labelledby={headingId}>
        <h2 id={headingId} className="planner-earlier-heading">
          <button
            type="button"
            className="planner-control planner-earlier"
            aria-expanded={expanded}
            aria-controls={listId}
            data-open={expanded ? "" : undefined}
            onClick={() => setExpanded((open) => !open)}
          >
            <span className="planner-earlier-label">
              {earlierResultsLabel(usedTripDate, usedStartingPoint, count, today)}
            </span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={2}
              className="planner-earlier-chevron"
            />
          </button>
        </h2>
        {expanded ? cards : null}
      </section>
    )
  }

  return (
    <section className="planner-group" aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        {resultsHeading(usedTripDate, usedStartingPoint, today)}
      </h2>
      <p className="planner-group-caption">
        {resultsCaption(usedTripDate, usedStartingPoint, today)}
      </p>
      {count > 0 ? (
        cards
      ) : (
        <div className="planner-guidance">
          <p className="planner-guidance-title">
            {plannerContent.results.whatToTry}
          </p>
          <p>{plannerContent.results.zeroGuidance}</p>
        </div>
      )}
    </section>
  )
}
