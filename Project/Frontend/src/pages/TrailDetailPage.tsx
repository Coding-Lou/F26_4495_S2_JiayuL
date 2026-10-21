import { TrailDetailScreen } from "@/features/trails/components/TrailDetailScreen"

/**
 * Route `/trails/:trailId`: Trail Detail, a briefing on one trail and the one
 * decision to choose it (FEATURE-004). Protected, and rendered in its own
 * full-viewport shell outside the application layout.
 */
export function TrailDetailPage() {
  return <TrailDetailScreen />
}
