import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { authContent } from "./authContent"

/** How long a wait must last before it is shown as one (§21.1). */
const WAITING_DELAY_MS = 400

type AuthWaitingScreenProps = {
  /** W1 "Loading…" or W2 "Signing you in…". */
  message: string
}

/**
 * The waiting screen for W1 and W2 (FEATURE-002 §21.3). It replaces the whole
 * route, application layout included, so nothing protected and no identity is
 * on screen while authentication is being decided.
 *
 * The wordmark is there from the first paint. The waiting line is inserted
 * into the status region after 400ms, so a fast check never flashes a
 * spinner, and it is announced once. Focus is not moved.
 */
export function AuthWaitingScreen({ message }: AuthWaitingScreenProps) {
  const [lineShown, setLineShown] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setLineShown(true), WAITING_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="auth-waiting">
      <p className="auth-waiting-brand">{authContent.brand}</p>
      <div role="status" className="auth-waiting-status">
        {lineShown ? (
          <p className="auth-waiting-line">
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="auth-spinner"
            />
            <span>{message}</span>
          </p>
        ) : null}
      </div>
    </main>
  )
}
