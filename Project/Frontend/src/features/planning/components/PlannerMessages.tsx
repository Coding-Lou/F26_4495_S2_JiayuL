import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { CircleAlert, Mountain, Pencil, RotateCcw } from "lucide-react"
import { plannerContent } from "../content"
import {
  PLANNER_IDS,
  focusComposer,
  focusComposerAtEnd,
  focusPlannerElement,
} from "../plannerDom"
import {
  editFailedMessage,
  retryMessage,
  setDraft,
  type PlannerTurn,
} from "../state/plannerStore"
import type { AssistantChatMessage, UserChatMessage } from "../types/planner"
import { RecommendationGroup } from "./RecommendationGroup"

/** How long a turn runs before the waiting text changes (section 13.3.1). */
const LONG_WAIT_MS = 10_000

/**
 * The role cue of everything in the assistant's position: an icon and the
 * word "Planner", so the role never depends on color or alignment alone.
 */
function PlannerLabel() {
  return (
    <p className="planner-label">
      <Mountain aria-hidden="true" strokeWidth={2} />
      {plannerContent.plannerLabel}
    </p>
  )
}

type GreetingProps = {
  /** Starter ideas are offered only until the first user message. */
  showStarters: boolean
}

/**
 * The fixed greeting (FEATURE-003 sections 5.5, 10.2.3). It is interface
 * copy: the only assistant-position text the frontend writes, never sent.
 */
export function PlannerGreeting({ showStarters }: GreetingProps) {
  const { greeting, starters } = plannerContent

  return (
    <li className="planner-item" data-role="assistant">
      <PlannerLabel />
      <p className="planner-greeting-heading">{greeting.heading}</p>
      <p className="planner-greeting-body">{greeting.body}</p>

      {showStarters ? (
        <>
          <p className="planner-starter-caption">{greeting.starterCaption}</p>
          <ul className="planner-starters">
            {starters.map((starter) => (
              <li key={starter.label}>
                <button
                  type="button"
                  className="planner-control planner-starter"
                  onClick={() => {
                    // Fills the composer; it does not send. The text is in
                    // the field before focus moves to its end.
                    flushSync(() => setDraft(starter.sentence, "replaced"))
                    focusComposerAtEnd()
                  }}
                >
                  {starter.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </li>
  )
}

type UserMessageProps = {
  message: UserChatMessage
  /** Entered the history during this visit: it fades in. */
  entering: boolean
  onRetry: (turn: PlannerTurn) => void
}

/**
 * A user message (sections 10.2.2, 13.3.2). One that was not sent stays,
 * marked by words, an icon, and a dashed outline, with a way forward for as
 * long as it is the last thing in the history.
 */
export function UserMessage({ message, entering, onRetry }: UserMessageProps) {
  const failed = message.delivery === "failed"
  const { failure } = message

  function retry() {
    const outcome = retryMessage(message.id)

    if (outcome.kind === "sent") {
      onRetry(outcome.turn)
      focusComposer()
    } else if (outcome.kind === "missing") {
      focusPlannerElement(
        outcome.focus === "date"
          ? PLANNER_IDS.dateControl
          : PLANNER_IDS.startControl,
      )
    }
  }

  function edit() {
    flushSync(() => editFailedMessage(message.id))
    focusComposerAtEnd()
  }

  return (
    <li
      className="planner-item planner-user"
      data-role="user"
      data-message-id={message.id}
      data-enter={entering ? "" : undefined}
    >
      <p className="planner-bubble" data-failed={failed ? "" : undefined}>
        <span className="sr-only">{plannerContent.userPrefix}</span>
        {message.text}
      </p>

      {failed ? (
        <p className="planner-failure-status">
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          {plannerContent.notSent}
        </p>
      ) : null}

      {failed && failure !== null ? (
        <>
          <p className="planner-failure-reason">
            {plannerContent.failures[failure]}
          </p>
          <div className="planner-failure-actions">
            {failure === "not-accepted" ? (
              <button
                type="button"
                className="planner-control planner-outline-button"
                onClick={edit}
              >
                <Pencil aria-hidden="true" strokeWidth={2} />
                {plannerContent.failureActions.edit}
              </button>
            ) : (
              <button
                type="button"
                className="planner-control planner-outline-button"
                onClick={retry}
              >
                <RotateCcw aria-hidden="true" strokeWidth={2} />
                {plannerContent.failureActions.retry}
              </button>
            )}
          </div>
        </>
      ) : null}
    </li>
  )
}

type AssistantMessageProps = {
  message: AssistantChatMessage
  entering: boolean
  /** This reply carries the newest results. */
  currentResults: boolean
  today: string
}

/**
 * A reply: the backend's `assistantMessage` exactly as returned, as a text
 * node, and the turn's results when it has any (sections 6, 12.1).
 */
export function AssistantMessage({
  message,
  entering,
  currentResults,
  today,
}: AssistantMessageProps) {
  return (
    <li
      className="planner-item"
      data-role="assistant"
      data-message-id={message.id}
      data-enter={entering ? "" : undefined}
    >
      <PlannerLabel />
      <p className="planner-assistant-text">{message.text}</p>
      {message.status === "READY_TO_RECOMMEND" ? (
        <RecommendationGroup
          message={message}
          current={currentResults}
          today={today}
        />
      ) : null}
    </li>
  )
}

function hasWaitedLong(startedAt: number): boolean {
  return Date.now() - startedAt >= LONG_WAIT_MS
}

/**
 * Shown in the assistant's position while a turn is in flight (section
 * 13.3.1). It is exactly as tall as a one-line reply. Its text changes once,
 * after ten seconds, and states elapsed time only: the backend reports no
 * progress, so none is invented. It is announced by the announcer, not here.
 */
export function WaitingIndicator({ startedAt }: { startedAt: number }) {
  const [long, setLong] = useState(() => hasWaitedLong(startedAt))

  useEffect(() => {
    if (long) {
      return
    }

    const remaining = Math.max(0, LONG_WAIT_MS - (Date.now() - startedAt))
    const timer = window.setTimeout(() => setLong(true), remaining)
    return () => window.clearTimeout(timer)
  }, [long, startedAt])

  return (
    <li className="planner-item" data-role="assistant" data-enter="">
      <PlannerLabel />
      <p className="planner-waiting">
        <span className="planner-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {long
          ? plannerContent.waiting.stillWorking
          : plannerContent.waiting.working}
      </p>
    </li>
  )
}
