import { useEffect, useRef, useState } from "react"
import { getPlannerState, usePlanner } from "../state/plannerStore"

/**
 * What the planner says to assistive technology (FEATURE-003 section 19.2).
 *
 * The history is not a live region: it would read whole cards, and read them
 * again on restore. This visually hidden pair receives one short string per
 * event instead. A region is emptied and then refilled, so a repeated string
 * is still spoken. Nothing is announced on load or on restore.
 */
export function PlannerAnnouncer() {
  const announcement = usePlanner((planner) => planner.ui.announcement)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)
  // Whatever was last said before this was shown is not said again.
  const [shownAt] = useState(() => getPlannerState().ui.announcement?.seq ?? null)

  useEffect(() => {
    if (announcement === null || announcement.seq === shownAt) {
      return
    }

    const region =
      announcement.region === "alert" ? alertRef.current : statusRef.current
    if (region === null) {
      return
    }

    region.textContent = ""
    const timer = window.setTimeout(() => {
      region.textContent = announcement.text
    }, 50)
    return () => window.clearTimeout(timer)
  }, [announcement, shownAt])

  return (
    <div className="sr-only">
      <p ref={statusRef} role="status" />
      <p ref={alertRef} role="alert" />
    </div>
  )
}
