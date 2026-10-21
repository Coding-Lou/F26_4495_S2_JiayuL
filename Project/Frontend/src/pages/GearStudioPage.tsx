import { GearStudioScreen } from "@/features/loadout/components/GearStudioScreen"

/**
 * Route `/trails/:trailId/prepare/:tripDate/pack`: the Gear Customization
 * Studio, where the user decides what they are actually bringing on the
 * chosen trip and sees it on their avatar (FEATURE-005). Protected, and
 * rendered in the trip shell outside the application layout.
 */
export function GearStudioPage() {
  return <GearStudioScreen />
}
