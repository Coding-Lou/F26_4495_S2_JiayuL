/**
 * Every user-facing string of the Hero, the first section of the public
 * homepage (FEATURE-006 sections 12, 16.5, 16.17; FEATURE-001 §11.10 for the
 * scene control). Two exceptions: scene captions belong to the scene
 * definitions in hero-media/scenes, and the authentication gate and notices
 * (FEATURE-002) belong to features/auth and reach the Hero through the auth
 * boundary.
 *
 * The Hero has no planner: FEATURE-001's planner, suggestion, and
 * validation strings are not part of it (FEATURE-006 D2).
 */
export const landingContent = {
  /** HR1: one sentence per line from 768px. */
  heading: ["Discover the trail.", "Prepare for the journey."],
  /** HR2 (user decision, 2026-10-15) */
  supporting:
    "Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories.",
  /** HR3, followed by a down arrow. */
  explore: "Explore trails",

  sceneControl: {
    pause: "Pause background animation",
    play: "Play background animation",
  },
} as const
