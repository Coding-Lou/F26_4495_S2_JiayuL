import { useEffect } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { authContent } from "./authContent"
import { noteProtectedRouteClosed, verifySession } from "./authSession"
import { AuthWaitingScreen } from "./AuthWaitingScreen"
import { useAuth } from "./useAuth"

/**
 * Wraps the authenticated routes (FEATURE-002 §7, S10). Its children render
 * only while a session is established; in every other state the route shows
 * a waiting screen or nothing at all, never protected content.
 *
 * This is what the browser shows, not the security boundary: the backend
 * validates the token on every request.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const { pathname } = useLocation()

  // Each move to a protected route checks that the session still exists.
  useEffect(() => {
    if (status === "authenticated") {
      verifySession()
    }
  }, [status, pathname])

  switch (status) {
    case "initializing":
      return <AuthWaitingScreen message={authContent.waiting.loading} />
    case "callback-processing":
      return <AuthWaitingScreen message={authContent.waiting.signingIn} />
    case "authenticated":
    case "signing-out":
      return <Outlet />
    default:
      return <ClosedRoute pathname={pathname} />
  }
}

/**
 * A signed-out visitor asked for a protected route. They end on the landing,
 * where the gate is; the protected address is replaced in history, so Back
 * does not bounce between the two. Nothing here goes to the identity provider.
 */
function ClosedRoute({ pathname }: { pathname: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    noteProtectedRouteClosed(pathname)
    void navigate("/", { replace: true })
  }, [navigate, pathname])

  return null
}
