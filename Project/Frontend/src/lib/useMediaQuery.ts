import { useCallback, useSyncExternalStore } from "react"

/**
 * Whether a CSS media query matches now. The value is correct on the first
 * render and follows the query as the viewport or a user preference changes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
