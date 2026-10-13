import { Link } from "react-router-dom"
import { useAuthControlStates } from "@/features/auth/authBoundary"
import { AuthActionLabel } from "./AuthActionLabel"
import { authControlAttributes } from "./authControlAttributes"
import { landingContent } from "./content"

type LandingNavProps = {
  /** Saves a valid prompt, then invokes the auth boundary with "sign in". */
  onSignIn: () => void
}

/**
 * The landing's own navigation (FEATURE-001 §11.6): the brand wordmark and
 * Sign in, and nothing else. It links to no authenticated area and gains no
 * "Create account" entry (FEATURE-002 D16).
 */
export function LandingNav({ onSignIn }: LandingNavProps) {
  const signInState = useAuthControlStates().navigation

  return (
    <header className="landing-header">
      <nav aria-label={landingContent.navigationLabel} className="landing-nav">
        {/* The wrapper carries the brand scrim; the link keeps its own box. */}
        <div className="landing-brand">
          <Link to="/" className="landing-control landing-brand-link">
            {landingContent.brand}
          </Link>
        </div>

        {/* A button, not a link: it starts a redirect built at that moment
            and has no fixed address (FEATURE-002 §6). */}
        <button
          type="button"
          className="landing-control landing-quiet landing-sign-in"
          {...authControlAttributes(signInState)}
          onClick={onSignIn}
        >
          <AuthActionLabel label={landingContent.signIn} state={signInState} />
        </button>
      </nav>
    </header>
  )
}
