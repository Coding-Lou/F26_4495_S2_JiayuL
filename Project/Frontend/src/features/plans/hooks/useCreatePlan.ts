import { useMutation } from "@tanstack/react-query"
import { createPlan } from "../api/plans"

/**
 * Saves a Plan (FEATURE-011 section 13.3). Not optimistic, and never retried
 * by itself: a second attempt is the user's, and is safe because the create
 * is idempotent. `networkMode: "always"` makes an offline save fail at once
 * instead of pausing. Nothing is written to the query cache: FEATURE-011 has
 * no Plan query.
 */
export function useCreatePlan() {
  return useMutation({
    mutationFn: createPlan,
    retry: false,
    networkMode: "always",
  })
}
