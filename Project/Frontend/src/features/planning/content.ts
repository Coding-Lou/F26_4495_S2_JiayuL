import type { FailureKind } from "./types/planner"

/**
 * Every user-facing string of the conversational planner (FEATURE-003
 * sections 5.5, 10.2, 11.5, 12.3, 13.3.3, 14.1, 19.2). Ids in comments are
 * the specification's. None names a service, a status code, or a cause the
 * browser cannot know.
 *
 * The assistant's own sentences are not here: they are the backend's
 * `assistantMessage`, shown verbatim. The greeting is the one exception.
 */
export const plannerContent = {
  title: "Plan a trip",
  conversationLabel: "Conversation",
  plannerLabel: "Planner",
  /** Read before a user message by assistive technology only. */
  userPrefix: "You said: ",

  greeting: {
    /** GR1 */
    heading: "What kind of hike are you looking for?",
    /** GR2 */
    body: "Describe it in your own words: how hard, how long, what you'd like to see. Then set your trip date and starting point with the two buttons under the message box. They aren't picked up from what you type.",
    /** GR3 */
    starterCaption: "Or start from an idea:",
  },

  /** No starter mentions a date or a place: neither is read from text. */
  starters: [
    { label: "Easy lake hike", sentence: "An easy hike with a lake view" },
    { label: "Mountain views", sentence: "A moderate hike with mountain views" },
    {
      label: "Half-day adventure",
      sentence: "A half-day hike, around four hours",
    },
    { label: "Waterfall walk", sentence: "A short, easy walk to a waterfall" },
  ],

  composer: {
    label: "Message to the planner",
    placeholderFirst: "Describe the hike you want",
    placeholderNext: "Answer, or change what you're looking for",
    send: "Send message",
  },

  waiting: {
    /** W1 */
    working: "Working on it…",
    /** W2 */
    stillWorking: "Still working. This one is taking a little longer.",
  },

  /** L1 */
  notSent: "Not sent",

  /** E1–E6 */
  failures: {
    unavailable:
      "The planner couldn't answer just now. Your message is still here. Try again in a moment.",
    timeout:
      "That took too long, so we stopped waiting. Your message is still here.",
    "not-accepted":
      "This message can't be used for trip planning. Edit it to describe the hike you want.",
    "invalid-request":
      "That request didn't go through. Check the trip date and starting point, then try again.",
    "sign-in":
      "We couldn't confirm your sign-in for this message. Try again. If it keeps happening, sign out and sign in again.",
    interrupted: "This message hadn't been answered when the page reloaded.",
  } satisfies Record<FailureKind, string>,

  failureActions: {
    retry: "Retry",
    edit: "Edit message",
  },

  notes: {
    V1: "Your message is over the 2,000-character limit. Shorten it to send.",
    V2: "Choose a trip date to send your message.",
    V3: "Choose a starting point to send your message.",
    V4: "Choose a trip date and a starting point to send your message.",
    V5: "The trip date you chose has passed. Choose a new one.",
    N1: "This is your request from before signing in. Set a trip date and starting point below, then send it. A day or place written in the message isn't picked up.",
    N2: "Trip date changed. It applies from your next message. Results already shown keep their own date.",
    N3: "Starting point changed. It applies from your next message. Results already shown keep their own starting point.",
  },

  date: {
    unsetLabel: "Trip date",
    namePrefix: "Trip date: ",
    notSet: "not set",
    popoverTitle: "When are you going?",
    inputLabel: "Or pick a date",
    /** D1 */
    past: "Choose today or a later date.",
  },

  startingPoint: {
    unsetLabel: "Starting point",
    namePrefix: "Starting point: ",
    notSet: "not set",
    popoverTitle: "Where are you starting from?",
    labels: { device: "Your location", vancouver: "Vancouver" },
    /** As it reads after "from" in a caption. */
    fromLabels: { device: "your location", vancouver: "Vancouver" },
    useDevice: "Use my location",
    useDeviceHint: "We use it to find trails near you.",
    useVancouver: "Use Vancouver",
    useVancouverHint: "Start from downtown Vancouver.",
    /** Label of the control while a lookup runs. */
    finding: "Finding location…",
    /** The same, below 360px. */
    findingShort: "Finding…",
    /** G1 */
    findingOption: "Finding your location…",
    /** G2–G5 */
    errors: {
      denied:
        "Location access is off for this site. Allow it in your browser settings, or use Vancouver.",
      unavailable: "Your location couldn't be found. Try again, or use Vancouver.",
      timeout:
        "Finding your location took too long. Try again, or use Vancouver.",
      unsupported: "This browser can't share a location. Use Vancouver instead.",
    },
  },

  /** The plan summary line: a preference the user left open (post-freeze). */
  summary: {
    anyDifficulty: "Any difficulty",
    anyTripLength: "Any trip length",
    anyScenery: "Any scenery",
    /** The trip length by its meaning; `{duration}` is e.g. "4 h". */
    durationApproximate: "Around {duration}",
    durationMaximum: "Up to {duration}",
    durationMinimum: "At least {duration}",
  },

  results: {
    matchScore: "Match score",
    scoreOutOf: "out of 100",
    scoreDetails: "Score details",
    more: "More",
    less: "Less",
    /** FEATURE-004 section 4.2: the card's one link. */
    viewTrail: "View trail",
    earlier: "Earlier results",
    breakdown: {
      intent: { label: "Your preferences", max: 55 },
      weather: { label: "Weather", max: 15 },
      gear: { label: "Your gear", max: 15 },
      scenery: { label: "Scenery", max: 10 },
      proximity: { label: "Distance from you", max: 5 },
    },
    breakdownNote: "Scores only. The forecast and gear details aren't shown here.",
    whatToTry: "What to try",
    /** Z1 */
    zeroGuidance:
      "Try a different difficulty, more time or distance, or another kind of scenery. A different starting point can help too.",
  },

  newReply: "New reply",

  newPlan: {
    action: "New Plan",
    /** C1 */
    confirm: "Start a new plan? This conversation and its results will be cleared.",
    start: "Start new plan",
    keep: "Keep this plan",
  },

  announcements: {
    sent: "Sent. Waiting for the planner.",
    replyPrefix: "Planner: ",
    resultsSuffix: "Details are in the conversation.",
    failedPrefix: "Not sent. ",
    newPlan: "New plan started.",
  },
} as const

export type PlannerNoteId = keyof typeof plannerContent.notes

export type GeolocationErrorKind = keyof typeof plannerContent.startingPoint.errors
