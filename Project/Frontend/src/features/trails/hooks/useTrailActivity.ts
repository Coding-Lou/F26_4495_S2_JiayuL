import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { todayIso } from "@/features/planning/tripDate"
import { requestTrailActivity } from "../api/trailActivity"
import { trailReadFailureKindOf } from "../api/trailList"

/** Fresh for 5 minutes (FEATURE-006 section 9.2). */
const ACTIVITY_FRESH_MS = 5 * 60_000

export function trailActivityQueryKey(date: string) {
  return ["trails", "activity", date] as const
}

/**
 * Today's activity for every trail, one request shared by the list, the
 * markers, and the Trail Detail popup (FEATURE-006 sections 9.1, 9.2).
 *
 * "Today" is the viewer's local date, taken once when the screen mounts, so a
 * visit keeps one date. No polling, no refetch on focus or reconnect. Only a
 * network or server failure is tried once more.
 */
export function useTrailActivity(enabled = true) {
  const [date] = useState(todayIso)

  return useQuery({
    queryKey: trailActivityQueryKey(date),
    // As for the trail list: one request per visit, never re-sent because
    // a component unmounted while it was in flight (section 9.1).
    queryFn: () => requestTrailActivity(date, new AbortController().signal),
    enabled,
    staleTime: ACTIVITY_FRESH_MS,
    retry: (failureCount, error) =>
      failureCount < 1 && trailReadFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
