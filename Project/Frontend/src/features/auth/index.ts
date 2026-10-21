/**
 * Authentication, as the rest of the application uses it (FEATURE-002).
 *
 * The public homepage (the Hero and Discover, FEATURE-006) starts sign-in
 * only through its own, narrower entry: `./authBoundary`.
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
