import type { Ref } from "react"
import { landingContent } from "./content"

type HeroIntroProps = {
  /** Lets the page move focus to the heading when the visitor arrives. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * The page's one `h1` (HR1) and its supporting sentence (HR2) (FEATURE-006
 * sections 16.5.1, 16.17). From 768px each sentence of the heading is its
 * own line.
 *
 * The heading can receive focus from script only (`tabindex="-1"`): it is
 * where focus lands when the application replaces another route with the
 * homepage, and after the header's brand (FEATURE-002 §21.2.5; FEATURE-006
 * 16.15.2). It is not operable and shows no focus ring.
 */
export function HeroIntro({ headingRef }: HeroIntroProps) {
  const [first, second] = landingContent.heading

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="landing-heading">
        <span className="landing-heading-line">{first}</span>{" "}
        <span className="landing-heading-line">{second}</span>
      </h1>
      <p className="landing-supporting">{landingContent.supporting}</p>
    </>
  )
}
