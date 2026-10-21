import { useMemo } from "react"
import { useTrailList } from "@/features/trails/hooks/useTrailList"
import type { TrailSummary } from "@/features/trails/types/trail"
import { memoriesContent } from "../content"

/**
 * Words for a Memory's facts. Dates are built from the ISO date's own parts:
 * never through `Date` parsing or UTC, so a trip date never moves by a day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function dateParts(iso: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(iso)
  if (match === null) {
    return null
  }
  const month = Number(match[2])
  if (month < 1 || month > 12) {
    return null
  }
  return { year: Number(match[1]), month, day: Number(match[3]) }
}

/** MM32 short: "Sep 14, 2026". */
export function shortDate(iso: string): string {
  const parts = dateParts(iso)
  return parts === null
    ? ""
    : `${MONTHS_SHORT[parts.month - 1]} ${parts.day}, ${parts.year}`
}

/** MM32 long: "September 14, 2026". */
export function longDate(iso: string): string {
  const parts = dateParts(iso)
  return parts === null
    ? ""
    : `${MONTHS_LONG[parts.month - 1]} ${parts.day}, ${parts.year}`
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Easy",
  MODERATE: "Moderate",
  HARD: "Hard",
}

const numberFormat = new Intl.NumberFormat("en-US")

/** MM71: "{Difficulty} · {distance}", missing parts dropped. */
export function trailFactsText(trail: TrailSummary): string {
  const parts: string[] = []
  const difficulty =
    trail.difficulty !== null ? DIFFICULTY_LABELS[trail.difficulty] : undefined
  if (difficulty !== undefined) {
    parts.push(difficulty)
  }
  const km = trail.distanceKm
  if (km !== null && Number.isFinite(km) && km >= 0) {
    parts.push(`${numberFormat.format(Math.round(km * 10) / 10)} km`)
  }
  return parts.join(" · ")
}

/** A trail's name, or MM11 when it has none. */
export function trailNameText(trail: TrailSummary): string {
  return trail.name ?? memoriesContent.trail.unnamed
}

/**
 * What a Memory's trail line shows (section 18.1):
 * - `loading`: the shared list has not answered yet;
 * - `failed`: the list could not be loaded;
 * - `missing`: the list has no such trail (MM10);
 * - `found`: its name.
 */
export type TrailLine =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "missing" }
  | { kind: "found"; trail: TrailSummary; name: string }

export type TrailLookup = {
  /** The list as loaded, sorted by name (D9); empty until it has loaded. */
  sorted: TrailSummary[]
  lineFor: (trailId: string) => TrailLine
  query: ReturnType<typeof useTrailList>
}

/**
 * Trail names from the one shared trail list, joined on the lower-case id
 * through a memoized map (D8): never a request per card or per Memory, and
 * nothing of a trail is kept with a Memory.
 */
export function useTrailLookup(): TrailLookup {
  const query = useTrailList()
  const trails = query.data
  const listFailed = query.isError

  const joined = useMemo(() => {
    const byId = new Map<string, TrailSummary>()
    for (const trail of trails ?? []) {
      byId.set(trail.id, trail)
    }
    const sorted = [...(trails ?? [])].sort((a, b) =>
      trailNameText(a).localeCompare(trailNameText(b), "en", {
        sensitivity: "base",
      }),
    )

    const lineFor = (trailId: string): TrailLine => {
      if (trails === undefined) {
        return listFailed ? { kind: "failed" } : { kind: "loading" }
      }
      const trail = byId.get(trailId.toLowerCase())
      return trail === undefined
        ? { kind: "missing" }
        : { kind: "found", trail, name: trailNameText(trail) }
    }

    return { sorted, lineFor }
  }, [trails, listFailed])

  return { ...joined, query }
}

/** The card's accessible trail part (MM8): omitted while it is unknown. */
export function trailNameForName(line: TrailLine): string | null {
  switch (line.kind) {
    case "found":
      return line.name
    case "missing":
      return memoriesContent.trail.unavailable
    default:
      return null
  }
}
