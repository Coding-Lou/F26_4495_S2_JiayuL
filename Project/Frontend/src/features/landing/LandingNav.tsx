import { Link } from "react-router-dom"
import { landingContent } from "./content"

type LandingNavProps = {
  /** Saves a valid prompt, then invokes the auth boundary with "sign in". */
  onSignIn: () => void
}

/**
 * The landing's own navigation (FEATURE-001 §11.6): the brand wordmark and
 * Sign in, and nothing else. It links to no authenticated area.
 */
export function LandingNav({ onSignIn }: LandingNavProps) {
  return (
    <header className="landing-header">
      <nav aria-label={landingContent.navigationLabel} className="landing-nav">
        {/* The wrapper carries the brand scrim; the link keeps its own box. */}
        <div className="landing-brand">
          <Link to="/" className="landing-control landing-brand-link">
            {landingContent.brand}
          </Link>
        </div>

        {/* A button, not a link: in this feature it does not navigate. */}
        <button
          type="button"
          className="landing-control landing-quiet landing-sign-in"
          onClick={onSignIn}
        >
          {landingContent.signIn}
        </button>
      </nav>
    </header>
  )
}
