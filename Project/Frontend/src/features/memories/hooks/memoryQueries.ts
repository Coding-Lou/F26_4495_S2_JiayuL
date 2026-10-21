import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  MemoryRequestError,
  memoryFailureKindOf,
  requestAllMemories,
  requestMemory,
  requestMemoryPage,
} from "../api/memories"
import type { MemoryPage, MemorySummary } from "../types/memory"

/** Page size of My Memories (D6): full rows of three and of four. */
export const MEMORY_PAGE_SIZE = 12

/**
 * Signed photo URLs live 15 minutes (section 17.3, D20). Data older than 5
 * minutes is requested again before or as it is shown, and data no screen
 * observes is discarded after 10, so old URLs are never rendered first.
 */
const MEMORY_STALE_MS = 5 * 60_000
const MEMORY_GC_MS = 10 * 60_000

/**
 * A user's Memories are theirs: every key starts with their subject (D21),
 * and the session cleanup empties the whole cache when a session ends.
 */
export function memoriesRootKey(subject: string | null) {
  return ["memories", "mine", subject] as const
}

/**
 * The complete collection (FEATURE-014 section 8). It sits under the list's
 * prefix, so every change that refreshes the list also refreshes it; the
 * list's own exact-key writes never touch it.
 */
export function ownerMemoryIndexKey(subject: string | null) {
  return ["memories", "mine", subject, "all"] as const
}

export function memoryDetailKey(subject: string | null, memoryId: string) {
  return ["memories", "detail", subject, memoryId.toLowerCase()] as const
}

const sharedOptions = {
  staleTime: MEMORY_STALE_MS,
  gcTime: MEMORY_GC_MS,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: false,
  networkMode: "always",
  // Only a network or server failure is tried once more by itself.
  retry: (failureCount: number, error: unknown) =>
    failureCount < 1 && memoryFailureKindOf(error) === "unavailable",
} as const

/** My Memories, in pages of 12 in server order (section 8.4, D6). */
export function useMemoryPages() {
  const subject = getAuthenticatedSubject()

  return useInfiniteQuery({
    queryKey: memoriesRootKey(subject),
    queryFn: ({ pageParam, signal }) => {
      if (subject === null) {
        throw new MemoryRequestError("no-session")
      }
      return requestMemoryPage(pageParam, MEMORY_PAGE_SIZE, signal)
    },
    initialPageParam: 0,
    getNextPageParam: (last: MemoryPage) =>
      last.page < last.totalPages - 1 ? last.page + 1 : undefined,
    enabled: subject !== null,
    ...sharedOptions,
  })
}

/**
 * Every Memory of the signed-in user, read whole (FEATURE-014 section 8), for
 * a screen that must know whether a Memory exists. No request without a
 * subject or before the caller enables it.
 *
 * Its own options, not My Memories': it runs every time a screen that uses
 * it mounts, so a Memory saved elsewhere shows on return; never on window
 * focus, reconnect, or a timer. A network or server failure is tried once
 * more by itself; an incomplete collection is not.
 */
export function useOwnerMemoryIndex(enabled: boolean) {
  const subject = getAuthenticatedSubject()

  return useQuery<MemorySummary[]>({
    queryKey: ownerMemoryIndexKey(subject),
    queryFn: ({ signal }) => {
      if (subject === null) {
        throw new MemoryRequestError("no-session")
      }
      return requestAllMemories(signal)
    },
    enabled: subject !== null && enabled,
    staleTime: MEMORY_STALE_MS,
    gcTime: MEMORY_GC_MS,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: "always",
    retry: (failureCount, error) =>
      failureCount < 1 && memoryFailureKindOf(error) === "unavailable",
  })
}

/** One Memory. No request without a subject or with a non-UUID id. */
export function useMemoryDetail(memoryId: string | null) {
  const subject = getAuthenticatedSubject()

  return useQuery({
    queryKey: memoryDetailKey(subject, memoryId ?? ""),
    queryFn: ({ signal }) => {
      if (subject === null || memoryId === null) {
        throw new MemoryRequestError("no-session")
      }
      return requestMemory(memoryId, signal)
    },
    enabled: subject !== null && memoryId !== null,
    ...sharedOptions,
  })
}

/** Removes one Memory from every cached page of the list (section 17.4). */
export function dropFromMemoryPages(
  queryClient: QueryClient,
  subject: string | null,
  memoryId: string,
) {
  const id = memoryId.toLowerCase()
  queryClient.setQueryData<InfiniteData<MemoryPage, number>>(
    memoriesRootKey(subject),
    (data) => {
      if (data === undefined) {
        return data
      }
      let removed = 0
      const pages = data.pages.map((page) => {
        const items = page.items.filter((item) => item.id !== id)
        removed += page.items.length - items.length
        return items.length === page.items.length ? page : { ...page, items }
      })
      if (removed === 0) {
        return data
      }
      return {
        ...data,
        pages: pages.map((page) => ({
          ...page,
          totalItems: Math.max(0, page.totalItems - removed),
        })),
      }
    },
  )
}
