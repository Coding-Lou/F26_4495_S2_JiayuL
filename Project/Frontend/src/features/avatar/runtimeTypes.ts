import type { RefObject } from "react"
import type { VisualCategory } from "./avatarManifest"
import type { UnavailableReason } from "./viewerTypes"

/**
 * What passes between the three-free shell (`AvatarViewer`) and the lazily
 * imported runtime. Types only: importing this file costs nothing.
 */

/** Where one attached gear model is (sections 33, 34.3). */
export type GearLoad = "idle" | "loading" | "loaded" | "failed"

export type RuntimeState = {
  /** `drawn`: the avatar's first frame is on the canvas (34.1 step 7). */
  phase: "loading" | "drawn" | "failed"
  failure?: { reason: UnavailableReason; retryable: boolean }
  /** One entry per attached visual category. */
  gear: Partial<Record<VisualCategory, GearLoad>>
  /** The file holds the manifest's idle clip. */
  hasIdle: boolean
  /** The file holds the manifest's ready clip (FEATURE-012). */
  hasReady: boolean
  /** The ready clip runs, from its start until it finishes. */
  readyPlaying: boolean
}

export interface RuntimeHandle {
  turnLeft(): void
  turnRight(): void
  resetView(): void
  /** Section 34.4: every equipped, failed gear model, once. */
  retryFailedGear(): void
}

export type RuntimeProps = {
  /** The shell's root element. The runtime puts its one canvas in it. */
  host: HTMLElement
  equipped: readonly VisualCategory[]
  reducedMotion: boolean
  paused: boolean
  readyCue: number
  onState: (state: RuntimeState) => void
  onRendererCreated: () => void
  handleRef: RefObject<RuntimeHandle | null>
}
