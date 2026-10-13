import { AUTH_CALLBACK_PATH } from "./authConfig"

/**
 * Looks at the address the application was opened with for an authorization
 * response (FEATURE-002 §5, V6, S6).
 *
 * The identity provider answers in the fragment, but its error redirects have
 * also been seen in the query string, and a response can be forged in either.
 * Exactly one shape is passed on: a code with a state, in the fragment, on the
 * callback route. The adapter then checks that the state is one it issued,
 * exchanges the code, and removes the parameters from the address bar itself.
 * Every other response is removed from the address bar here and reported as a
 * failed attempt. Its values are never displayed, stored, or logged.
 */
export type AuthResponse =
  | { kind: "none" }
  /** Left in the address bar for the adapter to validate and exchange. */
  | { kind: "code" }
  | { kind: "failed"; reason: "cancelled" | "failed" }

/** Every parameter an authorization response can carry. */
const RESPONSE_PARAMETERS = [
  "code",
  "state",
  "session_state",
  "iss",
  "error",
  "error_description",
  "error_uri",
  "kc_action",
  "kc_action_status",
]

function carriesResponse(parameters: URLSearchParams): boolean {
  return parameters.has("code") || parameters.has("error")
}

function readAddress() {
  const url = new URL(window.location.href)

  return {
    url,
    query: new URLSearchParams(url.search),
    fragment: new URLSearchParams(url.hash.replace(/^#/, "")),
  }
}

/**
 * Removes any authorization response from the address bar. The history entry
 * is replaced, not added to, so the response is gone from history as well.
 */
export function removeAuthResponse(): void {
  const { url, query, fragment } = readAddress()
  const inQuery = carriesResponse(query)
  const inFragment = carriesResponse(fragment)

  if (!inQuery && !inFragment) {
    return
  }

  if (inQuery) {
    RESPONSE_PARAMETERS.forEach((name) => query.delete(name))
    url.search = query.toString()
  }
  if (inFragment) {
    RESPONSE_PARAMETERS.forEach((name) => fragment.delete(name))
    url.hash = fragment.toString()
  }

  window.history.replaceState(window.history.state, "", url)
}

export function inspectAuthResponse(): AuthResponse {
  const { url, query, fragment } = readAddress()
  const inQuery = carriesResponse(query)

  if (!inQuery && !carriesResponse(fragment)) {
    return { kind: "none" }
  }

  const error = fragment.get("error") ?? query.get("error")

  if (
    url.pathname === AUTH_CALLBACK_PATH &&
    !inQuery &&
    error === null &&
    fragment.has("state")
  ) {
    return { kind: "code" }
  }

  removeAuthResponse()

  return {
    kind: "failed",
    reason: error === "access_denied" ? "cancelled" : "failed",
  }
}
