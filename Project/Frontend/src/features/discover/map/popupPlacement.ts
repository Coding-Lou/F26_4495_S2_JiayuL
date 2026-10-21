import type { MapPoint } from "./mapTypes"

/**
 * Where the Trail Detail popup goes over the map (FEATURE-006 section
 * 16.10): pure arithmetic in map-region px, with no DOM and no map library.
 * The shell measures, calls these, and writes the result.
 */

/** A box in map-region px. */
export type Box = { left: number; top: number; right: number; bottom: number }

export type PlacementFrame = {
  /** The map region's size, W × H. */
  width: number
  height: number
  /** The inset P of 16.3.2. */
  inset: number
  /** The zoom group's box grown by 8px (Z), when the controls are shown. */
  zoom: Box | null
  /** The attribution's box grown by 8px (A), when it is shown. */
  attribution: Box | null
}

export type PopupSize = { width: number; height: number }

export type Side = "right" | "left"

export type Placement = {
  /** The popup's top-left corner, in map-region px. */
  x: number
  y: number
  /** The side of the marker it stands on; null when docked. */
  side: Side | null
  /** The tip's centre, from the popup's top; null when the tip is hidden. */
  tipY: number | null
}

/** The selected marker's 19px radius, a 6px gap, and the 6px tip. */
export const MARKER_GAP = 31
const MARKER_RADIUS = 19
/** The tip is hidden within this distance of the popup's top or bottom. */
const TIP_EDGE = 16

function overlapsX(left: number, right: number, box: Box | null): boolean {
  return box !== null && left < box.right && right > box.left
}

function inside(point: MapPoint, box: Box | null): boolean {
  return (
    box !== null &&
    point.x >= box.left &&
    point.x <= box.right &&
    point.y >= box.top &&
    point.y <= box.bottom
  )
}

/**
 * The safe area's top and bottom limits for a popup spanning [x, x + w]:
 * [P, H − P], with Z's bottom as the top limit where the span overlaps Z,
 * and A's top as the bottom limit where it overlaps A.
 */
function verticalLimits(frame: PlacementFrame, x: number, w: number) {
  let lo = frame.inset
  let hi = frame.height - frame.inset
  if (overlapsX(x, x + w, frame.zoom) && frame.zoom !== null) {
    lo = Math.max(lo, frame.zoom.bottom)
  }
  if (overlapsX(x, x + w, frame.attribution) && frame.attribution !== null) {
    hi = Math.min(hi, frame.attribution.top)
  }
  return { lo, hi }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Rule 1.1: inside the inset area by the marker's radius, and not in Z or A. */
export function isPlaceable(frame: PlacementFrame, m: MapPoint): boolean {
  return (
    isPlaceableVertically(frame, m) &&
    m.x >= frame.inset + MARKER_RADIUS &&
    m.x <= frame.width - frame.inset - MARKER_RADIUS &&
    !inside(m, frame.zoom) &&
    !inside(m, frame.attribution)
  )
}

function isPlaceableVertically(frame: PlacementFrame, m: MapPoint): boolean {
  return (
    m.y >= frame.inset + MARKER_RADIUS &&
    m.y <= frame.height - frame.inset - MARKER_RADIUS
  )
}

/** The tip at the marker's y, or hidden near the popup's top or bottom. */
function tipFor(m: MapPoint, y: number, h: number): number | null {
  const tipY = m.y - y
  return tipY < TIP_EDGE || tipY > h - TIP_EDGE ? null : tipY
}

/** One side of Rule 1, or null when the popup does not fit there. */
function onSide(
  frame: PlacementFrame,
  m: MapPoint,
  size: PopupSize,
  side: Side,
): Placement | null {
  const { width: w, height: h } = size
  const x = side === "right" ? m.x + MARKER_GAP : m.x - MARKER_GAP - w

  const fitsX =
    side === "right" ? x + w <= frame.width - frame.inset : x >= frame.inset
  if (!fitsX) {
    return null
  }

  const { lo, hi } = verticalLimits(frame, x, w)
  if (hi - lo < h) {
    return null
  }

  const y = clamp(m.y - h / 2, lo, hi - h)
  return { x, y, side, tipY: tipFor(m, y, h) }
}

/**
 * Rule 1, anchored placement: right of the marker, else left. Null when the
 * marker is not placeable or neither side fits.
 */
export function placeAnchored(
  frame: PlacementFrame,
  m: MapPoint,
  size: PopupSize,
): Placement | null {
  if (!isPlaceable(frame, m)) {
    return null
  }
  return (
    onSide(frame, m, size, "right") ?? onSide(frame, m, size, "left") ?? null
  )
}

/**
 * Rule 2, making room: the point the marker should be panned to so that the
 * marker and a right-hand popup sit centred as a pair, and the popup's
 * placement there. Null when the popup cannot fit even there (then Rule 4).
 */
export function placeAfterPan(
  frame: PlacementFrame,
  m: MapPoint,
  size: PopupSize,
): { target: MapPoint; placement: Placement } | null {
  const target: MapPoint = {
    x:
      frame.inset +
      (frame.width - 2 * frame.inset - (MARKER_GAP + size.width)) / 2,
    y: isPlaceableVertically(frame, m) ? m.y : frame.height / 2,
  }
  if (!isPlaceable(frame, target)) {
    return null
  }
  const placement = onSide(frame, target, size, "right")
  return placement === null ? null : { target, placement }
}

/**
 * Rule 3, following: the popup keeps its side and is placed from the marker,
 * then clamped into the safe area. The tip shows only while the popup still
 * stands right beside a placeable marker.
 */
export function placeFollowing(
  frame: PlacementFrame,
  m: MapPoint,
  size: PopupSize,
  side: Side,
): Placement {
  const { width: w, height: h } = size
  const sideX = side === "right" ? m.x + MARKER_GAP : m.x - MARKER_GAP - w
  const x = clamp(sideX, frame.inset, Math.max(frame.inset, frame.width - frame.inset - w))

  const { lo, hi } = verticalLimits(frame, x, w)
  const y = clamp(m.y - h / 2, lo, Math.max(lo, hi - h))

  const besideMarker = x === sideX && isPlaceable(frame, m)
  return { x, y, side, tipY: besideMarker ? tipFor(m, y, h) : null }
}

/**
 * Rule 4, docked: the top-right corner of the safe area, below the zoom
 * controls when they are shown. No tip.
 */
export function placeDocked(frame: PlacementFrame, size: PopupSize): Placement {
  const x = Math.max(frame.inset, frame.width - frame.inset - size.width)
  const y =
    frame.zoom !== null ? Math.max(frame.inset, frame.zoom.bottom) : frame.inset
  return { x, y, side: null, tipY: null }
}
