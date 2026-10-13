import type { Ref } from "react"
import { landingContent } from "./content"

type HeroIntroProps = {
  /** Lets the landing move focus to the heading when the visitor arrives. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * The page's one `h1` and its supporting sentence (FEATURE-001 §11.1).
 *
 * The heading can receive focus from script only (`tabindex="-1"`): it is
 * where focus lands when the application replaces another route with the
 * landing (FEATURE-002 §21.2.5). It is not operable and shows no focus ring.
 */
export function HeroIntro({ headingRef }: HeroIntroProps) {
  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="landing-heading">
        {landingContent.heading}
      </h1>
      <p className="landing-supporting">{landingContent.supporting}</p>
    </>
  )
}
