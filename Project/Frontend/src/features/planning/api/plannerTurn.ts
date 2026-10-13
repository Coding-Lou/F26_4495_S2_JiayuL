import { NotAuthenticatedError } from "@/features/auth"
import { authenticatedApiRequest } from "@/services/apiClient"
import { isRecord, readTrailRecommendation } from "../readRecommendation"
import type {
  FailureKind,
  PlannerTurnRequest,
  PlannerTurnResult,
  PlanningContext,
  TrailRecommendation,
} from "../types/planner"

/** One client limit for a turn (FEATURE-003 section 13.1, D12). */
export const PLANNER_TURN_TIMEOUT_MS = 45_000

const PLANNER_TURN_PATH = "/api/planner/turn"

/**
 * A turn that did not produce a reply. It carries only which of the
 * user-facing kinds applies (section 13.2): no status code, no backend text.
 */
export class PlannerTurnError extends Error {
  readonly kind: FailureKind

  constructor(kind: FailureKind) {
    super("Planner turn failed")
    this.name = "PlannerTurnError"
    this.kind = kind
  }
}

export function failureKindOf(error: unknown): FailureKind {
  return error instanceof PlannerTurnError ? error.kind : "unavailable"
}

/**
 * Sends one conversation turn and returns the checked reply.
 *
 * `cancel` abandons the request (New Plan, the session ending). The request
 * is also abandoned after 45 seconds, which is reported as a timeout. Nothing
 * about a failure is logged.
 */
export async function requestPlannerTurn(
  request: PlannerTurnRequest,
  cancel: AbortSignal,
): Promise<PlannerTurnResult> {
  const controller = new AbortController()
  let timedOut = false

  const abandon = () => controller.abort()
  cancel.addEventListener("abort", abandon)
  if (cancel.aborted) {
    controller.abort()
  }

  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PLANNER_TURN_TIMEOUT_MS)

  try {
    let response: Response
    try {
      response = await authenticatedApiRequest(PLANNER_TURN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof NotAuthenticatedError) {
        // No request was made. When the session has just ended, the planner
        // is already gone and this result is discarded.
        throw new PlannerTurnError("sign-in")
      }
      throw new PlannerTurnError(timedOut ? "timeout" : "unavailable")
    }

    if (!response.ok) {
      throw new PlannerTurnError(await failureKindOfResponse(response))
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new PlannerTurnError(timedOut ? "timeout" : "unavailable")
    }

    const result = readPlannerTurnResponse(body)
    if (result === null) {
      throw new PlannerTurnError("unavailable")
    }
    return result
  } finally {
    window.clearTimeout(timer)
    cancel.removeEventListener("abort", abandon)
  }
}

/** Section 13.2. Anything the table does not name is "unavailable". */
async function failureKindOfResponse(response: Response): Promise<FailureKind> {
  if (response.status === 401 || response.status === 403) {
    return "sign-in"
  }

  if (response.status === 400) {
    return (await hasUnsafePromptTitle(response))
      ? "not-accepted"
      : "invalid-request"
  }

  return "unavailable"
}

/**
 * The prompt guard answers with a `ProblemDetail` titled "Unsafe Prompt".
 * Other 400 bodies have no guaranteed shape, so a missing or different body
 * is simply not that case.
 */
async function hasUnsafePromptTitle(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json()
    return isRecord(body) && body.title === "Unsafe Prompt"
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 * Reading a reply
 * ------------------------------------------------------------------ */

/**
 * Checks a reply against the contract (section 4.4). Null means it cannot be
 * used: unparsable, or without a status, a message, or a context.
 */
export function readPlannerTurnResponse(body: unknown): PlannerTurnResult | null {
  if (!isRecord(body)) {
    return null
  }

  const { status, assistantMessage, context, recommendations } = body

  if (status !== "NEEDS_CLARIFICATION" && status !== "READY_TO_RECOMMEND") {
    return null
  }
  if (typeof assistantMessage !== "string" || !isRecord(context)) {
    return null
  }

  let items: TrailRecommendation[] = []
  if (Array.isArray(recommendations)) {
    const read = recommendations.map(readWireRecommendation)
    if (read.some((item) => item === null)) {
      return null
    }
    items = read as TrailRecommendation[]
  } else if (status === "READY_TO_RECOMMEND") {
    // Without a list there is no telling whether anything matched.
    return null
  }

  return {
    status,
    assistantMessage,
    // Kept exactly as it arrived: it is the backend's, and goes back unchanged.
    context: context as PlanningContext,
    recommendations: items,
  }
}

/** A `ScoredTrailRecommendation` from the wire. */
function readWireRecommendation(value: unknown): TrailRecommendation | null {
  if (!isRecord(value)) {
    return null
  }

  const trail = isRecord(value.trail) ? value.trail : {}
  return readTrailRecommendation({
    ...trail,
    score: value.score,
    breakdown: value.breakdown,
  })
}
