import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react"
import { ArrowLeft, Globe, Lock, Pencil, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { isMemoryId, memoryFailureKindOf } from "../api/memories"
import { memoriesContent } from "../content"
import { noticeState, useArrivalNotice } from "../hooks/useArrivalNotice"
import { useMemoryDetail } from "../hooks/memoryQueries"
import { useMemoryChanges } from "../hooks/useMemoryChanges"
import { usePhotoRecovery, type PhotoRecovery } from "../hooks/usePhotoRecovery"
import { longDate, useTrailLookup, type TrailLine } from "../model/memoryText"
import type { MemoryDetail } from "../types/memory"
import { JournalPage, MemoriesShell } from "./MemoriesShell"
import {
  InlineAlert,
  NoticeSlot,
  TryAgainButton,
  WorkingLabel,
} from "./MemoryCommon"
import { MemoryImage, NoPhotoSurface } from "./MemoryVisuals"

const SITE_TITLE = "Outdoor Trip Companion"

/**
 * Memory Detail, `/memories/:memoryId` (FEATURE-009 sections 13, 22.7):
 * reading first, as one journal entry. At 1280px and wider it opens as a
 * spread, the photographs on the left page and the writing on the right.
 */
export function MemoryDetailScreen() {
  const { memoryId: routeId = "" } = useParams()
  const announcer = useTripAnnouncer()

  return (
    <MemoriesShell announcer={announcer}>
      {/* Another Memory is another visit: its photo selection and delete
          confirmation belong to the one that was left. */}
      <MemoryDetailView
        key={routeId}
        routeId={routeId}
        announce={announcer.announce}
      />
    </MemoriesShell>
  )
}

type DetailView =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "unavailable" }
  | { kind: "ready"; memory: MemoryDetail }

function MemoryDetailView({
  routeId,
  announce,
}: {
  routeId: string
  announce: Announce
}) {
  const { detail } = memoriesContent
  // Anything that cannot be a Memory id is not found, with no request made.
  const memoryId = isMemoryId(routeId) ? routeId.toLowerCase() : null
  const query = useMemoryDetail(memoryId)
  const notice = useArrivalNotice()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [retrying, setRetrying] = useState(false)

  const failure = query.isError ? memoryFailureKindOf(query.error) : null
  let view: DetailView
  if (memoryId === null || failure === "not-found") {
    view = { kind: "not-found" }
  } else if (query.data !== undefined) {
    view = { kind: "ready", memory: query.data }
  } else if (failure !== null && failure !== "no-session") {
    view = { kind: "unavailable" }
  } else {
    view = { kind: "loading" }
  }

  useDocumentTitle(
    view.kind === "ready"
      ? memoriesContent.documentTitle.detail(view.memory.title)
      : view.kind === "not-found"
        ? memoriesContent.documentTitle.notFound
        : SITE_TITLE,
  )

  // Focus is on the heading on arrival and whenever the state changes
  // (section 22.15).
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [view.kind])

  // The arrival notice is said once, when the Memory is on screen.
  const noticeText =
    view.kind === "ready" ? arrivalNoticeText(notice, view.memory) : null
  const announced = useRef(false)
  useEffect(() => {
    if (noticeText !== null && !announced.current) {
      announced.current = true
      announce("status", noticeText)
    }
  }, [announce, noticeText])

  function retry() {
    setRetrying(true)
    void query.refetch().finally(() => setRetrying(false))
  }

  if (view.kind === "ready") {
    return (
      <JournalPage
        back={{ to: "/memories", label: detail.back }}
        sheetProps={{ "data-layout": "spread" }}
      >
        <NoticeSlot text={noticeText} />
        <MemoryEntry
          memory={view.memory}
          headingRef={headingRef}
          query={query}
        />
      </JournalPage>
    )
  }

  return (
    <JournalPage
      back={{ to: "/memories", label: detail.back }}
      sheetProps={{ "data-layout": view.kind === "loading" ? "spread" : "single" }}
    >
      {view.kind === "loading" ? (
        <DetailLoading headingRef={headingRef} />
      ) : (
        <div className="memory-detail-state">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="trip-focus-target memory-detail-title"
          >
            {view.kind === "not-found" ? detail.notFoundTitle : detail.unavailableTitle}
          </h1>
          <p className="memory-state-body">
            {view.kind === "not-found" ? detail.notFoundBody : detail.unavailableBody}
          </p>
          <p className="memory-state-action">
            {view.kind === "not-found" ? (
              <Link to="/memories" className="trip-control trip-button">
                <ArrowLeft aria-hidden="true" strokeWidth={2} />
                {detail.back}
              </Link>
            ) : (
              <TryAgainButton working={retrying} onRetry={retry} />
            )}
          </p>
        </div>
      )}
    </JournalPage>
  )
}

function arrivalNoticeText(
  notice: ReturnType<typeof useArrivalNotice>,
  memory: MemoryDetail,
): string | null {
  const { notices } = memoriesContent.detail
  const isPublic = memory.visibility === "PUBLIC"
  switch (notice) {
    case "saved":
      return isPublic ? notices.savedPublic : notices.saved
    case "updated":
      return isPublic ? notices.updatedPublic : notices.updated
    default:
      return null
  }
}

function DetailLoading({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className="memory-entry" data-loading="">
      <div className="memory-entry-head">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="trip-focus-target memory-detail-title"
        >
          <span className="memory-skeleton-bar" data-bar="h1" aria-hidden="true" />
          <span className="sr-only">{memoriesContent.detail.loading}</span>
        </h1>
        <span className="memory-skeleton-bar" data-bar="meta" aria-hidden="true" />
      </div>
      <div className="memory-figure" aria-hidden="true">
        <div className="memory-frame" data-skeleton="" />
      </div>
      <div className="memory-story-skeleton" aria-hidden="true">
        <span className="memory-skeleton-bar" />
        <span className="memory-skeleton-bar" />
        <span className="memory-skeleton-bar" data-bar="short" />
      </div>
    </div>
  )
}

type MemoryEntryProps = {
  memory: MemoryDetail
  headingRef: RefObject<HTMLHeadingElement | null>
  query: ReturnType<typeof useMemoryDetail>
}

/** The entry itself, in DOM order: head, photos, story, actions (22.7). */
function MemoryEntry({ memory, headingRef, query }: MemoryEntryProps) {
  const { detail } = memoriesContent
  const headingId = useId()
  const trails = useTrailLookup()
  const recovery = usePhotoRecovery({
    dataUpdatedAt: query.dataUpdatedAt,
    photos: memory.photos,
    refetch: query.refetch,
  })

  return (
    <article className="memory-entry" aria-labelledby={headingId}>
      <div className="memory-entry-head">
        <h1
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="trip-focus-target memory-detail-title"
        >
          {memory.title}
        </h1>
        <MetaLine trail={trails.lineFor(memory.trailId)} tripDate={memory.tripDate} />
        <p className="memory-visibility-line">
          <span className="sr-only">{detail.prefixes.visibility}</span>
          {memory.visibility === "PUBLIC" ? (
            <Globe aria-hidden="true" strokeWidth={2} />
          ) : (
            <Lock aria-hidden="true" strokeWidth={2} />
          )}
          <span className="memory-visibility-word">
            {memoriesContent.visibility[memory.visibility]}
          </span>
          <span className="memory-visibility-meaning">
            {memory.visibility === "PUBLIC"
              ? detail.publicMeaning
              : detail.privateMeaning}
          </span>
        </p>
      </div>

      <span className="memory-spine" aria-hidden="true" />

      <PhotoFigure memory={memory} recovery={recovery} />

      {memory.story !== null ? (
        <section className="memory-story">
          <h2 className="sr-only">{detail.storyHeading}</h2>
          <p className="memory-story-text">{memory.story}</p>
        </section>
      ) : null}

      <DetailActions memory={memory} />
    </article>
  )
}

function MetaLine({ trail, tripDate }: { trail: TrailLine; tripDate: string }) {
  const { detail, trail: trailText } = memoriesContent
  return (
    <p className="memory-meta">
      <span className="sr-only">{detail.prefixes.trail}</span>
      {trail.kind === "loading" ? (
        <span className="memory-skeleton-bar" data-bar="trail-name" aria-hidden="true" />
      ) : trail.kind === "found" ? (
        <span className="memory-meta-trail">{trail.name}</span>
      ) : (
        <span className="memory-meta-quiet">
          {trail.kind === "missing" ? trailText.unavailable : trailText.failed}
        </span>
      )}
      <span aria-hidden="true"> · </span>
      <span className="sr-only">, {detail.prefixes.date}</span>
      <span className="memory-meta-date">{longDate(tripDate)}</span>
    </p>
  )
}

type PhotoFigureProps = {
  memory: MemoryDetail
  recovery: PhotoRecovery
}

/**
 * The large photo on its mat, the whole photograph always visible, and,
 * with two or more photos, the caption and the strip directly under it
 * (section 22.7). The selected photo is page state, by photo id; every visit
 * starts on the cover.
 */
function PhotoFigure({ memory, recovery }: PhotoFigureProps) {
  const { detail } = memoriesContent
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const photos = memory.photos
  const total = photos.length
  const index = Math.max(
    0,
    selectedId === null ? 0 : photos.findIndex((photo) => photo.id === selectedId),
  )
  const shown = photos[index]

  return (
    <div className="memory-figure">
      <div className="memory-frame" data-empty={shown === undefined ? "" : undefined}>
        {shown === undefined ? (
          <NoPhotoSurface size="detail" />
        ) : (
          <MemoryImage
            key={shown.id}
            photo={shown}
            recovery={recovery}
            variant="large"
            alt={detail.largeAlt(index + 1, total, memory.title)}
            eager={index === 0}
          />
        )}
      </div>

      {total >= 2 ? (
        <>
          <p className="memory-caption">{detail.caption(index + 1, total)}</p>
          <ul className="memory-strip">
            {photos.map((photo, position) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="trip-control memory-thumb"
                  aria-label={detail.thumbName(position + 1, total)}
                  aria-current={position === index ? "true" : undefined}
                  onClick={() => setSelectedId(photo.id)}
                >
                  <MemoryImage
                    photo={photo}
                    recovery={recovery}
                    variant="thumb"
                    alt=""
                  />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

type DetailActionsProps = {
  memory: MemoryDetail
}

/** Edit and Delete memory, and the inline delete confirmation (22.8). */
function DetailActions({ memory }: DetailActionsProps) {
  const { detail } = memoriesContent
  const navigate = useNavigate()
  const changes = useMemoryChanges()
  const questionId = useId()
  const deleteRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<"cancel" | "delete" | null>(null)

  useEffect(() => {
    if (focusTarget === "cancel") {
      cancelRef.current?.focus()
    } else if (focusTarget === "delete") {
      deleteRef.current?.focus()
    }
  }, [focusTarget, confirming])

  function cancel() {
    if (deleting) {
      return
    }
    setConfirming(false)
    setError(null)
    setFocusTarget("delete")
  }

  async function confirm() {
    if (deleting) {
      return
    }
    setDeleting(true)
    setError(null)
    try {
      await changes.remove(memory.id)
    } catch (failure) {
      setDeleting(false)
      const kind = memoryFailureKindOf(failure)
      if (kind === "no-session") {
        return
      }
      const text = kind === "timeout" ? detail.deleteTimedOut : detail.deleteFailed
      // Announced by the alert line itself.
      setError(text)
      return
    }
    void navigate("/memories", { replace: true, state: noticeState("deleted") })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      cancel()
    }
  }

  return (
    <div className="memory-actions">
      {confirming ? (
        <div
          role="group"
          aria-labelledby={questionId}
          className="memory-confirm"
          onKeyDown={handleKeyDown}
        >
          <p id={questionId} className="memory-confirm-question">
            {detail.deleteQuestion(memory.title)}
          </p>
          <p className="memory-confirm-body">
            {detail.deleteBody}
            {memory.visibility === "PUBLIC" ? ` ${detail.deletePublic}` : null}
          </p>
          <InlineAlert text={error} className="memory-confirm-alert" />
          <div className="memory-confirm-actions">
            <button
              ref={cancelRef}
              type="button"
              className="trip-control trip-button"
              aria-disabled={deleting ? true : undefined}
              onClick={cancel}
            >
              {detail.cancel}
            </button>
            <button
              type="button"
              className="trip-control memory-danger"
              aria-disabled={deleting ? true : undefined}
              onClick={() => void confirm()}
            >
              <WorkingLabel working={deleting} workingText={detail.deleting}>
                <Trash2 aria-hidden="true" strokeWidth={2} />
                {detail.delete}
              </WorkingLabel>
            </button>
          </div>
        </div>
      ) : (
        <div className="memory-actions-row">
          <Link
            to={`/memories/${memory.id}/edit`}
            className="trip-control trip-button"
          >
            <Pencil aria-hidden="true" strokeWidth={2} />
            {detail.edit}
          </Link>
          <button
            ref={deleteRef}
            type="button"
            className="trip-control memory-quiet-danger"
            onClick={() => {
              setConfirming(true)
              setFocusTarget("cancel")
            }}
          >
            <Trash2 aria-hidden="true" strokeWidth={2} />
            {detail.delete}
          </button>
        </div>
      )}
    </div>
  )
}
