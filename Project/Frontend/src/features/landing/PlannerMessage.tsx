import { useEffect, useState } from "react"
import { CircleAlert, Info, type LucideIcon } from "lucide-react"
import {
  useAuthBoundaryNotice,
  type AuthBoundaryNotice,
} from "@/features/auth/authBoundary"
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
 * The planner's message slot (FEATURE-001 §11.11): an alert region for
 * validation errors, the over-limit counter, and a status region for
 * auth-boundary notices. All three exist from the first render, empty, so that
 * text placed in them later is announced.
 */
export function PlannerMessage({
  id,
  error,
  length,
  refusals,
}: PlannerMessageProps) {
  const notice = useAuthBoundaryNotice()

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
      : { text: noticeText(notice), sequence: notice.id }

  const active = validation !== null || authNotice !== null

  return (
    <div
      id={id}
      className="landing-message-slot"
      data-active={active ? "" : undefined}
    >
      <div className="landing-message-block">
        <LiveRegion role="alert" icon={CircleAlert} announcement={validation} />
        {error === "over-limit" ? (
          <p className="landing-message-counter">
            {landingContent.validation.counter(length)}
          </p>
        ) : null}
        <LiveRegion role="status" icon={Info} announcement={authNotice} />
      </div>
    </div>
  )
}

/** N1–N4, assembled from the reason and from what happened to the prompt. */
function noticeText(notice: AuthBoundaryNotice): string {
  const { signInToPlan, signInUnavailable, promptSaved, promptNotSaved } =
    landingContent.notice

  const lead =
    notice.reason === "start-planning" ? signInToPlan : signInUnavailable

  switch (notice.prompt) {
    case "saved":
      return `${lead} ${promptSaved}`
    case "not-saved":
      return `${lead} ${promptNotSaved}`
    case "none":
      return lead
  }
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
