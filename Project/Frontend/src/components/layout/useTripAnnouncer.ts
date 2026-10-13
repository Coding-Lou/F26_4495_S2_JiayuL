import { useCallback, useRef, type RefObject } from "react"

export type Announce = (region: "status" | "alert", text: string) => void

type TripAnnouncerHandle = {
  /** For the `TripAnnouncer` the screen renders. */
  statusRef: RefObject<HTMLParagraphElement | null>
  alertRef: RefObject<HTMLParagraphElement | null>
  announce: Announce
  /** For an event that has nothing to say here: it still ends the last one. */
  silence: () => void
}

/**
 * The regions of a `TripAnnouncer` and the functions that speak through them
 * (FEATURE-004 section 23.3). The announcer is emptied for each event, both
 * regions, and a message still waiting to be written is dropped: an event
 * leaves only its own message, or none. The region is refilled a moment
 * after it is emptied, so a repeated string is spoken again.
 */
export function useTripAnnouncer(): TripAnnouncerHandle {
  const statusRef = useRef<HTMLParagraphElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)
  // A pending announcement is not cancelled when the screen goes: it only
  // writes to a region that is no longer in the document.
  const timers = useRef<{ status?: number; alert?: number }>({})

  const silence = useCallback(() => {
    window.clearTimeout(timers.current.status)
    window.clearTimeout(timers.current.alert)
    for (const node of [statusRef.current, alertRef.current]) {
      if (node !== null) {
        node.textContent = ""
      }
    }
  }, [])

  const announce = useCallback<Announce>(
    (region, text) => {
      silence()

      const node = (region === "alert" ? alertRef : statusRef).current
      if (node === null) {
        return
      }

      timers.current[region] = window.setTimeout(() => {
        node.textContent = text
      }, 50)
    },
    [silence],
  )

  return { statusRef, alertRef, announce, silence }
}
