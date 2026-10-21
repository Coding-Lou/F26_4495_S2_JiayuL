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

/**
 * The Gear Customization Studio (FEATURE-005 sections 4.2, 10): the
 * Preparation address extended by one segment. It holds the same trail and
 * date and nothing else: no gear, no item, no equipped state.
 */
export function gearStudioLocation(
  trailId: string,
  tripDate: string,
  rec: string | null,
): TripLocation {
  const preparation = tripPreparationLocation(trailId, tripDate, rec)
  return {
    pathname: `${preparation.pathname}/pack`,
    search: preparation.search,
  }
}

/**
 * Add a memory for this trail (FEATURE-009 sections 10.2, 18.2, D25): the
 * Memory editor with the trail preselected. Built here so that `trails`
 * imports nothing from `memories`. The parameters carry the trail id and,
 * from a past Plan (FEATURE-014 section 11), its trip date; both are only a
 * prefill.
 */
export function newMemoryLocation(
  trailId: string,
  tripDate?: string,
): TripLocation {
  const date =
    tripDate !== undefined ? `&date=${encodeURIComponent(tripDate)}` : ""
  return {
    pathname: "/memories/new",
    search: `?trail=${encodeURIComponent(trailId)}${date}`,
  }
}

/** One of the user's own Memories (FEATURE-014 section 12), never Community. */
export function memoryDetailLocation(memoryId: string): string {
  return `/memories/${encodeURIComponent(memoryId)}`
}
