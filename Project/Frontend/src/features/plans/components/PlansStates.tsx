import type { RefObject } from "react"
import { Compass } from "lucide-react"
import { Link } from "react-router-dom"
import { myPlansContent } from "../myPlansContent"
import { PlanCalendarPlaceholder } from "./PlanCalendar"
import { PlansRetryButton } from "./PlansRetryButton"

/** Skeleton rows while the list loads (section 10.3). */
const SKELETON_ROWS = 4

/** Where the planner is: the brand's destination, and Plan a trip's. */
const PLANNER_PATH = "/home"

/**
 * The collection while the Plans load (FEATURE-013 section 16): static
 * placeholders in the final geometry of the list and the calendar, never the
 * empty state and never an interactive empty grid. The hidden status PL37
 * says what is happening.
 */
export function PlansLoading() {
  return (
    <div className="plans-collection" aria-busy="true">
      <p role="status" className="sr-only">
        {myPlansContent.loading}
      </p>
      <div className="plans-list" aria-hidden="true">
        <span className="plans-bar plans-heading-bar" />
        <ul className="plan-entries">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <li key={index} className="plan-item" data-section="upcoming">
              <span className="plan-entry" data-skeleton>
                <span className="plan-date">
                  <span className="plans-bar plan-date-bar" />
                </span>
                <span className="plan-main">
                  <span className="plans-bar plan-name-bar" />
                  <span className="plans-bar plan-facts-bar" />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PlanCalendarPlaceholder />
    </div>
  )
}

type PlansEmptyProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** No Plans (section 10.7): no calendar, one way to the planner. */
export function PlansEmpty({ headingRef }: PlansEmptyProps) {
  return (
    <div className="plans-state">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="trip-focus-target plans-state-heading"
      >
        {myPlansContent.empty.heading}
      </h2>
      <p className="plans-state-body">{myPlansContent.empty.body}</p>
      <Link to={PLANNER_PATH} className="trip-control plans-primary">
        <Compass aria-hidden="true" strokeWidth={2} />
        {myPlansContent.planTrip}
      </Link>
    </div>
  )
}

/** Upcoming has no Plans, Past has (section 10.7). */
export function PlansNoUpcoming() {
  return (
    <div className="plans-no-upcoming">
      <p>{myPlansContent.noUpcoming}</p>
      <Link to={PLANNER_PATH} className="trip-control trip-button plans-secondary">
        {myPlansContent.planTrip}
      </Link>
    </div>
  )
}

type PlansFailureProps = {
  /** PL42 for a failed read, PL45 for an incomplete one (amendment A1). */
  heading: string
  headingRef: RefObject<HTMLHeadingElement | null>
  working: boolean
  onRetry: () => void
}

/**
 * The list could not be shown (section 10.7): no list and no calendar,
 * never the empty state, and Try again.
 */
export function PlansFailure({
  heading,
  headingRef,
  working,
  onRetry,
}: PlansFailureProps) {
  return (
    <div className="plans-state">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="trip-focus-target plans-state-heading"
      >
        {heading}
      </h2>
      <div className="plans-state-action">
        <PlansRetryButton working={working} onRetry={onRetry} />
      </div>
    </div>
  )
}
