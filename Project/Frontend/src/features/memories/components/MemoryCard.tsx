import { Link } from "react-router-dom"
import type { PhotoRecovery } from "../hooks/usePhotoRecovery"
import { shortDate, trailNameForName, type TrailLine } from "../model/memoryText"
import type { MemorySummary } from "../types/memory"
import { MemoryImage, NoPhotoSurface, VisibilityLabel } from "./MemoryVisuals"

type MemoryCardProps = {
  memory: MemorySummary
  trail: TrailLine
  recovery: PhotoRecovery
}

/**
 * One journal card (FEATURE-009 sections 8.2, 22.4): the photograph is the
 * card and the caption sits on the paper. The whole entry is one link to
 * Detail; its accessible name is "{title}, {trail}, {date}, {visibility}"
 * (MM8). No other control, menu, count, or badge.
 */
export function MemoryCard({ memory, trail, recovery }: MemoryCardProps) {
  const trailName = trailNameForName(trail)

  return (
    <li className="memory-card-item">
      <Link
        to={`/memories/${memory.id}`}
        className="trip-control memory-card"
        data-memory-card={memory.id}
      >
        <span className="memory-cover">
          {memory.coverPhoto !== null ? (
            <MemoryImage
              photo={memory.coverPhoto}
              recovery={recovery}
              variant="card"
              alt=""
            />
          ) : (
            <NoPhotoSurface size="card" />
          )}
        </span>

        <span className="memory-card-title">{memory.title}</span>

        {trail.kind === "failed" ? null : (
          <span className="memory-card-trail" data-kind={trail.kind}>
            {trail.kind === "loading" ? (
              <span className="memory-skeleton-bar" aria-hidden="true" />
            ) : (
              <>
                <span className="sr-only">, </span>
                {trailName}
              </>
            )}
          </span>
        )}

        <span className="memory-card-meta">
          <span className="memory-card-date">
            <span className="sr-only">, </span>
            {shortDate(memory.tripDate)}
          </span>
          <span className="sr-only">, </span>
          <VisibilityLabel visibility={memory.visibility} />
        </span>
      </Link>
    </li>
  )
}

/** Same geometry as a card, static and hidden (section 22.4). */
export function MemoryCardSkeleton() {
  return (
    <li className="memory-card-item" aria-hidden="true">
      <span className="memory-card memory-card-skeleton">
        <span className="memory-cover" />
        <span className="memory-skeleton-bar" data-bar="title" />
        <span className="memory-skeleton-bar" data-bar="trail" />
        <span className="memory-skeleton-bar" data-bar="meta" />
      </span>
    </li>
  )
}
