import { TripPreparationScreen } from "@/features/packing/components/TripPreparationScreen"

/**
 * Route `/trails/:trailId/prepare/:tripDate`: Trip Preparation, the chosen
 * trail and date with the gear the backend recommends for them (FEATURE-004).
 * Protected, and rendered in its own full-viewport shell outside the
 * application layout. The date segment may be missing: the screen then asks
 * for one.
 */
export function TripPreparationPage() {
  return <TripPreparationScreen />
}
