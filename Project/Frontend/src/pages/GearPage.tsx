import { MyGearScreen } from "@/features/gear/components/MyGearScreen"

/**
 * Route `/gear`: My Gear, the signed-in user's permanent collection of owned
 * gear (FEATURE-007). Protected, and rendered in the trip shell outside the
 * application layout (D1), as its own lazily loaded chunk (D2).
 */
export function GearPage() {
  return <MyGearScreen />
}
