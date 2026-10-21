import { useCallback, useEffect, useRef, useState } from "react"
import {
  PhotoPreparationError,
  preparePhoto,
  type PhotoRejection,
  type PreparedPhoto,
} from "../photos/preparePhoto"

/** Where a picked photo is in its life on this page (section 22.10). */
export type LocalPhotoStatus =
  | "preparing"
  /** Prepared; uploaded when the Memory is saved (create). */
  | "ready"
  | "waiting"
  | "uploading"
  | "added"
  | "failed"

export type LocalPhoto = {
  /** A page-local identifier; never a URL. */
  key: string
  status: LocalPhotoStatus
  prepared: PreparedPhoto | null
  /** The prepared blob's object URL, for the preview only. */
  previewUrl: string | null
  /** MM106, once an upload has failed. */
  reason: string | null
  /** The server's id, once uploaded. */
  serverId: string | null
}

type Update = (photos: readonly LocalPhoto[]) => LocalPhoto[]

/**
 * The photos picked on this page and not yet (or not all) on the server.
 *
 * Preparation is one photo at a time, in picking order, on the main thread
 * (section 11.3). Object URLs are revoked when a photo is dropped, and every
 * remaining one when the page goes. `signal` is aborted when the page goes,
 * so an upload still running then is abandoned.
 */
export function useLocalPhotos() {
  const [photos, setPhotosState] = useState<LocalPhoto[]>([])
  const photosRef = useRef<LocalPhoto[]>([])
  const counter = useRef(0)
  const preparation = useRef<Promise<void>>(Promise.resolve())
  const urls = useRef(new Set<string>())
  const life = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    life.current = controller
    const liveUrls = urls.current
    return () => {
      controller.abort()
      for (const url of liveUrls) {
        URL.revokeObjectURL(url)
      }
      liveUrls.clear()
    }
  }, [])

  const update = useCallback((change: Update) => {
    const next = change(photosRef.current)
    photosRef.current = next
    setPhotosState(next)
  }, [])

  const patch = useCallback(
    (key: string, values: Partial<LocalPhoto>) => {
      update((list) =>
        list.map((photo) => (photo.key === key ? { ...photo, ...values } : photo)),
      )
    },
    [update],
  )

  /** Drops a photo and releases its preview. */
  const drop = useCallback(
    (key: string) => {
      const photo = photosRef.current.find((entry) => entry.key === key)
      if (photo?.previewUrl != null) {
        URL.revokeObjectURL(photo.previewUrl)
        urls.current.delete(photo.previewUrl)
      }
      update((list) => list.filter((entry) => entry.key !== key))
    },
    [update],
  )

  /**
   * Adds files as `preparing` tiles and prepares them in order. `onPrepared`
   * runs for each one that is ready; `onRejected` for each that could not be
   * prepared, which then leaves the list.
   */
  const add = useCallback(
    (
      files: readonly File[],
      callbacks: {
        onPrepared?: (key: string) => void
        onRejected: (rejection: PhotoRejection) => void
      },
    ) => {
      const added = files.map((file) => {
        counter.current += 1
        return { file, key: `local-${counter.current}` }
      })
      update((list) => [
        ...list,
        ...added.map(({ key }) => ({
          key,
          status: "preparing" as const,
          prepared: null,
          previewUrl: null,
          reason: null,
          serverId: null,
        })),
      ])

      for (const { file, key } of added) {
        preparation.current = preparation.current.then(async () => {
          // Removed while it waited, or the page has gone.
          if (
            life.current?.signal.aborted ||
            !photosRef.current.some((photo) => photo.key === key)
          ) {
            return
          }
          try {
            const prepared = await preparePhoto(file)
            if (
              life.current?.signal.aborted ||
              !photosRef.current.some((photo) => photo.key === key)
            ) {
              return
            }
            const previewUrl = URL.createObjectURL(prepared.blob)
            urls.current.add(previewUrl)
            patch(key, { status: "ready", prepared, previewUrl })
            callbacks.onPrepared?.(key)
          } catch (error) {
            drop(key)
            callbacks.onRejected(
              error instanceof PhotoPreparationError ? error.rejection : "unreadable",
            )
          }
        })
      }
    },
    [drop, patch, update],
  )

  /** Resolves once every photo picked so far has been prepared or refused. */
  const settled = useCallback(() => preparation.current, [])

  /** The page's lifetime signal, as it is now. */
  const signal = useCallback(() => life.current?.signal, [])

  return { photos, photosRef, update, patch, drop, add, settled, signal }
}
