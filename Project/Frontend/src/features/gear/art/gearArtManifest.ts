import {
  Backpack,
  CloudRain,
  Flashlight,
  Footprints,
  GlassWater,
  HikingStick,
  Package,
  Sandwich,
  Shirt,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react"
import { isGearCategory, type GearCategory } from "../types/gear"

/**
 * The one place that says what art a category has (FEATURE-007 sections 14,
 * 21.6). Cards, the detail panel, and the Add Gear tiles all read it.
 *
 * Two tiers. Today every entry is the interim tier: a `lucide-react` line
 * pictogram drawn on the slot plate, and `src` is null. The final tier is a
 * static 1:1 WebP under `/media/gear/categories/` (section 14.3); giving an
 * entry its `src` is the whole change, because both tiers draw into the same
 * art box. The pictogram stays as the fallback if an image fails to load.
 */
export type GearArt = {
  /** Interim art, and the fallback for the final art. */
  pictogram: LucideIcon
  /** Final art: a same-origin path, or null while it does not exist. */
  src: string | null
}

const CATEGORY_ART: Readonly<Record<GearCategory, GearArt>> = {
  BACKPACK: { pictogram: Backpack, src: null },
  RAIN_GEAR: { pictogram: CloudRain, src: null },
  WARM_LAYER: { pictogram: Shirt, src: null },
  WIND_LAYER: { pictogram: Wind, src: null },
  FOOTWEAR: { pictogram: Footprints, src: null },
  TRACTION: { pictogram: Snowflake, src: null },
  TREKKING_POLES: { pictogram: HikingStick, src: null },
  HEADLAMP: { pictogram: Flashlight, src: null },
  WATER: { pictogram: GlassWater, src: null },
  FOOD: { pictogram: Sandwich, src: null },
  SUN_PROTECTION: { pictogram: Sun, src: null },
}

/**
 * No category, or one this frontend does not know: a neutral "an item".
 * Not `circle-dashed`, which means Missing in the Studio (section 21.6).
 */
const NEUTRAL_ART: GearArt = { pictogram: Package, src: null }

export function gearArtFor(category: string | null): GearArt {
  return isGearCategory(category) ? CATEGORY_ART[category] : NEUTRAL_ART
}
