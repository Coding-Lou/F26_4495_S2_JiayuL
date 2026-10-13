import { getAccessToken } from "@/features/auth"

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
)

export function apiRequest(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })
}

/** The application's own API lives under this path and nowhere else. */
const OWN_API_PATH = /^\/api\//

/**
 * A request to the application's own API, carrying the signed-in user's
 * access token (FEATURE-003 section 4.9, FEATURE-002 S15).
 *
 * The token is obtained immediately before the request, from the session and
 * never from storage, and is attached only to a path under `/api/` on the
 * configured API origin. Any other path is refused before a token is asked
 * for, so the header can never travel to another address.
 *
 * Rejects with `NotAuthenticatedError` when there is no session; in that case
 * no request is made.
 */
export async function authenticatedApiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!OWN_API_PATH.test(path)) {
    throw new Error("Authenticated requests are limited to the application API.")
  }

  const token = await getAccessToken()

  const headers = new Headers(init?.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }
  headers.set("Authorization", `Bearer ${token}`)

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
}
