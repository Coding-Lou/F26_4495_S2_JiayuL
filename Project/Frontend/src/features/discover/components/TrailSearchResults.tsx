import { useEffect, useRef } from "react"
import { LoaderCircle } from "lucide-react"
import {
  difficultyLabel,
  formatDistance,
  formatDuration,
} from "@/features/planning/presentation"
import { trailContent } from "@/features/trails/content"
import type { TrailSummary } from "@/features/trails/types/trail"
import { discoverContent } from "../content"
import { searchOptionId, type CatalogState } from "../search/useTrailSearch"

type TrailSearchResultsProps = {
  listboxId: string
  /** The heading that names the listbox (the list's heading, in search). */
  labelledBy: string
  /** The query as shown to the visitor (trimmed). */
  query: string
  results: TrailSummary[]
  total: number
  activeIndex: number
  catalog: CatalogState
  onPick: (trail: TrailSummary) => void
  onClear: () => void
}

/**
 * What replaces Discover's rows while a trail name is searched: the
 * combobox's listbox of matches (name and the row's own summary, nothing
 * new), or the no-match line with Clear search, which reads unlike the
 * area's empty state. The options are not tab stops: focus stays in the
 * field, and a pointer press keeps it there.
 */
export function TrailSearchResults({
  listboxId,
  labelledBy,
  query,
  results,
  total,
  activeIndex,
  catalog,
  onPick,
  onClear,
}: TrailSearchResultsProps) {
  const listRef = useRef<HTMLUListElement>(null)

  // The active result stays visible in the list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  return (
    <>
      {catalog === "failed" ? (
        <p className="discover-list-caption">
          {discoverContent.search.catalogFailed}
        </p>
      ) : null}

      {total > results.length ? (
        <p className="discover-list-caption">
          {discoverContent.search.limited(results.length, total)}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelledBy}
          className="discover-search-results"
        >
          {results.map((trail, index) => {
            const meta = [
              difficultyLabel(trail.difficulty),
              formatDistance(trail.distanceKm),
              formatDuration(trail.estimatedDurationMin),
            ].filter((part): part is string => part !== null)

            return (
              <li
                key={trail.id}
                id={searchOptionId(listboxId, trail.id)}
                role="option"
                aria-selected={index === activeIndex}
                className="discover-search-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(trail)}
              >
                <span className="discover-row-name">
                  {trail.name ?? trailContent.unnamed}
                </span>
                {meta.length > 0 ? (
                  <span className="discover-row-meta">{meta.join(" · ")}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : catalog === "pending" ? (
        <p className="discover-list-updating">
          <LoaderCircle
            aria-hidden="true"
            strokeWidth={2}
            className="trip-spin"
          />
          <span>{discoverContent.search.catalogLoading}</span>
        </p>
      ) : (
        <div className="discover-search-none">
          <p className="discover-search-none-text">
            {discoverContent.search.noMatch(query)}
          </p>
          <button
            type="button"
            className="trip-control discover-search-clear"
            onClick={onClear}
          >
            {discoverContent.search.clear}
          </button>
        </div>
      )}
    </>
  )
}
