import { useState } from "react"
import { Globe, Lock, Mountain } from "lucide-react"
import { memoriesContent } from "../content"
import type { PhotoRecovery } from "../hooks/usePhotoRecovery"
import type { MemoryPhoto, MemoryVisibility } from "../types/memory"

type NoPhotoSurfaceProps = {
  size: "card" | "detail" | "empty"
}

const GLYPH_SIZE = { card: 32, detail: 48, empty: 40 } as const

/**
 * The no-photo surface (FEATURE-009 section 22.5, D24): `paper-shade`, soft
 * contour lines, a line glyph, and "No photos" on cards and Detail. Never a
 * grey box, a fake photo, or an error. Tokens and CSS only.
 */
export function NoPhotoSurface({ size }: NoPhotoSurfaceProps) {
  return (
    <div className="memory-nophoto" data-size={size} aria-hidden="true">
      <Mountain
        size={GLYPH_SIZE[size]}
        strokeWidth={1.75}
        absoluteStrokeWidth
        className="memory-nophoto-glyph"
      />
      {size !== "empty" ? (
        <span className="memory-nophoto-caption">{memoriesContent.photo.none}</span>
      ) : null}
    </div>
  )
}

type MemoryImageProps = {
  photo: MemoryPhoto
  recovery: PhotoRecovery
  variant: "card" | "large" | "thumb" | "tile"
  alt: string
  eager?: boolean
}

/**
 * One Memory photo from its signed URL (section 17.3). It fades in once
 * loaded. When it cannot be loaded, recovery decides whether the owning query
 * is requested again; meanwhile, and after a second failure, the frame shows
 * its fallback with the same geometry (section 19.7): MM13 where there is
 * room, the plain `paper-shade` base on thumbnails and tiles. Never a broken
 * image.
 */
export function MemoryImage({
  photo,
  recovery,
  variant,
  alt,
  eager = false,
}: MemoryImageProps) {
  const [loaded, setLoaded] = useState(false)

  if (recovery.isFailed(photo.id)) {
    return (
      <span
        className="memory-photo-fallback"
        data-variant={variant}
        // On a card the link's name carries the entry; only the large photo's
        // fallback is read.
        aria-hidden={variant === "large" ? undefined : true}
      >
        {variant === "card" || variant === "large" ? (
          <span className="memory-photo-fallback-text">
            {memoriesContent.photo.fallback}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <img
      className="memory-photo"
      data-variant={variant}
      data-loaded={loaded ? "" : undefined}
      src={photo.url}
      alt={alt}
      // The card frame is 4:3 and fixed, so nothing shifts as it loads.
      width={variant === "card" ? 400 : undefined}
      height={variant === "card" ? 300 : undefined}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "auto" : "async"}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => recovery.onError(photo)}
    />
  )
}

type VisibilityLabelProps = {
  visibility: MemoryVisibility
  className?: string
}

/** A restrained label: a line icon and a word, never colour (section 15.2). */
export function VisibilityLabel({ visibility, className }: VisibilityLabelProps) {
  const Icon = visibility === "PUBLIC" ? Globe : Lock
  return (
    <span className={className ?? "memory-visibility"}>
      <Icon aria-hidden="true" strokeWidth={2} />
      <span>{memoriesContent.visibility[visibility]}</span>
    </span>
  )
}
