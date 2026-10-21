import { useCallback, useEffect, useRef } from "react"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import type { AvatarViewerStatus } from "@/features/avatar"

/** How long an announcement waits for the viewer's report (section 18.4). */
const REPORT_WAIT_MS = 300

type Pending = {
  /** The status on screen when the action happened. */
  since: AvatarViewerStatus | null
  /** The announcement, given the report, or null when none arrived. */
  build: (report: AvatarViewerStatus | null) => string
  timer: number
}

/**
 * Equip and Unequip announcements that need the viewer's display status
 * (FEATURE-005 sections 16.4, 18.4). The announcement is composed when the
 * viewer's next report arrives or after 300ms, whichever is first; without a
 * report the avatar sentence is left out by `build`. The status is never
 * guessed here.
 *
 * A later action replaces an announcement still waiting: the announcer says
 * one event's message at a time.
 */
export function useAvatarAnnouncer(announce: Announce) {
  const pending = useRef<Pending | null>(null)

  const settle = useCallback(
    (report: AvatarViewerStatus | null) => {
      const waiting = pending.current
      if (waiting === null) {
        return
      }
      window.clearTimeout(waiting.timer)
      pending.current = null
      announce("status", waiting.build(report))
    },
    [announce],
  )

  /** Speaks once the viewer has reported on the change, or after 300ms. */
  const announceAfterReport = useCallback(
    (
      since: AvatarViewerStatus | null,
      build: (report: AvatarViewerStatus | null) => string,
    ) => {
      if (pending.current !== null) {
        window.clearTimeout(pending.current.timer)
      }
      pending.current = {
        since,
        build,
        timer: window.setTimeout(() => settle(null), REPORT_WAIT_MS),
      }
    },
    [settle],
  )

  /** Speaks now. Anything still waiting is dropped. */
  const announceNow = useCallback(
    (text: string) => {
      if (pending.current !== null) {
        window.clearTimeout(pending.current.timer)
        pending.current = null
      }
      announce("status", text)
    },
    [announce],
  )

  /** Every report the viewer makes. */
  const onViewerReport = useCallback(
    (status: AvatarViewerStatus) => {
      if (pending.current !== null && pending.current.since !== status) {
        settle(status)
      }
    },
    [settle],
  )

  useEffect(
    () => () => {
      if (pending.current !== null) {
        window.clearTimeout(pending.current.timer)
      }
    },
    [],
  )

  return { announceAfterReport, announceNow, onViewerReport }
}
