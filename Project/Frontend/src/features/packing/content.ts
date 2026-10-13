/**
 * Every user-facing string of Trip Preparation (FEATURE-004 section 21.16).
 * Ids in comments are the specification's. None names a service, a status
 * code, or a cause the browser cannot know, and none says the trip is safe,
 * suitable, or ready: readiness counts owned gear categories and nothing else.
 *
 * Strings shared with Trail Detail (SH1, SH5–SH7) are in
 * `features/trails/content.ts`; the gear category labels (TP15) are in
 * `./gearCategories.ts`.
 */
export const packContent = {
  /** SH2 */
  trailDetails: "Trail details",
  trailDetailsName: "Back to trail details",

  /** TP1 */
  preparingFor: "Preparing for",
  /** TP2 */
  yourTrip: "your trip",

  date: {
    /** TP3 */
    needed: "Choose a trip date to see what to bring.",
    /** TP4 */
    passed: "That trip date has passed. Choose a new one.",
    /** TP5 */
    refused: "That date can't be used. Choose another one.",
  },

  /** TP6 */
  loading: "Loading your gear list…",
  failure: {
    /** TP7 */
    unavailable:
      "Your gear list couldn't be loaded just now. Try again in a moment.",
    /** TP8 */
    timeout: "That took too long, so we stopped waiting. Try again.",
  },

  readiness: {
    /** TP9 */
    heading: "Packing readiness",
    /** TP11 */
    explanation: "Counts how many of the recommended gear categories you own.",
    /** TP25, after "{n}%". */
    valueText: "of recommended gear categories owned",
  },

  gear: {
    /** TP12 */
    heading: "Recommended gear",
    /** TP13, TP14 */
    missing: "missing",
    owned: "owned",
    stateMissing: "Missing",
    stateOwned: "Owned",
    /** TP16 */
    none: "No specific gear is recommended for this trail on this date.",
    /** TP17 */
    noForecastList: "This list doesn't account for the forecast.",
    /** TP18 */
    noForecast: "This doesn't account for the forecast.",
  },

  forecast: {
    /** TP19 */
    heading: "Forecast",
    /** TP20: "For {date}, at the trailhead." */
    captionStart: "For",
    captionEnd: ", at the trailhead.",
    /** TP21 */
    temperature: "Average temperature",
    precipitation: "Chance of precipitation",
    wind: "Wind up to",
    /** TP22 */
    units: { temperature: " °C", precipitation: "%", wind: " km/h" },
    /** TP23 */
    unavailable: "The forecast isn't available for this date.",
  },

  /** TP24 */
  briefingName: "Gear list and forecast",

  /** DT2 */
  title: {
    suffix: "Trip preparation · Outdoor Trip Companion",
    separator: " · ",
  },

  /** Section 23.3 */
  announcements: {
    loading: "Loading your gear list.",
    loaded: "Gear list loaded.",
    readiness: "Packing readiness",
  },
} as const
