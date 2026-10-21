/**
 * Contract of the FEATURE-008 public Memory API, as FEATURE-010 reads it
 * (FEATURE-010 sections 6 and 22.3). These are the public shapes only: they
 * have no visibility, owner, author, storage key, or update time, because no
 * public response carries one. The server alone decides what is public.
 */

/**
 * One public photo. `url` is a short-lived signed address: presentation only.
 * It is never stored, used as a key or an identifier, or put in the address
 * (section 12.3). The same shape as FEATURE-009's `MemoryPhoto`, so the
 * read-only photo pieces accept it.
 */
export type PublicPhoto = {
  /** A UUID, lower case. */
  id: string
  position: number
  url: string
  /** Epoch milliseconds, or null when the server's value cannot be read. */
  urlExpiresAt: number | null
}

/** `PublicMemorySummary`: one entry of a trail's Community Memories. */
export type PublicMemorySummary = {
  /** A UUID, lower case. */
  id: string
  /** A UUID, lower case. */
  trailId: string
  /** `YYYY-MM-DD`, a local calendar date. */
  tripDate: string
  title: string
  /** At most 240 characters, cut at a word by the server; null without one. */
  storyExcerpt: string | null
  /** Whether the server cut the story to make the excerpt. */
  storyTruncated: boolean
  photoCount: number
  coverPhoto: PublicPhoto | null
  createdAt: string
}

/** `PublicMemoryDetail`: one public Memory, read in full. */
export type PublicMemoryDetail = {
  id: string
  trailId: string
  tripDate: string
  title: string
  story: string | null
  /** Ascending position: the first is the cover. */
  photos: PublicPhoto[]
  createdAt: string
}

/** `MemoryPage<T>` of the public list. */
export type PublicMemoryPage<T> = {
  items: T[]
  page: number
  size: number
  /** The trail's number of public Memories. */
  totalItems: number
  totalPages: number
}

/**
 * Why a public Memory read produced nothing usable. No status code, `code`
 * value, or backend text is kept beyond this.
 */
export type CommunityFailureKind =
  /** Network, or a server failure: worth one more automatic attempt. */
  | "unavailable"
  | "timeout"
  /** `404`: the Memory is not public, deleted, missing, or trail-less. */
  | "not-found"
  /** Any other refusal, or a `2xx` that cannot be read or checked. */
  | "refused"
