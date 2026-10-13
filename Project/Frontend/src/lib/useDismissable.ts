import { useEffect, useEffectEvent, type RefObject } from "react"

export type DismissReason = "escape" | "outside-press" | "focus-left"

type DismissableOptions = {
  /** Listeners exist only while this is true. */
  open: boolean
  /**
   * The elements that make up the surface, normally the surface itself and
   * the control that opens it. A press or focus inside any of them keeps it
   * open, so the control's own click can close it.
   */
  parts: RefObject<HTMLElement | null>[]
  onDismiss: (reason: DismissReason) => void
  /** Whether a pointer press outside the parts dismisses. Default true. */
  dismissOnOutsidePress?: boolean
}

/**
 * Dismissal for a small non-modal surface (a popover, a menu, an in-place
 * confirmation): Escape, a pointer press outside, or focus leaving it.
 *
 * Focus leaving is judged a moment after the fact, and not while a press that
 * began inside is still down: some browsers do not focus a button when it is
 * clicked, which would otherwise close the surface under the pointer.
 */
export function useDismissable({
  open,
  parts,
  onDismiss,
  dismissOnOutsidePress = true,
}: DismissableOptions) {
  const dismiss = useEffectEvent(onDismiss)
  const contains = useEffectEvent((node: unknown) => {
    return (
      node instanceof Node &&
      parts.some((part) => part.current?.contains(node) === true)
    )
  })

  useEffect(() => {
    if (!open) {
      return
    }

    let pressWithin = false
    let focusCheck: number | undefined
    let pressRelease: number | undefined

    const onPointerDown = (event: PointerEvent) => {
      if (contains(event.target)) {
        pressWithin = true
      } else if (dismissOnOutsidePress) {
        dismiss("outside-press")
      }
    }

    const onPointerEnd = () => {
      // After the click that follows the release has been delivered.
      window.clearTimeout(pressRelease)
      pressRelease = window.setTimeout(() => {
        pressWithin = false
      }, 0)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss("escape")
      }
    }

    const onFocusOut = (event: FocusEvent) => {
      if (!contains(event.target) || contains(event.relatedTarget)) {
        return
      }

      window.clearTimeout(focusCheck)
      focusCheck = window.setTimeout(() => {
        // The window losing focus is not the user leaving the surface.
        if (pressWithin || !document.hasFocus()) {
          return
        }
        if (!contains(document.activeElement)) {
          dismiss("focus-left")
        }
      }, 0)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointerup", onPointerEnd, true)
    document.addEventListener("pointercancel", onPointerEnd, true)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("focusout", onFocusOut)

    return () => {
      window.clearTimeout(focusCheck)
      window.clearTimeout(pressRelease)
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointerup", onPointerEnd, true)
      document.removeEventListener("pointercancel", onPointerEnd, true)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("focusout", onFocusOut)
    }
  }, [open, dismissOnOutsidePress])
}
