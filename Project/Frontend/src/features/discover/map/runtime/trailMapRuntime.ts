import {
  Map as MapLibreMap,
  setWorkerUrl,
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type PointLike,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import type {
  CreateTrailMap,
  MapTrail,
  TrailMapHandle,
  TrailMapOptions,
} from "../mapTypes"
import type { MapViewport } from "../viewport"
import { trailMapStyle } from "./mapStyle"

/**
 * The map runtime (FEATURE-006 sections 13, 16.8, 16.10). The only module
 * that imports `maplibre-gl` and its CSS; it is loaded by one dynamic
 * `import()` from the map's shell, so the map library is its own chunk,
 * requested only when Discover is about to be seen (section 14).
 *
 * MapLibre is used directly, without a React wrapper and without its
 * `Popup` or `Marker`: the Trail Detail popup is a React node outside the
 * map's DOM, and this runtime only reports where a trail is (16.10).
 *
 * Trails are drawn by the map itself, with no DOM per trail: one clustered
 * GeoJSON source (the whole fetched set) with a cluster layer, a
 * cluster-count layer, and an unclustered point layer; and one small
 * unclustered "focus" source on top that holds only the selected trail and
 * the hovered or highlighted one, so the selected trail stays an individual
 * point when its neighbours cluster. Cluster numbers count trails, never
 * people or activity, and are drawn in `stone`, apart from the `ink` and
 * `paper` activity levels. The one hover label is a single reusable element.
 * Nothing drawn is focusable: the trail list is the keyboard and
 * assistive-technology path to every trail (16.8.6).
 */

// The bundled worker sits beside this chunk under a hashed name, so its
// address is given to the library explicitly.
setWorkerUrl(workerUrl)

const MIN_ZOOM = 6
const MAX_ZOOM = 16
/** Rule 2 pans the camera over 500ms on `--ease-ui` (16.10). */
const PAN_DURATION_MS = 500
/** A search result's move (centre and zoom) on the same easing. */
const FOCUS_DURATION_MS = 700
/** A label within this distance of the map's right edge moves left. */
const LABEL_EDGE_MARGIN = 16
/** The label stands 8px beyond the point's outer edge. */
const LABEL_GAP = 8
/** A view is settled this long after a movement ends with no new one. */
const SETTLE_MS = 250

/** Clustering: px within which points merge, and the last zoom that does. */
const CLUSTER_RADIUS = 50
const CLUSTER_MAX_ZOOM = 12

/** Pointer targets: 32px around a point (44px on a coarse pointer). */
const HIT_RADIUS = 16
const HIT_RADIUS_COARSE = 22

/** Palette values (DESIGN_SYSTEM §6): ink, paper, stone. */
const INK = "#0B1C20"
const PAPER = "#F7F5EF"
const STONE = "#55615D"
/** A font the style's glyph source (OpenFreeMap) serves. */
const COUNT_FONT = ["Noto Sans Bold"]

const TRAILS_SOURCE = "discover-trails"
const FOCUS_SOURCE = "discover-trail-focus"
const CLUSTER_HALO_LAYER = "discover-cluster-halo"
const CLUSTER_LAYER = "discover-clusters"
const CLUSTER_COUNT_LAYER = "discover-cluster-count"
const POINT_LAYER = "discover-trail-points"
const POINT_DOT_LAYER = "discover-trail-point-dots"
const FOCUS_HALO_LAYER = "discover-focus-halo"
const FOCUS_DISC_LAYER = "discover-focus-disc"
const FOCUS_DOT_LAYER = "discover-focus-dot"

/** `--ease-ui`, cubic-bezier(0.2, 0, 0, 1), as an easing function. */
const easeUi = cubicBezier(0.2, 0, 0, 1)

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches
}

type SourceData = Parameters<GeoJSONSource["setData"]>[0]

const IS_CLUSTER: ExpressionSpecification = ["has", "point_count"]
const LEVEL: ExpressionSpecification = ["get", "level"]
const STATE: ExpressionSpecification = ["get", "state"]
const SELECTED: ExpressionSpecification = ["==", STATE, "selected"]
const MANY: ExpressionSpecification = ["==", LEVEL, "many"]

/** Unclustered points, without the ones the focus source draws on top. */
function unclustered(excluded: string[]): ExpressionSpecification {
  return [
    "all",
    ["!", IS_CLUSTER],
    ["!", ["in", ["get", "id"], ["literal", excluded]]],
  ]
}

function pointFilter(excluded: string[]): FilterSpecification {
  return unclustered(excluded)
}

function pointDotFilter(excluded: string[]): FilterSpecification {
  return ["all", unclustered(excluded), ["==", LEVEL, "some"]]
}

function featureCollection(
  features: { lng: number; lat: number; properties: Record<string, string> }[],
): SourceData {
  return {
    type: "FeatureCollection",
    features: features.map(({ lng, lat, properties }) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties,
    })),
  }
}

/** The layers of section 16.8.6, drawn by the map instead of DOM markers. */
function addTrailLayers(map: MapLibreMap) {
  const empty = featureCollection([])
  map.addSource(TRAILS_SOURCE, {
    type: "geojson",
    data: empty,
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  })
  map.addSource(FOCUS_SOURCE, { type: "geojson", data: empty })

  const clusterRadius: ExpressionSpecification = [
    "step",
    ["get", "point_count"],
    14,
    10,
    17,
    50,
    21,
  ]

  // Clusters: a `stone` disc with a `paper` ring and a soft `stone` halo
  // that reads as a group. Never the activity levels' `ink`/`paper` fills.
  map.addLayer({
    id: CLUSTER_HALO_LAYER,
    type: "circle",
    source: TRAILS_SOURCE,
    filter: IS_CLUSTER,
    paint: {
      "circle-radius": ["+", clusterRadius, 6],
      "circle-color": STONE,
      "circle-opacity": 0.2,
    },
  })
  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: TRAILS_SOURCE,
    filter: IS_CLUSTER,
    paint: {
      "circle-radius": clusterRadius,
      "circle-color": STONE,
      "circle-stroke-width": 2,
      "circle-stroke-color": PAPER,
    },
  })
  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: TRAILS_SOURCE,
    filter: IS_CLUSTER,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": COUNT_FONT,
      "text-size": 12,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": PAPER },
  })

  // Trail points (16.8.6): fill amount is the level. Base: a `paper` disc
  // with a 2px `ink` ring, 20px. Some: plus an 8px `ink` dot. Many: a solid
  // `ink` disc with a 2px `paper` halo, 24px. Strokes sit outside the radius.
  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: TRAILS_SOURCE,
    filter: pointFilter([]),
    paint: {
      "circle-radius": ["case", MANY, 10, 8],
      "circle-color": ["case", MANY, INK, PAPER],
      "circle-stroke-width": 2,
      "circle-stroke-color": ["case", MANY, PAPER, INK],
    },
  })
  map.addLayer({
    id: POINT_DOT_LAYER,
    type: "circle",
    source: TRAILS_SOURCE,
    filter: pointDotFilter([]),
    paint: { "circle-radius": 4, "circle-color": INK },
  })

  // Focus: the hovered point (ring 2 → 3px; many gains a 1px `ink`
  // outline) and the selected point (a 28px disc that keeps its level, a
  // 3px `paper` gap, a 2px `ink` outer ring: 38px overall), selected on top.
  map.addLayer({
    id: FOCUS_HALO_LAYER,
    type: "circle",
    source: FOCUS_SOURCE,
    filter: ["any", SELECTED, MANY],
    paint: {
      "circle-radius": ["case", SELECTED, 17, 12],
      "circle-color": PAPER,
      "circle-stroke-width": ["case", SELECTED, 2, 1],
      "circle-stroke-color": INK,
    },
    layout: { "circle-sort-key": ["case", SELECTED, 2, 1] },
  })
  map.addLayer({
    id: FOCUS_DISC_LAYER,
    type: "circle",
    source: FOCUS_SOURCE,
    paint: {
      "circle-radius": ["case", SELECTED, 12, MANY, 10, 7],
      "circle-color": ["case", MANY, INK, PAPER],
      "circle-stroke-width": ["case", SELECTED, 2, MANY, 2, 3],
      "circle-stroke-color": ["case", SELECTED, INK, MANY, PAPER, INK],
    },
    layout: { "circle-sort-key": ["case", SELECTED, 2, 1] },
  })
  map.addLayer({
    id: FOCUS_DOT_LAYER,
    type: "circle",
    source: FOCUS_SOURCE,
    filter: ["==", LEVEL, "some"],
    paint: {
      "circle-radius": ["case", SELECTED, 5, 4],
      "circle-color": INK,
    },
    layout: { "circle-sort-key": ["case", SELECTED, 2, 1] },
  })
}

type Hit =
  | { kind: "trail"; id: string }
  | { kind: "cluster"; clusterId: number; lng: number; lat: number }

const createTrailMap: CreateTrailMap = (options: TrailMapOptions) => {
  let map: MapLibreMap
  try {
    map = new MapLibreMap({
      container: options.container,
      style: trailMapStyle,
      bounds: options.bounds,
      fitBoundsOptions: { padding: options.padding },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // At every width: a plain wheel and one finger scroll the page
      // (16.3.3). The library's own message screen is hidden by the shell's
      // CSS, which draws the restyled hint instead (16.8.3).
      cooperativeGestures: true,
      renderWorldCopies: false,
      // The attribution is drawn by the shell, always expanded (16.8.5).
      attributionControl: false,
      locale: { "Map.Title": options.canvasLabel },
    })
  } catch {
    // No context could be created, or the library refused to start.
    queueMicrotask(options.onFail)
    return inertHandle()
  }

  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()

  let destroyed = false
  let layersReady = false
  let selectedId: string | null = null
  let pointerHoverId: string | null = null
  let highlightedId: string | null = null
  let settleTimer: number | undefined
  /** The focus source's ids last drawn, to skip identical updates. */
  let focusKey = ""
  const trails = new Map<string, MapTrail>()

  // The one hover label: never interactive, never a count, never focusable.
  const label = document.createElement("span")
  label.className = "discover-map-label"
  label.setAttribute("aria-hidden", "true")
  label.hidden = true
  map.getContainer().append(label)

  map.once("load", () => {
    if (destroyed) {
      return
    }
    try {
      addTrailLayers(map)
      layersReady = true
    } catch {
      options.onFail()
      return
    }
    reportZoomLimits()
    options.onReady()
    reportViewport()
  })
  map.on("webglcontextlost", () => {
    if (!destroyed) {
      options.onFail()
    }
  })
  map.on("zoom", reportZoomLimits)
  map.on("move", (event) => {
    placeLabel()
    if (!destroyed) {
      options.onCameraMove(event.originalEvent !== undefined)
    }
  })
  map.on("movestart", () => window.clearTimeout(settleTimer))
  map.on("moveend", () => {
    if (destroyed) {
      return
    }
    options.onCameraMoveEnd()
    // Settled views only: once per gesture, never per frame.
    window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      if (!destroyed && !map.isMoving()) {
        reportViewport()
      }
    }, SETTLE_MS)
  })
  /*
   * A mouse drag released outside the canvas (over the trail popup, the
   * list, or the map's own controls) must still end. MapLibre's mouse pan
   * ends only on a `mouseup` delivered to its canvas container; a release
   * elsewhere leaves the drag open until a later mouse move, so no
   * `moveend`, and no settled view, follows. Hand the release to the
   * container so the library ends the drag on its usual path (inertia,
   * `moveend`, then the settle timer above). Non-bubbling, so nothing
   * else sees it.
   */
  const canvasContainer = map.getCanvasContainer()
  const endDragReleasedOutside = (event: MouseEvent) => {
    if (
      destroyed ||
      !map.dragPan.isActive() ||
      (event.target instanceof Node && canvasContainer.contains(event.target))
    ) {
      return
    }
    canvasContainer.dispatchEvent(
      new MouseEvent("mouseup", {
        button: event.button,
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    )
  }
  document.addEventListener("mouseup", endDragReleasedOutside, true)

  map.on("resize", placeLabel)
  map.on("cooperativegestureprevented", (event) => {
    if (!destroyed) {
      options.onGestureBlocked(
        event.gestureType === "touch_pan" ? "touch" : "wheel",
      )
    }
  })

  map.on("click", (event) => {
    if (destroyed || !layersReady) {
      return
    }
    const hit = hitAt(event.point)
    if (hit?.kind === "trail") {
      options.onSelect(hit.id)
    } else if (hit?.kind === "cluster") {
      expandCluster(hit)
    }
  })
  map.on("mousemove", (event) => {
    if (destroyed || !layersReady) {
      return
    }
    const hit = hitAt(event.point)
    map.getCanvas().style.cursor = hit === null ? "" : "pointer"
    setPointerHover(hit?.kind === "trail" ? hit.id : null)
  })
  map.on("mouseout", () => {
    if (destroyed) {
      return
    }
    map.getCanvas().style.cursor = ""
    setPointerHover(null)
  })

  function reportZoomLimits() {
    const zoom = map.getZoom()
    options.onZoomLimits({
      atMin: zoom <= MIN_ZOOM + 1e-6,
      atMax: zoom >= MAX_ZOOM - 1e-6,
    })
  }

  function viewport(): MapViewport {
    const bounds = map.getBounds()
    const center = map.getCenter()
    return {
      center: { lng: center.lng, lat: center.lat },
      bounds: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    }
  }

  function reportViewport() {
    if (!destroyed) {
      options.onViewportSettled(viewport())
    }
  }

  /**
   * What a pointer at `point` is on: the nearest trail point within the
   * 32px target (44px coarse), else a cluster under it or within the target.
   */
  function hitAt(point: { x: number; y: number }): Hit | null {
    const r = coarsePointer() ? HIT_RADIUS_COARSE : HIT_RADIUS
    const box: [PointLike, PointLike] = [
      [point.x - r, point.y - r],
      [point.x + r, point.y + r],
    ]

    const nearest = (features: MapGeoJSONFeature[]) => {
      let best: { feature: MapGeoJSONFeature; distance: number } | null = null
      for (const feature of features) {
        if (feature.geometry.type !== "Point") {
          continue
        }
        const [lng, lat] = feature.geometry.coordinates
        const at = map.project([lng, lat])
        const distance = Math.hypot(at.x - point.x, at.y - point.y)
        if (best === null || distance < best.distance) {
          best = { feature, distance }
        }
      }
      return best?.feature ?? null
    }

    const trail = nearest(
      map.queryRenderedFeatures(box, {
        layers: [FOCUS_DISC_LAYER, POINT_LAYER],
      }),
    )
    const trailId = trail?.properties.id
    if (typeof trailId === "string") {
      return { kind: "trail", id: trailId }
    }

    const clusterLayers = { layers: [CLUSTER_LAYER, CLUSTER_HALO_LAYER] }
    const cluster =
      nearest(map.queryRenderedFeatures([point.x, point.y], clusterLayers)) ??
      nearest(map.queryRenderedFeatures(box, clusterLayers))
    const clusterId = cluster?.properties.cluster_id
    if (
      cluster !== null &&
      typeof clusterId === "number" &&
      cluster.geometry.type === "Point"
    ) {
      const [lng, lat] = cluster.geometry.coordinates
      return { kind: "cluster", clusterId, lng, lat }
    }
    return null
  }

  /** A cluster eases to the zoom at which it splits (instant if reduced). */
  function expandCluster(hit: Extract<Hit, { kind: "cluster" }>) {
    const source = map.getSource<GeoJSONSource>(TRAILS_SOURCE)
    if (source === undefined) {
      return
    }
    source.getClusterExpansionZoom(hit.clusterId).then(
      (zoom) => {
        if (destroyed) {
          return
        }
        map.easeTo({
          center: [hit.lng, hit.lat],
          zoom: Math.min(zoom, MAX_ZOOM),
          ...(reducedMotion() ? { duration: 0 } : {}),
        })
      },
      () => {},
    )
  }

  function setPointerHover(trailId: string | null) {
    if (trailId === pointerHoverId) {
      return
    }
    pointerHoverId = trailId
    renderFocus()
    options.onHover(trailId)
  }

  /** The one trail whose hover state shows: the pointer's, else the list's. */
  function hoveredId(): string | null {
    const id = pointerHoverId ?? highlightedId
    return id !== null && id !== selectedId && trails.has(id) ? id : null
  }

  function trailById(id: string | null): MapTrail | null {
    return id === null ? null : (trails.get(id) ?? null)
  }

  /** The focus source: the hovered point, then the selected point on top. */
  function renderFocus() {
    if (!layersReady) {
      return
    }
    const hoveredTrail = trailById(hoveredId())
    const selectedTrail = trailById(selectedId)
    const focus: { trail: MapTrail; state: "hover" | "selected" }[] = []
    if (hoveredTrail !== null) {
      focus.push({ trail: hoveredTrail, state: "hover" })
    }
    if (selectedTrail !== null) {
      focus.push({ trail: selectedTrail, state: "selected" })
    }

    const key = focus
      .map(
        ({ trail, state }) =>
          `${trail.id}:${state}:${trail.level}:${trail.lng},${trail.lat}`,
      )
      .join("|")
    if (key !== focusKey) {
      focusKey = key
      const ids = focus.map(({ trail }) => trail.id)
      map.setFilter(POINT_LAYER, pointFilter(ids))
      map.setFilter(POINT_DOT_LAYER, pointDotFilter(ids))
      void map
        .getSource<GeoJSONSource>(FOCUS_SOURCE)
        ?.setData(
          featureCollection(
            focus.map(({ trail, state }) => ({
              lng: trail.lng,
              lat: trail.lat,
              properties: { id: trail.id, level: trail.level, state },
            })),
          ),
        )
    }
    placeLabel()
  }

  /**
   * The hovered point's name, to its right, or to its left near the map's
   * right edge. The selected point has none: its popup names the trail.
   */
  function placeLabel() {
    const trail = trailById(hoveredId())
    if (trail === null) {
      label.hidden = true
      return
    }
    if (label.textContent !== trail.name) {
      label.textContent = trail.name
    }
    label.hidden = false
    label.dataset.level = trail.level

    const point = map.project([trail.lng, trail.lat])
    const reach = (trail.level === "many" ? 12 : 10) + LABEL_GAP
    const width = map.getContainer().clientWidth
    const side =
      point.x + reach + label.offsetWidth > width - LABEL_EDGE_MARGIN
        ? "start"
        : "end"
    label.dataset.side = side
    label.style.left = `${point.x}px`
    label.style.top = `${point.y}px`
  }

  const handle: TrailMapHandle = {
    setTrails(next) {
      trails.clear()
      for (const trail of next) {
        trails.set(trail.id, trail)
      }
      if (!layersReady) {
        return
      }
      void map.getSource<GeoJSONSource>(TRAILS_SOURCE)?.setData(
        featureCollection(
          next.map((trail) => ({
            lng: trail.lng,
            lat: trail.lat,
            properties: { id: trail.id, name: trail.name, level: trail.level },
          })),
        ),
      )
      if (pointerHoverId !== null && !trails.has(pointerHoverId)) {
        setPointerHover(null)
      }
      renderFocus()
    },

    setSelected(trailId) {
      selectedId = trailId
      renderFocus()
    },

    setHighlighted(trailId) {
      highlightedId = trailId
      renderFocus()
    },

    projectLngLat(lng, lat) {
      const point = map.project([lng, lat])
      return { x: point.x, y: point.y }
    },

    getViewport() {
      return destroyed ? null : viewport()
    },

    panBy(dx, dy, animate) {
      // At the current zoom: the camera never zooms by itself.
      if (animate && !reducedMotion()) {
        map.panBy([dx, dy], { duration: PAN_DURATION_MS, easing: easeUi })
      } else {
        map.panBy([dx, dy], { animate: false })
      }
    },

    centerOn(lng, lat) {
      map.jumpTo({ center: [lng, lat] })
    },

    focusOn(lng, lat, minZoom) {
      // Never zooms out: a closer view the visitor chose is kept.
      const zoom = Math.min(Math.max(map.getZoom(), minZoom), MAX_ZOOM)
      if (reducedMotion()) {
        map.jumpTo({ center: [lng, lat], zoom })
        return "instant"
      }
      map.easeTo({
        center: [lng, lat],
        zoom,
        duration: FOCUS_DURATION_MS,
        easing: easeUi,
      })
      return "animated"
    },

    getZoom() {
      return map.getZoom()
    },

    zoomIn() {
      map.zoomIn(reducedMotion() ? { duration: 0 } : undefined)
    },

    zoomOut() {
      map.zoomOut(reducedMotion() ? { duration: 0 } : undefined)
    },

    destroy() {
      destroyed = true
      window.clearTimeout(settleTimer)
      document.removeEventListener("mouseup", endDragReleasedOutside, true)
      trails.clear()
      label.remove()
      map.remove()
    },
  }

  return handle
}

/** For a map that never started: every call does nothing. */
function inertHandle(): TrailMapHandle {
  const nothing = () => {}
  return {
    setTrails: nothing,
    setSelected: nothing,
    setHighlighted: nothing,
    projectLngLat: () => ({ x: 0, y: 0 }),
    getViewport: () => null,
    panBy: nothing,
    centerOn: nothing,
    focusOn: () => "none",
    getZoom: () => MIN_ZOOM,
    zoomIn: nothing,
    zoomOut: nothing,
    destroy: nothing,
  }
}

/**
 * A CSS cubic-bezier timing function as `t -> progress`, solved for x by a
 * few Newton steps with a bisection fallback.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (x: number): number => {
    if (x <= 0) {
      return 0
    }
    if (x >= 1) {
      return 1
    }

    let t = x
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) {
        return sampleY(t)
      }
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) {
        break
      }
      t -= error / slope
    }

    let low = 0
    let high = 1
    t = x
    while (high - low > 1e-6) {
      if (sampleX(t) < x) {
        low = t
      } else {
        high = t
      }
      t = (low + high) / 2
    }
    return sampleY(t)
  }
}

export default createTrailMap
