import { queryOptions, useQuery } from "@tanstack/react-query"
import { requestTrailDetail, trailFailureKindOf } from "../api/trailDetail"

/** Trail facts are the same for every user, so the key needs no subject. */
export function trailDetailQueryKey(trailId: string) {
  return ["trails", "detail", trailId.toLowerCase()] as const
}

/**
 * The query of one trail (FEATURE-004 sections 7.1, 15), shared so that
 * every reader of a trail uses one policy: Trail Detail and Trip Preparation
 * through `useTrailDetail`, My Plans through `useQueries` (FEATURE-013 D5).
 *
 * `trailId` is null when the route's id cannot be a trail id: no request is
 * made then.
 *
 * It asks again only when a screen mounts with a result older than the query
 * client's freshness window, on reload, and on Retry: not when the window
 * regains focus and not on a timer. A network or server failure is tried once
 * more by itself; a missing trail, a refusal, and a timeout are not.
 * `networkMode: "always"` makes an offline request fail at once instead of
 * waiting unseen for the connection to return.
 */
export function trailDetailQueryOptions(trailId: string | null) {
  return queryOptions({
    queryKey: trailDetailQueryKey(trailId ?? ""),
    queryFn: ({ signal }) => requestTrailDetail(trailId ?? "", signal),
    enabled: trailId !== null,
    retry: (failureCount, error) =>
      failureCount < 1 && trailFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * One trail as server state. Trail Detail and Trip Preparation share this
 * query, so arriving at one from the other reuses the result.
 */
export function useTrailDetail(trailId: string | null) {
  return useQuery({ ...trailDetailQueryOptions(trailId) })
}
