import { isGearCategory } from "@/features/gear"
import { isIsoDate } from "@/features/planning/tripDate"

/**
 * The loadout in session storage (FEATURE-005 sections 8.2, 8.3, 9).
 *
 * One `sessionStorage` key, defined only here, holding one versioned JSON
 * value: the owner's subject (the `sub` claim, an identifier kept for
 * ownership only and never shown or logged), and per trip a map from gear
 * category to the id of the one item equipped in it, with a timestamp used
 * only for eviction. Identifiers only: no token, no claim other than the
 * subject, and no item name or description. Never `localStorage`.
 *
 * What is read back is untrusted. A value that does not parse, has another
 * version, has no owner or another owner, or has the wrong shape is
 * discarded whole and the key removed. A malformed trip or category entry is
 * dropped and the rest kept.
 */
const LOADOUT_STORAGE_KEY = "outdoor-trip-companion.loadout"

const LOADOUT_VERSION = 1

/** At most this many trips are kept; the oldest `updatedAt` goes first. */
export const MAX_STORED_TRIPS = 20

/** `${trailId.toLowerCase()}/${tripDate}` */
export type TripKey = string

export type TripLoadout = {
  /** `GearCategory` wire value → gear item id. */
  equipped: Readonly<Record<string, string>>
  /** Epoch milliseconds. */
  updatedAt: number
}

export type StoredTrips = Readonly<Record<TripKey, TripLoadout>>

type StoredLoadouts = {
  version: typeof LOADOUT_VERSION
  owner: string
  trips: Record<TripKey, TripLoadout>
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const ITEM_ID = new RegExp(`^${UUID}$`, "i")
const TRIP_KEY = new RegExp(`^(${UUID})/(\\d{4}-\\d{2}-\\d{2})$`, "i")

export function tripKeyOf(trailId: string, tripDate: string): TripKey {
  return `${trailId.toLowerCase()}/${tripDate}`
}

/** The trip date of a key that has passed the checks of section 8.3. */
function tripDateOf(key: TripKey): string | null {
  const match = TRIP_KEY.exec(key)
  return match !== null && isIsoDate(match[2]) ? match[2] : null
}

/**
 * Whether an entry can be stored at all: a known category and an item id
 * that has the form of a UUID (section 8.3).
 */
export function isStorableEntry(category: string, itemId: string): boolean {
  return isGearCategory(category) && ITEM_ID.test(itemId)
}

/**
 * The trips stored for `owner`, with every trip whose date is before `today`
 * removed. Anything that cannot be trusted is removed from storage. An empty
 * object when nothing usable is stored or storage cannot be reached.
 */
export function readStoredTrips(owner: string, today: string): StoredTrips {
  let raw: string | null
  try {
    raw = window.sessionStorage.getItem(LOADOUT_STORAGE_KEY)
  } catch {
    return {}
  }
  if (raw === null) {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearStoredLoadouts()
    return {}
  }

  const read = readValue(parsed, owner, today)
  if (read === null) {
    clearStoredLoadouts()
    return {}
  }

  // Something was dropped: what remains is written back corrected.
  if (read.dropped) {
    writeStoredTrips(owner, read.trips)
  }
  return read.trips
}

function readValue(
  value: unknown,
  owner: string,
  today: string,
): { trips: Record<TripKey, TripLoadout>; dropped: boolean } | null {
  if (!isRecord(value) || value.version !== LOADOUT_VERSION) {
    return null
  }
  // Someone else's, or no one's: not restored, in whole or in part.
  if (typeof value.owner !== "string" || value.owner !== owner) {
    return null
  }
  if (!isRecord(value.trips)) {
    return null
  }

  const trips: Record<TripKey, TripLoadout> = {}
  let dropped = false

  for (const [key, entry] of Object.entries(value.trips)) {
    const tripDate = tripDateOf(key)
    if (
      tripDate === null ||
      !isRecord(entry) ||
      !isRecord(entry.equipped) ||
      typeof entry.updatedAt !== "number" ||
      !Number.isFinite(entry.updatedAt)
    ) {
      dropped = true
      continue
    }
    // A trip whose date has passed is removed when the value is read.
    if (tripDate < today) {
      dropped = true
      continue
    }

    const equipped: Record<string, string> = {}
    for (const [category, itemId] of Object.entries(entry.equipped)) {
      if (typeof itemId === "string" && isStorableEntry(category, itemId)) {
        equipped[category] = itemId
      } else {
        dropped = true
      }
    }

    // A trip with nothing equipped is not stored.
    if (Object.keys(equipped).length === 0) {
      dropped = true
      continue
    }

    trips[key.toLowerCase()] = { equipped, updatedAt: entry.updatedAt }
  }

  return { trips, dropped }
}

/**
 * Writes `owner`'s trips: only storable entries, only trips with something
 * equipped, at most `MAX_STORED_TRIPS` of them. With nothing left the key is
 * removed. Returns false when storage is unavailable or full; the caller then
 * keeps working in memory and reports nothing.
 */
export function writeStoredTrips(owner: string, trips: StoredTrips): boolean {
  const kept: Record<TripKey, TripLoadout> = {}
  for (const [key, trip] of Object.entries(trips)) {
    const equipped: Record<string, string> = {}
    for (const [category, itemId] of Object.entries(trip.equipped)) {
      if (isStorableEntry(category, itemId)) {
        equipped[category] = itemId
      }
    }
    if (Object.keys(equipped).length > 0) {
      kept[key] = { equipped, updatedAt: trip.updatedAt }
    }
  }

  const keys = Object.keys(kept)
  if (keys.length === 0) {
    clearStoredLoadouts()
    return true
  }

  const stored: StoredLoadouts = {
    version: LOADOUT_VERSION,
    owner,
    trips: Object.fromEntries(
      newestTrips(kept, MAX_STORED_TRIPS).map((key) => [key, kept[key]]),
    ),
  }

  try {
    window.sessionStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

export function clearStoredLoadouts(): void {
  try {
    window.sessionStorage.removeItem(LOADOUT_STORAGE_KEY)
  } catch {
    // Nothing was stored that could be read back.
  }
}

/** The `limit` trips with the newest `updatedAt`. */
export function newestTrips(trips: StoredTrips, limit: number): TripKey[] {
  return Object.keys(trips)
    .sort((a, b) => trips[b].updatedAt - trips[a].updatedAt)
    .slice(0, limit)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
