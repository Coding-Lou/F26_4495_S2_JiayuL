import { useQuery } from "@tanstack/react-query"
import { requestTrailList, trailReadFailureKindOf } from "../api/trailList"

/** Fresh for 5 minutes (FEATURE-006 section 9.2). */
const TRAIL_LIST_FRESH_MS = 5 * 60_000

export const trailListQueryKey = ["trails", "list"] as const

/**
 * Every trail, as server state (FEATURE-006 section 9.2). Trail data is the
 * same for every visitor, so the key has no subject.
 *
 * It asks once per visit within the freshness window: never on window focus,
 * reconnect, or a timer. A network or server failure is tried once more by
 * itself.
 */
export function useTrailList() {
  return useQuery({
    queryKey: trailListQueryKey,
    // The query's own signal is not used: a read abandoned by an unmount
    // (StrictMode's dev remount included) would be sent a second time. The
    // request still ends at its 20 s limit (FEATURE-006 section 9.1).
    queryFn: () => requestTrailList(new AbortController().signal),
    staleTime: TRAIL_LIST_FRESH_MS,
    retry: (failureCount, error) =>
      failureCount < 1 && trailReadFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
