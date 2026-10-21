import { MemoryDetailScreen } from "@/features/memories/components/MemoryDetailScreen"

/**
 * Route `/memories/:memoryId`: one Memory, read as a journal entry
 * (FEATURE-009 D1). Protected, in the trip shell, as its own lazily loaded
 * chunk (D3).
 */
export function MemoryDetailPage() {
  return <MemoryDetailScreen />
}
