import { packContent } from "./content"
import type { GearRow } from "./gearCategories"
import type { PackItemStatus } from "./types/pack"

/**
 * How Trip Preparation writes the numbers it was given (FEATURE-004 sections
 * 17–19). Nothing here derives a value: a count is of the rows displayed, and
 * a rounding is of a number the backend returned.
 */

/** How many of the rows displayed are missing and owned (section 18). */
export function countGearRows(rows: readonly GearRow[]): {
  missing: number
  owned: number
} {
  const owned = rows.filter((row) => row.owned).length
  return { missing: rows.length - owned, owned }
}

/** The backend's percentage as the whole number it is shown as. */
export function wholePercent(value: number): number {
  return Math.round(value)
}

/** Rounded to a whole number; a negative value uses a minus sign ("−3"). */
export function wholeNumber(value: number): string {
  const rounded = Math.round(value)
  return rounded < 0 ? `−${Math.abs(rounded)}` : String(Math.abs(rounded))
}

/**
 * How many recommended categories the user does not own: each category is
 * counted once.
 */
export function missingCategoryCount(
  requiredGear: readonly PackItemStatus[],
): number {
  const owned = new Set(
    requiredGear.filter((item) => item.owned).map((item) => item.category),
  )
  const missing = new Set(
    requiredGear
      .filter((item) => !item.owned && !owned.has(item.category))
      .map((item) => item.category),
  )
  return missing.size
}

/**
 * The line under the Gear Readiness percentage: what it covers, from the
 * pack response alone. "All recommended gear covered" at 100% with nothing
 * missing; otherwise how many recommended items are missing. The percentage
 * itself is the backend's and is not recomputed.
 */
export function readinessLine(
  percentage: number,
  requiredGear: readonly PackItemStatus[],
): string {
  const { readiness } = packContent
  const missing = missingCategoryCount(requiredGear)
  if (missing > 0) {
    return readiness.missing(missing)
  }
  return percentage >= 100 ? readiness.covered : readiness.explanation
}
