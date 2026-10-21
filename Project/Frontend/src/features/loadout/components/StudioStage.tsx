import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Focus,
  Info,
  Pause,
  Play,
} from "lucide-react"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import {
  AvatarViewer,
  type AvatarViewerHandle,
  type AvatarViewerStatus,
  type VisualCategory,
} from "@/features/avatar"
import { tripContent } from "@/features/trails/content"
import { useElapsed } from "@/lib/useElapsed"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { studioContent } from "../content"

/** A wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000

/** Tier T, 768–1023px: the view bar is four icon-only circles (17). */
const COMPACT_QUERY = "(max-width: 1023.98px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

type StudioStageProps = {
  /** 768px wide or more: the viewer is mounted. Below, text only (17). */
  wide: boolean
  /** The equipped visual categories, sorted. Never an item or a name. */
  equipped: readonly VisualCategory[]
  /** The viewer's latest report, null before the first. */
  status: AvatarViewerStatus | null
  onStatusChange: (status: AvatarViewerStatus) => void
  /** The canvas's text alternative (18.5). */
  loadoutText: string
  announce: Announce
  /**
   * FEATURE-012 section 10: the ready clip's cue, from `useReadyToGo`. Passed
   * to the viewer as is; inert when the viewer is not mounted.
   */
  readyCue: number
}

/**
 * The Stage (FEATURE-005 sections 16.4, 16.11, 17, 34): where the avatar
 * stands, and every word and control around it. The viewer draws the canvas
 * and nothing else; every state's appearance is drawn here, from the status
 * it reports (section 28.4).
 *
 * In no state is a gear control in the panel disabled, hidden, or delayed by
 * what happens here.
 */
export function StudioStage({
  wide,
  equipped,
  status,
  onStatusChange,
  loadoutText,
  announce,
  readyCue,
}: StudioStageProps) {
  const headingId = useId()
  const { stage } = studioContent

  if (!wide) {
    // Below 768px: no viewer, no canvas, no 3D chunk, no model (Q11).
    return (
      <section
        className="studio-stage"
        data-narrow=""
        aria-labelledby={headingId}
      >
        <h2 id={headingId} className="sr-only">
          {stage.heading}
        </h2>
        <p className="studio-stage-text">{stage.narrow}</p>
        <p className="studio-stage-text">{loadoutText}</p>
      </section>
    )
  }

  return (
    <WideStage
      headingId={headingId}
      equipped={equipped}
      status={status}
      onStatusChange={onStatusChange}
      loadoutText={loadoutText}
      announce={announce}
      readyCue={readyCue}
    />
  )
}

type WideStageProps = Omit<StudioStageProps, "wide"> & { headingId: string }

function WideStage({
  headingId,
  equipped,
  status,
  onStatusChange,
  loadoutText,
  announce,
  readyCue,
}: WideStageProps) {
  const { stage, announcements } = studioContent
  const compact = useMediaQuery(COMPACT_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  const viewerRef = useRef<AvatarViewerHandle>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const [paused, setPaused] = useState(false)
  /** Retry was pressed and the viewer has not settled since. */
  const [retrying, setRetrying] = useState(false)
  const retryingRef = useRef(false)
  const focusResetNext = useRef(false)
  const previousState = useRef<AvatarViewerStatus["state"] | null>(null)

  const state = status?.state ?? "loading"

  /**
   * Every report. State changes made by the viewer itself are announced as
   * status, never as an alert, and never for the first report: that is what
   * the screen showed from the start (18.4).
   */
  const handleStatus = useCallback(
    (next: AvatarViewerStatus) => {
      const before = previousState.current
      previousState.current = next.state

      if (next.state !== "loading" && retryingRef.current) {
        retryingRef.current = false
        // Retry worked: its button is about to go, so focus moves on.
        focusResetNext.current =
          next.state === "ready" || next.state === "partial"
        setRetrying(false)
      }

      if (before !== null && before !== next.state) {
        if (next.state === "ready" && before === "loading") {
          announce("status", announcements.avatarLoaded)
        } else if (next.state === "partial") {
          announce("status", stage.partial)
        } else if (next.state === "unavailable") {
          announce(
            "status",
            next.unavailable?.retryable === false
              ? stage.unsupported
              : stage.unavailable,
          )
        }
      }

      onStatusChange(next)
    },
    [announce, announcements.avatarLoaded, onStatusChange, stage],
  )

  // After a Retry that worked, the Retry button is gone: Reset view (18.3).
  useEffect(() => {
    if (focusResetNext.current && resetRef.current !== null) {
      focusResetNext.current = false
      resetRef.current.focus()
    }
  })

  const slow = useElapsed(state === "loading" && !retrying, "viewer", SLOW_AFTER_MS)

  const drawn = state === "ready" || state === "partial"
  // The unavailable block stays while Retry works, so Retry keeps focus.
  const blocked = state === "unavailable" || (retrying && state === "loading")
  const retryable = retrying || status?.unavailable?.retryable === true
  const showMotion = drawn && !reducedMotion && status?.motion !== "none"

  return (
    <section
      className="studio-stage"
      aria-labelledby={headingId}
      data-viewer-state={state}
    >
      <h2 id={headingId} className="sr-only">
        {stage.heading}
      </h2>

      {/* Words first: visually hidden while the avatar is (or will be) on
          screen, visible in the unavailable block. Not a live region. */}
      {blocked ? null : <p className="sr-only">{loadoutText}</p>}

      <div className="studio-stage-box">
        <AvatarViewer
          ref={viewerRef}
          className="studio-viewer"
          equipped={equipped}
          reducedMotion={reducedMotion}
          paused={paused}
          readyCue={readyCue}
          onStatusChange={handleStatus}
        />

        {state === "loading" && !retrying ? (
          <p className="studio-stage-waiting">
            <span className="studio-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{slow ? tripContent.stillLoading : stage.loading}</span>
          </p>
        ) : null}

        {blocked ? (
          <div className="studio-stage-unavailable">
            <Info aria-hidden="true" strokeWidth={2} />
            <p>{retryable ? stage.unavailable : stage.unsupported}</p>
            <p>{loadoutText}</p>
            {retryable ? (
              <p className="studio-stage-retry">
                <TripRetryButton
                  tone="panel"
                  working={retrying}
                  onRetry={() => {
                    retryingRef.current = true
                    setRetrying(true)
                    viewerRef.current?.retry()
                  }}
                />
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Its space is kept in every state, so the Stage never changes size. */}
      <div className="studio-under">
        {drawn ? (
          <>
            <div
              className="studio-viewbar"
              role="group"
              aria-label={stage.viewGroup}
            >
              <button
                type="button"
                className="trip-control trip-quiet studio-circle"
                aria-label={stage.turnLeft}
                title={stage.turnLeft}
                onClick={() => {
                  viewerRef.current?.turnLeft()
                  announce("status", announcements.turnedLeft)
                }}
              >
                <ChevronLeft aria-hidden="true" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="trip-control trip-quiet studio-circle"
                aria-label={stage.turnRight}
                title={stage.turnRight}
                onClick={() => {
                  viewerRef.current?.turnRight()
                  announce("status", announcements.turnedRight)
                }}
              >
                <ChevronRight aria-hidden="true" strokeWidth={2} />
              </button>
              <button
                ref={resetRef}
                type="button"
                className={`trip-control trip-quiet ${compact ? "studio-circle" : "studio-pill"} studio-reset`}
                aria-label={compact ? stage.resetView : undefined}
                title={compact ? stage.resetView : undefined}
                onClick={() => {
                  viewerRef.current?.resetView()
                  announce("status", announcements.viewReset)
                }}
              >
                {compact ? (
                  <Focus aria-hidden="true" strokeWidth={2} />
                ) : (
                  stage.resetView
                )}
              </button>
              {showMotion ? (
                <button
                  type="button"
                  className={`trip-control trip-quiet ${compact ? "studio-circle" : "studio-pill"}`}
                  aria-label={compact ? (paused ? stage.play : stage.pause) : undefined}
                  title={compact ? (paused ? stage.play : stage.pause) : undefined}
                  onClick={() => setPaused((current) => !current)}
                >
                  {paused ? (
                    <Play aria-hidden="true" strokeWidth={2} />
                  ) : (
                    <Pause aria-hidden="true" strokeWidth={2} />
                  )}
                  {compact ? null : paused ? stage.play : stage.pause}
                </button>
              ) : null}
            </div>

            {state === "partial" ? (
              <p className="studio-caption studio-caption-partial">
                <Info aria-hidden="true" strokeWidth={2} />
                <span>{stage.partial}</span>
              </p>
            ) : null}
            <p className="studio-caption">{stage.caption}</p>
          </>
        ) : null}
      </div>
    </section>
  )
}
