import { NotAuthenticatedError } from "@/features/auth"
import { authenticatedApiRequest } from "@/services/apiClient"

/** One client limit per request (FEATURE-005 section 36, FEATURE-004 D14). */
export const GEAR_REQUEST_TIMEOUT_MS = 20_000

/**
 * How a request ended, without interpretation. A failed response's body has
 * no guaranteed shape and is never read (G7).
 */
export type GearRequestOutcome =
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
 * One authenticated request to the gear endpoints, with the client time
 * limit, which covers reading the body as well. `cancel` abandons it.
 * Nothing about a failure is logged.
 */
export async function gearRequest(
  path: string,
  init: RequestInit,
  cancel?: AbortSignal,
): Promise<GearRequestOutcome> {
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
  }, GEAR_REQUEST_TIMEOUT_MS)

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
    cancel?.removeEventListener("abort", abandon)
  }
}
