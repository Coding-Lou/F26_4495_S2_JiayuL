import { useEffect } from "react"
import { CircleAlert, Info } from "lucide-react"
import {
  authBoundaryNoticeSurface,
  authBoundaryNoticeText,
  authBoundaryNoticeTone,
  presentAuthBoundaryArrival,
  useAuthBoundaryNotice,
} from "@/features/auth/authBoundary"
import { AuthGateActions } from "./AuthGateActions"

/**
 * The Hero's notice slot (FEATURE-006 section 16.5.5), where FEATURE-001's
 * message slot was: the FEATURE-002 notices the homepage hosts (G3, F1, F2,
 * X1, O1, O2, and F3 caused by the header's Sign in) and, with those that
 * offer them, the gate's Sign in and Create account. An F3 that a popup
 * action caused is the popup's, and is not shown here.
 *
 * The status region exists, empty, from the first render, so a notice
 * inserted after it is announced. The actions are outside it, so they are
 * not read as part of the notice. A notice stays until another replaces it,
 * a gate action starts authentication, or the page is left; scrolling and
 * selecting trails do not clear it.
 */
export function HeroNotice() {
  const notice = useAuthBoundaryNotice()

  // A notice that came with the visitor is shown once the Hero has rendered.
  useEffect(() => presentAuthBoundaryArrival(), [])

  const shown =
    notice !== null && authBoundaryNoticeSurface(notice) === "page"
      ? notice
      : null
  const Icon =
    shown !== null && authBoundaryNoticeTone(shown) === "alert"
      ? CircleAlert
      : Info

  return (
    <div
      className="landing-message-slot"
      data-active={shown !== null ? "" : undefined}
    >
      <div
        className="landing-gate"
        data-actions={shown !== null && shown.actions ? "" : undefined}
      >
        <div className="landing-message-block">
          <div role="status" aria-atomic="true">
            {shown !== null ? (
              <p key={shown.id} className="landing-message-line">
                <Icon aria-hidden="true" strokeWidth={2} />
                <span>{authBoundaryNoticeText(shown)}</span>
              </p>
            ) : null}
          </div>
        </div>

        {shown !== null && shown.actions ? <AuthGateActions /> : null}
      </div>
    </div>
  )
}
