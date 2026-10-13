import { useMemo } from "react"
import { usePlanner } from "./state/plannerStore"
import { todayIso } from "./tripDate"
import type {
  PlannerSession,
  ScoreBreakdown,
  StartingPointKind,
} from "./types/planner"

/**
 * What the planner knows about one recommended trail (FEATURE-004 section
 * 4.2): why it was recommended and what it was scored for. Nothing here says
 * what the trail is; that comes from the trail itself.
 */
export type TrailRecommendationContext = {
  score: number | null
  breakdown: ScoreBreakdown | null
  /** Wire values, as the recommendation carried them. */
  scenery: string[]
  /** The trip date the trail was scored for, `YYYY-MM-DD`. */
  usedTripDate: string
  usedStartingPoint: StartingPointKind
}

export type TrailPlanningContext = {
  /** Null whenever the lookup finds nothing. That is not an error. */
  recommendation: TrailRecommendationContext | null
  /** The planner's current trip date when it is today or later, else null. */
  tripDate: string | null
}

/**
 * The one way another feature reads the planner's state (FEATURE-004 section
 * 4.2, D1). Read-only: nothing is written, copied, or requested.
 *
 * `rec` is the id of the reply a recommendation card belongs to. The lookup
 * goes through the planner store, so the conversation it reads is the
 * signed-in user's own or none at all. A reference that is missing, unknown,
 * or points at a reply without this trail yields no recommendation.
 */
export function useTrailPlanningContext(
  rec: string | null,
  trailId: string | null,
): TrailPlanningContext {
  const session = usePlanner((planner) => planner.session)

  return useMemo(
    () => readTrailPlanningContext(session, rec, trailId),
    [session, rec, trailId],
  )
}

function readTrailPlanningContext(
  session: PlannerSession,
  rec: string | null,
  trailId: string | null,
): TrailPlanningContext {
  const today = todayIso()
  const tripDate =
    session.tripDate !== null && session.tripDate >= today
      ? session.tripDate
      : null

  if (rec === null || rec === "" || trailId === null) {
    return { recommendation: null, tripDate }
  }

  const message = session.messages.find(
    (candidate) => candidate.role === "assistant" && candidate.id === rec,
  )
  if (message === undefined || message.role !== "assistant") {
    return { recommendation: null, tripDate }
  }

  // Trail ids are UUIDs: the same id in another letter case is the same trail.
  const wanted = trailId.toLowerCase()
  const trail = message.recommendations.find(
    (candidate) => candidate.id !== null && candidate.id.toLowerCase() === wanted,
  )
  if (trail === undefined) {
    return { recommendation: null, tripDate }
  }

  return {
    recommendation: {
      score: trail.score,
      breakdown: trail.breakdown,
      scenery: trail.scenery,
      usedTripDate: message.usedTripDate,
      usedStartingPoint: message.usedStartingPoint,
    },
    tripDate,
  }
}
