import { isGearCategory, type GearCategory } from "./types/gear"

/**
 * Frontend-only families for browsing My Gear (FEATURE-007 section 11.4,
 * D9). They group the existing categories; they are never sent, stored, or
 * shown as an item's category. The order is the selector's and the Add Gear
 * picker's.
 */
export const GEAR_FAMILIES = [
  { id: "packs", categories: ["BACKPACK"] },
  { id: "layers", categories: ["RAIN_GEAR", "WARM_LAYER", "WIND_LAYER"] },
  { id: "footwear", categories: ["FOOTWEAR", "TRACTION"] },
  { id: "tools", categories: ["TREKKING_POLES", "HEADLAMP"] },
  { id: "essentials", categories: ["WATER", "FOOD", "SUN_PROTECTION"] },
] as const satisfies readonly {
  id: string
  categories: readonly GearCategory[]
}[]

export type GearFamilyId = (typeof GEAR_FAMILIES)[number]["id"]

/** The selector's value: a family, or every item. */
export type GearFamilyChoice = GearFamilyId | "all"

const FAMILY_OF = new Map<string, GearFamilyId>(
  GEAR_FAMILIES.flatMap((family) =>
    family.categories.map((category) => [category, family.id] as const),
  ),
)

/** Null for an item with no category or an unknown one: it is under All only. */
export function gearFamilyOf(category: string | null): GearFamilyId | null {
  return isGearCategory(category) ? (FAMILY_OF.get(category) ?? null) : null
}

/** The eleven categories in family order (section 21.10.1). */
export const GEAR_PICKER_ORDER: readonly GearCategory[] = GEAR_FAMILIES.flatMap(
  (family) => family.categories,
)
