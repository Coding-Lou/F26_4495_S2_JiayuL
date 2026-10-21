import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { HeroScene } from "./scenes"

/** Where a scene is in the rotation. */
export type ScenePhase =
  /** Not shown. */
  | "hidden"
  /** Fully opaque underneath the scene that is fading in. */
  | "outgoing"
  /** On top: fading in, or fully shown. */
  | "current"

type SceneMediaProps = {
  scene: HeroScene
  phase: ScenePhase
  /** The rotation is running: not paused, and the document is visible. */
  running: boolean
  /** Fetch priority of the scene's poster or still image. */
  stillPriority: "high" | "low"
  /** This scene's turn to fetch its deferred media has come. */
  loadMotion: boolean
  /** The poster or still image has rendered (`ok`) or failed. */
  onStillSettled: (sceneId: string, ok: boolean) => void
  /** The deferred media is playable, has failed, or does not exist. */
  onMotionSettled: (sceneId: string) => void
}

/** Both kinds of media fill the scene's box, cover-cropped, never stretched. */
const fill = "absolute inset-0 size-full object-cover"

/**
 * Renders one scene's media (FEATURE-001 §11.9).
 *
 * This is the only module that looks at a scene's media kind. A still-image
 * scene is its image. A video scene is its poster with the video drawn over it
 * in the same box; the video is revealed only once it is showing frames, so
 * the swap never exposes the base colour, and the poster is what remains if
 * the video fails, stalls, or is refused.
 */
export function SceneMedia({
  scene,
  phase,
  running,
  stillPriority,
  loadMotion,
  onStillSettled,
  onMotionSettled,
}: SceneMediaProps) {
  const { id, media, objectPosition } = scene

  const settleStill = useCallback(
    (ok: boolean) => onStillSettled(id, ok),
    [id, onStillSettled],
  )
  const settleMotion = useCallback(
    () => onMotionSettled(id),
    [id, onMotionSettled],
  )

  if (media.kind === "video") {
    return (
      <>
        <SceneStill
          src={media.poster}
          objectPosition={objectPosition}
          priority={stillPriority}
          onSettled={settleStill}
        />
        <SceneVideo
          src={media.src}
          objectPosition={objectPosition}
          phase={phase}
          running={running}
          load={loadMotion}
          onSettled={settleMotion}
        />
      </>
    )
  }

  return (
    <>
      <SceneStill
        src={media.src}
        objectPosition={objectPosition}
        priority={stillPriority}
        onSettled={settleStill}
      />
      <NoDeferredMedia due={loadMotion} onSettled={settleMotion} />
    </>
  )
}

type SceneStillProps = {
  src: string
  objectPosition: string
  priority: "high" | "low"
  onSettled: (ok: boolean) => void
}

function SceneStill({ src, objectPosition, priority, onSettled }: SceneStillProps) {
  const imageRef = useRef<HTMLImageElement>(null)

  // Covers an image that finished loading before its handlers were attached.
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete) {
      onSettled(image.naturalWidth > 0)
    }
  }, [onSettled])

  return (
    <img
      ref={imageRef}
      src={src}
      alt=""
      decoding="async"
      fetchPriority={priority}
      draggable={false}
      className={fill}
      style={{ objectPosition }}
      onLoad={(event) => {
        // Decode before reporting, so the fade-in starts on a painted frame.
        const report = () => onSettled(true)
        event.currentTarget.decode().then(report, report)
      }}
      onError={() => onSettled(false)}
    />
  )
}

type SceneVideoProps = {
  src: string
  objectPosition: string
  phase: ScenePhase
  running: boolean
  /** False until this video's fetch turn: until then nothing is requested. */
  load: boolean
  /** The video is playable, or has failed. */
  onSettled: () => void
}

function SceneVideo({
  src,
  objectPosition,
  phase,
  running,
  load,
  onSettled,
}: SceneVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [failed, setFailed] = useState(false)

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (video) {
      silence(video)
    }
  }, [])

  // Playback is driven by the rotation, never by an `autoplay` attribute.
  useEffect(() => {
    const video = videoRef.current
    if (!video || failed) {
      return
    }

    if (phase === "hidden") {
      // Not active and not fading: paused and back at its beginning.
      video.pause()
      if (video.currentTime !== 0) {
        video.currentTime = 0
      }
      return
    }

    if (!running || !load) {
      // Paused on its current frame, or not yet allowed to fetch.
      video.pause()
      return
    }

    // A clip plays once per turn and then holds its last frame. Calling
    // play() on an ended clip would restart it, which is a visible hard cut.
    if (video.ended) {
      return
    }

    // A scene already on its way out does not start a clip it never began.
    if (phase === "outgoing" && video.currentTime === 0) {
      video.pause()
      return
    }

    // If the clip is not playable yet, the browser starts it, from its
    // beginning, as soon as it is. A refused or interrupted play() leaves the
    // poster in place; that is the fallback.
    silence(video)
    video.play().catch(() => undefined)
  }, [phase, running, load, failed])

  return (
    <video
      ref={attachVideo}
      src={load ? src : undefined}
      preload={load ? "auto" : "none"}
      muted
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-hidden="true"
      className={cn(fill, revealed && !failed ? "opacity-100" : "opacity-0")}
      style={{ objectPosition }}
      onCanPlay={onSettled}
      onPlaying={() => setRevealed(true)}
      onVolumeChange={(event) => silence(event.currentTarget)}
      onError={() => {
        setFailed(true)
        onSettled()
      }}
    />
  )
}

/**
 * No state of the page may produce sound, whatever a file contains. React sets
 * `muted` as a property and does not reliably write the attribute, so the
 * attribute (`defaultMuted`), the property, and the volume are all set here,
 * before any play() call, and again if anything ever changes them.
 */
function silence(video: HTMLVideoElement) {
  if (!video.defaultMuted) {
    video.defaultMuted = true
  }
  if (!video.muted) {
    video.muted = true
  }
  if (video.volume !== 0) {
    video.volume = 0
  }
}

type NoDeferredMediaProps = {
  due: boolean
  onSettled: () => void
}

/**
 * A still-image scene has nothing to fetch later. It says so when its turn
 * comes, so the scenes after it are not kept waiting.
 */
function NoDeferredMedia({ due, onSettled }: NoDeferredMediaProps) {
  useEffect(() => {
    if (due) {
      onSettled()
    }
  }, [due, onSettled])

  return null
}
