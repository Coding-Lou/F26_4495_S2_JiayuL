/**
 * Every user-facing string of Finish preparation (FEATURE-011 section 14,
 * FEATURE-012 section 23). Ids in comments are this file's (FP…, RG…).
 *
 * Nothing here says that an equipped choice is saved, kept, or remembered
 * (FEATURE-005 Q16): only the Plan, the trail and the date, is saved.
 */
export const finishContent = {
  /** FP1 */
  heading: "Ready for the trip?",
  /** FP2 */
  description: "Save this trail and date as your plan.",
  /** FP3 */
  action: "Finish preparation",
  /** FP4 */
  saving: "Saving plan…",
  /** FP5, said once through the Studio's polite announcer */
  savingAnnouncement: "Saving your plan.",
  /** FP6 */
  tryAgain: "Try again",

  /** RG1, the save confirmed and the button kept in place (FEATURE-012 U3) */
  saved: "Plan saved",
  /** RG2, said once through the Studio's polite announcer at save success */
  savedAnnouncement: "Your plan is saved.",
  /** RG3, replaces FP7 "Preparation complete" (FEATURE-012 U3) */
  savedHeading: "Ready for the trail.",
  /** FP8, FP9: a `201` / a `200`, with the trail's name */
  savedBody: (saved: "created" | "existing", trailName: string, date: string) =>
    saved === "created"
      ? `Your plan for ${trailName} on ${date} has been saved.`
      : `Your plan for ${trailName} on ${date} is already saved.`,
  /** FP10, FP11: as FP8, FP9 without a name (defensive only) */
  savedBodyNoName: (saved: "created" | "existing", date: string) =>
    saved === "created"
      ? `Your plan for ${date} has been saved.`
      : `Your plan for ${date} is already saved.`,
  /** FP12 */
  continue: "Continue",

  /** FP13–FP17 (section 14.5) */
  failure: {
    unavailable: "Your plan couldn't be saved right now. Try again in a moment.",
    unconfirmed:
      "We couldn't confirm your plan was saved. Trying again won't create a duplicate.",
    invalidDate: "This trip date has passed. Choose a new date to save your plan.",
    trailGone: "This trail is no longer available, so the plan can't be saved.",
    unexpected: "Your plan couldn't be saved.",
  },
  /** FP18 */
  chooseNewDate: "Choose a new date",
} as const
