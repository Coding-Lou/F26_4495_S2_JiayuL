import { sceneryLabels } from "@/features/planning/presentation"

/**
 * How the Trail Detail popup turns trail values into text (FEATURE-006
 * section 16.9.3). Nothing is invented for a missing value: each function
 * returns null, or an empty list, and the popup leaves the part out.
 */

/** The `SceneryType` order (FRONTEND_CONTEXT section 5). */
const SCENERY_ORDER = [
  "LAKE",
  "VIEWPOINT",
  "WATERFALL",
  "FOREST",
  "MOUNTAIN",
  "OCEAN",
] as const

/** Known scenery values as labels, in `SceneryType` order; unknown dropped. */
export function orderedSceneryLabels(values: readonly string[]): string[] {
  const known = values
    .map((value) => SCENERY_ORDER.indexOf(value as (typeof SCENERY_ORDER)[number]))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
    .map((index) => SCENERY_ORDER[index])
  return sceneryLabels(known)
}

const metres = new Intl.NumberFormat("en-US")

/** "650 m": an integer with locale grouping (16.9.2). */
export function formatElevation(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return null
  }
  return `${metres.format(Math.round(value))} m`
}

/** At most this many characters of a description are shown (16.9.3). */
const DESCRIPTION_LIMIT = 160
/** A sentence must end after this character to be a cut point. */
const SENTENCE_MIN = 60
const SENTENCE_ENDS = [". ", "! ", "? "] as const

/**
 * The description, shortened in the text itself so that sighted and
 * screen-reader users get the same words (16.9.3): whole when it is 160
 * characters or fewer; else cut after the last sentence end at or before
 * character 160; else, when no sentence ends after character 60, cut at the
 * last word boundary before character 160 with "…" added. Null when blank.
 */
export function shortDescription(description: string | null): string | null {
  const text = description?.trim() ?? ""
  if (text === "") {
    return null
  }
  if (text.length <= DESCRIPTION_LIMIT) {
    return text
  }

  // The punctuation of a sentence end at index i is character i + 1.
  let sentenceEnd = -1
  for (const end of SENTENCE_ENDS) {
    const index = text.lastIndexOf(end, DESCRIPTION_LIMIT - 1)
    if (index > sentenceEnd) {
      sentenceEnd = index
    }
  }
  if (sentenceEnd + 1 > SENTENCE_MIN) {
    return text.slice(0, sentenceEnd + 1)
  }

  const space = text.lastIndexOf(" ", DESCRIPTION_LIMIT - 1)
  const cut = space > 0 ? text.slice(0, space) : text.slice(0, DESCRIPTION_LIMIT - 1)
  return `${cut.trimEnd()}…`
}
