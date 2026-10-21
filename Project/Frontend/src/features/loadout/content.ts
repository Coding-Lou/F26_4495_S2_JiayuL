import type { VisualCategory } from "@/features/avatar"

/**
 * Every user-facing string of the Gear Customization Studio (FEATURE-005
 * section 16.14, the notes of 16.8, and the announcements of 18.4). Ids in
 * comments are the specification's.
 *
 * Reused FEATURE-004 strings stay where they are: SH1, SH5–SH7 in
 * `features/trails/content.ts`; TP7–TP11, TP16, TP17 and the category labels
 * in `features/packing`. The Preparation call to action (PC1) is packing's.
 *
 * Nothing here says that an equipped choice is saved, kept, or remembered,
 * or that it lasts only for this session (Q16).
 */
export const studioContent = {
  /** GS1 */
  backToPreparation: "Back to preparation",
  /** GS2, GS3: "Gearing up for {trail name}" / "… your trip" */
  gearingUpFor: "Gearing up for",
  yourTrip: "your trip",
  /** GS4: the visually hidden prefix of the trip line. */
  tripDatePrefix: "Trip date: ",
  /** GS5 */
  summaryHeading: "Pack summary",
  /** GS6 */
  gearRegionName: "Gear choices",
  /** GS7 */
  loading: "Loading your gear…",
  /** GS8 */
  gearFailed: "Your gear couldn't be loaded just now. Try again in a moment.",

  summary: {
    /** GS9 */
    equippedLabel: "Equipped for this trip",
    /** GS10 */
    equippedValue: (e: number, m: number) => `${e} of ${m}`,
    /** GS11 */
    equippedCaption: "Counts the recommended categories you've equipped.",
    /** GS12 */
    others: (x: number) =>
      x === 1 ? "Plus 1 other category." : `Plus ${x} other categories.`,
    /** GS13 */
    allEquippedValue: (x: number) =>
      x === 1 ? "1 category" : `${x} categories`,
    /** GS14 */
    allEquippedCaption:
      "Nothing is recommended for this trip, so this counts everything you've equipped.",
  },

  groups: {
    /** GS15 */
    recommendedHeading: "Recommended for this trip",
    /** GS16 */
    recommendedDescription:
      "A recommendation is a suggestion. You decide what to equip.",
    /** GS17 */
    shortcut: "Equip recommended gear I own",
    /** GS18 */
    allOwnedEquipped: "All the recommended gear you own is equipped.",
    /** GS19 */
    noneOwned: "You don't own any of the recommended gear yet.",
    /** GS20 */
    otherHeading: "Also in your gear",
    /** GS21 */
    otherDescription: "Not recommended for this trip. You can still equip it.",
  },

  row: {
    /** GS22 */
    owned: "Owned",
    missing: "Missing",
    equipped: "Equipped",
    /** GS24 */
    missingHint: "Add it to your gear to equip it.",
    /** GS25 */
    equip: "Equip",
    unequip: "Unequip",
    equipName: (category: string) => `Equip ${category}`,
    unequipName: (category: string) => `Unequip ${category}`,
    /** GS26 */
    change: "Change",
    /** GS27 */
    changeName: (category: string, k: number) =>
      `Change ${category} item. ${k} owned.`,
    /** GS28 */
    pickerLegend: (category: string) => `${category} item`,
  },

  /** GS23 */
  uncategorised: (u: number) =>
    u === 1
      ? "1 item in your gear has no category, so it can't be equipped here."
      : `${u} items in your gear have no category, so they can't be equipped here.`,

  /** N1–N8 (16.8). `{visual}` is a noun from `visualNouns`. */
  notes: {
    n1: (visual: string) => `Shows on your avatar as ${visual}.`,
    n2: (visual: string) => `On your avatar as ${visual}.`,
    n3: "Worn under your rain shell. Only its collar shows on the avatar.",
    n4: "Equipped. It can't be shown on the avatar right now.",
    n5: "Equipped. It appears when your avatar has loaded.",
    n6: "The avatar doesn't show this category.",
    n7: "Coming with you. The avatar doesn't show this category.",
    n8: "Coming with you.",
  },

  addGear: {
    /** AG1 */
    open: "Add gear",
    openName: (category: string) => `Add gear: ${category}`,
    /** AG2 */
    openGeneral: "Add gear you own",
    /** AG3 */
    nameLabel: "Item name",
    /** AG4 */
    rowHelper: (category: string) =>
      `Saved to your gear as ${category}. Up to 100 characters.`,
    /** AG5 */
    generalHelper: "Saved to your gear. Up to 100 characters.",
    /** AG6 */
    categoryLabel: "Category",
    /** AG7 */
    chooseCategory: "Choose a category",
    /** AG8 */
    submit: "Add to my gear",
    /** AG9 */
    saving: "Adding…",
    /** AG10 */
    cancel: "Cancel",
    /** AG11 */
    nameEmpty: "Enter a name for this item.",
    /** AG12 */
    categoryEmpty: "Choose a category.",
    /** AG13 */
    failed: "This item couldn't be added just now. Try again.",
    /** AG14 */
    timedOut: "That took too long, so we stopped waiting. Try again.",
    /** AG15 */
    rowFormName: (category: string) => `Add ${category} to your gear`,
    generalFormName: "Add gear you own",
    /** AG16 */
    rejected: "That name can't be used. Change it and try again.",
  },

  stage: {
    /** ST0 */
    heading: "Your avatar",
    /** ST1 */
    loading: "Loading your avatar…",
    /** ST2 */
    partial:
      "Some gear can't be shown on the avatar right now. Your choices are unchanged.",
    /** ST3 */
    caption: "Generic gear models, not your exact items.",
    /** ST4 */
    unavailable:
      "The 3D avatar isn't available right now. You can still choose your gear.",
    /** ST5 */
    unsupported:
      "The 3D avatar can't be shown in this browser. You can still choose your gear.",
    /** ST6 */
    turnLeft: "Turn left",
    turnRight: "Turn right",
    /** ST7 */
    resetView: "Reset view",
    /** ST8, ST9 */
    pause: "Pause motion",
    play: "Play motion",
    /** ST14 */
    narrow: "The 3D avatar is shown on larger screens.",
    /** ST15 */
    viewGroup: "Avatar view",
  },

  /** ST10–ST13: the loadout text, the canvas's text alternative (18.5). */
  loadout: {
    /** ST10 */
    baseOutfit: "Nothing is equipped. The avatar wears its base outfit.",
    /** ST11 */
    shown: (list: string) => `On your avatar: ${list}.`,
    /** ST12 */
    notShown: (list: string) => `Equipped, not shown on the avatar: ${list}.`,
    /** ST12: the reason given for a covered category. */
    coveredReason: "(under the rain shell)",
    /** ST13 */
    equipped: (list: string) => `Equipped: ${list}.`,
    nothingYet: "Nothing is equipped yet.",
  },

  /** DT4 */
  title: {
    suffix: "Gear up · Outdoor Trip Companion",
    separator: " · ",
  },

  /** Section 18.4 */
  announcements: {
    loading: "Loading your gear.",
    loaded: "Gear loaded.",
    /** "Gear Readiness 75%. 1 recommended item missing." */
    readiness: (n: number, line: string) => `Gear Readiness ${n}%. ${line}.`,
    count: (e: number, m: number) =>
      `${e} of ${m} recommended categories equipped.`,
    countAll: (x: number) =>
      x === 1 ? "1 category equipped." : `${x} categories equipped.`,
    equipped: (category: string, item: string) =>
      `${category} equipped: ${item}.`,
    onAvatar: (visual: string) => `On your avatar as ${visual}.`,
    covered: "Worn under your rain shell; only its collar shows on the avatar.",
    uiOnly: "Not shown on the avatar.",
    notShown: "It can't be shown on the avatar right now.",
    nowCovered: (category: string) => `${category} is now covered.`,
    visibleAgain: (category: string) =>
      `${category} is visible on your avatar again.`,
    unequipped: (category: string) => `${category} unequipped.`,
    removedFromAvatar: "Removed from your avatar.",
    shortcut: (k: number, list: string) =>
      k === 1
        ? `Equipped 1 category: ${list}.`
        : `Equipped ${k} categories: ${list}.`,
    itemChangedEquipped: (category: string, item: string) =>
      `${category}: now ${item}. The avatar looks the same.`,
    itemChangedNotEquipped: (category: string, item: string) =>
      `${category}: ${item} selected. Not equipped.`,
    added: (item: string, category: string) =>
      `${item} added to your gear. ${category} is owned, not equipped.`,
    avatarLoaded: "Avatar loaded.",
    turnedLeft: "Turned left.",
    turnedRight: "Turned right.",
    viewReset: "View reset.",
  },
} as const

/**
 * The generic model's plain name per visual category (sections 16.8, 20.1).
 * What is actually modelled, never the user's product.
 */
export const visualNouns: Record<VisualCategory, string> = {
  BACKPACK: "a backpack",
  RAIN_SHELL: "a rain shell",
  WARM_LAYER: "a warm jacket",
  HIKING_BOOTS: "hiking boots",
  TREKKING_POLES: "trekking poles",
  HEADLAMP: "a headlamp",
}
