import { useEffect } from "react"
import {
  registerSessionCleanup,
  useAuth,
  type AuthStatus,
} from "@/features/auth"
import { endLoadoutSession } from "./state/loadoutStore"

/**
 * The loadout ends with the session (FEATURE-005 section 9).
 *
 * Sign-out and session expiry are covered by the session's own cleanup hook,
 * which runs at the moment either happens.
 */
registerSessionCleanup(endLoadoutSession)

/** Every state in which this tab has no session. */
const WITHOUT_SESSION: ReadonlySet<AuthStatus> = new Set<AuthStatus>([
  "unauthenticated",
  "redirecting",
  "callback-processing",
  "callback-failed",
  "session-expired",
  "signed-out",
])

/**
 * The third case, as `PlannerSessionBoundary` handles it for the planner: a
 * startup that finds no session. No cleanup runs then, because nothing ended
 * in this document, so the stored loadout is removed here. A person who signs
 * in afterwards in the same tab never sees an earlier loadout.
 *
 * It renders nothing and is mounted for every route.
 */
export function LoadoutSessionBoundary() {
  const { status } = useAuth()

  useEffect(() => {
    if (WITHOUT_SESSION.has(status)) {
      endLoadoutSession()
    }
  }, [status])

  return null
}
