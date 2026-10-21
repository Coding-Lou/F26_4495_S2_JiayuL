import { MyMemoriesScreen } from "@/features/memories/components/MyMemoriesScreen"

/**
 * Route `/memories`: My Memories, the signed-in user's own journal of real
 * trips (FEATURE-009). Protected, in the trip shell, as its own lazily loaded
 * chunk (D3).
 */
export function MemoriesPage() {
  return <MyMemoriesScreen />
}
