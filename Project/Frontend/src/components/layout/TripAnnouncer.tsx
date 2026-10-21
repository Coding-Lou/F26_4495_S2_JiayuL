import type { RefObject } from "react"

export type TripAnnouncerProps = {
  statusRef: RefObject<HTMLParagraphElement | null>
  alertRef: RefObject<HTMLParagraphElement | null>
}

/**
 * What a screen says to assistive technology beyond what is read in place
 * (FEATURE-004 section 23.3): one polite region and one assertive region,
 * visually hidden. They are filled by `useTripAnnouncer`, never by rendering,
 * so nothing is spoken for content that was on screen at first paint.
 */
export function TripAnnouncer({ statusRef, alertRef }: TripAnnouncerProps) {
  return (
    <div className="sr-only">
      <p ref={statusRef} role="status" />
      <p ref={alertRef} role="alert" />
    </div>
  )
}
