import type { TrailRecommendationContext } from "@/features/planning/trailContext"

/**
 * Every user-facing string of Trail Detail, and the strings it shares with
 * Trip Preparation (FEATURE-004 section 21.16). Ids in comments are the
 * specification's. None names a service, a status code, or a cause the
 * browser cannot know.
 *
 * A trail's name and description are not here: they are the backend's text,
 * shown as returned. The trip-date control's strings (SH8) and the score
 * part labels (TD9) are FEATURE-003's and stay with the planner.
 */
export const tripContent = {
  /** SH1 */
  backToPlanning: "Back to planning",
  /** SH5 */
  notFoundHeading: "Trail not found",
  /** SH6 */
  notFoundBody:
    "We couldn't find this trail. The link may be incomplete or out of date.",
  /** SH7 */
  stillLoading: "Still loading. This is taking a little longer.",
  /** DT3 */
  notFoundTitle: "Trail not found · Outdoor Trip Companion",
  /** Section 23.3 */
  notFoundAnnouncement: "Trail not found.",
} as const

export const trailContent = {
  /** TD1 */
  unnamed: "Trail",
  /** TD2 */
  loading: "Loading trail…",
  /** TD3 */
  facts: {
    difficulty: "Difficulty",
    distance: "Distance",
    elevation: "Elevation",
    duration: "Estimated time",
  },
  /** Read before the scenery line by assistive technology only (21.4). */
  sceneryPrefix: "Scenery: ",
  /** TD4 */
  noPhoto: "No photo of this trail yet.",
  /** TD5 */
  noRoute: "Route maps aren't available yet.",
  /** TD6 */
  sampleData: "This is sample trail data.",

  why: {
    /** TD7 */
    heading: "Why this trail",
    /** TD8 */
    matchScore: "Match score",
    totalMax: 100,
    /** Section 23.4: values are read as "86 out of 100". */
    outOf: "out of",
    /** TD10 */
    scoredFor: "Scored for",
    from: {
      device: "from your location",
      vancouver: "from Vancouver",
    } satisfies Record<TrailRecommendationContext["usedStartingPoint"], string>,
    /** TD11 */
    caption: "Scores from the planner. They aren't a forecast or a gear list.",
  },

  /** TD12 */
  choose: "Choose this trail",
  /** TD13 */
  dateNeeded: "Choose a trip date to continue.",

  failure: {
    /** TD14 */
    heading: "This trail couldn't be loaded",
    /** TD15 */
    unavailable: "The trail details didn't load. Try again in a moment.",
    /** TD16 */
    timeout: "Loading took too long, so we stopped waiting. Try again.",
  },

  /** DT1 */
  title: {
    suffix: "Trail details · Outdoor Trip Companion",
    separator: " · ",
  },

  /** Section 23.3 */
  loadedAnnouncement: "Trail details loaded.",
} as const

/** The wire value of the seeded sample trails (section 7.1). Never shown. */
export const SAMPLE_DATA_SOURCE = "DEMO_SEED"
