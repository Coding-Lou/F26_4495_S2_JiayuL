import { isTrailId } from "../trailId"
import type { TrailReadFailureKind, TrailSummary } from "../types/trail"
import { publicFailureKindOfStatus, publicRequest } from "./publicRequest"
import { isRecord, readNumber, readText } from "./tripRequest"

/** A public trail read that produced nothing usable. */
export class TrailReadError extends Error {
  readonly kind: TrailReadFailureKind

  constructor(kind: TrailReadFailureKind) {
    super("Trail read failed")
    this.name = "TrailReadError"
    this.kind = kind
  }
}

export function trailReadFailureKindOf(error: unknown): TrailReadFailureKind {
  return error instanceof TrailReadError ? error.kind : "unavailable"
}

/**
 * Every trail, in the order the service returns them (by name), checked
 * (FEATURE-006 sections 9.1, D2). No parameters: Discover shows the whole
 * region and has no filters. Requested without a token.
 */
export async function requestTrailList(
  cancel: AbortSignal,
): Promise<TrailSummary[]> {
  const outcome = await publicRequest("/api/trails", cancel)

  switch (outcome.kind) {
    case "ok": {
      const trails = readTrailList(outcome.body)
      if (trails === null) {
        throw new TrailReadError("refused")
      }
      return trails
    }
    case "status":
      throw new TrailReadError(publicFailureKindOfStatus(outcome.status))
    case "unreadable":
      throw new TrailReadError("refused")
    case "timeout":
      throw new TrailReadError("timeout")
    case "network":
      throw new TrailReadError("unavailable")
  }
}

/**
 * The response is untrusted (004 section 5.4). Null means it is not a list.
 * An item that is not a record, or has no usable id, is dropped; a repeated
 * id is kept once.
 */
function readTrailList(body: unknown): TrailSummary[] | null {
  if (!Array.isArray(body)) {
    return null
  }

  const trails: TrailSummary[] = []
  const seen = new Set<string>()

  for (const item of body) {
    const trail = readTrailSummary(item)
    if (trail === null || seen.has(trail.id)) {
      continue
    }
    seen.add(trail.id)
    trails.push(trail)
  }

  return trails
}

/**
 * One untrusted `TrailSummaryResponse` reduced to what Discover shows, each
 * field a checked value or null. Null when it is not a record or has no
 * usable id. Shared by the trail list and the nearby read (same shape).
 */
export function readTrailSummary(item: unknown): TrailSummary | null {
  if (!isRecord(item) || !isTrailId(item.id)) {
    return null
  }

  return {
    id: item.id.toLowerCase(),
    name: readText(item.name),
    description: readText(item.description),
    difficulty: readText(item.difficulty),
    distanceKm: readNumber(item.distanceKm),
    elevationGainM: readNumber(item.elevationGainM),
    estimatedDurationMin: readNumber(item.estimatedDurationMin),
    position: readPosition(item.latitude, item.longitude),
    scenery: readStringList(item.scenery),
    source: readText(item.source),
    coverImageUrl: readText(item.coverImageUrl),
  }
}

/** A trailhead only when both coordinates are finite and in range. */
export function readPosition(
  latitude: unknown,
  longitude: unknown,
): TrailSummary["position"] {
  const lat = readNumber(latitude)
  const lng = readNumber(longitude)
  if (lat === null || lng === null) {
    return null
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }
  return { lat, lng }
}

/** The strings of an array; anything else in it, or a non-array, is dropped. */
function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
