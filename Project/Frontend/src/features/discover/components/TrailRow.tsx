import { useId, type KeyboardEvent, type ReactNode, type Ref } from "react"
import { MapPinOff } from "lucide-react"
import {
  difficultyLabel,
  formatDistance,
  formatDuration,
} from "@/features/planning/presentation"
import {
  activityCountText,
  activityLevel,
  type ActivityReading,
} from "@/features/trails/activity"
import { trailContent } from "@/features/trails/content"
import type { TrailSummary } from "@/features/trails/types/trail"
import { discoverContent } from "../content"
import { ActivityGlyph } from "./ActivityGlyph"

type TrailRowProps = {
  trail: TrailSummary
  activity: ActivityReading
  /** This trail is selected: its popup is open. */
  expanded: boolean
  /** The popup's id, for `aria-controls` while expanded. */
  popupId: string
  /** The trail's marker is under the pointer. */
  mapHovered: boolean
  buttonRef: Ref<HTMLButtonElement>
  /** The row's button was activated. */
  onActivate: () => void
  /** Escape on the row or in its popup: close, focus the row. */
  onEscape: () => void
  /** The row is hovered or its button focused (true), or no longer (false). */
  onHighlight: (source: "hover" | "focus", on: boolean) => void
  /** The Trail Detail popup, only while this trail is selected. */
  children?: ReactNode
}

/**
 * One trail of Discover's list (FEATURE-006 section 16.7.3): a disclosure
 * button that names the trail and its basics. It never expands: while the
 * trail is selected, its Trail Detail popup is the next element in the same
 * `li`, positioned over the map (16.11.2). The row is the keyboard and
 * assistive-technology path to the trail; its marker is a pointer shortcut.
 *
 * The `li` stays `position: static` and creates no containing block, so the
 * popup is positioned against the Discover section and is not clipped by
 * the scrolling list.
 */
export function TrailRow({
  trail,
  activity,
  expanded,
  popupId,
  mapHovered,
  buttonRef,
  onActivate,
  onEscape,
  onHighlight,
  children,
}: TrailRowProps) {
  const nameId = useId()
  const metaId = useId()
  const activityId = useId()
  const noteId = useId()

  const name = trail.name ?? trailContent.unnamed
  const meta = [
    difficultyLabel(trail.difficulty),
    formatDistance(trail.distanceKm),
    formatDuration(trail.estimatedDurationMin),
  ].filter((part): part is string => part !== null)

  const describedBy = [
    meta.length > 0 ? metaId : null,
    activity.kind === "count" ? activityId : null,
    trail.position === null ? noteId : null,
  ]
    .filter((id): id is string => id !== null)
    .join(" ")

  // Escape on the row's button or anywhere in its popup closes it.
  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key === "Escape" && expanded) {
      event.preventDefault()
      event.stopPropagation()
      onEscape()
    }
  }

  return (
    <li className="discover-row" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="trip-control discover-row-button"
        data-selected={expanded ? "" : undefined}
        data-map-hover={mapHovered && !expanded ? "" : undefined}
        aria-expanded={expanded}
        aria-controls={expanded ? popupId : undefined}
        aria-labelledby={nameId}
        aria-describedby={describedBy !== "" ? describedBy : undefined}
        onClick={onActivate}
        onFocus={() => onHighlight("focus", true)}
        onBlur={() => onHighlight("focus", false)}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            onHighlight("hover", true)
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            onHighlight("hover", false)
          }
        }}
      >
        <span id={nameId} className="discover-row-name">
          {name}
        </span>

        {meta.length > 0 ? (
          <span id={metaId} className="discover-row-meta">
            {meta.join(" · ")}
          </span>
        ) : null}

        {activity.kind === "loading" ? (
          <span className="discover-row-activity" aria-hidden="true">
            <span className="discover-skeleton discover-activity-bar" />
          </span>
        ) : null}

        {activity.kind === "count" ? (
          <span id={activityId} className="discover-row-activity">
            <ActivityGlyph level={activityLevel(activity)} />
            <span>{activityCountText(activity.count)}</span>
          </span>
        ) : null}

        {trail.position === null ? (
          <span id={noteId} className="discover-row-note">
            <MapPinOff aria-hidden="true" strokeWidth={2} />
            <span>{discoverContent.notOnMap}</span>
          </span>
        ) : null}
      </button>

      {children}
    </li>
  )
}
