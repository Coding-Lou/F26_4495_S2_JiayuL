import { PublicHomeScreen } from "@/features/discover/components/PublicHomeScreen"

/**
 * Route `/` for signed-out visitors: the public homepage, the cinematic Hero
 * first and Discover second, with today's activity and the map-anchored
 * Trail Detail popup (FEATURE-006). A signed-in visitor never sees it.
 */
export function DiscoverPage() {
  return <PublicHomeScreen />
}
