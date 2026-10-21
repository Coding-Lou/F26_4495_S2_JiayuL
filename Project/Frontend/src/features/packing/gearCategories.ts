import { GEAR_CATEGORY_VALUES, gearCategoryLabel } from "@/features/gear"
import type { PackItemStatus } from "./types/pack"

/**
 * `GearCategory` labels live in `features/gear` (FEATURE-007 D3). They are
 * re-exported here so every screen that took them from `packing` keeps doing
 * so with the same words. The order used below is the enum's (section 5.2).
 */
export { gearCategoryLabel }

const POSITIONS = new Map<string, number>(
  GEAR_CATEGORY_VALUES.map((category, index) => [category, index]),
)

export type GearRow = {
  key: string
  label: string
  owned: boolean
}

/**
 * One row per entry of `requiredGear`: none added, merged, or dropped, and
 * no `owned` value changed. Only the order is the interface's: missing rows
 * first, then owned, each in the enum's order, because the backend's own
 * order is not stable. An unknown category keeps its place after the known
 * ones, with its real state.
 */
export function gearRows(requiredGear: readonly PackItemStatus[]): GearRow[] {
  return requiredGear
    .map((item, index) => ({
      key: `${index}-${item.category}`,
      label: gearCategoryLabel(item.category),
      owned: item.owned,
      position: POSITIONS.get(item.category) ?? GEAR_CATEGORY_VALUES.length,
      arrival: index,
    }))
    .sort(
      (a, b) =>
        Number(a.owned) - Number(b.owned) ||
        a.position - b.position ||
        a.arrival - b.arrival,
    )
    .map(({ key, label, owned }) => ({ key, label, owned }))
}
