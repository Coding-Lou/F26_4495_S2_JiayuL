import { LoaderCircle, RotateCw } from "lucide-react"
import { myPlansContent } from "../myPlansContent"

type PlansRetryButtonProps = {
  /** The repeated request is in flight. */
  working: boolean
  onRetry: () => void
  /**
   * `regular`: the list and incomplete states (section 10.7). `quiet`: under
   * a failed trail lookup in an expanded entry, 36 tall (section 10.15).
   */
  size?: "regular" | "quiet"
}

/**
 * Try again (PL43). The trip shell's secondary button on paper, as
 * `TripRetryButton`, with My Plans' own words. While it works it is not
 * `disabled`: it keeps focus and its place in the tab order, says what it is
 * doing (PL44), and ignores activation.
 */
export function PlansRetryButton({
  working,
  onRetry,
  size = "regular",
}: PlansRetryButtonProps) {
  return (
    <button
      type="button"
      className="trip-control trip-button plans-retry"
      data-tone="paper"
      data-size={size}
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
      {working ? myPlansContent.tryingAgain : myPlansContent.tryAgain}
    </button>
  )
}
