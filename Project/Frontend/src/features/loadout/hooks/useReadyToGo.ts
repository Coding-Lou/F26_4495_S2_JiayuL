import { useCallback, useEffect, useRef, useState } from "react"
import type { AvatarViewerStatus } from "@/features/avatar"

/** FEATURE-012 D11: the clip must report playing within this of the cue. */
const START_GRACE_MS = 1_000
/** FEATURE-012 D13: wall clock from the cue; the clip is 4.0s. */
const SAFETY_MS = 5_000

type Waiting = {
  resolve: () => void
  /** The viewer has reported the clip playing for this cue. */
  started: boolean
  grace: number
  safety: number
}

/**
 * The Ready-to-Go completion's orchestration (FEATURE-012 sections 10–12).
 *
 * `celebrate()` is called by Finish preparation only after the Plan save was
 * confirmed (D10). It plays the avatar's `ready_to_go` clip when the viewer
 * can, and resolves when the clip is over or cannot be waited for. It never
 * rejects, and nothing in it reports or retries a Plan.
 *
 * `status` is what the Studio shows of the viewer: null while the viewer is
 * not mounted (below 768px). It is read from a ref, so a save that resolves
 * after several reports always sees the latest one.
 */
export function useReadyToGo(status: AvatarViewerStatus | null) {
  const [readyCue, setReadyCue] = useState(0)
  const latest = useRef(status)
  const waiting = useRef<Waiting | null>(null)

  /** Ends the current wait, if any. Later reports are ignored until the next. */
  const settle = useCallback(() => {
    const current = waiting.current
    if (current === null) {
      return
    }
    waiting.current = null
    window.clearTimeout(current.grace)
    window.clearTimeout(current.safety)
    current.resolve()
  }, [])

  // Every report, in order. Resolves on the first of: the clip left
  // `playing`; the viewer went away or became unavailable; the user paused
  // motion; reduced motion turned on (the clip is then `none`).
  useEffect(() => {
    latest.current = status
    const current = waiting.current
    if (current === null) {
      return
    }
    if (
      status === null ||
      (status.state !== "ready" && status.state !== "partial") ||
      status.motion === "paused"
    ) {
      settle()
      return
    }
    if (status.readyClip === "playing") {
      if (!current.started) {
        current.started = true
        window.clearTimeout(current.grace)
      }
      return
    }
    if (current.started || status.readyClip === "none") {
      settle()
    }
  }, [settle, status])

  // Unmount (navigation, Continue mid-clip): timers cleared; the runtime's
  // own disposal stops the clip.
  useEffect(() => settle, [settle])

  const celebrate = useCallback((): Promise<void> => {
    settle()
    const current = latest.current
    const skip =
      current === null ||
      (current.state !== "ready" && current.state !== "partial") ||
      current.readyClip !== "available" ||
      // D12: the user chose a still avatar.
      current.motion === "paused" ||
      document.visibilityState !== "visible"
    if (skip) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      waiting.current = {
        resolve,
        started: false,
        grace: window.setTimeout(settle, START_GRACE_MS),
        safety: window.setTimeout(settle, SAFETY_MS),
      }
      // A pure updater: safe when StrictMode calls it twice.
      setReadyCue((cue) => cue + 1)
    })
  }, [settle])

  return { readyCue, celebrate }
}
