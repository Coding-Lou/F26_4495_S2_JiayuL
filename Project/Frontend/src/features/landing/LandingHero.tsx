import type { MouseEvent, Ref } from "react"
import { ArrowDown } from "lucide-react"
import { landingContent } from "./content"
import { HeroIntro } from "./HeroIntro"
import { HeroNotice } from "./HeroNotice"
import { HeroMedia } from "./hero-media/HeroMedia"
import { SceneControl } from "./hero-media/SceneControl"
import { SceneRotationProvider } from "./hero-media/SceneRotationProvider"

type LandingHeroProps = {
  /** Lets the page move focus to the `h1` (arrival, the header's brand). */
  headingRef?: Ref<HTMLHeadingElement>
  /** The in-page address of the section Explore trails leads to. */
  exploreHref: string
  /** Explore trails was activated (FEATURE-006 section 16.6). */
  onExplore: (event: MouseEvent<HTMLAnchorElement>) => void
}

/**
 * The Hero, the first section of the public homepage (FEATURE-006 sections
 * 12, 16.5): FEATURE-001's media layer, scrim, and scene control, reused as
 * they are, with the slogan, the supporting line, the FEATURE-002 notice
 * slot, and Explore trails. There is no planner (D2).
 *
 * It composes the media layer and the foreground but knows nothing about
 * scenes: no element here moves or resizes when the scene changes. The
 * header is the page's, not the Hero's; it covers the Hero's top H px.
 */
export function LandingHero({
  headingRef,
  exploreHref,
  onExplore,
}: LandingHeroProps) {
  return (
    <SceneRotationProvider>
      <div className="landing-hero">
        <HeroMedia />

        <div className="landing-hero-block">
          <HeroIntro headingRef={headingRef} />
          <HeroNotice />
        </div>

        <div className="landing-hero-bottom">
          {/* In-page navigation to Discover, never a route (16.5.6). */}
          <a
            href={exploreHref}
            className="landing-control landing-explore"
            onClick={onExplore}
          >
            {landingContent.explore}
            <ArrowDown aria-hidden="true" strokeWidth={2} />
          </a>

          <SceneControl />
        </div>
      </div>
    </SceneRotationProvider>
  )
}
