import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Link } from "react-router-dom"
import { plannerContent } from "../content"
import {
  recommendationName,
  sceneryLabels,
  scoreParts,
  trailFacts,
} from "../presentation"
import type { TrailRecommendation } from "../types/planner"

type TrailRecommendationCardProps = {
  trail: TrailRecommendation
  /** 1-based place in the backend's order. */
  position: number
  /** The id of the reply these results belong to. */
  groupId: string
}

/**
 * One recommended trail (FEATURE-003 sections 12.2, 12.3.2, D11).
 *
 * A summary: it shows only fields the backend returned and has no image. A
 * field that is null is left out, with no placeholder in its place.
 * Everything is rendered as text.
 *
 * Its one action is the View trail link (FEATURE-004 section 4.2), present
 * when the trail has an id. The address carries two opaque identifiers, the
 * trail and the reply it came from, and nothing else.
 */
export function TrailRecommendationCard({
  trail,
  position,
  groupId,
}: TrailRecommendationCardProps) {
  const headingId = useId()
  const breakdownId = useId()
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const { results } = plannerContent
  const spokenName = recommendationName(trail, position)
  const facts = trailFacts(trail)
  const scenery = sceneryLabels(trail.scenery)
  const score = trail.score === null ? null : Math.round(trail.score)
  const breakdown = trail.breakdown

  const factParts: { key: string; text: string; strong: boolean }[] = []
  if (facts.difficulty !== null) {
    factParts.push({ key: "difficulty", text: facts.difficulty, strong: true })
  }
  facts.measures.forEach((text, index) => {
    factParts.push({ key: `measure-${index}`, text, strong: false })
  })

  return (
    <article
      className="planner-card"
      aria-labelledby={trail.name !== null ? headingId : undefined}
      aria-label={trail.name === null ? spokenName : undefined}
    >
      <div className="planner-card-main">
        <div className="planner-card-content">
          {trail.name !== null ? (
            <h3 id={headingId} className="planner-card-name">
              {trail.name}
            </h3>
          ) : null}

          {factParts.length > 0 ? (
            <p className="planner-card-facts">
              {factParts.map((part, index) => (
                <span key={part.key}>
                  {index > 0 ? " · " : null}
                  <span
                    className={part.strong ? "planner-card-difficulty" : undefined}
                  >
                    {part.text}
                  </span>
                </span>
              ))}
            </p>
          ) : null}

          {scenery.length > 0 ? (
            <p className="planner-card-scenery">{scenery.join(" · ")}</p>
          ) : null}

          {trail.description !== null ? (
            <TrailDescription text={trail.description} name={spokenName} />
          ) : null}

          {trail.id !== null ? (
            <p className="planner-card-actions">
              <Link
                to={{
                  pathname: `/trails/${encodeURIComponent(trail.id)}`,
                  search: `?rec=${encodeURIComponent(groupId)}`,
                }}
                className="planner-control planner-card-link"
                aria-describedby={trail.name !== null ? headingId : undefined}
              >
                {results.viewTrail}
              </Link>
            </p>
          ) : null}
        </div>

        {score !== null && breakdown !== null ? (
          <button
            type="button"
            className="planner-control planner-score"
            aria-expanded={breakdownOpen}
            aria-controls={breakdownId}
            aria-label={`${results.matchScore} ${score} ${results.scoreOutOf}. ${results.scoreDetails}`}
            data-open={breakdownOpen ? "" : undefined}
            onClick={() => setBreakdownOpen((open) => !open)}
          >
            <ScoreValue score={score} />
            <span className="planner-score-caption">{results.matchScore}</span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={2}
              className="planner-score-chevron"
            />
          </button>
        ) : null}

        {score !== null && breakdown === null ? (
          <p className="planner-score planner-score-static">
            <ScoreValue score={score} />
            <span className="planner-score-caption">{results.matchScore}</span>
          </p>
        ) : null}
      </div>

      {score !== null && breakdown !== null && breakdownOpen ? (
        <div id={breakdownId} className="planner-breakdown">
          <dl className="planner-breakdown-list">
            {scoreParts(breakdown).map((part) => (
              <div key={part.key} className="planner-breakdown-row">
                <dt>{part.label}</dt>
                <dd>
                  {part.value} / {part.max}
                </dd>
              </div>
            ))}
          </dl>
          <p className="planner-breakdown-note">{results.breakdownNote}</p>
        </div>
      ) : null}
    </article>
  )
}

function ScoreValue({ score }: { score: number }) {
  return (
    <span className="planner-score-value">
      <span className="planner-score-number">{score}</span>
      <span className="planner-score-of">
        <span>/</span>
        <span>100</span>
      </span>
    </span>
  )
}

type TrailDescriptionProps = {
  text: string
  /** The trail's name, for the control's accessible name. */
  name: string
}

/**
 * Two lines, with "More" only when the text does not fit in them. The full
 * text is always in the DOM; the clamp is presentation.
 */
function TrailDescription({ text, name }: TrailDescriptionProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  // Measured while clamped, and again whenever the card's width changes.
  useEffect(() => {
    const paragraph = textRef.current
    if (paragraph === null || expanded) {
      return
    }

    const measure = () => {
      setOverflows(paragraph.scrollHeight > paragraph.clientHeight + 1)
    }

    if (typeof ResizeObserver === "undefined") {
      const frame = window.requestAnimationFrame(measure)
      return () => window.cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(paragraph)
    return () => observer.disconnect()
  }, [expanded, text])

  const { more, less } = plannerContent.results

  return (
    <div className="planner-card-description">
      <p
        ref={textRef}
        className="planner-card-description-text"
        data-clamped={expanded ? undefined : ""}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          className="planner-control planner-card-more"
          aria-expanded={expanded}
          aria-label={`${expanded ? less : more} about ${name}`}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? less : more}
        </button>
      ) : null}
    </div>
  )
}
