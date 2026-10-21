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
 * checked value or null. The route, the scenery, and the baseline gear are
 * part of the contract and are not read: nothing here displays them
 * (sections 7.1, D10). The trailhead is read only so that Discover can
 * centre its map on a `?trail=` deep link outside its first results; no
 * trip screen displays it.
 */
export type TrailDetail = {
  id: string | null
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  /** The trailhead, only when both coordinates are finite and in range. */
  position: { lat: number; lng: number } | null
  source: string | null
  coverImageUrl: string | null
}

/**
 * One trail of `GET /api/trails` (and of `GET /api/trails/nearby`) as Discover holds it (FEATURE-006 sections
 * 5.2, 9.1, 10): only what the list, the markers, and the Trail Detail popup
 * show. A trail without a usable id is not kept at all.
 */
export type TrailSummary = {
  /** A UUID, written in lower case. */
  id: string
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  /** The trailhead, only when both coordinates are finite and in range. */
  position: { lat: number; lng: number } | null
  /** Wire values as received; mapped to labels only where shown. */
  scenery: string[]
  source: string | null
  coverImageUrl: string | null
}

/**
 * `GET /api/trails/activity?date=` as the screens hold it (FEATURE-006
 * section 6.2). A trail with no usable entry is absent from `counts`: its
 * activity is unknown, never zero.
 */
export type TrailActivity = {
  date: string
  /** True unless the source is exactly `RECORDED` (D11). */
  sample: boolean
  /** Lower-case trail id to a non-negative integer count. */
  counts: ReadonlyMap<string, number>
}

/** Why a public read of trail data produced nothing usable. */
export type TrailReadFailureKind =
  | "timeout"
  /** A network error or a server failure. Worth one more attempt. */
  | "unavailable"
  /** Refused, or a body that cannot be read. */
  | "refused"

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
