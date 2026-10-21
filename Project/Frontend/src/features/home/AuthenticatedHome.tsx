import { useEffect, useRef } from "react"
import { useAuth } from "@/features/auth"
import { ConversationalPlanner } from "@/features/planning/components/ConversationalPlanner"
import { PlannerAnnouncer } from "@/features/planning/components/PlannerAnnouncer"
import { focusPlannerTitle } from "@/features/planning/plannerDom"
import { HomeHeader } from "./HomeHeader"
import { HomeMedia } from "./HomeMedia"
import { homeMedia } from "./homeMediaConfig"

const DOCUMENT_TITLE = "Plan a trip · Outdoor Trip Companion"

/** Smallest loss of height that is read as an on-screen keyboard. */
const KEYBOARD_MIN_PX = 120

/**
 * The Authenticated Home (FEATURE-003 sections 5.1, 9, 17, 21): a
 * full-viewport shell of its own, inside the protected route and outside the
 * application layout (D1).
 *
 * It composes two things that do not know each other: the Home media, which
 * is atmosphere, and the conversational planner, which is the product. They
 * are siblings and share no state, so a later change of background replaces
 * `HomeMedia` here and touches nothing of the planner.
 */
export function AuthenticatedHome() {
  const { status } = useAuth()
  const shellRef = useRef<HTMLDivElement>(null)

  // FEATURE-002's working state: the page stays, but cannot be used.
  const signingOut = status === "signing-out"

  useEffect(() => {
    const previous = document.title
    document.title = DOCUMENT_TITLE
    return () => {
      document.title = previous
    }
  }, [])

  // With an on-screen keyboard open, the shell is sized from what is left of
  // the viewport, so the composer and its controls sit above the keyboard
  // (section 17.4). Pinch-zoom also shrinks the visual viewport and is left
  // alone. Closing the keyboard restores the layout as it was.
  useEffect(() => {
    const shell = shellRef.current
    const viewport = window.visualViewport
    if (shell === null || viewport == null) {
      return
    }

    const apply = () => {
      const unzoomed = Math.abs(viewport.scale - 1) < 0.01
      const keyboardOpen =
        unzoomed && window.innerHeight - viewport.height > KEYBOARD_MIN_PX

      if (!keyboardOpen) {
        shell.style.removeProperty("--home-vh")
        return
      }

      shell.style.setProperty("--home-vh", `${Math.round(viewport.height)}px`)

      // Whatever is being typed in, with the controls beside it, stays in view.
      const active = document.activeElement
      if (active instanceof HTMLElement && shell.contains(active)) {
        const target = active.closest("form") ?? active
        target.scrollIntoView({ block: "end" })
      }
    }

    viewport.addEventListener("resize", apply)
    return () => {
      viewport.removeEventListener("resize", apply)
      shell.style.removeProperty("--home-vh")
    }
  }, [])

  return (
    <div ref={shellRef} className="home">
      <HomeHeader />

      <main
        className="home-main"
        inert={signingOut}
        aria-busy={signingOut ? true : undefined}
      >
        <div className="home-panel">
          <ConversationalPlanner />
        </div>
      </main>

      <PlannerAnnouncer />

      <HomeMedia asset={homeMedia} onControlRemoved={focusPlannerTitle} />
    </div>
  )
}
