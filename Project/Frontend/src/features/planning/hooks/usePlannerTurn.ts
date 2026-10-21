import { useMutation } from "@tanstack/react-query"
import { failureKindOf, requestPlannerTurn } from "../api/plannerTurn"
import { failTurn, resolveTurn, type PlannerTurn } from "../state/plannerStore"

/**
 * The planner turn as a TanStack Query mutation (FEATURE-003 section 20).
 *
 * One request per turn: no retry, no polling. `networkMode: "always"` makes
 * an offline turn fail at once as "unavailable" instead of waiting unseen for
 * the connection to return.
 *
 * The outcome is handled by the mutation itself, not by the caller, so a
 * reply is still applied if the user has stepped away from `/home`. Whether
 * it still has a conversation to go to is decided by the store.
 */
export function usePlannerTurn(): (turn: PlannerTurn) => void {
  const { mutate } = useMutation({
    mutationFn: (turn: PlannerTurn) =>
      requestPlannerTurn(turn.request, turn.signal),
    retry: false,
    networkMode: "always",
    onSuccess: (result, turn) => resolveTurn(turn, result),
    onError: (error, turn) => failTurn(turn, failureKindOf(error)),
  })

  return mutate
}
