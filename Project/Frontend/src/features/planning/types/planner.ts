/**
 * Contract of `POST /api/planner/turn` (FEATURE-003 section 4) and the
 * planner's own conversation types (section 6).
 *
 * Enum values are the backend's wire values. They are mapped to labels only
 * where they are displayed (`../presentation.ts`).
 */

export type TrailDifficulty = "EASY" | "MODERATE" | "HARD"

export type SceneryType =
  | "LAKE"
  | "VIEWPOINT"
  | "WATERFALL"
  | "FOREST"
  | "MOUNTAIN"
  | "OCEAN"

/**
 * The backend's structured planning state. The frontend stores the latest
 * copy and sends it back unmodified; it never builds or edits one.
 */
export type PlanningContext = {
  difficulty: TrailDifficulty | null
  maxDistanceKm: number | null
  maxElevationGainM: number | null
  maxDurationMin: number | null
  preferredScenery: SceneryType[]
}

export type PlannerTurnStatus = "NEEDS_CLARIFICATION" | "READY_TO_RECOMMEND"

/** `radiusKm` exists in the contract and is not sent by this feature. */
export type PlannerTurnRequest = {
  message: string
  context: PlanningContext | null
  latitude: number
  longitude: number
  /** Local calendar date, `YYYY-MM-DD`. */
  tripDate: string
}

/** Every field can be null on the wire. */
export type TrailSummaryResponse = {
  id: string | null
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  latitude: number | null
  longitude: number | null
  source: string | null
  scenery: string[] | null
  coverImageUrl: string | null
  baselineGearRequirements: string[] | null
}

export type ScoreBreakdownResponse = {
  intent: number | null
  weather: number | null
  gear: number | null
  scenery: number | null
  proximity: number | null
}

export type ScoredTrailRecommendation = {
  trail: TrailSummaryResponse | null
  score: number | null
  breakdown: ScoreBreakdownResponse | null
}

export type PlannerTurnResponse = {
  status: PlannerTurnStatus
  assistantMessage: string
  context: PlanningContext
  recommendations: ScoredTrailRecommendation[]
}

/* ------------------------------------------------------------------ *
 * What the planner keeps and shows
 * ------------------------------------------------------------------ */

export type ScoreBreakdown = {
  intent: number | null
  weather: number | null
  gear: number | null
  scenery: number | null
  proximity: number | null
}

/**
 * One recommendation as the conversation holds it: only the fields this
 * feature shows (section 4.4), each either a checked value or null. Wire
 * values stay as they arrived.
 */
export type TrailRecommendation = {
  /** Used as a list key only. */
  id: string | null
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  scenery: string[]
  score: number | null
  breakdown: ScoreBreakdown | null
}

/** A successful turn, checked and reduced to what the planner uses. */
export type PlannerTurnResult = {
  status: PlannerTurnStatus
  /** The backend's text, verbatim. */
  assistantMessage: string
  /** The backend's context, exactly as it arrived. */
  context: PlanningContext
  recommendations: TrailRecommendation[]
}

/** Why a turn failed, as far as the browser can tell (section 13.2). */
export type FailureKind =
  | "unavailable"
  | "timeout"
  | "not-accepted"
  | "invalid-request"
  | "sign-in"
  /** In flight when the page was reloaded. */
  | "interrupted"

export type StartingPointKind = "device" | "vancouver"

/** Where the trip starts. Coordinates are sent, never displayed. */
export type StartingPoint = {
  kind: StartingPointKind
  latitude: number
  longitude: number
}

export type UserChatMessage = {
  id: string
  role: "user"
  text: string
  delivery: "sending" | "sent" | "failed"
  /**
   * Set while a failed message can still be acted on. Null on a message that
   * is not failed, and on a failed one the user has moved past (superseded).
   */
  failure: FailureKind | null
}

export type AssistantChatMessage = {
  id: string
  role: "assistant"
  /** `assistantMessage`, verbatim. */
  text: string
  status: PlannerTurnStatus
  recommendations: TrailRecommendation[]
  /** What this turn was sent with. */
  usedTripDate: string
  usedStartingPoint: StartingPointKind
}

export type ChatMessage = UserChatMessage | AssistantChatMessage

/** Everything the planner keeps for the life of the tab (section 16). */
export type PlannerSession = {
  messages: ChatMessage[]
  /** The latest context the backend returned; null before the first reply. */
  context: PlanningContext | null
  /** Local calendar date, `YYYY-MM-DD`; null until the user chooses one. */
  tripDate: string | null
  startingPoint: StartingPoint | null
  /** Unsent composer text. */
  draft: string
  /** The draft is the request typed on the Public Landing, not yet sent. */
  draftFromLanding: boolean
}
