import { useSyncExternalStore } from "react"
import { getAuthenticatedSubject } from "@/features/auth"
import { plannerContent, type PlannerNoteId } from "../content"
import { clearPendingPrompt, readPendingPrompt } from "../pendingPrompt"
import { checkPlanningPrompt } from "../planningPrompt"
import { recommendationName } from "../presentation"
import {
  clearPlannerSession,
  emptyPlannerSession,
  readPlannerSession,
  writePlannerSession,
} from "../storage/plannerSession"
import { todayIso } from "../tripDate"
import type {
  AssistantChatMessage,
  ChatMessage,
  FailureKind,
  PlannerSession,
  PlannerTurnRequest,
  PlannerTurnResult,
  StartingPoint,
  StartingPointKind,
  UserChatMessage,
} from "../types/planner"

/**
 * The planner's state (FEATURE-003 sections 5–7, 13–16).
 *
 * It lives outside React for three reasons. A session that ends must be able
 * to discard it at once, from outside any component. A reply must be applied
 * even if the user has stepped away from `/home` for a moment. And the header
 * (New Plan) and the panel read the same state without sharing a parent that
 * would re-render the media.
 *
 * Two things are kept apart and never derived from each other: the displayed
 * history (`messages`) and the backend's `PlanningContext` (`context`), which
 * is stored as it arrived and sent back unchanged.
 *
 * The state belongs to one signed-in user, identified by the session's
 * subject. It is read from storage only once that subject is known, only if
 * the stored value is theirs, and it is never written without an owner.
 */

export type PlannerEventKind =
  /** A user message entered the history and a turn started. */
  | "sent"
  /** A reply arrived. */
  | "reply"
  /** A turn failed. */
  | "failed"
  /** A new plan replaced the conversation. */
  | "reset"

/** The last thing that happened, for scrolling. `seq` grows by one each time. */
export type PlannerEvent = {
  seq: number
  kind: PlannerEventKind | null
  messageId: string | null
}

export type PlannerAnnouncement = {
  seq: number
  region: "status" | "alert"
  text: string
}

export type PlannerUi = {
  /** The turn in flight. One at a time. */
  pending: { messageId: string; startedAt: number } | null
  /** A send was refused for a missing date or starting point. */
  sendRefused: boolean
  /** A trip date was dropped because it has passed. */
  dateExpired: boolean
  /** The date or starting point changed after results were shown. */
  changeNote: "N2" | "N3" | null
  confirmingNewPlan: boolean
  /** The history is scrolled to, or near, its end. */
  historyAtEnd: boolean
  /** A reply that arrived while the user was reading further up. */
  unseenReplyId: string | null
  event: PlannerEvent
  announcement: PlannerAnnouncement | null
}

export type PlannerState = {
  session: PlannerSession
  ui: PlannerUi
}

/** One turn, as handed to the request. */
export type PlannerTurn = {
  /** Which conversation this turn belongs to. */
  epoch: number
  messageId: string
  request: PlannerTurnRequest
  /** Aborted when the conversation is replaced or the session ends. */
  signal: AbortSignal
  usedTripDate: string
  usedStartingPoint: StartingPointKind
}

export type SendOutcome =
  | { kind: "sent"; turn: PlannerTurn }
  /** Nothing was sent: the first control that still needs a value. */
  | { kind: "missing"; focus: "date" | "start" }
  /** Nothing was sent: no text, too much text, or a turn already in flight. */
  | { kind: "blocked" }

let state: PlannerState | null = null
/**
 * The subject the state in memory belongs to. Null when the signed-in session
 * has no subject: the planner then works in memory and stores nothing.
 */
let owner: string | null = null
/** Grows whenever the conversation is replaced; late replies are discarded. */
let epoch = 0
/**
 * Set when the session ended in this document. Until a signed-in visit to the
 * planner reopens it, nothing is written to storage.
 */
let closed = false
let inFlight: AbortController | null = null

/**
 * The page is going away (a reload, a navigation, the tab closing). The
 * browser aborts the request in flight as it leaves, which reaches this
 * module as an ordinary failure. That failure says nothing about the planner:
 * recording it would restore the message with the wrong reason. So while the
 * page is leaving a failure is held, not applied. If the page does go, the
 * stored message is still "sending" and comes back as interrupted (E6). If
 * the page turns out to stay, the held failure is applied as it was.
 */
let leaving = false
let heldFailure: { turn: PlannerTurn; kind: FailureKind } | null = null
let leavingGrace: number | undefined

/**
 * How long a `beforeunload` alone is trusted. Unlike `pagehide`, it is also
 * fired for navigations that never leave the page; this bounds how long a
 * failure can be held in that case.
 */
const LEAVING_GRACE_MS = 10_000

function beginLeaving(definite: boolean) {
  leaving = true
  window.clearTimeout(leavingGrace)
  leavingGrace = definite
    ? undefined
    : window.setTimeout(endLeaving, LEAVING_GRACE_MS)
}

/** The page is still here, or is shown again: apply what was held. */
function endLeaving() {
  window.clearTimeout(leavingGrace)
  leavingGrace = undefined
  leaving = false

  const held = heldFailure
  heldFailure = null
  if (held !== null) {
    failTurn(held.turn, held.kind)
  }
}

function handleBeforeUnload() {
  beginLeaving(false)
}

// `pagehide` is the definite signal. Some browsers abort requests when a
// navigation starts, before `pagehide`, so `beforeunload` is watched as well,
// but only while a turn is in flight (see `watchForLeaving`).
window.addEventListener("pagehide", () => beginLeaving(true))
window.addEventListener("pageshow", endLeaving)

function watchForLeaving(turnInFlight: boolean) {
  if (turnInFlight) {
    window.addEventListener("beforeunload", handleBeforeUnload)
  } else {
    window.removeEventListener("beforeunload", handleBeforeUnload)
  }
}
let sequence = 0

const listeners = new Set<() => void>()

function initialUi(overrides: Partial<PlannerUi> = {}): PlannerUi {
  return {
    pending: null,
    sendRefused: false,
    dateExpired: false,
    changeNote: null,
    confirmingNewPlan: false,
    historyAtEnd: true,
    unseenReplyId: null,
    event: { seq: sequence, kind: null, messageId: null },
    announcement: null,
    ...overrides,
  }
}

/**
 * Builds the state for a signed-in visit: what this tab stored, with a trip
 * date that has passed removed, and with a request typed on the Public
 * Landing placed in the composer as a draft (section 15).
 */
function initialise(): PlannerState {
  let session = emptyPlannerSession()
  let dateExpired = false

  if (owner === null) {
    // No subject to own a stored value, and none to check one against:
    // nothing is restored, and nothing is left behind.
    clearPlannerSession()
  } else {
    // A value that is not this user's is removed by the read, whole.
    session = readPlannerSession(owner) ?? session
  }

  if (session.tripDate !== null && session.tripDate < todayIso()) {
    session = { ...session, tripDate: null }
    dateExpired = true
  }

  const landingPrompt = readPendingPrompt()
  if (landingPrompt !== null) {
    // It is the most recent request, so it replaces any earlier draft. It is
    // never sent from here and never enters the history by itself.
    session = { ...session, draft: landingPrompt, draftFromLanding: true }
    // The pending key is cleared only once the draft is safely in planner
    // state; if it could not be written, a reload finds it again.
    if (persist(session)) {
      clearPendingPrompt()
    }
  }

  return { session, ui: initialUi({ dateExpired }) }
}

/** Stores the session as its owner's. Never without an owner. */
function persist(session: PlannerSession): boolean {
  if (closed || owner === null) {
    return false
  }
  return writePlannerSession(owner, session)
}

function notify() {
  listeners.forEach((listener) => listener())
}

function current(): PlannerState {
  if (state !== null && !closed && owner !== getAuthenticatedSubject()) {
    // The signed-in subject is not the one this state belongs to. For the old
    // owner that is a session end: the state in memory is dropped, a reply
    // still on its way is discarded, and the planner starts again below.
    epoch += 1
    inFlight?.abort()
    inFlight = null
    heldFailure = null
    watchForLeaving(false)
    state = null
    // Whoever is showing the old state is told once this read has returned.
    queueMicrotask(notify)
  }

  if (state === null) {
    // The subject is read first; storage is not touched before it is known.
    owner = getAuthenticatedSubject()
    state = initialise()
  }
  return state
}

function commit(next: { session?: PlannerSession; ui?: Partial<PlannerUi> }) {
  const previous = current()
  const session = next.session ?? previous.session

  state = {
    session,
    ui: next.ui === undefined ? previous.ui : { ...previous.ui, ...next.ui },
  }

  if (session !== previous.session) {
    persist(session)
  }

  watchForLeaving(state.ui.pending !== null)
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPlannerState(): PlannerState {
  return current()
}

/**
 * Reads part of the planner state. The selector must return a value that is
 * the same between changes: a primitive, or an object held by the state.
 */
export function usePlanner<T>(selector: (state: PlannerState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(current()),
    () => selector(current()),
  )
}

function nextEvent(kind: PlannerEventKind, messageId: string | null): PlannerEvent {
  sequence += 1
  return { seq: sequence, kind, messageId }
}

function announce(region: "status" | "alert", text: string): PlannerAnnouncement {
  sequence += 1
  return { seq: sequence, region, text }
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/* ------------------------------------------------------------------ *
 * Draft, trip date, starting point
 * ------------------------------------------------------------------ */

/**
 * Sets the composer's text. `typed` is the user editing; `replaced` is a
 * starter idea or a message put back for editing.
 */
export function setDraft(text: string, source: "typed" | "replaced" = "typed") {
  const { session } = current()
  if (text === session.draft && source === "typed") {
    return
  }

  const stillFromLanding =
    session.draftFromLanding && source === "typed" && text.trim() !== ""

  if (session.draftFromLanding && !stillFromLanding) {
    // Covers the case where the draft could not be stored earlier.
    clearPendingPrompt()
  }

  commit({
    session: { ...session, draft: text, draftFromLanding: stillFromLanding },
  })
}

/** Whether any reply so far carried results (with or without a match). */
function hasResults(messages: ChatMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" && message.status === "READY_TO_RECOMMEND",
  )
}

/** Applies from the next message. Nothing is sent (section 11.4, D18). */
export function setTripDate(tripDate: string) {
  const { session } = current()
  if (tripDate === session.tripDate) {
    return
  }

  commit({
    session: { ...session, tripDate },
    ui: {
      dateExpired: false,
      changeNote: hasResults(session.messages) ? "N2" : null,
    },
  })
}

/** Applies from the next message. Nothing is sent. */
export function setStartingPoint(startingPoint: StartingPoint) {
  const { session } = current()
  const previous = session.startingPoint
  if (
    previous !== null &&
    previous.kind === startingPoint.kind &&
    previous.latitude === startingPoint.latitude &&
    previous.longitude === startingPoint.longitude
  ) {
    return
  }

  commit({
    session: { ...session, startingPoint },
    ui: { changeNote: hasResults(session.messages) ? "N3" : null },
  })
}

/* ------------------------------------------------------------------ *
 * Turns
 * ------------------------------------------------------------------ */

/**
 * The date and starting point a turn would be sent with, or the first control
 * that still needs a value. A date that has passed since it was chosen is
 * dropped here, so it is never sent.
 */
function readTripContext():
  | { tripDate: string; startingPoint: StartingPoint }
  | { focus: "date" | "start" } {
  const { session } = current()
  let { tripDate } = session
  const { startingPoint } = session

  if (tripDate !== null && tripDate < todayIso()) {
    tripDate = null
    commit({ session: { ...session, tripDate: null }, ui: { dateExpired: true } })
  }

  if (tripDate === null || startingPoint === null) {
    commit({ ui: { sendRefused: true } })
    return { focus: tripDate === null ? "date" : "start" }
  }

  return { tripDate, startingPoint }
}

function startTurn(
  messages: ChatMessage[],
  message: UserChatMessage,
  tripDate: string,
  startingPoint: StartingPoint,
  draft?: { draft: string; draftFromLanding: boolean },
): PlannerTurn {
  const { session } = current()

  inFlight?.abort()
  inFlight = new AbortController()

  commit({
    session: { ...session, ...draft, messages },
    ui: {
      pending: { messageId: message.id, startedAt: Date.now() },
      sendRefused: false,
      changeNote: null,
      confirmingNewPlan: false,
      // The history is about to be scrolled to the new message.
      historyAtEnd: true,
      unseenReplyId: null,
      event: nextEvent("sent", message.id),
      announcement: announce("status", plannerContent.announcements.sent),
    },
  })

  return {
    epoch,
    messageId: message.id,
    request: {
      message: message.text,
      // The latest context the backend returned, untouched; null before the
      // first reply of a plan.
      context: session.context,
      latitude: startingPoint.latitude,
      longitude: startingPoint.longitude,
      tripDate,
    },
    signal: inFlight.signal,
    usedTripDate: tripDate,
    usedStartingPoint: startingPoint.kind,
  }
}

/** A failed message the user has moved past keeps its mark and nothing else. */
function supersedeFailures(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) =>
    message.role === "user" && message.failure !== null
      ? { ...message, failure: null }
      : message,
  )
}

/** Sends the composer's draft as the next turn, if it can be sent. */
export function sendDraft(): SendOutcome {
  const { session, ui } = current()

  if (ui.pending !== null) {
    return { kind: "blocked" }
  }

  const check = checkPlanningPrompt(session.draft)
  if (check.status !== "valid") {
    return { kind: "blocked" }
  }

  const tripContext = readTripContext()
  if ("focus" in tripContext) {
    return { kind: "missing", focus: tripContext.focus }
  }

  if (session.draftFromLanding) {
    clearPendingPrompt()
  }

  const message: UserChatMessage = {
    id: createId(),
    role: "user",
    text: check.prompt,
    delivery: "sending",
    failure: null,
  }

  const turn = startTurn(
    [...supersedeFailures(current().session.messages), message],
    message,
    tripContext.tripDate,
    tripContext.startingPoint,
    { draft: "", draftFromLanding: false },
  )
  return { kind: "sent", turn }
}

/**
 * Resends a failed message: the same text, with the current context, date,
 * and starting point. The existing message is reused; no copy is added.
 */
export function retryMessage(messageId: string): SendOutcome {
  const { session, ui } = current()

  if (ui.pending !== null) {
    return { kind: "blocked" }
  }

  const failed = session.messages.find((message) => message.id === messageId)
  if (
    failed === undefined ||
    failed.role !== "user" ||
    failed.delivery !== "failed" ||
    failed.failure === null ||
    failed.failure === "not-accepted"
  ) {
    return { kind: "blocked" }
  }

  const tripContext = readTripContext()
  if ("focus" in tripContext) {
    return { kind: "missing", focus: tripContext.focus }
  }

  const message: UserChatMessage = {
    ...failed,
    delivery: "sending",
    failure: null,
  }

  const turn = startTurn(
    current().session.messages.map((item) =>
      item.id === messageId ? message : item,
    ),
    message,
    tripContext.tripDate,
    tripContext.startingPoint,
  )
  return { kind: "sent", turn }
}

/** Whether a turn's result still has a conversation to go to. */
function isCurrentTurn(turn: PlannerTurn): boolean {
  return (
    state !== null &&
    turn.epoch === epoch &&
    state.ui.pending?.messageId === turn.messageId
  )
}

function replyAnnouncement(result: PlannerTurnResult): string {
  const { replyPrefix, resultsSuffix } = plannerContent.announcements
  const spoken = `${replyPrefix}${result.assistantMessage}`

  if (result.status !== "READY_TO_RECOMMEND") {
    return spoken
  }
  if (result.recommendations.length === 0) {
    return `${spoken} ${plannerContent.results.zeroGuidance}`
  }

  const names = result.recommendations
    .map((trail, index) => recommendationName(trail, index + 1))
    .join(", ")
  return `${spoken} ${names}. ${resultsSuffix}`
}

/** Applies a reply. One that arrives for a conversation that is gone is dropped. */
export function resolveTurn(turn: PlannerTurn, result: PlannerTurnResult) {
  if (!isCurrentTurn(turn)) {
    return
  }

  const { session, ui } = current()
  inFlight = null

  const reply: AssistantChatMessage = {
    id: createId(),
    role: "assistant",
    text: result.assistantMessage,
    status: result.status,
    recommendations: result.recommendations,
    usedTripDate: turn.usedTripDate,
    usedStartingPoint: turn.usedStartingPoint,
  }

  const messages: ChatMessage[] = [
    ...session.messages.map((message) =>
      message.id === turn.messageId && message.role === "user"
        ? { ...message, delivery: "sent" as const, failure: null }
        : message,
    ),
    reply,
  ]

  commit({
    // The returned context replaces the stored one, as it is.
    session: { ...session, messages, context: result.context },
    ui: {
      pending: null,
      unseenReplyId: ui.historyAtEnd ? null : reply.id,
      event: nextEvent("reply", reply.id),
      announcement: announce("status", replyAnnouncement(result)),
    },
  })
}

/**
 * Marks a turn as failed. The message stays, the stored context, date, and
 * starting point are untouched, and no assistant message is created.
 */
export function failTurn(turn: PlannerTurn, kind: FailureKind) {
  if (!isCurrentTurn(turn)) {
    return
  }

  if (leaving) {
    // Most likely the request being aborted by the page going away.
    heldFailure = { turn, kind }
    return
  }

  const { session } = current()
  inFlight = null

  commit({
    session: {
      ...session,
      messages: session.messages.map((message) =>
        message.id === turn.messageId && message.role === "user"
          ? { ...message, delivery: "failed" as const, failure: kind }
          : message,
      ),
    },
    ui: {
      pending: null,
      event: nextEvent("failed", turn.messageId),
      announcement: announce(
        "alert",
        `${plannerContent.announcements.failedPrefix}${plannerContent.failures[kind]}`,
      ),
    },
  })
}

/**
 * Puts a message that cannot be used back in the composer for editing. The
 * message stays in the history, passed over.
 */
export function editFailedMessage(messageId: string) {
  const { session } = current()
  const failed = session.messages.find((message) => message.id === messageId)
  if (failed === undefined || failed.role !== "user" || failed.failure === null) {
    return
  }

  if (session.draftFromLanding) {
    clearPendingPrompt()
  }

  commit({
    session: {
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...failed, failure: null } : message,
      ),
      draft: failed.text,
      draftFromLanding: false,
    },
  })
}

/* ------------------------------------------------------------------ *
 * History position
 * ------------------------------------------------------------------ */

export function setHistoryAtEnd(atEnd: boolean) {
  if (current().ui.historyAtEnd !== atEnd) {
    commit({ ui: { historyAtEnd: atEnd } })
  }
}

export function clearUnseenReply() {
  if (current().ui.unseenReplyId !== null) {
    commit({ ui: { unseenReplyId: null } })
  }
}

/* ------------------------------------------------------------------ *
 * New Plan (section 14)
 * ------------------------------------------------------------------ */

export function hasUserMessage(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.role === "user")
}

/** Opens the confirmation, or closes it when it is already open. */
export function toggleNewPlanConfirmation() {
  const { session, ui } = current()
  if (!hasUserMessage(session.messages)) {
    return
  }
  commit({ ui: { confirmingNewPlan: !ui.confirmingNewPlan } })
}

export function cancelNewPlan() {
  if (current().ui.confirmingNewPlan) {
    commit({ ui: { confirmingNewPlan: false } })
  }
}

/**
 * Starts a new plan: the conversation, the context, the results, the trip
 * date, the draft, and any unused landing request are cleared. The starting
 * point is kept; it describes the user, not one trip. A reply still on its
 * way is discarded.
 */
export function startNewPlan() {
  const { session } = current()

  epoch += 1
  inFlight?.abort()
  inFlight = null
  clearPendingPrompt()

  commit({
    session: emptyPlannerSession(session.startingPoint),
    ui: initialUi({
      event: nextEvent("reset", null),
      announcement: announce("status", plannerContent.announcements.newPlan),
    }),
  })
}

/* ------------------------------------------------------------------ *
 * The session ends, or a signed-in visit begins
 * ------------------------------------------------------------------ */

/**
 * Discards the planner state: sign-out, session expiry, and any startup that
 * finds no session (section 16, D14). Nothing of the conversation, the date,
 * or the starting point is left in storage or in this document, and a reply
 * still on its way is dropped. Safe to call at any time, any number of times.
 */
export function endPlannerSession() {
  epoch += 1
  inFlight?.abort()
  inFlight = null
  clearPlannerSession()
  heldFailure = null
  watchForLeaving(false)

  if (state !== null) {
    closed = true
    state = { session: emptyPlannerSession(), ui: initialUi() }
    listeners.forEach((listener) => listener())
  }
}

/**
 * Called when the planner is shown to a signed-in user. It matters only in a
 * document whose earlier session ended without a reload: the planner then
 * starts again from what this tab holds, which is nothing of that session.
 */
export function openPlannerSession() {
  if (!closed) {
    return
  }

  closed = false
  state = null
  current()
  notify()
}

/* ------------------------------------------------------------------ *
 * The note line (section 10.2.6)
 * ------------------------------------------------------------------ */

/**
 * The one message the note line shows, or null. A validation outranks a note.
 */
export function selectNoteId(planner: PlannerState): PlannerNoteId | null {
  const { session, ui } = planner

  if (checkPlanningPrompt(session.draft).status === "too-long") {
    return "V1"
  }

  const dateMissing = session.tripDate === null
  const startMissing = session.startingPoint === null

  if (ui.dateExpired && dateMissing && !(ui.sendRefused && startMissing)) {
    return "V5"
  }
  if (ui.sendRefused && (dateMissing || startMissing)) {
    if (dateMissing && startMissing) {
      return "V4"
    }
    return dateMissing ? "V2" : "V3"
  }

  if (ui.changeNote !== null) {
    return ui.changeNote
  }
  return session.draftFromLanding ? "N1" : null
}
