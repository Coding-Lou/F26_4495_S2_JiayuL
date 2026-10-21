import { createRoot, type ReconcilerRoot, type RootState } from "@react-three/fiber"
import { avatarManifest, type VisualCategory } from "../avatarManifest"
import type { GearLoad, RuntimeState } from "../runtimeTypes"
import type { UnavailableReason } from "../viewerTypes"
import { ATTACHED_VISUALS } from "../visibility"
import { AvatarStage, DRAG_DEG_PER_PX } from "./AvatarStage"
import { loadModel } from "./loadModel"
import { FrameDriver, RenderGuard } from "./SceneParts"

/** Section 34.1 */
const AVATAR_LIMIT_MS = 20_000
const GEAR_LIMIT_MS = 15_000
const REVEAL_WAIT_MS = 2_500
/** Section 28.5 */
const CONTEXT_RESTORE_MS = 4_000

/** Section 28.5: alpha, antialias, no preserved buffer, software accepted. */
const GL_OPTIONS = {
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false,
} as const

/** Section 28.5: min(devicePixelRatio, 2). */
const DPR_RANGE: [number, number] = [1, 2]

export type ControllerInputs = {
  equipped: readonly VisualCategory[]
  reducedMotion: boolean
  paused: boolean
  /** FEATURE-012 section 10: plays the ready clip each time it increases. */
  readyCue: number
}

type ControllerCallbacks = {
  onState: (state: RuntimeState) => void
  onRendererCreated: () => void
}

/**
 * One viewer runtime: one canvas, one renderer, one scene, for as long as it
 * lives (FEATURE-005 section 28.5). Equipped changes, pauses, and anything
 * else React does never recreate any of them.
 *
 * Business state flows in through `setInputs`; nothing flows back but the
 * runtime's own state. The canvas has no click, hover, key, or wheel
 * handler: a horizontal drag turns the view and does nothing else.
 */
export class RuntimeController {
  private readonly stage = new AvatarStage()
  private readonly canvas: HTMLCanvasElement
  private readonly aborter = new AbortController()
  private root: ReconcilerRoot<HTMLCanvasElement> | null = null
  private rootState: (() => RootState) | null = null
  private resizeObserver: ResizeObserver | null = null
  private intersection: IntersectionObserver | null = null
  private contextTimer: number | undefined

  private phase: RuntimeState["phase"] = "loading"
  private failure: RuntimeState["failure"]
  private avatarReady = false
  private hasIdle = false
  private hasReady = false
  /**
   * The last cue acted on. The value present at construction counts as
   * consumed, so a Retry, a remount, or a StrictMode re-run never replays
   * the clip (FEATURE-012 section 10, AC-27).
   */
  private consumedCue: number
  private readonly gear = new Map<VisualCategory, GearLoad>(
    ATTACHED_VISUALS.map((visual) => [visual, "idle"]),
  )
  private backgroundBusy = false
  private inputs: ControllerInputs
  private onScreen = true
  private disposed = false
  private drag: { pointerId: number; startX: number; startTheta: number } | null =
    null

  constructor(
    private readonly host: HTMLElement,
    inputs: ControllerInputs,
    private readonly callbacks: ControllerCallbacks,
  ) {
    this.inputs = inputs
    this.consumedCue = inputs.readyCue
    this.stage.setEquipped(new Set(inputs.equipped))
    this.stage.setMotion(inputs.reducedMotion, inputs.paused)

    // The one canvas: decorative, not focusable, no key bindings (28.4).
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.touchAction = "pan-y"
    canvas.style.cursor = "grab"
    this.canvas = canvas
  }

  /* -------------------------------------------------------------- *
   * Lifecycle (section 34.1, steps 4 to 8)
   * -------------------------------------------------------------- */

  async start(): Promise<void> {
    this.host.appendChild(this.canvas)
    this.listen()

    const root = createRoot(this.canvas)
    this.root = root
    try {
      await root.configure(this.configuration())
    } catch {
      this.fail("render-error", true)
      return
    }
    if (this.disposed) {
      return
    }
    this.callbacks.onRendererCreated()
    const store = root.render(
      <RenderGuard onError={() => this.fail("render-error", true)}>
        <FrameDriver controller={this} />
      </RenderGuard>,
    )
    this.rootState = store.getState

    // Step 4: the avatar, the only model requested before it is shown.
    let avatar
    try {
      avatar = await loadModel(
        avatarManifest.avatar.model,
        AVATAR_LIMIT_MS,
        "high",
        this.aborter.signal,
      )
    } catch {
      if (!this.disposed) {
        console.warn("The avatar model could not be loaded.")
        this.fail("avatar-load-failed", true)
      }
      return
    }
    if (this.disposed) {
      return
    }

    // Step 5
    if (!AvatarStage.validateAvatar(avatar)) {
      console.warn("The avatar model does not match the manifest.")
      this.fail("avatar-invalid", false)
      return
    }

    // Step 6
    try {
      const clips = this.stage.setAvatar(avatar)
      this.hasIdle = clips.hasIdle
      this.hasReady = clips.hasReady
      this.stage.setEquipped(new Set(this.inputs.equipped))
    } catch {
      this.fail("render-error", true)
      return
    }
    this.avatarReady = true

    // Step 7: equipped attached models settle first, for at most 2.5s.
    const waiting = this.inputs.equipped
      .filter((visual) => this.gear.has(visual))
      .map((visual) => this.loadGear(visual, "high"))
    if (waiting.length > 0) {
      await Promise.race([
        Promise.allSettled(waiting),
        new Promise((resolve) => window.setTimeout(resolve, REVEAL_WAIT_MS)),
      ])
    }
    if (this.disposed) {
      return
    }

    this.stage.reveal()
    this.phase = "drawn"
    this.invalidate()
    this.emit()

    // Section 33: the other gear files, after ready, one at a time.
    this.pumpBackground()
  }

  setInputs(inputs: ControllerInputs): void {
    const before = new Set(this.inputs.equipped)
    const wasPlaying = this.stage.readyPhase === "playing"
    this.inputs = inputs
    this.stage.setEquipped(new Set(inputs.equipped))
    this.stage.setMotion(inputs.reducedMotion, inputs.paused)

    // FEATURE-012 D8: a cue that increased plays the clip once, only on a
    // drawn avatar; otherwise it is consumed and nothing plays.
    let started = false
    if (inputs.readyCue > this.consumedCue) {
      this.consumedCue = inputs.readyCue
      started = this.phase === "drawn" && this.stage.playReady()
    }
    if (started || wasPlaying !== (this.stage.readyPhase === "playing")) {
      this.emit()
    }

    if (this.avatarReady) {
      for (const visual of inputs.equipped) {
        const load = this.gear.get(visual)
        // An equip promotes a file that is not loaded yet; a failed one is
        // tried again, once per equip (34.4).
        if (!before.has(visual) && (load === "idle" || load === "failed")) {
          void this.loadGear(visual, "high")
        }
      }
    }
    this.invalidate()
  }

  retryFailedGear(): void {
    if (!this.avatarReady) {
      return
    }
    for (const visual of this.inputs.equipped) {
      if (this.gear.get(visual) === "failed") {
        void this.loadGear(visual, "high")
      }
    }
  }

  turn(direction: 1 | -1): void {
    this.stage.turn(direction, this.inputs.reducedMotion, performance.now())
    this.invalidate()
  }

  resetView(): void {
    this.stage.resetView(this.inputs.reducedMotion, performance.now())
    this.invalidate()
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.aborter.abort()
    window.clearTimeout(this.contextTimer)
    this.unlisten()
    this.root?.unmount()
    this.root = null
    this.stage.dispose()
    this.canvas.remove()
  }

  /* -------------------------------------------------------------- *
   * Gear (sections 29.2, 33, 34.3)
   * -------------------------------------------------------------- */

  private async loadGear(
    visual: VisualCategory,
    priority: RequestPriority,
  ): Promise<void> {
    const { representation } = avatarManifest.visuals[visual]
    if (representation.kind !== "attached-model") {
      return
    }
    this.gear.set(visual, "loading")
    this.emit()
    try {
      const model = await loadModel(
        representation.model,
        GEAR_LIMIT_MS,
        priority,
        this.aborter.signal,
      )
      if (this.disposed) {
        return
      }
      this.stage.setGear(visual, model)
      this.gear.set(visual, "loaded")
      this.invalidate()
    } catch {
      if (this.disposed) {
        return
      }
      console.warn("A gear model could not be loaded.")
      this.gear.set(visual, "failed")
    }
    this.emit()
  }

  private pumpBackground(): void {
    if (this.backgroundBusy || this.disposed) {
      return
    }
    const next = ATTACHED_VISUALS.find((visual) => this.gear.get(visual) === "idle")
    if (next === undefined) {
      return
    }
    this.backgroundBusy = true
    void this.loadGear(next, "low").finally(() => {
      this.backgroundBusy = false
      this.pumpBackground()
    })
  }

  /* -------------------------------------------------------------- *
   * State reported outward
   * -------------------------------------------------------------- */

  private fail(reason: UnavailableReason, retryable: boolean): void {
    if (this.disposed || this.phase === "failed") {
      return
    }
    this.phase = "failed"
    this.failure = { reason, retryable }
    this.emit()
  }

  private emit(): void {
    if (this.disposed) {
      return
    }
    this.callbacks.onState({
      phase: this.phase,
      failure: this.failure,
      gear: Object.fromEntries(this.gear),
      hasIdle: this.hasIdle,
      hasReady: this.hasReady,
      readyPlaying: this.stage.readyPhase === "playing",
    })
  }

  /* -------------------------------------------------------------- *
   * Frames (section 28.5: on demand)
   * -------------------------------------------------------------- */

  private invalidate(): void {
    this.rootState?.().invalidate()
  }

  /** Called by `FrameDriver` on every drawn frame. */
  frame(state: RootState, delta: number): void {
    try {
      this.stage.setAspect(state.size.width / state.size.height)
      const animate = document.visibilityState === "visible" && this.onScreen
      const wasPlaying = this.stage.readyPhase === "playing"
      if (this.stage.frame(delta, performance.now(), animate)) {
        state.invalidate()
      }
      // The ready clip finished in this frame: reported once (FEATURE-012).
      if (wasPlaying && this.stage.readyPhase !== "playing") {
        this.emit()
      }
    } catch {
      this.fail("render-error", true)
    }
  }

  /**
   * The whole configuration, every time: R3F replaces the previous one on
   * each `configure`, so a call with only a new size would reset the camera
   * and the frame loop to its defaults.
   */
  private configuration() {
    return {
      gl: GL_OPTIONS,
      scene: this.stage.scene,
      camera: this.stage.camera,
      frameloop: "demand" as const,
      dpr: DPR_RANGE,
      flat: true,
      linear: false,
      shadows: false,
      size: this.size(),
    }
  }

  private size() {
    return {
      width: Math.max(1, this.host.clientWidth),
      height: Math.max(1, this.host.clientHeight),
      top: 0,
      left: 0,
    }
  }

  /* -------------------------------------------------------------- *
   * Listeners: size, visibility, context loss, drag (28.5, 30.2)
   * -------------------------------------------------------------- */

  private readonly handleVisibility = () => {
    if (document.visibilityState === "visible") {
      this.invalidate()
    }
  }

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault()
    window.clearTimeout(this.contextTimer)
    this.contextTimer = window.setTimeout(() => {
      this.fail("context-lost", true)
    }, CONTEXT_RESTORE_MS)
  }

  private readonly handleContextRestored = () => {
    window.clearTimeout(this.contextTimer)
    this.invalidate()
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    const primary =
      event.pointerType === "mouse" ? event.button === 0 : event.isPrimary
    if (!primary || this.drag !== null || this.phase !== "drawn") {
      return
    }
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTheta: this.stage.azimuth,
    }
    this.canvas.setPointerCapture(event.pointerId)
    this.canvas.style.cursor = "grabbing"
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.drag === null || event.pointerId !== this.drag.pointerId) {
      return
    }
    // Dragging right turns the avatar's front to the right: θ decreases.
    this.stage.setAzimuth(
      this.drag.startTheta - DRAG_DEG_PER_PX * (event.clientX - this.drag.startX),
    )
    this.invalidate()
  }

  private readonly handlePointerEnd = (event: PointerEvent) => {
    if (this.drag === null || event.pointerId !== this.drag.pointerId) {
      return
    }
    this.drag = null
    this.canvas.style.cursor = "grab"
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }
  }

  private listen(): void {
    this.resizeObserver = new ResizeObserver(() => {
      void this.root
        ?.configure(this.configuration())
        .then(() => this.invalidate())
        .catch(() => undefined)
    })
    this.resizeObserver.observe(this.host)

    this.intersection = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting)
      if (visible !== this.onScreen) {
        this.onScreen = visible
        if (visible) {
          this.invalidate()
        }
      }
    })
    this.intersection.observe(this.canvas)

    document.addEventListener("visibilitychange", this.handleVisibility)
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost)
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored)
    this.canvas.addEventListener("pointerdown", this.handlePointerDown)
    this.canvas.addEventListener("pointermove", this.handlePointerMove)
    this.canvas.addEventListener("pointerup", this.handlePointerEnd)
    this.canvas.addEventListener("pointercancel", this.handlePointerEnd)
    this.canvas.addEventListener("lostpointercapture", this.handlePointerEnd)
  }

  private unlisten(): void {
    this.resizeObserver?.disconnect()
    this.intersection?.disconnect()
    document.removeEventListener("visibilitychange", this.handleVisibility)
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost)
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored)
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown)
    this.canvas.removeEventListener("pointermove", this.handlePointerMove)
    this.canvas.removeEventListener("pointerup", this.handlePointerEnd)
    this.canvas.removeEventListener("pointercancel", this.handlePointerEnd)
    this.canvas.removeEventListener("lostpointercapture", this.handlePointerEnd)
  }
}
