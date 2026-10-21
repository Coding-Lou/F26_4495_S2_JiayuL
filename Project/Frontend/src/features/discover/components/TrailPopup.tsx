import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react"
import { CircleAlert, MapPinOff, X } from "lucide-react"
import {
  authBoundaryNoticeSurface,
  authBoundaryNoticeText,
  dismissAuthBoundaryNotice,
  startTrailPlanning,
  useAuthBoundaryNotice,
  useAuthControlStates,
  type GateAction,
} from "@/features/auth/authBoundary"
import { AuthActionLabel } from "@/features/landing/AuthActionLabel"
import { authControlAttributes } from "@/features/landing/authControlAttributes"
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
import {
  activityContent,
  isSampleTrailSource,
  trailContent,
} from "@/features/trails/content"
import type { TrailSummary } from "@/features/trails/types/trail"
import { discoverContent } from "../content"
import {
  formatElevation,
  orderedSceneryLabels,
  shortDescription,
} from "../trailText"
import { ActivityGlyph } from "./ActivityGlyph"

type TrailPopupProps = {
  /** The id the row's `aria-controls` points at. */
  id: string
  trail: TrailSummary
  activity: ActivityReading
  popupRef: Ref<HTMLDivElement>
  /** Close (×): clear the selection and put focus on the row. */
  onClose: () => void
  /** The cover image went away, or arrived: its size changed. */
  onResize?: () => void
  /**
   * FEATURE-010's Community Memories block, placed after the sample-data
   * line and before Sign in to plan this trip (§8.1). Absent for a
   * synthetic trail: nothing at all is rendered there (§13).
   */
  community?: ReactNode
  /**
   * The Community rail is open (from 1024px): the popup stays mounted and
   * placed, but hidden and inert, until it closes (FEATURE-010 §9.3).
   */
  communityHidden?: boolean
}

/**
 * The Trail Detail popup (FEATURE-006 sections 10, 16.9, 16.11): one trail's
 * facts, today's activity, and the invitation to sign in, beside its marker.
 *
 * It is rendered inside the selected trail's `li`, directly after the row's
 * button, and positioned over the map by the Discover section (16.11.2), so
 * its place in the reading and tab order is row → popup → next row. It is a
 * `group` named by its heading: focus is not moved into it and it blocks
 * nothing (16.11.3). It announces nothing when it opens.
 *
 * Sign in to plan this trip and Create account keep this trail's
 * authenticated address as the return destination (§11). Nothing here is
 * invented for a missing value: its part is left out.
 */
export function TrailPopup({
  id,
  trail,
  activity,
  popupRef,
  onClose,
  onResize,
  community,
  communityHidden = false,
}: TrailPopupProps) {
  const nameId = useId()
  const states = useAuthControlStates("popup")
  const notice = useAuthBoundaryNotice()
  const failure =
    notice !== null && authBoundaryNoticeSurface(notice) === "popup"
      ? notice
      : null

  // F3 is the popup's while it is open: it goes when the popup closes or
  // another trail's opens (16.9.5). The cleanup reads the failure shown last.
  const shownFailureRef = useRef(failure)
  useEffect(() => {
    shownFailureRef.current = failure
  })
  useEffect(
    () => () => {
      if (shownFailureRef.current !== null) {
        dismissAuthBoundaryNotice()
      }
    },
    [],
  )

  function start(action: GateAction) {
    // Another attempt clears the last failure first.
    if (failure !== null) {
      dismissAuthBoundaryNotice()
    }
    startTrailPlanning(trail.id, action)
  }

  const name = trail.name ?? trailContent.unnamed
  const scenery = orderedSceneryLabels(trail.scenery)
  const description = shortDescription(trail.description)
  const { facts: labels } = trailContent
  const facts: { label: string; value: string }[] = []
  for (const [label, value] of [
    [labels.difficulty, difficultyLabel(trail.difficulty)],
    [labels.distance, formatDistance(trail.distanceKm)],
    [labels.elevation, formatElevation(trail.elevationGainM)],
    [labels.duration, formatDuration(trail.estimatedDurationMin)],
  ] as const) {
    if (value !== null) {
      facts.push({ label, value })
    }
  }

  return (
    <div
      ref={popupRef}
      id={id}
      role="group"
      aria-labelledby={nameId}
      className="discover-popup"
      data-community-hidden={communityHidden ? "" : undefined}
      inert={communityHidden}
    >
      <span className="discover-popup-tip" aria-hidden="true" />

      <div className="discover-popup-scroll">
        {trail.coverImageUrl !== null ? (
          <PopupImage
            key={trail.coverImageUrl}
            src={trail.coverImageUrl}
            onSettled={onResize}
          />
        ) : null}

        <div className="discover-popup-body">
          {/* Focusable from script only: where focus returns when the
              Community rail closes and its opener is gone (FEATURE-010
              §18.8). */}
          <h4
            id={nameId}
            tabIndex={-1}
            className="discover-popup-name trip-focus-target"
          >
            {name}
          </h4>

          {scenery.length > 0 ? (
            <p className="discover-popup-scenery">
              <span className="sr-only">{trailContent.sceneryPrefix}</span>
              {scenery.join(" · ")}
            </p>
          ) : null}

          {facts.length > 0 ? (
            <dl className="discover-popup-facts">
              {facts.map((fact) => (
                <div key={fact.label} className="discover-popup-fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <PopupActivity reading={activity} />

          {trail.position === null ? (
            <p className="discover-popup-note">
              <MapPinOff aria-hidden="true" strokeWidth={2} />
              <span>{discoverContent.notOnMap}</span>
            </p>
          ) : null}

          {description !== null ? (
            <p className="discover-popup-description">{description}</p>
          ) : null}

          {isSampleTrailSource(trail.source) ? (
            <p className="discover-popup-sample">{trailContent.sampleData}</p>
          ) : null}

          {community}

          <button
            type="button"
            className="trip-control auth-entry discover-popup-primary"
            {...authControlAttributes(states["gate-sign-in"])}
            onClick={() => start("sign-in")}
          >
            <AuthActionLabel
              label={discoverContent.popup.signInToPlan}
              state={states["gate-sign-in"]}
            />
          </button>

          <button
            type="button"
            className="trip-control auth-entry discover-popup-secondary"
            {...authControlAttributes(states["gate-create-account"])}
            onClick={() => start("create-account")}
          >
            <AuthActionLabel
              label={discoverContent.popup.createAccount}
              state={states["gate-create-account"]}
            />
          </button>

          <div
            role="status"
            aria-atomic="true"
            className="discover-popup-slot"
          >
            {failure !== null ? (
              <p key={failure.id} className="discover-popup-message">
                <CircleAlert aria-hidden="true" strokeWidth={2} />
                <span>{authBoundaryNoticeText(failure)}</span>
              </p>
            ) : null}
          </div>

          {/* Last in the DOM, first at the top right (16.11.3). */}
          <button
            type="button"
            className="trip-control discover-popup-close"
            aria-label={discoverContent.popup.close}
            onClick={onClose}
          >
            <X aria-hidden="true" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Today's activity in the popup (16.9.6). Read in place, never announced. */
function PopupActivity({ reading }: { reading: ActivityReading }) {
  if (reading.kind !== "count") {
    return (
      <p className="discover-popup-activity" data-quiet="">
        {reading.kind === "loading"
          ? activityContent.loading
          : activityContent.unavailable}
      </p>
    )
  }

  return (
    <p className="discover-popup-activity">
      <ActivityGlyph level={activityLevel(reading)} />
      <span>
        {activityCountText(reading.count)}
        {reading.sample ? (
          <span className="discover-popup-quiet">
            {" · "}
            {activityContent.sample}
          </span>
        ) : null}
      </span>
    </p>
  )
}

/**
 * Only for a trail with a real cover image. It fades in when it has loaded;
 * if it fails it is removed, with nothing in its place, and the popup is
 * placed again (16.9.2, D15).
 */
function PopupImage({
  src,
  onSettled,
}: {
  src: string
  onSettled?: () => void
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")

  useEffect(() => {
    if (state !== "loading") {
      onSettled?.()
    }
  }, [state, onSettled])

  if (state === "failed") {
    return null
  }

  return (
    <img
      src={src}
      alt=""
      loading="eager"
      decoding="async"
      draggable={false}
      className="discover-popup-image"
      data-ready={state === "ready" ? "" : undefined}
      onLoad={() => setState("ready")}
      onError={() => setState("failed")}
    />
  )
}
