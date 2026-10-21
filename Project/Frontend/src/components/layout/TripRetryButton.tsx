import { LoaderCircle, RotateCcw } from "lucide-react"

const RETRY_CONTENT = {
  /** SH3 */
  retry: "Retry",
  /** SH4 */
  working: "Trying again…",
} as const

type TripRetryButtonProps = {
  /** The surface the button stands on (FEATURE-004 section 21.17). */
  tone: "paper" | "panel"
  /** The repeated request is in flight. */
  working: boolean
  onRetry: () => void
}

/**
 * Retry (FEATURE-004 sections 21.15, 21.17). While it works it is not
 * `disabled`: it keeps focus and its place in the tab order, says what it is
 * doing, and ignores activation.
 */
export function TripRetryButton({ tone, working, onRetry }: TripRetryButtonProps) {
  return (
    <button
      type="button"
      className="trip-control trip-button"
      data-tone={tone}
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
        <RotateCcw aria-hidden="true" strokeWidth={2} />
      )}
      {working ? RETRY_CONTENT.working : RETRY_CONTENT.retry}
    </button>
  )
}
