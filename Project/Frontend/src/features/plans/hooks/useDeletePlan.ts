import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import { deletePlan } from "../api/plans"
import type { Plan } from "../types/plan"
import { plansQueryKey } from "./usePlans"

/**
 * Deletes one Plan (FEATURE-013 D18). Not optimistic: once plan-service has
 * answered `204` or `404`, the Plan leaves the cached list, and the list is
 * then requested again. Never retried by itself: a second attempt is the
 * user's. `networkMode: "always"` makes an offline delete fail at once.
 */
export function useDeletePlan() {
  const queryClient = useQueryClient()
  const subject = getAuthenticatedSubject()

  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    retry: false,
    networkMode: "always",
    onSuccess: (_result: void, planId) => {
      const key = plansQueryKey(subject)
      queryClient.setQueryData<Plan[]>(key, (list) =>
        list?.filter((plan) => plan.id !== planId),
      )
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
