import { useSyncExternalStore } from "react"
import { todayIso } from "@/features/planning/tripDate"

function subscribeToVisibility(notify: () => void) {
  const onChange = () => {
    if (document.visibilityState === "visible") {
      notify()
    }
  }
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

/**
 * The viewer's local today, `YYYY-MM-DD` (FEATURE-013 D6, D22). Read on
 * every render and again when the page becomes visible, so a page left open
 * across midnight reclassifies its Plans on return. No timer.
 */
export function useTodayIso(): string {
  return useSyncExternalStore(subscribeToVisibility, todayIso, todayIso)
}
