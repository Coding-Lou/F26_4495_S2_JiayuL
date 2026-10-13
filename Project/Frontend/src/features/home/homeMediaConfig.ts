/**
 * The Authenticated Home background (FEATURE-003 section 8.1): a pre-rendered
 * looping video of a preparation room and the still it opens on. The files
 * are used as delivered (D17); replacing the background means changing these
 * two paths, not the layout.
 *
 * How each is cropped at each width is presentation and lives in `home.css`.
 */
export type HomeMediaAsset = {
  /** The base layer, and the whole background where the video does not apply. */
  poster: string
  /** Muted loop with no audio track, drawn over the poster in the same box. */
  video: string
}

export const homeMedia: HomeMediaAsset = {
  poster: "/media/home/background.png",
  video: "/media/home/background.mp4",
}

/**
 * Where the video is the background (D26): from 768px wide, with motion
 * allowed. Anywhere else the poster is, and the video is not requested.
 */
export const HOME_VIDEO_QUERY =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)"
