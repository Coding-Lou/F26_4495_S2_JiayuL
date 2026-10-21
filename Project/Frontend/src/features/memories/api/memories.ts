import { isIsoDate } from "@/features/planning/tripDate"
import {
  isMemoryVisibility,
  type CreateMemoryRequest,
  type MemoryDetail,
  type MemoryFailureKind,
  type MemoryPage,
  type MemoryPhoto,
  type MemorySummary,
  type UpdateMemoryRequest,
} from "../types/memory"
import {
  MEMORY_UPLOAD_TIMEOUT_MS,
  memoryRequest,
  type MemoryRequestOutcome,
} from "./memoryRequest"

const MEMORIES_PATH = "/api/memories"

/** A Memory request that produced no usable answer, and which kind it was. */
export class MemoryRequestError extends Error {
  readonly kind: MemoryFailureKind
  /** For `rejected`: the fields the server named, as it named them. */
  readonly fields: readonly string[]

  constructor(kind: MemoryFailureKind, fields: readonly string[] = []) {
    super("Memory request failed")
    this.name = "MemoryRequestError"
    this.kind = kind
    this.fields = fields
  }
}

export function memoryFailureKindOf(error: unknown): MemoryFailureKind {
  return error instanceof MemoryRequestError ? error.kind : "unavailable"
}

export function memoryFailureFieldsOf(error: unknown): readonly string[] {
  return error instanceof MemoryRequestError ? error.fields : []
}

/** Every outcome that is not a `2xx`, as a failure (section 17.1). */
function failureOf(outcome: Exclude<MemoryRequestOutcome, { kind: "ok" }>) {
  switch (outcome.kind) {
    case "status":
      return new MemoryRequestError(
        statusFailureKind(outcome.status, outcome.problem.code),
        outcome.problem.fields,
      )
    case "unreadable":
      return new MemoryRequestError("unusable")
    case "timeout":
      return new MemoryRequestError("timeout")
    case "network":
      return new MemoryRequestError("unavailable")
    case "no-session":
      return new MemoryRequestError("no-session")
  }
}

function statusFailureKind(status: number, code: string | null): MemoryFailureKind {
  switch (status) {
    case 400:
      return code === "TRAIL_NOT_FOUND" ? "trail-missing" : "rejected"
    case 404:
      return "not-found"
    case 409:
      return "photo-limit"
    case 413:
      return "too-large"
    case 415:
      return "unsupported"
    case 503:
      if (code === "TRAIL_SERVICE_UNAVAILABLE") {
        return "trail-check-unavailable"
      }
      if (code === "STORAGE_UNAVAILABLE") {
        return "storage-unavailable"
      }
      return "unavailable"
    default:
      return "unavailable"
  }
}

function memoryPath(id: string): string {
  return `${MEMORIES_PATH}/${encodeURIComponent(id)}`
}

/** One page of the signed-in user's Memories, in server order (section 8.3). */
export async function requestMemoryPage(
  page: number,
  size: number,
  cancel: AbortSignal,
): Promise<MemoryPage> {
  const outcome = await memoryRequest(
    `${MEMORIES_PATH}?page=${page}&size=${size}`,
    { method: "GET" },
    { cancel },
  )
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  const result = readMemoryPage(outcome.body)
  if (result === null) {
    throw new MemoryRequestError("unusable")
  }
  return result
}

/** The contract's largest page: one request for up to 50 Memories. */
export const MEMORY_INDEX_PAGE_SIZE = 50

/** The most pages one complete read takes: 500 Memories. */
export const MEMORY_INDEX_MAX_PAGES = 10

/**
 * The whole collection could not be read as one consistent list (FEATURE-014
 * section 8): more than `MEMORY_INDEX_MAX_PAGES` pages, or the paging kept
 * changing after the one restart. Its kind is `unusable`, so the query does
 * not retry it by itself; it is never answered with a partial list.
 */
export class MemoryListIncompleteError extends MemoryRequestError {
  constructor() {
    super("unusable")
    this.name = "MemoryListIncompleteError"
  }
}

/** How one pass over the pages ended. */
type MemoryListPass =
  | { kind: "complete"; memories: MemorySummary[] }
  /** `totalPages` above the window: nothing past the first page is read. */
  | { kind: "overflow" }
  /** The metadata differed from the first page's, or the count did not add up. */
  | { kind: "changed" }

/**
 * Every Memory of the signed-in user, read whole (FEATURE-014 section 8):
 * page 0 with `size=50`, then the following pages in order, one at a time,
 * as one flat list in the server's order (`tripDate`, `createdAt`, `id`
 * descending), de-duplicated by `id`.
 *
 * Unlike My Memories' pages, one unreadable item fails the read: a missing
 * Memory would make a Plan look as if none had been kept. If the metadata
 * changes between pages, or the distinct count is not the first page's
 * `totalItems`, the read restarts from page 0 once; a second time, or more
 * than ten pages, is `MemoryListIncompleteError`.
 */
export async function requestAllMemories(
  cancel: AbortSignal,
): Promise<MemorySummary[]> {
  const first = await readAllMemoryPages(cancel)
  if (first.kind === "complete") {
    return first.memories
  }
  if (first.kind === "overflow") {
    throw new MemoryListIncompleteError()
  }

  // The one restart.
  const second = await readAllMemoryPages(cancel)
  if (second.kind === "complete") {
    return second.memories
  }
  throw new MemoryListIncompleteError()
}

async function readAllMemoryPages(cancel: AbortSignal): Promise<MemoryListPass> {
  const first = await requestStrictMemoryPage(0, cancel)
  if (first.totalPages > MEMORY_INDEX_MAX_PAGES) {
    return { kind: "overflow" }
  }

  const items = [...first.items]
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await requestStrictMemoryPage(page, cancel)
    if (
      next.totalItems !== first.totalItems ||
      next.totalPages !== first.totalPages
    ) {
      return { kind: "changed" }
    }
    items.push(...next.items)
  }

  const seen = new Set<string>()
  const memories: MemorySummary[] = []
  for (const memory of items) {
    if (!seen.has(memory.id)) {
      seen.add(memory.id)
      memories.push(memory)
    }
  }
  if (memories.length !== first.totalItems) {
    return { kind: "changed" }
  }
  return { kind: "complete", memories }
}

async function requestStrictMemoryPage(
  page: number,
  cancel: AbortSignal,
): Promise<MemoryPage> {
  const outcome = await memoryRequest(
    `${MEMORIES_PATH}?page=${page}&size=${MEMORY_INDEX_PAGE_SIZE}`,
    { method: "GET" },
    { cancel },
  )
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  const result = readStrictMemoryPage(outcome.body)
  if (result === null) {
    throw new MemoryRequestError("unusable")
  }
  return result
}

/** One of the signed-in user's Memories. Another user's is `not-found`. */
export async function requestMemory(
  id: string,
  cancel: AbortSignal,
): Promise<MemoryDetail> {
  const outcome = await memoryRequest(memoryPath(id), { method: "GET" }, { cancel })
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  const memory = readMemoryDetail(outcome.body)
  if (memory === null) {
    throw new MemoryRequestError("unusable")
  }
  return memory
}

/**
 * Creates one Memory (section 9.2, step 3). A `2xx` whose answer cannot be
 * read is `unusable`: the Memory may exist, but its id is not known, so the
 * caller treats it as an unconfirmed save.
 */
export async function createMemory(
  request: CreateMemoryRequest,
): Promise<MemoryDetail> {
  const body: CreateMemoryRequest = {
    trailId: request.trailId,
    tripDate: request.tripDate,
    title: request.title,
    visibility: request.visibility,
  }
  if (request.story !== undefined) {
    body.story = request.story
  }

  const outcome = await memoryRequest(MEMORIES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (outcome.kind !== "ok") {
    throw failureOf(outcome)
  }
  const memory = readMemoryDetail(outcome.body)
  if (memory === null) {
    throw new MemoryRequestError("unusable")
  }
  return memory
}

/**
 * Replaces the editable details (section 14.2). The body is always exactly
 * `{ tripDate, title, story, visibility }`; never `trailId`. Resolves with the
 * saved Memory, or null when it was saved but the answer cannot be read.
 */
export async function updateMemory(
  id: string,
  request: UpdateMemoryRequest,
): Promise<MemoryDetail | null> {
  const body: UpdateMemoryRequest = {
    tripDate: request.tripDate,
    title: request.title,
    story: request.story,
    visibility: request.visibility,
  }
  const outcome = await memoryRequest(memoryPath(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  switch (outcome.kind) {
    case "ok":
      return readMemoryDetail(outcome.body)
    case "unreadable":
      // Saved: the status said so. Its answer is simply not used.
      return null
    default:
      throw failureOf(outcome)
  }
}

/** Deletes one Memory. `204`, and `404` (already gone, D19), are success. */
export async function deleteMemory(id: string): Promise<void> {
  const outcome = await memoryRequest(memoryPath(id), { method: "DELETE" })
  switch (outcome.kind) {
    case "ok":
    case "unreadable":
      return
    case "status":
      if (outcome.status === 404) {
        return
      }
      throw failureOf(outcome)
    default:
      throw failureOf(outcome)
  }
}

/**
 * Adds one prepared photo (section 11.4): one `multipart/form-data` part
 * `file`, with the 60 s limit. The browser writes the `Content-Type` and its
 * boundary. Resolves with the photo, or null when it was added but the answer
 * cannot be read.
 */
export async function uploadMemoryPhoto(
  memoryId: string,
  photo: Blob,
  filename: string,
  cancel?: AbortSignal,
): Promise<MemoryPhoto | null> {
  const form = new FormData()
  form.append("file", photo, filename)

  const outcome = await memoryRequest(
    `${memoryPath(memoryId)}/photos`,
    { method: "POST", body: form },
    { cancel, timeoutMs: MEMORY_UPLOAD_TIMEOUT_MS },
  )
  switch (outcome.kind) {
    case "ok":
      return readPhoto(outcome.body)
    case "unreadable":
      return null
    default:
      throw failureOf(outcome)
  }
}

/**
 * Puts the photos in a new order (section 12). `photoIds` is every current
 * photo. Resolves with the photos in their new order, or null when the order
 * was saved but the answer cannot be read.
 */
export async function reorderMemoryPhotos(
  memoryId: string,
  photoIds: readonly string[],
): Promise<MemoryPhoto[] | null> {
  const outcome = await memoryRequest(`${memoryPath(memoryId)}/photos/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoIds }),
  })
  switch (outcome.kind) {
    case "ok":
      return readPhotos(outcome.body)
    case "unreadable":
      return null
    default:
      throw failureOf(outcome)
  }
}

/**
 * Removes one photo. A `404` for the photo alone means it is already gone,
 * which is the outcome asked for; a `404` for the Memory is `not-found`
 * (section 19.6).
 */
export async function removeMemoryPhoto(
  memoryId: string,
  photoId: string,
): Promise<void> {
  const outcome = await memoryRequest(
    `${memoryPath(memoryId)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  )
  switch (outcome.kind) {
    case "ok":
    case "unreadable":
      return
    case "status":
      if (outcome.status === 404 && outcome.problem.code === "PHOTO_NOT_FOUND") {
        return
      }
      throw failureOf(outcome)
    default:
      throw failureOf(outcome)
  }
}

// ---------------------------------------------------------------------------
// Response checking (section 17.1). Responses are untrusted: ids are UUID
// strings, visibility is one of the two values, photos have a string id and
// url. A malformed photo is dropped; a malformed Memory is not used.
// ---------------------------------------------------------------------------

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether a route segment can be a Memory id. */
export function isMemoryId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null
}

function readPhoto(value: unknown): MemoryPhoto | null {
  if (!isRecord(value)) {
    return null
  }
  const { id, url, position, urlExpiresAt } = value
  if (!isMemoryId(id) || typeof url !== "string" || url.trim() === "") {
    return null
  }
  const expires =
    typeof urlExpiresAt === "string" ? Date.parse(urlExpiresAt) : Number.NaN
  return {
    id: id.toLowerCase(),
    position: typeof position === "number" ? position : 0,
    url,
    urlExpiresAt: Number.isFinite(expires) ? expires : null,
  }
}

function readPhotos(value: unknown): MemoryPhoto[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const photos: MemoryPhoto[] = []
  for (const entry of value) {
    const photo = readPhoto(entry)
    if (photo !== null && !photos.some((known) => known.id === photo.id)) {
      photos.push(photo)
    }
  }
  return photos
}

type MemoryCore = Pick<
  MemorySummary,
  "id" | "trailId" | "tripDate" | "title" | "visibility"
>

function readCore(record: Record<string, unknown>): MemoryCore | null {
  const { id, trailId, tripDate, title, visibility } = record
  if (
    !isMemoryId(id) ||
    !isMemoryId(trailId) ||
    !isIsoDate(tripDate) ||
    typeof title !== "string" ||
    !isMemoryVisibility(visibility)
  ) {
    return null
  }
  return {
    id: id.toLowerCase(),
    trailId: trailId.toLowerCase(),
    tripDate,
    title,
    visibility,
  }
}

export function readMemoryDetail(value: unknown): MemoryDetail | null {
  if (!isRecord(value)) {
    return null
  }
  const core = readCore(value)
  const photos = readPhotos(value.photos)
  if (core === null || photos === null) {
    return null
  }
  return {
    ...core,
    story:
      typeof value.story === "string" && value.story.trim() !== ""
        ? value.story
        : null,
    // Ascending position, as the server orders them; kept as it is.
    photos,
  }
}

function readMemorySummary(value: unknown): MemorySummary | null {
  if (!isRecord(value)) {
    return null
  }
  const core = readCore(value)
  if (core === null) {
    return null
  }
  return {
    ...core,
    photoCount: readCount(value.photoCount) ?? 0,
    coverPhoto: value.coverPhoto == null ? null : readPhoto(value.coverPhoto),
  }
}

function readMemoryPage(value: unknown): MemoryPage | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null
  }
  const page = readCount(value.page)
  const size = readCount(value.size)
  const totalItems = readCount(value.totalItems)
  const totalPages = readCount(value.totalPages)
  if (page === null || size === null || totalItems === null || totalPages === null) {
    return null
  }

  const items: MemorySummary[] = []
  for (const entry of value.items) {
    const item = readMemorySummary(entry)
    if (item !== null) {
      items.push(item)
    }
  }
  return { items, page, size, totalItems, totalPages }
}

/**
 * A page for the complete read (FEATURE-014 section 8): as `readMemoryPage`,
 * except that one unreadable item makes the whole page unreadable.
 */
function readStrictMemoryPage(value: unknown): MemoryPage | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null
  }
  const page = readCount(value.page)
  const size = readCount(value.size)
  const totalItems = readCount(value.totalItems)
  const totalPages = readCount(value.totalPages)
  if (page === null || size === null || totalItems === null || totalPages === null) {
    return null
  }

  const items: MemorySummary[] = []
  for (const entry of value.items) {
    const item = readMemorySummary(entry)
    if (item === null) {
      return null
    }
    items.push(item)
  }
  return { items, page, size, totalItems, totalPages }
}
