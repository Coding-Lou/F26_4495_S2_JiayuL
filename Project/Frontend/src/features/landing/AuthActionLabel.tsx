import { LoaderCircle } from "lucide-react"
import type { AuthControlState } from "@/features/auth/authBoundary"

type AuthActionLabelProps = {
  label: string
  state: AuthControlState
}

/**
 * The content of a control that leads to authentication (FEATURE-002
 * §21.2.3). While the control is working its label is hidden visually, stays
 * its accessible name, and keeps its width; a spinner is centred in its place.
 */
export function AuthActionLabel({ label, state }: AuthActionLabelProps) {
  return (
    <>
      <span className="landing-auth-label">{label}</span>
      {state === "working" ? (
        <LoaderCircle
          aria-hidden="true"
          strokeWidth={2}
          className="landing-auth-spinner"
        />
      ) : null}
    </>
  )
}
