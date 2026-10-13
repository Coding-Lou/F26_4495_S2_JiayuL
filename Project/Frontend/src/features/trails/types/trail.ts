/**
 * Contract of `GET /api/trails/{id}` (FEATURE-004 section 5.1).
 *
 * Enum values are the backend's wire values. They are mapped to labels only
 * where they are displayed.
 */

/** As it arrives. Every field can be null on the wire. */
export type TrailDetailResponse = {
  id: string | null
  name: string | null
  description: string | null
  /** Wire values `EASY`, `MODERATE`, `HARD`. */
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  /** Trailhead. Sent, never displayed. */
  latitude: number | null
  longitude: number | null
  /** GeoJSON when the trail has a stored route. Not drawn by FEATURE-004. */
  route: unknown | null
  source: string | null
  coverImageUrl: string | null
  scenery: string[]
  baselineGearRequirements: string[]
}

/**
 * A trail as the screens hold it: only the fields FEATURE-004 shows, each a
 * checked value or null. The trailhead, the route, the scenery, and the
 * baseline gear are part of the contract and are not read: nothing here
 * displays them (sections 7.1, D10).
 */
export type TrailDetail = {
  id: string | null
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  source: string | null
  coverImageUrl: string | null
}

/**
 * Why a trail request produced no trail, as far as the browser can tell
 * (section 20). No status code and no backend text is kept.
 */
export type TrailFailureKind =
  /** No such trail. Repeating the request cannot help. */
  | "not-found"
  | "timeout"
  /** A network error or a server failure. Worth one more attempt. */
  | "unavailable"
  /** An answer that will not change: refused, or a body that cannot be read. */
  | "refused"
  /** The session ended before the request was made. FEATURE-002 takes over. */
  | "no-session"
