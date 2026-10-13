/**
 * Authentication, as the rest of the application uses it (FEATURE-002).
 *
 * The Public Landing has its own, narrower entry: `./authBoundary`.
 */
export { AccountControls } from "./AccountControls"
export { AuthCallbackRoute } from "./AuthCallbackRoute"
export { AUTH_CALLBACK_PATH } from "./authConfig"
export {
  getAccessToken,
  getAuthenticatedSubject,
  NotAuthenticatedError,
  registerSessionCleanup,
  startAuthSession,
  type AuthSnapshot,
  type AuthStatus,
} from "./authSession"
export { ProtectedRoute } from "./ProtectedRoute"
export { PublicLandingRoute } from "./PublicLandingRoute"
export { useAuth } from "./useAuth"
