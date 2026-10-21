import { useId } from "react"
import { scoreParts } from "@/features/planning/presentation"
import type { TrailRecommendationContext } from "@/features/planning/trailContext"
import { formatTripDateShort, todayIso } from "@/features/planning/tripDate"
import { trailContent } from "../content"

type WhyThisTrailProps = {
  /** The planner's recommendation of this trail. Its score is not null. */
  recommendation: TrailRecommendationContext
  score: number
}

/**
 * Why this trail (FEATURE-004 sections 8, 21.6): the planner's own score for
 * this trail, shown and nothing more. The total and each part are the numbers
 * the recommendation carried, rounded as the planner shows them, each over
 * its maximum. Nothing is recomputed, rescaled, or re-requested, and there is
 * no grade, no sentence, and no color by value.
 *
 * A bar is the same two numbers drawn: decorative, hidden from assistive
 * technology, and never the only carrier of a value. The section has no
 * control and is not a tab stop.
 */
export function WhyThisTrail({ recommendation, score }: WhyThisTrailProps) {
  const headingId = useId()
  const { why } = trailContent

  const total = Math.round(score)
  const parts = scoreParts(recommendation.breakdown)
  // The date and starting point the scores were made for: they stay as they
  // are when the user picks another trip date.
  const scoredFor = `${why.scoredFor} ${formatTripDateShort(
    recommendation.usedTripDate,
    todayIso(),
  )} · ${why.from[recommendation.usedStartingPoint]}`

  return (
    <section className="trail-why" aria-labelledby={headingId}>
      <h2 id={headingId} className="trail-why-heading">
        {why.heading}
      </h2>

      {/* Read as "Match score: 86 out of 100". */}
      <p className="trail-why-total">
        <span className="sr-only">
          {why.matchScore}
          {": "}
        </span>
        <span className="trail-why-score">{total}</span>
        <span className="trail-why-of" aria-hidden="true">
          /{why.totalMax}
        </span>
        <span className="sr-only">
          {" "}
          {why.outOf} {why.totalMax}
        </span>
      </p>
      <p className="trail-why-label" aria-hidden="true">
        {why.matchScore}
      </p>

      {parts.length > 0 ? (
        <dl className="trail-why-parts">
          {parts.map((part) => (
            <div key={part.key} className="trail-why-part">
              <dt>{part.label}</dt>
              <dd>
                {part.value}
                <span aria-hidden="true"> / {part.max}</span>
                <span className="sr-only">
                  {" "}
                  {why.outOf} {part.max}
                </span>
                <span className="trail-bar" aria-hidden="true">
                  <span style={{ width: `${fillPercent(part.value, part.max)}%` }} />
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="trail-why-caption trail-why-scored">{scoredFor}</p>
      <p className="trail-why-caption">{why.caption}</p>
    </section>
  )
}

/** The value over its maximum, as a width from 0 to 100. */
function fillPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (value / max) * 100))
}
