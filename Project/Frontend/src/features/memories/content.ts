/**
 * Every user-facing string of My Memories (FEATURE-009 section 22.18). Ids in
 * comments are the copy deck's. None names a service, a status code, a field,
 * or a cause the browser cannot know, and none uses social wording.
 *
 * A Memory's title and story are not here: they are the user's own text,
 * shown as text nodes only.
 */

const SUFFIX = " · Outdoor Trip Companion"

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

export const memoriesContent = {
  documentTitle: {
    /** MM1 */
    collection: `My Memories${SUFFIX}`,
    /** MM30 */
    detail: (title: string) => `${title}${SUFFIX}`,
    /** MM54 */
    notFound: `Memory not found${SUFFIX}`,
    /** MM60 */
    create: `Add a memory${SUFFIX}`,
    /** MM61 */
    edit: `Edit memory${SUFFIX}`,
  },

  collection: {
    /** MM2 */
    title: "My Memories",
    /** MM3 */
    support: "Your trips, kept in photos and stories.",
    /** MM4 */
    count: (n: number) => (n === 1 ? "1 memory" : `${n} memories`),
    /** MM5 */
    add: "Add memory",
    /** MM6 */
    gridHeading: "Your memories",
    /** MM14 */
    showOlder: "Show older memories",
    /** MM15 */
    showOlderWorking: "Loading…",
    /** MM16 */
    showOlderFailed: "Older memories couldn't be loaded.",
    /** MM17 */
    tryAgain: "Try again",
    /** MM18 */
    moreShown: (k: number) =>
      k === 1 ? "1 more memory shown" : `${k} more memories shown`,
    /** MM19 */
    loading: "Loading your memories…",
    /** MM20 */
    emptyTitle: "No trail memories yet.",
    /** MM21 */
    emptyBody: "After your next adventure, save the photos and story here.",
    /** MM22 */
    emptyAction: "Add your first memory",
    /** MM23 */
    unavailableTitle: "Your memories couldn't be loaded.",
    /** MM24 */
    unavailableBody: "Nothing in My Memories has changed. Try again in a moment.",
    /** MM25 */
    retrying: "Trying again…",
    /** MM26 */
    deleted: "Memory deleted.",
  },

  /** MM9, MM109, MM110 */
  visibility: {
    PRIVATE: "Private",
    PUBLIC: "Public",
  },

  trail: {
    /** MM10 */
    unavailable: "Trail unavailable",
    /** MM11 */
    unnamed: "Unnamed trail",
    /** MM36 */
    failed: "Trail name couldn't be loaded",
  },

  photo: {
    /** MM12 */
    none: "No photos",
    /** MM13 */
    fallback: "Photo couldn't be shown",
  },

  detail: {
    /** MM31 */
    back: "Back to My Memories",
    /** MM33 */
    privateMeaning: "Only you can see this memory.",
    /** MM34 */
    publicMeaning: "It can appear for people exploring this trail.",
    /** MM35 */
    prefixes: {
      trail: "Trail: ",
      date: "Trip date: ",
      visibility: "Visibility: ",
    },
    /** MM37 */
    largeAlt: (n: number, total: number, title: string) =>
      `Photo ${n} of ${total} from ${title}`,
    /** MM38 */
    thumbName: (n: number, total: number) => `Show photo ${n} of ${total}`,
    /** MM39 */
    caption: (n: number, total: number) =>
      `Photo ${n} of ${total}${n === 1 ? " · Cover" : ""}`,
    /** MM41 */
    storyHeading: "Story",
    /** MM42 */
    edit: "Edit",
    /** MM43 */
    delete: "Delete memory",
    /** MM44–MM47 */
    notices: {
      saved: "Memory saved.",
      updated: "Changes saved.",
      savedPublic:
        "Memory saved. It's public and can appear for people exploring this trail.",
      updatedPublic:
        "Changes saved. This memory is public and can appear for people exploring this trail.",
    },
    /** MM48 */
    deleteQuestion: (title: string) => `Delete “${title}”?`,
    /** MM49 */
    deleteBody:
      "Its story and photos will be removed from My Memories. This can't be undone.",
    /** MM50 */
    deletePublic: "It will also stop appearing for people exploring this trail.",
    /** MM51 */
    cancel: "Cancel",
    /** MM52 */
    deleting: "Deleting…",
    /** MM53 */
    deleteTimedOut: "This took too long. Your memory is still here. Try again.",
    deleteFailed: "Your memory couldn't be deleted right now. Try again.",
    /** MM55 */
    notFoundTitle: "Memory not found",
    /** MM56 */
    notFoundBody: "It may have been deleted, or the link isn't right.",
    /** MM57 */
    unavailableTitle: "This memory couldn't be loaded.",
    unavailableBody: "Try again in a moment.",
    /** MM58 */
    loading: "Loading this memory…",
  },

  editor: {
    /** MM62 */
    createTitle: "Add a memory",
    /** MM63 */
    editTitle: "Edit memory",
    /** MM64 */
    createSupport: "Keep the story and photos from a trip you've taken.",
    /** MM65 */
    backToMemory: "Back to memory",
    /** MM67 */
    required: "Required",
    /** MM68 */
    optional: "Optional",
    /** MM69 */
    trailLabel: "Trail",
    /** MM70 */
    trailFirstOption: "Choose a trail",
    /** MM72 */
    trailNoteCreate: "The trail can't be changed after the memory is saved.",
    /** MM73 */
    trailNoteEdit: "The trail can't be changed after a memory is saved.",
    /** MM74 */
    trailsLoading: "Loading trails…",
    /** MM75 */
    trailsFailed: "Trails couldn't be loaded.",
    /** MM76 */
    noTrails: "No trails are available right now.",
    /** MM77 */
    badPreselect: "The trail from that link couldn't be found. Choose a trail.",
    /** MM78 */
    dateLabel: "Trip date",
    /** MM79 */
    dateHelper: "The day you were on the trail.",
    /** MM80 */
    titleLabel: "Title",
    /** MM81 */
    titleHelper: "A few words you'll recognize later.",
    /** MM82 */
    titleCounter: (n: number) => `${n} of 120`,
    /** MM83 */
    storyLabel: "Story",
    /** MM84 */
    storyHelper: "Plain text. Line breaks are kept.",
    /** MM85 */
    storyCounter: (n: number) => `${n} of 5000`,
    /** MM112 */
    cancel: "Cancel",
    /** MM113 */
    saveCreate: "Save memory",
    /** MM114 */
    saveEdit: "Save changes",
    /** MM115 */
    saving: "Saving…",
    /** MM116 */
    addingPhotos: "Adding photos…",
    /** MM117 */
    waitForPhotos: "Photos are still being added.",
    errors: {
      /** MM118 */
      trailMissing: "Choose a trail.",
      /** MM119 */
      dateMissing: "Choose the date of your trip.",
      /** MM120 */
      dateFuture: "The trip date can't be in the future.",
      /** MM121 */
      dateInvalid: "Enter a real date.",
      /** MM122 */
      titleMissing: "Give this memory a title.",
      /** MM123 */
      titleLong: "Use 120 characters or fewer.",
      /** MM124 */
      storyLong: "Use 5000 characters or fewer.",
      /** MM125 */
      trailGone: "That trail is no longer available. Choose another trail.",
      /** MM126 */
      trailCheck:
        "The trail couldn't be checked right now, so your memory wasn't saved. Try again.",
      /** MM127 */
      createFailed: "Your memory couldn't be saved right now. Try again.",
      /** MM128 */
      rejected: "This couldn't be saved. Check the details, then try again.",
      /** MM131 */
      editTimedOut: "This took too long, and your changes weren't saved. Try again.",
      editFailed: "Your changes couldn't be saved right now. Try again.",
    },
    /** MM129 */
    ambiguousTitle: "We couldn't confirm your memory was saved.",
    ambiguousBody: "Check My Memories before saving again, so it isn't added twice.",
    /** MM130 */
    checkMemories: "Check My Memories",
    /** MM132 */
    savedTitle: "Memory saved",
    /** MM133 */
    savedLine: (added: number, total: number, failed: number) =>
      `${added} of ${total} photos added. ${
        failed === 1 ? "1 photo couldn't be added." : `${failed} photos couldn't be added.`
      }`,
    /** MM134 */
    retryFailed: "Retry failed photos",
    /** MM135 */
    viewMemory: "View memory",
    /** MM136 */
    laterFromEdit: "Photos that weren't added can be added later from Edit.",
    /** MM137 */
    memoryGone: "This memory is no longer available.",
  },

  photos: {
    /** MM86 */
    heading: "Photos",
    /** MM87 */
    coverLine: "The first photo is your cover.",
    /** MM88 */
    limitLine:
      "Up to 5 photos: JPEG, PNG, or WebP. Photos are resized for your journal.",
    /** MM89 */
    remaining: (k: number) =>
      k <= 0
        ? "This memory has 5 photos, the most it can hold."
        : k === 1
          ? "You can add 1 more."
          : `You can add ${k} more.`,
    /** MM90 */
    editLine: "Photo changes are saved as you make them.",
    /** MM91 */
    add: "Add photos",
    /** MM92 */
    tileGroup: (n: number, total: number) =>
      `Photo ${n} of ${total}${n === 1 ? ", cover" : ""}`,
    /** MM93 */
    tileName: (n: number) => `Photo ${n}`,
    /** MM94 */
    cover: "Cover",
    /** MM95 */
    states: {
      preparing: "Preparing…",
      ready: "Added when you save",
      waiting: "Waiting to upload",
      uploading: "Uploading…",
      added: "Added",
      failed: "Couldn't be added",
    },
    /** MM96 */
    moveEarlier: (n: number) => `Move photo ${n} earlier`,
    moveLater: (n: number) => `Move photo ${n} later`,
    /** MM97 */
    remove: (n: number) => `Remove photo ${n}`,
    /** MM98 */
    retry: "Retry",
    retryName: (n: number) => `Retry photo ${n}`,
    /** MM99 */
    removeQuestion: "Remove this photo?",
    removeCancel: "Cancel",
    removeConfirm: "Remove",
    /** MM100 */
    removing: "Removing…",
    /** MM101 */
    moved: (position: number, total: number) =>
      position === 1
        ? "Photo moved to position 1. It's your cover."
        : `Photo moved to position ${position} of ${total}.`,
    /** MM102 */
    removed: (coverChanged: boolean) =>
      coverChanged
        ? "Photo removed. The next photo is now your cover."
        : "Photo removed.",
    /** MM103 */
    added: "Photo added.",
    /** MM104 */
    uploading: (i: number, k: number) => `Uploading photo ${i} of ${k}…`,
    uploadedEnd: (a: number, k: number) =>
      `${a} of ${k} ${plural(k, "photo", "photos")} added.`,
    /** MM105 */
    pick: {
      overflow: (m: number) =>
        m === 1
          ? "Only 5 photos per memory. 1 wasn't added."
          : `Only 5 photos per memory. ${m} weren't added.`,
      format: "This photo format isn't supported yet. Please use JPEG, PNG, or WebP.",
      tooLarge: "This photo is too large to add.",
      unreadable: "This photo couldn't be read.",
    },
    /** MM106 */
    reasons: {
      limit: "This memory already has 5 photos.",
      tooLarge: "This photo is too large.",
      unsupported:
        "This photo format isn't supported yet. Please use JPEG, PNG, or WebP.",
      unavailable: "This photo couldn't be added right now.",
    },
    /** MM107 */
    orderSaving: "Saving photo order…",
    orderFailed: "The photo order couldn't be saved. Try again.",
    removeFailed: "The photo couldn't be removed right now. Try again.",
  },

  visibilityChoice: {
    /** MM108 */
    legend: "Who can see this memory",
    /** MM33 */
    privateMeaning: "Only you can see this memory.",
    /** MM111 */
    publicMeaning: "This memory may appear for other people exploring this trail.",
  },

  leave: {
    /** MM140 */
    title: "Leave without saving?",
    /** MM141 */
    bodyCreate: "Your memory hasn't been saved yet.",
    bodyEdit: "Your changes to this memory haven't been saved.",
    /** MM142 */
    uploading: "Photos that are still uploading won't be added.",
    /** MM143 */
    keepEditing: "Keep editing",
    /** MM144 */
    leave: "Leave",
  },
} as const
