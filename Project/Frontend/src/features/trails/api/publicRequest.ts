import { apiRequest } from "@/services/apiClient"
import { TRIP_REQUEST_TIMEOUT_MS, type TripRequestOutcome } from "./tripRequest"

/**
 * How a public request ended: the outcomes of `tripRequest` without
 * `no-session`, because a public request never needs a session.
 */
export type PublicRequestOutcome = Exclude<
  TripRequestOutcome,
  { kind: "no-session" }
>

/**
 * One request for public trail data (FEATURE-006 section 9.1, D4): the trail
 * list, one trail, and today's activity. It carries no `Authorization`
 * header and no credentials, for every visitor, signed in or not. The trail
 * service reads these paths without a token, and it would refuse an expired
 * one, so none is sent.
 *
 * Same time limit and outcome kinds as `tripRequest`. `cancel` abandons it.
 * Nothing about a failure is logged.
 */
export async function publicRequest(
  path: string,
  cancel: AbortSignal,
): Promise<PublicRequestOutcome> {
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
      response = await apiRequest(path, {
        method: "GET",
        credentials: "omit",
        signal: controller.signal,
      })
    } catch {
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

/**
 * The failure kinds of a public trail read, from a status alone. A server
 * failure is worth one more attempt; any other refusal will not change.
 */
export function publicFailureKindOfStatus(
  status: number,
): "unavailable" | "refused" {
  return status >= 500 ? "unavailable" : "refused"
}
