import { HeroIntro } from "./HeroIntro"
import { HeroMedia } from "./hero-media/HeroMedia"
import { SceneControl } from "./hero-media/SceneControl"
import { SceneRotationProvider } from "./hero-media/SceneRotationProvider"
import { LandingNav } from "./LandingNav"
import { PlannerPrompt } from "./PlannerPrompt"
import { usePlannerPrompt } from "./usePlannerPrompt"

/**
 * The Public Landing: page wrapper, hero grid, and foreground container
 * (FEATURE-001 §11.2). The wrapper paints the `ink` base colour itself and the
 * layout lives in landing.css.
 *
 * It composes the media layer and the foreground but knows nothing about
 * scenes: no element here moves or resizes when the scene changes.
 */
export function LandingHero() {
  const planner = usePlannerPrompt()

  return (
    <SceneRotationProvider>
      <div className="landing">
        <HeroMedia />

        <LandingNav onSignIn={planner.signIn} />

        <main className="landing-main">
          <div className="landing-content">
            <HeroIntro />
            <PlannerPrompt planner={planner} />
          </div>

          <SceneControl />
        </main>
      </div>
    </SceneRotationProvider>
  )
}
