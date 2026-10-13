import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { HOME_VIDEO_QUERY, type HomeMediaAsset } from "./homeMediaConfig"

type HomeMediaProps = {
  asset: HomeMediaAsset
  /**
   * Called when the Pause / Play control is removed while it holds focus, so
   * the shell can put focus somewhere that still exists (section 18.2).
   */
  onControlRemoved?: () => void
}

const MEDIA_LABELS = {
  pause: "Pause background animation",
  play: "Play background animation",
} as const

/**
 * The Home background (FEATURE-003 section 8): the poster, the looping video
 * over it where the video applies, and the Pause / Play control for the loop.
 *
 * It is atmosphere and nothing else. Its inputs are its asset, the motion
 * preference, and the viewport width (M10); it knows nothing about the
 * planner and takes nothing from it. It is mounted once for a visit to
 * `/home`, so no planner change can remount, reload, or seek the video (M6).
 * No part of the interface waits for it (M5), and when it fails the poster,
 * or the shell's base color, simply stays (M4).
 *
 * The layers are fixed behind the page by their own styles. They are rendered
 * last so that the control is the last element in the DOM and in the tab
 * order (section 8.3.4).
 */
export function HomeMedia({ asset, onControlRemoved }: HomeMediaProps) {
  const videoApplies = useMediaQuery(HOME_VIDEO_QUERY)
  const [videoFailed, setVideoFailed] = useState(false)
  const failVideo = useCallback(() => setVideoFailed(true), [])

  return (
    <>
      <HomePoster src={asset.poster} />
      {/* Not rendered means not requested: below 768px, under reduced
          motion, and after a failure there is no video element at all. */}
      {videoApplies && !videoFailed ? (
        <HomeLoop
          src={asset.video}
          onFailed={failVideo}
          onControlRemoved={onControlRemoved}
        />
      ) : null}
    </>
  )
}

/**
 * Layer 1: the poster. It fades in from the base color once it is decoded.
 * If it never loads it stays transparent and the base color shows.
 */
function HomePoster({ src }: { src: string }) {
  const [ready, setReady] = useState(false)

  // Covers an image that finished loading before its handlers were attached.
  const attach = useCallback((image: HTMLImageElement | null) => {
    if (image !== null && image.complete && image.naturalWidth > 0) {
      setReady(true)
    }
  }, [])

  return (
    <img
      ref={attach}
      src={src}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
      draggable={false}
      className="home-media-layer home-media-poster"
      data-ready={ready ? "" : undefined}
      onLoad={(event) => {
        // Decode before revealing, so the fade starts on a painted frame.
        const reveal = () => setReady(true)
        event.currentTarget.decode().then(reveal, reveal)
      }}
    />
  )
}

type HomeLoopProps = {
  src: string
  onFailed: () => void
  onControlRemoved?: () => void
}

/**
 * Layer 2 and its control. The video is drawn over the poster in the same
 * box with the same crop and is revealed only once it is showing frames, so
 * the swap exposes nothing and shifts nothing (M3). It is muted, loops, plays
 * inline, and has no native controls (M2).
 *
 * This component exists only while the video is the background. Its state
 * (revealed, paused) therefore starts afresh whenever the video comes back.
 */
function HomeLoop({ src, onFailed, onControlRemoved }: HomeLoopProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlRef = useRef<HTMLButtonElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [paused, setPaused] = useState(false)

  // Playback is started here, never by an `autoplay` attribute. Where the
  // browser refuses, the poster stays and the control offers Play.
  useEffect(() => {
    const video = videoRef.current
    if (video === null) {
      return
    }

    silence(video)
    video.play().catch(() => {
      if (video.paused) {
        setPaused(true)
      }
    })

    return () => {
      video.pause()
    }
  }, [])

  // Runs while the control is still in the document: if it holds focus as it
  // goes, the shell is told, so focus is not left on a removed element.
  useLayoutEffect(() => {
    const control = controlRef.current
    return () => {
      if (control !== null && document.activeElement === control) {
        onControlRemoved?.()
      }
    }
  }, [onControlRemoved])

  function toggle() {
    const video = videoRef.current
    if (video === null) {
      return
    }

    if (video.paused) {
      // Continues from the frame it was holding.
      silence(video)
      video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }

  const Icon = paused ? Play : Pause

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        aria-hidden="true"
        className="home-media-layer home-media-video"
        data-revealed={revealed ? "" : undefined}
        onPlaying={() => setRevealed(true)}
        onPlay={(event) => setPaused(event.currentTarget.paused)}
        onPause={(event) => setPaused(event.currentTarget.paused)}
        onVolumeChange={(event) => silence(event.currentTarget)}
        onError={onFailed}
      />

      {/* The name carries the state; it is not the browser's own control. */}
      <button
        ref={controlRef}
        type="button"
        className="home-control home-quiet home-media-control"
        aria-label={paused ? MEDIA_LABELS.play : MEDIA_LABELS.pause}
        onClick={toggle}
      >
        <Icon aria-hidden="true" strokeWidth={2} />
      </button>
    </>
  )
}

/**
 * No state of the page may produce sound, whatever the file contains. React
 * sets `muted` as a property and does not reliably write the attribute, so
 * the attribute (`defaultMuted`), the property, and the volume are all set
 * here, before any play() call, and again if anything ever changes them.
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
