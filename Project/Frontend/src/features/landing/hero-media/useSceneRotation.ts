import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
} from "react"
import type { HeroScene } from "./scenes"

/**
 * Scene rotation for the hero media layer (FEATURE-001 §11.7, §11.9–11.12).
 *
 * Owns which scene is on top, the timing read from each scene's `durationMs`,
 * play / pause, the reduced-motion default, suspension while the document is
 * hidden, and the readiness, skip, and video-fetch-order rules. It never looks
 * at a scene's media kind: it only hears, per scene, when the still is ready
 * (or failed) and when the deferred media has settled.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

/** Used only if the `--duration-scene-fade` token cannot be read. */
const FALLBACK_SCENE_FADE_MS = 1200

type StillStatus = "pending" | "ready" | "failed"

type RotationState = {
  /** Poster or still image of each scene. */
  stills: readonly StillStatus[]
  /** Whether each scene's deferred media (its video) is playable or has failed. */
  motionSettled: readonly boolean[]
  /** The scene on top: fading in, or fully shown. Null until one can render. */
  currentIndex: number | null
  /** The outgoing scene, kept fully opaque underneath during a cross-fade. */
  previousIndex: number | null
  /** Whether the current scene's entrance is a cross-fade. Set when its turn starts. */
  fading: boolean
  /** Grows each time a scene's turn starts. */
  turn: number
  /** A turn ended but the next scene's still was not ready yet. */
  awaitingNext: boolean
  playing: boolean
  /** Playback has been on at least once, which is what lets video be fetched. */
  motionUnlocked: boolean
}

type RotationAction =
  | { type: "still-settled"; index: number; ok: boolean }
  | { type: "motion-settled"; index: number }
  | { type: "turn-elapsed"; turn: number }
  | { type: "fade-ended"; turn: number }
  | { type: "playing-toggled" }
  | { type: "playing-set"; playing: boolean }

type NextScene =
  | { kind: "scene"; index: number }
  /** The next scene in order is still loading its still: hold. */
  | { kind: "wait" }
  /** No scene can render. */
  | { kind: "none" }

/**
 * The first scene that can be shown, walking the scene order from `from` and
 * wrapping. Failed stills are skipped; a pending one holds the rotation.
 */
function findNextScene(stills: readonly StillStatus[], from: number): NextScene {
  for (let step = 0; step < stills.length; step += 1) {
    const index = (from + step) % stills.length
    const status = stills[index]

    if (status === "ready") {
      return { kind: "scene", index }
    }
    if (status === "pending") {
      return { kind: "wait" }
    }
  }

  return { kind: "none" }
}

function startScene(state: RotationState, index: number): RotationState {
  if (index === state.currentIndex) {
    // The only scene left. It stays, without rotation.
    return state.awaitingNext ? { ...state, awaitingNext: false } : state
  }

  // The first scene fades in from the base colour; later ones fade in over the
  // outgoing scene. While paused (the reduced-motion start) it is instant.
  const fading = state.playing

  return {
    ...state,
    currentIndex: index,
    previousIndex: fading ? state.currentIndex : null,
    fading,
    turn: state.turn + 1,
    awaitingNext: false,
  }
}

function advance(state: RotationState): RotationState {
  if (state.currentIndex === null) {
    const first = findNextScene(state.stills, 0)
    return first.kind === "scene" ? startScene(state, first.index) : state
  }

  const next = findNextScene(state.stills, state.currentIndex + 1)
  if (next.kind === "scene") {
    return startScene(state, next.index)
  }

  return state.awaitingNext ? state : { ...state, awaitingNext: true }
}

function rotationReducer(
  state: RotationState,
  action: RotationAction,
): RotationState {
  switch (action.type) {
    case "still-settled": {
      if (state.stills[action.index] !== "pending") {
        return state
      }

      const stills = state.stills.map((status, index) =>
        index === action.index ? (action.ok ? "ready" : "failed") : status,
      )
      const settled = { ...state, stills }

      // Show the first scene as soon as it can render, and release a rotation
      // that was held waiting for this still.
      if (state.currentIndex === null || (state.awaitingNext && state.playing)) {
        return advance(settled)
      }
      return settled
    }

    case "motion-settled": {
      if (state.motionSettled[action.index]) {
        return state
      }

      return {
        ...state,
        motionSettled: state.motionSettled.map(
          (settled, index) => settled || index === action.index,
        ),
      }
    }

    case "turn-elapsed": {
      if (action.turn !== state.turn || !state.playing) {
        return state
      }
      return advance(state)
    }

    case "fade-ended": {
      if (action.turn !== state.turn || state.previousIndex === null) {
        return state
      }
      // Only now is the outgoing scene hidden.
      return { ...state, previousIndex: null }
    }

    case "playing-toggled":
      return setPlaying(state, !state.playing)

    case "playing-set":
      return setPlaying(state, action.playing)
  }
}

function setPlaying(state: RotationState, playing: boolean): RotationState {
  if (state.playing === playing) {
    return state
  }
  return {
    ...state,
    playing,
    motionUnlocked: state.motionUnlocked || playing,
  }
}

function createInitialState(sceneCount: number): RotationState {
  // The system setting decides the starting state only (§11.10, §11.12).
  const playing = !window.matchMedia(REDUCED_MOTION_QUERY).matches

  return {
    stills: Array.from({ length: sceneCount }, () => "pending" as const),
    motionSettled: Array.from({ length: sceneCount }, () => false),
    currentIndex: null,
    previousIndex: null,
    fading: false,
    turn: 0,
    awaitingNext: false,
    playing,
    motionUnlocked: playing,
  }
}

/**
 * Which scenes may fetch their deferred media now (§11.9 "Loading order").
 * Nothing until the first scene's still has rendered or failed and playback
 * has been on; then strictly one at a time, in scene order.
 */
function selectMotionLoad(state: RotationState): boolean[] {
  let open = state.motionUnlocked && state.stills[0] !== "pending"

  return state.stills.map((status, index) => {
    if (!open || status === "failed") {
      // A scene whose still failed is skipped and does not block the queue.
      return false
    }
    if (status === "pending") {
      open = false
      return false
    }
    if (!state.motionSettled[index]) {
      // This scene's turn to fetch; the ones after it wait for it.
      open = false
    }
    return true
  })
}

/** The cross-fade length, read from the `--duration-scene-fade` token. */
function readSceneFadeMs(): number {
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--duration-scene-fade")
    .trim()
  const amount = Number.parseFloat(raw)

  if (!Number.isFinite(amount)) {
    return FALLBACK_SCENE_FADE_MS
  }
  return raw.endsWith("ms") ? amount : amount * 1000
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

function isDocumentVisible() {
  return document.visibilityState !== "hidden"
}

export type SceneRotation = {
  scenes: readonly HeroScene[]
  /** The scene on top, or null while nothing has rendered. */
  currentIndex: number | null
  /** The scene underneath during a cross-fade, otherwise null. */
  previousIndex: number | null
  /** Whether the current scene's entrance is a cross-fade. */
  fading: boolean
  /** The pause / play control's state. */
  playing: boolean
  /** Playing and the document is visible: rotation and video are running. */
  running: boolean
  /** Per scene: whether its deferred media may be fetched yet. */
  motionLoad: readonly boolean[]
  togglePlaying: () => void
  /** A scene's poster or still image has rendered (`ok`) or failed. */
  reportStill: (sceneId: string, ok: boolean) => void
  /** A scene's deferred media is playable, has failed, or does not exist. */
  reportMotionSettled: (sceneId: string) => void
}

export function useSceneRotation(scenes: readonly HeroScene[]): SceneRotation {
  const [state, dispatch] = useReducer(
    rotationReducer,
    scenes.length,
    createInitialState,
  )
  const { currentIndex, previousIndex, fading, turn, playing } = state

  const documentVisible = useSyncExternalStore(
    subscribeToVisibility,
    isDocumentVisible,
    () => true,
  )
  const running = playing && documentVisible

  // A change of the system setting takes effect without a reload: turning
  // reduced motion on pauses, turning it off plays.
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      dispatch({ type: "playing-set", playing: !event.matches })
    }

    query.addEventListener("change", handleChange)
    return () => query.removeEventListener("change", handleChange)
  }, [])

  // The current scene's turn. Pausing, or hiding the document, drops the
  // timer; resuming starts the scene's full duration again.
  const currentDurationMs =
    currentIndex === null ? null : scenes[currentIndex].durationMs

  useEffect(() => {
    if (currentDurationMs === null || !running) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "turn-elapsed", turn })
    }, currentDurationMs)
    return () => window.clearTimeout(timer)
  }, [currentDurationMs, running, turn])

  // The cross-fade always runs to completion, paused or not.
  useEffect(() => {
    if (previousIndex === null) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "fade-ended", turn })
    }, readSceneFadeMs())
    return () => window.clearTimeout(timer)
  }, [previousIndex, turn])

  const togglePlaying = useCallback(() => {
    dispatch({ type: "playing-toggled" })
  }, [])

  const reportStill = useCallback(
    (sceneId: string, ok: boolean) => {
      const index = scenes.findIndex((scene) => scene.id === sceneId)
      if (index !== -1) {
        dispatch({ type: "still-settled", index, ok })
      }
    },
    [scenes],
  )

  const reportMotionSettled = useCallback(
    (sceneId: string) => {
      const index = scenes.findIndex((scene) => scene.id === sceneId)
      if (index !== -1) {
        dispatch({ type: "motion-settled", index })
      }
    },
    [scenes],
  )

  const motionLoad = useMemo(() => selectMotionLoad(state), [state])

  return useMemo(
    () => ({
      scenes,
      currentIndex,
      previousIndex,
      fading,
      playing,
      running,
      motionLoad,
      togglePlaying,
      reportStill,
      reportMotionSettled,
    }),
    [
      scenes,
      currentIndex,
      previousIndex,
      fading,
      playing,
      running,
      motionLoad,
      togglePlaying,
      reportStill,
      reportMotionSettled,
    ],
  )
}
