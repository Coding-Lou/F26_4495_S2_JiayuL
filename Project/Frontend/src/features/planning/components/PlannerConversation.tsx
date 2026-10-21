import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"
import { plannerContent } from "../content"
import { focusComposer, prefersReducedMotion } from "../plannerDom"
import {
  clearUnseenReply,
  getPlannerState,
  hasUserMessage,
  setHistoryAtEnd,
  usePlanner,
  type PlannerTurn,
} from "../state/plannerStore"
import { todayIso } from "../tripDate"
import {
  AssistantMessage,
  PlannerGreeting,
  UserMessage,
  WaitingIndicator,
} from "./PlannerMessages"

/** "At or near the bottom" (section 10.2.4). */
const NEAR_END_PX = 80
/** Where the top of a reply is placed when it does not fit (section 10.2.4). */
const REPLY_TOP_OFFSET_PX = 16
/** Longest a programmatic smooth scroll is assumed to take. */
const SMOOTH_SCROLL_LIMIT_MS = 800

type PlannerConversationProps = {
  onRetry: (turn: PlannerTurn) => void
}

/**
 * The message history (FEATURE-003 sections 10.1, 10.2.2–10.2.4, 10.2.7).
 *
 * A plain scrolling container inside the panel: the document does not grow
 * with the conversation. It is not a live region; what is spoken comes from
 * the announcer. The collapse of older results is decided while rendering, so
 * it lands in the same frame as the new group, before the scroll position is
 * set.
 */
export function PlannerConversation({ onRetry }: PlannerConversationProps) {
  const messages = usePlanner((planner) => planner.session.messages)
  const pending = usePlanner((planner) => planner.ui.pending)
  const event = usePlanner((planner) => planner.ui.event)
  const unseenReplyId = usePlanner((planner) => planner.ui.unseenReplyId)

  const historyRef = useRef<HTMLDivElement>(null)
  const newReplyRef = useRef<HTMLButtonElement>(null)
  /** A scroll this component started is still running. */
  const autoScrolling = useRef(false)
  const autoScrollTimer = useRef<number | undefined>(undefined)
  const handledEvent = useRef<number | null>(null)

  // Messages already in the history when it was shown do not animate in.
  const [restoredIds] = useState(
    () => new Set(messages.map((message) => message.id)),
  )
  const [shownAtEvent] = useState(event.seq)

  const today = todayIso()
  const started = hasUserMessage(messages)

  let newestResultsIndex = -1
  messages.forEach((message, index) => {
    if (message.role === "assistant" && message.status === "READY_TO_RECOMMEND") {
      newestResultsIndex = index
    }
  })

  function scrollHistory(top: number, animated: boolean) {
    const history = historyRef.current
    if (history === null) {
      return
    }

    if (!animated || prefersReducedMotion()) {
      history.scrollTop = top
      return
    }

    autoScrolling.current = true
    window.clearTimeout(autoScrollTimer.current)
    autoScrollTimer.current = window.setTimeout(() => {
      autoScrolling.current = false
    }, SMOOTH_SCROLL_LIMIT_MS)
    history.scrollTo({ top, behavior: "smooth" })
  }

  function scrollToEnd(animated: boolean) {
    const history = historyRef.current
    if (history !== null) {
      scrollHistory(history.scrollHeight - history.clientHeight, animated)
    }
  }

  /**
   * Shows a message from its start. If it fits, the history goes to its end;
   * otherwise the message's first row is placed just under the top edge, so a
   * group of results is read from its top and not its last card.
   */
  function bringIntoView(messageId: string, animated: boolean) {
    const history = historyRef.current
    if (history === null) {
      return
    }

    const item = Array.from(
      history.querySelectorAll<HTMLElement>("[data-message-id]"),
    ).find((element) => element.dataset.messageId === messageId)

    if (item === undefined) {
      scrollToEnd(animated)
      return
    }

    const room = history.clientHeight - 2 * REPLY_TOP_OFFSET_PX
    if (item.offsetHeight <= room) {
      scrollToEnd(animated)
      return
    }

    // The history is the item's offset parent, so this is the item's place
    // in the scrolled content. It is read from layout, not from the painted
    // box: a reply that is still sliding in is painted 4px lower than where
    // it comes to rest.
    scrollHistory(Math.max(0, item.offsetTop - REPLY_TOP_OFFSET_PX), animated)
  }

  // After every conversation event, once, with the new content in place.
  useLayoutEffect(() => {
    if (handledEvent.current === event.seq) {
      return
    }
    handledEvent.current = event.seq

    if (event.seq === shownAtEvent) {
      // Restored, or returned to: the latest message is in view. Focus is
      // not moved and nothing is animated.
      const { messages: restored } = getPlannerState().session
      const last = restored[restored.length - 1]
      if (last !== undefined) {
        bringIntoView(last.id, false)
      }
      return
    }

    switch (event.kind) {
      case "sent":
      case "failed":
        scrollToEnd(true)
        break
      case "reply":
        // With the user reading further up, nothing moves; "New reply" shows.
        if (getPlannerState().ui.unseenReplyId === null && event.messageId !== null) {
          bringIntoView(event.messageId, true)
        }
        // Focus is never moved by a reply. If it was lost, because the
        // control that held it is gone, it goes to the composer.
        if (
          document.activeElement === null ||
          document.activeElement === document.body
        ) {
          focusComposer()
        }
        break
      case "reset":
        scrollHistory(0, false)
        break
      default:
        break
    }
  })

  // Keeps the end in view when the history itself gets shorter: a longer
  // note line, a growing composer, an on-screen keyboard.
  useEffect(() => {
    const history = historyRef.current
    if (history === null || typeof ResizeObserver === "undefined") {
      return
    }

    let height = history.clientHeight
    const observer = new ResizeObserver(() => {
      const shrank = history.clientHeight < height
      height = history.clientHeight
      if (shrank && getPlannerState().ui.historyAtEnd && !autoScrolling.current) {
        history.scrollTop = history.scrollHeight
      }
    })

    observer.observe(history)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const history = historyRef.current
    if (history === null) {
      return
    }

    const settle = () => {
      autoScrolling.current = false
    }
    history.addEventListener("scrollend", settle)
    return () => {
      history.removeEventListener("scrollend", settle)
      window.clearTimeout(autoScrollTimer.current)
    }
  }, [])

  function dismissNewReply() {
    // Focus is not left on a control that is about to go.
    if (document.activeElement === newReplyRef.current) {
      focusComposer()
    }
    clearUnseenReply()
  }

  function handleScroll() {
    const history = historyRef.current
    if (history === null) {
      return
    }

    const fromEnd = history.scrollHeight - history.scrollTop - history.clientHeight
    const atEnd = fromEnd <= NEAR_END_PX

    // While a scroll of our own is under way, only its arrival counts.
    if (atEnd || !autoScrolling.current) {
      setHistoryAtEnd(atEnd)
    }

    const unseen = getPlannerState().ui.unseenReplyId
    if (unseen === null) {
      return
    }

    const reply = Array.from(
      history.querySelectorAll<HTMLElement>("[data-message-id]"),
    ).find((element) => element.dataset.messageId === unseen)

    const reached =
      reply === undefined ||
      reply.getBoundingClientRect().top <=
        history.getBoundingClientRect().bottom - 2 * REPLY_TOP_OFFSET_PX

    if (atEnd || reached) {
      dismissNewReply()
    }
  }

  function jumpToNewReply() {
    if (unseenReplyId !== null) {
      bringIntoView(unseenReplyId, true)
    }
    dismissNewReply()
  }

  return (
    <>
      <div
        ref={historyRef}
        className="planner-history"
        role="region"
        aria-label={plannerContent.conversationLabel}
        tabIndex={0}
        onScroll={handleScroll}
      >
        <ol className="planner-messages">
          <PlannerGreeting showStarters={!started} />

          {messages.map((message, index) =>
            message.role === "user" ? (
              <UserMessage
                key={message.id}
                message={message}
                entering={!restoredIds.has(message.id)}
                onRetry={onRetry}
              />
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                entering={!restoredIds.has(message.id)}
                currentResults={index === newestResultsIndex}
                today={today}
              />
            ),
          )}

          {pending !== null ? (
            <WaitingIndicator key={pending.startedAt} startedAt={pending.startedAt} />
          ) : null}
        </ol>
      </div>

      {unseenReplyId !== null ? (
        <div className="planner-new-reply-anchor">
          <button
            ref={newReplyRef}
            type="button"
            className="planner-control planner-new-reply"
            onClick={jumpToNewReply}
          >
            {plannerContent.newReply}
            <ArrowDown aria-hidden="true" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </>
  )
}
