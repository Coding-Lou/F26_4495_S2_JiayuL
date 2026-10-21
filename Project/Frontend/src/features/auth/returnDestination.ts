/**
 * The protected route a signed-out visitor asked for, kept so that a
 * completed sign-in can land there (FEATURE-002 §7, D4, D20).
 *
 * It is held in session storage: for this tab only, used once, and never
 * taken from a query parameter or a fragment. Whatever is read back is
 * checked against the protected routes again, so an edited value cannot send
 * the visitor anywhere else.
 */
const RETURN_DESTINATION_STORAGE_KEY = "outdoor-trip-companion.return-destination"

/** Where a completed sign-in lands when no destination is held. */
export const DEFAULT_DESTINATION = "/home"

/** `/trails/:trailId`: one non-empty path segment after `/trails/`. */
const TRAIL_DETAIL_PATH = /^\/trails\/[A-Za-z0-9._~%!$&'()*+,;=:@-]+$/

/**
 * `/trails/:trailId/prepare` and `/trails/:trailId/prepare/:tripDate`, the
 * date written `YYYY-MM-DD` (FEATURE-004 section 25), and the Gear
 * Customization Studio, `/trails/:trailId/prepare/:tripDate/pack`
 * (FEATURE-005 section 10). The pathname is the whole destination: a query
 * string is never part of it.
 */
const TRIP_PREPARATION_PATH =
  /^\/trails\/[A-Za-z0-9._~%!$&'()*+,;=:@-]+\/prepare(?:\/\d{4}-\d{2}-\d{2}(?:\/pack)?)?$/

/**
 * My Memories (FEATURE-009 D5): `/memories`, `/memories/new`,
 * `/memories/<uuid>`, and `/memories/<uuid>/edit`. Pathname only: `?trail=`
 * is never carried.
 */
const MEMORIES_PATH =
  /^\/memories(?:\/new|\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:\/edit)?)?$/

/** True only for the application's protected routes, as in-application paths. */
export function isProtectedPath(path: string): boolean {
  return (
    path === "/home" ||
    path === "/gear" ||
    // My Plans (FEATURE-013 D2). Pathname only: `?plan=` is never carried.
    path === "/plans" ||
    TRAIL_DETAIL_PATH.test(path) ||
    TRIP_PREPARATION_PATH.test(path) ||
    MEMORIES_PATH.test(path)
  )
}

/** Remembers a protected route. Anything else is ignored. */
export function saveReturnDestination(path: string): void {
  if (!isProtectedPath(path)) {
    return
  }

  try {
    window.sessionStorage.setItem(RETURN_DESTINATION_STORAGE_KEY, path)
  } catch {
    // Without storage the visitor simply lands on the default destination.
  }
}

/** Reads the destination once and forgets it. Falls back to `/home`. */
export function takeReturnDestination(): string {
  try {
    const stored = window.sessionStorage.getItem(RETURN_DESTINATION_STORAGE_KEY)
    window.sessionStorage.removeItem(RETURN_DESTINATION_STORAGE_KEY)

    return stored !== null && isProtectedPath(stored)
      ? stored
      : DEFAULT_DESTINATION
  } catch {
    return DEFAULT_DESTINATION
  }
}

export function clearReturnDestination(): void {
  try {
    window.sessionStorage.removeItem(RETURN_DESTINATION_STORAGE_KEY)
  } catch {
    // Nothing to clear when storage cannot be reached.
  }
}
