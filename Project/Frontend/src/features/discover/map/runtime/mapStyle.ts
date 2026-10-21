import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl"

/**
 * The "paper trail map" (FEATURE-006 sections 13, 16.7.1, 16.18): a local
 * style over OpenFreeMap's OpenMapTiles vector tiles, derived from the layer
 * set of OpenFreeMap's light "Positron" style and recoloured with the map
 * palette. The tiles, their TileJSON, and the glyphs stay at OpenFreeMap;
 * nothing of them is bundled. There is no sprite: every icon and POI layer
 * is removed, so none is needed.
 *
 * Tiles are decoration. They carry nothing the product relies on.
 */

/** The map palette of section 16.18. */
const MAP = {
  land: "#ECE8DD",
  wood: "#D3DDCB",
  park: "#DDE3D2",
  grass: "#E3E6D6",
  ice: "#F6F7F4",
  water: "#B9CBD3",
  waterway: "#9FB6C0",
  road: "#FBFAF6",
  roadCasing: "#D2CCBF",
  boundary: "#A9A396",
  building: "#E2DDD1",
  /** `stone` */
  label: "#55615D",
  labelWater: "#4A6670",
  /** `paper` */
  labelHalo: "#F7F5EF",
} as const

const SOURCE = "openmaptiles"

const FONT_REGULAR = ["Noto Sans Regular"]
const FONT_ITALIC = ["Noto Sans Italic"]

/** The English name where the tiles have one, else the local name. */
const NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name"],
]

const POLYGON: FilterSpecification = [
  "match",
  ["geometry-type"],
  ["Polygon", "MultiPolygon"],
  true,
  false,
]

const LINE: FilterSpecification = [
  "match",
  ["geometry-type"],
  ["LineString", "MultiLineString"],
  true,
  false,
]

const POINT: FilterSpecification = [
  "match",
  ["geometry-type"],
  ["Point", "MultiPoint"],
  true,
  false,
]

/** Road classes of section 16.7.1: the major ones at every zoom. */
const MAJOR_ROADS = ["motorway", "trunk", "primary"]
/** Secondary and below, from zoom 10. */
const MINOR_ROADS = ["secondary", "tertiary", "minor", "service", "track"]

function roadFilter(classes: string[]): FilterSpecification {
  return [
    "all",
    LINE,
    ["match", ["get", "class"], classes, true, false],
  ] as FilterSpecification
}

/** Road widths by zoom: the fill, then its casing a pixel wider each side. */
function roadWidth(stops: number[]): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 1.4],
    ["zoom"],
    ...stops,
  ] as ExpressionSpecification
}

const MAJOR_WIDTH = roadWidth([6, 0.8, 10, 2, 16, 12])
const MAJOR_CASING_WIDTH = roadWidth([6, 2.8, 10, 4, 16, 14])
const MINOR_WIDTH = roadWidth([10, 0.6, 16, 7])
const MINOR_CASING_WIDTH = roadWidth([10, 2.6, 16, 9])

const PLACE_LABEL_PAINT = {
  "text-color": MAP.label,
  "text-halo-color": MAP.labelHalo,
  "text-halo-width": 1.5,
}

const layers: LayerSpecification[] = [
  {
    id: "land",
    type: "background",
    paint: { "background-color": MAP.land },
  },
  {
    id: "landcover-grass",
    type: "fill",
    source: SOURCE,
    "source-layer": "landcover",
    filter: ["all", POLYGON, ["==", ["get", "class"], "grass"]],
    paint: { "fill-color": MAP.grass },
  },
  {
    id: "landcover-wood",
    type: "fill",
    source: SOURCE,
    "source-layer": "landcover",
    filter: ["all", POLYGON, ["==", ["get", "class"], "wood"]],
    paint: { "fill-color": MAP.wood },
  },
  {
    id: "park",
    type: "fill",
    source: SOURCE,
    "source-layer": "park",
    filter: POLYGON,
    paint: { "fill-color": MAP.park, "fill-opacity": 0.8 },
  },
  {
    id: "landcover-ice",
    type: "fill",
    source: SOURCE,
    "source-layer": "landcover",
    filter: ["all", POLYGON, ["==", ["get", "class"], "ice"]],
    paint: { "fill-color": MAP.ice },
  },
  {
    id: "water",
    type: "fill",
    source: SOURCE,
    "source-layer": "water",
    filter: ["all", POLYGON, ["!=", ["get", "brunnel"], "tunnel"]],
    paint: { "fill-color": MAP.water },
  },
  {
    id: "waterway",
    type: "line",
    source: SOURCE,
    "source-layer": "waterway",
    filter: ["all", LINE, ["!=", ["get", "brunnel"], "tunnel"]],
    paint: {
      "line-color": MAP.waterway,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 16, 2],
    },
  },
  {
    id: "building",
    type: "fill",
    source: SOURCE,
    "source-layer": "building",
    minzoom: 15,
    paint: { "fill-color": MAP.building },
  },
  {
    id: "boundary",
    type: "line",
    source: SOURCE,
    "source-layer": "boundary",
    filter: [
      "all",
      // A feature without a level is not drawn, as before, without a type
      // error: a missing level counts as above 4.
      ["<=", ["coalesce", ["get", "admin_level"], 99], 4],
      ["!=", ["get", "maritime"], 1],
    ],
    paint: {
      "line-color": MAP.boundary,
      "line-width": 1,
      "line-dasharray": [3, 2],
    },
  },
  {
    id: "road-minor-casing",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    minzoom: 10,
    filter: roadFilter(MINOR_ROADS),
    layout: { "line-join": "round" },
    paint: { "line-color": MAP.roadCasing, "line-width": MINOR_CASING_WIDTH },
  },
  {
    id: "road-major-casing",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    filter: roadFilter(MAJOR_ROADS),
    layout: { "line-join": "round" },
    paint: { "line-color": MAP.roadCasing, "line-width": MAJOR_CASING_WIDTH },
  },
  {
    id: "road-minor",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    minzoom: 10,
    filter: roadFilter(MINOR_ROADS),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": MAP.road, "line-width": MINOR_WIDTH },
  },
  {
    id: "road-major",
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    filter: roadFilter(MAJOR_ROADS),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": MAP.road, "line-width": MAJOR_WIDTH },
  },
  {
    id: "water-name-line",
    type: "symbol",
    source: SOURCE,
    "source-layer": "water_name",
    filter: LINE,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 350,
      "text-field": NAME,
      "text-font": FONT_ITALIC,
      "text-size": 13,
      "text-letter-spacing": 0.1,
    },
    paint: {
      "text-color": MAP.labelWater,
      "text-halo-color": MAP.labelHalo,
      "text-halo-width": 1.5,
    },
  },
  {
    id: "water-name-point",
    type: "symbol",
    source: SOURCE,
    "source-layer": "water_name",
    filter: POINT,
    layout: {
      "text-field": NAME,
      "text-font": FONT_ITALIC,
      "text-size": 13,
      "text-max-width": 6,
      "text-letter-spacing": 0.1,
    },
    paint: {
      "text-color": MAP.labelWater,
      "text-halo-color": MAP.labelHalo,
      "text-halo-width": 1.5,
    },
  },
  {
    id: "park-name",
    type: "symbol",
    source: SOURCE,
    "source-layer": "park",
    minzoom: 10,
    filter: POINT,
    layout: {
      "text-field": NAME,
      "text-font": FONT_REGULAR,
      "text-size": 12,
      "text-max-width": 8,
    },
    paint: PLACE_LABEL_PAINT,
  },
  {
    id: "peak-name",
    type: "symbol",
    source: SOURCE,
    "source-layer": "mountain_peak",
    minzoom: 11,
    filter: ["all", POINT, ["==", ["get", "class"], "peak"]],
    layout: {
      "text-field": NAME,
      "text-font": FONT_ITALIC,
      "text-size": 12,
      "text-max-width": 8,
    },
    paint: PLACE_LABEL_PAINT,
  },
  {
    id: "place-village",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    minzoom: 9,
    filter: ["==", ["get", "class"], "village"],
    layout: {
      "text-field": NAME,
      "text-font": FONT_REGULAR,
      "text-size": 12,
      "text-max-width": 8,
    },
    paint: PLACE_LABEL_PAINT,
  },
  {
    id: "place-town",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    minzoom: 7,
    filter: ["==", ["get", "class"], "town"],
    layout: {
      "text-field": NAME,
      "text-font": FONT_REGULAR,
      "text-size": ["interpolate", ["linear"], ["zoom"], 7, 12, 12, 14],
      "text-max-width": 8,
    },
    paint: PLACE_LABEL_PAINT,
  },
  {
    id: "place-city",
    type: "symbol",
    source: SOURCE,
    "source-layer": "place",
    filter: ["==", ["get", "class"], "city"],
    layout: {
      "text-field": NAME,
      "text-font": FONT_REGULAR,
      "text-size": ["interpolate", ["linear"], ["zoom"], 6, 13, 12, 17],
      "text-max-width": 8,
    },
    paint: PLACE_LABEL_PAINT,
  },
]

export const trailMapStyle: StyleSpecification = {
  version: 8,
  name: "Outdoor Trip Companion paper trail map",
  sources: {
    [SOURCE]: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers,
}
