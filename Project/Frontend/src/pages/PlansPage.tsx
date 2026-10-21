import { MyPlansScreen } from "@/features/plans/components/MyPlansScreen"

/**
 * Route `/plans`: My Plans, the signed-in user's saved Plans with a monthly
 * calendar (FEATURE-013). Protected, and rendered in the trip shell outside
 * the application layout (D1), as its own lazily loaded chunk.
 */
export function PlansPage() {
  return <MyPlansScreen />
}
