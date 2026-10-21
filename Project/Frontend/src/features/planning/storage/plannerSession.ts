import { isRecord, readTrailRecommendation } from "../readRecommendation"
import { isIsoDate } from "../tripDate"
import type {
  AssistantChatMessage,
  ChatMessage,
  FailureKind,
  PlannerSession,
  PlanningContext,
  StartingPoint,
  TrailRecommendation,
  UserChatMessage,
} from "../types/planner"

/**
 * The planner's state for the life of the tab (FEATURE-003 section 16).
 *
 * One `sessionStorage` key, defined only here, holding one versioned JSON
 * value: who it belongs to, the conversation, the latest `PlanningContext`,
 * the trip date, the starting point, and the composer draft. Never
 * `localStorage`.
 *
 * The value belongs to one signed-in user. `owner` is that user's subject
 * identifier (the `sub` claim): an identifier kept for ownership only, never
 * shown. It is the one thing here that comes from authentication. No token,
 * no raw JWT, and no other claim is ever stored.
 *
 * What is read back is untrusted: a wrong version, a wrong shape, a value
 * that does not parse, a value with no owner, or a value owned by anyone but
 * the current user is discarded and removed, and the planner starts empty.
 * Nothing of a discarded value is carried over.
 */
const PLANNER_SESSION_STORAGE_KEY = "outdoor-trip-companion.planner"

/** 2: the value carries its owner. Every earlier value is discarded. */
const PLANNER_SESSION_VERSION = 2

type StoredPlannerSession = PlannerSession & {
  version: typeof PLANNER_SESSION_VERSION
  /** Subject identifier of the user this value belongs to. */
  owner: string
}

/** Downtown Vancouver: the fixed demo starting point (section 11.2, D5). */
export const VANCOUVER: StartingPoint = {
  kind: "vancouver",
  latitude: 49.2827,
  longitude: -123.1207,
}

export function emptyPlannerSession(
  startingPoint: StartingPoint | null = null,
): PlannerSession {
  return {
    messages: [],
    context: null,
    tripDate: null,
    startingPoint,
    draft: "",
    draftFromLanding: false,
  }
}

/**
 * Writes the session as `owner`'s. Returns false when storage is unavailable
 * or full; the planner then keeps working in memory and reports nothing.
 * There is no way to write a value without an owner.
 */
export function writePlannerSession(
  owner: string,
  session: PlannerSession,
): boolean {
  try {
    const stored: StoredPlannerSession = {
      version: PLANNER_SESSION_VERSION,
      owner,
      ...session,
    }
    window.sessionStorage.setItem(
      PLANNER_SESSION_STORAGE_KEY,
      JSON.stringify(stored),
    )
    return true
  } catch {
    return false
  }
}

export function clearPlannerSession(): void {
  try {
    window.sessionStorage.removeItem(PLANNER_SESSION_STORAGE_KEY)
  } catch {
    // Nothing was stored that could be read back.
  }
}

/**
 * The session stored for `owner`, or null when there is none, it cannot be
 * trusted, or it is not theirs. A value that is not returned is removed.
 *
 * A turn that was in flight when the page went away comes back as a message
 * that was not sent (section 13.2).
 */
export function readPlannerSession(owner: string): PlannerSession | null {
  let raw: string | null
  try {
    raw = window.sessionStorage.getItem(PLANNER_SESSION_STORAGE_KEY)
  } catch {
    return null
  }

  if (raw === null) {
    return null
  }

  let session: PlannerSession | null
  try {
    session = readStoredSession(JSON.parse(raw), owner)
  } catch {
    session = null
  }

  if (session === null) {
    clearPlannerSession()
  }
  return session
}

function readStoredSession(value: unknown, owner: string): PlannerSession | null {
  if (!isRecord(value) || value.version !== PLANNER_SESSION_VERSION) {
    return null
  }
  // Someone else's, or no one's: not restored, in whole or in part.
  if (typeof value.owner !== "string" || value.owner !== owner) {
    return null
  }

  const { messages, context, tripDate, startingPoint, draft, draftFromLanding } =
    value

  if (!Array.isArray(messages)) {
    return null
  }
  if (context !== null && !isRecord(context)) {
    return null
  }
  if (tripDate !== null && !isIsoDate(tripDate)) {
    return null
  }
  if (typeof draft !== "string" || typeof draftFromLanding !== "boolean") {
    return null
  }

  const readPoint = startingPoint === null ? null : readStartingPoint(startingPoint)
  if (startingPoint !== null && readPoint === null) {
    return null
  }

  const readMessages: ChatMessage[] = []
  for (const item of messages) {
    const message = readMessage(item)
    if (message === null) {
      return null
    }
    readMessages.push(message)
  }

  return {
    messages: settleMessages(readMessages),
    // Opaque to the frontend: stored as it arrived, returned as it was stored.
    // A context from before `openPreferences` and `lastAsked` existed is
    // restored without them and sent as it is; the backend fills them in.
    context: context as PlanningContext | null,
    tripDate,
    startingPoint: readPoint,
    draft,
    draftFromLanding,
  }
}

function readStartingPoint(value: unknown): StartingPoint | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.kind === "vancouver") {
    // The fixed coordinates, whatever was stored beside the label.
    return VANCOUVER
  }

  const { latitude, longitude } = value
  if (
    value.kind === "device" &&
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  ) {
    return { kind: "device", latitude, longitude }
  }

  return null
}

const FAILURE_KINDS: ReadonlySet<string> = new Set<FailureKind>([
  "unavailable",
  "timeout",
  "not-accepted",
  "invalid-request",
  "sign-in",
  "interrupted",
])

function readMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null
  }
  if (typeof value.text !== "string") {
    return null
  }

  if (value.role === "user") {
    return readUserMessage(value, value.id, value.text)
  }
  if (value.role === "assistant") {
    return readAssistantMessage(value, value.id, value.text)
  }
  return null
}

function readUserMessage(
  value: Record<string, unknown>,
  id: string,
  text: string,
): UserChatMessage | null {
  const { delivery, failure } = value

  if (delivery === "sent") {
    return { id, role: "user", text, delivery, failure: null }
  }
  if (delivery === "sending") {
    // It had not been answered when the page went away.
    return { id, role: "user", text, delivery: "failed", failure: "interrupted" }
  }
  if (delivery === "failed") {
    if (failure === null) {
      return { id, role: "user", text, delivery, failure: null }
    }
    if (typeof failure === "string" && FAILURE_KINDS.has(failure)) {
      return { id, role: "user", text, delivery, failure: failure as FailureKind }
    }
  }
  return null
}

function readAssistantMessage(
  value: Record<string, unknown>,
  id: string,
  text: string,
): AssistantChatMessage | null {
  const { status, recommendations, usedTripDate, usedStartingPoint } = value

  if (status !== "NEEDS_CLARIFICATION" && status !== "READY_TO_RECOMMEND") {
    return null
  }
  if (!isIsoDate(usedTripDate)) {
    return null
  }
  if (usedStartingPoint !== "device" && usedStartingPoint !== "vancouver") {
    return null
  }
  if (!Array.isArray(recommendations)) {
    return null
  }

  const read: TrailRecommendation[] = []
  for (const item of recommendations) {
    const recommendation = readTrailRecommendation(item)
    if (recommendation === null) {
      return null
    }
    read.push(recommendation)
  }

  return {
    id,
    role: "assistant",
    text,
    status,
    recommendations: read,
    usedTripDate,
    usedStartingPoint,
  }
}

/**
 * Only the last message can still be acted on. A failed message with
 * something after it was passed over, and offers nothing.
 */
function settleMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message, index) =>
    message.role === "user" &&
    message.failure !== null &&
    index < messages.length - 1
      ? { ...message, failure: null }
      : message,
  )
}
