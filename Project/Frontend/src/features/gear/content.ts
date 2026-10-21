import type { GearFamilyChoice } from "./families"

/**
 * My Gear copy (FEATURE-007 section 21.15). User text only: never a status
 * code, an endpoint, a wire value, or backend text. Names inside the strings
 * are the user's own text and are rendered as text.
 */
export const myGearContent = {
  /** MG1 */
  documentTitle: "My Gear · Outdoor Trip Companion",
  /** MG2 */
  title: "My Gear",
  /** MG3 */
  support: "Everything you own for your adventures.",
  /** MG5 */
  addGear: "Add Gear",
  /** MG6 (visually hidden) */
  gridHeading: "Your gear",
  /** MG8 (visually hidden) */
  familyLegend: "Show",
  /** MG9 */
  families: {
    all: "All",
    packs: "Packs",
    layers: "Layers",
    footwear: "Footwear",
    tools: "Tools",
    essentials: "Essentials",
  } satisfies Record<GearFamilyChoice, string>,
  /** MG11 */
  noCategory: "No category",

  detail: {
    /** MG12 (visually hidden) */
    categoryPrefix: "Category:",
    /** MG13 */
    added: (date: string) => `Added ${date}`,
    /** MG14 */
    equipHint: "Gear you own can be equipped when you prepare a trip.",
    /** MG15 */
    edit: "Edit",
    /** MG16 */
    remove: "Remove from My Gear",
    /** MG17 */
    close: "Close",
  },

  form: {
    /** MG18 */
    addTitle: "Add Gear",
    /** MG19 */
    editTitle: "Edit Gear",
    /** MG20 */
    cancel: "Cancel",
    /** MG21 */
    categoryLegend: "Category",
    /** MG22 */
    nameLabel: "Item name",
    /** MG23 */
    nameHelper: "The name you know it by.",
    /** MG24 */
    counter: (count: number) => `${count} of 100`,
    /** MG25 */
    addSubmit: "Add to My Gear",
    /** MG26 */
    categoryHelper: "Choose the kind of gear it is.",
    /** MG27 */
    editSubmit: "Save changes",
    /** MG28 */
    editSaving: "Saving…",
    /** MG29 */
    addSaving: "Adding…",
    /** MG30 */
    categoryMissing: "Choose a category.",
    /** MG31 */
    nameMissing: "Enter a name for this item.",
    /** MG32 */
    nameTooLong: "Use 100 characters or fewer.",
    /** MG33 */
    addTimedOut: "This took too long, and your item wasn't added. Try again.",
    /** MG34 */
    addFailed: "Your item couldn't be added right now. Try again.",
    // MG35 is reserved and unused: a failed response's body is never read, so
    // a rejected add or edit cannot name a field and always shows MG36.
    /** MG36 */
    rejected:
      "This couldn't be saved. Check the name and category, then try again.",
    /** MG37 */
    editTimedOut:
      "This took too long, and your changes weren't saved. Try again.",
    editFailed: "Your changes couldn't be saved right now. Try again.",
  },

  remove: {
    /** MG38 */
    timedOut: "This took too long. The item is still in My Gear. Try again.",
    failed: "The item couldn't be removed right now. Try again.",
    /** MG43 */
    question: (name: string) => `Remove “${name}” from My Gear?`,
    /** MG44 */
    body: "You can add it again later if needed.",
    /** MG45 */
    confirm: "Remove",
    /** MG46 */
    working: "Removing…",
  },

  announce: {
    /** MG39 */
    removed: (name: string) => `Removed ${name} from My Gear.`,
    /** MG40 */
    added: (name: string) => `Added ${name} to My Gear.`,
    /** MG41 */
    saved: (name: string) => `Saved changes to ${name}.`,
  },

  /** MG42 */
  gone: "This item is no longer in My Gear.",

  empty: {
    /** MG47 */
    action: "Add your first item",
    /** MG48 */
    title: "Your gear collection is empty.",
    /** MG49 */
    body: "Add the gear you already own so trip preparation can tell you what's ready and what's missing.",
  },

  unavailable: {
    /** MG50 */
    title: "We couldn't load your gear.",
    /** MG51 */
    body: "Nothing in My Gear has changed. Try again in a moment.",
    /** MG53 */
    retry: "Try again",
    /** MG54 */
    retrying: "Trying again…",
  },

  /** MG52 (visually hidden) */
  loading: "Loading your gear…",
} as const

/**
 * MG4, from the item count and the number of distinct known categories. It
 * never expresses completeness: no "of", no percentage.
 */
export function gearSummaryText(items: number, categories: number): string {
  if (categories === 0) {
    return items === 1 ? "1 item" : `${items} items`
  }
  if (categories === 1) {
    return items === 1 ? "1 item in 1 category" : `${items} items in 1 category`
  }
  return `${items} items across ${categories} categories`
}
