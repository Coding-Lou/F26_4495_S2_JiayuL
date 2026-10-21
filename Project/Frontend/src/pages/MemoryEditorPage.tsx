import { MemoryEditorScreen } from "@/features/memories/components/MemoryEditorScreen"

/**
 * Routes `/memories/new` and `/memories/:memoryId/edit`: one editor for
 * creating and editing a Memory (FEATURE-009 D2). Protected, in the trip
 * shell, as its own lazily loaded chunk (D3).
 */
export function MemoryCreatePage() {
  return <MemoryEditorScreen mode="create" />
}

export function MemoryEditPage() {
  return <MemoryEditorScreen mode="edit" />
}
