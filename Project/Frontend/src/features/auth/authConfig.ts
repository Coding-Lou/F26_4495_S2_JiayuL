/**
 * Where the identity provider is, read from the three Vite variables
 * documented in `.env.example`. None of them is a secret: this is a public
 * client and has no client secret (FEATURE-002 §4).
 *
 * A container serves `/runtime-config.js`, written from its environment at
 * start, so one built image works in every environment; a value given there
 * wins over the build-time one. In development the file in `public/` sets
 * nothing and the Vite variables apply.
 */
export type AuthConfig = {
  /** Base URL of the identity provider, without a trailing slash. */
  url: string
  realm: string
  clientId: string
}

type RuntimeConfig = {
  keycloakUrl?: string
  keycloakRealm?: string
  keycloakClientId?: string
}

declare global {
  interface Window {
    __OTC_RUNTIME_CONFIG__?: RuntimeConfig
  }
}

function readValue(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed === "" ? null : trimmed
}

/** The configuration, or null when any value is missing or unusable. */
export function readAuthConfig(): AuthConfig | null {
  const runtime = window.__OTC_RUNTIME_CONFIG__ ?? {}
  const url =
    readValue(runtime.keycloakUrl) ?? readValue(import.meta.env.VITE_KEYCLOAK_URL)
  const realm =
    readValue(runtime.keycloakRealm) ??
    readValue(import.meta.env.VITE_KEYCLOAK_REALM)
  const clientId =
    readValue(runtime.keycloakClientId) ??
    readValue(import.meta.env.VITE_KEYCLOAK_CLIENT_ID)

  if (url === null || realm === null || clientId === null) {
    return null
  }

  try {
    const { protocol } = new URL(url)
    if (protocol !== "http:" && protocol !== "https:") {
      return null
    }
  } catch {
    return null
  }

  return { url: url.replace(/\/+$/, ""), realm, clientId }
}

/** The route the identity provider returns to after sign-in or registration. */
export const AUTH_CALLBACK_PATH = "/auth/callback"

/**
 * The complete set of addresses handed to the identity provider. Each is
 * built from the application's own origin and a fixed path, never from user
 * input, and each must be allowed by the client's configuration (§7, §15).
 */
export const authRedirects = {
  /** After sign-in or registration. */
  callback: () => `${window.location.origin}${AUTH_CALLBACK_PATH}`,
  /** The hidden-frame session check at startup (D25). */
  silentCheck: () => `${window.location.origin}/silent-check-sso.html`,
  /** After sign-out. */
  signedOut: () => `${window.location.origin}/`,
}

/** The realm's public discovery document, used only to see whether it answers. */
export function discoveryUrl(config: AuthConfig): string {
  return `${config.url}/realms/${encodeURIComponent(config.realm)}/.well-known/openid-configuration`
}
