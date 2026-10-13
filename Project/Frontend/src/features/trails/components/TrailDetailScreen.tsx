import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeft, LoaderCircle, Map as MapIcon } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import { TripShell } from "@/components/layout/TripShell"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import {
  difficultyLabel,
  formatDistance,
  formatDuration,
  formatElevationGain,
  sceneryLabels,
} from "@/features/planning/presentation"
import { useTrailPlanningContext } from "@/features/planning/trailContext"
import { isIsoDate, todayIso } from "@/features/planning/tripDate"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { useElapsed } from "@/lib/useElapsed"
import { trailFailureKindOf } from "../api/trailDetail"
import { SAMPLE_DATA_SOURCE, trailContent, tripContent } from "../content"
import { useTrailDetail } from "../hooks/useTrailDetail"
import { isTrailId } from "../trailId"
import type { TrailDetail, TrailFailureKind } from "../types/trail"
import { TrailDecision } from "./TrailDecision"
import { TrailVisual } from "./TrailVisual"
import { WhyThisTrail } from "./WhyThisTrail"

/** A wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000

/**
 * Trail Detail, `/trails/:trailId` (FEATURE-004 sections 7–11, 21.3–21.8): a
 * quiet reading page for one decision. One `paper` sheet on the shell's `ink`
 * base, with no scene behind it: the preparation scene belongs to the screen
 * after the choice (section 13).
 *
 * What the trail is comes from the trail request only. Why it was
 * recommended comes from the planner's own session, looked up by the `rec`
 * reference in the address, and is simply absent when that finds nothing.
 */
export function TrailDetailScreen() {
  const { trailId: routeId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const rec = searchParams.get("rec")
  const { statusRef, alertRef, announce, silence } = useTripAnnouncer()

  return (
    <TripShell
      className="trail-detail"
      announcer={<TripAnnouncer statusRef={statusRef} alertRef={alertRef} />}
    >
      {/* Another trail, or another reference, is another visit: the date
          being edited and any failure belong to the one that was left. */}
      <TrailDetailView
        key={`${routeId}|${rec ?? ""}`}
        routeId={routeId}
        rec={rec}
        announce={announce}
        silence={silence}
      />
    </TripShell>
  )
}

type TrailView =
  /** S1 */
  | { kind: "loading" }
  /** S2 */
  | { kind: "not-found" }
  /** S3. `retrying` is Retry at work. */
  | { kind: "failed"; timedOut: boolean; retrying: boolean }
  | { kind: "trail"; trail: TrailDetail }

type TrailDetailViewProps = {
  routeId: string
  rec: string | null
  announce: Announce
  silence: () => void
}

function TrailDetailView({
  routeId,
  rec,
  announce,
  silence,
}: TrailDetailViewProps) {
  // Anything that cannot be a trail id is "not found", with no request made.
  const trailId = isTrailId(routeId) ? routeId : null
  const query = useTrailDetail(trailId)
  const planning = useTrailPlanningContext(rec, trailId)

  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  /** The failure Retry is working on, while it works. */
  const [retrying, setRetrying] = useState<TrailFailureKind | null>(null)

  const failure = query.isError ? trailFailureKindOf(query.error) : null

  let view: TrailView
  if (trailId === null || failure === "not-found") {
    view = { kind: "not-found" }
  } else if (query.data !== undefined) {
    view = { kind: "trail", trail: query.data }
  } else if (retrying !== null) {
    view = { kind: "failed", timedOut: retrying === "timeout", retrying: true }
  } else if (failure !== null && failure !== "no-session") {
    view = { kind: "failed", timedOut: failure === "timeout", retrying: false }
  } else {
    // Also while the session is ending: FEATURE-002 replaces the screen, and
    // nothing of this feature's is drawn in its place (S16).
    view = { kind: "loading" }
  }

  const trailName = view.kind === "trail" ? view.trail.name : null
  const slow = useElapsed(view.kind === "loading", routeId, SLOW_AFTER_MS)

  // On arrival by any route, focus is on the heading (section 23.2). It is
  // one element in every state, so it keeps focus as its text changes.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useDocumentTitle(documentTitle(view, trailName))

  // What changed after the first paint is said once (section 23.3). Loading
  // itself is carried by the focused heading.
  const phase = view.kind === "failed" && view.retrying ? "retrying" : view.kind
  const failedTimedOut = view.kind === "failed" && view.timedOut
  const previousPhase = useRef<string | null>(null)
  useEffect(() => {
    const before = previousPhase.current
    previousPhase.current = phase
    if (before === null || before === phase) {
      return
    }

    if (phase === "trail") {
      announce(
        "status",
        `${trailName ?? trailContent.unnamed}. ${trailContent.loadedAnnouncement}`,
      )
    } else if (phase === "not-found") {
      announce("status", tripContent.notFoundAnnouncement)
    } else if (phase === "failed") {
      const { failure: text } = trailContent
      announce(
        "alert",
        `${text.heading}. ${failedTimedOut ? text.timeout : text.unavailable}`,
      )
    } else {
      // Retry at work is carried by the button; the failure is no longer news.
      silence()
    }
  }, [announce, failedTimedOut, phase, silence, trailName])

  /** Repeats the trail request. The button keeps focus while it works. */
  function retry() {
    if (failure === null) {
      return
    }

    setRetrying(failure)
    void query.refetch().then((result) => {
      setRetrying(null)
      if (result.isSuccess) {
        headingRef.current?.focus()
      }
    })
  }

  // Why this trail needs the recommendation and its score (section 8.1).
  const recommendation = view.kind === "trail" ? planning.recommendation : null
  const score = recommendation?.score ?? null

  return (
    <div className="trail-page">
      <div className="trail-frame">
        {/* Present in every state (section 10). */}
        <div className="trail-back">
          <Link to="/home" className="trip-control trip-link">
            <ArrowLeft aria-hidden="true" strokeWidth={2} />
            {tripContent.backToPlanning}
          </Link>
        </div>

        <article
          className="trail-sheet"
          aria-labelledby={headingId}
          data-view={view.kind}
        >
          <div className="trail-column">
            <h1
              ref={headingRef}
              id={headingId}
              tabIndex={-1}
              className="trail-name trip-focus-target"
            >
              <TrailHeading view={view} />
            </h1>

            {view.kind === "loading" ? <TrailLoading slow={slow} /> : null}

            {view.kind === "not-found" ? (
              <>
                <p className="trail-state-text">{tripContent.notFoundBody}</p>
                <p className="trail-state-action">
                  <Link
                    to="/home"
                    className="trip-control trip-button"
                    data-tone="paper"
                  >
                    <ArrowLeft aria-hidden="true" strokeWidth={2} />
                    {tripContent.backToPlanning}
                  </Link>
                </p>
              </>
            ) : null}

            {view.kind === "failed" ? (
              <>
                <p className="trail-state-text">
                  {view.timedOut
                    ? trailContent.failure.timeout
                    : trailContent.failure.unavailable}
                </p>
                <p className="trail-state-action">
                  <TripRetryButton
                    tone="paper"
                    working={view.retrying}
                    onRetry={retry}
                  />
                </p>
              </>
            ) : null}

            {view.kind === "trail" ? (
              <TrailBriefing
                trail={view.trail}
                scenery={sceneryLabels(recommendation?.scenery ?? [])}
              />
            ) : null}
          </div>

          {/* The rail: why it was recommended, then the one decision. It is
              not rendered until the trail has loaded. */}
          {view.kind === "trail" && trailId !== null ? (
            <div className="trail-rail">
              {recommendation !== null && score !== null ? (
                <WhyThisTrail recommendation={recommendation} score={score} />
              ) : null}

              <TrailDecision
                trailId={trailId}
                rec={rec}
                initialDate={prefilledTripDate(
                  planning.recommendation?.usedTripDate ?? null,
                  planning.tripDate,
                )}
                afterWhy={recommendation !== null && score !== null}
              />
            </div>
          ) : null}
        </article>
      </div>
    </div>
  )
}

/**
 * The trip date the screen starts with (section 11.2): the date the trail was
 * scored for, otherwise the planner's current one, otherwise none. A
 * candidate before today is skipped.
 */
function prefilledTripDate(
  scoredFor: string | null,
  plannerDate: string | null,
): string | null {
  const today = todayIso()
  for (const candidate of [scoredFor, plannerDate]) {
    if (candidate !== null && isIsoDate(candidate) && candidate >= today) {
      return candidate
    }
  }
  return null
}

/** DT1 and DT3. */
function documentTitle(view: TrailView, trailName: string | null): string {
  if (view.kind === "not-found") {
    return tripContent.notFoundTitle
  }

  const { suffix, separator } = trailContent.title
  return trailName !== null ? `${trailName}${separator}${suffix}` : suffix
}

/** The one `h1`, in every state. */
function TrailHeading({ view }: { view: TrailView }) {
  switch (view.kind) {
    case "loading":
      return (
        <>
          <span
            className="trail-skeleton trail-skeleton-name"
            aria-hidden="true"
          />
          <span className="sr-only">{trailContent.loading}</span>
        </>
      )
    case "not-found":
      return tripContent.notFoundHeading
    case "failed":
      return trailContent.failure.heading
    case "trail":
      // A text node: the name is the backend's, shown as returned.
      return view.trail.name ?? trailContent.unnamed
  }
}

/**
 * S1: static shapes where the content will be, and one line that says what
 * is happening. The shapes are decoration; the line and the heading carry the
 * state.
 */
function TrailLoading({ slow }: { slow: boolean }) {
  return (
    <>
      <p className="trail-loading-line">
        <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
        <span>{slow ? tripContent.stillLoading : trailContent.loading}</span>
      </p>

      <div className="trail-skeleton-facts" aria-hidden="true">
        <span className="trail-skeleton" />
        <span className="trail-skeleton" />
        <span className="trail-skeleton" />
        <span className="trail-skeleton" />
      </div>

      <div className="trail-visual" data-skeleton="" aria-hidden="true" />

      <div className="trail-skeleton-lines" aria-hidden="true">
        <span className="trail-skeleton" />
        <span className="trail-skeleton" />
        <span className="trail-skeleton" />
      </div>
    </>
  )
}

type TrailBriefingProps = {
  trail: TrailDetail
  /** Labels from the recommendation context; empty without one. */
  scenery: string[]
}

/**
 * What the trail is and how demanding it is (sections 7.1, 21.4, 21.5). Every
 * value is the trail request's. A value that is null is left out, with no
 * placeholder in its place.
 */
function TrailBriefing({ trail, scenery }: TrailBriefingProps) {
  const { facts: labels } = trailContent

  const facts: { label: string; value: string }[] = []
  for (const [label, value] of [
    [labels.difficulty, difficultyLabel(trail.difficulty)],
    [labels.distance, formatDistance(trail.distanceKm)],
    [labels.elevation, formatElevationGain(trail.elevationGainM)],
    [labels.duration, formatDuration(trail.estimatedDurationMin)],
  ] as const) {
    if (value !== null) {
      facts.push({ label, value })
    }
  }

  return (
    <>
      {scenery.length > 0 ? (
        <p className="trail-scenery">
          <span className="sr-only">{trailContent.sceneryPrefix}</span>
          {scenery.join(" · ")}
        </p>
      ) : null}

      {facts.length > 0 ? (
        <dl className="trail-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="trail-fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <TrailVisual coverImageUrl={trail.coverImageUrl} />

      {/* Routes are not drawn by this feature, whatever the trail holds (D10). */}
      <p className="trail-route">
        <MapIcon aria-hidden="true" strokeWidth={2} />
        <span>{trailContent.noRoute}</span>
      </p>

      {trail.description !== null ? (
        <p className="trail-description">{trail.description}</p>
      ) : null}

      {trail.source === SAMPLE_DATA_SOURCE ? (
        <p className="trail-sample">{trailContent.sampleData}</p>
      ) : null}
    </>
  )
}
