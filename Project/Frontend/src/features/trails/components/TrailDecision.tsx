import { useId, useRef, useState } from "react"
import { ArrowRight, CircleAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { TripDateControl } from "@/features/planning/components/TripDateControl"
import { isIsoDate, todayIso } from "@/features/planning/tripDate"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { trailContent } from "../content"
import { tripPreparationLocation } from "../tripRoutes"

/** From here the sheet has two columns and the rail (section 21.3). */
const RAIL_QUERY = "(min-width: 1024px)"

type TrailDecisionProps = {
  /** The trail in the address. */
  trailId: string
  /** The reference to the planner's reply, carried forward when present. */
  rec: string | null
  /** The prefilled trip date, or null (section 11.2). */
  initialDate: string | null
  /** Why this trail is rendered above this row. */
  afterWhy: boolean
}

/**
 * The decision row (FEATURE-004 sections 11, 21.7, 21.8): the trip date
 * beside Choose this trail, read as one sentence, "this trail, on this day".
 *
 * Choose this trail makes no request and stores nothing: it navigates to the
 * Preparation address, which is the selection. It is never disabled. Without
 * a usable date it does not navigate; the date control asks for one and takes
 * focus, and no date is invented.
 *
 * A date changed here is this screen's only. It is not written to the
 * planner, and it does not re-score anything.
 */
export function TrailDecision({
  trailId,
  rec,
  initialDate,
  afterWhy,
}: TrailDecisionProps) {
  const navigate = useNavigate()
  const hasRail = useMediaQuery(RAIL_QUERY)
  const [tripDate, setTripDate] = useState(initialDate)
  const [dateNeeded, setDateNeeded] = useState(false)
  const dateControlRef = useRef<HTMLButtonElement>(null)
  const messageId = useId()

  function choose() {
    if (tripDate === null || !isIsoDate(tripDate) || tripDate < todayIso()) {
      setDateNeeded(true)
      dateControlRef.current?.focus()
      return
    }

    // A normal history entry, so browser Back returns here.
    void navigate(tripPreparationLocation(trailId, tripDate, rec))
  }

  return (
    <div className="trail-decision" data-after-why={afterWhy ? "" : undefined}>
      <div className="trail-decision-row">
        <TripDateControl
          controlRef={dateControlRef}
          value={tripDate}
          onChange={(date) => {
            setTripDate(date)
            setDateNeeded(false)
          }}
          attention={dateNeeded}
          size="large"
          // In the rail it opens over Why this trail when that is there, and
          // below when it is not. In one column it opens above (section 22.3).
          placement={afterWhy || !hasRail ? "above" : "below"}
          describedBy={messageId}
        />

        <button
          type="button"
          className="trip-control trail-choose"
          onClick={choose}
        >
          {trailContent.choose}
          <ArrowRight aria-hidden="true" strokeWidth={2} />
        </button>
      </div>

      {/* The slot keeps its height, so the message moves nothing. */}
      <p
        id={messageId}
        role="alert"
        className="trip-slot trail-decision-slot"
        data-tone="paper"
      >
        {dateNeeded ? (
          <span className="trip-slot-message">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{trailContent.dateNeeded}</span>
          </span>
        ) : null}
      </p>
    </div>
  )
}
