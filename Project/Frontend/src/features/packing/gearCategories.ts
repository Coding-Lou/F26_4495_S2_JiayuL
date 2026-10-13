import type { PackItemStatus } from "./types/pack"

/**
 * Where `GearCategory` wire values become words (FEATURE-004 section 18).
 * They are mapped to labels here and nowhere else; a raw wire value is never
 * shown. The order of this list is the enum's order (section 5.2).
 */
const GEAR_CATEGORIES: readonly (readonly [string, string])[] = [
  ["FOOTWEAR", "Hiking footwear"],
  ["RAIN_GEAR", "Rain gear"],
  ["WARM_LAYER", "Warm layer"],
  ["WIND_LAYER", "Wind layer"],
  ["TREKKING_POLES", "Trekking poles"],
  ["TRACTION", "Traction"],
  ["HEADLAMP", "Headlamp"],
  ["BACKPACK", "Backpack"],
  ["WATER", "Water"],
  ["FOOD", "Food"],
  ["SUN_PROTECTION", "Sun protection"],
]

/** A category this list does not know is still shown, under this label. */
const OTHER_GEAR_LABEL = "Other gear"

const LABELS = new Map<string, string>(GEAR_CATEGORIES)
const POSITIONS = new Map<string, number>(
  GEAR_CATEGORIES.map(([category], index) => [category, index]),
)

export function gearCategoryLabel(category: string): string {
  return LABELS.get(category) ?? OTHER_GEAR_LABEL
}

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
      position: POSITIONS.get(item.category) ?? GEAR_CATEGORIES.length,
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
