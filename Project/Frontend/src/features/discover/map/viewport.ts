import {
  NEARBY_MAX_RADIUS_KM,
  type NearbyTrailsParams,
} from "@/features/trails/api/trailNearby"

/**
 * Viewport arithmetic for viewport-driven Discover: pure functions with no
 * DOM and no map library, shared by the map's shell and the Discover
 * section. Coordinates are degrees, longitude first where paired.
 */

export type LngLat = { lng: number; lat: number }

/** A visible map rectangle. */
export type ViewBounds = {
  west: number
  south: number
  east: number
  north: number
}

/** One settled map view: where its centre is and what it shows. */
export type MapViewport = {
  center: LngLat
  bounds: ViewBounds
}

/** The fixed default region (16.8.2): SW then NE, as [lng, lat]. */
export const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-123.4, 48.95],
  [-121.3, 50.45],
]

/** The circle reaches this far beyond the farthest corner. */
const RADIUS_BUFFER = 1.15
const MIN_RADIUS_KM = 2
const EARTH_RADIUS_KM = 6371.0088

/**
 * The view used when there is no map (not loaded yet, failed, or
 * unsupported): the default region, or the same span moved to `center`
 * (a `?trail=` deep link outside the first results).
 */
export function fallbackViewport(center: LngLat | null): MapViewport {
  const [[west, south], [east, north]] = DEFAULT_BOUNDS
  const middle = { lng: (west + east) / 2, lat: (south + north) / 2 }
  const dLng = center === null ? 0 : center.lng - middle.lng
  const dLat = center === null ? 0 : center.lat - middle.lat
  return {
    center: { lng: middle.lng + dLng, lat: middle.lat + dLat },
    bounds: {
      west: west + dLng,
      south: south + dLat,
      east: east + dLng,
      north: north + dLat,
    },
  }
}

/** Great-circle (haversine) distance in km. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The nearby read for a view: its centre, and a radius from the centre to
 * the farthest corner × 1.15 (a buffer only), rounded up to whole km and
 * clamped to [2, 150]. `capped` is true when the raw farthest-corner
 * distance exceeds 150 km: part of the visible rectangle then lies beyond
 * the largest circle the service allows.
 */
export function nearbyQueryFor(viewport: MapViewport): {
  params: NearbyTrailsParams
  capped: boolean
} {
  const { center, bounds } = viewport
  const corners: LngLat[] = [
    { lng: bounds.west, lat: bounds.south },
    { lng: bounds.west, lat: bounds.north },
    { lng: bounds.east, lat: bounds.south },
    { lng: bounds.east, lat: bounds.north },
  ]
  const farthest = Math.max(...corners.map((corner) => haversineKm(center, corner)))
  const radius = Math.ceil(farthest * RADIUS_BUFFER)
  return {
    params: {
      lat: center.lat,
      lon: center.lng,
      radiusKm: Math.min(Math.max(radius, MIN_RADIUS_KM), NEARBY_MAX_RADIUS_KM),
    },
    capped: farthest > NEARBY_MAX_RADIUS_KM,
  }
}

/** Whether a point lies inside a visible rectangle (edges included). */
export function isInBounds(point: LngLat, bounds: ViewBounds): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  )
}
