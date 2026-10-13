import {
  authBoundaryLabels,
  chooseGateAction,
  useAuthControlStates,
} from "@/features/auth/authBoundary"
import { AuthActionLabel } from "./AuthActionLabel"
import { authControlAttributes } from "./authControlAttributes"

/**
 * The gate's two actions (FEATURE-002 §21.2.1): Sign in, filled, and Create
 * account, quiet. Both are buttons because each starts a redirect that is
 * built at that moment and has no fixed address.
 *
 * The group sits outside the planner's live regions and outside the element
 * that describes the input, so the labels are read neither as part of a
 * notice nor as part of the field's description (§21.2.5).
 */
export function AuthGateActions() {
  const states = useAuthControlStates()

  return (
    <div
      role="group"
      aria-label={authBoundaryLabels.group}
      className="landing-gate-actions"
    >
      <button
        type="button"
        className="landing-control landing-gate-action landing-gate-filled"
        {...authControlAttributes(states["gate-sign-in"])}
        onClick={() => chooseGateAction("sign-in")}
      >
        <AuthActionLabel
          label={authBoundaryLabels.signIn}
          state={states["gate-sign-in"]}
        />
      </button>
      <button
        type="button"
        className="landing-control landing-quiet landing-gate-action"
        {...authControlAttributes(states["gate-create-account"])}
        onClick={() => chooseGateAction("create-account")}
      >
        <AuthActionLabel
          label={authBoundaryLabels.createAccount}
          state={states["gate-create-account"]}
        />
      </button>
    </div>
  )
}
