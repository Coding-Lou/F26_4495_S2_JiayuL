import { useEffect, useId, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { CircleAlert, LoaderCircle } from "lucide-react"
import { Link, type To } from "react-router-dom"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import { formatTripDateShort, todayIso } from "@/features/planning/tripDate"
import { planFailureKindOf } from "../api/plans"
import { finishContent } from "../content"
import { useCreatePlan } from "../hooks/useCreatePlan"
import type { CreatePlanResult, PlanFailureKind } from "../types/plan"

type FinishPreparationProps = {
  /** The Studio route's validated trail id. */
  trailId: string
  /** The Studio route's `:tripDate` segment, the authoritative date (D17). */
  tripDate: string
  /** For the confirmation; null or blank falls back to the date alone. */
  trailName: string | null
  /** The Studio's announcer. */
  announce: Announce
  /** Empties the Studio's announcer (FEATURE-012 section 16, U7). */
  silence: () => void
  /**
   * FEATURE-012 D10: called once, only after the save was confirmed; the
   * completion waits for it (at most 6s). Without it, the completion
   * follows the save at once. Plain function type: `plans` imports nothing
   * of the avatar (FC section 10).
   */
  celebrate?: () => Promise<void>
  /** Trip Preparation for this trail and date, for `invalid-date`. */
  chooseDateTo: To
  /** Where Continue goes (D20; temporary, D-INV-2). */
  continueTo: To
}

/** A failure that is drawn: `no-session` never is. */
type ShownFailure = Exclude<PlanFailureKind, "no-session">

type Saved = CreatePlanResult["saved"]

/** FEATURE-012 section 15, exposed as `data-finish-phase`. */
type Phase =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "failed"; failure: ShownFailure }
  /** Saved; the Ready-to-Go clip may be playing. */
  | { kind: "celebrating"; saved: Saved }
  | { kind: "complete"; saved: Saved }

/** FEATURE-012 D11: a confirmed save always completes within this. */
const CEILING_MS = 6_000

/**
 * Finish preparation (FEATURE-011 sections 13.4, 14; FEATURE-012 sections
 * 11, 12, 16): the last part of the Studio's gear zone. Saves the Plan for
 * the Studio's trail and date; only after the server confirmed it, the
 * Ready-to-Go moment (`celebrate`) and then the completion (D-INV-1). Built
 * only from the Studio's own patterns and class names; it renders only
 * inside `.studio`, whose stylesheet carries them.
 */
export function FinishPreparation({
  trailId,
  tripDate,
  trailName,
  announce,
  silence,
  celebrate,
  chooseDateTo,
  continueTo,
}: FinishPreparationProps) {
  const { mutateAsync, isPending } = useCreatePlan()

  const headingId = useId()
  const alertId = useId()
  const savedBodyId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  const savedHeadingRef = useRef<HTMLHeadingElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)
  // Set synchronously on activation, so a double click or Enter followed by
  // a click sends one request (D19). After a confirmed save it stays set:
  // this Finish never saves again (FEATURE-012 D10).
  const savingRef = useRef(false)
  const timers = useRef({ ceiling: 0 })

  const [phase, setPhase] = useState<Phase>({ kind: "idle" })

  const failure = phase.kind === "failed" ? phase.failure : null
  const terminal = failure === "invalid-date" || failure === "trail-gone"

  // Completion: the heading takes focus once, but only from the Finish
  // section or from nowhere. Focus moved on to a gear control during the
  // clip stays there (FEATURE-012 section 16).
  const complete = phase.kind === "complete"
  useEffect(() => {
    if (!complete) {
      return
    }
    const active = document.activeElement
    const section = sectionRef.current
    if (
      active === null ||
      active === document.body ||
      (section !== null && section.contains(active))
    ) {
      savedHeadingRef.current?.focus()
    }
  }, [complete])

  useEffect(() => {
    const current = timers.current
    return () => window.clearTimeout(current.ceiling)
  }, [])

  // No retry is offered: the button is gone, so focus moves to the message.
  useEffect(() => {
    if (terminal) {
      alertRef.current?.focus()
    }
  }, [terminal])

  async function finish() {
    if (savingRef.current || isPending) {
      return
    }
    // The date may have passed while the Studio was open: nothing is sent.
    if (tripDate < todayIso()) {
      setPhase({ kind: "failed", failure: "invalid-date" })
      return
    }

    savingRef.current = true
    setPhase({ kind: "saving" })
    announce("status", finishContent.savingAnnouncement)

    let saved: Saved
    try {
      saved = (await mutateAsync({ trailId, tripDate })).saved
    } catch (error) {
      savingRef.current = false
      const kind = planFailureKindOf(error)
      // "Saving your plan." must not linger next to the failure (U7).
      silence()
      // FEATURE-002 ends the session and leaves the Studio: nothing is drawn.
      setPhase(
        kind === "no-session" ? { kind: "idle" } : { kind: "failed", failure: kind },
      )
      return
    }

    // The Plan is saved (201 or 200). Only from here, the Ready-to-Go
    // moment; its outcome never changes what is said about the Plan (D11).
    const ceiling = new Promise<void>((resolve) => {
      timers.current.ceiling = window.setTimeout(resolve, CEILING_MS)
    })
    // Committed at once, so "Plan saved" is on screen even when the clip is
    // skipped and the completion follows in the same moment (section 13).
    flushSync(() => setPhase({ kind: "celebrating", saved }))
    announce("status", finishContent.savedAnnouncement)

    let moment: Promise<unknown> = Promise.resolve()
    if (celebrate !== undefined) {
      try {
        moment = celebrate().catch(() => undefined)
      } catch {
        // A thrown celebrate() counts as settled.
      }
    }
    await Promise.race([moment, ceiling])
    window.clearTimeout(timers.current.ceiling)
    setPhase({ kind: "complete", saved })
  }

  if (phase.kind === "complete") {
    const date = formatTripDateShort(tripDate, todayIso())
    const name = trailName?.trim() ?? ""
    return (
      <section
        ref={sectionRef}
        className="studio-finish"
        aria-labelledby={headingId}
        data-finish-phase="complete"
      >
        <h2
          ref={savedHeadingRef}
          id={headingId}
          tabIndex={-1}
          aria-describedby={savedBodyId}
          className="studio-group-heading trip-focus-target"
        >
          {finishContent.savedHeading}
        </h2>
        <p id={savedBodyId} className="studio-group-description">
          {name !== ""
            ? finishContent.savedBody(phase.saved, name, date)
            : finishContent.savedBodyNoName(phase.saved, date)}
        </p>
        <div className="studio-form-actions">
          <Link to={continueTo} className="trip-control studio-primary">
            {finishContent.continue}
          </Link>
        </div>
      </section>
    )
  }

  const saving = phase.kind === "saving"
  const celebrating = phase.kind === "celebrating"
  const retryable = failure !== null && !terminal

  return (
    <section
      ref={sectionRef}
      className="studio-finish"
      aria-labelledby={headingId}
      data-finish-phase={phase.kind}
    >
      <h2 id={headingId} className="studio-group-heading">
        {finishContent.heading}
      </h2>
      <p className="studio-group-description">{finishContent.description}</p>

      {terminal ? null : (
        <div className="studio-form-actions">
          {/* One element across idle, saving, a retryable failure, and
              celebrating, so focus stays on it. */}
          <button
            type="button"
            className="trip-control studio-primary"
            aria-disabled={saving || celebrating ? true : undefined}
            aria-describedby={retryable ? alertId : undefined}
            onClick={() => void finish()}
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                strokeWidth={2}
                className="trip-spin"
              />
            ) : null}
            {saving
              ? finishContent.saving
              : celebrating
                ? finishContent.saved
                : retryable
                ? finishContent.tryAgain
                : finishContent.action}
          </button>
        </div>
      )}

      {/* Present from the start and empty until a failure, so the message
          is announced when it arrives. */}
      <p
        ref={alertRef}
        id={alertId}
        role="alert"
        tabIndex={-1}
        className="studio-form-alert"
      >
        {failure !== null ? (
          <>
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{failureText(failure)}</span>
          </>
        ) : null}
      </p>

      {/* After the message, so Tab from the focused message reaches it. */}
      {failure === "invalid-date" ? (
        <div className="studio-form-actions">
          <Link to={chooseDateTo} className="trip-control trip-link">
            {finishContent.chooseNewDate}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

function failureText(kind: ShownFailure): string {
  const { failure } = finishContent
  switch (kind) {
    case "unavailable":
      return failure.unavailable
    case "unconfirmed":
      return failure.unconfirmed
    case "invalid-date":
      return failure.invalidDate
    case "trail-gone":
      return failure.trailGone
    case "unexpected":
      return failure.unexpected
  }
}
