import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react"
import { CircleAlert, LoaderCircle } from "lucide-react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import { isPublicMemoryId } from "@/features/community-memories/api/publicMemories"
import { CommunityPanel } from "@/features/community-memories/components/CommunityPanel"
import { CommunityPreview } from "@/features/community-memories/components/CommunityPreview"
import { activityLevel, readActivity } from "@/features/trails/activity"
import { trailReadFailureKindOf } from "@/features/trails/api/trailList"
import {
  activityContent,
  isSyntheticTrailSource,
  trailContent,
  tripContent,
} from "@/features/trails/content"
import { useNearbyTrails } from "@/features/trails/hooks/useNearbyTrails"
import { useTrailActivity } from "@/features/trails/hooks/useTrailActivity"
import { useTrailDetail } from "@/features/trails/hooks/useTrailDetail"
import { isTrailId } from "@/features/trails/trailId"
import type { TrailSummary } from "@/features/trails/types/trail"
import { useElapsed } from "@/lib/useElapsed"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { discoverContent } from "../content"
import type { MapTrail } from "../map/mapTypes"
import { CatalogRequest } from "../search/CatalogRequest"
import { searchOptionId, useTrailSearch } from "../search/useTrailSearch"
import {
  placeAfterPan,
  placeAnchored,
  placeDocked,
  placeFollowing,
  type Placement,
  type PopupSize,
  type Side,
} from "../map/popupPlacement"
import { TrailMap, type TrailMapApi } from "../map/TrailMap"
import {
  fallbackViewport,
  isInBounds,
  nearbyQueryFor,
  type LngLat,
  type MapViewport,
} from "../map/viewport"
import { TrailPopup } from "./TrailPopup"
import { TrailRow } from "./TrailRow"
import { TrailSearchField } from "./TrailSearchField"
import { TrailSearchResults } from "./TrailSearchResults"

/** D1: a wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000
/** The search parameter that holds the selected trail (§9.3). */
const TRAIL_PARAM = "trail"
/** FEATURE-010 §15.1: the Community panel is open on the list. */
const COMMUNITY_PARAM = "memories"
/** FEATURE-010 §15.1: the panel shows that public Memory's Detail. */
const MEMORY_PARAM = "memory"
/** The key of the in-app marker in a Community entry's history state. */
const COMMUNITY_MARKER = "communityMemories"
/** The section's id, the target of `#discover` (16.6). */
export const DISCOVER_ID = "discover"
/** A row scrolled into view in the list keeps this margin (16.11.1). */
const ROW_MARGIN = 8
/** At most this many rows: the trails nearest the map's centre. */
const MAX_ROWS = 50
/**
 * A search result is shown at least this close (never zoomed out to it):
 * about 20 km across a desktop map at this latitude, the trailhead with its
 * neighbourhood, and the zoom up to which nearby trails still cluster, so
 * the area reads as trails around the chosen one, not a street plan. The
 * chosen trail is drawn above any cluster.
 */
const SEARCH_ZOOM = 12

const NARROW_QUERY = "(max-width: 767px)"
/** From here the Community panel is a docked rail; below, a modal sheet. */
const WIDE_QUERY = "(min-width: 1024px)"
const LARGE_QUERY = "(min-width: 1440px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

type ListPhase = "loading" | "failed" | "empty" | "loaded"

/**
 * Bringing a trail that is not in the current results onto the map before
 * it can be selected (the selection is derived from the results):
 * waiting for the first results; not in them, so the trail itself is read;
 * its trailhead known, so the view moves there; then found or missing.
 */
type LocateStage = "results" | "locating" | "centring" | "found" | "missing"

/**
 * One trail being located: a `?trail=<uuid>` on arrival ("link", from
 * "results"), or a trail search result outside the current results
 * ("search", straight to "centring": its trailhead is known). Its `trail`
 * parameter is already in the address, and the rule that removes a
 * selection missing from the results waits until it is found or missing.
 */
type Locate = {
  /** Each target its own number, so its camera move is made once. */
  key: number
  /** Lower-case trail id. */
  id: string
  origin: "link" | "search"
  stage: LocateStage
  /** The trailhead, once known. */
  center: LngLat | null
  /** Search: zoom in to at least this; a link keeps the current zoom. */
  minZoom: number | null
  /**
   * The view when centring began. The first view settled after it decides
   * found or missing, whether or not the visitor moved the map meanwhile.
   */
  from: MapViewport | null
}

/** The camera move that brings a located trail into view. */
function moveCamera(api: TrailMapApi | null, target: Locate) {
  if (api === null || target.center === null) {
    return
  }
  const { lng, lat } = target.center
  if (target.minZoom === null) {
    api.centerOn(lng, lat)
  } else {
    api.focusOn(lng, lat, target.minZoom)
  }
}

/** What the page asks of Discover. */
export type DiscoverSectionHandle = {
  /**
   * Explore trails and the header's Discover (16.6): start loading the map,
   * align Discover under the header, and focus its heading.
   */
  goTo: () => void
}

type DiscoverSectionProps = {
  ref?: Ref<DiscoverSectionHandle>
  announce: Announce
  silence: () => void
  /**
   * The visitor arrived from elsewhere in the application with a `trail` in
   * the address: focus goes to that trail's row once the list has it
   * (16.15.2).
   */
  arrivalFocus: boolean
}

/** Where the open popup is, between camera movements (16.10). */
type PopupState = {
  trailId: string
  /** Docked (Rule 4), anchored (Rule 1), panning (Rule 2), or following. */
  mode: "docked" | "anchored" | "panning" | "following"
  side: Side
}

/**
 * The history state of a Community entry pushed in the application
 * (FEATURE-010 §15.2). In-app Back and Close go back through these entries
 * instead of adding new ones; without a marker (a refreshed or shared
 * address) they remove the parameter with replace.
 */
type CommunityMarker = {
  /** Pushed Community entries up to and including this one. */
  depth: number
  /** The first of them was pushed over the popup, not a restored panel. */
  rooted: boolean
  /** This entry is a Detail pushed over the list's entry. */
  overList: boolean
}

function readCommunityMarker(state: unknown): CommunityMarker | null {
  if (typeof state !== "object" || state === null) {
    return null
  }
  const value = (state as Record<string, unknown>)[COMMUNITY_MARKER]
  if (typeof value !== "object" || value === null) {
    return null
  }
  const { depth, rooted, overList } = value as Record<string, unknown>
  return typeof depth === "number" &&
    Number.isInteger(depth) &&
    depth >= 1 &&
    typeof rooted === "boolean" &&
    typeof overList === "boolean"
    ? { depth, rooted, overList }
    : null
}

function reducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/** The map inset P (16.3.2). */
function mapInset(): number {
  return window.matchMedia(LARGE_QUERY).matches ? 24 : 16
}

/**
 * Discover, the second section of the public homepage (FEATURE-006 sections
 * 9, 16.7–16.12): a docked `paper` rail with the heading and the
 * synchronized trail list, and the map filling the rest.
 *
 * Viewport-driven: the settled map view (or, without a map, the default
 * region) gives a centre and a radius; the nearby read returns the trails in
 * that circle, nearest the centre first; the map draws all of them
 * (clustered), and the list shows those inside the visible rectangle, at
 * most 50, in the same order.
 *
 * One selection, `selectedTrailId`, is the `trail` search parameter, written
 * with replace; nothing else is stored. It drives the selected row, the
 * selected marker, and the one Trail Detail popup, which is rendered inside
 * the selected row's `li` and positioned over the map against this section
 * (16.11.2). The list is the keyboard and assistive-technology path to every
 * trail, and works before, without, and whatever happens to the map.
 */
export function DiscoverSection({
  ref,
  announce,
  silence,
  arrivalFocus,
}: DiscoverSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const activityQuery = useTrailActivity()
  const narrow = useMediaQuery(NARROW_QUERY)
  const wide = useMediaQuery(WIDE_QUERY)

  const headingId = useId()
  const listHeadingId = useId()

  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const rowButtons = useRef(new Map<string, HTMLButtonElement>())
  const popupRef = useRef<HTMLDivElement>(null)
  const mapApiRef = useRef<TrailMapApi>(null)
  const popupState = useRef<PopupState | null>(null)
  /** The next popup to open animates its camera move (not on load). */
  const animateNextOpen = useRef(false)
  /** Whether focus last entered the popup (it may vanish with focus). */
  const focusInPopup = useRef(false)
  /**
   * The next popup opens while a search result's camera move is under way:
   * it follows its marker from the start (Rule 3) instead of panning.
   */
  const cameraFlight = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchListboxId = useId()
  /** Numbers the search's Locate targets (the deep link is 0). */
  const locateCount = useRef(0)

  /** What the address said when the page was opened (16.6). */
  const [initial] = useState(() => {
    const param = searchParams.get(TRAIL_PARAM)
    return {
      param,
      align:
        window.location.hash === `#${DISCOVER_ID}` ||
        (param !== null && isTrailId(param)),
    }
  })

  /** The map runtime may load: Discover is about to be seen (§14). */
  const [mapRequested, setMapRequested] = useState(initial.align)
  /** Row hovered (pointer) and row focused (keyboard), for the map. */
  const [rowHover, setRowHover] = useState<string | null>(null)
  const [rowFocus, setRowFocus] = useState<string | null>(null)
  /** The marker under the pointer, for the list. */
  const [mapHover, setMapHover] = useState<string | null>(null)
  /** Retry of a failed list, while it works. */
  const [retrying, setRetrying] = useState(false)
  /** Whether the map is drawn (reported by the map's shell). */
  const [mapReady, setMapReady] = useState(false)
  /** The map's last settled view; null without a drawn map. */
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null)

  /** The trail of a `?trail=<uuid>` on arrival, or null. */
  const deepLinkId =
    initial.param !== null && isTrailId(initial.param)
      ? initial.param.toLowerCase()
      : null
  /** The trail being brought onto the map, or the last one (see Locate). */
  const [locate, setLocate] = useState<Locate | null>(() =>
    deepLinkId === null
      ? null
      : {
          key: 0,
          id: deepLinkId,
          origin: "link",
          stage: "results",
          center: null,
          minZoom: null,
          from: null,
        },
  )
  /** The last located trailhead: without a map, the region moves there. */
  const locateCenter = locate?.center ?? null

  /* ---------------------------------------------------------------- *
   * Viewport → radius → nearby read. Without a drawn map (not loaded
   * yet, failed, unsupported) the default region stands in, so the list
   * works before and without the map. Nothing is requested before
   * Discover is about to be seen (`mapRequested`, §14).
   * ---------------------------------------------------------------- */
  const viewport = useMemo(
    () => mapViewport ?? fallbackViewport(locateCenter),
    [mapViewport, locateCenter],
  )
  const { params: nearbyParams, capped } = useMemo(
    () => nearbyQueryFor(viewport),
    [viewport],
  )
  const nearbyQuery = useNearbyTrails(mapRequested ? nearbyParams : null)

  // Only the current view's key drives the screen: `data` is that key's
  // result, or, while it loads, the previous key's result flagged as
  // placeholder. An older view's late response stays in its own cache
  // entry and can never replace a newer one here.
  const fetched = nearbyQuery.data
  /** The current view's own result has arrived (not a placeholder). */
  const settledResults = fetched !== undefined && !nearbyQuery.isPlaceholderData
  const updating = fetched !== undefined && nearbyQuery.isPlaceholderData

  // Trail name search over the curated catalog and this whole result (not
  // only the visible rows). While a query is typed its results replace the
  // rows and the area count line.
  const search = useTrailSearch(fetched, announce)
  const searching = search.searching

  const byId = useMemo(
    () => new Map((fetched ?? []).map((trail) => [trail.id, trail])),
    [fetched],
  )

  // The selection: a UUID in the address that names a fetched trail.
  const param = searchParams.get(TRAIL_PARAM)
  const paramId = isTrailId(param) ? param.toLowerCase() : null
  const selectedId = paramId !== null && byId.has(paramId) ? paramId : null

  // Viewport filter: the list shows only fetched trails whose trailhead is
  // inside the visible rectangle, in the server's nearest-the-centre order.
  // (The map receives the whole fetched circle, which reaches beyond the
  // rectangle, so clusters stay smooth at the edges.)
  const visibleTrails = useMemo(
    () =>
      (fetched ?? []).filter(
        (trail) =>
          trail.position !== null && isInBounds(trail.position, viewport.bounds),
      ),
    [fetched, viewport],
  )
  const areaCount = visibleTrails.length
  // At most 50 rows, the nearest. The selected trail keeps its row (and so
  // its popup) even when it is beyond them or just outside the rectangle.
  const rows = useMemo(() => {
    const shown = new Set(
      visibleTrails.slice(0, MAX_ROWS).map((trail) => trail.id),
    )
    if (selectedId !== null) {
      shown.add(selectedId)
    }
    return (fetched ?? []).filter((trail) => shown.has(trail.id))
  }, [fetched, visibleTrails, selectedId])

  const listPhase: ListPhase =
    fetched !== undefined
      ? rows.length === 0
        ? "empty"
        : "loaded"
      : nearbyQuery.isError
        ? "failed"
        : "loading"
  const listTimedOut =
    listPhase === "failed" &&
    trailReadFailureKindOf(nearbyQuery.error) === "timeout"
  const slow = useElapsed(listPhase === "loading", "trails", SLOW_AFTER_MS)

  /* ---------------------------------------------------------------- *
   * Locating a trail outside the current results: `/?trail=<uuid>` on
   * arrival (16.6, D11), or a trail search result. Transitions are
   * derived while rendering from the results, so no effect sets state
   * for them.
   * ---------------------------------------------------------------- */
  // Read only when a deep-linked trail is not in the first results.
  const locateDetail = useTrailDetail(
    locate?.stage === "locating" ? locate.id : null,
  )
  if (locate !== null) {
    if (locate.stage === "results" && settledResults) {
      setLocate({
        ...locate,
        stage: byId.has(locate.id) ? "found" : "locating",
      })
    } else if (locate.stage === "locating") {
      const position = locateDetail.data?.position
      if (position !== undefined && position !== null) {
        setLocate({
          ...locate,
          stage: "centring",
          center: position,
          from: viewport,
        })
      } else if (locateDetail.data !== undefined || locateDetail.isError) {
        // No such trail, no trailhead, or it could not be read: ignored.
        setLocate({ ...locate, stage: "missing" })
      }
    } else if (
      locate.stage === "centring" &&
      settledResults &&
      viewport !== locate.from
    ) {
      // The first view settled after the move (the map's, or without a
      // map the default span moved to the trailhead) has the trail or not.
      setLocate({
        ...locate,
        stage: byId.has(locate.id) ? "found" : "missing",
      })
    }
  }
  const locateSettled =
    locate === null || locate.stage === "found" || locate.stage === "missing"
  /** The arrival's deep link has nothing left to wait for. */
  const deepLinkSettled =
    locate === null || locateSettled || locate.origin !== "link"

  // Every fetched trail with a trailhead goes to the map, in server order.
  const activityData = activityQuery.data
  const activityFailed = activityQuery.isError
  const mapTrails = useMemo<MapTrail[]>(
    () =>
      (fetched ?? []).flatMap((trail) =>
        trail.position === null
          ? []
          : [
              {
                id: trail.id,
                name: trail.name ?? trailContent.unnamed,
                lng: trail.position.lng,
                lat: trail.position.lat,
                level: activityLevel(
                  readActivity(
                    { data: activityData, isError: activityFailed },
                    trail.id,
                  ),
                ),
              },
            ],
      ),
    [fetched, activityData, activityFailed],
  )

  /* ---------------------------------------------------------------- *
   * Page alignment (16.6, 16.10): Discover's top meets the header's
   * bottom. H is the section's `scroll-margin-top`.
   * ---------------------------------------------------------------- */
  const headerHeight = useCallback((): number => {
    const section = sectionRef.current
    return section === null
      ? 0
      : Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0
  }, [])

  const isAligned = useCallback((): boolean => {
    const section = sectionRef.current
    return (
      section !== null &&
      Math.abs(section.getBoundingClientRect().top - headerHeight()) <= 1
    )
  }, [headerHeight])

  const align = useCallback(
    (behavior: ScrollBehavior) => {
      const section = sectionRef.current
      if (section === null || isAligned()) {
        return
      }
      window.scrollTo({
        top:
          window.scrollY + section.getBoundingClientRect().top - headerHeight(),
        behavior,
      })
    },
    [headerHeight, isAligned],
  )

  // `/#discover` and `/?trail=<uuid>` load with Discover aligned, at once.
  useLayoutEffect(() => {
    if (initial.align) {
      align("instant")
    }
  }, [align, initial.align])

  useImperativeHandle(
    ref,
    () => ({
      goTo() {
        setMapRequested(true)
        align(reducedMotion() ? "instant" : "smooth")
        headingRef.current?.focus({ preventScroll: true })
      },
    }),
    [align],
  )

  // Discover about to be seen: the map runtime may load (§14). It is not
  // requested while the visitor stays on the Hero, whose bottom edge meets
  // Discover's top: the first pixel of Discover in view starts it.
  //
  // At load the section only touches the viewport's bottom edge, which the
  // observer reports as intersecting with zero height. With threshold 0
  // alone it would then stay silent while the visitor scrolls, so a second
  // threshold of half a pixel of the section's height makes the first real
  // pixel report again.
  useEffect(() => {
    const section = sectionRef.current
    if (mapRequested || section === null) {
      return
    }
    const halfPixel = 0.5 / Math.max(section.offsetHeight, 1)
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some(
            (entry) =>
              entry.isIntersecting && entry.intersectionRect.height > 0,
          )
        ) {
          setMapRequested(true)
        }
      },
      { threshold: [0, halfPixel] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [mapRequested])

  /* ---------------------------------------------------------------- *
   * The popup over the map (16.10). Positions are written to the
   * popup's style directly, on every camera frame, without a render.
   * ---------------------------------------------------------------- */
  const narrowRef = useRef(narrow)
  useEffect(() => {
    narrowRef.current = narrow
  })

  const popupSize = (popup: HTMLElement): PopupSize => ({
    width: popup.offsetWidth,
    height: popup.offsetHeight,
  })

  /** Writes a placement, converted to the section's coordinates. */
  const apply = useCallback((placement: Placement, size: PopupSize) => {
    const popup = popupRef.current
    const api = mapApiRef.current
    const offset = api?.offset()
    if (popup === null || api === null || offset === null || offset === undefined) {
      return
    }
    popup.style.left = `${offset.left + placement.x}px`
    popup.style.top = `${offset.top + placement.y}px`
    popup.dataset.side = placement.side ?? "docked"
    if (placement.tipY === null) {
      delete popup.dataset.tip
    } else {
      popup.dataset.tip = ""
      popup.style.setProperty("--discover-tip-y", `${placement.tipY}px`)
    }
    popup.dataset.placed = ""
    api.setDockedClearance(
      placement.side === null ? size.width + mapInset() : 0,
    )
  }, [])

  /** Rules 1, 2, and 4 when a popup opens, or the map becomes ready. */
  const openPlacement = useCallback(
    (trailId: string, animate: boolean) => {
      const popup = popupRef.current
      const api = mapApiRef.current
      const inFlight = cameraFlight.current
      cameraFlight.current = false
      if (popup === null || api === null) {
        return
      }
      if (narrowRef.current) {
        // Below 768px the popup is in the flow under its row (16.16.3).
        popupState.current = null
        popup.style.left = ""
        popup.style.top = ""
        delete popup.dataset.tip
        popup.dataset.side = "docked"
        popup.dataset.placed = ""
        api.setDockedClearance(0)
        return
      }

      const frame = api.frame(mapInset())
      if (frame === null) {
        return
      }
      const size = popupSize(popup)
      const marker = api.ready() ? api.project(trailId) : null

      if (marker !== null && inFlight) {
        // The camera is already on its way to the trail: no pan of our own.
        // The move's end places the popup again (Rule 1).
        popupState.current = { trailId, mode: "following", side: "right" }
        apply(placeFollowing(frame, marker, size, "right"), size)
        return
      }

      if (marker !== null) {
        const anchored = placeAnchored(frame, marker, size)
        if (anchored !== null && anchored.side !== null) {
          popupState.current = { trailId, mode: "anchored", side: anchored.side }
          apply(anchored, size)
          return
        }
        const moved = placeAfterPan(frame, marker, size)
        if (moved !== null) {
          // The popup appears at its final place; the marker travels to it.
          popupState.current = { trailId, mode: "panning", side: "right" }
          apply(moved.placement, size)
          api.panBy(
            marker.x - moved.target.x,
            marker.y - moved.target.y,
            animate,
          )
          return
        }
      }

      // No marker, the map not ready, or no room even after a pan.
      popupState.current = { trailId, mode: "docked", side: "right" }
      apply(placeDocked(frame, size), size)
    },
    [apply],
  )

  /** Rule 1 again without moving the camera; else Rule 3's clamped place. */
  const placeAgain = useCallback(() => {
    const state = popupState.current
    const popup = popupRef.current
    const api = mapApiRef.current
    if (state === null || popup === null || api === null) {
      return
    }
    const frame = api.frame(mapInset())
    if (frame === null) {
      return
    }
    const size = popupSize(popup)
    if (state.mode === "docked") {
      apply(placeDocked(frame, size), size)
      return
    }
    const marker = api.project(state.trailId)
    if (marker === null) {
      return
    }
    const anchored = placeAnchored(frame, marker, size)
    if (anchored !== null && anchored.side !== null) {
      state.mode = "anchored"
      state.side = anchored.side
      apply(anchored, size)
    } else {
      state.mode = "following"
      apply(placeFollowing(frame, marker, size, state.side), size)
    }
  }, [apply])

  /** Rule 3: every camera frame, the popup follows its marker. */
  const handleCameraMove = useCallback(
    (byVisitor: boolean) => {
      const state = popupState.current
      const popup = popupRef.current
      const api = mapApiRef.current
      if (state === null || popup === null || api === null) {
        return
      }
      if (state.mode === "docked") {
        return
      }
      if (state.mode === "panning") {
        // The product's own pan: the popup already stands at its final
        // place. The visitor's input interrupts it; then it follows.
        if (!byVisitor) {
          return
        }
        state.mode = "following"
      }
      const frame = api.frame(mapInset())
      const marker = api.project(state.trailId)
      if (frame === null || marker === null) {
        return
      }
      const size = popupSize(popup)
      state.mode = "following"
      apply(placeFollowing(frame, marker, size, state.side), size)
    },
    [apply],
  )

  const handleCameraMoveEnd = useCallback(() => {
    const state = popupState.current
    if (state === null || state.mode === "docked") {
      return
    }
    placeAgain()
  }, [placeAgain])

  const handleReadyChange = useCallback(
    (ready: boolean) => {
      setMapReady(ready)
      if (!ready) {
        // A failed map's view no longer stands: the default region does.
        setMapViewport(null)
      }
      const state = popupState.current
      if (state === null) {
        return
      }
      if (ready) {
        // Docked while the map loaded: it moves once, without animation.
        openPlacement(state.trailId, false)
      } else {
        popupState.current = { ...state, mode: "docked" }
        placeAgain()
      }
    },
    [openPlacement, placeAgain],
  )

  // A popup opens (or the width tier changes): place it before paint.
  useLayoutEffect(() => {
    if (selectedId === null) {
      popupState.current = null
      mapApiRef.current?.setDockedClearance(0)
      return
    }
    const animate = animateNextOpen.current
    animateNextOpen.current = false
    openPlacement(selectedId, animate)
  }, [selectedId, narrow, openPlacement])

  // Its size or the map's size changes: placed again (Rule 1), never
  // during the product's own pan.
  useEffect(() => {
    const popup = popupRef.current
    const section = sectionRef.current
    if (selectedId === null || popup === null || section === null) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (narrowRef.current || popupState.current?.mode === "panning") {
        return
      }
      placeAgain()
    })
    observer.observe(popup)
    observer.observe(section)
    return () => observer.disconnect()
  }, [selectedId, placeAgain])

  /* ---------------------------------------------------------------- *
   * Selection (16.11.1)
   * ---------------------------------------------------------------- */
  /** After a render: the row to bring into view, and whether to focus it. */
  const afterSelect = useRef<{
    trailId: string
    source: "row" | "marker"
  } | null>(null)

  const writeSelection = useCallback(
    (trailId: string | null) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (trailId === null) {
            next.delete(TRAIL_PARAM)
          } else {
            next.set(TRAIL_PARAM, trailId)
          }
          // No Community UI outlives its trail selection (FEATURE-010
          // §15.3, §15.4): selecting another trail, closing the popup, or
          // the selection leaving with the view removes both parameters in
          // the same replace.
          next.delete(COMMUNITY_PARAM)
          next.delete(MEMORY_PARAM)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  /** Scrolls the list (never the document) so the row is fully visible. */
  const revealRow = useCallback(
    (trailId: string, behavior: ScrollBehavior) => {
      const row = rowButtons.current.get(trailId)
      const list = listRef.current
      if (row === undefined || list === null) {
        return
      }
      if (narrowRef.current) {
        // Below 768px the list does not scroll: the page brings the row
        // just under the header (16.16.3).
        window.scrollTo({
          top: window.scrollY + row.getBoundingClientRect().top - headerHeight(),
          behavior,
        })
        return
      }
      const box = list.getBoundingClientRect()
      const target = row.getBoundingClientRect()
      if (target.top < box.top + ROW_MARGIN) {
        list.scrollTo({
          top: list.scrollTop + target.top - box.top - ROW_MARGIN,
          behavior,
        })
      } else if (target.bottom > box.bottom - ROW_MARGIN) {
        list.scrollTo({
          top: list.scrollTop + target.bottom - box.bottom + ROW_MARGIN,
          behavior,
        })
      }
    },
    [headerHeight],
  )

  function select(trail: TrailSummary, source: "row" | "marker") {
    setMapRequested(true)
    animateNextOpen.current = true
    afterSelect.current = { trailId: trail.id, source }
    writeSelection(trail.id)
    if (!narrowRef.current) {
      align(reducedMotion() ? "instant" : "smooth")
    }
  }

  /** Close (×), Escape, the selected row again, or Escape on the canvas. */
  function close(focusRow: boolean) {
    if (selectedId !== null) {
      // A row kept only for the selection goes away with it: the list.
      const rowStays = visibleTrails
        .slice(0, MAX_ROWS)
        .some((trail) => trail.id === selectedId)
      const row = rowButtons.current.get(selectedId)
      const active = document.activeElement
      const focusLost =
        active !== null &&
        (row?.contains(active) === true ||
          popupRef.current?.contains(active) === true)
      if (focusRow && rowStays) {
        row?.focus({ preventScroll: true })
      } else if (focusRow || (!rowStays && focusLost)) {
        listHeadingRef.current?.focus({ preventScroll: true })
      }
    }
    writeSelection(null)
  }

  useEffect(() => {
    const pending = afterSelect.current
    // While a search shows its results the rows are hidden: their turn
    // comes once it has cleared.
    if (pending === null || pending.trailId !== selectedId || searching) {
      return
    }
    afterSelect.current = null

    const row = rowButtons.current.get(pending.trailId)
    if (row === undefined) {
      return
    }
    const behavior = reducedMotion() ? "instant" : "smooth"
    if (pending.source === "marker") {
      revealRow(pending.trailId, behavior)
      row.focus({ preventScroll: true })
    } else {
      // Below 768px the page stays where it is: the row was just activated.
      if (!narrowRef.current) {
        revealRow(pending.trailId, behavior)
      }
      // Focus inside a popup that went away moves to the new row.
      if (document.activeElement === document.body) {
        row.focus({ preventScroll: true })
      }
    }
  }, [selectedId, revealRow, searching])

  function selectFromMap(trailId: string) {
    if (trailId === selectedId) {
      // The selected marker again: nothing changes but focus (16.11.1).
      rowButtons.current.get(trailId)?.focus({ preventScroll: true })
      return
    }
    const trail = byId.get(trailId)
    if (trail !== undefined) {
      select(trail, "marker")
    }
  }

  function highlight(trailId: string, source: "hover" | "focus", on: boolean) {
    const set = source === "hover" ? setRowHover : setRowFocus
    set((current) => (on ? trailId : current === trailId ? null : current))
  }

  /* ---------------------------------------------------------------- *
   * The address on load (16.6, 16.12 D11): a malformed `trail` is
   * removed at once; a UUID waits for the deep-link stages above, then
   * selects its trail or is removed.
   * ---------------------------------------------------------------- */
  // A located trail outside the results: the map moves to its trailhead,
  // once per target (a deep link at the current zoom, a search result
  // zoomed in to SEARCH_ZOOM); its settled view then reads the trails
  // there. Without a map the default region's span is moved there instead
  // (`fallbackViewport`). A map drawn later moves there before its first
  // view is used, so that view never reads trails without it. A search
  // result with the map already drawn is moved by the search itself.
  const movedFor = useRef<number | null>(null)
  const pendingCentre = useRef<Locate | null>(null)
  useEffect(() => {
    if (
      locate === null ||
      locate.center === null ||
      movedFor.current === locate.key
    ) {
      return
    }
    if (paramId !== locate.id) {
      // The visitor already chose something else: the view stays.
      pendingCentre.current = null
      return
    }
    if (mapReady) {
      movedFor.current = locate.key
      pendingCentre.current = null
      moveCamera(mapApiRef.current, locate)
    } else {
      pendingCentre.current = locate
    }
  }, [locate, mapReady, paramId])

  const handleViewportSettled = useCallback((next: MapViewport) => {
    const pending = pendingCentre.current
    if (pending !== null && movedFor.current !== pending.key) {
      movedFor.current = pending.key
      pendingCentre.current = null
      // This view is dropped; the moved one settles next.
      moveCamera(mapApiRef.current, pending)
      return
    }
    setMapViewport(next)
  }, [])

  /**
   * A trail search result was picked (Enter or a press). The query clears.
   * A trail in the current results is selected at once, as from its
   * marker, and brought into view when it is outside the view or the view
   * is wider than SEARCH_ZOOM. Any other trail is located first: the map
   * moves to its trailhead, its `trail` parameter waits in the address,
   * and it is selected when the moved view's own results have it. Focus
   * then goes to its row, as for a marker.
   */
  function pickSearchResult(trail: TrailSummary) {
    search.clear()
    setMapRequested(true)
    const api = mapReady ? mapApiRef.current : null
    const position = trail.position

    if (byId.has(trail.id)) {
      let move: "animated" | "instant" | "none" = "none"
      if (api !== null && position !== null) {
        const zoom = api.zoom()
        if (
          !isInBounds(position, viewport.bounds) ||
          (zoom !== null && zoom < SEARCH_ZOOM)
        ) {
          move = api.focusOn(position.lng, position.lat, SEARCH_ZOOM)
        }
      }
      if (trail.id === selectedId) {
        // Its popup is already open and follows the move; focus its row.
        afterSelect.current = { trailId: trail.id, source: "marker" }
        return
      }
      cameraFlight.current = move === "animated"
      select(trail, "marker")
      return
    }

    // Search keeps only catalog trails with a trailhead outside the results.
    if (position === null) {
      return
    }
    locateCount.current += 1
    const target: Locate = {
      key: locateCount.current,
      id: trail.id,
      origin: "search",
      stage: "centring",
      center: position,
      minZoom: SEARCH_ZOOM,
      from: viewport,
    }
    if (api !== null) {
      movedFor.current = target.key
      pendingCentre.current = null
      moveCamera(api, target)
    }
    setLocate(target)
    animateNextOpen.current = true
    afterSelect.current = { trailId: trail.id, source: "marker" }
    writeSelection(trail.id)
    if (!narrowRef.current) {
      align(reducedMotion() ? "instant" : "smooth")
    }
  }

  function pickActiveSearchResult() {
    const trail =
      search.results[search.activeIndex] ?? search.results[0] ?? null
    if (trail !== null) {
      pickSearchResult(trail)
    }
  }

  /** Escape in the field, or Clear search: focus stays in the field. */
  function clearSearch() {
    search.clear()
    searchInputRef.current?.focus({ preventScroll: true })
  }

  const searchedMeanwhile = locate?.origin === "search"
  const settledOnLoad = useRef(false)
  useEffect(() => {
    if (settledOnLoad.current) {
      return
    }
    if (initial.param === null) {
      settledOnLoad.current = true
      return
    }
    if (!isTrailId(initial.param)) {
      settledOnLoad.current = true
      writeSelection(null)
      return
    }
    if (!deepLinkSettled) {
      return
    }
    settledOnLoad.current = true
    // The visitor already chose something else meanwhile (another trail,
    // or a search, even for this trail): leave it.
    if (paramId !== deepLinkId || searchedMeanwhile) {
      return
    }

    if (selectedId !== null) {
      revealRow(selectedId, "instant")
      if (arrivalFocus) {
        rowButtons.current.get(selectedId)?.focus({ preventScroll: true })
      }
    } else {
      writeSelection(null)
      if (arrivalFocus) {
        headingRef.current?.focus({ preventScroll: true })
      }
    }
  }, [
    arrivalFocus,
    deepLinkId,
    deepLinkSettled,
    initial.param,
    paramId,
    revealRow,
    searchedMeanwhile,
    selectedId,
    writeSelection,
  ])

  // The results changed and the selected trail is no longer among them:
  // the popup has closed (the selection is derived from the results), and
  // the address is cleared to match. Only on the current view's own
  // result, never on a placeholder, and not while a deep link or a search
  // result is being brought onto the map.
  useEffect(() => {
    if (
      !locateSettled ||
      !settledResults ||
      paramId === null ||
      byId.has(paramId)
    ) {
      return
    }
    writeSelection(null)
    // Focus inside the popup that went away returns to the list.
    if (focusInPopup.current && document.activeElement === document.body) {
      focusInPopup.current = false
      listHeadingRef.current?.focus({ preventScroll: true })
    }
  }, [byId, locateSettled, paramId, settledResults, writeSelection])

  // A search result that the moved view still did not have (the visitor
  // moved the map away meanwhile, say): nothing is selected, and that is
  // said once. Focus stays where it is (the search field).
  const reportedMissing = useRef<number | null>(null)
  useEffect(() => {
    if (
      locate === null ||
      locate.origin !== "search" ||
      locate.stage !== "missing" ||
      reportedMissing.current === locate.key
    ) {
      return
    }
    reportedMissing.current = locate.key
    if (afterSelect.current?.trailId === locate.id) {
      afterSelect.current = null
    }
    if (paramId === locate.id) {
      announce("status", discoverContent.search.notShown)
    }
  }, [announce, locate, paramId])

  /* ---------------------------------------------------------------- *
   * What the list says when it changes after the first paint (16.15.3).
   * Selecting, switching, and closing are not announced.
   * ---------------------------------------------------------------- */
  // Said when the list first loads or recovers from a failure; moving
  // between results and an empty area while panning is not announced.
  const previousPhase = useRef<ListPhase>(listPhase)
  useEffect(() => {
    const before = previousPhase.current
    previousPhase.current = listPhase
    if (before === listPhase) {
      return
    }
    const arriving = before === "loading" || before === "failed"

    if (listPhase === "loaded") {
      if (arriving) {
        announce("status", discoverContent.listed(areaCount))
      }
    } else if (listPhase === "empty") {
      if (arriving) {
        announce("status", discoverContent.empty)
      }
    } else if (listPhase === "failed") {
      announce(
        "alert",
        listTimedOut ? trailContent.failure.timeout : discoverContent.failed,
      )
    } else {
      silence()
    }
  }, [announce, areaCount, listPhase, listTimedOut, silence])

  /* ---------------------------------------------------------------- *
   * Community Memories (FEATURE-010 sections 9, 15). The panel's state
   * is the address: `memories=1` (the list) and `memory=<uuid>` (a
   * Detail), beside `trail`. Opening the panel or a Detail pushes an
   * entry marked as in-app; Back and Close go back through those entries
   * when marked, otherwise remove the parameter with replace. The panel
   * belongs to the selected curated trail and closes with it.
   * ---------------------------------------------------------------- */
  const memoriesValue = searchParams.get(COMMUNITY_PARAM)
  const memoryValue = searchParams.get(MEMORY_PARAM)
  const hasCommunityParams = memoriesValue !== null || memoryValue !== null
  const communityMemoryId = isPublicMemoryId(memoryValue)
    ? memoryValue.toLowerCase()
    : null
  const selectedTrail = selectedId === null ? undefined : byId.get(selectedId)
  const syntheticSelected =
    selectedTrail !== undefined && isSyntheticTrailSource(selectedTrail.source)
  const panelOpen =
    selectedTrail !== undefined &&
    !syntheticSelected &&
    (memoriesValue === "1" || communityMemoryId !== null)
  const panelRail = panelOpen && wide
  const marker = readCommunityMarker(location.state)

  /** The control that opened the panel, for Close's focus (§18.8). */
  const communityOpener = useRef<HTMLElement | null>(null)
  /** The panel was opened here (not restored): focus moves into it. */
  const [panelFocus, setPanelFocus] = useState(false)

  const writeCommunity = useCallback(
    (
      view: { memoryId: string | null } | null,
      replace: boolean,
      nextMarker: CommunityMarker | null,
    ) => {
      const next = new URLSearchParams(searchParams)
      next.delete(COMMUNITY_PARAM)
      next.delete(MEMORY_PARAM)
      if (view !== null) {
        next.set(COMMUNITY_PARAM, "1")
        if (view.memoryId !== null) {
          next.set(MEMORY_PARAM, view.memoryId)
        }
      }
      const search = next.toString()
      void navigate(
        { search: search === "" ? "" : `?${search}` },
        {
          replace,
          state:
            nextMarker === null ? null : { [COMMUNITY_MARKER]: nextMarker },
        },
      )
    },
    [navigate, searchParams],
  )

  /** View all memories (a push over the popup). */
  function openCommunityList(opener: HTMLElement) {
    communityOpener.current = opener
    setPanelFocus(true)
    writeCommunity({ memoryId: null }, false, {
      depth: 1,
      rooted: true,
      overList: false,
    })
  }

  /** A popup preview row: the panel opens at that Memory (one push). */
  function openCommunityMemory(memoryId: string, opener: HTMLElement) {
    communityOpener.current = opener
    setPanelFocus(true)
    writeCommunity({ memoryId }, false, {
      depth: 1,
      rooted: true,
      overList: false,
    })
  }

  /** An entry of the panel's list: a Detail pushed over the list. */
  function openMemoryFromList(memoryId: string) {
    writeCommunity({ memoryId }, false, {
      depth: (marker?.depth ?? 0) + 1,
      rooted: marker?.rooted ?? false,
      overList: true,
    })
  }

  /** Back to Community Memories: to the list, never a new entry. */
  function backToCommunityList() {
    if (marker?.overList) {
      void navigate(-1)
      return
    }
    writeCommunity(
      { memoryId: null },
      true,
      marker === null ? null : { ...marker, overList: false },
    )
  }

  /** Close: back over every pushed Community entry, else replace. */
  function closeCommunity() {
    if (marker !== null && marker.rooted) {
      void navigate(-marker.depth)
      return
    }
    writeCommunity(null, true, null)
  }

  // Invalid combinations are dropped, silently, with replace (§15.2): the
  // panel without a trail, or with a synthetic trail; a `memories` value
  // other than 1; a `memory` that is not a UUID. A trail that is not (or
  // no longer) selected is removed by the selection rules above, with the
  // Community parameters in the same replace. Without a usable trail the
  // `trail` parameter goes too, so this replace and the deep-link one
  // agree whichever is written last.
  useEffect(() => {
    if (!hasCommunityParams) {
      return
    }
    const dropAll = paramId === null || syntheticSelected
    const dropList = memoriesValue !== null && memoriesValue !== "1"
    const dropMemory = memoryValue !== null && communityMemoryId === null
    if (!dropAll && !dropList && !dropMemory) {
      return
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (paramId === null) {
          next.delete(TRAIL_PARAM)
        }
        if (dropAll || dropList) {
          next.delete(COMMUNITY_PARAM)
        }
        if (dropAll || dropMemory) {
          next.delete(MEMORY_PARAM)
        }
        return next
      },
      { replace: true },
    )
  }, [
    communityMemoryId,
    hasCommunityParams,
    memoriesValue,
    memoryValue,
    paramId,
    setSearchParams,
    syntheticSelected,
  ])

  // The panel closed: the popup shows again where its anchor puts it (no
  // camera move), and focus that was in the panel returns to the opener,
  // else the popup's heading, else the list heading (§18.8). Focus that is
  // already somewhere else (another row, the map) stays there.
  const panelWasOpen = useRef(panelOpen)
  useLayoutEffect(() => {
    const was = panelWasOpen.current
    panelWasOpen.current = panelOpen
    if (!was || panelOpen) {
      return
    }
    const opener = communityOpener.current
    communityOpener.current = null
    if (selectedId !== null && !narrowRef.current) {
      placeAgain()
    }
    const active = document.activeElement
    if (active !== null && active !== document.body) {
      return
    }
    if (opener !== null && opener.isConnected) {
      opener.focus({ preventScroll: true })
      return
    }
    const popupHeading = popupRef.current?.querySelector<HTMLElement>("h4")
    if (popupHeading !== null && popupHeading !== undefined) {
      popupHeading.focus({ preventScroll: true })
      return
    }
    listHeadingRef.current?.focus({ preventScroll: true })
  }, [panelOpen, selectedId, placeAgain])

  /** Repeats the nearby read. The button keeps focus while it works. */
  function retryList() {
    setRetrying(true)
    void nearbyQuery.refetch().then((result) => {
      setRetrying(false)
      if (result.isSuccess) {
        listHeadingRef.current?.focus()
      }
    })
  }

  // The list caption (16.7.2): TA7 for sample figures, TA4 on failure.
  let caption: string | null = null
  if (activityQuery.data !== undefined) {
    caption = activityQuery.data.sample ? activityContent.sampleCaption : null
  } else if (activityQuery.isError) {
    caption = activityContent.unavailable
  }

  return (
    <section
      ref={sectionRef}
      id={DISCOVER_ID}
      className="discover"
      aria-labelledby={headingId}
      data-community-open={panelRail ? "" : undefined}
      onFocus={(event) => {
        focusInPopup.current =
          popupRef.current?.contains(event.target as Node) ?? false
      }}
    >
      <div className="discover-rail">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="discover-heading trip-focus-target"
        >
          {discoverContent.heading}
        </h2>

        <section className="discover-list" aria-labelledby={listHeadingId}>
          <TrailSearchField
            inputRef={searchInputRef}
            query={search.query}
            expanded={searching && search.results.length > 0}
            listboxId={searchListboxId}
            activeOptionId={
              search.activeIndex >= 0
                ? searchOptionId(
                    searchListboxId,
                    search.results[search.activeIndex].id,
                  )
                : undefined
            }
            onQueryChange={search.setQuery}
            onEngage={() => {
              search.engage()
              // Focus before Discover has been seen (no pixel of it in view
              // yet) is a keyboard entry from the Hero: enter Discover as
              // Explore trails does, keeping focus in the field.
              if (!mapRequested) {
                setMapRequested(true)
                align(reducedMotion() ? "instant" : "smooth")
              }
            }}
            onMove={search.move}
            onPick={pickActiveSearchResult}
            onClear={clearSearch}
          />
          {/* The catalog's one request, from the first focus or input on. */}
          {search.engaged ? <CatalogRequest /> : null}

          <h3
            ref={listHeadingRef}
            id={listHeadingId}
            tabIndex={-1}
            className="discover-list-heading trip-focus-target"
          >
            {searching
              ? discoverContent.search.heading(search.total)
              : discoverContent.listHeading(
                  listPhase === "loaded" ? areaCount : null,
                )}
          </h3>

          {searching ? (
            <TrailSearchResults
              listboxId={searchListboxId}
              labelledBy={listHeadingId}
              query={search.displayQuery}
              results={search.results}
              total={search.total}
              activeIndex={search.activeIndex}
              catalog={search.catalogState}
              onPick={pickSearchResult}
              onClear={clearSearch}
            />
          ) : null}

          {!searching && listPhase === "loaded" && caption !== null ? (
            <p className="discover-list-caption">{caption}</p>
          ) : null}

          {/* Read in place, never announced: they change on every pan. */}
          {!searching && (listPhase === "loaded" || listPhase === "empty") ? (
            <>
              {areaCount > MAX_ROWS ? (
                <p className="discover-list-caption">
                  {discoverContent.limited(MAX_ROWS, areaCount)}
                </p>
              ) : null}
              {capped ? (
                <p className="discover-list-caption">
                  {discoverContent.capped}
                </p>
              ) : null}
              {updating ? (
                <p className="discover-list-updating">
                  <LoaderCircle
                    aria-hidden="true"
                    strokeWidth={2}
                    className="trip-spin"
                  />
                  <span>{discoverContent.updating}</span>
                </p>
              ) : null}
            </>
          ) : null}

          {!searching && listPhase === "loading" ? (
            <div className="discover-list-pending">
              <ul className="discover-skeleton-rows" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <li key={index}>
                    <span className="discover-skeleton discover-skeleton-name" />
                    <span className="discover-skeleton discover-skeleton-meta" />
                  </li>
                ))}
              </ul>
              <p className="discover-list-state">
                <LoaderCircle
                  aria-hidden="true"
                  strokeWidth={2}
                  className="trip-spin"
                />
                <span>
                  {slow ? tripContent.stillLoading : discoverContent.loading}
                </span>
              </p>
            </div>
          ) : null}

          {!searching && listPhase === "failed" ? (
            <>
              <p className="discover-list-state" data-tone="alert">
                <CircleAlert aria-hidden="true" strokeWidth={2} />
                <span>
                  {listTimedOut
                    ? trailContent.failure.timeout
                    : discoverContent.failed}
                </span>
              </p>
              <p className="discover-list-retry">
                <TripRetryButton
                  tone="paper"
                  working={retrying}
                  onRetry={retryList}
                />
              </p>
            </>
          ) : null}

          {!searching && listPhase === "empty" ? (
            <p className="discover-list-empty">{discoverContent.empty}</p>
          ) : null}

          {/* Hidden, not removed, while searching: an open popup (inside
              its row) keeps its place and returns when the search clears. */}
          {listPhase === "loaded" ? (
            <ul ref={listRef} className="discover-rows" hidden={searching}>
              {rows.map((trail) => {
                const expanded = trail.id === selectedId
                const activity = readActivity(activityQuery, trail.id)
                const popupId = `discover-popup-${trail.id}`

                return (
                  <TrailRow
                    key={trail.id}
                    trail={trail}
                    activity={activity}
                    expanded={expanded}
                    popupId={popupId}
                    mapHovered={trail.id === mapHover}
                    buttonRef={(node) => {
                      if (node === null) {
                        rowButtons.current.delete(trail.id)
                      } else {
                        rowButtons.current.set(trail.id, node)
                      }
                    }}
                    onActivate={() =>
                      expanded ? close(false) : select(trail, "row")
                    }
                    onEscape={() => close(true)}
                    onHighlight={(source, on) =>
                      highlight(trail.id, source, on)
                    }
                  >
                    {expanded ? (
                      <TrailPopup
                        id={popupId}
                        trail={trail}
                        activity={activity}
                        popupRef={popupRef}
                        onClose={() => close(true)}
                        onResize={placeAgain}
                        communityHidden={panelRail}
                        community={
                          isSyntheticTrailSource(trail.source) ? null : (
                            <CommunityPreview
                              trailId={trail.id}
                              trailName={trail.name ?? trailContent.unnamed}
                              onOpenList={openCommunityList}
                              onOpenMemory={openCommunityMemory}
                            />
                          )
                        }
                      />
                    ) : null}
                  </TrailRow>
                )
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <TrailMap
        trails={mapTrails}
        active={mapRequested}
        selectedId={selectedId}
        highlightedId={rowHover ?? rowFocus}
        apiRef={mapApiRef}
        wheelHintAllowed={() => narrowRef.current || isAligned()}
        onSelect={selectFromMap}
        onHover={setMapHover}
        onReadyChange={handleReadyChange}
        onCameraMove={handleCameraMove}
        onCameraMoveEnd={handleCameraMoveEnd}
        onViewportSettled={handleViewportSettled}
        onCanvasEscape={() => {
          if (selectedId !== null) {
            close(false)
          }
        }}
      />

      {/* FEATURE-010: the Community panel of the selected curated trail.
          From 1024px a docked rail positioned against this section, over
          the map's far edge; below, a modal sheet in the top layer. */}
      {panelOpen && selectedTrail !== undefined ? (
        <CommunityPanel
          key={`${selectedTrail.id}:${wide ? "rail" : "sheet"}`}
          mode={wide ? "rail" : "sheet"}
          trailId={selectedTrail.id}
          trailName={selectedTrail.name ?? trailContent.unnamed}
          memoryId={communityMemoryId}
          focusOnOpen={panelFocus}
          onOpenMemory={openMemoryFromList}
          onBack={backToCommunityList}
          onClose={closeCommunity}
        />
      ) : null}
    </section>
  )
}
