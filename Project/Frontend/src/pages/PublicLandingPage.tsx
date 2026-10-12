import { LandingHero } from "@/features/landing/LandingHero"

/**
 * Route `/`: the Public Landing for unauthenticated visitors. It is rendered
 * outside the application layout and is not the Authenticated Home.
 */
export function PublicLandingPage() {
  return <LandingHero />
}
