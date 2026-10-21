import { useQuery } from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  PackRecommendationError,
  packFailureKindOf,
  requestPackRecommendation,
} from "../api/packRecommendation"

/**
 * A pack result depends on who is asking: ownership is the signed-in user's.
 * The key therefore starts with their subject, so one user's result is never
 * shown to another (FEATURE-004 section 25, D14).
 */
export function packRecommendationQueryKey(
  subject: string | null,
  trailId: string,
  tripDate: string,
) {
  return [
    "packing",
    "recommendation",
    subject,
    trailId.toLowerCase(),
    tripDate,
  ] as const
}

/**
 * The pack recommendation as server state (section 16). It is a read,
 * although the endpoint is a `POST`, so it is a query.
 *
 * `trailId` and `tripDate` are null when the address has no usable value for
 * them: no request is made then.
 *
 * It runs on entering Trip Preparation, on reload, on a date change, and on
 * Retry: always when the screen mounts, so gear changed elsewhere is
 * reflected on return, and never on window focus or on a timer. A network or
 * server failure is tried once more by itself; a refused date, a refusal, an
 * unusable answer, and a timeout are not. `networkMode: "always"` makes an
 * offline request fail at once instead of waiting unseen.
 */
export function usePackRecommendation(
  trailId: string | null,
  tripDate: string | null,
) {
  const subject = getAuthenticatedSubject()

  return useQuery({
    queryKey: packRecommendationQueryKey(subject, trailId ?? "", tripDate ?? ""),
    queryFn: ({ signal }) => {
      // With no subject there is nobody to key the result by: no request.
      if (subject === null || trailId === null || tripDate === null) {
        throw new PackRecommendationError("refused")
      }
      return requestPackRecommendation({ trailId, tripDate }, signal)
    },
    enabled: trailId !== null && tripDate !== null,
    retry: (failureCount, error) =>
      failureCount < 1 && packFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
