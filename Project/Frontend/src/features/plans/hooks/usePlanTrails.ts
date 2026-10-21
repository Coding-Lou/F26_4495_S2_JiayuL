import { useQueries } from "@tanstack/react-query"
import { trailFailureKindOf } from "@/features/trails/api/trailDetail"
import { trailDetailQueryOptions } from "@/features/trails/hooks/useTrailDetail"
import { isTrailId } from "@/features/trails/trailId"
import type { TrailDetail } from "@/features/trails/types/trail"
import type { Plan } from "../types/plan"

/** What My Plans knows of one Plan's trail (FEATURE-013 sections 9, 16). */
export type PlanTrail =
  | { status: "loading" }
  | { status: "ready"; trail: TrailDetail }
  /** `404`, on the status alone: the trail no longer exists. */
  | { status: "gone" }
  /** Any other failure: the lookup may succeed later. */
  | { status: "failed"; retrying: boolean; retry: () => void }

const LOADING: PlanTrail = { status: "loading" }
const GONE: PlanTrail = { status: "gone" }

/** The key a Plan's trail is found under in the result. */
export function planTrailKey(trailId: string): string {
  return trailId.toLowerCase()
}

/**
 * Hydrates the trails of a list of Plans (FEATURE-013 D5): one cached query
 * per distinct trail, with the key and policy of Trail Detail, so two Plans
 * on one trail make one request and View trail reuses the result. A trail id
 * that cannot be a trail is gone, with no request.
 */
export function usePlanTrails(
  plans: readonly Plan[],
): ReadonlyMap<string, PlanTrail> {
  const ids: string[] = []
  for (const plan of plans) {
    const key = planTrailKey(plan.trailId)
    if (isTrailId(key) && !ids.includes(key)) {
      ids.push(key)
    }
  }

  return useQueries({
    queries: ids.map((id) => trailDetailQueryOptions(id)),
    combine: (results) => {
      const trails = new Map<string, PlanTrail>()
      for (const plan of plans) {
        const key = planTrailKey(plan.trailId)
        if (!isTrailId(key)) {
          trails.set(key, GONE)
        }
      }
      results.forEach((result, index) => {
        const id = ids[index]
        if (
          result.isError &&
          trailFailureKindOf(result.error) === "not-found"
        ) {
          trails.set(id, GONE)
        } else if (result.data !== undefined) {
          trails.set(id, { status: "ready", trail: result.data })
        } else if (result.isError) {
          trails.set(id, {
            status: "failed",
            retrying: result.isFetching,
            retry: () => {
              void result.refetch()
            },
          })
        } else {
          trails.set(id, LOADING)
        }
      })
      return trails
    },
  })
}
