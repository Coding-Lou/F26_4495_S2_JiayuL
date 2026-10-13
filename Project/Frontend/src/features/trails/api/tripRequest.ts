import { NotAuthenticatedError } from "@/features/auth"
import { authenticatedApiRequest } from "@/services/apiClient"

/** One client limit for each request of FEATURE-004 (section 16, D14). */
export const TRIP_REQUEST_TIMEOUT_MS = 20_000

/**
 * How a request ended, without interpretation. Error handling is by status
 * alone: a failed response's body has no guaranteed shape and is never read
 * (section 24).
 */
export type TripRequestOutcome =
  /** A 2xx response whose body parsed as JSON. */
  | { kind: "ok"; body: unknown }
  /** Any other response. */
  | { kind: "status"; status: number }
  /** A 2xx response whose body is not JSON. */
  | { kind: "unreadable" }
  | { kind: "timeout" }
  /** No response: offline, refused, or abandoned. */
  | { kind: "network" }
  /** There is no session, so no request was made. */
  | { kind: "no-session" }

/**
 * One authenticated request to the application's API, with the client time
 * limit. `cancel` abandons it (the screen was left, or the query replaced).
 * The limit covers reading the body as well. Nothing about a failure is
 * logged.
 */
export async function tripRequest(
  path: string,
  init: RequestInit,
  cancel: AbortSignal,
): Promise<TripRequestOutcome> {
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
  }, TRIP_REQUEST_TIMEOUT_MS)

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

    if (!response.ok) {
      return { kind: "status", status: response.status }
    }

    try {
      return { kind: "ok", body: (await response.json()) as unknown }
    } catch {
      return { kind: timedOut ? "timeout" : "unreadable" }
    }
  } finally {
    window.clearTimeout(timer)
    cancel.removeEventListener("abort", abandon)
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A non-blank string, or null. */
export function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

export function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
