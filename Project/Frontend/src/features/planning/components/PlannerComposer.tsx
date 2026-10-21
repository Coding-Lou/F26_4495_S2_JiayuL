import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react"
import { ArrowUp } from "lucide-react"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { plannerContent } from "../content"
import { PLANNER_IDS, focusPlannerElement } from "../plannerDom"
import { checkPlanningPrompt, PLANNING_PROMPT_MAX_LENGTH } from "../planningPrompt"
import { formatCharacterCount } from "../presentation"
import {
  hasUserMessage,
  sendDraft,
  setDraft,
  usePlanner,
  type PlannerTurn,
} from "../state/plannerStore"
import { PlannerContextControls } from "./PlannerContextControls"

/** The counter appears once the trimmed text reaches this (section 10.2.5). */
const COUNTER_FROM = 1_800

type PlannerComposerProps = {
  onSend: (turn: PlannerTurn) => void
}

/** Grows the field with its text; CSS holds the minimum and the maximum. */
function fitToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto"
  textarea.style.height = `${textarea.scrollHeight}px`
}

/**
 * The composer (FEATURE-003 sections 10.1, 10.2.5): one `paper` surface with
 * a labelled multiline field and, under it, the two trip-context controls and
 * Send.
 *
 * Sending needs a valid message, a trip date, and a starting point. With the
 * text valid and one of the others missing, Send says what is missing and
 * moves focus there; nothing is sent with an invented value. While a turn is
 * in flight the field stays editable and Send does nothing.
 */
export function PlannerComposer({ onSend }: PlannerComposerProps) {
  const draft = usePlanner((planner) => planner.session.draft)
  const inFlight = usePlanner((planner) => planner.ui.pending !== null)
  const started = usePlanner((planner) => hasUserMessage(planner.session.messages))
  const compact = useMediaQuery("(max-width: 359.98px)")

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const check = checkPlanningPrompt(draft)
  const overLimit = check.status === "too-long"
  const unavailable = check.status !== "valid" || inFlight
  const { composer } = plannerContent

  useLayoutEffect(() => {
    if (textareaRef.current !== null) {
      fitToContent(textareaRef.current)
    }
  }, [draft])

  // The same text needs a different height when the panel changes width.
  useEffect(() => {
    const refit = () => {
      if (textareaRef.current !== null) {
        fitToContent(textareaRef.current)
      }
    }

    window.addEventListener("resize", refit)
    return () => window.removeEventListener("resize", refit)
  }, [])

  function submit() {
    const outcome = sendDraft()

    if (outcome.kind === "sent") {
      onSend(outcome.turn)
    } else if (outcome.kind === "missing") {
      // The popover is not opened for the user; the control takes focus.
      focusPlannerElement(
        outcome.focus === "date"
          ? PLANNER_IDS.dateControl
          : PLANNER_IDS.startControl,
      )
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return
    }

    // Enter that confirms an IME composition never sends.
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return
    }

    // On touch devices Enter is a line break and the Send button sends.
    if (window.matchMedia("(pointer: coarse)").matches) {
      return
    }

    event.preventDefault()
    submit()
  }

  return (
    <form
      className="planner-composer"
      data-invalid={overLimit ? "" : undefined}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label htmlFor={PLANNER_IDS.textarea} className="sr-only">
        {composer.label}
      </label>
      <textarea
        ref={textareaRef}
        id={PLANNER_IDS.textarea}
        className="planner-textarea"
        rows={1}
        value={draft}
        placeholder={started ? composer.placeholderNext : composer.placeholderFirst}
        aria-describedby={PLANNER_IDS.note}
        aria-invalid={overLimit ? true : undefined}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      {check.length >= COUNTER_FROM ? (
        <p className="planner-counter" data-over={overLimit ? "" : undefined}>
          {formatCharacterCount(check.length, PLANNING_PROMPT_MAX_LENGTH)}
        </p>
      ) : null}

      <div className="planner-composer-row">
        <PlannerContextControls compact={compact} />

        {/* Not `disabled` when unavailable: it stays in the tab order and
            keeps its name; activating it does nothing. */}
        <button
          type="submit"
          className="planner-control planner-send"
          aria-label={composer.send}
          aria-disabled={unavailable ? true : undefined}
        >
          <ArrowUp aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </form>
  )
}
