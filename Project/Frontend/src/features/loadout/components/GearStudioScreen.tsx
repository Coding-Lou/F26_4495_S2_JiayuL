import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CircleAlert } from "lucide-react"
import {
  Link,
  Navigate,
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
import { getAuthenticatedSubject, useAuth } from "@/features/auth"
import type { AvatarViewerStatus } from "@/features/avatar"
import {
  gearFailureKindOf,
  useAddGearItem,
  useGearItems,
  type GearCategory,
  type GearItem,
} from "@/features/gear"
import { packFailureKindOf } from "@/features/packing/api/packRecommendation"
import { packContent } from "@/features/packing/content"
import { gearCategoryLabel } from "@/features/packing/gearCategories"
import {
  packRecommendationQueryKey,
  usePackRecommendation,
} from "@/features/packing/hooks/usePackRecommendation"
import { readinessLine, wholePercent } from "@/features/packing/presentation"
import type { PackRecommendation } from "@/features/packing/types/pack"
import {
  difficultyLabel,
  formatDistance,
  formatDuration,
  formatElevationGain,
} from "@/features/planning/presentation"
import {
  formatTripDateShort,
  isIsoDate,
  todayIso,
} from "@/features/planning/tripDate"
import { FinishPreparation } from "@/features/plans/components/FinishPreparation"
import { trailFailureKindOf } from "@/features/trails/api/trailDetail"
import { tripContent } from "@/features/trails/content"
import { useTrailDetail } from "@/features/trails/hooks/useTrailDetail"
import { isTrailId } from "@/features/trails/trailId"
import { tripPreparationLocation } from "@/features/trails/tripRoutes"
import type { TrailDetail } from "@/features/trails/types/trail"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { useElapsed } from "@/lib/useElapsed"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { studioContent, visualNouns } from "../content"
import { useAvatarAnnouncer } from "../hooks/useAvatarAnnouncer"
import { useReadyToGo } from "../hooks/useReadyToGo"
import {
  buildStudioModel,
  countSentence,
  equippedVisuals,
  loadoutText,
  reconcileLoadout,
  viewerStateOf,
  type AvatarPresence,
  type Equipped,
  type StudioModel,
  type StudioRow,
} from "../model/studioModel"
import {
  openLoadoutSession,
  setTripLoadout,
  useStoredTripLoadout,
} from "../state/loadoutStore"
import type { AddGearResult } from "./AddGearForm"
import { GearZone, type GearZoneActions } from "./GearZone"
import { PackSummary } from "./PackSummary"
import { StudioStage } from "./StudioStage"
// The Studio's styles travel with its lazily loaded chunk.
import "../studio.css"

/** A wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000

/** From here the Stage is beside the panel and the viewer is mounted (17). */
const WIDE_QUERY = "(min-width: 768px)"

const NOTHING_EQUIPPED: Equipped = Object.freeze({})

/**
 * The Gear Customization Studio, `/trails/:trailId/prepare/:tripDate/pack`
 * (FEATURE-005 sections 10, 15–18): the panel of gear choices at the left,
 * the avatar's Stage at the right, on a backdrop of tokens only.
 *
 * The address is the trip. A date that is not a real date, or is before
 * today, is not the Studio's to fix: the address is replaced with Trip
 * Preparation's, which asks for one, and nothing is requested from here.
 */
export function GearStudioScreen() {
  const { trailId: routeId = "", tripDate: routeDate = "" } = useParams()
  const [searchParams] = useSearchParams()
  const rec = searchParams.get("rec")

  if (!isIsoDate(routeDate) || routeDate < todayIso()) {
    return (
      <Navigate replace to={tripPreparationLocation(routeId, routeDate, rec)} />
    )
  }

  return <StudioShell routeId={routeId} tripDate={routeDate} rec={rec} />
}

type StudioShellProps = {
  routeId: string
  tripDate: string
  rec: string | null
}

function StudioShell({ routeId, tripDate, rec }: StudioShellProps) {
  const { statusRef, alertRef, announce, silence } = useTripAnnouncer()

  return (
    <TripShell
      className="studio"
      backdrop={<div className="studio-backdrop" aria-hidden="true" />}
      announcer={<TripAnnouncer statusRef={statusRef} alertRef={alertRef} />}
    >
      {/* Another trip is another visit: nothing of one is shown for another. */}
      <Studio
        key={`${routeId.toLowerCase()}/${tripDate}`}
        routeId={routeId}
        tripDate={tripDate}
        rec={rec}
        announce={announce}
        silence={silence}
      />
    </TripShell>
  )
}

type StudioProps = StudioShellProps & {
  announce: Announce
  silence: () => void
}

/** Which failure Retry is working on. */
type Retrying = "pack" | "gear" | null

/**
 * The Studio's composition: the trip block, the summary, the gear controls,
 * and the Stage, which know nothing of each other's internals. Server state
 * comes from three queries; the Equipped state from the loadout store.
 */
function Studio({ routeId, tripDate, rec, announce, silence }: StudioProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()
  const wide = useMediaQuery(WIDE_QUERY)

  // A signed-in visit after a session ended in this document reopens the
  // loadout; otherwise this does nothing.
  useEffect(() => {
    if (authStatus === "authenticated") {
      openLoadoutSession()
    }
  }, [authStatus])

  // Anything that cannot be a trail id is "not found", with no request.
  const trailId = isTrailId(routeId) ? routeId : null

  const trailQuery = useTrailDetail(trailId)
  const packQuery = usePackRecommendation(trailId, tripDate)
  const gearQuery = useGearItems(trailId !== null)
  const addGearMutation = useAddGearItem()

  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const focusGroupNext = useRef(false)

  const [retrying, setRetrying] = useState<Retrying>(null)
  /**
   * After Add gear the pack and the gear list are requested again. If that
   * refresh fails, what is on screen stays and nothing is shown (S22).
   */
  const [refreshedAfterAdd, setRefreshedAfterAdd] = useState(false)
  /** The item each category names when it is not equipped (section 12). */
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [viewerStatus, setViewerStatus] = useState<AvatarViewerStatus | null>(
    null,
  )

  /* ---------------------------------------------------------------- *
   * Server state and the screen state (16.13)
   * ---------------------------------------------------------------- */

  const trailFailure = trailQuery.isError
    ? trailFailureKindOf(trailQuery.error)
    : null
  const notFound = trailId === null || trailFailure === "not-found"
  const trail: TrailDetail | null = trailQuery.data ?? null

  const packFailure = packQuery.isError ? packFailureKindOf(packQuery.error) : null
  const pack: PackRecommendation | null =
    packQuery.data !== undefined && (!packQuery.isError || refreshedAfterAdd)
      ? packQuery.data
      : null

  const gearFailure = gearQuery.isError
    ? gearFailureKindOf(gearQuery.error)
    : null
  const gearItems: readonly GearItem[] | null =
    gearQuery.data !== undefined && (!gearQuery.isError || refreshedAfterAdd)
      ? gearQuery.data
      : null

  // S6: the server refused the date. Trip Preparation shows it as unusable.
  useEffect(() => {
    // A trail known not to exist is "not found", whatever else answered.
    if (packFailure === "date-not-accepted" && !notFound) {
      void navigate(tripPreparationLocation(routeId, tripDate, rec), {
        replace: true,
      })
    }
  }, [navigate, notFound, packFailure, rec, routeId, tripDate])

  type ScreenState =
    | { kind: "not-found" }
    | { kind: "loading" }
    | { kind: "pack-failed"; timedOut: boolean }
    | { kind: "gear-failed" }
    | { kind: "ready"; pack: PackRecommendation; items: readonly GearItem[] }

  let screen: ScreenState
  if (notFound) {
    screen = { kind: "not-found" }
  } else if (
    pack === null &&
    packFailure !== null &&
    packFailure !== "no-session" &&
    packFailure !== "date-not-accepted" &&
    retrying !== "pack"
  ) {
    screen = { kind: "pack-failed", timedOut: packFailure === "timeout" }
  } else if (retrying === "pack" && pack === null) {
    screen = { kind: "pack-failed", timedOut: packFailure === "timeout" }
  } else if (pack === null) {
    screen = { kind: "loading" }
  } else if (
    gearItems === null &&
    (retrying === "gear" ||
      (gearFailure !== null && gearFailure !== "no-session"))
  ) {
    screen = { kind: "gear-failed" }
  } else if (gearItems === null) {
    screen = { kind: "loading" }
  } else {
    screen = { kind: "ready", pack, items: gearItems }
  }

  /* ---------------------------------------------------------------- *
   * The loadout, confirmed against the gear list (section 8.4)
   * ---------------------------------------------------------------- */

  const stored = useStoredTripLoadout(routeId, tripDate)
  const equipped: Equipped = useMemo(
    () =>
      gearItems === null ? NOTHING_EQUIPPED : reconcileLoadout(stored, gearItems),
    [gearItems, stored],
  )

  // The corrected loadout is written back, only from a list that has just
  // been confirmed by the server. A failed request leaves storage alone.
  const gearConfirmed =
    gearQuery.isSuccess && !gearQuery.isFetching && trailId !== null
  useEffect(() => {
    if (!gearConfirmed || gearItems === null) {
      return
    }
    if (Object.keys(equipped).length !== Object.keys(stored).length) {
      setTripLoadout(routeId, tripDate, equipped)
    }
  }, [equipped, gearConfirmed, gearItems, routeId, stored, tripDate])

  const model: StudioModel | null =
    screen.kind === "ready"
      ? buildStudioModel(screen.pack.requiredGear, screen.items, equipped, choices)
      : null

  // What the viewer receives: visual categories only. It compares them by
  // content, so a new array with the same set changes nothing there.
  const visuals = useMemo(() => equippedVisuals(equipped), [equipped])

  const presence: AvatarPresence = wide ? "mounted" : "none"
  const shownStatus = wide ? viewerStatus : null
  // FEATURE-012: the post-save clip's cue and its wait, from what is shown.
  const { readyCue, celebrate } = useReadyToGo(shownStatus)

  /* ---------------------------------------------------------------- *
   * Arrival, title, and announcements (18.3, 18.4)
   * ---------------------------------------------------------------- */

  const trailSettled = trailQuery.isSuccess || trailQuery.isError
  const trailName = trail?.name ?? (trailSettled ? (pack?.trailName ?? null) : null)

  const nameComing =
    trailName === null && (!trailSettled || screen.kind === "loading")

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useDocumentTitle(documentTitle(notFound, trailName))

  const slow = useElapsed(
    screen.kind === "loading",
    `${packQuery.errorUpdateCount}|${gearQuery.errorUpdateCount}`,
    SLOW_AFTER_MS,
  )

  const phase =
    retrying !== null
      ? "retrying"
      : screen.kind === "pack-failed"
        ? screen.timedOut
          ? "pack-timeout"
          : "pack-unavailable"
        : screen.kind
  const readiness = pack !== null ? wholePercent(pack.readinessPercentage) : null
  const readinessText =
    pack !== null
      ? readinessLine(pack.readinessPercentage, pack.requiredGear)
      : null
  const loadedAnnouncement =
    model !== null && pack !== null
      ? [
          studioContent.announcements.loaded,
          model.recommendedCount > 0
            ? studioContent.announcements.readiness(
                wholePercent(pack.readinessPercentage),
                readinessLine(pack.readinessPercentage, pack.requiredGear),
              )
            : null,
          countSentence(model),
        ]
          .filter((part) => part !== null)
          .join(" ")
      : ""

  const previousPhase = useRef<string | null>(null)
  const previousReadiness = useRef<number | null>(null)
  useEffect(() => {
    const before = previousPhase.current
    previousPhase.current = phase
    if (before === phase) {
      return
    }

    switch (phase) {
      case "loading":
        announce("status", studioContent.loading)
        break
      case "ready":
        if (before === "loading" || before === "retrying") {
          announce("status", loadedAnnouncement)
        } else {
          // On screen from the first paint: nothing to say.
          silence()
        }
        break
      case "pack-unavailable":
        announce("alert", packContent.failure.unavailable)
        break
      case "pack-timeout":
        announce("alert", packContent.failure.timeout)
        break
      case "gear-failed":
        announce("alert", studioContent.gearFailed)
        break
      case "not-found":
        if (before !== null) {
          announce("status", tripContent.notFoundAnnouncement)
        }
        break
      default:
        break
    }
  }, [announce, loadedAnnouncement, phase, silence])

  // A new readiness number after a refresh is said (18.4, S22).
  useEffect(() => {
    const before = previousReadiness.current
    previousReadiness.current = readiness
    if (
      phase === "ready" &&
      before !== null &&
      readiness !== null &&
      readinessText !== null &&
      before !== readiness
    ) {
      announce(
        "status",
        studioContent.announcements.readiness(readiness, readinessText),
      )
    }
  }, [announce, phase, readiness, readinessText])

  // After a Retry that worked, its button is gone: the first group's heading.
  useEffect(() => {
    if (focusGroupNext.current && screen.kind === "ready") {
      const heading = zoneRef.current?.querySelector<HTMLElement>("h2")
      if (heading != null) {
        focusGroupNext.current = false
        heading.focus()
      }
    }
  })

  /* ---------------------------------------------------------------- *
   * Retry (S4, S5, S7)
   * ---------------------------------------------------------------- */

  function retry() {
    const which: Retrying = screen.kind === "gear-failed" ? "gear" : "pack"
    setRetrying(which)

    const requests: Promise<{ isSuccess: boolean }>[] = []
    if (which === "pack") {
      requests.push(packQuery.refetch())
      // A gear list that failed as well is asked for again with it.
      if (gearQuery.isError) {
        requests.push(gearQuery.refetch())
      }
    } else {
      // Only the request that failed (AC-23).
      requests.push(gearQuery.refetch())
    }

    void Promise.all(requests).then((results) => {
      setRetrying(null)
      if (results.every((result) => result.isSuccess)) {
        focusGroupNext.current = true
      }
    })
  }

  /* ---------------------------------------------------------------- *
   * Equip, Unequip, Change, the shortcut, Add gear (16.8–16.10, 18.4)
   * ---------------------------------------------------------------- */

  const { announceAfterReport, announceNow, onViewerReport } =
    useAvatarAnnouncer(announce)

  const handleViewerStatus = useCallback(
    (status: AvatarViewerStatus) => {
      setViewerStatus(status)
      onViewerReport(status)
    },
    [onViewerReport],
  )

  const viewer = viewerStateOf(presence, shownStatus)

  function countAfter(next: Equipped): string {
    if (model === null) {
      return ""
    }
    const recommended = new Set(model.recommendedRows.map((row) => row.category))
    const equippedRecommended = model.recommendedRows.filter(
      (row) => next[row.category] !== undefined,
    ).length
    const equippedOther = Object.keys(next).filter(
      (category) => !recommended.has(category),
    ).length
    return countSentence({
      ...model,
      equippedRecommended,
      equippedOther,
    })
  }

  /** Other rows whose display changed: covered, or visible again. */
  function otherChanges(
    acted: StudioRow,
    before: AvatarViewerStatus | null,
    after: AvatarViewerStatus | null,
  ): string[] {
    if (model === null || before === null || after === null) {
      return []
    }
    const { announcements } = studioContent
    const changes: string[] = []
    for (const row of [...model.recommendedRows, ...model.otherRows]) {
      if (row === acted || row.visual === null || row.visual === acted.visual) {
        continue
      }
      const was = before.display[row.visual]
      const now = after.display[row.visual]
      if (now === "covered" && was !== "covered" && was !== undefined) {
        changes.push(announcements.nowCovered(row.label))
      } else if (was === "covered" && now === "shown") {
        changes.push(announcements.visibleAgain(row.label))
      }
    }
    return changes
  }

  function writeLoadout(next: Equipped) {
    if (trailId !== null) {
      setTripLoadout(trailId, tripDate, next)
    }
  }

  const actions: GearZoneActions = {
    equip(row) {
      const item = row.currentItem
      if (item === null) {
        return
      }
      const next = { ...equipped, [row.category]: item.id }
      writeLoadout(next)

      const { announcements } = studioContent
      const base = announcements.equipped(row.label, item.name)
      const count = countAfter(next)

      if (viewer === "none" || viewer === "unavailable" || viewer === "loading") {
        announceNow(`${base} ${count}`)
        return
      }
      if (row.visual === null) {
        announceNow(`${base} ${announcements.uiOnly} ${count}`)
        return
      }

      const visual = row.visual
      const since = shownStatus
      announceAfterReport(since, (report) => {
        let sentence: string | null
        switch (report?.display[visual]) {
          case "shown":
            sentence = announcements.onAvatar(visualNouns[visual])
            break
          case "covered":
            sentence = announcements.covered
            break
          case "not-shown":
            sentence = announcements.notShown
            break
          default:
            sentence = null
        }
        return [base, sentence, count, ...otherChanges(row, since, report)]
          .filter((part) => part !== null)
          .join(" ")
      })
    },

    unequip(row) {
      const item = row.equippedItem
      if (item === null) {
        return
      }
      const next: Record<string, string> = { ...equipped }
      delete next[row.category]
      writeLoadout(next)
      // The item named on line 2 stays the row's item.
      setChoices((current) => ({ ...current, [row.category]: item.id }))

      const { announcements } = studioContent
      const count = countAfter(next)
      const wasShown =
        row.visual !== null && shownStatus?.display[row.visual] === "shown"
      const base = wasShown
        ? `${announcements.unequipped(row.label)} ${announcements.removedFromAvatar}`
        : announcements.unequipped(row.label)

      if (
        row.visual === null ||
        (viewer !== "ready" && viewer !== "partial")
      ) {
        announceNow(`${base} ${count}`)
        return
      }

      const since = shownStatus
      announceAfterReport(since, (report) =>
        [base, count, ...otherChanges(row, since, report)].join(" "),
      )
    },

    chooseItem(row, itemId) {
      const item = row.items.find((entry) => entry.id === itemId)
      if (item === undefined) {
        return
      }
      const { announcements } = studioContent
      if (row.equippedItem !== null) {
        // One action, not an Unequip and an Equip. The avatar is unchanged.
        writeLoadout({ ...equipped, [row.category]: item.id })
        announceNow(announcements.itemChangedEquipped(row.label, item.name))
      } else {
        setChoices((current) => ({ ...current, [row.category]: item.id }))
        announceNow(announcements.itemChangedNotEquipped(row.label, item.name))
      }
    },

    equipRecommended() {
      if (model === null) {
        return
      }
      const next: Record<string, string> = { ...equipped }
      const labels: string[] = []
      for (const row of model.recommendedRows) {
        if (row.equippedItem === null && row.currentItem !== null) {
          next[row.category] = row.currentItem.id
          labels.push(row.label)
        }
      }
      if (labels.length === 0) {
        return
      }
      writeLoadout(next)
      announceNow(
        `${studioContent.announcements.shortcut(labels.length, labels.join(", "))} ${countAfter(next)}`,
      )
    },

    async addGear(name: string, category: GearCategory): Promise<AddGearResult> {
      try {
        const item = await addGearMutation.mutateAsync({ name, category })
        setRefreshedAfterAdd(true)
        void queryClient.invalidateQueries({
          queryKey: packRecommendationQueryKey(
            getAuthenticatedSubject(),
            routeId,
            tripDate,
          ),
        })
        // A new item becomes the current item of a category that is not
        // equipped. An equipped item stays equipped: nothing is equipped
        // or changed by adding gear (R7).
        if (item !== null && equipped[category] === undefined) {
          setChoices((current) => ({ ...current, [category]: item.id }))
        }
        announceNow(
          studioContent.announcements.added(
            item?.name ?? name,
            gearCategoryLabel(category),
          ),
        )
        return { ok: true }
      } catch (error) {
        return { ok: false, kind: gearFailureKindOf(error) }
      }
    },
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  const allRows = model === null ? [] : [...model.recommendedRows, ...model.otherRows]
  const stageText = loadoutText(allRows, presence, shownStatus)

  return (
    <div className="studio-page">
      <section
        className="studio-panel"
        aria-labelledby={headingId}
        data-view={notFound ? "not-found" : undefined}
      >
        {notFound ? null : (
          <div className="studio-strip">
            <Link
              to={tripPreparationLocation(routeId, tripDate, rec)}
              className="trip-control trip-link"
            >
              <ArrowLeft aria-hidden="true" strokeWidth={2} />
              {studioContent.backToPreparation}
            </Link>
          </div>
        )}

        <div className="studio-trip">
          <h1
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="studio-title trip-focus-target"
          >
            {notFound ? (
              tripContent.notFoundHeading
            ) : (
              <StudioHeading name={trailName} coming={nameComing} />
            )}
          </h1>

          {notFound ? (
            <>
              <p className="studio-state-text">{tripContent.notFoundBody}</p>
              <p className="studio-state-action">
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
            <TripLine tripDate={tripDate} trail={trail} />
          )}
        </div>

        {screen.kind === "ready" && model !== null ? (
          <PackSummary
            model={model}
            readinessPercentage={screen.pack.readinessPercentage}
            requiredGear={screen.pack.requiredGear}
          />
        ) : null}

        {notFound ? null : (
          <div
            ref={zoneRef}
            className="trip-control studio-zone"
            role="region"
            aria-label={studioContent.gearRegionName}
            tabIndex={wide ? 0 : undefined}
            data-waiting={screen.kind === "ready" ? undefined : ""}
          >
            {screen.kind === "loading" ? (
              <p className="studio-waiting">
                <span className="studio-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{slow ? tripContent.stillLoading : studioContent.loading}</span>
              </p>
            ) : null}

            {screen.kind === "pack-failed" || screen.kind === "gear-failed" ? (
              <>
                <p className="studio-failure">
                  <CircleAlert aria-hidden="true" strokeWidth={2} />
                  <span>
                    {screen.kind === "gear-failed"
                      ? studioContent.gearFailed
                      : screen.timedOut
                        ? packContent.failure.timeout
                        : packContent.failure.unavailable}
                  </span>
                </p>
                <p className="studio-failure-action">
                  <TripRetryButton
                    tone="panel"
                    working={retrying !== null}
                    onRetry={retry}
                  />
                </p>
              </>
            ) : null}

            {screen.kind === "ready" && model !== null && trailId !== null ? (
              <>
                <GearZone
                  model={model}
                  weatherUnavailable={screen.pack.weather === null}
                  presence={presence}
                  viewerStatus={shownStatus}
                  actions={actions}
                />
                {/* FEATURE-011 D16: the last part of the gear zone. */}
                <FinishPreparation
                  trailId={trailId}
                  tripDate={tripDate}
                  trailName={trail?.name ?? screen.pack.trailName}
                  announce={announce}
                  silence={silence}
                  celebrate={celebrate}
                  chooseDateTo={tripPreparationLocation(routeId, tripDate, rec)}
                  // D20; D-INV-2: the destination changes here only.
                  continueTo="/plans"
                />
              </>
            ) : null}
          </div>
        )}
      </section>

      {/* S2: backdrop only; the viewer is not started. */}
      {notFound ? null : (
        <StudioStage
          wide={wide}
          equipped={visuals}
          status={shownStatus}
          onStatusChange={handleViewerStatus}
          loadoutText={stageText}
          announce={announce}
          readyCue={readyCue}
        />
      )}
    </div>
  )
}

type StudioHeadingProps = {
  name: string | null
  /** The name is not known yet, and a request that may supply it is running. */
  coming: boolean
}

/**
 * "Gearing up for {trail name}" (GS2): two lines in one heading, read as one
 * phrase. A bar stands in for a name still on its way; with none, GS3.
 */
function StudioHeading({ name, coming }: StudioHeadingProps) {
  return (
    <>
      <span className="studio-title-lead">{studioContent.gearingUpFor}</span>{" "}
      {name === null && coming ? (
        <>
          <span className="studio-title-skeleton" aria-hidden="true" />
          <span className="sr-only">{studioContent.yourTrip}</span>
        </>
      ) : (
        // A text node: the backend's name, as returned.
        <span className="studio-title-name">{name ?? studioContent.yourTrip}</span>
      )}
    </>
  )
}

/**
 * GS4: the trip date, always, then the trail's facts in FEATURE-004's
 * formats. A missing fact is dropped with its separator. The date is text:
 * the Studio has no date control (16.6).
 */
function TripLine({
  tripDate,
  trail,
}: {
  tripDate: string
  trail: TrailDetail | null
}) {
  const facts =
    trail === null
      ? []
      : [
          difficultyLabel(trail.difficulty),
          formatDistance(trail.distanceKm),
          formatElevationGain(trail.elevationGainM),
          formatDuration(trail.estimatedDurationMin),
        ].filter((part): part is string => part !== null)

  return (
    <p className="studio-trip-line">
      <span className="sr-only">{studioContent.tripDatePrefix}</span>
      <span className="studio-trip-date">
        {formatTripDateShort(tripDate, todayIso())}
      </span>
      {facts.map((fact) => (
        <span key={fact}>
          {" · "}
          {fact}
        </span>
      ))}
    </p>
  )
}

/** DT4, and DT3 when the trail is not found. */
function documentTitle(notFound: boolean, trailName: string | null): string {
  if (notFound) {
    return tripContent.notFoundTitle
  }
  const { suffix, separator } = studioContent.title
  return trailName !== null ? `${trailName}${separator}${suffix}` : suffix
}
