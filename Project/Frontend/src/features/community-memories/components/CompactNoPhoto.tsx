import { Mountain } from "lucide-react"

/**
 * The compact no-photo mark for preview thumbnails (FEATURE-010 section
 * 18.4): the thumbnail box on `paper-shade` with the FEATURE-009 contour and
 * a small `stone` mountain, no caption. Decorative: the row's name carries
 * the Memory. `NoPhotoSurface` has no size this small.
 */
export function CompactNoPhoto() {
  return (
    <span className="cm-nophoto-mark" aria-hidden="true">
      <Mountain strokeWidth={1.75} absoluteStrokeWidth />
    </span>
  )
}
