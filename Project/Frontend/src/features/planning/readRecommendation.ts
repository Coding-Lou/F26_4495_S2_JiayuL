import type { ScoreBreakdown, TrailRecommendation } from "./types/planner"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Reduces a recommendation to the fields this feature shows (FEATURE-003
 * section 4.4), each a checked value or null. Used for a reply from the
 * backend and, again, for a conversation read back from session storage,
 * which is untrusted. Null means the value is not a recommendation at all.
 */
export function readTrailRecommendation(value: unknown): TrailRecommendation | null {
  if (!isRecord(value)) {
    return null
  }

  return {
    id: readText(value.id),
    name: readText(value.name),
    description: readText(value.description),
    difficulty: readText(value.difficulty),
    distanceKm: readNumber(value.distanceKm),
    elevationGainM: readNumber(value.elevationGainM),
    estimatedDurationMin: readNumber(value.estimatedDurationMin),
    scenery: Array.isArray(value.scenery)
      ? value.scenery.filter((item): item is string => typeof item === "string")
      : [],
    score: readNumber(value.score),
    breakdown: readBreakdown(value.breakdown),
  }
}

function readBreakdown(value: unknown): ScoreBreakdown | null {
  if (!isRecord(value)) {
    return null
  }

  const breakdown: ScoreBreakdown = {
    intent: readNumber(value.intent),
    weather: readNumber(value.weather),
    gear: readNumber(value.gear),
    scenery: readNumber(value.scenery),
    proximity: readNumber(value.proximity),
  }

  // A breakdown with no part is the same as none.
  return Object.values(breakdown).some((part) => part !== null)
    ? breakdown
    : null
}

/** A non-blank string, or null. */
function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
