import { useEffect, useRef, type PropsWithChildren } from "react"

type GearDetailPanelProps = PropsWithChildren<{
  id: string
  headingId: string
}>

/**
 * From 1024px: the item detail as a non-modal panel in layout flow beside
 * the grid (FEATURE-007 section 21.8). Nothing is trapped; Escape is handled
 * by the collection row that holds the grid and the panel.
 */
export function GearDetailPanel({ id, headingId, children }: GearDetailPanelProps) {
  return (
    <section id={id} className="gear-panel" aria-labelledby={headingId}>
      {children}
    </section>
  )
}

type GearDetailSheetProps = PropsWithChildren<{
  id: string
  headingId: string
  /** While a removal is in flight the sheet stays open. */
  blocked: boolean
  onRequestClose: () => void
}>

/**
 * Below 1024px: the same content as a modal bottom sheet, a native
 * `<dialog>` (section 21.9). It traps focus; Escape, Close, and a press on
 * the backdrop close it, because it is a viewer and nothing is lost.
 */
export function GearDetailSheet({
  id,
  headingId,
  blocked,
  onRequestClose,
  children,
}: GearDetailSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // A press that starts on the backdrop and ends there, not a drag that
  // ends there.
  const pressOnBackdrop = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className="gear-detail-sheet"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault()
        if (!blocked) {
          onRequestClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          if (!blocked) {
            onRequestClose()
          }
        }
      }}
      onPointerDown={(event) => {
        pressOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          pressOnBackdrop.current &&
          !blocked
        ) {
          onRequestClose()
        }
      }}
    >
      <div className="gear-detail-sheet-body">{children}</div>
    </dialog>
  )
}
