import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { TripShell } from "@/components/layout/TripShell"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { memoryFailureKindOf } from "@/features/memories/api/memories"
import { useOwnerMemoryIndex } from "@/features/memories/hooks/memoryQueries"
import { formatTripDateLong } from "@/features/planning/tripDate"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { PlanListIncompleteError, planFailureKindOf } from "../api/plans"
import { useDeletePlan } from "../hooks/useDeletePlan"
import { planTrailKey, usePlanTrails } from "../hooks/usePlanTrails"
import { usePlans } from "../hooks/usePlans"
import { useTodayIso } from "../hooks/useTodayIso"
import {
  addMonths,
  monthOfIso,
  type CalendarMonth,
} from "../model/calendarMonth"
import {
  findPlan,
  initialMonth,
  plansByDate,
  sectionOf,
  splitPlans,
  type PlanSectionName,
} from "../model/planCollection"
import {
  buildPlanMemoryIndex,
  mayHaveMemoryBridge,
  type PlanMemoryIndex,
  type PlanMemoryIndexState,
} from "../model/planMemory"
import { planTrailName } from "../model/planText"
import { myPlansContent } from "../myPlansContent"
import type { Plan } from "../types/plan"
import { PlanCalendar } from "./PlanCalendar"
import type { PlanEntryContext } from "./PlanEntry"
import { PlanEntryList, PlanSection } from "./PlanSection"
import {
  PlansEmpty,
  PlansFailure,
  PlansLoading,
  PlansNoUpcoming,
} from "./PlansStates"
import "../my-plans.css"

/** The selected Plan in the address (D17). Never sent to a server. */
const PLAN_PARAM = "plan"

const NO_PLANS: readonly Plan[] = []

type Phase = "loading" | "failed" | "incomplete" | "empty" | "ready"

/** What happens once the screen has rendered a change (sections 10.10, 20). */
type FocusRequest =
  /** A day was activated: show its Plan without moving focus (D15). */
  | { kind: "reveal-entry"; id: string }
  /** A day with several Plans was activated: show the filter row. */
  | { kind: "reveal-filter" }
  /** The delete confirmation was cancelled. */
  | { kind: "delete-button"; id: string }
  /** Show all plans removed itself. */
  | { kind: "first-heading" }
  /** A Plan was deleted (D18). */
  | {
      kind: "after-delete"
      candidates: readonly string[]
      otherSection: PlanSectionName | null
    }

/**
 * My Plans, `/plans` (FEATURE-013): the signed-in user's saved Plans as one
 * itinerary on a `paper` sheet in the trip shell, Upcoming then Past, with a
 * monthly calendar of the same Plans beside it.
 *
 * Server state is the Plan list, the trails' detail queries, and, for the
 * Memory bridge of Past Plans (FEATURE-014), one complete read of the user's
 * Memories. The selected
 * Plan is the `plan` search parameter; the shown month, the day filter, and
 * the delete confirmation are this screen's React state and nothing else.
 */
export function MyPlansScreen() {
  useDocumentTitle(myPlansContent.documentTitle)
  const { statusRef, alertRef, announce } = useTripAnnouncer()

  return (
    <TripShell
      className="my-plans"
      announcer={<TripAnnouncer statusRef={statusRef} alertRef={alertRef} />}
    >
      <MyPlansView announce={announce} />
    </TripShell>
  )
}

function MyPlansView({ announce }: { announce: Announce }) {
  const plansQuery = usePlans()
  const deletePlan = useDeletePlan()
  const today = useTodayIso()
  const [searchParams, setSearchParams] = useSearchParams()
  const planParam = searchParams.get(PLAN_PARAM)

  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const stateHeadingRef = useRef<HTMLHeadingElement>(null)

  const [shownMonth, setShownMonth] = useState<CalendarMonth | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  const failure = plansQuery.isError ? plansQuery.error : null
  const phase: Phase =
    failure !== null && planFailureKindOf(failure) !== "no-session"
      ? failure instanceof PlanListIncompleteError
        ? "incomplete"
        : "failed"
      : plansQuery.data !== undefined && failure === null
        ? plansQuery.data.length === 0
          ? "empty"
          : "ready"
        : "loading"

  const plans = phase === "ready" ? (plansQuery.data ?? NO_PLANS) : NO_PLANS
  const trails = usePlanTrails(plans)
  const { upcoming, past } = splitPlans(plans, today)
  const byDate = plansByDate(plans)
  const selectedPlan = findPlan(plans, planParam)

  // FEATURE-014 section 8: one read of the user's Memories, only while a
  // Past Plan may still need the bridge. It does not wait for the trails.
  const memoriesWanted =
    phase === "ready" &&
    past.some((plan) => mayHaveMemoryBridge(trails.get(planTrailKey(plan.trailId))))
  const memoriesQuery = useOwnerMemoryIndex(memoriesWanted)
  const [memoriesRetrying, setMemoriesRetrying] = useState(false)
  const memoriesData = memoriesQuery.data
  const memoryIndex = useMemo(
    () => (memoriesData !== undefined ? buildPlanMemoryIndex(memoriesData) : null),
    [memoriesData],
  )
  const refetchMemories = memoriesQuery.refetch
  const retryMemories = useCallback(() => {
    // Try again repeats this read only: not the Plans, not the trails.
    setMemoriesRetrying(true)
    void refetchMemories().finally(() => setMemoriesRetrying(false))
  }, [refetchMemories])
  const memories = memoryIndexState(
    memoriesWanted,
    memoriesQuery,
    memoriesRetrying,
    memoryIndex,
    retryMemories,
  )

  // The day filter exists only while its day holds two Plans or more
  // (section 10.5). A day left with fewer after a delete clears it.
  const filterPlans =
    filterDate !== null ? (byDate.get(filterDate) ?? NO_PLANS) : NO_PLANS
  if (
    filterDate !== null &&
    (phase === "ready" || phase === "empty") &&
    filterPlans.length < 2
  ) {
    setFilterDate(null)
  }
  const activeFilter =
    filterDate !== null && filterPlans.length >= 2 ? filterDate : null
  const selectedDate = activeFilter ?? selectedPlan?.tripDate ?? null

  // Until the user moves the calendar or picks a Plan, the month follows
  // D12 from what is loaded.
  const month = shownMonth ?? initialMonth(selectedPlan, upcoming, today)

  const deletingId = deletePlan.isPending
    ? (deletePlan.variables ?? null)
    : null

  const writePlanParam = useCallback(
    (planId: string | null) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (planId === null) {
            next.delete(PLAN_PARAM)
          } else {
            next.set(PLAN_PARAM, planId)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // An unknown `plan` is dropped only once a fresh read has succeeded
  // without it: never while loading, refetching, or failed (D17).
  const settled = plansQuery.isSuccess && !plansQuery.isFetching
  const selectionMissing = planParam !== null && selectedPlan === null
  useEffect(() => {
    if (settled && selectionMissing) {
      writePlanParam(null)
    }
  }, [settled, selectionMissing, writePlanParam])

  // The failure heading takes focus only when it replaces content that was
  // on screen, never on first load; content replacing it gives focus back
  // to the title if it was lost with Try again (section 20).
  const previousPhase = useRef(phase)
  useEffect(() => {
    const previous = previousPhase.current
    previousPhase.current = phase
    if (previous === phase) {
      return
    }
    const failedNow = phase === "failed" || phase === "incomplete"
    const failedBefore = previous === "failed" || previous === "incomplete"
    if (failedNow && previous !== "loading") {
      stateHeadingRef.current?.focus()
    } else if (!failedNow && failedBefore) {
      const active = document.activeElement
      if (active === null || active === document.body) {
        titleRef.current?.focus()
      }
    }
  }, [phase])

  useEffect(() => {
    if (focusRequest === null) {
      return
    }
    const root = rootRef.current
    if (root === null) {
      return
    }
    const entry = (id: string) =>
      root.querySelector<HTMLElement>(`[data-plan-entry="${CSS.escape(id)}"]`)
    const heading = (name: PlanSectionName) =>
      root.querySelector<HTMLElement>(`[data-plans-heading="${name}"]`)
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "instant"
      : "smooth"

    switch (focusRequest.kind) {
      case "reveal-entry":
        entry(focusRequest.id)
          ?.closest("li")
          ?.scrollIntoView({ block: "nearest", behavior })
        break
      case "reveal-filter":
        root
          .querySelector<HTMLElement>("[data-plans-filter]")
          ?.scrollIntoView({ block: "nearest", behavior })
        break
      case "delete-button":
        root
          .querySelector<HTMLElement>(
            `[data-plan-delete="${CSS.escape(focusRequest.id)}"]`,
          )
          ?.focus()
        break
      case "first-heading":
        heading("upcoming")?.focus()
        break
      case "after-delete": {
        for (const id of focusRequest.candidates) {
          const next = entry(id)
          if (next !== null) {
            next.focus()
            return
          }
        }
        const other =
          focusRequest.otherSection !== null
            ? heading(focusRequest.otherSection)
            : null
        const target =
          other ??
          stateHeadingRef.current ??
          heading("upcoming") ??
          titleRef.current
        target?.focus()
        break
      }
    }
  }, [focusRequest])

  function resetConfirmation() {
    setConfirmingId(null)
    setDeleteFailedId(null)
  }

  /** A failed (not gone) trail lookup is tried again on selection (O8). */
  function retryTrailOf(plan: Plan) {
    const trail = trails.get(planTrailKey(plan.trailId))
    if (trail?.status === "failed" && !trail.retrying) {
      trail.retry()
    }
  }

  function toggleEntry(plan: Plan) {
    // While a delete is in flight, the selection does not change (10.8).
    if (deletingId !== null) {
      return
    }
    resetConfirmation()
    if (selectedPlan?.id === plan.id) {
      writePlanParam(null)
      return
    }
    writePlanParam(plan.id)
    setShownMonth(monthOfIso(plan.tripDate))
    retryTrailOf(plan)
  }

  function activateDay(date: string) {
    if (deletingId !== null) {
      return
    }
    const onDay = byDate.get(date) ?? NO_PLANS
    if (onDay.length === 0) {
      return
    }
    resetConfirmation()
    setShownMonth(monthOfIso(date))
    const longDate = formatTripDateLong(date, today)

    if (onDay.length === 1) {
      const plan = onDay[0]
      setFilterDate(null)
      writePlanParam(plan.id)
      retryTrailOf(plan)
      setFocusRequest({ kind: "reveal-entry", id: plan.id })
      const trail = trails.get(planTrailKey(plan.trailId))
      announce(
        "status",
        myPlansContent.filter.announceOne(
          trail !== undefined ? planTrailName(trail) : myPlansContent.trail.loading,
          longDate,
        ),
      )
      return
    }

    setFilterDate(date)
    writePlanParam(null)
    setFocusRequest({ kind: "reveal-filter" })
    announce("status", myPlansContent.filter.announce(onDay.length, longDate))
  }

  function showAllPlans() {
    if (deletingId !== null) {
      return
    }
    resetConfirmation()
    setFilterDate(null)
    writePlanParam(null)
    announce("status", myPlansContent.filter.announceAll)
    setFocusRequest({ kind: "first-heading" })
  }

  function confirmDelete(plan: Plan, listIds: readonly string[]) {
    if (deletingId !== null) {
      return
    }
    setDeleteFailedId(null)

    // Focus after the delete (D18): the next entry of the same list, else
    // the previous, else the other section's heading, else the empty state.
    const index = listIds.indexOf(plan.id)
    const candidates = [
      ...listIds.slice(index + 1),
      ...listIds.slice(0, Math.max(index, 0)).reverse(),
    ]
    const otherSection: PlanSectionName | null =
      activeFilter !== null
        ? null
        : sectionOf(plan, today) === "upcoming"
          ? "past"
          : "upcoming"

    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        setConfirmingId(null)
        writePlanParam(null)
        announce("status", myPlansContent.remove.done)
        setFocusRequest({ kind: "after-delete", candidates, otherSection })
      },
      onError: () => {
        setDeleteFailedId(plan.id)
      },
    })
  }

  const context: PlanEntryContext = {
    today,
    trails,
    memories,
    selectedId: selectedPlan?.id ?? null,
    confirmingId,
    deletingId,
    deleteFailedId,
    onToggle: toggleEntry,
    onAskDelete: (plan) => {
      setConfirmingId(plan.id)
      setDeleteFailedId(null)
    },
    onCancelDelete: () => {
      const id = confirmingId
      resetConfirmation()
      if (id !== null) {
        setFocusRequest({ kind: "delete-button", id })
      }
    },
    onConfirmDelete: confirmDelete,
  }

  return (
    <div ref={rootRef} className="plans-sheet">
      <div className="plans-title-block">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="trip-focus-target plans-title"
        >
          {myPlansContent.title}
        </h1>
        <p className="plans-support">{myPlansContent.support}</p>
      </div>

      {phase === "loading" ? (
        <PlansLoading />
      ) : phase === "failed" || phase === "incomplete" ? (
        <PlansFailure
          heading={
            phase === "incomplete"
              ? myPlansContent.incomplete
              : myPlansContent.failed
          }
          headingRef={stateHeadingRef}
          working={plansQuery.isFetching}
          onRetry={() => {
            void plansQuery.refetch()
          }}
        />
      ) : phase === "empty" ? (
        <PlansEmpty headingRef={stateHeadingRef} />
      ) : (
        <div className="plans-collection">
          <div className="plans-list">
            {activeFilter !== null ? (
              <>
                <div className="plans-filter" data-plans-filter>
                  <p className="plans-filter-line">
                    {myPlansContent.filter.line(
                      filterPlans.length,
                      formatTripDateLong(activeFilter, today),
                    )}
                  </p>
                  <button
                    type="button"
                    className="trip-control trip-button plans-secondary plans-show-all"
                    onClick={showAllPlans}
                  >
                    <X aria-hidden="true" strokeWidth={2} />
                    {myPlansContent.filter.showAll}
                  </button>
                </div>
                <PlanEntryList plans={filterPlans} context={context} />
              </>
            ) : (
              <>
                <PlanSection
                  name="upcoming"
                  plans={upcoming}
                  context={context}
                  empty={<PlansNoUpcoming />}
                />
                {past.length > 0 ? (
                  <PlanSection name="past" plans={past} context={context} />
                ) : null}
              </>
            )}
          </div>

          <PlanCalendar
            month={month}
            today={today}
            byDate={byDate}
            selectedDate={selectedDate}
            onPrevious={() => setShownMonth(addMonths(month, -1))}
            onNext={() => setShownMonth(addMonths(month, 1))}
            onDay={activateDay}
          />
        </div>
      )}
    </div>
  )
}

type MemoryIndexQuery = Pick<
  ReturnType<typeof useOwnerMemoryIndex>,
  "isError" | "error" | "isFetching"
>

/**
 * FEATURE-014 section 8, rules 4–8, for the screen as a whole. A failure is
 * unavailable even with older data kept beside it; any read in progress,
 * including the one every visit starts over cached data, is checking; a
 * read again after Try again keeps the unavailable row, working. Only a
 * settled, complete read is an index.
 *
 * The Try again case comes first: a query that never had data goes back to
 * `pending` and drops its error when it is read again, so `isError` cannot
 * be relied on while that read is in flight.
 */
function memoryIndexState(
  wanted: boolean,
  query: MemoryIndexQuery,
  retrying: boolean,
  index: PlanMemoryIndex | null,
  retry: () => void,
): PlanMemoryIndexState {
  if (!wanted) {
    return { kind: "checking" }
  }
  if (retrying && query.isFetching) {
    return { kind: "unavailable", retrying: true, retry }
  }
  if (query.isError && memoryFailureKindOf(query.error) !== "no-session") {
    return query.isFetching
      ? { kind: "checking" }
      : { kind: "unavailable", retrying: false, retry }
  }
  if (query.isError || query.isFetching || index === null) {
    return { kind: "checking" }
  }
  return { kind: "ready", index }
}
