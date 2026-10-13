import type { AuthControlState } from "@/features/auth/authBoundary"

/**
 * Attributes of a control that leads to authentication (FEATURE-002
 * §21.2.3). Working and unavailable controls stay focusable and say so with
 * `aria-disabled`; the auth boundary ignores their activations.
 */
export function authControlAttributes(state: AuthControlState) {
  return {
    "aria-disabled": state === "default" ? undefined : true,
    "data-state": state === "default" ? undefined : state,
  } as const
}
