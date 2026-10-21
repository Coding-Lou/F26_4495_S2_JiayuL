/**
 * The Plan contract of plan-service (FEATURE-011 sections 12.1, 12.2). A Plan
 * is one user's decision to go on one trail on one date. It carries no trail,
 * weather, or gear data, and never the owner.
 */

/** The one status FEATURE-011 knows (D3). Wire value, never shown as is. */
export type PlanStatus = "READY"

/** `PlanResponse`, for create, list, and detail alike (D11). */
export type Plan = {
  id: string
  trailId: string
  /** `YYYY-MM-DD`, a local calendar date. */
  tripDate: string
  status: PlanStatus
  /** ISO-8601 in UTC. */
  createdAt: string
  updatedAt: string
}

/**
 * `PlanPage` of `GET /api/plans` (section 12.3). FEATURE-011 makes no list
 * request; FEATURE-013's My Plans reads every page (`requestPlans`).
 */
export type PlanPage = {
  items: Plan[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** The body of `POST /api/plans`, exactly these two fields. */
export type CreatePlanRequest = {
  trailId: string
  tripDate: string
}

/**
 * A save that succeeded. `created` is a `201`; any other `2xx` is `existing`
 * (the same Plan, already saved). `plan` is null when a `2xx` answer could
 * not be read: the status alone says it was saved.
 */
export type CreatePlanResult = {
  saved: "created" | "existing"
  plan: Plan | null
}

/** How a save did not succeed (section 13.2). */
export type PlanFailureKind =
  /** The trip date is before today: found by the client, or named by the server. */
  | "invalid-date"
  /** There is no session, so nothing was sent. FEATURE-002 takes over. */
  | "no-session"
  /** The time limit was reached: the save may or may not have happened. */
  | "unconfirmed"
  /** No response, or a `5xx`. */
  | "unavailable"
  /** `400 TRAIL_NOT_FOUND`. */
  | "trail-gone"
  /** Any other status. */
  | "unexpected"
