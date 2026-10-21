import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  gearFailureKindOf,
  removeGearItem,
  updateGearItem,
} from "../api/gearItems"
import type { GearItem, UpdateGearItemRequest } from "../types/gear"
import { gearItemsQueryKey } from "./useGearItems"

export type UpdateGearItemVariables = {
  id: string
  request: UpdateGearItemRequest
}

/**
 * Changes one owned item (FEATURE-007 section 17). Not optimistic: on success
 * the cached item is replaced by the backend's answer, and the list is then
 * requested again. On `404` (the item is gone) the list is requested again so
 * the screen catches up. Never retried by itself: a second attempt is the
 * user's.
 */
export function useUpdateGearItem() {
  const queryClient = useQueryClient()
  const subject = getAuthenticatedSubject()

  return useMutation({
    mutationFn: ({ id, request }: UpdateGearItemVariables) =>
      updateGearItem(id, request),
    networkMode: "always",
    retry: false,
    onSuccess: (item: GearItem | null, { id }) => {
      const key = gearItemsQueryKey(subject)
      if (item !== null) {
        queryClient.setQueryData<GearItem[]>(key, (list) =>
          list?.map((entry) => (entry.id === id ? item : entry)),
        )
      }
      void queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error) => {
      if (gearFailureKindOf(error) === "not-found") {
        void queryClient.invalidateQueries({
          queryKey: gearItemsQueryKey(subject),
        })
      }
    },
  })
}

/**
 * Removes one owned item (FEATURE-007 section 17). Not optimistic: once the
 * backend has answered `2xx` or `404`, the item leaves the cached list, and
 * the list is then requested again. Never retried by itself.
 */
export function useRemoveGearItem() {
  const queryClient = useQueryClient()
  const subject = getAuthenticatedSubject()

  return useMutation({
    mutationFn: (id: string) => removeGearItem(id),
    networkMode: "always",
    retry: false,
    onSuccess: (_result: void, id) => {
      const key = gearItemsQueryKey(subject)
      queryClient.setQueryData<GearItem[]>(key, (list) =>
        list?.filter((entry) => entry.id !== id),
      )
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
