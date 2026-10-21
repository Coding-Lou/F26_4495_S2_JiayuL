import type { TrailSummary } from "../types/trail"
import { publicFailureKindOfStatus, publicRequest } from "./publicRequest"
import { readTrailSummary, TrailReadError } from "./trailList"
import { isRecord } from "./tripRequest"

/** The service's bounds for `radiusKm` (exclusive 0, inclusive 150). */
export const NEARBY_MAX_RADIUS_KM = 150

/** One nearby read: a centre and a whole-kilometre radius. */
export type NearbyTrailsParams = {
  lat: number
  lon: number
  radiusKm: number
}

/**
 * The trails within `radiusKm` of a point, nearest first, checked
 * (`GET /api/trails/nearby`, public). Requested without a token through the
 * tokenless public request, like the trail list. Every source is returned:
 * the curated catalog and the generated candidates alike.
 *
 * `cancel` abandons it (TanStack Query aborts a read whose key the screen
 * has left). The same failure kinds as the trail list.
 */
export async function requestNearbyTrails(
  params: NearbyTrailsParams,
  cancel: AbortSignal,
): Promise<TrailSummary[]> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    radiusKm: String(params.radiusKm),
  })
  const outcome = await publicRequest(`/api/trails/nearby?${query}`, cancel)

  switch (outcome.kind) {
    case "ok": {
      const trails = readNearbyTrails(outcome.body)
      if (trails === null) {
        throw new TrailReadError("refused")
      }
      return trails
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
 * The response is untrusted. Null means it is not a list. Each item is
 * `{ trail, distanceFromUserKm }`; an item without a readable trail is
 * dropped, a repeated id is kept once, and the server's nearest-first order
 * is kept. The distance itself is not needed: the order carries it.
 */
function readNearbyTrails(body: unknown): TrailSummary[] | null {
  if (!Array.isArray(body)) {
    return null
  }

  const trails: TrailSummary[] = []
  const seen = new Set<string>()

  for (const item of body) {
    const trail = isRecord(item) ? readTrailSummary(item.trail) : null
    if (trail === null || seen.has(trail.id)) {
      continue
    }
    seen.add(trail.id)
    trails.push(trail)
  }

  return trails
}
