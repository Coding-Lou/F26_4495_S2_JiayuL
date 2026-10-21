import { activityContent } from "./content"
import type { TrailActivity } from "./types/trail"

/**
 * Daily Trail Activity for one trail, as every screen reads it (FEATURE-006
 * sections 7.2, 16.9.6). "Unknown" is never shown as zero.
 */
export type ActivityReading =
  /** The request is in flight. */
  | { kind: "loading" }
  /** The whole request failed. */
  | { kind: "failed" }
  /** The request succeeded but has no usable entry for this trail. */
  | { kind: "unknown"; sample: boolean }
  /** A confirmed count, zero included. */
  | { kind: "count"; count: number; sample: boolean }

/** The three coarse marker levels (section 16.8.6). */
export type ActivityLevel = "base" | "some" | "many"

/** From this count a trail is "many"; from 1 it is "some". Absolute, fixed. */
export const ACTIVITY_MANY_FROM = 10

type ActivityQueryLike = {
  data: TrailActivity | undefined
  isError: boolean
}

export function readActivity(
  query: ActivityQueryLike,
  trailId: string,
): ActivityReading {
  if (query.data !== undefined) {
    const count = query.data.counts.get(trailId.toLowerCase())
    return count === undefined
      ? { kind: "unknown", sample: query.data.sample }
      : { kind: "count", count, sample: query.data.sample }
  }
  return query.isError ? { kind: "failed" } : { kind: "loading" }
}

/** Base covers zero, unknown, loading, and failure alike. */
export function activityLevel(reading: ActivityReading): ActivityLevel {
  if (reading.kind !== "count" || reading.count < 1) {
    return "base"
  }
  return reading.count >= ACTIVITY_MANY_FROM ? "many" : "some"
}

/** TA1, TA2, or TA3 for a confirmed count. */
export function activityCountText(count: number): string {
  return count === 0 ? activityContent.none : activityContent.planned(count)
}
