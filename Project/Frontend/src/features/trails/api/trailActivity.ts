import { isTrailId } from "../trailId"
import type { TrailActivity } from "../types/trail"
import { publicFailureKindOfStatus, publicRequest } from "./publicRequest"
import { TrailReadError } from "./trailList"
import { isRecord, readText } from "./tripRequest"

/** The one source value that is not sample data (FEATURE-006 section 6.2). */
const RECORDED_SOURCE = "RECORDED"

/**
 * Today's Daily Trail Activity for every trail, in one request (FEATURE-006
 * sections 6.2, 9.1). `date` is the viewer's local calendar date. Requested
 * without a token. Any failure, a `400` included, means the activity is
 * unavailable; it never blocks the trails themselves.
 */
export async function requestTrailActivity(
  date: string,
  cancel: AbortSignal,
): Promise<TrailActivity> {
  const outcome = await publicRequest(
    `/api/trails/activity?date=${encodeURIComponent(date)}`,
    cancel,
  )

  switch (outcome.kind) {
    case "ok": {
      const activity = readTrailActivity(outcome.body, date)
      if (activity === null) {
        throw new TrailReadError("refused")
      }
      return activity
    }
    case "status":
      throw new TrailReadError(publicFailureKindOfStatus(outcome.status))
    case "unreadable":
      throw new TrailReadError("refused")
    case "timeout":
      throw new TrailReadError("timeout")
    case "network":
      throw new TrailReadError("unavailable")
  }
}

/**
 * The response is untrusted. Null means it cannot be used at all: not a
 * record, no list of trails, or figures for another day than the one asked
 * for. Within it, an entry without a trail id or with a count that is not a
 * non-negative integer is left out, so that trail reads as unknown, never as
 * zero (section 7.2, criterion AT4).
 */
function readTrailActivity(body: unknown, date: string): TrailActivity | null {
  if (!isRecord(body) || !Array.isArray(body.trails) || body.date !== date) {
    return null
  }

  const counts = new Map<string, number>()
  for (const entry of body.trails) {
    if (!isRecord(entry) || !isTrailId(entry.trailId)) {
      continue
    }
    const count = entry.activityCount
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      continue
    }
    counts.set(entry.trailId.toLowerCase(), count)
  }

  return {
    date,
    // Anything but the one recorded value, unknown values included, is
    // disclosed as sample activity (D11).
    sample: readText(body.source) !== RECORDED_SOURCE,
    counts,
  }
}
