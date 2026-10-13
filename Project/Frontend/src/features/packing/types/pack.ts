/**
 * Contract of `POST /api/recommendations/pack` (FEATURE-004 section 5.2).
 *
 * `GearCategory` values are the backend's wire values. They are mapped to
 * labels only where they are displayed (`../gearCategories.ts`).
 */

export type PackRecommendationRequest = {
  trailId: string
  /** Local calendar date, `YYYY-MM-DD`. */
  tripDate: string
}

/**
 * The day's forecast at the trailhead: three numbers and nothing else. There
 * is no condition word or code.
 */
export type TrailWeather = {
  /** The mean of the day's minimum and maximum: not a high and not a low. */
  temperatureC: number
  /** Percent: the day's maximum precipitation probability. */
  precipitationProbability: number
  /** The day's maximum wind speed at 10 m. */
  windSpeedKmh: number
}

/** One recommended category and whether the user owns gear in it. */
export type PackItemStatus = {
  category: string
  owned: boolean
}

/** As it arrives. */
export type PackRecommendationResponse = {
  trailId: string
  trailName: string
  weather: TrailWeather | null
  weatherAvailable: boolean
  requiredGear: PackItemStatus[]
  readinessPercentage: number
}

/**
 * A pack response as the screen holds it, after the checks of section 16.
 * Nothing is added to what the backend returned: no category, no ownership,
 * and no readiness is worked out here.
 */
export type PackRecommendation = {
  trailName: string | null
  /** Null when the forecast is unavailable or cannot be used (section 17). */
  weather: TrailWeather | null
  /** Every entry, in the order it arrived. */
  requiredGear: PackItemStatus[]
  /** The backend's number, 0 to 100. */
  readinessPercentage: number
}

/**
 * Why a pack request produced no usable response, as far as the browser can
 * tell (section 20). No status code and no backend text is kept.
 */
export type PackFailureKind =
  | "timeout"
  /** A network error or a server failure. Worth one more attempt. */
  | "unavailable"
  /** The request was refused as invalid: the date cannot be used (S12). */
  | "date-not-accepted"
  /**
   * An answer that will not change by itself: refused, unreadable, not the
   * shape of the contract, or about another trail.
   */
  | "refused"
  /** The session ended before the request was made. FEATURE-002 takes over. */
  | "no-session"
