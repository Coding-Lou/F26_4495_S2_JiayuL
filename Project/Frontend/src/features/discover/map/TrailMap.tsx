import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import { CircleAlert, LoaderCircle, Minus, Plus } from "lucide-react"
import { TripRetryButton } from "@/components/layout/TripRetryButton"
import { tripContent } from "@/features/trails/content"
import { useElapsed } from "@/lib/useElapsed"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { discoverContent, mapAttribution } from "../content"
import type {
  BlockedGesture,
  FocusMove,
  MapPoint,
  MapTrail,
  TrailMapHandle,
  ZoomLimits,
} from "./mapTypes"
import type { Box, PlacementFrame } from "./popupPlacement"
import { DEFAULT_BOUNDS, type MapViewport } from "./viewport"

/** D7: the runtime chunk and a drawn map within 20 s. */
const MAP_LIMIT_MS = 20_000
/** D6: a wait longer than this says so (SH7). */
const SLOW_AFTER_MS = 10_000
/** 16.8.3: the hint stays this long after the last turned-away input. */
const HINT_HOLD_MS = 1200
/** Z and A are grown by this much (16.10). */
const OBSTACLE_MARGIN = 8

const LARGE_TIER_QUERY = "(min-width: 1440px)"
/** The same key the map library uses to let a wheel through (⌘ on a Mac). */
const IS_MAC =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")

/** What the Discover section asks of the map, for the popup (16.10). */
export type TrailMapApi = {
  /** Whether the map is drawn and its trails can be projected. */
  ready: () => boolean
  /**
   * A trail's point now, from its stored trailhead, or null when the map
   * is not ready or the trail is not on it (16.10).
   */
  project: (trailId: string) => MapPoint | null
  /** Puts a position at the map's centre at the current zoom. */
  centerOn: (lng: number, lat: number) => void
  /**
   * Trail search: puts a position at the centre, zoomed in to at least
   * `minZoom` (never out); "none" when there is no map to move.
   */
  focusOn: (lng: number, lat: number, minZoom: number) => FocusMove
  /** The current zoom, or null without a drawn map. */
  zoom: () => number | null
  /** The map region's size, inset P, and the zoom and attribution boxes. */
  frame: (inset: number) => PlacementFrame | null
  /** The map region's offset inside the Discover section. */
  offset: () => { left: number; top: number } | null
  panBy: (dx: number, dy: number, animate: boolean) => void
  /**
   * Width kept clear at the region's end for a docked popup, so the loading
   * and failure states centre in the space to its left (16.10 Rule 4).
   */
  setDockedClearance: (px: number) => void
}

type TrailMapProps = {
  /** Every fetched trail with a valid trailhead (not only the visible). */
  trails: MapTrail[]
  /** False until Discover is about to be seen: nothing is requested (§14). */
  active: boolean
  selectedId: string | null
  /** The trail whose list row is hovered or focused. */
  highlightedId: string | null
  apiRef: Ref<TrailMapApi>
  /** Whether a turned-away wheel may show its hint: Discover is aligned. */
  wheelHintAllowed: () => boolean
  onSelect: (trailId: string) => void
  onHover: (trailId: string | null) => void
  onReadyChange: (ready: boolean) => void
  onCameraMove: (byVisitor: boolean) => void
  onCameraMoveEnd: () => void
  /** The view settled (first draw, then after each movement). */
  onViewportSettled: (viewport: MapViewport) => void
  /** Escape while the map canvas has focus (16.11.1). */
  onCanvasEscape: () => void
}

type Phase = "idle" | "loading" | "ready" | "failed" | "unsupported"

/**
 * The map region of Discover (FEATURE-006 sections 13, 14, 16.8, 16.12
 * D6–D8): the shell around the map runtime. Nothing here imports the map
 * library: the runtime arrives through one dynamic `import()` once `active`
 * is true, and the list works before it, without it, and when it fails.
 *
 * Over the map there are only the zoom controls, the attribution, the
 * one hover label, the gesture hint, and the map's own loading and failure
 * states. Trails are drawn by the map (a clustered source), not as DOM. The Trail Detail popup is positioned over this region but
 * is not part of its DOM (16.11.2).
 */
export function TrailMap({
  trails,
  active,
  selectedId,
  highlightedId,
  apiRef,
  wheelHintAllowed,
  onSelect,
  onHover,
  onReadyChange,
  onCameraMove,
  onCameraMoveEnd,
  onViewportSettled,
  onCanvasEscape,
}: TrailMapProps) {
  const [unsupported] = useState(() => !hasWebGL2())
  /** Each attempt is a new map in the same container. */
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState<{
    attempt: number
    phase: "ready" | "failed"
  } | null>(null)
  /** The attempt Retry started, while it works. */
  const [retrying, setRetrying] = useState<number | null>(null)
  const [zoomLimits, setZoomLimits] = useState<ZoomLimits>({
    atMin: false,
    atMax: false,
  })
  const [hint, setHint] = useState<{
    gesture: BlockedGesture
    visible: boolean
  } | null>(null)

  const regionRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const attributionRef = useRef<HTMLParagraphElement>(null)
  const handleRef = useRef<TrailMapHandle | null>(null)
  /** Trailheads by id, for the popup's anchor (no DOM marker exists). */
  const positionsRef = useRef(new Map<string, MapTrail>())
  const hintTimer = useRef<number | undefined>(undefined)
  const large = useMediaQuery(LARGE_TIER_QUERY)

  // The runtime's callbacks read the latest handlers and settings.
  const latest = useRef({
    onSelect,
    onHover,
    onCameraMove,
    onCameraMoveEnd,
    onViewportSettled,
    wheelHintAllowed,
    large,
  })
  useEffect(() => {
    latest.current = {
      onSelect,
      onHover,
      onCameraMove,
      onCameraMoveEnd,
      onViewportSettled,
      wheelHintAllowed,
      large,
    }
  })

  // Before the section's layout effects (a child's run first), so a popup
  // placed in the same commit can already be anchored to its trail.
  useLayoutEffect(() => {
    positionsRef.current = new Map(trails.map((trail) => [trail.id, trail]))
  }, [trails])

  const phase: Phase = unsupported
    ? "unsupported"
    : !active
      ? "idle"
      : outcome?.attempt === attempt
        ? outcome.phase
        : "loading"
  const ready = phase === "ready"
  const retryWorking = phase === "loading" && retrying === attempt
  const slow = useElapsed(
    phase === "loading" && !retryWorking,
    String(attempt),
    SLOW_AFTER_MS,
  )

  useImperativeHandle(
    apiRef,
    (): TrailMapApi => ({
      ready: () => handleRef.current !== null && ready,
      project: (trailId) => {
        const handle = handleRef.current
        const trail = positionsRef.current.get(trailId)
        return ready && handle !== null && trail !== undefined
          ? handle.projectLngLat(trail.lng, trail.lat)
          : null
      },
      centerOn: (lng, lat) => handleRef.current?.centerOn(lng, lat),
      // Like centerOn, usable from the first settled view on, before this
      // shell has rendered as ready.
      focusOn: (lng, lat, minZoom) =>
        handleRef.current?.focusOn(lng, lat, minZoom) ?? "none",
      zoom: () => {
        const handle = handleRef.current
        return ready && handle !== null ? handle.getZoom() : null
      },
      frame: (inset) => {
        const region = regionRef.current
        if (region === null) {
          return null
        }
        const origin = region.getBoundingClientRect()
        return {
          width: region.clientWidth,
          height: region.clientHeight,
          inset,
          zoom: grownBox(zoomRef.current, origin),
          attribution: grownBox(attributionRef.current, origin),
        }
      },
      offset: () => {
        const region = regionRef.current
        return region === null
          ? null
          : { left: region.offsetLeft, top: region.offsetTop }
      },
      panBy: (dx, dy, animate) => handleRef.current?.panBy(dx, dy, animate),
      setDockedClearance: (px) =>
        regionRef.current?.style.setProperty(
          "--discover-docked-clearance",
          `${px}px`,
        ),
    }),
    [ready],
  )

  /** A turned-away gesture shows the hint, held while the input continues. */
  function showHint(gesture: BlockedGesture) {
    window.clearTimeout(hintTimer.current)
    setHint({ gesture, visible: true })
    hintTimer.current = window.setTimeout(() => {
      setHint((current) =>
        current === null ? null : { ...current, visible: false },
      )
    }, HINT_HOLD_MS)
  }

  useEffect(() => () => window.clearTimeout(hintTimer.current), [])

  // One attempt: the runtime chunk, then a map, within the limit.
  useEffect(() => {
    const container = containerRef.current
    if (!active || unsupported || container === null) {
      return
    }

    let settled = false
    let handle: TrailMapHandle | null = null

    const finish = (result: "ready" | "failed") => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timer)
      if (result === "failed") {
        // A map that failed is taken down, so its canvas is no tab stop.
        handle?.destroy()
        handle = null
        handleRef.current = null
      }
      setOutcome({ attempt, phase: result })
    }

    const timer = window.setTimeout(() => finish("failed"), MAP_LIMIT_MS)

    /** A wheel shows its hint only if the page did not move under it. */
    const onGestureBlocked = (gesture: BlockedGesture) => {
      if (gesture === "touch") {
        showHint("touch")
        return
      }
      const scrollY = window.scrollY
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (
            window.scrollY === scrollY &&
            latest.current.wheelHintAllowed()
          ) {
            showHint("wheel")
          }
        }),
      )
    }

    import("./runtime/trailMapRuntime").then(
      (module) => {
        if (settled) {
          return
        }
        handle = module.default({
          container,
          canvasLabel: discoverContent.mapCanvas,
          bounds: DEFAULT_BOUNDS,
          padding: latest.current.large ? 48 : 32,
          onReady: () => finish("ready"),
          onFail: () => finish("failed"),
          onSelect: (trailId) => latest.current.onSelect(trailId),
          onHover: (trailId) => latest.current.onHover(trailId),
          onZoomLimits: (limits) =>
            setZoomLimits((current) =>
              current.atMin === limits.atMin && current.atMax === limits.atMax
                ? current
                : limits,
            ),
          onCameraMove: (byVisitor) => latest.current.onCameraMove(byVisitor),
          onCameraMoveEnd: () => latest.current.onCameraMoveEnd(),
          onViewportSettled: (viewport) =>
            latest.current.onViewportSettled(viewport),
          onGestureBlocked,
        })
        if (!settled) {
          handleRef.current = handle
        }
      },
      () => finish("failed"),
    )

    return () => {
      settled = true
      window.clearTimeout(timer)
      handle?.destroy()
      handleRef.current = null
    }
  }, [active, attempt, unsupported])

  // After a successful Retry the button is gone: focus goes to the map.
  const focusMapAfterRetry = useRef(false)
  useEffect(() => {
    if (ready && focusMapAfterRetry.current) {
      focusMapAfterRetry.current = false
      containerRef.current?.querySelector("canvas")?.focus()
    }
  }, [ready])

  useEffect(() => {
    if (ready) {
      handleRef.current?.setTrails(trails)
    }
  }, [ready, trails])

  useEffect(() => {
    if (ready) {
      handleRef.current?.setSelected(selectedId)
    }
  }, [ready, selectedId])

  useEffect(() => {
    if (ready) {
      handleRef.current?.setHighlighted(highlightedId)
    }
  }, [ready, highlightedId])

  // The section is told when the map becomes ready, and when it stops being.
  // After the effects above, so the trails are already on the map.
  const reportedReady = useRef(false)
  useEffect(() => {
    if (reportedReady.current !== ready) {
      reportedReady.current = ready
      onReadyChange(ready)
    }
  }, [ready, onReadyChange])

  function retry() {
    if (retryWorking) {
      return
    }
    focusMapAfterRetry.current = true
    setRetrying(attempt + 1)
    setAttempt((value) => value + 1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === "Escape" &&
      event.target instanceof HTMLCanvasElement
    ) {
      onCanvasEscape()
    }
  }

  const hintText =
    hint?.gesture === "touch"
      ? discoverContent.hint.touch
      : IS_MAC
        ? discoverContent.hint.mac
        : discoverContent.hint.windows

  return (
    <div
      ref={regionRef}
      className="discover-map"
      role="region"
      aria-label={discoverContent.mapRegion}
      data-phase={phase}
      onKeyDown={handleKeyDown}
    >
      <div ref={containerRef} className="discover-map-canvas" />

      {/* The restyled cooperative-gesture hint (16.8.3). Never announced. */}
      {ready ? (
        <div
          className="discover-hint"
          data-visible={hint?.visible ? "" : undefined}
          aria-hidden="true"
        >
          <p className="discover-hint-box">{hintText}</p>
        </div>
      ) : null}

      {phase === "loading" && !retryWorking ? (
        <div className="discover-map-state">
          <p className="discover-map-state-line">
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="trip-spin"
            />
            <span>
              {slow ? tripContent.stillLoading : discoverContent.mapLoading}
            </span>
          </p>
        </div>
      ) : null}

      {phase === "failed" || phase === "unsupported" || retryWorking ? (
        <div className="discover-map-state">
          <div className="discover-map-state-block">
            <p className="discover-map-state-line">
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>
                {phase === "unsupported"
                  ? discoverContent.mapUnsupported
                  : discoverContent.mapFailed}
              </span>
            </p>
            {phase !== "unsupported" ? (
              <p className="discover-map-state-action">
                <TripRetryButton
                  tone="paper"
                  working={retryWorking}
                  onRetry={retry}
                />
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {ready ? (
        <>
          <div ref={zoomRef} className="discover-zoom" role="group">
            <ZoomButton
              label={discoverContent.zoomIn}
              disabled={zoomLimits.atMax}
              onZoom={() => handleRef.current?.zoomIn()}
            >
              <Plus aria-hidden="true" strokeWidth={2} />
            </ZoomButton>
            <ZoomButton
              label={discoverContent.zoomOut}
              disabled={zoomLimits.atMin}
              onZoom={() => handleRef.current?.zoomOut()}
            >
              <Minus aria-hidden="true" strokeWidth={2} />
            </ZoomButton>
          </div>

          <p ref={attributionRef} className="discover-attribution">
            {mapAttribution.map((credit, index) => (
              <span key={credit.href}>
                {index > 0 ? " " : null}
                <a
                  href={credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="discover-attribution-link"
                >
                  {credit.text}
                </a>
              </span>
            ))}
          </p>
        </>
      ) : null}
    </div>
  )
}

type ZoomButtonProps = {
  label: string
  disabled: boolean
  onZoom: () => void
  children: ReactNode
}

/** At the zoom limit it stays focusable and says it is unavailable. */
function ZoomButton({ label, disabled, onZoom, children }: ZoomButtonProps) {
  return (
    <button
      type="button"
      className="discover-zoom-button"
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      onClick={() => {
        if (!disabled) {
          onZoom()
        }
      }}
    >
      {children}
    </button>
  )
}

/** An element's box in the region's px, grown by 8px; null when absent. */
function grownBox(element: HTMLElement | null, origin: DOMRect): Box | null {
  if (element === null) {
    return null
  }
  const box = element.getBoundingClientRect()
  return {
    left: box.left - origin.left - OBSTACLE_MARGIN,
    top: box.top - origin.top - OBSTACLE_MARGIN,
    right: box.right - origin.left + OBSTACLE_MARGIN,
    bottom: box.bottom - origin.top + OBSTACLE_MARGIN,
  }
}

/** MapLibre draws with WebGL 2; without it nothing is requested (D8). */
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return canvas.getContext("webgl2") !== null
  } catch {
    return false
  }
}
