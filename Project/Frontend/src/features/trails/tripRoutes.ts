/**
 * The addresses of FEATURE-004's two screens (sections 4.2, 11.1, 12). The
 * path holds the trail and, for Trip Preparation, the trip date: that pair is
 * the whole selection, and nothing else records it. `rec` may ride along as a
 * query parameter; it is an opaque reference to a reply in the planner's own
 * session and carries no data.
 */
export type TripLocation = {
  pathname: string
  search: string
}

function recSearch(rec: string | null): string {
  return rec !== null && rec !== "" ? `?rec=${encodeURIComponent(rec)}` : ""
}

export function trailDetailLocation(
  trailId: string,
  rec: string | null,
): TripLocation {
  return {
    pathname: `/trails/${encodeURIComponent(trailId)}`,
    search: recSearch(rec),
  }
}

export function tripPreparationLocation(
  trailId: string,
  tripDate: string,
  rec: string | null,
): TripLocation {
  return {
    pathname: `/trails/${encodeURIComponent(trailId)}/prepare/${encodeURIComponent(tripDate)}`,
    search: recSearch(rec),
  }
}
