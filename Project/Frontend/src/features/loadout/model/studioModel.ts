import {
  avatarManifest,
  type AvatarViewerStatus,
  type VisualCategory,
} from "@/features/avatar"
import {
  GEAR_CATEGORY_VALUES,
  isGearCategory,
  type GearItem,
} from "@/features/gear"
import { gearCategoryLabel } from "@/features/packing/gearCategories"
import type { PackItemStatus } from "@/features/packing/types/pack"
import { studioContent, visualNouns } from "../content"

/**
 * The Studio's rows and measures, derived from two responses and the
 * loadout (FEATURE-005 sections 8.4, 11, 12, 14). Pure functions: no request,
 * no storage, no React. Nothing here computes a readiness, and nothing here
 * equips anything.
 */

/** Gear category wire value → gear item id. */
export type Equipped = Readonly<Record<string, string>>

export type StudioRow = {
  /** The wire value. Never shown. */
  category: string
  /** The words for it, "Other gear" for a value the frontend does not know. */
  label: string
  recommended: boolean
  /** The owned items in this category, in the inventory's order. */
  items: readonly GearItem[]
  /** Null: not equipped. */
  equippedItem: GearItem | null
  /**
   * The item named on line 2 (section 12): the equipped one; else the one the
   * user last chose; else the newest. Null for a Missing row.
   */
  currentItem: GearItem | null
  /** Null: the avatar does not show this category (a UI-only category). */
  visual: VisualCategory | null
  /** One of the eleven wire values the frontend knows. */
  known: boolean
}

export type StudioModel = {
  recommendedRows: StudioRow[]
  otherRows: StudioRow[]
  /** Items whose category is null (G3). */
  uncategorisedCount: number
  /** `{m}`: distinct recommended categories. */
  recommendedCount: number
  /** `{e}`: recommended categories that are equipped. */
  equippedRecommended: number
  /** `{x}` of GS12: equipped categories that are not recommended. */
  equippedOther: number
}

const ENUM_POSITION = new Map<string, number>(
  GEAR_CATEGORY_VALUES.map((category, index) => [category, index]),
)

/** Enum order; a value the frontend does not know comes after the known. */
function byEnumOrder(a: string, b: string): number {
  const positionA = ENUM_POSITION.get(a) ?? GEAR_CATEGORY_VALUES.length
  const positionB = ENUM_POSITION.get(b) ?? GEAR_CATEGORY_VALUES.length
  return positionA - positionB
}

/** The visual category the avatar shows for a gear category, or null. */
export function visualOf(category: string): VisualCategory | null {
  return isGearCategory(category) ? avatarManifest.gear[category] : null
}

/**
 * Section 8.4: a stored entry counts only when the gear list holds an item
 * with that id whose category is the entry's category. Anything else is
 * dropped, never substituted (D6).
 */
export function reconcileLoadout(
  stored: Equipped,
  items: readonly GearItem[],
): Equipped {
  const reconciled: Record<string, string> = {}
  for (const [category, itemId] of Object.entries(stored)) {
    const item = items.find((entry) => entry.id === itemId)
    if (item !== undefined && item.category === category) {
      reconciled[category] = itemId
    }
  }
  return reconciled
}

/**
 * The rows of both groups (section 11.3), each in enum order: one per
 * distinct recommended category, then one per category owned and not
 * recommended. A category neither recommended nor owned has no row.
 */
export function buildStudioModel(
  requiredGear: readonly PackItemStatus[],
  items: readonly GearItem[],
  equipped: Equipped,
  choices: Readonly<Record<string, string>>,
): StudioModel {
  const owned = new Map<string, GearItem[]>()
  let uncategorisedCount = 0
  for (const item of items) {
    if (item.category === null) {
      uncategorisedCount += 1
      continue
    }
    const list = owned.get(item.category)
    if (list === undefined) {
      owned.set(item.category, [item])
    } else {
      list.push(item)
    }
  }

  const recommended = [
    ...new Set(requiredGear.map((entry) => entry.category)),
  ].sort(byEnumOrder)
  const recommendedSet = new Set(recommended)
  const others = [...owned.keys()]
    .filter((category) => !recommendedSet.has(category))
    .sort(byEnumOrder)

  const rowFor = (category: string, isRecommended: boolean): StudioRow => {
    const categoryItems = owned.get(category) ?? []
    const find = (id: string | undefined) =>
      id === undefined
        ? undefined
        : categoryItems.find((item) => item.id === id)

    const equippedItem = find(equipped[category]) ?? null
    const currentItem =
      equippedItem ?? find(choices[category]) ?? categoryItems[0] ?? null

    return {
      category,
      label: gearCategoryLabel(category),
      recommended: isRecommended,
      items: categoryItems,
      equippedItem,
      currentItem,
      visual: visualOf(category),
      known: isGearCategory(category),
    }
  }

  const recommendedRows = recommended.map((category) => rowFor(category, true))
  const otherRows = others.map((category) => rowFor(category, false))

  return {
    recommendedRows,
    otherRows,
    uncategorisedCount,
    recommendedCount: recommendedRows.length,
    equippedRecommended: recommendedRows.filter((row) => row.equippedItem)
      .length,
    equippedOther: otherRows.filter((row) => row.equippedItem).length,
  }
}

/**
 * The equipped visual categories the viewer receives (section 28.3): each
 * equipped gear category mapped through the manifest, UI-only ones dropped.
 * Never an item id, name, or description. Sorted, so equal sets are equal.
 */
export function equippedVisuals(equipped: Equipped): VisualCategory[] {
  const visuals = new Set<VisualCategory>()
  for (const category of Object.keys(equipped)) {
    const visual = visualOf(category)
    if (visual !== null) {
      visuals.add(visual)
    }
  }
  return [...visuals].sort()
}

/** Section 18.4's `{count}`. */
export function countSentence(model: StudioModel): string {
  const { announcements } = studioContent
  return model.recommendedCount > 0
    ? announcements.count(model.equippedRecommended, model.recommendedCount)
    : announcements.countAll(model.equippedOther)
}

/** Whether the avatar is on screen at all, in any state. */
export type AvatarPresence =
  /** Below 768px: the viewer is not mounted. */
  | "none"
  | "mounted"

/** The viewer state as the rows read it. No status yet counts as loading. */
export function viewerStateOf(
  presence: AvatarPresence,
  status: AvatarViewerStatus | null,
): "none" | "loading" | "ready" | "partial" | "unavailable" {
  if (presence === "none") {
    return "none"
  }
  return status?.state ?? "loading"
}

export type RowNote = {
  /** PersonStanding or EyeOff (16.8). */
  icon: "avatar" | "hidden" | null
  text: string
}

/** Line 3 of an owned row (16.8, N1–N8). Null: no note. */
export function rowNote(
  row: StudioRow,
  presence: AvatarPresence,
  status: AvatarViewerStatus | null,
): RowNote | null {
  const { notes } = studioContent
  const isEquipped = row.equippedItem !== null
  const viewer = viewerStateOf(presence, status)

  if (viewer === "none" || viewer === "unavailable") {
    return isEquipped ? { icon: null, text: notes.n8 } : null
  }

  if (row.visual === null) {
    return isEquipped
      ? { icon: "hidden", text: notes.n7 }
      : { icon: "hidden", text: notes.n6 }
  }

  const noun = visualNouns[row.visual]
  if (!isEquipped) {
    return { icon: "avatar", text: notes.n1(noun) }
  }
  if (viewer === "loading") {
    return { icon: "avatar", text: notes.n5 }
  }

  switch (status?.display[row.visual]) {
    case "shown":
      return { icon: "avatar", text: notes.n2(noun) }
    case "covered":
      return { icon: "hidden", text: notes.n3 }
    case "not-shown":
      return { icon: "hidden", text: notes.n4 }
    default:
      // Still on its way, or not reported yet.
      return { icon: "avatar", text: notes.n5 }
  }
}

/**
 * The loadout text after the "Your avatar" heading (section 18.5): what is
 * equipped and what is and is not shown. Never anything about the avatar's
 * body, and never an item name.
 */
export function loadoutText(
  rows: readonly StudioRow[],
  presence: AvatarPresence,
  status: AvatarViewerStatus | null,
): string {
  const { loadout } = studioContent
  const equippedRows = rows.filter((row) => row.equippedItem !== null)
  const viewer = viewerStateOf(presence, status)

  if (viewer !== "ready" && viewer !== "partial") {
    return equippedRows.length === 0
      ? loadout.nothingYet
      : loadout.equipped(equippedRows.map((row) => row.label).join(", "))
  }

  if (equippedRows.length === 0) {
    return loadout.baseOutfit
  }

  const shown: string[] = []
  const notShown: string[] = []
  for (const row of equippedRows) {
    const display = row.visual === null ? null : status?.display[row.visual]
    if (row.visual !== null && display === "shown") {
      shown.push(visualNouns[row.visual])
    } else if (display === "covered") {
      notShown.push(`${row.label} ${loadout.coveredReason}`)
    } else {
      notShown.push(row.label)
    }
  }

  return [
    shown.length > 0 ? loadout.shown(shown.join(", ")) : null,
    notShown.length > 0 ? loadout.notShown(notShown.join(", ")) : null,
  ]
    .filter((part) => part !== null)
    .join(" ")
}
