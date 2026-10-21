import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react"
import { BookOpen, NotebookPen } from "lucide-react"
import { Link } from "react-router-dom"
import {
  memoryDetailLocation,
  newMemoryLocation,
} from "@/features/trails/tripRoutes"
import type { PlanMemoryStatus } from "../model/planMemory"
import { myPlansContent } from "../myPlansContent"
import type { Plan } from "../types/plan"
import { PlansRetryButton } from "./PlansRetryButton"

/** Checking longer than this shows the placeholder and says PM3 (10.2). */
const SLOW_MS = 500
/** The region is emptied, then refilled, so a repeated string is heard. */
const REWRITE_MS = 50

type BridgeKind = PlanMemoryStatus["kind"]

type PlanMemoryBridgeProps = {
  plan: Plan
  status: PlanMemoryStatus
  /** The Plan's entry button: focus goes there if the bridge leaves (10.6). */
  entryRef: RefObject<HTMLButtonElement | null>
}

/**
 * The Memory bridge of a selected Plan (FEATURE-014 section 10): one line
 * and one secondary control under the Plan's context lines. Add memory opens
 * the Memory editor with the Plan's trail and date; View memory opens the
 * Memory already kept. While the user's Memories are not known nothing is
 * offered; when they cannot be read, the row says so with Try again.
 *
 * Nothing is rendered for `none`. The component stays mounted for it so
 * that focus can still be placed when the row goes away under Try again.
 */
export function PlanMemoryBridge({ plan, status, entryRef }: PlanMemoryBridgeProps) {
  const copy = myPlansContent.memory
  const kind = status.kind
  const retrying = status.kind === "unavailable" && status.retrying

  const regionRef = useRef<HTMLSpanElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const writeTimer = useRef<number | undefined>(undefined)
  /** The last text the region said in this mount (10.5). */
  const lastWritten = useRef<string | null>(null)
  /** PM3 was said in the current check: its outcome is said too. */
  const checkAnnounced = useRef(false)
  /** Try again was used: its outcome is always said. */
  const retryPending = useRef(false)
  /** Focus is on Try again (10.6). */
  const retryFocused = useRef(false)

  // The placeholder appears after 500 ms of checking. Any change of state
  // ends it, so a later check starts without it.
  const [slow, setSlow] = useState(false)
  const [slowKind, setSlowKind] = useState<BridgeKind>(kind)
  if (slowKind !== kind) {
    setSlowKind(kind)
    setSlow(false)
  }

  const write = useCallback((text: string) => {
    window.clearTimeout(writeTimer.current)
    const node = regionRef.current
    if (node === null) {
      return
    }
    node.textContent = ""
    writeTimer.current = window.setTimeout(() => {
      node.textContent = text
      lastWritten.current = text
    }, REWRITE_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(writeTimer.current), [])

  // The one presentation timer: no data, polling, or eligibility depends on it.
  useEffect(() => {
    if (kind !== "checking") {
      return
    }
    const timer = window.setTimeout(() => {
      checkAnnounced.current = true
      setSlow(true)
      write(myPlansContent.memory.checking)
    }, SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [kind, write])

  // Announcements on a change of outcome only (10.5).
  useEffect(() => {
    if (kind === "checking") {
      return
    }
    const afterCheck = checkAnnounced.current
    checkAnnounced.current = false

    if (kind === "none") {
      // The region leaves with the row; a new one starts empty.
      window.clearTimeout(writeTimer.current)
      lastWritten.current = null
      retryPending.current = false
      return
    }
    if (kind === "unavailable" && retrying) {
      retryPending.current = true
      return
    }

    const afterRetry = retryPending.current
    retryPending.current = false
    const text =
      kind === "add"
        ? myPlansContent.memory.canAdd
        : kind === "view"
          ? myPlansContent.memory.kept
          : myPlansContent.memory.unavailable
    if (afterRetry) {
      write(text)
    } else if (
      (afterCheck || kind === "unavailable") &&
      text !== lastWritten.current
    ) {
      write(text)
    }
  }, [kind, retrying, write])

  // Resolution never moves focus, except away from a Try again that has
  // just been replaced (10.6).
  useEffect(() => {
    if (kind === "unavailable" || kind === "checking" || !retryFocused.current) {
      return
    }
    retryFocused.current = false
    const active = document.activeElement
    if (active !== null && active !== document.body) {
      return
    }
    if (kind === "none") {
      entryRef.current?.focus()
    } else {
      linkRef.current?.focus()
    }
  }, [kind, entryRef])

  if (status.kind === "none") {
    return null
  }

  function trackFocus() {
    // In the unavailable row, Try again is the only thing that takes focus.
    retryFocused.current = kind === "unavailable"
  }

  function trackBlur(event: FocusEvent<HTMLDivElement>) {
    // A Try again that is removed while focused loses focus without the
    // user moving it: that is the case 10.6 handles, so it is kept.
    const target = event.target
    queueMicrotask(() => {
      if (target.isConnected) {
        retryFocused.current = false
      }
    })
  }

  return (
    <div
      className="plan-memory"
      data-state={status.kind}
      onFocus={trackFocus}
      onBlur={trackBlur}
    >
      {status.kind === "add" ? (
        <>
          <p className="plan-memory-line">{copy.ask}</p>
          <Link
            ref={linkRef}
            to={newMemoryLocation(plan.trailId.toLowerCase(), plan.tripDate)}
            className="trip-control trip-button plans-secondary plan-memory-link"
          >
            <NotebookPen aria-hidden="true" strokeWidth={2} />
            {copy.add}
          </Link>
        </>
      ) : status.kind === "view" ? (
        <>
          <p className="plan-memory-line">{copy.kept}</p>
          <Link
            ref={linkRef}
            to={memoryDetailLocation(status.memoryId)}
            className="trip-control trip-button plans-secondary plan-memory-link"
          >
            <BookOpen aria-hidden="true" strokeWidth={2} />
            {copy.view}
          </Link>
        </>
      ) : status.kind === "unavailable" ? (
        <>
          <p className="plan-memory-line">{copy.unavailable}</p>
          <PlansRetryButton
            size="quiet"
            working={status.retrying}
            onRetry={() => {
              retryPending.current = true
              status.retry()
            }}
          />
        </>
      ) : (
        <>
          <p className="sr-only">{copy.checking}</p>
          {slow ? (
            <>
              <span
                className="plans-bar plan-memory-line-bar"
                aria-hidden="true"
              />
              <span
                className="plans-bar plan-memory-control-bar"
                aria-hidden="true"
              />
            </>
          ) : null}
        </>
      )}
      <span ref={regionRef} role="status" className="sr-only" />
    </div>
  )
}
