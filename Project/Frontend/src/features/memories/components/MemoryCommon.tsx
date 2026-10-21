import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, LoaderCircle, RotateCw } from "lucide-react"
import { memoriesContent } from "../content"

/** The notice slot (section 22.3): no space while empty. */
export function NoticeSlot({ text }: { text: string | null }) {
  return (
    <div role="status" className="memory-notice">
      {text !== null ? (
        <p className="memory-notice-box">
          <CircleCheck aria-hidden="true" strokeWidth={2} />
          <span>{text}</span>
        </p>
      ) : null}
    </div>
  )
}

type InlineAlertProps = {
  text: string | null
  className?: string
}

/**
 * A request error: a 16px `ember` icon and `ink` text, `role="alert"`. It is
 * always in the document, so a new message is announced, and it takes no
 * space while empty.
 */
export function InlineAlert({ text, className }: InlineAlertProps) {
  return (
    <p role="alert" className={`memory-alert ${className ?? ""}`.trim()}>
      {text !== null ? (
        <>
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          <span>{text}</span>
        </>
      ) : null}
    </p>
  )
}

type TryAgainButtonProps = {
  working: boolean
  onRetry: () => void
  /** The label at rest; MM17 by default. */
  label?: string
  /** A smaller button, for the trail picker (section 22.9). */
  compact?: boolean
}

/** Try again (MM17), secondary on paper; working: MM25, keeps focus. */
export function TryAgainButton({
  working,
  onRetry,
  label,
  compact = false,
}: TryAgainButtonProps) {
  const { collection } = memoriesContent
  return (
    <button
      type="button"
      className="trip-control trip-button"
      data-compact={compact ? "" : undefined}
      aria-disabled={working ? true : undefined}
      onClick={() => {
        if (!working) {
          onRetry()
        }
      }}
    >
      {working ? (
        <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
      ) : (
        <RotateCw aria-hidden="true" strokeWidth={2} />
      )}
      {working ? collection.retrying : (label ?? collection.tryAgain)}
    </button>
  )
}

type WorkingLabelProps = {
  working: boolean
  workingText: string
  children: ReactNode
}

/** A button's content: a spinner and the working text while it works. */
export function WorkingLabel({ working, workingText, children }: WorkingLabelProps) {
  return working ? (
    <>
      <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
      {workingText}
    </>
  ) : (
    children
  )
}
