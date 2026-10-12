/**
 * The Public Landing's hero scenes (FEATURE-001 §5, §11.7).
 *
 * This list is the only place scene ids, order, durations, focal points,
 * captions, and media paths are declared. To replace a scene's media, or to
 * switch it between a still image and a video, edit its definition here and
 * add the files under public/media/hero/. Nothing else needs to change.
 */

/** A scene is drawn from one of two kinds of media. */
export type SceneMediaSource =
  | {
      kind: "image"
      /** URL of the still image. */
      src: string
    }
  | {
      kind: "video"
      /** URL of the video. Played muted, once per turn; never looped. */
      src: string
      /** URL of the still shown until the video has a frame, and if it fails. */
      poster: string
    }

export type HeroScene = {
  /** Stable identifier. */
  id: string
  /** Human-readable name, for people editing this list. */
  name: string
  /** The scene's product meaning, shown beside the pause control. */
  caption: string
  /**
   * Display time, from the start of this scene's fade-in to the start of the
   * next scene's fade-in, so it includes the cross-fade. 5000–10000.
   * A video scene's clip is not looped, so keep this at or under its length.
   */
  durationMs: number
  /** Focal point kept in view when the frame is cover-cropped. */
  objectPosition: string
  media: SceneMediaSource
}

/** Playback order: A → B → C → A, looping. */
export const heroScenes: readonly HeroScene[] = [
  {
    id: "alpine-lake",
    name: "Sunny Alpine Lake",
    caption: "Discover somewhere beautiful",
    durationMs: 5000,
    objectPosition: "80% 30%",
    media: {
      kind: "video",
      src: "/media/hero/scene1.mp4",
      poster: "/media/hero/scene1.png",
    },
  },
  {
    id: "rain-forest",
    name: "Rainy Pacific Northwest Forest",
    caption: "Plan around the weather",
    durationMs: 5000,
    objectPosition: "40% 30%",
    media: {
      kind: "video",
      src: "/media/hero/scene2.mp4",
      poster: "/media/hero/scene2.png",
    },
  },
  {
    id: "mountain-ridge",
    name: "Cold Mountain Ridge",
    caption: "Prepare for the conditions",
    durationMs: 5000,
    objectPosition: "22% 30%",
    media: {
      kind: "video",
      src: "/media/hero/scene3.mp4",
      poster: "/media/hero/scene3.png",
    },
  },
]
