import { useCallback, useState } from "react"
import type { PreparationSceneAsset } from "../preparationSceneConfig"

type PreparationSceneProps = {
  asset: PreparationSceneAsset
}

/**
 * The preparation scene (FEATURE-004 sections 13, 14.3): atmosphere and
 * nothing else. Its only input is its asset. It knows nothing about the
 * trail, the date, or the gear list and takes nothing from them, so no
 * request, failure, or Retry can remount, reload, or re-fade it.
 *
 * It is one still image, fixed behind the page by its own styles: decorative,
 * hidden from assistive technology, never focusable, and it takes no pointer
 * events. It fades in once when it has decoded and then does not move, so
 * there is nothing to pause.
 *
 * No part of the interface waits for it. Until it loads, and if it never
 * does, the shell's own surface shows in its place; on failure the element is
 * removed, so no broken-image icon or alternative text can be drawn, and the
 * request is not repeated.
 */
export function PreparationScene({ asset }: PreparationSceneProps) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // Covers an image that finished loading before its handlers were attached.
  const attach = useCallback((image: HTMLImageElement | null) => {
    if (image !== null && image.complete && image.naturalWidth > 0) {
      setReady(true)
    }
  }, [])

  if (failed) {
    return null
  }

  return (
    <img
      ref={attach}
      src={asset.image}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
      draggable={false}
      className="prep-scene"
      data-ready={ready ? "" : undefined}
      onLoad={(event) => {
        // Decode before revealing, so the fade starts on a painted frame.
        const reveal = () => setReady(true)
        event.currentTarget.decode().then(reveal, reveal)
      }}
      onError={() => setFailed(true)}
    />
  )
}
