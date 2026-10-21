import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  createMemory,
  deleteMemory,
  removeMemoryPhoto,
  reorderMemoryPhotos,
  updateMemory,
  uploadMemoryPhoto,
} from "../api/memories"
import type {
  CreateMemoryRequest,
  MemoryDetail,
  MemoryPhoto,
  UpdateMemoryRequest,
} from "../types/memory"
import {
  dropFromMemoryPages,
  memoriesRootKey,
  memoryDetailKey,
} from "./memoryQueries"

/**
 * Every change to a Memory (section 17.4). None is optimistic and none is
 * retried by itself: the cache is updated from the server's answer only,
 * then the affected queries are requested again. A failure leaves the cache
 * as it was, so nothing shows a change the server did not make.
 */
export function useMemoryChanges() {
  const queryClient = useQueryClient()
  const subject = getAuthenticatedSubject()

  return useMemo(() => {
    const listKey = memoriesRootKey(subject)
    const detailKey = (id: string) => memoryDetailKey(subject, id)
    const refreshList = () =>
      void queryClient.invalidateQueries({ queryKey: listKey })
    const refreshDetail = (id: string) =>
      void queryClient.invalidateQueries({ queryKey: detailKey(id) })

    return {
      async create(request: CreateMemoryRequest): Promise<MemoryDetail> {
        const memory = await createMemory(request)
        queryClient.setQueryData(detailKey(memory.id), memory)
        refreshList()
        return memory
      },

      async update(
        id: string,
        request: UpdateMemoryRequest,
      ): Promise<MemoryDetail | null> {
        const memory = await updateMemory(id, request)
        if (memory !== null) {
          queryClient.setQueryData(detailKey(id), memory)
        } else {
          refreshDetail(id)
        }
        refreshList()
        return memory
      },

      async remove(id: string): Promise<void> {
        await deleteMemory(id)
        queryClient.removeQueries({ queryKey: detailKey(id), exact: true })
        dropFromMemoryPages(queryClient, subject, id)
        refreshList()
      },

      async uploadPhoto(
        memoryId: string,
        photo: Blob,
        filename: string,
        cancel?: AbortSignal,
      ): Promise<MemoryPhoto | null> {
        const added = await uploadMemoryPhoto(memoryId, photo, filename, cancel)
        if (added !== null) {
          // Appended at the end by the server (section 5.2).
          queryClient.setQueryData<MemoryDetail>(detailKey(memoryId), (memory) =>
            memory === undefined || memory.photos.some((p) => p.id === added.id)
              ? memory
              : { ...memory, photos: [...memory.photos, added] },
          )
        }
        refreshDetail(memoryId)
        refreshList()
        return added
      },

      async reorderPhotos(
        memoryId: string,
        photoIds: readonly string[],
      ): Promise<MemoryPhoto[] | null> {
        const photos = await reorderMemoryPhotos(memoryId, photoIds)
        if (photos !== null) {
          queryClient.setQueryData<MemoryDetail>(detailKey(memoryId), (memory) =>
            memory === undefined ? memory : { ...memory, photos },
          )
        }
        refreshDetail(memoryId)
        refreshList()
        return photos
      },

      async removePhoto(memoryId: string, photoId: string): Promise<void> {
        await removeMemoryPhoto(memoryId, photoId)
        queryClient.setQueryData<MemoryDetail>(detailKey(memoryId), (memory) =>
          memory === undefined
            ? memory
            : { ...memory, photos: memory.photos.filter((p) => p.id !== photoId) },
        )
        refreshDetail(memoryId)
        refreshList()
      },

      /** The Memory is gone (section 19.6): the list catches up. */
      memoryGone(memoryId: string) {
        dropFromMemoryPages(queryClient, subject, memoryId)
        refreshList()
      },
    }
  }, [queryClient, subject])
}
