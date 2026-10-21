import type { Plan } from "../types/plan"
import { monthOfIso, type CalendarMonth } from "./calendarMonth"

/**
 * The Plan collection as My Plans presents it (FEATURE-013 sections 11, 13).
 * Pure: trip dates are compared as `YYYY-MM-DD` strings (D21), which orders
 * them as calendar dates.
 */

export type PlanSections = {
  /** `tripDate >= today`, in the server's order: nearest first (D7). */
  upcoming: Plan[]
  /** `tripDate < today`, most recent first; server order within a day. */
  past: Plan[]
}

export type PlanSectionName = keyof PlanSections

/** Upcoming / Past against the viewer's local today (D6, D7). */
export function splitPlans(plans: readonly Plan[], today: string): PlanSections {
  const upcoming = plans.filter((plan) => plan.tripDate >= today)
  // `sort` is stable, so Plans on one date keep the server's order
  // (`createdAt`, then `id`, ascending).
  const past = plans
    .filter((plan) => plan.tripDate < today)
    .sort((a, b) =>
      a.tripDate === b.tripDate ? 0 : a.tripDate < b.tripDate ? 1 : -1,
    )
  return { upcoming, past }
}

export function sectionOf(plan: Plan, today: string): PlanSectionName {
  return plan.tripDate >= today ? "upcoming" : "past"
}

/** The Plans of each date, in the order given. */
export function plansByDate(
  plans: readonly Plan[],
): ReadonlyMap<string, readonly Plan[]> {
  const byDate = new Map<string, Plan[]>()
  for (const plan of plans) {
    const day = byDate.get(plan.tripDate)
    if (day === undefined) {
      byDate.set(plan.tripDate, [plan])
    } else {
      day.push(plan)
    }
  }
  return byDate
}

/** A Plan by id, compared lowercased (D17). */
export function findPlan(
  plans: readonly Plan[],
  planId: string | null,
): Plan | null {
  if (planId === null || planId === "") {
    return null
  }
  const wanted = planId.toLowerCase()
  return plans.find((plan) => plan.id.toLowerCase() === wanted) ?? null
}

/**
 * The month the calendar opens on (D12): the selected Plan's, else the
 * nearest Upcoming Plan's, else the current month.
 */
export function initialMonth(
  selected: Plan | null,
  upcoming: readonly Plan[],
  today: string,
): CalendarMonth {
  if (selected !== null) {
    return monthOfIso(selected.tripDate)
  }
  if (upcoming.length > 0) {
    return monthOfIso(upcoming[0].tripDate)
  }
  return monthOfIso(today)
}
