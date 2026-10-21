import { useId, useRef, type RefObject } from "react"
import {
  Backpack,
  ChevronDown,
  CircleCheck,
  MapPinned,
  Trash2,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  formatTripDateLong,
  formatTripDateShort,
} from "@/features/planning/tripDate"
import { isSampleTrailSource } from "@/features/trails/content"
import {
  trailDetailLocation,
  tripPreparationLocation,
} from "@/features/trails/tripRoutes"
import { planTrailKey, type PlanTrail } from "../hooks/usePlanTrails"
import { sectionOf } from "../model/planCollection"
import {
  planMemoryStatus,
  type PlanMemoryIndexState,
} from "../model/planMemory"
import { planFacts, planFactsLine, planTrailName } from "../model/planText"
import { myPlansContent } from "../myPlansContent"
import type { Plan } from "../types/plan"
import { DeletePlanConfirmation } from "./DeletePlanConfirmation"
import { PlanMemoryBridge } from "./PlanMemoryBridge"
import { PlansRetryButton } from "./PlansRetryButton"

/** What every entry needs from the screen. */
export type PlanEntryContext = {
  today: string
  trails: ReadonlyMap<string, PlanTrail>
  /** The user's Memories as one index, for the bridge (FEATURE-014 §8). */
  memories: PlanMemoryIndexState
  selectedId: string | null
  confirmingId: string | null
  deletingId: string | null
  deleteFailedId: string | null
  onToggle: (plan: Plan) => void
  onAskDelete: (plan: Plan) => void
  onCancelDelete: () => void
  /** `listIds`: the entries of the list it is in, in order (for focus, D18). */
  onConfirmDelete: (plan: Plan, listIds: readonly string[]) => void
}

const LOADING_TRAIL: PlanTrail = { status: "loading" }

type PlanEntryProps = {
  plan: Plan
  listIds: readonly string[]
  context: PlanEntryContext
}

/**
 * One Plan (FEATURE-013 sections 10.3, 10.4): an `li` holding one button,
 * the whole row, which expands the Plan in place. The detail follows the
 * button in the DOM, so focus never has to move on expand or collapse.
 */
export function PlanEntry({ plan, listIds, context }: PlanEntryProps) {
  const { today } = context
  const detailId = useId()
  const factsId = useId()
  const entryRef = useRef<HTMLButtonElement>(null)

  const trail =
    context.trails.get(planTrailKey(plan.trailId)) ?? LOADING_TRAIL
  const section = sectionOf(plan, today)
  const upcoming = section === "upcoming"
  const isToday = plan.tripDate === today
  const selected =
    context.selectedId !== null &&
    context.selectedId.toLowerCase() === plan.id.toLowerCase()
  const name = planTrailName(trail)
  const longDate = formatTripDateLong(plan.tripDate, today)
  const factsLine = trail.status === "ready" ? planFactsLine(trail.trail) : null

  return (
    <li
      className="plan-item"
      data-section={section}
      data-selected={selected ? true : undefined}
    >
      <button
        ref={entryRef}
        type="button"
        className="trip-control plan-entry"
        data-plan-entry={plan.id}
        aria-expanded={selected}
        aria-controls={selected ? detailId : undefined}
        aria-label={myPlansContent.entryName(name, longDate, isToday, upcoming)}
        aria-describedby={factsLine !== null ? factsId : undefined}
        onClick={() => context.onToggle(plan)}
      >
        <span className="plan-date" aria-hidden="true">
          <span className="plan-date-text">
            {formatTripDateShort(plan.tripDate, today)}
          </span>
          {isToday ? (
            <span className="plan-today">{myPlansContent.today}</span>
          ) : null}
        </span>

        <span className="plan-main">
          {trail.status === "loading" ? (
            <>
              <span className="plans-bar plan-name-bar" aria-hidden="true" />
              <span className="plans-bar plan-facts-bar" aria-hidden="true" />
            </>
          ) : (
            <>
              <span
                className="plan-name"
                data-fallback={trail.status !== "ready" ? true : undefined}
              >
                {name}
              </span>
              {factsLine !== null ? (
                <span id={factsId} className="plan-facts">
                  {factsLine}
                </span>
              ) : null}
            </>
          )}
        </span>

        {upcoming ? (
          <span className="plan-status">
            <CircleCheck aria-hidden="true" strokeWidth={2} />
            {myPlansContent.ready}
          </span>
        ) : null}

        <ChevronDown
          className="plan-chevron"
          aria-hidden="true"
          strokeWidth={2}
        />
      </button>

      {selected ? (
        <PlanDetail
          id={detailId}
          plan={plan}
          trail={trail}
          upcoming={upcoming}
          longDate={longDate}
          listIds={listIds}
          context={context}
          entryRef={entryRef}
        />
      ) : null}
    </li>
  )
}

type PlanDetailProps = {
  id: string
  plan: Plan
  trail: PlanTrail
  upcoming: boolean
  longDate: string
  listIds: readonly string[]
  context: PlanEntryContext
  entryRef: RefObject<HTMLButtonElement | null>
}

/**
 * The inline detail of the selected Plan (section 10.4). A Past Plan on a
 * curated trail adds the Memory bridge after its context lines (FEATURE-014
 * section 10.1); it stays while the delete confirmation is open.
 */
function PlanDetail({
  id,
  plan,
  trail,
  upcoming,
  longDate,
  listIds,
  context,
  entryRef,
}: PlanDetailProps) {
  const gone = trail.status === "gone"
  const facts = trail.status === "ready" ? planFacts(trail.trail) : []
  const sample =
    trail.status === "ready" && isSampleTrailSource(trail.trail.source)
  const confirming = context.confirmingId === plan.id
  const deleting = context.deletingId === plan.id
  const showLinks = !gone
  const memoryStatus = planMemoryStatus(plan, trail, upcoming, context.memories)

  return (
    <div id={id} className="plan-detail">
      <p className="plan-long-date">{longDate}</p>

      {trail.status === "failed" ? (
        <div className="plan-trail-retry">
          <PlansRetryButton
            size="quiet"
            working={trail.retrying}
            onRetry={trail.retry}
          />
        </div>
      ) : null}

      {facts.length > 0 ? (
        <dl className="plan-fact-list">
          {facts.map((fact) => (
            <div key={fact.label} className="plan-fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {sample || !upcoming || gone ? (
        <div className="plan-context">
          {sample ? <p>{myPlansContent.sampleData}</p> : null}
          {!upcoming ? <p>{myPlansContent.datePassed}</p> : null}
          {gone ? <p>{myPlansContent.trailGone}</p> : null}
        </div>
      ) : null}

      <PlanMemoryBridge plan={plan} status={memoryStatus} entryRef={entryRef} />

      <div className="plan-actions-area">
        {confirming ? (
          <DeletePlanConfirmation
            deleting={deleting}
            failed={context.deleteFailedId === plan.id}
            onCancel={context.onCancelDelete}
            onConfirm={() => context.onConfirmDelete(plan, listIds)}
          />
        ) : (
          <div className="plan-actions">
            {showLinks ? (
              <Link
                to={trailDetailLocation(plan.trailId, null)}
                className="trip-control trip-button plans-secondary plan-link"
              >
                <MapPinned aria-hidden="true" strokeWidth={2} />
                {myPlansContent.viewTrail}
              </Link>
            ) : null}
            {showLinks && upcoming ? (
              <Link
                to={tripPreparationLocation(plan.trailId, plan.tripDate, null)}
                className="trip-control plans-filled plan-link"
              >
                <Backpack aria-hidden="true" strokeWidth={2} />
                {myPlansContent.reviewGear}
              </Link>
            ) : null}
            {showLinks ? (
              <span className="plan-actions-break" aria-hidden="true" />
            ) : null}
            <button
              type="button"
              className="trip-control plans-quiet-danger"
              data-plan-delete={plan.id}
              onClick={() => context.onAskDelete(plan)}
            >
              <Trash2 aria-hidden="true" strokeWidth={2} />
              {myPlansContent.deletePlan}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
