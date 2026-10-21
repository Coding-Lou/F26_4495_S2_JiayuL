import { useEffect, useId, useRef, type KeyboardEvent } from "react"
import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react"
import { myPlansContent } from "../myPlansContent"

type DeletePlanConfirmationProps = {
  /** The delete request is in flight. */
  deleting: boolean
  /** The last attempt failed (PL24). */
  failed: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * The inline delete confirmation (FEATURE-013 D18, section 10.8; DS §36.9).
 * It replaces the detail's action row in place. Focus starts on Cancel, the
 * safe choice. Escape cancels, except while the request is in flight. A
 * failure keeps it open with an error line, and Delete tries again.
 */
export function DeletePlanConfirmation({
  deleting,
  failed,
  onCancel,
  onConfirm,
}: DeletePlanConfirmationProps) {
  const { remove } = myPlansContent
  const questionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (!deleting) {
      onCancel()
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      className="plans-confirm"
      onKeyDown={handleKeyDown}
    >
      <p id={questionId} className="plans-confirm-question">
        {remove.question}
      </p>
      <p className="plans-confirm-body">{remove.body}</p>

      <p role="alert" className="plans-alert">
        {failed ? (
          <>
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{remove.failed}</span>
          </>
        ) : null}
      </p>

      <div className="plans-confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          className="trip-control trip-button plans-secondary"
          aria-disabled={deleting ? true : undefined}
          onClick={() => {
            if (!deleting) {
              onCancel()
            }
          }}
        >
          {remove.cancel}
        </button>
        <button
          type="button"
          className="trip-control plans-danger"
          aria-disabled={deleting ? true : undefined}
          onClick={() => {
            if (!deleting) {
              onConfirm()
            }
          }}
        >
          {deleting ? (
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="trip-spin"
            />
          ) : (
            <Trash2 aria-hidden="true" strokeWidth={2} />
          )}
          {deleting ? remove.working : remove.confirm}
        </button>
      </div>
    </div>
  )
}
