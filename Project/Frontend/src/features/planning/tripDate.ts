/**
 * Trip dates are local calendar dates, written `YYYY-MM-DD` (FEATURE-003
 * section 11.1). Nothing here goes through UTC: a date is built from, and
 * read back with, the device's local calendar only.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const MONTHS_LONG = [
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

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local noon, so that adding days never lands on a daylight-saving edge. */
function toLocalDate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso)
  if (match === null) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)

  // Rejects values such as 2026-02-31, which the Date constructor rolls over.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

/** Whether a string is a real calendar date written `YYYY-MM-DD`. */
export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && toLocalDate(value) !== null
}

/** Today in the device's local calendar. */
export function todayIso(): string {
  return toIso(new Date())
}

/** A valid date `days` after another. */
export function addDays(iso: string, days: number): string {
  const date = toLocalDate(iso)
  if (date === null) {
    return iso
  }

  date.setDate(date.getDate() + days)
  return toIso(date)
}

/** 0 for Sunday to 6 for Saturday. */
function weekdayOf(iso: string): number {
  return toLocalDate(iso)?.getDay() ?? 0
}

/** "Sat, Oct 17"; the year is added only outside the current calendar year. */
export function formatTripDateShort(iso: string, today = todayIso()): string {
  const date = toLocalDate(iso)
  if (date === null) {
    return ""
  }

  const text = `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
  return sameYear(iso, today) ? text : `${text}, ${date.getFullYear()}`
}

/** "Saturday, October 17", for accessible names. */
export function formatTripDateLong(iso: string, today = todayIso()): string {
  const date = toLocalDate(iso)
  if (date === null) {
    return ""
  }

  const text = `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_LONG[date.getMonth()]} ${date.getDate()}`
  return sameYear(iso, today) ? text : `${text}, ${date.getFullYear()}`
}

function sameYear(a: string, b: string): boolean {
  return a.slice(0, 4) === b.slice(0, 4)
}

export type DateQuickPick = {
  date: string
  /** "Today", "Tomorrow", or the date in words. */
  label: string
}

/**
 * Today, tomorrow, and the first Saturday and Sunday on or after today. A
 * weekend day that is today or tomorrow is not listed twice (section 11.5.2).
 */
export function dateQuickPicks(today = todayIso()): DateQuickPick[] {
  const tomorrow = addDays(today, 1)
  const picks: DateQuickPick[] = [
    { date: today, label: "Today" },
    { date: tomorrow, label: "Tomorrow" },
  ]

  const weekday = weekdayOf(today)
  const saturday = addDays(today, (6 - weekday + 7) % 7)
  const sunday = addDays(today, (7 - weekday) % 7)

  for (const date of [saturday, sunday]) {
    if (date !== today && date !== tomorrow) {
      picks.push({ date, label: formatTripDateShort(date, today) })
    }
  }

  return picks
}
