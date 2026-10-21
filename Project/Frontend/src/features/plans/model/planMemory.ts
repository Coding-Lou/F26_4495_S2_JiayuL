import type { MemorySummary } from "@/features/memories/types/memory"
import { isSyntheticTrailSource } from "@/features/trails/content"
import type { PlanTrail } from "../hooks/usePlanTrails"
import type { Plan } from "../types/plan"

/**
 * The user's Memories by trail and trip date (FEATURE-014 section 7):
 * `"<lower-case trail id>/<YYYY-MM-DD>"` → the id of the first Memory in the
 * server's order, which within one trail and date is the one created last.
 * Derived from one complete read; nothing is stored on a Plan or a Memory.
 */
export type PlanMemoryIndex = ReadonlyMap<string, string>

function matchKey(trailId: string, tripDate: string): string {
  return `${trailId.toLowerCase()}/${tripDate}`
}

export function buildPlanMemoryIndex(
  memories: readonly MemorySummary[],
): PlanMemoryIndex {
  const index = new Map<string, string>()
  for (const memory of memories) {
    const key = matchKey(memory.trailId, memory.tripDate)
    if (!index.has(key)) {
      index.set(key, memory.id)
    }
  }
  return index
}

/** The Memory kept of this Plan's trip, or null. Dates compare as strings. */
export function memoryForPlan(
  index: PlanMemoryIndex,
  plan: Pick<Plan, "trailId" | "tripDate">,
): string | null {
  return index.get(matchKey(plan.trailId, plan.tripDate)) ?? null
}

/** What the screen knows of the user's Memories as a whole (section 8). */
export type PlanMemoryIndexState =
  /** Pending, disabled, without a session, or being read again. */
  | { kind: "checking" }
  /** The read failed or was incomplete: never "no Memory". */
  | { kind: "unavailable"; retrying: boolean; retry: () => void }
  | { kind: "ready"; index: PlanMemoryIndex }

/** The bridge of one selected Plan (section 8, the rule table). */
export type PlanMemoryStatus =
  | { kind: "none" }
  | { kind: "checking" }
  | { kind: "add" }
  | { kind: "view"; memoryId: string }
  | { kind: "unavailable"; retrying: boolean; retry: () => void }

const NONE: PlanMemoryStatus = { kind: "none" }
const CHECKING: PlanMemoryStatus = { kind: "checking" }
const ADD: PlanMemoryStatus = { kind: "add" }

/**
 * Whether a Past Plan may still need the bridge (section 8, enablement): its
 * trail is not already known to be synthetic or gone. A trail still loading,
 * or whose lookup failed, may yet turn out to be curated.
 */
export function mayHaveMemoryBridge(trail: PlanTrail | undefined): boolean {
  if (trail === undefined) {
    return true
  }
  switch (trail.status) {
    case "gone":
      return false
    case "ready":
      return !isSyntheticTrailSource(trail.trail.source)
    default:
      return true
  }
}

/**
 * Section 8's rules, in order; the first that matches wins. Only a Past Plan
 * on a curated trail that has resolved has a bridge, and unknown or failed
 * detection never becomes Add memory.
 */
export function planMemoryStatus(
  plan: Pick<Plan, "trailId" | "tripDate">,
  trail: PlanTrail,
  upcoming: boolean,
  memories: PlanMemoryIndexState,
): PlanMemoryStatus {
  if (upcoming) {
    return NONE
  }
  if (trail.status !== "ready" || isSyntheticTrailSource(trail.trail.source)) {
    return NONE
  }
  switch (memories.kind) {
    case "unavailable":
      return memories
    case "checking":
      return CHECKING
    case "ready": {
      const memoryId = memoryForPlan(memories.index, plan)
      return memoryId !== null ? { kind: "view", memoryId } : ADD
    }
  }
}
