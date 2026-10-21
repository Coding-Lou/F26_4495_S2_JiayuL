import { useCallback, useEffect, useRef } from "react"
import { useBlocker, type BlockerFunction } from "react-router-dom"
import { useAuth } from "@/features/auth"

/**
 * The unsaved-changes guard (FEATURE-009 section 19.5, D22). While `guarded`
 * is true, an in-application navigation to another address is held for the
 * leave dialog, and a reload or a closing tab gets the browser's own prompt.
 *
 * It never holds a navigation while the session is anything but
 * `authenticated`: sign-out, an ended session, and the sign-in gate always
 * pass. `release()` lets the page's own next navigation through, for a save
 * that has finished.
 */
export function useLeaveGuard(guarded: boolean) {
  const { status } = useAuth()
  const authenticated = status === "authenticated"
  const active = guarded && authenticated

  const activeRef = useRef(active)
  const released = useRef(false)
  /** What had focus when a navigation was held, to return focus to. */
  const openerRef = useRef<Element | null>(null)

  useEffect(() => {
    activeRef.current = active
  })

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      const hold =
        activeRef.current &&
        !released.current &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search)
      if (hold) {
        openerRef.current = document.activeElement
      }
      return hold
    },
    [],
  )
  const blocker = useBlocker(shouldBlock)

  // The browser's own prompt, attached only while guarded.
  useEffect(() => {
    if (!active) {
      return
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (released.current) {
        return
      }
      event.preventDefault()
      // Older browsers need a value; its text is never shown.
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])

  // A held navigation is let through if the session ends meanwhile.
  useEffect(() => {
    if (!authenticated && blocker.state === "blocked") {
      blocker.proceed()
    }
  }, [authenticated, blocker])

  const release = useCallback(() => {
    released.current = true
  }, [])

  return { blocker, release, openerRef }
}
