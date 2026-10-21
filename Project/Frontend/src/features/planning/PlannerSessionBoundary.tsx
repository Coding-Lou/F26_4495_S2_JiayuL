import { useEffect } from "react"
import {
  registerSessionCleanup,
  useAuth,
  type AuthStatus,
} from "@/features/auth"
import { endPlannerSession } from "./state/plannerStore"

/**
 * Planner state ends with the session (FEATURE-003 section 16, D14).
 *
 * Sign-out and session expiry are covered by the session's own cleanup hook,
 * which runs at the moment either happens.
 */
registerSessionCleanup(endPlannerSession)

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
 * The third case: a startup that finds no session, for example a reload
 * after the session ended elsewhere. No cleanup runs then, because nothing
 * ended in this document, so the stored conversation is discarded here. A
 * person who signs in afterwards in the same tab never sees an earlier
 * conversation, date, or starting point.
 *
 * It renders nothing and is mounted for every route, because that startup
 * usually ends on the Public Landing, not on `/home`.
 */
export function PlannerSessionBoundary() {
  const { status } = useAuth()

  useEffect(() => {
    if (WITHOUT_SESSION.has(status)) {
      endPlannerSession()
    }
  }, [status])

  return null
}
