/**
 * Month arithmetic for the Plan calendar (FEATURE-013 D11, D21), from
 * integers only. A trip date string is never parsed as an instant (a UTC
 * parse) and never derived from an ISO timestamp. The only `Date` values
 * here are built from local-time year, month, and day integers, for the
 * length of a month and the weekday of its first day.
 *
 * Weeks start on Sunday and every label is en-US, as every other date in the
 * product (section 10.6, O6).
 */

/** One calendar month. `month` is 1 to 12. */
export type CalendarMonth = {
  year: number
  month: number
}

/** Visible weekday headers and their full names, Sunday first (PL33). */
export const WEEKDAYS = [
  { short: "Sun", long: "Sunday" },
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
] as const

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** Always six week rows, so the grid's height never changes (section 10.6). */
export const CALENDAR_WEEKS = 6

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** The month of a `YYYY-MM-DD` date, read from its digits. */
export function monthOfIso(iso: string): CalendarMonth {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) }
}

/** The day of the month of a `YYYY-MM-DD` date. */
export function dayOfIso(iso: string): number {
  return Number(iso.slice(8, 10))
}

export function isSameMonth(a: CalendarMonth, b: CalendarMonth): boolean {
  return a.year === b.year && a.month === b.month
}

/** A month `delta` months later (or earlier); the year follows. */
export function addMonths(value: CalendarMonth, delta: number): CalendarMonth {
  const index = value.year * 12 + (value.month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 }
}

/** "October 2026" (PL32). */
export function monthLabel(value: CalendarMonth): string {
  return `${MONTH_NAMES[value.month - 1]} ${value.year}`
}

/** Number of days in a month: day 0 of the next month is its last day. */
export function daysInMonth(value: CalendarMonth): number {
  return new Date(value.year, value.month, 0).getDate()
}

/** 0 for Sunday to 6 for Saturday, for the first day of a month. */
export function firstWeekday(value: CalendarMonth): number {
  return new Date(value.year, value.month - 1, 1).getDay()
}

/**
 * The month as six weeks of seven cells, Sunday first. A cell is the day's
 * `YYYY-MM-DD` date, or null outside the month.
 */
export function monthWeeks(value: CalendarMonth): (string | null)[][] {
  const lead = firstWeekday(value)
  const days = daysInMonth(value)
  const prefix = `${value.year}-${pad(value.month)}-`

  const weeks: (string | null)[][] = []
  for (let week = 0; week < CALENDAR_WEEKS; week += 1) {
    const cells: (string | null)[] = []
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = week * 7 + weekday - lead + 1
      cells.push(day >= 1 && day <= days ? `${prefix}${pad(day)}` : null)
    }
    weeks.push(cells)
  }
  return weeks
}
