import { PLANNING_PROMPT_MAX_LENGTH } from "@/features/planning/planningPrompt"

/**
 * Every user-facing string on the Public Landing (FEATURE-001 §11.1, §11.4,
 * §11.5, §11.10, §11.11). Two exceptions: scene captions belong to the scene
 * definitions in hero-media/scenes, and the authentication gate and notices
 * (FEATURE-002) belong to features/auth and reach the landing through the
 * auth boundary.
 */

const characterCount = new Intl.NumberFormat("en-US")
const promptLimit = characterCount.format(PLANNING_PROMPT_MAX_LENGTH)

export const landingContent = {
  brand: "Outdoor Trip Companion",
  navigationLabel: "Primary",
  signIn: "Sign in",

  heading: "Plan your next outdoor adventure",
  supporting:
    "Describe your trip. We plan it around the trail, the weather, and your gear.",

  planner: {
    label: "Where do you want to go?",
    placeholder: "A moderate lake hike this Saturday",
    submitLabel: "Start planning",
  },

  suggestionsLabel: "Suggested requests",
  /** In scene order: lake, rain, mountain (§11.5). */
  suggestions: [
    "Lake view trail",
    "Rain-friendly short hike",
    "Moderate mountain hike this weekend",
  ],

  validation: {
    /** E1 */
    empty: "Enter a trip request first, or pick a suggestion below.",
    /** E2 */
    overLimit: `Your request is over the ${promptLimit}-character limit. Shorten it to continue.`,
    counter: (length: number) =>
      `${characterCount.format(length)} of ${promptLimit} characters`,
  },

  sceneControl: {
    pause: "Pause background animation",
    play: "Play background animation",
  },
} as const
