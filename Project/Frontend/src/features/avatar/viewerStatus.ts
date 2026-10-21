import type { VisualCategory } from "./avatarManifest"
import type { GearLoad } from "./runtimeTypes"
import type {
  AvatarViewerStatus,
  CategoryDisplay,
  UnavailableReason,
} from "./viewerTypes"
import { isAttached, isCovered } from "./visibility"

type ViewerPhase =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: UnavailableReason; retryable: boolean }
  | {
      kind: "drawn"
      gear: Partial<Record<VisualCategory, GearLoad>>
      hasIdle: boolean
      hasReady: boolean
      readyPlaying: boolean
    }

/**
 * The status reported outward (FEATURE-005 sections 28.3, 34.2, 34.5), as a
 * pure function of where the viewer is and what is equipped. Entries are in
 * a fixed order so that equal statuses serialize equally.
 */
export function composeStatus(
  phase: ViewerPhase,
  equipped: readonly VisualCategory[],
  reducedMotion: boolean,
  paused: boolean,
): AvatarViewerStatus {
  const set = new Set(equipped)
  const visuals = [...set].sort()

  if (phase.kind === "loading") {
    return {
      state: "loading",
      display: Object.fromEntries(visuals.map((visual) => [visual, "loading"])),
      motion: "none",
      readyClip: "none",
    }
  }

  if (phase.kind === "unavailable") {
    return {
      state: "unavailable",
      display: Object.fromEntries(visuals.map((visual) => [visual, "not-shown"])),
      motion: "none",
      readyClip: "none",
      unavailable: { reason: phase.reason, retryable: phase.retryable },
    }
  }

  const display: Partial<Record<VisualCategory, CategoryDisplay>> = {}
  for (const visual of visuals) {
    if (isAttached(visual)) {
      const load = phase.gear[visual]
      display[visual] =
        load === "loaded"
          ? isCovered(visual, set)
            ? "covered"
            : "shown"
          : load === "failed"
            ? "not-shown"
            : "loading"
    } else {
      display[visual] = isCovered(visual, set) ? "covered" : "shown"
    }
  }

  const partial = Object.values(display).some((value) => value === "not-shown")
  return {
    state: partial ? "partial" : "ready",
    display,
    motion:
      phase.hasIdle && !reducedMotion ? (paused ? "paused" : "playing") : "none",
    // FEATURE-012 section 13: under reduced motion the clip is never offered.
    readyClip:
      phase.hasReady && !reducedMotion
        ? phase.readyPlaying
          ? "playing"
          : "available"
        : "none",
  }
}
