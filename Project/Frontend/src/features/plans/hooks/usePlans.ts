import { useQuery } from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  PlanRequestError,
  planFailureKindOf,
  requestPlans,
} from "../api/plans"

/**
 * A user's Plans are theirs: the key holds their subject, so one user's list
 * is never shown to another (FEATURE-013 D20). Sign-out and the end of a
 * session clear the whole query cache.
 */
export function plansQueryKey(subject: string | null) {
  return ["plans", "mine", subject] as const
}

/**
 * The signed-in user's whole Plan collection as server state (FEATURE-013
 * section 8). No request without a subject.
 *
 * It runs every time My Plans mounts (D4a): the save in the Studio writes no
 * cache, so this is what makes Continue land on a list that holds the Plan
 * just saved. Never on window focus, reconnect, or a timer. A network or
 * server failure is tried once more by itself; nothing else is, including an
 * incomplete collection (amendment A1). `networkMode: "always"` makes an
 * offline request fail at once.
 */
export function usePlans() {
  const subject = getAuthenticatedSubject()

  return useQuery({
    queryKey: plansQueryKey(subject),
    queryFn: ({ signal }) => {
      if (subject === null) {
        throw new PlanRequestError("no-session")
      }
      return requestPlans(signal)
    },
    enabled: subject !== null,
    retry: (failureCount, error) =>
      failureCount < 1 && planFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
