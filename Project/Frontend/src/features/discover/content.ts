/**
 * Every new user-facing string of the public header, Discover, and the Trail
 * Detail popup (FEATURE-006 section 16.17). Ids are the specification's.
 * Activity strings (TA…) belong to `features/trails`, with the activity
 * model; the Hero's strings (HR…) belong to `features/landing`;
 * FEATURE-002's notices and FEATURE-004's trail strings are reused, not
 * repeated.
 *
 * No string names a service, a status code, the identity provider, or how
 * the sample activity is made.
 */
const count = new Intl.NumberFormat("en-US")

export const discoverContent = {
  header: {
    brand: "Outdoor Trip Companion",
    /** The `nav` label. */
    navigation: "Primary",
    /** DV20 */
    discover: "Discover",
    signIn: "Sign in",
  },

  /** DV1 */
  heading: "Discover trails around Vancouver",
  /** DV3, viewport-driven: trails in the current map area (a trail count). */
  listHeading: (n: number | null) =>
    n === null
      ? "Trails"
      : n === 1
        ? "1 trail in this area"
        : `${count.format(n)} trails in this area`,
  /** DV4 */
  loading: "Loading trails…",
  /** DV5 */
  failed: "The trails couldn't be loaded. Try again in a moment.",
  /** DV6, viewport-driven: nothing inside the visible map area. */
  empty: "No trails in this map area. Move or zoom out to explore more.",
  /** More trails in the area than rows shown (`shown` nearest the centre). */
  limited: (shown: number, total: number) =>
    `Showing the ${count.format(shown)} nearest of ${count.format(total)} trails in this area. Zoom in to see more.`,
  /** The view is wider than the largest search circle. */
  capped: "Zoom in to explore trails in this area.",
  /** A new map area is loading; the current rows stay. Never announced. */
  updating: "Updating trails…",
  /** DV7 */
  notOnMap: "Not shown on the map",
  /** DV8 */
  mapLoading: "Loading map…",
  /** DV9 */
  mapFailed: "The map couldn't be shown. Every trail is in the list.",
  /** DV10 */
  mapUnsupported: "This browser can't show the map. Every trail is in the list.",
  /** DV11 */
  mapRegion: "Map of trails",
  /** DV12 */
  mapCanvas:
    "Map. Arrow keys move it, plus and minus zoom. Every trail is also in the list.",
  /** DV13 */
  zoomIn: "Zoom in",
  /** DV14 */
  zoomOut: "Zoom out",
  /** DV16 */
  title: "Discover trails · Outdoor Trip Companion",
  /** DV17, said once when the list first loads or recovers, not per pan. */
  listed: (n: number) =>
    n === 1
      ? "1 trail in this area."
      : `${count.format(n)} trails in this area.`,

  hint: {
    /** DV21 */
    windows: "Use Ctrl + scroll to zoom the map",
    /** DV22 */
    mac: "Use ⌘ + scroll to zoom the map",
    /** DV23 */
    touch: "Use two fingers to move the map",
  },

  /**
   * Trail name search above the list (post-freeze Discover polish). Its
   * no-match line is deliberately unlike the area's empty state (DV6).
   */
  search: {
    /** The field's accessible name (visually hidden). */
    label: "Search trails by name",
    placeholder: "Search trails...",
    /** Replaces the area count line while a query is typed. */
    heading: (total: number) =>
      total === 0
        ? "Search results"
        : total === 1
          ? "1 matching trail"
          : `${count.format(total)} matching trails`,
    noMatch: (query: string) => `No trails match "${query}".`,
    clear: "Clear search",
    /** More matches than the results listed. */
    limited: (shown: number, total: number) =>
      `Showing the first ${count.format(shown)} of ${count.format(total)} matches. Type more of the name to narrow them.`,
    /** The trail catalog is still arriving and nothing matches yet. */
    catalogLoading: "Searching all trails…",
    /** The trail catalog could not be read: the loaded map area still is. */
    catalogFailed: "Only trails near the map can be searched right now.",
    /** Said once the typing pauses, not on every keystroke. */
    announced: (total: number, shown: number) =>
      total === 0
        ? "No trails match."
        : total === 1
          ? "1 trail matches."
          : total > shown
            ? `${count.format(total)} trails match. Showing the first ${count.format(shown)}.`
            : `${count.format(total)} trails match.`,
    /** A chosen trail could not be brought onto the map (rare). */
    notShown: "That trail couldn't be shown on the map.",
  },

  popup: {
    /** TP1 */
    signInToPlan: "Sign in to plan this trip",
    /** TP2 */
    createAccount: "Create account",
    /** TP3, the Close button's accessible name. */
    close: "Close trail details",
  },
} as const

/**
 * DV15: the attribution the tile provider requires, with the OpenStreetMap
 * credit. OpenFreeMap's own TileJSON gives "OpenFreeMap © OpenMapTiles Data
 * from OpenStreetMap"; the same three linked credits are shown here in the
 * specification's wording, with OpenStreetMap's "contributors" form.
 */
export const mapAttribution = [
  { text: "OpenFreeMap", href: "https://openfreemap.org" },
  { text: "© OpenMapTiles", href: "https://www.openmaptiles.org/" },
  {
    text: "© OpenStreetMap contributors",
    href: "https://www.openstreetmap.org/copyright",
  },
] as const
