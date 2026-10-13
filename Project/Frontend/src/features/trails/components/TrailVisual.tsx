import { useCallback, useState } from "react"
import { trailContent } from "../content"

type TrailVisualProps = {
  /** The trail's cover image, when it has one. */
  coverImageUrl: string | null
}

/**
 * The trail visual (FEATURE-004 section 21.5): one box whose size never
 * depends on what is in it. The cover fallback is the box's own background,
 * painted under any image, so "no image", "loading", and "failed" cannot
 * shift the layout or show a broken-image icon.
 *
 * The caption says there is no photo. It is shown when the trail has no
 * cover image and when the image failed, and not while one is loading or
 * shown. The image is decorative: the response carries no description of it,
 * and the heading already names the trail.
 */
export function TrailVisual({ coverImageUrl }: TrailVisualProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  // Covers an image that finished loading before its handlers were attached.
  const attach = useCallback((image: HTMLImageElement | null) => {
    if (image !== null && image.complete && image.naturalWidth > 0) {
      setLoadedUrl(image.getAttribute("src"))
    }
  }, [])

  const hasImage = coverImageUrl !== null && failedUrl !== coverImageUrl

  return (
    <div className="trail-visual">
      {hasImage ? (
        <img
          ref={attach}
          src={coverImageUrl}
          alt=""
          decoding="async"
          draggable={false}
          className="trail-visual-image"
          data-ready={loadedUrl === coverImageUrl ? "" : undefined}
          onLoad={() => setLoadedUrl(coverImageUrl)}
          // Removed from rendering, so nothing of a broken image can be drawn.
          onError={() => setFailedUrl(coverImageUrl)}
        />
      ) : (
        <p className="trail-visual-caption">{trailContent.noPhoto}</p>
      )}
    </div>
  )
}
