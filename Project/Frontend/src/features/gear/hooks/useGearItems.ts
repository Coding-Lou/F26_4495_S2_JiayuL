import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { getAuthenticatedSubject } from "@/features/auth"
import {
  GearRequestError,
  createGearItem,
  gearFailureKindOf,
  requestGearItems,
} from "../api/gearItems"
import type { CreateGearItemRequest, GearItem } from "../types/gear"

/**
 * What a user owns is theirs: the key starts with their subject, so one
 * user's list is never shown to another (FEATURE-005 section 9).
 */
export function gearItemsQueryKey(subject: string | null) {
  return ["gear", "items", subject] as const
}

/**
 * The owned gear list as server state. No request without a subject.
 *
 * It runs whenever a screen that uses it mounts, so gear changed elsewhere is
 * reflected on arrival, and never on window focus or on a timer. A network or
 * server failure is tried once more by itself; nothing else is.
 * `networkMode: "always"` makes an offline request fail at once.
 */
export function useGearItems(enabled: boolean) {
  const subject = getAuthenticatedSubject()

  return useQuery({
    queryKey: gearItemsQueryKey(subject),
    queryFn: ({ signal }) => {
      if (subject === null) {
        throw new GearRequestError("no-session")
      }
      return requestGearItems(signal)
    },
    enabled: enabled && subject !== null,
    retry: (failureCount, error) =>
      failureCount < 1 && gearFailureKindOf(error) === "unavailable",
    networkMode: "always",
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Adds one owned item (section 13.2). On success the created item, as the
 * backend returned it, is put at the head of the cached list at once (the
 * list is newest first), and the list is then requested again. Never retried
 * by itself: a second attempt is the user's.
 */
export function useAddGearItem() {
  const queryClient = useQueryClient()
  const subject = getAuthenticatedSubject()

  return useMutation({
    mutationFn: (request: CreateGearItemRequest) => createGearItem(request),
    networkMode: "always",
    retry: false,
    onSuccess: (item: GearItem | null) => {
      const key = gearItemsQueryKey(subject)
      if (item !== null) {
        queryClient.setQueryData<GearItem[]>(key, (list) =>
          list === undefined
            ? list
            : [item, ...list.filter((entry) => entry.id !== item.id)],
        )
      }
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
