import { publicRequest } from "@/features/trails/api/publicRequest"
import type {
  CommunityFailureKind,
  PublicMemoryDetail,
  PublicMemoryPage,
  PublicMemorySummary,
  PublicPhoto,
} from "../types/publicMemory"

/**
 * The two public Memory reads of FEATURE-008 (FEATURE-010 sections 6, 19.1):
 * a trail's public Memories, one page at a time, and one public Memory. Both
 * go through the tokenless `publicRequest`: no `Authorization` header and
 * `credentials: "omit"`, for every visitor. No owner endpoint is ever called
 * from this feature, and no visibility is checked here: the server alone
 * decides what is public.
 */
const PUBLIC_PATH = "/api/memories/public"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** A public Memory read that produced no usable answer, and which kind. */
export class CommunityRequestError extends Error {
  readonly kind: CommunityFailureKind

  constructor(kind: CommunityFailureKind) {
    super("Public memory request failed")
    this.name = "CommunityRequestError"
    this.kind = kind
  }
}

export function communityFailureKindOf(error: unknown): CommunityFailureKind {
  return error instanceof CommunityRequestError ? error.kind : "unavailable"
}

/** Whether a value can be a Memory id (a UUID). */
export function isPublicMemoryId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}

function failureOfStatus(status: number): CommunityFailureKind {
  if (status === 404) {
    return "not-found"
  }
  return status >= 500 ? "unavailable" : "refused"
}

async function read<T>(
  path: string,
  cancel: AbortSignal,
  check: (body: unknown) => T | null,
): Promise<T> {
  const outcome = await publicRequest(path, cancel)
  switch (outcome.kind) {
    case "ok": {
      const value = check(outcome.body)
      if (value === null) {
        throw new CommunityRequestError("refused")
      }
      return value
    }
    case "status":
      throw new CommunityRequestError(failureOfStatus(outcome.status))
    case "unreadable":
      throw new CommunityRequestError("refused")
    case "timeout":
      throw new CommunityRequestError("timeout")
    case "network":
      throw new CommunityRequestError("unavailable")
  }
}

/**
 * One page of a trail's public Memories, in server order (trip date newest
 * first). A trail that no longer exists answers `404`, which is shown as the
 * same failure as any other (section 14).
 */
export function requestPublicMemoryPage(
  trailId: string,
  page: number,
  size: number,
  cancel: AbortSignal,
): Promise<PublicMemoryPage<PublicMemorySummary>> {
  const query = new URLSearchParams({
    trailId,
    page: String(page),
    size: String(size),
  })
  return read(`${PUBLIC_PATH}?${query}`, cancel, readSummaryPage)
}

/** One public Memory. Private, deleted, or missing: `not-found`. */
export function requestPublicMemory(
  memoryId: string,
  cancel: AbortSignal,
): Promise<PublicMemoryDetail> {
  return read(
    `${PUBLIC_PATH}/${encodeURIComponent(memoryId)}`,
    cancel,
    readDetail,
  )
}

// ---------------------------------------------------------------------------
// Response checking (section 22.3). Responses are untrusted: invalid items are
// dropped, ids are lower-cased and kept once, photos are sorted by position.
// Only the fields of the public types are read; anything else is ignored.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }
  const match = ISO_DATE.exec(value)
  if (match === null) {
    return false
  }
  const month = Number(match[2])
  const day = Number(match[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

function readPhoto(value: unknown): PublicPhoto | null {
  if (!isRecord(value)) {
    return null
  }
  const { id, url, position, urlExpiresAt } = value
  if (!isPublicMemoryId(id) || typeof url !== "string" || url.trim() === "") {
    return null
  }
  const expires =
    typeof urlExpiresAt === "string" ? Date.parse(urlExpiresAt) : Number.NaN
  return {
    id: id.toLowerCase(),
    position:
      typeof position === "number" && Number.isFinite(position) ? position : 0,
    url,
    urlExpiresAt: Number.isFinite(expires) ? expires : null,
  }
}

function readPhotos(value: unknown): PublicPhoto[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const photos: PublicPhoto[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    const photo = readPhoto(entry)
    if (photo !== null && !seen.has(photo.id)) {
      seen.add(photo.id)
      photos.push(photo)
    }
  }
  // A stable sort: equal positions keep the server's order.
  return photos.sort((a, b) => a.position - b.position)
}

type Core = Pick<
  PublicMemorySummary,
  "id" | "trailId" | "tripDate" | "title" | "createdAt"
>

function readCore(record: Record<string, unknown>): Core | null {
  const { id, trailId, tripDate, title, createdAt } = record
  if (
    !isPublicMemoryId(id) ||
    !isPublicMemoryId(trailId) ||
    !isIsoDate(tripDate) ||
    typeof title !== "string" ||
    title.trim() === ""
  ) {
    return null
  }
  return {
    id: id.toLowerCase(),
    trailId: trailId.toLowerCase(),
    tripDate,
    title,
    createdAt: typeof createdAt === "string" ? createdAt : "",
  }
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function readSummary(value: unknown): PublicMemorySummary | null {
  if (!isRecord(value)) {
    return null
  }
  const core = readCore(value)
  if (core === null) {
    return null
  }
  return {
    ...core,
    storyExcerpt: readText(value.storyExcerpt),
    storyTruncated: value.storyTruncated === true,
    photoCount: readCount(value.photoCount) ?? 0,
    coverPhoto: value.coverPhoto == null ? null : readPhoto(value.coverPhoto),
  }
}

function readSummaryPage(
  value: unknown,
): PublicMemoryPage<PublicMemorySummary> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null
  }
  const page = readCount(value.page)
  const size = readCount(value.size)
  const totalItems = readCount(value.totalItems)
  const totalPages = readCount(value.totalPages)
  if (
    page === null ||
    size === null ||
    totalItems === null ||
    totalPages === null
  ) {
    return null
  }

  const items: PublicMemorySummary[] = []
  const seen = new Set<string>()
  for (const entry of value.items) {
    const item = readSummary(entry)
    if (item !== null && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, page, size, totalItems, totalPages }
}

function readDetail(value: unknown): PublicMemoryDetail | null {
  if (!isRecord(value)) {
    return null
  }
  const core = readCore(value)
  const photos = readPhotos(value.photos)
  if (core === null || photos === null) {
    return null
  }
  return { ...core, story: readText(value.story), photos }
}
