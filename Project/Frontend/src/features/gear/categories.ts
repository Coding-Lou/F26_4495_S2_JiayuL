import { GEAR_CATEGORY_VALUES, type GearCategory } from "./types/gear"

/**
 * Where `GearCategory` wire values become words (FEATURE-004 section 18,
 * FEATURE-007 D3). They are mapped to labels here and nowhere else; a raw
 * wire value is never shown. Moved from `features/packing/gearCategories.ts`
 * unchanged: `packing` imports it from here and re-exports
 * `gearCategoryLabel`, so every screen keeps the same words.
 */
export const GEAR_CATEGORY_LABELS: Readonly<Record<GearCategory, string>> = {
  FOOTWEAR: "Hiking footwear",
  RAIN_GEAR: "Rain gear",
  WARM_LAYER: "Warm layer",
  WIND_LAYER: "Wind layer",
  TREKKING_POLES: "Trekking poles",
  TRACTION: "Traction",
  HEADLAMP: "Headlamp",
  BACKPACK: "Backpack",
  WATER: "Water",
  FOOD: "Food",
  SUN_PROTECTION: "Sun protection",
}

/** A category this list does not know is still shown, under this label. */
export const OTHER_GEAR_LABEL = "Other gear"

const LABELS = new Map<string, string>(
  GEAR_CATEGORY_VALUES.map((category) => [
    category,
    GEAR_CATEGORY_LABELS[category],
  ]),
)

export function gearCategoryLabel(category: string): string {
  return LABELS.get(category) ?? OTHER_GEAR_LABEL
}
