import { useSyncExternalStore } from "react"
import { getAuthenticatedSubject } from "@/features/auth"
import { todayIso } from "@/features/planning/tripDate"
import {
  MAX_STORED_TRIPS,
  clearStoredLoadouts,
  newestTrips,
  readStoredTrips,
  tripKeyOf,
  writeStoredTrips,
  type StoredTrips,
} from "../storage/loadoutStorage"

/**
 * The loadout: what the signed-in user has equipped, per trip (FEATURE-005
 * sections 8, 9). Session-scoped frontend state, owned by this module alone.
 * The gear rows and the avatar read it; only Equip, Unequip, an item change,
 * and the reconciliation of section 8.4 write it.
 *
 * It lives outside React so that a session that ends can discard it at once,
 * from outside any component, as the planner's state does.
 *
 * It belongs to one subject. Nothing is read from storage before that subject
 * is known, and nothing is written without one: with no subject the loadout
 * lives in memory only.
 */

type LoadoutState = {
  /** The subject this state belongs to; null when there is none. */
  owner: string | null
  trips: StoredTrips
}

const EMPTY: Readonly<Record<string, string>> = Object.freeze({})

let state: LoadoutState | null = null
/**
 * Set when the session ended in this document. Until a signed-in visit to
 * the Studio reopens it, nothing is read or written.
 */
let closed = false

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * The state for whoever is signed in now. When the subject is not the one the
 * state in memory belongs to, that state is dropped and the new subject's
 * stored value, if any and if theirs, is read.
 */
function current(): LoadoutState {
  const subject = closed ? null : getAuthenticatedSubject()
  if (state === null || state.owner !== subject) {
    state = {
      owner: subject,
      trips: subject === null ? {} : readStoredTrips(subject, todayIso()),
    }
  }
  return state
}

/**
 * What is stored as equipped for one trip, before it is confirmed against the
 * gear list (section 8.4). An empty object when nothing is.
 */
export function useStoredTripLoadout(
  trailId: string,
  tripDate: string,
): Readonly<Record<string, string>> {
  const key = tripKeyOf(trailId, tripDate)
  const select = () => current().trips[key]?.equipped ?? EMPTY
  return useSyncExternalStore(subscribe, select, select)
}

/**
 * Replaces what is equipped for one trip. An empty map removes the trip.
 * Written to storage at once when there is an owner; a write that fails
 * leaves the loadout working in memory for the visit, with nothing reported.
 */
export function setTripLoadout(
  trailId: string,
  tripDate: string,
  equipped: Readonly<Record<string, string>>,
): void {
  const now = current()
  const key = tripKeyOf(trailId, tripDate)
  const previous = now.trips[key]?.equipped ?? EMPTY
  if (sameEntries(previous, equipped)) {
    return
  }

  const trips: Record<string, StoredTrips[string]> = { ...now.trips }
  if (Object.keys(equipped).length === 0) {
    delete trips[key]
  } else {
    trips[key] = { equipped: { ...equipped }, updatedAt: Date.now() }
  }

  // The cap applies in memory as well, so memory and storage agree.
  const kept = newestTrips(trips, MAX_STORED_TRIPS)
  state = {
    owner: now.owner,
    trips: Object.fromEntries(kept.map((tripKey) => [tripKey, trips[tripKey]])),
  }

  if (!closed && state.owner !== null) {
    writeStoredTrips(state.owner, state.trips)
  }
  notify()
}

/**
 * The session ended (sign-out, expiry), or a startup found none: the key is
 * removed and the loadout in memory reset (section 9).
 */
export function endLoadoutSession(): void {
  clearStoredLoadouts()
  closed = true
  state = null
  notify()
}

/** A signed-in visit to the Studio after a session ended in this document. */
export function openLoadoutSession(): void {
  if (!closed) {
    return
  }
  closed = false
  state = null
  notify()
}

function sameEntries(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const aKeys = Object.keys(a)
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) => a[key] === b[key])
  )
}
