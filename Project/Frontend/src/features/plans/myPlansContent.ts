import { trailContent } from "@/features/trails/content"

/**
 * Every user-facing string of My Plans (FEATURE-013 section 10.11, and
 * FEATURE-014 section 10.8 for the Memory bridge). Ids in comments are the
 * specifications'. `content.ts` stays Finish preparation's. None names a
 * service, a status code, or a cause the browser cannot know. Only the
 * bridge of a selected Past Plan on a curated trail mentions Memories.
 */
export const myPlansContent = {
  documentTitle: "My Plans · Outdoor Trip Companion",
  /** PL2 */
  title: "My Plans",
  /** PL3 */
  support: "The trips you've finished preparing for.",

  /** PL4 */
  upcoming: "Upcoming",
  /** PL5 */
  past: "Past",

  /** PL6 */
  ready: "Ready to go",
  /** PL7 */
  today: "Today",

  trail: {
    /** PL8 */
    gone: "Trail unavailable",
    /** PL9 */
    failed: "Trail details couldn't be loaded.",
    /** PL10 */
    loading: "Loading trail",
  },

  /** PL11, the entry's accessible name. */
  entryName: (name: string, longDate: string, today: boolean, ready: boolean) =>
    [name, longDate, today ? "Today" : null, ready ? "Ready to go" : null]
      .filter((part): part is string => part !== null)
      .join(", "),

  /** PL12 */
  facts: {
    difficulty: "Difficulty",
    distance: "Distance",
    duration: "Duration",
    elevation: "Elevation gain",
  },

  /** PL13 */
  sampleData: trailContent.sampleData,
  /** PL14 */
  datePassed: "This trip date has passed.",
  /** PL15 */
  trailGone: "This trail is no longer available. You can still delete this plan.",

  /** PL16 */
  viewTrail: "View trail",
  /** PL17 */
  reviewGear: "Review gear",
  /** PL18 */
  deletePlan: "Delete plan",

  /** The Memory bridge (FEATURE-014 section 10.8). */
  memory: {
    /** PM1 */
    ask: "How was your trip?",
    /** PM2, also the announcement for View memory. */
    kept: "You kept a memory of this trip.",
    /** PM3, hidden while checking; announced only after 500 ms. */
    checking: "Checking for a memory of this trip…",
    /** PM4 */
    unavailable: "Memory status is unavailable.",
    /** PM5 */
    add: "Add memory",
    /** PM6 */
    view: "View memory",
    /** PM7, an announcement only. */
    canAdd: "You can add a memory of this trip.",
  },

  remove: {
    /** PL19 */
    question: "Delete this plan?",
    /** PL20 */
    body: "This removes it from My Plans. Your gear and trail data are not deleted.",
    /** PL21 */
    cancel: "Cancel",
    /** PL22 */
    confirm: "Delete",
    /** PL23 */
    working: "Deleting…",
    /** PL24 */
    failed: "This plan couldn't be deleted. Try again.",
    /** PL25 */
    done: "Plan deleted.",
  },

  filter: {
    /** PL26 */
    line: (count: number, longDate: string) => `${count} plans on ${longDate}`,
    /** PL27 */
    showAll: "Show all plans",
    /** PL28 */
    announce: (count: number, longDate: string) =>
      `Showing ${count} plans on ${longDate}.`,
    /** PL29 */
    announceAll: "Showing all plans.",
    /** PL46 */
    announceOne: (name: string, longDate: string) =>
      `Showing your plan for ${name} on ${longDate}.`,
  },

  calendar: {
    /** PL30 */
    previous: "Previous month",
    /** PL31 */
    next: "Next month",
    /** PL34 */
    dayName: (longDate: string, count: number, today: boolean) =>
      `${today ? "Today, " : ""}${longDate}, ${count === 1 ? "1 plan" : `${count} plans`}`,
    /** PL34, a plain today cell. */
    plainToday: ", today",
    /** PL35a */
    legendUpcoming: "Upcoming plan",
    /** PL35b */
    legendPast: "Past plan",
    /** PL36 */
    heading: "Plan calendar",
  },

  /** PL37 */
  loading: "Loading your plans…",

  empty: {
    /** PL38 */
    heading: "No plans yet.",
    /** PL39 (wording as approved 2026-10-20) */
    body: "Plan a trip and finish your preparation to see it here.",
  },
  /** PL40 */
  planTrip: "Plan a trip",
  /** PL41 */
  noUpcoming: "No upcoming plans.",

  /** PL42 */
  failed: "Your plans couldn't be loaded.",
  /** PL45 (amendment A1) */
  incomplete: "Your complete plan list couldn't be loaded.",
  /** PL43 */
  tryAgain: "Try again",
  /** PL44 */
  tryingAgain: "Trying again…",
} as const
