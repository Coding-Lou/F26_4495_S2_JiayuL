import { useEffect, type RefObject } from "react"

/** Moves focus to the first control of a popover when it opens. */
export function useFocusOnOpen(popoverRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    popoverRef.current
      ?.querySelector<HTMLElement>("button, input")
      ?.focus({ preventScroll: true })
  }, [popoverRef])
}
