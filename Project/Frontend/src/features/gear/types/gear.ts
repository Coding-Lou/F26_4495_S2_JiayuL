/**
 * Contract of `/api/users/me/gear` (FEATURE-005 section 6.1): the signed-in
 * user's durable owned inventory.
 *
 * `GearCategory` values stay the backend's wire values. They are turned into
 * words only where they are displayed.
 */

/** The eleven `GearCategory` wire values, in the backend enum's order. */
export const GEAR_CATEGORY_VALUES = [
  "FOOTWEAR",
  "RAIN_GEAR",
  "WARM_LAYER",
  "WIND_LAYER",
  "TREKKING_POLES",
  "TRACTION",
  "HEADLAMP",
  "BACKPACK",
  "WATER",
  "FOOD",
  "SUN_PROTECTION",
] as const

export type GearCategory = (typeof GEAR_CATEGORY_VALUES)[number]

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(GEAR_CATEGORY_VALUES)

export function isGearCategory(value: unknown): value is GearCategory {
  return typeof value === "string" && KNOWN_CATEGORIES.has(value)
}

/** As the screens hold it, after the checks of `../api/gearItems.ts`. */
export type GearItem = {
  id: string
  /** The user's own words. Rendered as text only, never stored. */
  name: string
  /** A wire value, an unknown string, or null: the field is nullable (G3). */
  category: string | null
  description: string | null
  createdAt: string | null
}

/** What this feature sends. A category is always sent (G6). */
export type CreateGearItemRequest = {
  /** Trimmed, 1 to 100 characters. */
  name: string
  category: GearCategory
}

/**
 * What an edit sends (FEATURE-007 section 8.3). `PUT` replaces every field,
 * so `description` is always the item's current value, unchanged, and null
 * only when it has none.
 */
export type UpdateGearItemRequest = {
  /** Trimmed, 1 to 100 characters. */
  name: string
  category: GearCategory
  description: string | null
}

/** The longest name the backend accepts. */
export const GEAR_NAME_MAX_LENGTH = 100

/**
 * Why a gear request produced no usable answer, as far as the browser can
 * tell. Status-based (G7): no backend text and no status code is kept.
 */
export type GearFailureKind =
  | "timeout"
  /** A network error, a server failure, or a refusal of the request. */
  | "unavailable"
  /** `POST` or `PUT`: the backend refused the values (`400`). */
  | "rejected"
  /**
   * `PUT` only: the item is no longer in the inventory (`404`), removed in
   * another tab or session (FEATURE-007 D10). A `DELETE` `404` is a removal.
   */
  | "not-found"
  /** A `2xx` answer that is not the contract's shape. */
  | "unusable"
  /** There was no session, so no request was made. FEATURE-002 takes over. */
  | "no-session"
