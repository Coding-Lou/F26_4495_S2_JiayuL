import type { VisualCategory } from "./avatarManifest"

/**
 * The viewer's interface (FEATURE-005 section 28.3). The names are the
 * contract. Three-free: importing these types costs nothing at runtime.
 */

export type AvatarViewerState = "loading" | "ready" | "partial" | "unavailable"

export type CategoryDisplay = "shown" | "covered" | "loading" | "not-shown"

export type UnavailableReason =
  | "no-webgl"
  | "viewer-load-failed"
  | "avatar-load-failed"
  | "avatar-invalid"
  | "context-lost"
  | "render-error"

/**
 * FEATURE-012 section 10: the post-save clip. `none`: not drawn, no clip in
 * the file, or reduced motion. `playing`: from its start until it finishes
 * (the fade back to the idle is not included).
 */
export type ReadyClipStatus = "none" | "available" | "playing"

export interface AvatarViewerStatus {
  state: AvatarViewerState
  /** One entry per equipped category. */
  display: Partial<Record<VisualCategory, CategoryDisplay>>
  /** `none`: no idle clip, reduced motion, or not shown. */
  motion: "none" | "playing" | "paused"
  readyClip: ReadyClipStatus
  unavailable?: { reason: UnavailableReason; retryable: boolean }
}

export interface AvatarViewerProps {
  /** Order-insensitive; compared by content, not identity. */
  equipped: readonly VisualCategory[]
  reducedMotion: boolean
  paused: boolean
  /**
   * FEATURE-012 section 10: the clip plays once each time this increases
   * after the runtime exists. The value it starts with is already consumed,
   * so a Retry or a remount never plays it. Default 0.
   */
  readyCue?: number
  /**
   * Fires once with the initial status, then only when the status changes
   * by content, and never during render.
   */
  onStatusChange: (status: AvatarViewerStatus) => void
  className?: string
}

/** Through a ref. The view angle is the viewer's own state (section 28.3). */
export interface AvatarViewerHandle {
  turnLeft(): void
  turnRight(): void
  resetView(): void
  retry(): void
}
