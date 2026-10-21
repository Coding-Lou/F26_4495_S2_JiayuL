import { Navigate } from "react-router-dom"
import { authContent } from "./authContent"
import { DEFAULT_DESTINATION } from "./returnDestination"
import { AuthWaitingScreen } from "./AuthWaitingScreen"
import { useAuth } from "./useAuth"

/**
 * The route the identity provider returns to (FEATURE-002 §5, K6). It shows
 * the waiting screen while the code is exchanged, then replaces itself: with
 * the return destination after a completed sign-in, with the landing after
 * anything else. Both replace the history entry, so the callback address is
 * not left behind.
 *
 * The destination comes from the session, which validated it against the
 * protected routes; nothing here is read from the address.
 */
export function AuthCallbackRoute() {
  const { status, destination } = useAuth()

  switch (status) {
    case "initializing":
      return <AuthWaitingScreen message={authContent.waiting.loading} />
    case "callback-processing":
      return <AuthWaitingScreen message={authContent.waiting.signingIn} />
    case "authenticated":
    case "signing-out":
      return <Navigate to={destination ?? DEFAULT_DESTINATION} replace />
    default:
      return <Navigate to="/" replace />
  }
}
