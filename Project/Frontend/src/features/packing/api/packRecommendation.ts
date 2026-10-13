import {
  isRecord,
  readNumber,
  readText,
  tripRequest,
} from "@/features/trails/api/tripRequest"
import type {
  PackFailureKind,
  PackItemStatus,
  PackRecommendation,
  PackRecommendationRequest,
  TrailWeather,
} from "../types/pack"

const PACK_RECOMMENDATION_PATH = "/api/recommendations/pack"

/**
 * A pack request that produced no usable response. It carries only which of
 * the user-facing kinds applies (FEATURE-004 section 20).
 */
export class PackRecommendationError extends Error {
  readonly kind: PackFailureKind

  constructor(kind: PackFailureKind) {
    super("Pack request failed")
    this.name = "PackRecommendationError"
    this.kind = kind
  }
}

export function packFailureKindOf(error: unknown): PackFailureKind {
  return error instanceof PackRecommendationError ? error.kind : "unavailable"
}

/**
 * Asks what to bring for one trail on one date (sections 5.2, 16). The body
 * is exactly `{ trailId, tripDate }`. The response is returned checked; one
 * that cannot be used, or that is about another trail, is a failure and
 * nothing from it is shown.
 */
export async function requestPackRecommendation(
  request: PackRecommendationRequest,
  cancel: AbortSignal,
): Promise<PackRecommendation> {
  const body: PackRecommendationRequest = {
    trailId: request.trailId,
    tripDate: request.tripDate,
  }

  const outcome = await tripRequest(
    PACK_RECOMMENDATION_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cancel,
  )

  switch (outcome.kind) {
    case "ok": {
      const pack = readPackRecommendation(outcome.body, request.trailId)
      if (pack === null) {
        throw new PackRecommendationError("refused")
      }
      return pack
    }
    case "status":
      throw new PackRecommendationError(failureKindOfStatus(outcome.status))
    case "unreadable":
      throw new PackRecommendationError("refused")
    case "timeout":
      throw new PackRecommendationError("timeout")
    case "no-session":
      throw new PackRecommendationError("no-session")
    case "network":
      throw new PackRecommendationError("unavailable")
  }
}

/**
 * Failures are not otherwise distinguishable from the browser (G6): a gear
 * or trail service failure reaches here as a server error like any other.
 */
function failureKindOfStatus(status: number): PackFailureKind {
  if (status === 400) {
    return "date-not-accepted"
  }
  if (status === 401 || status === 403 || status === 404) {
    return "refused"
  }
  return "unavailable"
}

/**
 * Checks a response against the contract (section 16). Null means it cannot
 * be used. The response is untrusted.
 */
export function readPackRecommendation(
  body: unknown,
  trailId: string,
): PackRecommendation | null {
  if (!isRecord(body)) {
    return null
  }

  const { requiredGear, readinessPercentage, weatherAvailable } = body

  // A response about another trail is discarded (UUIDs in either case).
  if (
    typeof body.trailId !== "string" ||
    body.trailId.toLowerCase() !== trailId.toLowerCase()
  ) {
    return null
  }

  if (!Array.isArray(requiredGear) || typeof weatherAvailable !== "boolean") {
    return null
  }

  if (
    typeof readinessPercentage !== "number" ||
    !Number.isFinite(readinessPercentage) ||
    readinessPercentage < 0 ||
    readinessPercentage > 100
  ) {
    return null
  }

  const items: PackItemStatus[] = []
  for (const entry of requiredGear) {
    if (
      !isRecord(entry) ||
      typeof entry.category !== "string" ||
      typeof entry.owned !== "boolean"
    ) {
      return null
    }
    // Exactly what arrived: no entry is added, merged, dropped, or changed.
    items.push({ category: entry.category, owned: entry.owned })
  }

  return {
    trailName: readText(body.trailName),
    weather: weatherAvailable ? readWeather(body.weather) : null,
    requiredGear: items,
    readinessPercentage,
  }
}

/** Usable only with three finite numbers (section 16). */
function readWeather(value: unknown): TrailWeather | null {
  if (!isRecord(value)) {
    return null
  }

  const temperatureC = readNumber(value.temperatureC)
  const precipitationProbability = readNumber(value.precipitationProbability)
  const windSpeedKmh = readNumber(value.windSpeedKmh)

  if (
    temperatureC === null ||
    precipitationProbability === null ||
    windSpeedKmh === null
  ) {
    return null
  }

  return { temperatureC, precipitationProbability, windSpeedKmh }
}
