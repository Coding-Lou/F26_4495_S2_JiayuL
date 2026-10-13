import type { PropsWithChildren } from "react"
import { Navigate } from "react-router-dom"
import { authContent } from "./authContent"
import { DEFAULT_DESTINATION } from "./returnDestination"
import { AuthWaitingScreen } from "./AuthWaitingScreen"
import { useAuth } from "./useAuth"

/**
 * Wraps the Public Landing (FEATURE-002 §5, D7). The landing renders and
 * works in full while authentication is still being decided; a signed-in
 * user is taken on to the authenticated home instead.
 */
export function PublicLandingRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()

  if (status === "authenticated" || status === "signing-out") {
    return <Navigate to={DEFAULT_DESTINATION} replace />
  }

  if (status === "callback-processing") {
    return <AuthWaitingScreen message={authContent.waiting.signingIn} />
  }

  return children
}
