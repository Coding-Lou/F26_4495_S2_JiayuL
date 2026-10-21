import { useCallback, useEffect, useRef, useState } from "react"
import type { MemoryPhoto } from "../types/memory"

/** A result younger than this is not requested again for a photo (17.3). */
const REFRESH_AFTER_MS = 60_000

type PhotoRecoveryOptions = {
  /** When the owning query's current result arrived (epoch ms; 0 if none). */
  dataUpdatedAt: number
  /** Every photo of that result that may be shown. */
  photos: readonly MemoryPhoto[]
  /** Requests the owning query again. */
  refetch: () => unknown
}

export type PhotoRecovery = {
  /** The photo is shown as its fallback in this result. */
  isFailed: (photoId: string) => boolean
  /** The image of this photo could not be loaded. */
  onError: (photo: MemoryPhoto) => void
}

/**
 * Signed-URL recovery (FEATURE-009 section 17.3, D20). When an image fails,
 * its photo shows its fallback; if the result that carried its URL is older
 * than 60 seconds, the owning query is requested once more, and the new
 * result's URLs are tried. A result is requested again at most once, and a
 * fresh result never is, so an image can never loop.
 *
 * Before an image is relied on, a URL whose `urlExpiresAt` has passed in a
 * result older than 60 seconds triggers the same single request. The age
 * condition also keeps a device clock that runs ahead of the server's from
 * causing repeated requests.
 *
 * Failures are kept per result, by photo id: a new result tries every photo
 * again. URLs are never stored here.
 */
export function usePhotoRecovery({
  dataUpdatedAt,
  photos,
  refetch,
}: PhotoRecoveryOptions): PhotoRecovery {
  const [failed, setFailed] = useState<{ at: number; ids: ReadonlySet<string> }>(
    () => ({ at: 0, ids: new Set() }),
  )
  const refreshedFor = useRef<number | null>(null)
  const refetchRef = useRef(refetch)

  useEffect(() => {
    refetchRef.current = refetch
  })

  const requestOnce = useCallback((at: number) => {
    if (at === 0 || refreshedFor.current === at) {
      return
    }
    if (Date.now() - at <= REFRESH_AFTER_MS) {
      return
    }
    refreshedFor.current = at
    void refetchRef.current()
  }, [])

  // An already expired URL is renewed before it is relied on.
  const expiries = photos.map((photo) => photo.urlExpiresAt ?? "").join("|")
  useEffect(() => {
    const now = Date.now()
    const expired = expiries
      .split("|")
      .some((value) => value !== "" && Number(value) <= now)
    if (expired) {
      requestOnce(dataUpdatedAt)
    }
  }, [dataUpdatedAt, expiries, requestOnce])

  const isFailed = useCallback(
    (photoId: string) => failed.at === dataUpdatedAt && failed.ids.has(photoId),
    [dataUpdatedAt, failed],
  )

  const onError = useCallback(
    (photo: MemoryPhoto) => {
      setFailed((current) => {
        const ids = new Set(current.at === dataUpdatedAt ? current.ids : [])
        ids.add(photo.id)
        return { at: dataUpdatedAt, ids }
      })
      requestOnce(dataUpdatedAt)
    },
    [dataUpdatedAt, requestOnce],
  )

  return { isFailed, onError }
}
