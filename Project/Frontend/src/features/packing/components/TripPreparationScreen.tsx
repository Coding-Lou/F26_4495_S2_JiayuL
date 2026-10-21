import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CircleAlert, Info } from "lucide-react"
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import { TripShell } from "@/components/layout/TripShell"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { TripDateControl } from "@/features/planning/components/TripDateControl"
import {
  difficultyLabel,
  formatDistance,
  formatDuration,
  formatElevationGain,
} from "@/features/planning/presentation"
import { isIsoDate, todayIso } from "@/features/planning/tripDate"
import { trailFailureKindOf } from "@/features/trails/api/trailDetail"
import { tripContent } from "@/features/trails/content"
import { useTrailDetail } from "@/features/trails/hooks/useTrailDetail"
import { isTrailId } from "@/features/trails/trailId"
import {
  gearStudioLocation,
  trailDetailLocation,
  tripPreparationLocation,
} from "@/features/trails/tripRoutes"
import type { TrailDetail } from "@/features/trails/types/trail"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { useElapsed } from "@/lib/useElapsed"
import { packFailureKindOf } from "../api/packRecommendation"
import { packContent } from "../content"
import { gearRows } from "../gearCategories"
import { usePackRecommendation } from "../hooks/usePackRecommendation"
import { preparationScene } from "../preparationSceneConfig"
import { countGearRows, readinessLine, wholePercent } from "../presentation"
import type { PackFailureKind, PackRecommendation } from "../types/pack"
import { PackBriefing } from "./PackBriefing"
import { PreparationScene } from "./PreparationScene"

/** A wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000

/**
 * Trip Preparation, `/trails/:trailId/prepare/:tripDate` (FEATURE-004
 * sections 12, 15–19, 21.10–21.14): the chosen trail and date, and what the
 * backend recommends bringing, in one panel at the left of the preparation
 * scene.
 *
 * The address is the selection: nothing else records that a trail was
 * chosen, so a reload or a direct visit rebuilds the screen from it. The
 * scene and the panel are siblings that share no state; a later change of
 * visual replaces the scene here and touches nothing of the panel.
 */
export function TripPreparationScreen() {
  const { trailId: routeId = "", tripDate: routeDate } = useParams()
  const [searchParams] = useSearchParams()
  const rec = searchParams.get("rec")
  const { statusRef, alertRef, announce, silence } = useTripAnnouncer()

  return (
    <TripShell
      className="prep"
      headerSurface="scene"
      backdrop={<PreparationScene asset={preparationScene} />}
      announcer={<TripAnnouncer statusRef={statusRef} alertRef={alertRef} />}
    >
      {/* Another trail is another visit. Another date is not: the panel
          stays, so focus stays on the date control that changed it. */}
      <PreparationPanel
        key={routeId}
        routeId={routeId}
        routeDate={routeDate ?? null}
        rec={rec}
        announce={announce}
        silence={silence}
      />
    </TripShell>
  )
}

type PackView =
  /** S8: the address has no usable date. No pack request is made. */
  | { kind: "choose-date"; reason: "missing" | "passed" }
  /** S12: the backend refused the date. */
  | { kind: "date-refused" }
  /** S9 */
  | { kind: "loading" }
  /** S10 and S11. `retrying` is Retry at work. */
  | { kind: "failed"; timedOut: boolean; retrying: boolean }
  | { kind: "ready"; pack: PackRecommendation }

type PreparationPanelProps = {
  routeId: string
  routeDate: string | null
  rec: string | null
  announce: Announce
  silence: () => void
}

function PreparationPanel({
  routeId,
  routeDate,
  rec,
  announce,
  silence,
}: PreparationPanelProps) {
  const navigate = useNavigate()

  // Anything that cannot be a trail id is "not found", with no request made.
  const trailId = isTrailId(routeId) ? routeId : null

  // A real calendar date, today or later by the device's calendar. Anything
  // else asks for a date, and none is assumed (section 12).
  const today = todayIso()
  let dateProblem: "missing" | "passed" | null = null
  if (routeDate === null || !isIsoDate(routeDate)) {
    dateProblem = "missing"
  } else if (routeDate < today) {
    dateProblem = "passed"
  }
  const tripDate = dateProblem === null ? routeDate : null

  // Two independent requests (section 15). The trail gives the summary and a
  // reliable "not found"; the pack gives everything in the briefing.
  const trailQuery = useTrailDetail(trailId)
  const packQuery = usePackRecommendation(trailId, tripDate)

  const headingId = useId()
  const descriptionId = useId()
  const alertId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const briefingRef = useRef<HTMLDivElement>(null)
  const focusBriefingNext = useRef(false)
  /** The failure Retry is working on, and the request it belongs to. */
  const [retrying, setRetrying] = useState<{
    key: string
    kind: PackFailureKind
  } | null>(null)

  const trailFailure = trailQuery.isError
    ? trailFailureKindOf(trailQuery.error)
    : null
  const notFound = trailId === null || trailFailure === "not-found"
  const trail: TrailDetail | null = trailQuery.data ?? null

  const packKey = `${routeId}|${tripDate ?? ""}`
  const packFailure = packQuery.isError
    ? packFailureKindOf(packQuery.error)
    : null
  const retryingKind =
    retrying !== null && retrying.key === packKey ? retrying.kind : null

  let view: PackView
  if (dateProblem !== null) {
    view = { kind: "choose-date", reason: dateProblem }
  } else if (packFailure === "date-not-accepted") {
    view = { kind: "date-refused" }
  } else if (!packQuery.isError && packQuery.data !== undefined) {
    view = { kind: "ready", pack: packQuery.data }
  } else if (retryingKind !== null) {
    view = { kind: "failed", timedOut: retryingKind === "timeout", retrying: true }
  } else if (packFailure !== null && packFailure !== "no-session") {
    // A response from an earlier request is not shown beside a failure.
    view = { kind: "failed", timedOut: packFailure === "timeout", retrying: false }
  } else {
    // Also while the session is ending: FEATURE-002 replaces the screen, and
    // nothing of this feature's is drawn in its place (S16).
    view = { kind: "loading" }
  }

  // The trail request's name; only when it supplied none, the pack's.
  const trailSettled = trailQuery.isSuccess || trailQuery.isError
  const packName = view.kind === "ready" ? view.pack.trailName : null
  const trailName = trail?.name ?? (trailSettled ? packName : null)
  const nameComing =
    trailName === null && (!trailSettled || view.kind === "loading")

  const slow = useElapsed(
    view.kind === "loading",
    `${packKey}|${packQuery.errorUpdateCount}`,
    SLOW_AFTER_MS,
  )

  // On arrival by any route, focus is on the heading (section 23.2). It is
  // one element in every state, so it keeps focus as its text changes.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useDocumentTitle(documentTitle(notFound, trailName))

  // "Trail not found" after a request is said once (section 23.3).
  const wasNotFound = useRef<boolean | null>(null)
  useEffect(() => {
    const before = wasNotFound.current
    wasNotFound.current = notFound
    if (before === false && notFound) {
      announce("status", tripContent.notFoundAnnouncement)
    }
  }, [announce, notFound])

  // What the pack request does after the first paint is said once per
  // request. A response already on screen at first paint is not announced.
  const phase = packPhase(view)
  const loadedAnnouncement =
    view.kind === "ready" ? packLoadedAnnouncement(view.pack) : ""
  const previousPhase = useRef<{ key: string; phase: string } | null>(null)
  useEffect(() => {
    const before = previousPhase.current
    previousPhase.current = { key: packKey, phase }
    if (notFound) {
      return
    }
    if (before !== null && before.key === packKey && before.phase === phase) {
      return
    }

    const waited =
      before !== null &&
      before.key === packKey &&
      (before.phase === "loading" || before.phase === "retrying")

    switch (phase) {
      case "loading":
      case "retrying":
        announce("status", packContent.announcements.loading)
        break
      case "ready":
        if (waited) {
          announce("status", loadedAnnouncement)
        } else {
          // Already on screen: nothing to say, and nothing left of before.
          silence()
        }
        break
      case "unavailable":
        announce("alert", packContent.failure.unavailable)
        break
      case "timeout":
        announce("alert", packContent.failure.timeout)
        break
      default:
        // S8 and S12 are carried by the date control's own messages. What
        // was said for the request before them is ended.
        silence()
        break
    }
  }, [announce, loadedAnnouncement, notFound, packKey, phase, silence])

  /** The first heading of the briefing, once there is one. */
  function focusBriefingHeading(): boolean {
    const heading = briefingRef.current?.querySelector<HTMLElement>("h2")
    if (heading == null) {
      return false
    }
    heading.focus()
    return true
  }

  // After a successful Retry the button is gone: focus goes to the briefing's
  // first heading as soon as it exists (section 23.2).
  useEffect(() => {
    if (focusBriefingNext.current && view.kind === "ready") {
      focusBriefingNext.current = false
      briefingRef.current?.querySelector<HTMLElement>("h2")?.focus()
    }
  }, [view.kind])

  /** Repeats only the pack request. The button keeps focus while it works. */
  function retryPack() {
    if (packFailure === null) {
      return
    }

    const key = packKey
    setRetrying({ key, kind: packFailure })
    void packQuery.refetch().then((result) => {
      setRetrying((current) => (current?.key === key ? null : current))
      if (result.isSuccess && !focusBriefingHeading()) {
        focusBriefingNext.current = true
      }
    })
  }

  /**
   * A date chosen here replaces the address, and the pack loads for it. It is
   * not written to the planner (section 12).
   */
  function chooseDate(date: string) {
    if (trailId === null) {
      return
    }
    void navigate(tripPreparationLocation(trailId, date, rec), { replace: true })
  }

  const dateAttention =
    view.kind === "date-refused" ||
    (view.kind === "choose-date" && view.reason === "passed")
  const hasBriefing =
    !notFound &&
    (view.kind === "loading" || view.kind === "failed" || view.kind === "ready")

  // One tree for every state, so the heading is one element throughout and
  // keeps focus when the trail turns out not to exist.
  return (
    <div className="prep-page">
      <section
        className="prep-panel"
        aria-labelledby={headingId}
        data-view={notFound ? "not-found" : undefined}
      >
        {/* S2 has no strip. */}
        {notFound ? null : (
          <div className="prep-strip">
            <Link
              to={trailDetailLocation(routeId, rec)}
              className="trip-control trip-link"
              aria-label={packContent.trailDetailsName}
            >
              <ArrowLeft aria-hidden="true" strokeWidth={2} />
              {packContent.trailDetails}
            </Link>
            <Link to="/home" className="trip-control trip-link">
              {tripContent.backToPlanning}
            </Link>
          </div>
        )}

        <div className="prep-trip">
          <h1
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="prep-title trip-focus-target"
          >
            {notFound ? (
              tripContent.notFoundHeading
            ) : (
              <PreparationHeading name={trailName} coming={nameComing} />
            )}
          </h1>

          {notFound ? (
            // S2: one block. The scene stays.
            <>
              <p className="prep-state-text">{tripContent.notFoundBody}</p>
              <p className="prep-state-action">
                <Link
                  to="/home"
                  className="trip-control trip-button"
                  data-tone="panel"
                >
                  <ArrowLeft aria-hidden="true" strokeWidth={2} />
                  {tripContent.backToPlanning}
                </Link>
              </p>
            </>
          ) : (
            <>
              {trail !== null ? <TrailFactsLine trail={trail} /> : null}

              {/* The trip date at the start. The end of this row is the
                  position section 21.18 reserved: FEATURE-005's call to
                  action stands there (its section 16.12), only once the pack
                  request has succeeded. Never a placeholder or a disabled
                  form, and never a request of its own: it is navigation. */}
              <div className="prep-date-row">
                <TripDateControl
                  // S8 does not show the address's unusable date. S12 keeps
                  // showing the refused one.
                  value={tripDate}
                  onChange={chooseDate}
                  attention={dateAttention}
                  tone="panel"
                  size="large"
                  placement="below"
                  describedBy={`${descriptionId} ${alertId}`}
                />
                {view.kind === "ready" && trailId !== null && tripDate !== null ? (
                  <Link
                    to={gearStudioLocation(trailId, tripDate, rec)}
                    className="trip-control prep-gear-up"
                  >
                    {packContent.gearUp}
                    <ArrowRight aria-hidden="true" strokeWidth={2} />
                  </Link>
                ) : null}
              </div>

              {/* S8: the control's description, not a live message. */}
              <p
                id={descriptionId}
                className="trip-slot prep-slot"
                data-tone="panel"
              >
                {view.kind === "choose-date" ? (
                  <span className="trip-slot-message">
                    {view.reason === "passed" ? (
                      <CircleAlert aria-hidden="true" strokeWidth={2} />
                    ) : (
                      <Info aria-hidden="true" strokeWidth={2} />
                    )}
                    <span>
                      {view.reason === "passed"
                        ? packContent.date.passed
                        : packContent.date.needed}
                    </span>
                  </span>
                ) : null}
              </p>

              {/* S12: an alert. */}
              <p
                id={alertId}
                role="alert"
                className="trip-slot prep-slot"
                data-tone="panel"
              >
                {view.kind === "date-refused" ? (
                  <span className="trip-slot-message">
                    <CircleAlert aria-hidden="true" strokeWidth={2} />
                    <span>{packContent.date.refused}</span>
                  </span>
                ) : null}
              </p>
            </>
          )}
        </div>

        {/* The briefing: the only zone that scrolls, so it is a named region
            and a tab stop. Absent where there is nothing to brief. */}
        {hasBriefing ? (
          <div
            ref={briefingRef}
            className="trip-control prep-briefing"
            role="region"
            aria-label={packContent.briefingName}
            tabIndex={0}
            data-waiting={view.kind === "ready" ? undefined : ""}
          >
            {view.kind === "loading" ? (
              <p className="prep-waiting">
                <span className="prep-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{slow ? tripContent.stillLoading : packContent.loading}</span>
              </p>
            ) : null}

            {view.kind === "failed" ? (
              <>
                <p className="prep-failure">
                  <CircleAlert aria-hidden="true" strokeWidth={2} />
                  <span>
                    {view.timedOut
                      ? packContent.failure.timeout
                      : packContent.failure.unavailable}
                  </span>
                </p>
                <p className="prep-failure-action">
                  <TripRetryButton
                    tone="panel"
                    working={view.retrying}
                    onRetry={retryPack}
                  />
                </p>
              </>
            ) : null}

            {view.kind === "ready" && tripDate !== null ? (
              <PackBriefing pack={view.pack} tripDate={tripDate} />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

type PreparationHeadingProps = {
  name: string | null
  /** The name is not known yet, and a request that may supply it is running. */
  coming: boolean
}

/**
 * "Preparing for {trail name}" (TP1): two lines in one heading, read as one
 * phrase. It describes the trip, not the picture behind the panel. Until a
 * name is known a bar stands in for it and the heading reads "Preparing for
 * your trip" (TP2); if no name can be obtained, those words are shown.
 */
function PreparationHeading({ name, coming }: PreparationHeadingProps) {
  return (
    <>
      <span className="prep-title-lead">{packContent.preparingFor}</span>{" "}
      {name === null && coming ? (
        <>
          <span className="prep-title-skeleton" aria-hidden="true" />
          <span className="sr-only">{packContent.yourTrip}</span>
        </>
      ) : (
        // A text node: a name is the backend's, shown as returned.
        <span className="prep-title-name">{name ?? packContent.yourTrip}</span>
      )}
    </>
  )
}

/** The name used for an announcement's change detection. */
function packPhase(view: PackView): string {
  if (view.kind !== "failed") {
    return view.kind
  }
  if (view.retrying) {
    return "retrying"
  }
  return view.timedOut ? "timeout" : "unavailable"
}

/**
 * Section 23.3: "Gear list loaded. Gear Readiness 60%. 2 recommended items
 * missing, 3 owned." The rows themselves are not read out; they are read in place.
 */
function packLoadedAnnouncement(pack: PackRecommendation): string {
  const { announcements, gear, forecast } = packContent
  const rows = gearRows(pack.requiredGear)

  const parts: string[] = [announcements.loaded]
  if (rows.length > 0) {
    const counts = countGearRows(rows)
    parts.push(
      `${announcements.readiness} ${wholePercent(pack.readinessPercentage)}%.`,
      `${readinessLine(pack.readinessPercentage, pack.requiredGear)}, ${counts.owned} ${gear.owned}.`,
    )
  } else {
    parts.push(gear.none)
  }
  if (pack.weather === null) {
    parts.push(forecast.unavailable)
  }
  return parts.join(" ")
}

/** DT2 and DT3. */
function documentTitle(notFound: boolean, trailName: string | null): string {
  if (notFound) {
    return tripContent.notFoundTitle
  }

  const { suffix, separator } = packContent.title
  return trailName !== null ? `${trailName}${separator}${suffix}` : suffix
}

/**
 * The selected trail's facts in one line, in the planner card's formats
 * (section 21.11). From the trail request only; a missing part is dropped
 * with its separator, and the line is dropped when all are missing.
 */
function TrailFactsLine({ trail }: { trail: TrailDetail }) {
  const difficulty = difficultyLabel(trail.difficulty)
  const parts: { key: string; text: string; strong: boolean }[] = []

  if (difficulty !== null) {
    parts.push({ key: "difficulty", text: difficulty, strong: true })
  }
  for (const [key, text] of [
    ["distance", formatDistance(trail.distanceKm)],
    ["elevation", formatElevationGain(trail.elevationGainM)],
    ["duration", formatDuration(trail.estimatedDurationMin)],
  ] as const) {
    if (text !== null) {
      parts.push({ key, text, strong: false })
    }
  }

  if (parts.length === 0) {
    return null
  }

  return (
    <p className="prep-facts">
      {parts.map((part, index) => (
        <span key={part.key}>
          {index > 0 ? " · " : null}
          <span className={part.strong ? "prep-facts-strong" : undefined}>
            {part.text}
          </span>
        </span>
      ))}
    </p>
  )
}
