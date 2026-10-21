import { isIsoDate } from "@/features/planning/tripDate"
import type {
  CreatePlanRequest,
  CreatePlanResult,
  Plan,
  PlanFailureKind,
} from "../types/plan"
import { planRequest, type PlanRequestOutcome } from "./planRequest"

const PLANS_PATH = "/api/plans"

/** A Plan request that produced no usable answer, and which kind it was. */
export class PlanRequestError extends Error {
  readonly kind: PlanFailureKind

  constructor(kind: PlanFailureKind) {
    super("Plan request failed")
    this.name = "PlanRequestError"
    this.kind = kind
  }
}

/** Anything that is not a `PlanRequestError` is `unavailable` (section 13.2). */
export function planFailureKindOf(error: unknown): PlanFailureKind {
  return error instanceof PlanRequestError ? error.kind : "unavailable"
}

/** Every outcome that is not a `2xx`, as a failure (section 13.2). */
function failureOf(outcome: Exclude<PlanRequestOutcome, { kind: "ok" }>) {
  switch (outcome.kind) {
    case "no-session":
      return new PlanRequestError("no-session")
    case "timeout":
      return new PlanRequestError("unconfirmed")
    case "network":
      return new PlanRequestError("unavailable")
    case "status":
      return new PlanRequestError(
        statusFailureKind(
          outcome.status,
          outcome.problem.code,
          outcome.problem.fields,
        ),
      )
  }
}

function statusFailureKind(
  status: number,
  code: string | null,
  fields: readonly string[],
): PlanFailureKind {
  if (status === 400 && code === "TRAIL_NOT_FOUND") {
    return "trail-gone"
  }
  if (
    status === 400 &&
    code === "VALIDATION_ERROR" &&
    fields.includes("tripDate")
  ) {
    return "invalid-date"
  }
  // Includes 503 TRAIL_SERVICE_UNAVAILABLE and the dev proxy's 500 when
  // plan-service is not running.
  if (status >= 500) {
    return "unavailable"
  }
  // Another 400, a 401 / 403 on a token the client still held, 404, 405…
  return "unexpected"
}

/**
 * Saves the Plan for one trail and date (section 12.2). Idempotent on the
 * server: a `201` is a new Plan, a `200` the same Plan already saved. The
 * body is exactly `{ trailId, tripDate }`.
 */
export async function createPlan(
  request: CreatePlanRequest,
): Promise<CreatePlanResult> {
  const body: CreatePlanRequest = {
    trailId: request.trailId,
    tripDate: request.tripDate,
  }
  const outcome = await planRequest(PLANS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  return {
    saved: outcome.status === 201 ? "created" : "existing",
    plan: readPlan(outcome.body),
  }
}

/** A `PlanResponse` as the contract describes it, or null. */
export function readPlan(value: unknown): Plan | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const record = value as Record<string, unknown>
  const { id, trailId, tripDate, status, createdAt, updatedAt } = record
  if (
    typeof id !== "string" ||
    id === "" ||
    typeof trailId !== "string" ||
    trailId === "" ||
    !isIsoDate(tripDate) ||
    status !== "READY" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null
  }
  return { id, trailId, tripDate, status, createdAt, updatedAt }
}

/** The contract's largest page (FEATURE-013 D4): one request in normal use. */
export const PLAN_LIST_PAGE_SIZE = 50

/**
 * The most pages one read takes (FEATURE-013 section 8, amendment A1): 500
 * Plans. A collection larger than that is never shown in part.
 */
export const PLAN_LIST_MAX_PAGES = 10

/**
 * The whole collection could not be read as one consistent list (amendment
 * A1): more than `PLAN_LIST_MAX_PAGES` pages, or the paging metadata kept
 * changing after the one restart. Its kind is `unexpected`, so the query
 * does not retry it by itself; the screen shows its own state for it and
 * never a partial list.
 */
export class PlanListIncompleteError extends PlanRequestError {
  constructor() {
    super("unexpected")
    this.name = "PlanListIncompleteError"
  }
}

type PlanListPage = {
  items: Plan[]
  totalItems: number
  totalPages: number
}

/** How one pass over the pages ended. */
type PlanListPass =
  | { kind: "complete"; plans: Plan[] }
  /** `totalPages` above the window: nothing past the first page is read. */
  | { kind: "overflow" }
  /** `totalItems` or `totalPages` differed from the first page's. */
  | { kind: "changed" }

/**
 * Every Plan of the signed-in user, read whole (FEATURE-013 section 8): page
 * 0 with `size=50`, then the following pages in order, one at a time, and
 * one flat list in the server's order (`tripDate`, `createdAt`, `id`
 * ascending), de-duplicated by `id`.
 *
 * Amendment A1: with more than ten pages the read stops and fails with
 * `PlanListIncompleteError`. If the metadata changes between the first page
 * and a later one, the read restarts from page 0 once; if it changes again,
 * the same error. A failed or unreadable page, or one unreadable item, fails
 * the whole read: a partial collection would make the calendar claim that
 * dates are free.
 */
export async function requestPlans(cancel: AbortSignal): Promise<Plan[]> {
  const first = await readAllPlanPages(cancel)
  if (first.kind === "complete") {
    return first.plans
  }
  if (first.kind === "overflow") {
    throw new PlanListIncompleteError()
  }

  // The one restart (section 8, offset consistency).
  const second = await readAllPlanPages(cancel)
  if (second.kind === "complete") {
    return second.plans
  }
  throw new PlanListIncompleteError()
}

async function readAllPlanPages(cancel: AbortSignal): Promise<PlanListPass> {
  const first = await readPlanListPage(0, cancel)
  if (first.totalPages > PLAN_LIST_MAX_PAGES) {
    return { kind: "overflow" }
  }

  const items = [...first.items]
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await readPlanListPage(page, cancel)
    if (
      next.totalItems !== first.totalItems ||
      next.totalPages !== first.totalPages
    ) {
      return { kind: "changed" }
    }
    items.push(...next.items)
  }

  const seen = new Set<string>()
  const plans: Plan[] = []
  for (const plan of items) {
    const key = plan.id.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      plans.push(plan)
    }
  }
  return { kind: "complete", plans }
}

async function readPlanListPage(
  page: number,
  cancel: AbortSignal,
): Promise<PlanListPage> {
  const outcome = await planRequest(
    `${PLANS_PATH}?page=${page}&size=${PLAN_LIST_PAGE_SIZE}`,
    { method: "GET" },
    { cancel },
  )
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  const read = readPlanPage(outcome.body)
  if (read === null) {
    throw new PlanRequestError("unexpected")
  }
  return read
}

/**
 * A `PlanPage` whose every item is a readable `PlanResponse`, or null. The
 * page's own `page` and `size` are not needed.
 */
function readPlanPage(value: unknown): PlanListPage | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const record = value as Record<string, unknown>
  const { items, totalItems, totalPages } = record
  if (
    !Array.isArray(items) ||
    !isCount(totalItems) ||
    !isCount(totalPages)
  ) {
    return null
  }

  const plans: Plan[] = []
  for (const item of items) {
    const plan = readPlan(item)
    if (plan === null) {
      return null
    }
    plans.push(plan)
  }
  return { items: plans, totalItems, totalPages }
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

/**
 * Deletes one Plan (FEATURE-013 D18). `204` and `404` both mean it is gone:
 * a second tab may already have deleted it. Anything else is a failure.
 */
export async function deletePlan(planId: string): Promise<void> {
  const outcome = await planRequest(
    `${PLANS_PATH}/${encodeURIComponent(planId)}`,
    { method: "DELETE" },
  )
  if (outcome.kind === "ok") {
    return
  }
  if (outcome.kind === "status" && outcome.status === 404) {
    return
  }
  throw failureOf(outcome)
}
