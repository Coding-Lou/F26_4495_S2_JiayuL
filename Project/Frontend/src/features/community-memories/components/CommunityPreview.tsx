import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronRight, CircleAlert } from "lucide-react"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import { MemoryImage } from "@/features/memories/components/MemoryVisuals"
import { usePhotoRecovery } from "@/features/memories/hooks/usePhotoRecovery"
import { shortDate } from "@/features/memories/model/memoryText"
import { communityContent } from "../content"
import { PREVIEW_SIZE, usePublicMemoryPreview } from "../hooks/communityQueries"
import { CompactNoPhoto } from "./CompactNoPhoto"
import "../community-memories.css"

type CommunityPreviewProps = {
  /** A curated trail: synthetic trails get no section at all (§13). */
  trailId: string
  /** The trail's name as the popup shows it. */
  trailName: string
  /** View all memories: open the panel on the list. */
  onOpenList: (opener: HTMLElement) => void
  /** A preview row: open the panel at that Memory's Detail. */
  onOpenMemory: (memoryId: string, opener: HTMLElement) => void
}

/**
 * The Community Memories block of the Trail Detail popup (FEATURE-010
 * sections 8, 18.1): after the sample-data line and before Sign in to plan
 * this trip, behind a rule. Supporting evidence for the trail, not a feed: at
 * most two rows (cover, title, date; never the story), and View all memories.
 *
 * One request per selected trail (`page=0&size=2`). Its loading, empty, and
 * failure states stay inside this block: nothing here can fail, close, or
 * block the popup. Read in place and never announced (§16).
 */
export function CommunityPreview({
  trailId,
  trailName,
  onOpenList,
  onOpenMemory,
}: CommunityPreviewProps) {
  const query = usePublicMemoryPreview(trailId)
  const data = query.data

  const items = useMemo(
    () => (data?.items ?? []).slice(0, PREVIEW_SIZE),
    [data],
  )
  const covers = useMemo(
    () => items.flatMap((item) => (item.coverPhoto === null ? [] : [item.coverPhoto])),
    [items],
  )
  const recovery = usePhotoRecovery({
    dataUpdatedAt: query.dataUpdatedAt,
    photos: covers,
    refetch: query.refetch,
  })

  // A background refetch that fails keeps the answer already shown. While a
  // Retry runs, the query has no error to show (a refetch without data
  // starts over as pending), but the block stays failed so that Retry keeps
  // its place and focus and says it is trying again.
  const [retrying, setRetrying] = useState(false)
  const phase =
    data !== undefined
      ? "loaded"
      : query.isError || (retrying && query.isFetching)
        ? "failed"
        : "loading"
  const total = data === undefined ? 0 : Math.max(data.totalItems, items.length)

  // After a successful Retry the button is gone: focus moves to what took
  // its place, the first row (or View all), else the heading for zero, the
  // way Show older's focus moves to the first new entry (§18.5). Only when
  // focus was on Retry (now on `body`) or still in this block.
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retried = useRef(false)
  useEffect(() => {
    if (!retried.current || phase !== "loaded") {
      return
    }
    retried.current = false
    const section = sectionRef.current
    const active = document.activeElement
    if (
      section === null ||
      (active !== null && active !== document.body && !section.contains(active))
    ) {
      return
    }
    const target =
      section.querySelector<HTMLButtonElement>("button.cm-row, button.cm-view-all") ??
      headingRef.current
    target?.focus({ preventScroll: true })
  }, [phase])

  return (
    <section ref={sectionRef} className="community-memories cm-preview">
      {/* Not in the tab order (§18.8); focusable from script only, as the
          place a successful Retry leaves focus when there are no rows. */}
      <h5
        ref={headingRef}
        tabIndex={-1}
        className="cm-preview-heading trip-focus-target"
      >
        {communityContent.heading}
        {phase === "loaded" && total >= 1 ? (
          <>
            <span aria-hidden="true">{" · "}</span>
            <span className="sr-only">, </span>
            <span className="cm-count">{communityContent.count(total)}</span>
          </>
        ) : null}
      </h5>

      {phase === "loading" ? (
        <div className="cm-preview-pending">
          <span className="sr-only">{communityContent.loading}</span>
          <div aria-hidden="true">
            <ul className="cm-preview-rows">
              {[0, 1].map((index) => (
                <li key={index} className="cm-row" data-skeleton="">
                  <span className="cm-row-thumb" data-skeleton="" />
                  <span className="cm-row-text">
                    <span className="cm-bar" data-bar="title" />
                    <span className="cm-bar" data-bar="date" />
                  </span>
                </li>
              ))}
            </ul>
            <span className="cm-view-all-slot">
              <span className="cm-bar" data-bar="action" />
            </span>
          </div>
        </div>
      ) : null}

      {phase === "failed" ? (
        <>
          <p className="cm-alert">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{communityContent.unavailable}</span>
          </p>
          <p className="cm-preview-retry">
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
        </>
      ) : null}

      {phase === "loaded" && total === 0 ? (
        <p className="cm-preview-empty">{communityContent.empty}</p>
      ) : null}

      {phase === "loaded" && total >= 1 ? (
        <>
          {items.length > 0 ? (
            <ul className="cm-preview-rows">
              {items.map((item) => {
                const date = shortDate(item.tripDate)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="trip-control cm-row"
                      aria-label={communityContent.entryName(item.title, date)}
                      onClick={(event) =>
                        onOpenMemory(item.id, event.currentTarget)
                      }
                    >
                      <span className="cm-row-thumb">
                        {item.coverPhoto === null ? (
                          <CompactNoPhoto />
                        ) : (
                          <MemoryImage
                            photo={item.coverPhoto}
                            recovery={recovery}
                            variant="thumb"
                            alt=""
                          />
                        )}
                      </span>
                      <span className="cm-row-text">
                        <span className="cm-row-title">{item.title}</span>
                        <span className="cm-row-date">{date}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          <button
            type="button"
            className="trip-control cm-view-all"
            aria-label={communityContent.viewAllName(trailName)}
            onClick={(event) => onOpenList(event.currentTarget)}
          >
            <span>{communityContent.viewAll}</span>
            <ChevronRight aria-hidden="true" strokeWidth={2} />
          </button>
        </>
      ) : null}
    </section>
  )
}
