import { useEffect, useId, useRef } from "react"
import { memoriesContent } from "../content"

type LeaveDialogProps = {
  mode: "create" | "edit"
  /** Photos are still uploading: MM142 is added. */
  uploading: boolean
  onKeepEditing: () => void
  onLeave: () => void
}

/**
 * "Leave without saving?" (FEATURE-009 section 22.12, D22): a native modal
 * `<dialog>`, so focus is trapped. Keep editing, the safe and filled action,
 * has focus first; Escape keeps editing; a backdrop press does nothing. The
 * caller returns focus to what started the navigation.
 */
export function LeaveDialog({
  mode,
  uploading,
  onKeepEditing,
  onLeave,
}: LeaveDialogProps) {
  const { leave } = memoriesContent
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open) {
      dialog.showModal()
    }
    keepRef.current?.focus()
    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  // Close before handing back: React Router removes the dialog in a
  // transition, after the caller's focus request has already run, and a
  // still-modal dialog makes the rest of the page inert, so the opener could
  // not take focus and focus fell to the body when the dialog went.
  function keepEditing() {
    if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
    onKeepEditing()
  }

  return (
    <dialog
      ref={dialogRef}
      className="memory-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault()
        keepEditing()
      }}
    >
      <div className="memory-dialog-body">
        <h2 id={titleId} className="memory-dialog-title">
          {leave.title}
        </h2>
        <p id={bodyId} className="memory-dialog-text">
          {mode === "create" ? leave.bodyCreate : leave.bodyEdit}
          {uploading ? ` ${leave.uploading}` : null}
        </p>
        <div className="memory-dialog-actions">
          <button
            type="button"
            className="trip-control trip-button"
            onClick={onLeave}
          >
            {leave.leave}
          </button>
          <button
            ref={keepRef}
            type="button"
            className="trip-control memory-submit"
            onClick={keepEditing}
          >
            {leave.keepEditing}
          </button>
        </div>
      </div>
    </dialog>
  )
}
