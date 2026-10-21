import type { RefObject } from "react"
import { LoaderCircle, Plus, RotateCw } from "lucide-react"
import { myGearContent } from "../content"

type GearEmptyStateProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  onAdd: (opener: HTMLButtonElement) => void
}

/**
 * Empty (FEATURE-007 sections 18, 21.12): the list loaded and holds nothing.
 * Three empty slots, decorative, and Add your first item. No sample items.
 */
export function GearEmptyState({ headingRef, onAdd }: GearEmptyStateProps) {
  const { empty } = myGearContent

  return (
    <div className="gear-state">
      <div className="gear-empty-slots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="trip-focus-target gear-state-title"
      >
        {empty.title}
      </h2>
      <p className="gear-state-body">{empty.body}</p>
      <button
        type="button"
        className="trip-control gear-primary gear-state-action"
        onClick={(event) => onAdd(event.currentTarget)}
      >
        <Plus aria-hidden="true" strokeWidth={2} />
        {empty.action}
      </button>
    </div>
  )
}

type GearUnavailableStateProps = {
  /** The repeated request is in flight. */
  retrying: boolean
  onRetry: () => void
}

/**
 * Unavailable (sections 18, 21.12): the list could not be read. Never "no
 * gear", never zero, never the empty state.
 */
export function GearUnavailableState({
  retrying,
  onRetry,
}: GearUnavailableStateProps) {
  const { unavailable } = myGearContent

  return (
    <div className="gear-state">
      <h2 className="gear-state-title">{unavailable.title}</h2>
      <p className="gear-state-body">{unavailable.body}</p>
      <button
        type="button"
        className="trip-control trip-button gear-state-action"
        aria-disabled={retrying ? true : undefined}
        onClick={() => {
          if (!retrying) {
            onRetry()
          }
        }}
      >
        {retrying ? (
          <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
        ) : (
          <RotateCw aria-hidden="true" strokeWidth={2} />
        )}
        {retrying ? unavailable.retrying : unavailable.retry}
      </button>
    </div>
  )
}
