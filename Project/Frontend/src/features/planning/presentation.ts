import { plannerContent } from "./content"
import { formatTripDateShort } from "./tripDate"
import type {
  PlanningContext,
  ScoreBreakdown,
  StartingPointKind,
  TrailRecommendation,
} from "./types/planner"

/**
 * Where backend values become words (FEATURE-003 section 12.2). Wire enum
 * values are mapped to labels here and nowhere else. A value this file does
 * not recognize has no label and is left out; a raw wire value is never shown.
 */

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Easy",
  MODERATE: "Moderate",
  HARD: "Hard",
}

const SCENERY_LABELS: Record<string, string> = {
  LAKE: "Lake",
  VIEWPOINT: "Viewpoint",
  WATERFALL: "Waterfall",
  FOREST: "Forest",
  MOUNTAIN: "Mountain",
  OCEAN: "Ocean",
}

const numberFormat = new Intl.NumberFormat("en-US")

function isShownNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

export function difficultyLabel(value: unknown): string | null {
  return typeof value === "string" ? (DIFFICULTY_LABELS[value] ?? null) : null
}

export function sceneryLabels(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const labels: string[] = []
  for (const value of values) {
    const label = typeof value === "string" ? SCENERY_LABELS[value] : undefined
    if (label !== undefined && !labels.includes(label)) {
      labels.push(label)
    }
  }
  return labels
}

/** Kilometres with one decimal at most: "8.4 km", "8 km". */
export function formatDistance(km: unknown): string | null {
  if (!isShownNumber(km)) {
    return null
  }
  return `${numberFormat.format(Math.round(km * 10) / 10)} km`
}

/** "420 m gain". */
export function formatElevationGain(metres: unknown): string | null {
  if (!isShownNumber(metres)) {
    return null
  }
  return `${numberFormat.format(Math.round(metres))} m gain`
}

/** "3 h 15 min", "3 h", "45 min". */
export function formatDuration(minutes: unknown): string | null {
  if (!isShownNumber(minutes)) {
    return null
  }

  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60

  if (hours === 0) {
    return `${rest} min`
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export type TrailFacts = {
  difficulty: string | null
  /** Distance, elevation gain, duration: those that are present, in order. */
  measures: string[]
}

export function trailFacts(trail: TrailRecommendation): TrailFacts {
  const measures = [
    formatDistance(trail.distanceKm),
    formatElevationGain(trail.elevationGainM),
    formatDuration(trail.estimatedDurationMin),
  ].filter((part): part is string => part !== null)

  return { difficulty: difficultyLabel(trail.difficulty), measures }
}

const BREAKDOWN_ORDER = [
  "intent",
  "weather",
  "gear",
  "scenery",
  "proximity",
] as const satisfies readonly (keyof ScoreBreakdown)[]

export type ScorePart = {
  key: keyof ScoreBreakdown
  label: string
  /** The backend's value, rounded as the planner shows it. */
  value: number
  max: number
}

/**
 * The parts of a score that have a value, in the planner's order, each with
 * its label and maximum (section 12.3.2). Nothing is rescaled or recomputed.
 */
export function scoreParts(breakdown: ScoreBreakdown | null): ScorePart[] {
  if (breakdown === null) {
    return []
  }

  const parts: ScorePart[] = []
  for (const key of BREAKDOWN_ORDER) {
    const value = breakdown[key]
    if (value !== null) {
      const { label, max } = plannerContent.results.breakdown[key]
      parts.push({ key, label, value: Math.round(value), max })
    }
  }
  return parts
}

/**
 * The plan summary line (section 10.2.8): what the stored `PlanningContext`
 * holds, in words. Null when it holds nothing to show. It reads the backend's
 * context and nothing else; message text is never consulted.
 */
export function planSummary(context: PlanningContext | null): string | null {
  if (context === null) {
    return null
  }

  const parts: string[] = []

  const difficulty = difficultyLabel(context.difficulty)
  if (difficulty !== null) {
    parts.push(difficulty)
  }

  for (const limit of [
    formatDuration(context.maxDurationMin),
    formatDistance(context.maxDistanceKm),
    formatElevationGain(context.maxElevationGainM),
  ]) {
    if (limit !== null) {
      parts.push(`up to ${limit}`)
    }
  }

  const scenery = sceneryLabels(context.preferredScenery)
  if (scenery.length > 0) {
    parts.push(scenery.join(", "))
  }

  return parts.length > 0 ? `So far: ${parts.join(" · ")}` : null
}

/** "For Sat, Oct 17 · from Vancouver" (section 12.3.1). */
export function resultsCaption(
  tripDate: string,
  startingPoint: StartingPointKind,
  today: string,
): string {
  return `For ${formatTripDateShort(tripDate, today)} · from ${plannerContent.startingPoint.fromLabels[startingPoint]}`
}

/** "Trails for Sat, Oct 17, from Vancouver": the group's hidden heading. */
export function resultsHeading(
  tripDate: string,
  startingPoint: StartingPointKind,
  today: string,
): string {
  return `Trails for ${formatTripDateShort(tripDate, today)}, from ${plannerContent.startingPoint.fromLabels[startingPoint]}`
}

/** "Earlier results · Sat, Oct 17 · from Vancouver · 3 trails". */
export function earlierResultsLabel(
  tripDate: string,
  startingPoint: StartingPointKind,
  count: number,
  today: string,
): string {
  const trails = count === 1 ? "1 trail" : `${count} trails`
  return `${plannerContent.results.earlier} · ${formatTripDateShort(tripDate, today)} · from ${plannerContent.startingPoint.fromLabels[startingPoint]} · ${trails}`
}

/** What a trail is called when it has no name: for assistive technology only. */
export function recommendationName(
  trail: TrailRecommendation,
  position: number,
): string {
  return trail.name ?? `Recommendation ${position}`
}

/** "1,850 / 2,000". */
export function formatCharacterCount(length: number, limit: number): string {
  return `${numberFormat.format(length)} / ${numberFormat.format(limit)}`
}
