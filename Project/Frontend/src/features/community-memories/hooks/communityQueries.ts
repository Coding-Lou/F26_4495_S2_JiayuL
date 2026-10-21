import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  communityFailureKindOf,
  requestPublicMemory,
  requestPublicMemoryPage,
} from "../api/publicMemories"
import type {
  PublicMemoryPage,
  PublicMemorySummary,
} from "../types/publicMemory"

/** The popup preview's request: the first two, in server order (§8.2). */
export const PREVIEW_SIZE = 2
/** The Community panel's page size (§18.5, Q11). */
export const LIST_PAGE_SIZE = 8

/**
 * Signed photo URLs live about 15 minutes (§12.2). Data older than 5 minutes
 * is requested again before or as it is shown, and data no screen observes
 * is discarded after 10, so old URLs are never rendered first.
 */
const COMMUNITY_STALE_MS = 5 * 60_000
const COMMUNITY_GC_MS = 10 * 60_000

/*
 * Public keys (§12.1). No subject: public data is the same for every
 * visitor. They never share a prefix with the owner keys (`["memories", …]`),
 * which this feature never reads, writes, or invalidates. Ids are lower case.
 */
export function previewKey(trailId: string) {
  return ["community-memories", "trail", trailId.toLowerCase(), "preview"] as const
}

export function listKey(trailId: string) {
  return ["community-memories", "trail", trailId.toLowerCase(), "list"] as const
}

export function detailKey(memoryId: string) {
  return ["community-memories", "detail", memoryId.toLowerCase()] as const
}

const sharedOptions = {
  staleTime: COMMUNITY_STALE_MS,
  gcTime: COMMUNITY_GC_MS,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: false,
  networkMode: "always",
  // Only an unavailable service (network, 5xx) is tried once more by itself.
  retry: (failureCount: number, error: unknown) =>
    failureCount < 1 && communityFailureKindOf(error) === "unavailable",
} as const

/**
 * The popup preview of one trail (§8). `trailId` is null for no trail and
 * for a synthetic trail: no request is made then (§13). Each trail is its own
 * key, and the popup reads only its own trail's, so a late answer for an
 * earlier trail can never appear in another trail's popup (§12.4).
 */
export function usePublicMemoryPreview(trailId: string | null) {
  const id = trailId?.toLowerCase() ?? null
  return useQuery({
    queryKey: previewKey(id ?? ""),
    queryFn:
      id === null
        ? skipToken
        : ({ signal }) => requestPublicMemoryPage(id, 0, PREVIEW_SIZE, signal),
    ...sharedOptions,
  })
}

/**
 * The preview's cached answer, read without ever requesting it: the panel's
 * header may show its count before the list has its own (§18.3).
 */
export function useCachedPreview(trailId: string) {
  return useQuery<PublicMemoryPage<PublicMemorySummary>>({
    queryKey: previewKey(trailId),
    queryFn: skipToken,
    ...sharedOptions,
  })
}

/**
 * The Community panel's list, 8 per page, appended by Show older memories
 * (§9.2, §18.5). `enabled` is true only while the panel shows the list for
 * that trail: a Detail opened from the popup requests no list.
 */
export function usePublicMemoryList(trailId: string, enabled: boolean) {
  const id = trailId.toLowerCase()
  return useInfiniteQuery({
    enabled,
    queryKey: listKey(id),
    queryFn: ({ pageParam, signal }) =>
      requestPublicMemoryPage(id, pageParam, LIST_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (last: PublicMemoryPage<PublicMemorySummary>) =>
      last.page < last.totalPages - 1 ? last.page + 1 : undefined,
    ...sharedOptions,
  })
}

/** One public Memory, only while its Detail is shown (§10). */
export function usePublicMemoryDetail(memoryId: string) {
  const id = memoryId.toLowerCase()
  return useQuery({
    queryKey: detailKey(id),
    queryFn: ({ signal }) => requestPublicMemory(id, signal),
    ...sharedOptions,
  })
}
