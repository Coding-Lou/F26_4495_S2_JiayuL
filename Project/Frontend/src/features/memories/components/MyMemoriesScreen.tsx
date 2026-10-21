import { useEffect, useId, useRef, useState } from "react"
import {
  ArrowDown,
  CircleAlert,
  LoaderCircle,
  Plus,
  RotateCw,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { memoryFailureKindOf } from "../api/memories"
import { memoriesContent } from "../content"
import { useArrivalNotice } from "../hooks/useArrivalNotice"
import { useMemoryPages } from "../hooks/memoryQueries"
import { usePhotoRecovery } from "../hooks/usePhotoRecovery"
import { useTrailLookup } from "../model/memoryText"
import type { MemoryPhoto, MemorySummary } from "../types/memory"
import { MemoryCard, MemoryCardSkeleton } from "./MemoryCard"
import { MemoriesShell } from "./MemoriesShell"
import { NoticeSlot, TryAgainButton } from "./MemoryCommon"
import { NoPhotoSurface } from "./MemoryVisuals"

/** Loading cards (section 22.6): two rows at 1440×900. */
const SKELETON_COUNT = 8

/**
 * My Memories, `/memories` (FEATURE-009 sections 8, 19.1, 22.3–22.6): the
 * signed-in user's own Memories as photo-led journal cards on one `paper`
 * sheet, newest trip first, in server order. Nobody else's Memories appear
 * here.
 */
export function MyMemoriesScreen() {
  useDocumentTitle(memoriesContent.documentTitle.collection)
  const announcer = useTripAnnouncer()

  return (
    <MemoriesShell announcer={announcer}>
      <MyMemoriesView announce={announcer.announce} />
    </MemoriesShell>
  )
}

type Phase = "loading" | "unavailable" | "empty" | "ready"

function MyMemoriesView({ announce }: { announce: Announce }) {
  const { collection } = memoriesContent
  const query = useMemoryPages()
  const trails = useTrailLookup()
  const notice = useArrivalNotice()

  const titleRef = useRef<HTMLHeadingElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  const gridHeadingId = useId()
  /** The card to focus once the last page has been appended (section 8.4). */
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [retrying, setRetrying] = useState(false)

  const pages = query.data?.pages
  const memories: MemorySummary[] = pages?.flatMap((page) => page.items) ?? []
  const totalItems = pages !== undefined && pages.length > 0
    ? pages[pages.length - 1].totalItems
    : 0
  const failure = query.isError ? memoryFailureKindOf(query.error) : null

  const phase: Phase =
    pages !== undefined
      ? memories.length === 0 && totalItems === 0
        ? "empty"
        : "ready"
      : failure !== null && failure !== "no-session"
        ? "unavailable"
        : "loading"

  const coverPhotos: MemoryPhoto[] = memories.flatMap((memory) =>
    memory.coverPhoto !== null ? [memory.coverPhoto] : [],
  )
  const recovery = usePhotoRecovery({
    dataUpdatedAt: query.dataUpdatedAt,
    photos: coverPhotos,
    refetch: query.refetch,
  })

  // Arrival after a delete (section 16): the notice, said once, and focus on
  // the heading.
  useEffect(() => {
    if (notice === "deleted") {
      titleRef.current?.focus({ preventScroll: true })
      announce("status", collection.deleted)
    }
  }, [announce, collection.deleted, notice])

  useEffect(() => {
    if (focusIndex === null) {
      return
    }
    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-memory-card]")
    cards?.[focusIndex]?.focus()
  }, [focusIndex])

  async function showOlder() {
    if (query.isFetchingNextPage) {
      return
    }
    const before = memories.length
    const result = await query.fetchNextPage()
    if (result.isError && result.isFetchNextPageError) {
      return
    }
    const after = result.data?.pages.flatMap((page) => page.items).length ?? before
    const added = Math.max(0, after - before)
    if (added > 0) {
      announce("status", collection.moreShown(added))
    }
    if (!result.hasNextPage && added > 0) {
      setFocusIndex(before)
    }
  }

  function retryFirstPage() {
    if (retrying) {
      return
    }
    setRetrying(true)
    void query.refetch().finally(() => setRetrying(false))
  }

  return (
    <div className="memory-sheet memory-collection">
      <div className="memory-title-row">
        <div className="memory-title-text">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="trip-focus-target memory-collection-title"
          >
            {collection.title}
          </h1>
          <p className="memory-support">{collection.support}</p>
          {phase === "ready" ? (
            <p className="memory-count">{collection.count(totalItems)}</p>
          ) : null}
        </div>
        {phase === "ready" ? (
          <Link to="/memories/new" className="trip-control memory-primary">
            <Plus aria-hidden="true" strokeWidth={2} />
            {collection.add}
          </Link>
        ) : null}
      </div>

      <NoticeSlot text={notice === "deleted" ? collection.deleted : null} />

      {phase === "loading" ? (
        <section className="memory-grid-section" aria-labelledby={gridHeadingId}>
          <h2 id={gridHeadingId} className="sr-only">
            {collection.gridHeading}
          </h2>
          <ul className="memory-grid" aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <MemoryCardSkeleton key={index} />
            ))}
          </ul>
          <p role="status" className="sr-only">
            {collection.loading}
          </p>
        </section>
      ) : null}

      {phase === "empty" ? <EmptyState /> : null}

      {phase === "unavailable" ? (
        <UnavailableState working={retrying} onRetry={retryFirstPage} />
      ) : null}

      {phase === "ready" ? (
        <>
          <section className="memory-grid-section" aria-labelledby={gridHeadingId}>
            <h2 id={gridHeadingId} className="sr-only">
              {collection.gridHeading}
            </h2>
            <ul ref={gridRef} className="memory-grid">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  trail={trails.lineFor(memory.trailId)}
                  recovery={recovery}
                />
              ))}
            </ul>
          </section>

          {query.hasNextPage ? (
            <ShowOlder
              working={query.isFetchingNextPage}
              failed={query.isFetchNextPageError && !query.isFetchingNextPage}
              onActivate={() => void showOlder()}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

type ShowOlderProps = {
  working: boolean
  failed: boolean
  onActivate: () => void
}

/** The Load more row (section 22.3, D6). It keeps focus in every state. */
function ShowOlder({ working, failed, onActivate }: ShowOlderProps) {
  const { collection } = memoriesContent
  return (
    <div className="memory-more">
      <p role="alert" className="memory-alert memory-more-alert">
        {failed ? (
          <>
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{collection.showOlderFailed}</span>
          </>
        ) : null}
      </p>
      <button
        type="button"
        className="trip-control trip-button memory-more-button"
        aria-disabled={working ? true : undefined}
        onClick={() => {
          if (!working) {
            onActivate()
          }
        }}
      >
        {working ? (
          <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
        ) : failed ? (
          <RotateCw aria-hidden="true" strokeWidth={2} />
        ) : (
          <ArrowDown aria-hidden="true" strokeWidth={2} />
        )}
        {working
          ? collection.showOlderWorking
          : failed
            ? collection.tryAgain
            : collection.showOlder}
      </button>
    </div>
  )
}

function EmptyState() {
  const { collection } = memoriesContent
  return (
    <div className="memory-state">
      <div className="memory-state-art">
        <NoPhotoSurface size="empty" />
      </div>
      <h2 tabIndex={-1} className="trip-focus-target memory-state-title">
        {collection.emptyTitle}
      </h2>
      <p className="memory-state-body">{collection.emptyBody}</p>
      <p className="memory-state-action">
        <Link to="/memories/new" className="trip-control memory-primary">
          {collection.emptyAction}
        </Link>
      </p>
    </div>
  )
}

type UnavailableStateProps = {
  working: boolean
  onRetry: () => void
}

function UnavailableState({ working, onRetry }: UnavailableStateProps) {
  const { collection } = memoriesContent
  return (
    <div className="memory-state" data-kind="unavailable">
      <h2 className="memory-state-title">{collection.unavailableTitle}</h2>
      <p className="memory-state-body">{collection.unavailableBody}</p>
      <p className="memory-state-action">
        <TryAgainButton working={working} onRetry={onRetry} />
      </p>
    </div>
  )
}
