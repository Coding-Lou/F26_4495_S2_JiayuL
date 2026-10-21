import {
  AmbientLight,
  AnimationMixer,
  CanvasTexture,
  CircleGeometry,
  DirectionalLight,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  type AnimationAction,
  type AnimationMixerEventMap,
  type Material,
} from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { avatarManifest, type VisualCategory } from "../avatarManifest"
import { MANAGED_NODES, isNodeVisible } from "../visibility"

/*
 * The only transform numbers the frontend owns: the camera, the lights, and
 * the ground shadow (FEATURE-005 sections 22.6, 30, 31). Nothing here places
 * an avatar part or a gear model: gear goes onto its slot node as it is.
 */

/** Section 30.1 */
const FOV_DEG = 30
const NEAR = 0.1
const FAR = 50
const PITCH_DEG = 10
const DEFAULT_AZIMUTH_DEG = 30
const BASE_DISTANCE = 4.3
const WIDTH_REGIME_ASPECT = 0.6
const AIM_PER_DISTANCE = 0.2028

/** Section 30.2 */
const STEP_DEG = 30
const STEP_MS = 240
const RESET_MAX_MS = 480
export const DRAG_DEG_PER_PX = 0.4

/**
 * Section 31. The key light turns with the camera; the fill keeps the
 * shadowed side readable. Intensities were tuned once against the palette
 * and are constants for every page and every loadout.
 */
const KEY_DIRECTION_CAMERA_SPACE: readonly [number, number, number] = [-0.5, 0.7, 0.5]
const KEY_INTENSITY = 2.4
const FILL_INTENSITY = 1.35

/** Section 31: the ground-contact shadow. */
const SHADOW_RADIUS = 0.3
const SHADOW_LIFT = 0.002
const SHADOW_ALPHA = 0.35
const SHADOW_TEXTURE_SIZE = 128
/** Design-system token `ink`. */
const SHADOW_RGB = "11, 28, 32"

/** Longest frame step fed to the clips, so a resume never jumps. */
const MAX_FRAME_STEP_S = 1 / 20

/** FEATURE-012 D8, D9: Idle to `ready_to_go` and back. */
const READY_FADE_S = 0.25

const toRad = (deg: number) => (deg * Math.PI) / 180

/** `--ease-ui`: cubic-bezier(0.2, 0, 0, 1). */
function easeUi(t: number): number {
  const x1 = 0.2
  const y1 = 0
  const x2 = 0
  const y2 = 1
  const bx = (s: number) =>
    3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s
  const by = (s: number) =>
    3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s
  let low = 0
  let high = 1
  let s = t
  for (let i = 0; i < 24; i += 1) {
    s = (low + high) / 2
    if (bx(s) < t) {
      low = s
    } else {
      high = s
    }
  }
  return by(s)
}

type Tween = { from: number; to: number; start: number; duration: number }

/**
 * Where the ready clip is (FEATURE-012 section 10). `settling`: it has
 * finished and the crossfade back to the idle still runs.
 */
export type ReadyPhase = "none" | "playing" | "settling"

/** What the avatar file holds of the manifest's clips. */
export type AvatarClips = { hasIdle: boolean; hasReady: boolean }

type LoadedGear = {
  root: Object3D
  attachments: { node: Object3D; slotNode: string }[]
}

export class AvatarStage {
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(FOV_DEG, 1, NEAR, FAR)

  private readonly materials = new Map<string, Material>()
  private readonly managed = new Map<string, Object3D>()
  private readonly slots = new Map<string, Object3D>()
  private readonly gear = new Map<VisualCategory, LoadedGear>()
  private readonly shadowTexture: CanvasTexture
  private avatar: Object3D | null = null
  private mixer: AnimationMixer | null = null
  private idle: AnimationAction | null = null
  private idleStarted = false
  private ready: AnimationAction | null = null
  private readyState: ReadyPhase = "none"
  /** Mixer time at which the fade back to the idle is over. */
  private settleUntil = 0
  private reducedMotion = false
  private paused = false
  private equipped = new Set<VisualCategory>()

  /** Azimuth in degrees (section 30.1). */
  private theta = DEFAULT_AZIMUTH_DEG
  private tween: Tween | null = null
  private aspect = 1

  constructor() {
    // The key light and its target ride with the camera, so the visible
    // side is lit the same at every azimuth.
    const key = new DirectionalLight(0xffffff, KEY_INTENSITY)
    key.position.set(...KEY_DIRECTION_CAMERA_SPACE)
    const keyTarget = new Object3D()
    key.target = keyTarget
    this.camera.add(key, keyTarget)
    this.scene.add(this.camera)
    this.scene.add(new AmbientLight(0xffffff, FILL_INTENSITY))

    this.shadowTexture = makeShadowTexture()
    const shadow = new Mesh(
      new CircleGeometry(SHADOW_RADIUS, 48),
      new MeshBasicMaterial({
        map: this.shadowTexture,
        transparent: true,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = SHADOW_LIFT
    this.scene.add(shadow)

    this.updateCamera()
  }

  /* -------------------------------------------------------------- *
   * Avatar and gear (sections 22, 24, 28.6, 29, 34.1 steps 5 and 6)
   * -------------------------------------------------------------- */

  /** Step 5: every required node and slot node is in the file. */
  static validateAvatar(gltf: GLTF): boolean {
    const { requiredNodes, slotNodes } = avatarManifest.avatar
    return [...requiredNodes, ...slotNodes].every(
      (name) => gltf.scene.getObjectByName(name) !== undefined,
    )
  }

  /**
   * Step 6: runtime materials, default visibility, and the rule of 29.1.
   * Returns which of the manifest's clips the file holds. A file without
   * the ready clip is valid (FEATURE-012 D11, section 14.4 rollback).
   */
  setAvatar(gltf: GLTF): AvatarClips {
    const root = gltf.scene
    this.useFlatMaterials(root)
    root.traverse((object) => {
      // Bounds of skinned meshes are computed in bind pose (28.5).
      if ((object as Mesh).isMesh) {
        object.frustumCulled = false
      }
    })

    for (const name of MANAGED_NODES) {
      const node = root.getObjectByName(name)
      if (node !== undefined) {
        this.managed.set(name, node)
      }
    }
    for (const name of avatarManifest.avatar.slotNodes) {
      const node = root.getObjectByName(name)
      if (node !== undefined) {
        this.slots.set(name, node)
      }
    }

    this.avatar = root
    this.applyVisibility()

    const findClip = (name: string | null) =>
      name === null
        ? undefined
        : gltf.animations.find((candidate) => candidate.name === name)
    const idleClip = findClip(avatarManifest.avatar.idleClip)
    const readyClip = findClip(avatarManifest.avatar.readyClip)
    if (idleClip === undefined && readyClip === undefined) {
      return { hasIdle: false, hasReady: false }
    }

    // One mixer on the avatar, whichever clips the file holds (A.4).
    const mixer = new AnimationMixer(root)
    this.mixer = mixer
    if (idleClip !== undefined) {
      this.idle = mixer.clipAction(idleClip)
      this.idle.setLoop(LoopRepeat, Infinity)
    }
    if (readyClip !== undefined) {
      // Once, holding its last frame, which is the rest pose (D3).
      this.ready = mixer.clipAction(readyClip)
      this.ready.setLoop(LoopOnce, 1)
      this.ready.clampWhenFinished = true
      mixer.addEventListener("finished", this.handleFinished)
    }
    this.applyMotion()
    return { hasIdle: this.idle !== null, hasReady: this.ready !== null }
  }

  /** Step 7: the avatar's first frame. */
  reveal(): void {
    if (this.avatar !== null && this.avatar.parent !== this.scene) {
      this.scene.add(this.avatar)
    }
  }

  /** The attach nodes of one gear file; throws when one is missing. */
  setGear(visual: VisualCategory, gltf: GLTF): void {
    const { representation } = avatarManifest.visuals[visual]
    if (representation.kind !== "attached-model") {
      return
    }
    const attachments = representation.attachments.map((attachment) => {
      const node = gltf.scene.getObjectByName(attachment.node)
      if (node === undefined) {
        throw new Error("missing attach node")
      }
      return { node, slotNode: attachment.slotNode }
    })
    this.useFlatMaterials(gltf.scene)
    this.gear.set(visual, { root: gltf.scene, attachments })
    this.applyVisibility()
  }

  setEquipped(equipped: ReadonlySet<VisualCategory>): void {
    this.equipped = new Set(equipped)
    this.applyVisibility()
  }

  /**
   * Section 29.1 for embedded nodes; for attached models, the attach node is
   * on its slot exactly when the category is equipped and its model loaded.
   * `slot.add(node)` and nothing else: the node's own transform is never
   * written (22.4). All in one call, so a change lands as a cut in one frame.
   */
  private applyVisibility(): void {
    if (this.avatar === null) {
      return
    }
    for (const [name, node] of this.managed) {
      node.visible = isNodeVisible(name, this.equipped)
    }
    for (const [visual, loaded] of this.gear) {
      const on = this.equipped.has(visual)
      for (const { node, slotNode } of loaded.attachments) {
        const slot = this.slots.get(slotNode)
        if (on && slot !== undefined) {
          if (node.parent !== slot) {
            slot.add(node)
          }
        } else if (node.parent !== null && node.parent !== loaded.root) {
          node.removeFromParent()
        }
      }
    }
  }

  /**
   * One runtime material per glTF material name, with the GLB's own base
   * colour (28.6): Lambert, so there is no specular highlight. The GLB stays
   * the single source of colour.
   */
  private useFlatMaterials(root: Object3D): void {
    root.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) {
        return
      }
      const convert = (source: Material): Material => {
        const existing = this.materials.get(source.name)
        if (existing !== undefined) {
          if (existing !== source) {
            source.dispose()
          }
          return existing
        }
        const color = (source as MeshLambertMaterial).color
        const flat = new MeshLambertMaterial({ name: source.name })
        if (color !== undefined) {
          flat.color.copy(color)
        }
        source.dispose()
        this.materials.set(source.name, flat)
        return flat
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(convert)
        : convert(mesh.material)
    })
  }

  /* -------------------------------------------------------------- *
   * Motion (section 32)
   * -------------------------------------------------------------- */

  setMotion(reducedMotion: boolean, paused: boolean): void {
    this.reducedMotion = reducedMotion
    this.paused = paused
    this.applyMotion()
  }

  private applyMotion(): void {
    // FEATURE-012 D16: reduced motion stops a running ready clip; the pose
    // returns to rest, which is also the clip's last frame. Pause needs
    // nothing here: the mixer is not advanced while paused.
    if (this.reducedMotion && this.ready !== null && this.readyState !== "none") {
      this.ready.stop()
      this.readyState = "none"
    }
    const idle = this.idle
    if (idle === null) {
      return
    }
    if (this.reducedMotion) {
      // Never started under reduced motion; stopping returns the rest pose.
      if (this.idleStarted) {
        idle.stop()
        this.idleStarted = false
      }
      return
    }
    if (!this.idleStarted) {
      idle.play()
      this.idleStarted = true
    }
    // Freezes at the current time, with no jump to rest.
    idle.paused = this.paused
  }

  get idlePlaying(): boolean {
    return this.idleStarted && !this.paused && !this.reducedMotion
  }

  get readyPhase(): ReadyPhase {
    return this.readyState
  }

  /**
   * FEATURE-012 D8: the ready clip, once, from its start, faded in from the
   * idle over 0.25s. Returns false, and changes nothing, when the file has
   * no ready clip, or motion is reduced or paused.
   */
  playReady(): boolean {
    const ready = this.ready
    if (ready === null || this.mixer === null || this.reducedMotion || this.paused) {
      return false
    }
    ready.reset().play()
    const idle = this.idle
    if (idle !== null && this.idleStarted && idle.enabled) {
      idle.crossFadeTo(ready, READY_FADE_S, false)
    }
    this.readyState = "playing"
    return true
  }

  /**
   * D9: the clip has ended on the rest pose, which is the idle's first
   * frame. Back to the idle from time 0, faded over 0.25s; without an idle,
   * the clamped last frame holds the rest pose.
   */
  private readonly handleFinished = (
    event: AnimationMixerEventMap["finished"],
  ) => {
    const ready = this.ready
    const mixer = this.mixer
    if (ready === null || mixer === null || event.action !== ready) {
      return
    }
    const idle = this.idle
    if (idle !== null && this.idleStarted) {
      idle.reset().play()
      idle.paused = this.paused
      ready.crossFadeTo(idle, READY_FADE_S, false)
      this.readyState = "settling"
      this.settleUntil = mixer.time + READY_FADE_S
    } else {
      this.readyState = "none"
    }
  }

  /* -------------------------------------------------------------- *
   * Camera (section 30)
   * -------------------------------------------------------------- */

  setAspect(aspect: number): void {
    if (Number.isFinite(aspect) && aspect > 0 && aspect !== this.aspect) {
      this.aspect = aspect
      this.updateCamera()
    }
  }

  private updateCamera(): void {
    const distance =
      BASE_DISTANCE * Math.max(1, WIDTH_REGIME_ASPECT / this.aspect)
    const aim = AIM_PER_DISTANCE * distance
    const pitch = toRad(PITCH_DEG)
    const theta = toRad(this.theta)
    this.camera.position.set(
      distance * Math.cos(pitch) * Math.sin(theta),
      aim + distance * Math.sin(pitch),
      distance * Math.cos(pitch) * Math.cos(theta),
    )
    this.camera.lookAt(0, aim, 0)
  }

  get azimuth(): number {
    return this.theta
  }

  /** Drag: follows the pointer, no easing, no inertia. */
  setAzimuth(theta: number): void {
    this.tween = null
    this.theta = theta
    this.updateCamera()
  }

  /** Turn left: θ + 30. Turn right: θ − 30. Repeated presses accumulate. */
  turn(direction: 1 | -1, reducedMotion: boolean, now: number): void {
    const target = (this.tween?.to ?? this.theta) + direction * STEP_DEG
    this.moveTo(target, STEP_MS, reducedMotion, now)
  }

  /** Back to θ = 30 by the shorter way: 240ms per 30°, at most 480ms. */
  resetView(reducedMotion: boolean, now: number): void {
    let delta = (DEFAULT_AZIMUTH_DEG - this.theta) % 360
    if (delta > 180) {
      delta -= 360
    } else if (delta <= -180) {
      delta += 360
    }
    const duration = Math.min(RESET_MAX_MS, (STEP_MS * Math.abs(delta)) / STEP_DEG)
    this.moveTo(this.theta + delta, duration, reducedMotion, now)
  }

  private moveTo(target: number, duration: number, cut: boolean, now: number) {
    if (cut || duration <= 0) {
      this.tween = null
      this.theta = target
    } else {
      this.tween = { from: this.theta, to: target, start: now, duration }
    }
    this.updateCamera()
  }

  /**
   * One frame: the view's easing and the clips. Returns whether another
   * frame is needed for them. The ready clip and its fade advance the mixer
   * on their own, not only while the idle plays (FEATURE-012 A.4).
   */
  frame(deltaSeconds: number, now: number, animate: boolean): boolean {
    let more = false
    if (this.tween !== null) {
      const progress = Math.min(1, (now - this.tween.start) / this.tween.duration)
      this.theta =
        this.tween.from + (this.tween.to - this.tween.from) * easeUi(progress)
      if (progress >= 1) {
        this.theta = this.tween.to
        this.tween = null
      } else {
        more = true
      }
      this.updateCamera()
    }
    const readyRunning = this.readyState !== "none"
    if (
      this.mixer !== null &&
      animate &&
      !this.paused &&
      (this.idlePlaying || readyRunning)
    ) {
      this.mixer.update(Math.min(deltaSeconds, MAX_FRAME_STEP_S))
      if (this.readyState === "settling" && this.mixer.time >= this.settleUntil) {
        this.readyState = "none"
      }
      more = true
    }
    return more
  }

  /* -------------------------------------------------------------- *
   * Disposal (section 28.5)
   * -------------------------------------------------------------- */

  dispose(): void {
    this.mixer?.removeEventListener("finished", this.handleFinished)
    this.mixer?.stopAllAction()
    if (this.avatar !== null) {
      this.mixer?.uncacheRoot(this.avatar)
    }
    const roots: Object3D[] = [this.scene]
    for (const loaded of this.gear.values()) {
      roots.push(loaded.root, ...loaded.attachments.map((entry) => entry.node))
    }
    if (this.avatar !== null) {
      roots.push(this.avatar)
    }
    const seen = new Set<object>()
    for (const root of roots) {
      root.traverse((object) => {
        const mesh = object as Mesh
        if (mesh.isMesh && !seen.has(mesh.geometry)) {
          seen.add(mesh.geometry)
          mesh.geometry.dispose()
        }
        if (mesh.isMesh && !Array.isArray(mesh.material)) {
          mesh.material.dispose()
        }
      })
    }
    for (const material of this.materials.values()) {
      material.dispose()
    }
    this.materials.clear()
    this.shadowTexture.dispose()
    this.gear.clear()
    this.managed.clear()
    this.slots.clear()
    this.avatar = null
    this.mixer = null
    this.idle = null
    this.ready = null
    this.readyState = "none"
  }
}

/**
 * The one runtime texture (section 33): `ink` with alpha from 0.35 at the
 * centre to 0 at the rim, 128 × 128, drawn in code.
 */
function makeShadowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = SHADOW_TEXTURE_SIZE
  canvas.height = SHADOW_TEXTURE_SIZE
  const context = canvas.getContext("2d")
  if (context !== null) {
    const half = SHADOW_TEXTURE_SIZE / 2
    const gradient = context.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, `rgba(${SHADOW_RGB}, ${SHADOW_ALPHA})`)
    gradient.addColorStop(1, `rgba(${SHADOW_RGB}, 0)`)
    context.fillStyle = gradient
    context.fillRect(0, 0, SHADOW_TEXTURE_SIZE, SHADOW_TEXTURE_SIZE)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
