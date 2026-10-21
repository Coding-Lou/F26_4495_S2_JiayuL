/**
 * Every user-facing string of Community Memories (FEATURE-010 section 18.11,
 * the CM copy deck). Ids are the specification's; CM11–14, 17, 25–26, and
 * 33–35 are intentionally unused.
 *
 * The no-photo caption (MM12) and the photo fallback (MM13) come with the
 * reused FEATURE-009 components; Retry / Trying again… (CM8) come with the
 * shared Retry button; the trail-name fallback is `trailContent.unnamed`.
 *
 * No string names or describes an author, invites anyone to post, ranks, or
 * uses a relative time.
 */
const count = new Intl.NumberFormat("en-US")

export const communityContent = {
  /** CM1 */
  heading: "Community Memories",
  /** CM2 */
  count: (n: number) =>
    n === 1 ? "1 memory" : `${count.format(n)} memories`,
  /** CM3, CM18: the visible title and date, as the entry's name. */
  entryName: (title: string, date: string) =>
    date === "" ? title : `${title}, ${date}`,
  /** CM4 */
  viewAll: "View all memories",
  /** CM5 */
  viewAllName: (trail: string) => `View all memories for ${trail}`,
  /** CM6 */
  empty: "No public memories yet.",
  /** CM7 */
  unavailable: "Community memories are unavailable.",
  /** CM9 */
  loading: "Loading memories…",
  /** CM10 */
  panelName: (trail: string) => `Community Memories for ${trail}`,
  /** CM15 */
  close: "Close Community Memories",
  /** CM16 */
  back: "Back to Community Memories",
  /** CM19, only for 2 or more. */
  photos: (n: number) => `${count.format(n)} photos`,
  /** CM20 */
  showOlder: "Show older memories",
  /** CM21 */
  loadingOlder: "Loading…",
  /** CM22 */
  olderFailed: "Older memories couldn't be loaded.",
  /** CM23 */
  tryAgain: "Try again",
  /** CM24 */
  moreShown: (k: number) =>
    k === 1 ? "1 more memory shown" : `${count.format(k)} more memories shown`,
  /** CM27 */
  trailPrefix: "Trail: ",
  datePrefix: "Trip date: ",
  /** CM28 */
  largeAlt: (n: number, m: number, title: string) =>
    `Photo ${n} of ${m} from ${title}`,
  /** CM29 */
  caption: (n: number, m: number) => `Photo ${n} of ${m}`,
  /** CM30 */
  thumbName: (n: number, m: number) => `Show photo ${n} of ${m}`,
  /** CM31 */
  strip: "Photos",
  /** CM32 */
  gone: "This memory is no longer available.",
  /** CM36 */
  loadingMemory: "Loading this memory…",
} as const
