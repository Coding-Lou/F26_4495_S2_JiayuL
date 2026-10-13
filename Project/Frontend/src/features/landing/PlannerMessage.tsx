import { useEffect, useRef, useState } from "react"
import { CircleAlert, Info, type LucideIcon } from "lucide-react"
import {
  authBoundaryNoticeText,
  authBoundaryNoticeTone,
  useAuthBoundaryNotice,
} from "@/features/auth/authBoundary"
import { AuthGateActions } from "./AuthGateActions"
import { landingContent } from "./content"
import type { PlannerPromptError } from "./usePlannerPrompt"

/** How long a live region stays empty before a repeated message returns. */
const REANNOUNCE_GAP_MS = 100

type Announcement = {
  text: string
  /** Changes with every activation, including one that repeats the text. */
  sequence: number
}

type PlannerMessageProps = {
  /** Referenced by the input's `aria-describedby`. */
  id: string
  error: PlannerPromptError | null
  /** Length of the trimmed prompt, shown by the over-limit counter. */
  length: number
  /** Number of refused submits so far. */
  refusals: number
}

/**
 * The planner's message slot (FEATURE-001 §11.11, FEATURE-002 §21.2).
 *
 * The text block holds an alert region for validation errors, the over-limit
 * counter, and a status region for authentication notices. All three exist
 * from the first render, empty, so that text placed in them later is
 * announced. It is this block that describes the input.
 *
 * A notice that offers Sign in and Create account is the authentication gate:
 * its two actions sit beside the text from 768px and under it below that. They
 * are outside the text block, so they are neither announced with the notice
 * nor read as part of the field's description.
 */
export function PlannerMessage({
  id,
  error,
  length,
  refusals,
}: PlannerMessageProps) {
  const notice = useAuthBoundaryNotice()
  const gateRef = useRef<HTMLDivElement>(null)

  const validation: Announcement | null =
    error === null
      ? null
      : {
          text:
            error === "empty"
              ? landingContent.validation.empty
              : landingContent.validation.overLimit,
          sequence: refusals,
        }

  const authNotice: Announcement | null =
    notice === null
      ? null
      : { text: authBoundaryNoticeText(notice), sequence: notice.id }

  const noticeIcon =
    notice !== null && authBoundaryNoticeTone(notice) === "alert"
      ? CircleAlert
      : Info

  const active = validation !== null || authNotice !== null
  const hasActions = notice !== null && notice.actions

  // When the gate appears partly outside the viewport, the page scrolls the
  // shortest distance that brings all of it into view, at once and one time.
  useEffect(() => {
    if (hasActions) {
      gateRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      })
    }
  }, [hasActions])

  return (
    <div
      className="landing-message-slot"
      data-active={active ? "" : undefined}
    >
      <div
        ref={gateRef}
        className="landing-gate"
        data-actions={hasActions ? "" : undefined}
      >
        <div id={id} className="landing-message-block">
          <LiveRegion
            role="alert"
            icon={CircleAlert}
            announcement={validation}
          />
          {error === "over-limit" ? (
            <p className="landing-message-counter">
              {landingContent.validation.counter(length)}
            </p>
          ) : null}
          <LiveRegion
            role="status"
            icon={noticeIcon}
            announcement={authNotice}
          />
        </div>

        {hasActions ? <AuthGateActions /> : null}
      </div>
    </div>
  )
}

type LiveRegionProps = {
  role: "alert" | "status"
  icon: LucideIcon
  announcement: Announcement | null
}

/**
 * One live region. A live region whose text has not changed says nothing, so
 * when an activation repeats the text already shown, the region is emptied
 * for a moment and the text put back. Meanwhile an identical copy, hidden from
 * assistive technology, keeps the layout still.
 */
function LiveRegion({ role, icon: Icon, announcement }: LiveRegionProps) {
  const reannouncing = useRepeatGap(announcement)

  const line = (held: boolean) =>
    announcement === null ? null : (
      <p
        className="landing-message-line"
        data-held={held ? "" : undefined}
        aria-hidden={held ? true : undefined}
      >
        <Icon aria-hidden="true" strokeWidth={2} />
        <span>{announcement.text}</span>
      </p>
    )

  return (
    <>
      <div role={role} aria-atomic={role === "status" ? true : undefined}>
        {reannouncing ? null : line(false)}
      </div>
      {reannouncing ? line(true) : null}
    </>
  )
}

/**
 * True for a short gap after the same text is announced again under a new
 * sequence number. New or changed text is never delayed.
 */
function useRepeatGap(announcement: Announcement | null): boolean {
  const text = announcement?.text ?? null
  const sequence = announcement?.sequence ?? null

  const [seen, setSeen] = useState({ text, sequence })
  const [gapFor, setGapFor] = useState<number | null>(null)

  if (seen.text !== text || seen.sequence !== sequence) {
    const repeated = text !== null && seen.text === text
    setSeen({ text, sequence })
    setGapFor(repeated ? sequence : null)
  }

  useEffect(() => {
    if (gapFor === null) {
      return
    }

    const timer = window.setTimeout(() => setGapFor(null), REANNOUNCE_GAP_MS)
    return () => window.clearTimeout(timer)
  }, [gapFor])

  return gapFor !== null && gapFor === sequence
}
