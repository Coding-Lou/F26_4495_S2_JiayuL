import type { MouseEvent } from "react"
import {
  requestAuthentication,
  useAuthControlStates,
} from "@/features/auth/authBoundary"
import { AuthActionLabel } from "@/features/landing/AuthActionLabel"
import { authControlAttributes } from "@/features/landing/authControlAttributes"
import { discoverContent } from "../content"

type PublicHeaderProps = {
  /** The in-page address of Discover. */
  discoverHref: string
  /** The brand on the homepage: back to the top (16.4). */
  onBrand: (event: MouseEvent<HTMLAnchorElement>) => void
  /** Discover: to the Discover section (16.6). */
  onDiscover: (event: MouseEvent<HTMLAnchorElement>) => void
}

/**
 * The public header (FEATURE-006 section 16.4): solid `ink`, fixed, the
 * same at every scroll position over the Hero and over Discover. The brand,
 * Discover (an in-page link), and Sign in; nothing else: no Create account
 * (FEATURE-002 D16), Gear, account controls, planner link, or current-section
 * indicator.
 *
 * Sign in is a button because it starts a redirect built at that moment. It
 * saves no return destination: a completed sign-in lands on `/home` (§11).
 */
export function PublicHeader({
  discoverHref,
  onBrand,
  onDiscover,
}: PublicHeaderProps) {
  const signInState = useAuthControlStates().navigation
  const { header } = discoverContent

  return (
    <header className="public-header">
      <nav aria-label={header.navigation} className="public-header-nav">
        <a href="/" className="trip-control public-header-brand" onClick={onBrand}>
          {header.brand}
        </a>

        <a
          href={discoverHref}
          className="trip-control public-header-link"
          onClick={onDiscover}
        >
          {header.discover}
        </a>

        <button
          type="button"
          className="trip-control auth-entry public-header-sign-in"
          {...authControlAttributes(signInState)}
          onClick={() => requestAuthentication({ reason: "sign-in" })}
        >
          <AuthActionLabel label={header.signIn} state={signInState} />
        </button>
      </nav>
    </header>
  )
}
