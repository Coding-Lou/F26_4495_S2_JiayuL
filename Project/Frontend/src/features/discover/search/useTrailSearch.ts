import { useCallback, useEffect, useMemo, useState } from "react"
import { skipToken, useQuery } from "@tanstack/react-query"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import { trailListQueryKey } from "@/features/trails/hooks/useTrailList"
import type { TrailSummary } from "@/features/trails/types/trail"
import { discoverContent } from "../content"
import {
  matchTrails,
  normalizeSearchText,
  SEARCH_RESULT_LIMIT,
} from "./matchTrails"

/** The result count is said once typing pauses this long. */
const ANNOUNCE_AFTER_MS = 700

/** The element id of a result, for `aria-activedescendant`. */
export function searchOptionId(listboxId: string, trailId: string): string {
  return `${listboxId}-${trailId}`
}

/**
 * The curated catalog as far as search knows it: not asked for yet, on its
 * way, unreadable, or there.
 */
export type CatalogState = "idle" | "pending" | "failed" | "ready"

/**
 * Trail name search on Discover: the query, the active result, the matches,
 * and the polite result-count announcement. Typing never sends a request:
 * matching runs over the curated catalog (once it has been asked for, see
 * `CatalogRequest`) and the whole loaded nearby result.
 */
export function useTrailSearch(
  nearby: TrailSummary[] | undefined,
  announce: Announce,
) {
  const [query, setQueryValue] = useState("")
  /** The field was focused or typed in: the catalog may be requested. */
  const [engaged, setEngaged] = useState(false)
  /** The active result, or -1 for none. */
  const [activeIndex, setActiveIndex] = useState(-1)

  // Reads the catalog's cache entry only; `CatalogRequest` asks for it.
  const catalog = useQuery<TrailSummary[]>({
    queryKey: trailListQueryKey,
    queryFn: skipToken,
  })

  const needle = normalizeSearchText(query)
  const searching = needle !== ""
  const { results, total } = useMemo(
    () => matchTrails(needle, catalog.data, nearby),
    [needle, catalog.data, nearby],
  )
  const active = activeIndex < results.length ? activeIndex : -1

  const catalogState: CatalogState = !engaged
    ? "idle"
    : catalog.data !== undefined
      ? "ready"
      : catalog.isError
        ? "failed"
        : "pending"

  const setQuery = useCallback((value: string) => {
    setEngaged(true)
    setQueryValue(value)
    setActiveIndex(-1)
  }, [])

  const engage = useCallback(() => setEngaged(true), [])

  const clear = useCallback(() => {
    setQueryValue("")
    setActiveIndex(-1)
  }, [])

  /** ArrowDown (1) and ArrowUp (-1), wrapping at either end. */
  const move = useCallback(
    (delta: 1 | -1) => {
      const n = results.length
      if (n === 0) {
        return
      }
      setActiveIndex((current) =>
        current < 0 || current >= n
          ? delta === 1
            ? 0
            : n - 1
          : (current + delta + n) % n,
      )
    },
    [results.length],
  )

  // Said once the typing pauses, not on every keystroke, and not while the
  // catalog may still add the first match.
  const waiting = total === 0 && catalogState === "pending"
  useEffect(() => {
    if (!searching || waiting) {
      return
    }
    const timer = window.setTimeout(
      () =>
        announce(
          "status",
          discoverContent.search.announced(total, SEARCH_RESULT_LIMIT),
        ),
      ANNOUNCE_AFTER_MS,
    )
    return () => window.clearTimeout(timer)
  }, [announce, needle, searching, total, waiting])

  return {
    query,
    /** The query, trimmed and with its white space collapsed. */
    displayQuery: query.trim().replace(/\s+/g, " "),
    searching,
    engaged,
    results,
    total,
    activeIndex: active,
    catalogState,
    setQuery,
    engage,
    clear,
    move,
  }
}
