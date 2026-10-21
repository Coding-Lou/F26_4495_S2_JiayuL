import {
  difficultyLabel,
  formatDistance,
  formatDuration,
  formatElevationGain,
} from "@/features/planning/presentation"
import { trailContent } from "@/features/trails/content"
import type { TrailDetail } from "@/features/trails/types/trail"
import type { PlanTrail } from "../hooks/usePlanTrails"
import { myPlansContent } from "../myPlansContent"

/**
 * What a Plan's name slot says (FEATURE-013 section 10.3): the trail's name,
 * or the fallback for its state. The date and status always come from the
 * Plan itself.
 */
export function planTrailName(state: PlanTrail): string {
  switch (state.status) {
    case "ready":
      return state.trail.name ?? trailContent.unnamed
    case "gone":
      return myPlansContent.trail.gone
    case "failed":
      return myPlansContent.trail.failed
    case "loading":
      return myPlansContent.trail.loading
  }
}

/**
 * The entry's facts line: difficulty · distance · duration (section 10.3). A
 * missing fact is left out with its separator, never shown as 0; null when
 * none is known.
 */
export function planFactsLine(trail: TrailDetail): string | null {
  const facts = [
    difficultyLabel(trail.difficulty),
    formatDistance(trail.distanceKm),
    formatDuration(trail.estimatedDurationMin),
  ].filter((fact): fact is string => fact !== null)
  return facts.length > 0 ? facts.join(" · ") : null
}

export type PlanFact = { label: string; value: string }

/** The detail's facts (section 10.4, PL12): only those that are known. */
export function planFacts(trail: TrailDetail): PlanFact[] {
  const labels = myPlansContent.facts
  const pairs: [string, string | null][] = [
    [labels.difficulty, difficultyLabel(trail.difficulty)],
    [labels.distance, formatDistance(trail.distanceKm)],
    [labels.duration, formatDuration(trail.estimatedDurationMin)],
    [labels.elevation, formatElevationGain(trail.elevationGainM)],
  ]
  return pairs
    .filter((pair): pair is [string, string] => pair[1] !== null)
    .map(([label, value]) => ({ label, value }))
}
