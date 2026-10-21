import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react"
import { CircleAlert, LoaderCircle } from "lucide-react"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import {
  MemoryImage,
  NoPhotoSurface,
} from "@/features/memories/components/MemoryVisuals"
import {
  usePhotoRecovery,
  type PhotoRecovery,
} from "@/features/memories/hooks/usePhotoRecovery"
import { shortDate } from "@/features/memories/model/memoryText"
import { communityContent } from "../content"
import type { usePublicMemoryList } from "../hooks/communityQueries"
import type { PublicMemorySummary } from "../types/publicMemory"

type ListQuery = ReturnType<typeof usePublicMemoryList>

type CommunityListProps = {
  query: ListQuery
  /** The panel `h3`, which labels the list. */
  labelledBy: string
  /** The panel's body, the scroller that holds the entries. */
  bodyRef: RefObject<HTMLDivElement | null>
  announce: Announce
  onOpen: (memoryId: string) => void
}

/**
 * The Community panel's list (FEATURE-010 sections 9.2, 18.5): the trail's
 * public Memories as journal index entries, in server order, 8 at a time,
 * with Show older memories. Read-only: no author, no engagement, no owner or
 * create control.
 */
export function CommunityList({
  query,
  labelledBy,
  bodyRef,
  announce,
  onOpen,
}: CommunityListProps) {
  const data = query.data
  const items = useMemo(() => {
    // Pages may overlap if the list changed between requests: once each.
    const seen = new Set<string>()
    const all: PublicMemorySummary[] = []
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          all.push(item)
        }
      }
    }
    return all
  }, [data])
  const covers = useMemo(
    () => items.flatMap((item) => (item.coverPhoto === null ? [] : [item.coverPhoto])),
    [items],
  )
  const recovery = usePhotoRecovery({
    dataUpdatedAt: query.dataUpdatedAt,
    photos: covers,
    refetch: query.refetch,
  })

  /** After an older page, the entry to focus once it is rendered. */
  const focusIndex = useRef<number | null>(null)

  useEffect(() => {
    const index = focusIndex.current
    if (index === null || index >= items.length) {
      return
    }
    focusIndex.current = null
    const entries = bodyRef.current?.querySelectorAll<HTMLButtonElement>(
      "[data-memory-id]",
    )
    // The body scrolls itself to show it; the document never moves.
    entries?.[index]?.focus()
  }, [items, bodyRef])

  // After a successful Retry of the first page the button is gone: focus
  // moves to the first entry (as when Show older goes away, §18.5), or the
  // panel heading when the list is empty. Only when focus was on Retry (now
  // on `body`) or still in the panel.
  const retried = useRef(false)
  // While a Retry runs the first page has no error to show (a refetch
  // without data starts over as pending): the failure block stays, so Retry
  // keeps its place and focus and says it is trying again.
  const [retrying, setRetrying] = useState(false)
  const loaded = data !== undefined
  useEffect(() => {
    if (!retried.current || !loaded) {
      return
    }
    retried.current = false
    const panel = bodyRef.current?.parentElement ?? null
    const active = document.activeElement
    if (
      panel === null ||
      (active !== null && active !== document.body && !panel.contains(active))
    ) {
      return
    }
    const target =
      bodyRef.current?.querySelector<HTMLButtonElement>("[data-memory-id]") ??
      document.getElementById(labelledBy)
    target?.focus({ preventScroll: true })
  }, [loaded, bodyRef, labelledBy])

  async function showOlder() {
    if (query.isFetchingNextPage) {
      return
    }
    const before = items.length
    const result = await query.fetchNextPage()
    if (result.isFetchNextPageError || result.isError) {
      return
    }
    let after = 0
    const seen = new Set<string>()
    for (const page of result.data?.pages ?? []) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          after += 1
        }
      }
    }
    if (after > before) {
      announce("status", communityContent.moreShown(after - before))
    }
    // Focus stays on the button, or moves to the first new entry when the
    // button goes away (§18.5).
    if (!result.hasNextPage && after > before) {
      const entries = bodyRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-memory-id]",
      )
      const entry = entries?.[before]
      if (entry !== undefined) {
        // Already rendered.
        entry.focus()
      } else {
        focusIndex.current = before
      }
    }
  }

  if (data === undefined) {
    if (query.isError || (retrying && query.isFetching)) {
      return (
        <div className="cm-list-state">
          <p className="cm-alert">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{communityContent.unavailable}</span>
          </p>
          <p className="cm-state-retry">
            <TripRetryButton
              tone="paper"
              working={query.isFetching}
              onRetry={() => {
                retried.current = true
                setRetrying(true)
                void query.refetch()
              }}
            />
          </p>
        </div>
      )
    }
    return (
      <div className="cm-list-pending">
        <span className="sr-only">{communityContent.loading}</span>
        <ul className="cm-entries" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <li key={index}>
              <span className="cm-entry" data-skeleton="">
                <span className="cm-entry-cover" data-skeleton="" />
                <span className="cm-entry-text">
                  <span className="cm-bar" data-bar="entry-title" />
                  <span className="cm-bar" data-bar="entry-date" />
                </span>
                <span className="cm-entry-excerpt cm-entry-excerpt-skeleton">
                  <span className="cm-bar" data-bar="line" />
                  <span className="cm-bar" data-bar="line" />
                  <span className="cm-bar" data-bar="line-short" />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="cm-list-empty">{communityContent.empty}</p>
  }

  const olderFailed = query.isFetchNextPageError
  const working = query.isFetchingNextPage

  return (
    <>
      <ul className="cm-entries" aria-labelledby={labelledBy}>
        {items.map((item) => (
          <CommunityEntry
            key={item.id}
            item={item}
            recovery={recovery}
            onOpen={onOpen}
          />
        ))}
      </ul>

      {query.hasNextPage ? (
        <div className="cm-more">
          {olderFailed ? (
            <p className="cm-alert cm-more-alert">
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>{communityContent.olderFailed}</span>
            </p>
          ) : null}
          <button
            type="button"
            className="trip-control trip-button cm-more-button"
            data-tone="paper"
            aria-disabled={working ? true : undefined}
            onClick={() => void showOlder()}
          >
            {working ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  strokeWidth={2}
                  className="trip-spin"
                />
                {communityContent.loadingOlder}
              </>
            ) : olderFailed ? (
              communityContent.tryAgain
            ) : (
              communityContent.showOlder
            )}
          </button>
        </div>
      ) : null}
    </>
  )
}

type CommunityEntryProps = {
  item: PublicMemorySummary
  recovery: PhotoRecovery
  onOpen: (memoryId: string) => void
}

/**
 * One journal index entry (§18.5): the cover beside the title and the date,
 * the server's excerpt across the full width. The whole entry is one button
 * named by its title and date, described by the excerpt.
 */
function CommunityEntry({ item, recovery, onOpen }: CommunityEntryProps) {
  const excerptId = useId()
  const date = shortDate(item.tripDate)
  const excerpt =
    item.storyExcerpt === null
      ? null
      : item.storyTruncated
        ? `${item.storyExcerpt.trimEnd()}…`
        : item.storyExcerpt

  return (
    <li className="cm-entry-item">
      <button
        type="button"
        className="trip-control cm-entry"
        data-memory-id={item.id}
        aria-label={communityContent.entryName(item.title, date)}
        aria-describedby={excerpt !== null ? excerptId : undefined}
        onClick={() => onOpen(item.id)}
      >
        <span className="cm-entry-cover">
          {item.coverPhoto === null ? (
            <NoPhotoSurface size="card" />
          ) : (
            <MemoryImage
              photo={item.coverPhoto}
              recovery={recovery}
              variant="card"
              alt=""
            />
          )}
        </span>
        <span className="cm-entry-text">
          <span className="cm-entry-title">{item.title}</span>
          <span className="cm-entry-date">
            {date}
            {item.photoCount >= 2 ? ` · ${communityContent.photos(item.photoCount)}` : null}
          </span>
        </span>
        {excerpt !== null ? (
          <span id={excerptId} className="cm-entry-excerpt">
            {excerpt}
          </span>
        ) : null}
      </button>
    </li>
  )
}
