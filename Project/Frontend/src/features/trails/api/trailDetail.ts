import type { TrailDetail, TrailFailureKind } from "../types/trail"
import { isRecord, readNumber, readText, tripRequest } from "./tripRequest"

/**
 * A trail request that produced no trail. It carries only which of the
 * user-facing kinds applies (FEATURE-004 section 20).
 */
export class TrailDetailError extends Error {
  readonly kind: TrailFailureKind

  constructor(kind: TrailFailureKind) {
    super("Trail request failed")
    this.name = "TrailDetailError"
    this.kind = kind
  }
}

export function trailFailureKindOf(error: unknown): TrailFailureKind {
  return error instanceof TrailDetailError ? error.kind : "unavailable"
}

/**
 * Loads one trail (section 5.1) and returns it checked. `trailId` must
 * already be known to be a UUID: anything else is answered without a request
 * by the caller (section 9).
 */
export async function requestTrailDetail(
  trailId: string,
  cancel: AbortSignal,
): Promise<TrailDetail> {
  const outcome = await tripRequest(
    `/api/trails/${encodeURIComponent(trailId)}`,
    { method: "GET" },
    cancel,
  )

  switch (outcome.kind) {
    case "ok": {
      const trail = readTrailDetail(outcome.body)
      if (trail === null) {
        throw new TrailDetailError("refused")
      }
      return trail
    }
    case "status":
      throw new TrailDetailError(failureKindOfStatus(outcome.status))
    case "unreadable":
      throw new TrailDetailError("refused")
    case "timeout":
      throw new TrailDetailError("timeout")
    case "no-session":
      throw new TrailDetailError("no-session")
    case "network":
      throw new TrailDetailError("unavailable")
  }
}

/** The service answers a missing trail with `404` and an empty body. */
function failureKindOfStatus(status: number): TrailFailureKind {
  if (status === 404) {
    return "not-found"
  }
  if (status === 400 || status === 401 || status === 403) {
    return "refused"
  }
  return "unavailable"
}

/**
 * Reduces a response to the fields the screens show, each a checked value or
 * null (section 5.4). The response is untrusted. Null means it is not a trail
 * at all.
 */
export function readTrailDetail(body: unknown): TrailDetail | null {
  if (!isRecord(body)) {
    return null
  }

  return {
    id: readText(body.id),
    name: readText(body.name),
    description: readText(body.description),
    difficulty: readText(body.difficulty),
    distanceKm: readNumber(body.distanceKm),
    elevationGainM: readNumber(body.elevationGainM),
    estimatedDurationMin: readNumber(body.estimatedDurationMin),
    source: readText(body.source),
    coverImageUrl: readText(body.coverImageUrl),
  }
}
