import { NotAuthenticatedError } from "@/features/auth"
import { authenticatedApiRequest } from "@/services/apiClient"

/** One client limit per request, which covers reading the body (D15). */
export const PLAN_REQUEST_TIMEOUT_MS = 20_000

/**
 * What a failed response's body said, read once and best effort as a
 * `ProblemDetail`. Only its `code` and the names of the fields it reports are
 * kept; its text is never shown or logged.
 */
export type PlanProblem = {
  code: string | null
  fields: string[]
}

/** How a request ended, without interpretation. */
export type PlanRequestOutcome =
  /**
   * A `2xx`, with its status. `body` is null when the body is empty or is
   * not JSON: the status still says the request succeeded.
   */
  | { kind: "ok"; status: number; body: unknown }
  /** Any other response. */
  | { kind: "status"; status: number; problem: PlanProblem }
  | { kind: "timeout" }
  /** No response: offline, refused, or abandoned. */
  | { kind: "network" }
  /** There is no session, so no request was made. */
  | { kind: "no-session" }

type PlanRequestOptions = {
  /**
   * Abandons the request (a query's signal, FEATURE-013 U3). Optional: a
   * request without one, such as the save, behaves exactly as before.
   */
  cancel?: AbortSignal
}

/**
 * One authenticated request to plan-service, with the client time limit.
 * The token comes from the session for each request (`authenticatedApiRequest`).
 * Nothing about a request or a response is logged.
 */
export async function planRequest(
  path: string,
  init: RequestInit,
  { cancel }: PlanRequestOptions = {},
): Promise<PlanRequestOutcome> {
  const controller = new AbortController()
  let timedOut = false

  const abandon = () => controller.abort()
  cancel?.addEventListener("abort", abandon)
  if (cancel?.aborted) {
    controller.abort()
  }

  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PLAN_REQUEST_TIMEOUT_MS)

  try {
    let response: Response
    try {
      response = await authenticatedApiRequest(path, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof NotAuthenticatedError) {
        return { kind: "no-session" }
      }
      return { kind: timedOut ? "timeout" : "network" }
    }

    let text: string
    try {
      text = await response.text()
    } catch {
      if (timedOut) {
        return { kind: "timeout" }
      }
      return response.ok
        ? { kind: "ok", status: response.status, body: null }
        : { kind: "status", status: response.status, problem: NO_PROBLEM }
    }

    if (!response.ok) {
      return {
        kind: "status",
        status: response.status,
        problem: readProblem(text),
      }
    }

    return { kind: "ok", status: response.status, body: parseJson(text) }
  } finally {
    window.clearTimeout(timer)
    cancel?.removeEventListener("abort", abandon)
  }
}

const NO_PROBLEM: PlanProblem = { code: null, fields: [] }

function parseJson(text: string): unknown {
  if (text.trim() === "") {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function readProblem(text: string): PlanProblem {
  const value = parseJson(text)
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return NO_PROBLEM
  }

  const record = value as Record<string, unknown>
  const code = typeof record.code === "string" ? record.code : null
  const fields: string[] = []
  if (Array.isArray(record.errors)) {
    for (const entry of record.errors) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).field === "string"
      ) {
        fields.push((entry as Record<string, string>).field)
      }
    }
  }
  return { code, fields }
}
