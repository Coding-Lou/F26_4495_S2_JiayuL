import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query"
import { trailReadFailureKindOf } from "../api/trailList"
import {
  requestNearbyTrails,
  type NearbyTrailsParams,
} from "../api/trailNearby"

/** Fresh for 5 minutes, like the trail list (FEATURE-006 section 9.2). */
const NEARBY_FRESH_MS = 5 * 60_000

/** About 100 m: two views this close share one cache entry. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** The centre rounded to 3 decimals; the radius is already whole km. */
function normalize(params: NearbyTrailsParams): NearbyTrailsParams {
  return {
    lat: round3(params.lat),
    lon: round3(params.lon),
    radiusKm: params.radiusKm,
  }
}

export function nearbyTrailsQueryKey(params: NearbyTrailsParams) {
  const { lat, lon, radiusKm } = normalize(params)
  return ["trails", "nearby", lat, lon, radiusKm] as const
}

/**
 * The trails around one settled map view, as server state. Trail data is the
 * same for every visitor, so the key has no subject. `params` is null until
 * Discover is about to be seen: no request is made then.
 *
 * Stale responses: each view is its own key, and the hook only ever returns
 * the current key's data, or, while that loads, the previous result marked
 * `isPlaceholderData`. A slower response for a view the visitor has already
 * left lands in that view's own cache entry and never reaches the screen;
 * leaving the key also aborts it through the query's signal.
 *
 * No polling, no refetch on focus or reconnect. A network or server failure
 * is tried once more by itself.
 */
export function useNearbyTrails(params: NearbyTrailsParams | null) {
  const normalized = params === null ? null : normalize(params)

  return useQuery({
    queryKey:
      normalized === null
        ? (["trails", "nearby", "idle"] as const)
        : nearbyTrailsQueryKey(normalized),
    queryFn:
      normalized === null
        ? skipToken
        : ({ signal }) => requestNearbyTrails(normalized, signal),
    placeholderData: keepPreviousData,
    staleTime: NEARBY_FRESH_MS,
    retry: (failureCount, error) =>
      failureCount < 1 && trailReadFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
