import { createElement, useState } from "react"
import { gearArtFor } from "../art/gearArtManifest"

export type GearArtVariant = "card" | "panel" | "sheet" | "tile"

type GearArtProps = {
  category: string | null
  variant: GearArtVariant
}

/**
 * The slot plate and its category art (FEATURE-007 section 21.6). One plate
 * colour for every category. Decorative: the name and category are always
 * text beside it.
 */
export function GearArt({ category, variant }: GearArtProps) {
  const art = gearArtFor(category)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = art.src !== null && art.src !== failedSrc

  return (
    <span className="gear-plate" data-variant={variant} aria-hidden="true">
      <span className="gear-art-box">
        {showImage ? (
          <img
            src={art.src ?? undefined}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(art.src)}
          />
        ) : (
          createElement(art.pictogram, {
            className: "gear-pictogram",
            strokeWidth: variant === "panel" || variant === "sheet" ? 2.5 : 2,
            "aria-hidden": true,
          })
        )}
      </span>
    </span>
  )
}
