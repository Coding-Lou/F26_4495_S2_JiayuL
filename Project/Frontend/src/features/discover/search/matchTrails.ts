import type { TrailSummary } from "@/features/trails/types/trail"

/**
 * Trail name search on Discover: pure functions with no DOM, no request, and
 * no map library. Matching is local and literal (no fuzzy distance).
 */

/** At most this many results are listed. */
export const SEARCH_RESULT_LIMIT = 12

/** Trimmed, lower case, every run of white space one space. */
export function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

export type TrailSearchMatch = {
  /** The best matches, at most `SEARCH_RESULT_LIMIT`, best first. */
  results: TrailSummary[]
  /** Every match, of which `results` are the first. */
  total: number
}

type Candidate = { trail: TrailSummary; curated: boolean; name: string }

/** 0 exact, 1 starts with, 2 contains; null when the name does not match. */
function rankOf(name: string, query: string): number | null {
  if (name === query) {
    return 0
  }
  if (name.startsWith(query)) {
    return 1
  }
  return name.includes(query) ? 2 : null
}

const byName = new Intl.Collator("en", { sensitivity: "base" })

/**
 * The trails whose name matches `query`, from the curated catalog and the
 * whole loaded nearby result, merged by id (ids are already lower case).
 *
 * A trail in the nearby result is kept as that result holds it. A catalog
 * trail that is not in it needs a trailhead: without one it could never be
 * brought onto the map and selected. A trail without a name is not
 * searchable.
 *
 * Order: exact name, then names that start with the query, then names that
 * contain it; within each, catalog trails first, then by name, then by id.
 */
export function matchTrails(
  query: string,
  curated: readonly TrailSummary[] | undefined,
  nearby: readonly TrailSummary[] | undefined,
): TrailSearchMatch {
  const needle = normalizeSearchText(query)
  if (needle === "") {
    return { results: [], total: 0 }
  }

  const pool = new Map<string, Candidate>()
  for (const trail of nearby ?? []) {
    if (trail.name !== null) {
      pool.set(trail.id, {
        trail,
        curated: false,
        name: normalizeSearchText(trail.name),
      })
    }
  }
  for (const trail of curated ?? []) {
    const known = pool.get(trail.id)
    if (known !== undefined) {
      known.curated = true
    } else if (trail.name !== null && trail.position !== null) {
      pool.set(trail.id, {
        trail,
        curated: true,
        name: normalizeSearchText(trail.name),
      })
    }
  }

  const ranked: (Candidate & { rank: number })[] = []
  for (const candidate of pool.values()) {
    const rank = rankOf(candidate.name, needle)
    if (rank !== null) {
      ranked.push({ ...candidate, rank })
    }
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      Number(b.curated) - Number(a.curated) ||
      byName.compare(a.name, b.name) ||
      (a.trail.id < b.trail.id ? -1 : a.trail.id > b.trail.id ? 1 : 0),
  )

  return {
    results: ranked
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((candidate) => candidate.trail),
    total: ranked.length,
  }
}
