import type { ActivityLevel } from "@/features/trails/activity"
import type { MapViewport } from "./viewport"

/**
 * The contract between the map's shell (`TrailMap`, no map library) and its
 * runtime (`runtime/`, the only code that imports `maplibre-gl`). The shell
 * loads the runtime with one dynamic `import()`; nothing here pulls the map
 * library into any other chunk.
 */

/**
 * One trail drawn on the map: a valid trailhead and its activity level. It
 * is a feature of a clustered GeoJSON source, not a DOM element.
 */
export type MapTrail = {
  id: string
  /** Shown in the point's hover label only; never a count. */
  name: string
  lng: number
  lat: number
  level: ActivityLevel
}

export type ZoomLimits = { atMin: boolean; atMax: boolean }

/**
 * How a camera move asked for by the product happens: over a few hundred
 * milliseconds, at once (reduced motion), or not at all (no map).
 */
export type FocusMove = "animated" | "instant" | "none"

/** A point in map-region px: (0, 0) is the map region's top-left corner. */
export type MapPoint = { x: number; y: number }

/** The kind of input cooperative gestures turned away (16.8.3). */
export type BlockedGesture = "wheel" | "touch"

export type TrailMapOptions = {
  container: HTMLElement
  /** The canvas's accessible name (DV12). */
  canvasLabel: string
  /** The fixed default region, south-west then north-east, as [lng, lat]. */
  bounds: [[number, number], [number, number]]
  /** Camera padding around the default region, in px (16.3.2). */
  padding: number
  /** The style and first view are drawn. */
  onReady: () => void
  /** The map cannot be shown (D7): it stays failed until a new attempt. */
  onFail: () => void
  /** A trail point was clicked or tapped (a cluster zooms in instead). */
  onSelect: (trailId: string) => void
  /** A fine pointer entered (id) or left (null) a trail point. */
  onHover: (trailId: string | null) => void
  onZoomLimits: (limits: ZoomLimits) => void
  /**
   * The camera moved, every frame of a movement. `byVisitor` is true when the
   * frame comes from the visitor's own input (drag, wheel, keys, touch).
   */
  onCameraMove: (byVisitor: boolean) => void
  /** A camera movement ended, or was interrupted. */
  onCameraMoveEnd: () => void
  /**
   * The view has settled: once when the map is first drawn, then about
   * 250 ms after a movement ends with no new movement in between. Never on
   * movement frames. Discover's nearby read follows this.
   */
  onViewportSettled: (viewport: MapViewport) => void
  /** A plain wheel or a one-finger drag was left to the page (16.3.3). */
  onGestureBlocked: (gesture: BlockedGesture) => void
}

export type TrailMapHandle = {
  /**
   * Replaces the clustered source's data with these trails (the whole
   * fetched set, not only the visible ones).
   */
  setTrails: (trails: MapTrail[]) => void
  /** Drawn as an individual point above any cluster. */
  setSelected: (trailId: string | null) => void
  /** The point whose list row is hovered or focused, or null. */
  setHighlighted: (trailId: string | null) => void
  /** A position's point now, in map-region px. */
  projectLngLat: (lng: number, lat: number) => MapPoint
  /** The current view, or null when the map cannot say. */
  getViewport: () => MapViewport | null
  /**
   * Pans at the current zoom so that the map's content moves by
   * (−dx, −dy): a point at m ends at m − (dx, dy). Never zooms (16.10).
   */
  panBy: (dx: number, dy: number, animate: boolean) => void
  /** Puts a position at the centre at the current zoom. */
  centerOn: (lng: number, lat: number) => void
  /**
   * Trail search: puts a position at the centre, zoomed in to at least
   * `minZoom` (never out). Eased, or a jump under reduced motion; says which.
   */
  focusOn: (lng: number, lat: number, minZoom: number) => FocusMove
  /** The current zoom. */
  getZoom: () => number
  zoomIn: () => void
  zoomOut: () => void
  destroy: () => void
}

export type CreateTrailMap = (options: TrailMapOptions) => TrailMapHandle
