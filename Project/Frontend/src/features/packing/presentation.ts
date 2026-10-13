import type { GearRow } from "./gearCategories"

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
