/**
 * Contract of the FEATURE-008 owner Memory API, as FEATURE-009 holds it
 * (FEATURE-009 section 5.2). Wire enum values stay canonical here; they are
 * turned into words only where they are shown.
 *
 * No owner, storage key, or internal field exists in these types: the owner
 * responses carry none, and nothing here would read one.
 */

export const MEMORY_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const

export type MemoryVisibility = (typeof MEMORY_VISIBILITIES)[number]

export function isMemoryVisibility(value: unknown): value is MemoryVisibility {
  return value === "PRIVATE" || value === "PUBLIC"
}

/**
 * One photo as the server answered. `url` is a short-lived signed address:
 * presentation only. It is never stored, used as a key or an identifier, or
 * sent back (section 17.3). Mutations use `id`.
 */
export type MemoryPhoto = {
  /** A UUID, lower case. */
  id: string
  position: number
  url: string
  /** Epoch milliseconds, or null when the server's value cannot be read. */
  urlExpiresAt: number | null
}

/** `OwnerMemorySummary`: one card of My Memories. */
export type MemorySummary = {
  id: string
  /** A UUID, lower case. */
  trailId: string
  /** `YYYY-MM-DD`, a local calendar date. */
  tripDate: string
  title: string
  visibility: MemoryVisibility
  photoCount: number
  coverPhoto: MemoryPhoto | null
}

/** `OwnerMemoryDetail`: one Memory, read in full. */
export type MemoryDetail = {
  id: string
  trailId: string
  tripDate: string
  title: string
  story: string | null
  visibility: MemoryVisibility
  /** Ascending position: the first is the cover. */
  photos: MemoryPhoto[]
}

/** `MemoryPage<OwnerMemorySummary>`. */
export type MemoryPage = {
  items: MemorySummary[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type CreateMemoryRequest = {
  trailId: string
  tripDate: string
  title: string
  /** Omitted when blank. */
  story?: string
  visibility: MemoryVisibility
}

/** Full replacement; never carries `trailId` (section 14.2). */
export type UpdateMemoryRequest = {
  tripDate: string
  title: string
  story: string | null
  visibility: MemoryVisibility
}

/** A field the server named in a `400 VALIDATION_ERROR`. */
export type MemoryField = "title" | "story" | "tripDate"

/**
 * Why a Memory request produced nothing usable (section 17.1). No status
 * code, `code` value, or backend text is kept beyond this.
 */
export type MemoryFailureKind =
  | "no-session"
  | "timeout"
  /** Network, or a server failure other than the coded `503`s. */
  | "unavailable"
  /** `400`, possibly with fields the server named. */
  | "rejected"
  /** `400 TRAIL_NOT_FOUND` */
  | "trail-missing"
  /** `503 TRAIL_SERVICE_UNAVAILABLE` */
  | "trail-check-unavailable"
  | "not-found"
  /** `409` */
  | "photo-limit"
  /** `413` */
  | "too-large"
  /** `415` */
  | "unsupported"
  /** `503 STORAGE_UNAVAILABLE` */
  | "storage-unavailable"
  /** A `2xx` that cannot be read or fails response checking. */
  | "unusable"
