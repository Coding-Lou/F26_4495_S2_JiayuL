import { useEffect, useRef, useState } from "react"
import { ArrowLeft, CircleAlert } from "lucide-react"
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
import { communityFailureKindOf } from "../api/publicMemories"
import { communityContent } from "../content"
import { usePublicMemoryDetail } from "../hooks/communityQueries"
import type { PublicMemoryDetail } from "../types/publicMemory"

const NO_PHOTOS: PublicMemoryDetail["photos"] = []

type CommunityDetailProps = {
  memoryId: string
  /** The selected trail: a Memory of another trail is not shown (§10). */
  trailId: string
  trailName: string
  /** Focus moves to the title (or Back, when it failed) once it is shown. */
  moveFocus: boolean
  announce: Announce
  /** Empties the panel's status region: a message this Detail said is stale. */
  silence: () => void
  onBack: () => void
}

type View =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "gone" }
  | { kind: "ready"; memory: PublicMemoryDetail }

/**
 * A public Memory, read in the Community panel (FEATURE-010 sections 10,
 * 18.6): Back, the title, the trail and the trip date, the photographs, and
 * the full story. No owner control, no auth action, and no author line.
 *
 * A `404` (no longer public, deleted, or its trail gone) and a Memory of
 * another trail both show the same neutral line, with no reason. The trail
 * selection is never changed from here.
 */
export function CommunityDetail({
  memoryId,
  trailId,
  trailName,
  moveFocus,
  announce,
  silence,
  onBack,
}: CommunityDetailProps) {
  const query = usePublicMemoryDetail(memoryId)
  const data = query.data
  const recovery = usePhotoRecovery({
    dataUpdatedAt: query.dataUpdatedAt,
    photos: data?.photos ?? NO_PHOTOS,
    refetch: query.refetch,
  })

  const failure = query.isError ? communityFailureKindOf(query.error) : null
  // While a Retry runs there is no error to show (a refetch without data
  // starts over as pending): the failure stays, so Retry keeps its place and
  // focus and says it is trying again.
  const [retrying, setRetrying] = useState(false)
  let view: View
  if (failure === "not-found") {
    // Also after a refetch: a Memory made private while open goes (§19.7).
    view = { kind: "gone" }
  } else if (data !== undefined) {
    view =
      data.trailId === trailId.toLowerCase()
        ? { kind: "ready", memory: data }
        : { kind: "gone" }
  } else if (failure !== null || (retrying && query.isFetching)) {
    view = { kind: "failed" }
  } else {
    view = { kind: "loading" }
  }

  const headingRef = useRef<HTMLHeadingElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const wantFocus = useRef(moveFocus)
  const announced = useRef(false)

  // Focus: the title (the same `h4` while loading, so focus is not moved
  // twice), or Back when there is no title. When the title's text arrives
  // under focus, it is focused again so it is read.
  const previousKind = useRef<View["kind"] | null>(null)
  useEffect(() => {
    const before = previousKind.current
    previousKind.current = view.kind
    if (!wantFocus.current) {
      return
    }
    if (view.kind !== "loading") {
      wantFocus.current = false
    }
    const heading = headingRef.current
    const active = document.activeElement
    if (
      before !== null &&
      active !== null &&
      active !== document.body &&
      active !== heading
    ) {
      // The visitor moved on while it loaded: focus stays where they are.
      wantFocus.current = false
      return
    }
    if (heading !== null) {
      if (document.activeElement === heading && before === "loading") {
        heading.blur()
      }
      heading.focus({ preventScroll: true })
    } else {
      backRef.current?.focus({ preventScroll: true })
    }
  }, [view.kind])

  // A failure or the unavailable line is said once (§18.8). A failure that
  // recovers leaves nothing behind in the status region: the title, which
  // takes focus, is what is read.
  useEffect(() => {
    if (announced.current) {
      if (view.kind === "ready") {
        silence()
      }
      return
    }
    if (view.kind === "failed") {
      announced.current = true
      announce("status", communityContent.unavailable)
    } else if (view.kind === "gone") {
      announced.current = true
      announce("status", communityContent.gone)
    }
  }, [view.kind, announce, silence])

  // Leaving the Detail (Back, or another Memory) empties what it said.
  useEffect(() => {
    const said = announced
    return () => {
      if (said.current) {
        silence()
      }
    }
  }, [silence])

  return (
    <div className="cm-detail" data-kind={view.kind}>
      <button
        ref={backRef}
        type="button"
        className="trip-control cm-back"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" strokeWidth={2} />
        <span>{communityContent.back}</span>
      </button>

      {view.kind !== "failed" ? (
        <h4
          ref={headingRef}
          tabIndex={-1}
          className="cm-detail-title trip-focus-target"
          data-kind={view.kind}
        >
          {view.kind === "loading" ? (
            <>
              <span className="sr-only">{communityContent.loadingMemory}</span>
              <span className="cm-bar" data-bar="detail-title" aria-hidden="true" />
            </>
          ) : view.kind === "gone" ? (
            communityContent.gone
          ) : (
            view.memory.title
          )}
        </h4>
      ) : null}

      {view.kind === "loading" ? (
        <div className="cm-detail-skeleton" aria-hidden="true">
          <span className="cm-bar" data-bar="detail-meta" />
          <span className="cm-frame" data-skeleton="" />
          <span className="cm-detail-skeleton-story">
            <span className="cm-bar" data-bar="line" />
            <span className="cm-bar" data-bar="line" />
            <span className="cm-bar" data-bar="line-short" />
          </span>
        </div>
      ) : null}

      {view.kind === "failed" ? (
        <>
          <p className="cm-alert cm-detail-alert">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{communityContent.unavailable}</span>
          </p>
          <p className="cm-state-retry">
            <TripRetryButton
              tone="paper"
              working={query.isFetching}
              onRetry={() => {
                // Success replaces Retry: focus goes to the title (§18.8).
                wantFocus.current = true
                setRetrying(true)
                void query.refetch()
              }}
            />
          </p>
        </>
      ) : null}

      {view.kind === "ready" ? (
        <>
          <p className="cm-detail-meta">
            <span className="sr-only">{communityContent.trailPrefix}</span>
            <span className="cm-detail-trail">{trailName}</span>
            <span aria-hidden="true">{" · "}</span>
            <span className="sr-only">{communityContent.datePrefix}</span>
            <span className="cm-detail-date">
              {shortDate(view.memory.tripDate)}
            </span>
          </p>

          <PublicPhotoFigure
            key={view.memory.id}
            memory={view.memory}
            recovery={recovery}
          />

          {view.memory.story !== null ? (
            <p className="cm-story">{view.memory.story}</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

type PublicPhotoFigureProps = {
  memory: PublicMemoryDetail
  recovery: PhotoRecovery
}

/**
 * One large photograph on its mat, whole (`contain`), and for two or more a
 * caption and a strip of thumbnail buttons that choose it (§11, §18.6). No
 * carousel, swipe, lightbox, or transition. A public equivalent of the
 * FEATURE-009 figure, without the owner's "Cover" wording.
 */
function PublicPhotoFigure({ memory, recovery }: PublicPhotoFigureProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const photos = memory.photos
  const total = photos.length
  const index = Math.max(
    0,
    selectedId === null
      ? 0
      : photos.findIndex((photo) => photo.id === selectedId),
  )
  const shown = photos[index]

  return (
    <div className="cm-figure">
      <div className="cm-frame">
        {shown === undefined ? (
          <NoPhotoSurface size="detail" />
        ) : (
          <MemoryImage
            key={shown.id}
            photo={shown}
            recovery={recovery}
            variant="large"
            alt={communityContent.largeAlt(index + 1, total, memory.title)}
            eager
          />
        )}
      </div>

      {total >= 2 ? (
        <>
          <p className="cm-caption">{communityContent.caption(index + 1, total)}</p>
          <ul className="cm-strip" aria-label={communityContent.strip}>
            {photos.map((photo, position) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="trip-control cm-thumb"
                  aria-label={communityContent.thumbName(position + 1, total)}
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
