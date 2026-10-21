import type { ActivityLevel } from "@/features/trails/activity"

/**
 * The 12px glyph that starts a row's activity line: the same shape as the
 * trail's marker (hollow, dotted, or filled), so the list teaches the map's
 * encoding in place of a legend (FEATURE-006 section 16.8.6). Decoration:
 * the text beside it carries the meaning.
 */
export function ActivityGlyph({ level }: { level: ActivityLevel }) {
  return (
    <span className="discover-glyph" data-level={level} aria-hidden="true" />
  )
}
