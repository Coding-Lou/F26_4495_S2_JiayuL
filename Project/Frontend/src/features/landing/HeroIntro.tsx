import { landingContent } from "./content"

/** The page's one `h1` and its supporting sentence (FEATURE-001 §11.1). */
export function HeroIntro() {
  return (
    <>
      <h1 className="landing-heading">{landingContent.heading}</h1>
      <p className="landing-supporting">{landingContent.supporting}</p>
    </>
  )
}
