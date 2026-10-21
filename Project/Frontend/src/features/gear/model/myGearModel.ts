import { gearCategoryLabel } from "../categories"
import { myGearContent } from "../content"
import {
  GEAR_FAMILIES,
  gearFamilyOf,
  type GearFamilyChoice,
  type GearFamilyId,
} from "../families"
import { isGearCategory, type GearItem } from "../types/gear"

/** The label a card and the panel show: "No category" for null (MG11). */
export function itemCategoryText(category: string | null): string {
  return category === null ? myGearContent.noCategory : gearCategoryLabel(category)
}

/** Distinct known categories: what MG4 counts. */
export function knownCategoryCount(items: readonly GearItem[]): number {
  const seen = new Set<string>()
  for (const item of items) {
    if (isGearCategory(item.category)) {
      seen.add(item.category)
    }
  }
  return seen.size
}

/** Families with at least one item, in the selector's order (section 11.4). */
export function presentFamilies(items: readonly GearItem[]): GearFamilyId[] {
  const present = new Set<GearFamilyId>()
  for (const item of items) {
    const family = gearFamilyOf(item.category)
    if (family !== null) {
      present.add(family)
    }
  }
  return GEAR_FAMILIES.map((family) => family.id).filter((id) => present.has(id))
}

/** The items a choice shows, in the server's order. */
export function itemsInFamily(
  items: readonly GearItem[],
  family: GearFamilyChoice,
): readonly GearItem[] {
  return family === "all"
    ? items
    : items.filter((item) => gearFamilyOf(item.category) === family)
}

const ADDED_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/** MG13, or null when `createdAt` cannot be read. */
export function addedText(createdAt: string | null): string | null {
  if (createdAt === null) {
    return null
  }
  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? null
    : myGearContent.detail.added(ADDED_FORMAT.format(date))
}
