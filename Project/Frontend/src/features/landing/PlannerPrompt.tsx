import { useId, useRef, type SubmitEvent } from "react"
import { flushSync } from "react-dom"
import { ArrowRight } from "lucide-react"
import { landingContent } from "./content"
import { PlannerMessage } from "./PlannerMessage"
import { PromptSuggestions } from "./PromptSuggestions"
import type { PlannerPromptController } from "./usePlannerPrompt"

type PlannerPromptProps = {
  planner: PlannerPromptController
}

/**
 * The planner form (FEATURE-001 §11.4): label, field, input, the circular
 * primary action, the message slot, and the suggestion chips.
 *
 * The action is never disabled and there is no loading state: with a prompt
 * that cannot be submitted it explains why and returns focus to the input.
 */
export function PlannerPrompt({ planner }: PlannerPromptProps) {
  const inputId = useId()
  const messageId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const invalid = planner.error !== null

  // Enter in the input and activating the action are the same event.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const accepted = planner.submit()
    if (!accepted) {
      inputRef.current?.focus()
    }
  }

  function handleSuggestion(text: string) {
    // Commit the new value first, so the caret can be placed after it.
    flushSync(() => planner.selectSuggestion(text))

    const input = inputRef.current
    if (input) {
      input.focus()
      input.setSelectionRange(text.length, text.length)
    }
  }

  return (
    <form className="landing-form" noValidate onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="landing-label">
        {landingContent.planner.label}
      </label>

      {/* A press on the field's own surface (the gap and inset around the
          action) goes to the input, as a press on the input itself does. */}
      <div
        className="landing-field"
        data-invalid={invalid ? "" : undefined}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {/* No maxLength: a hard limit would silently truncate pasted text. */}
        <input
          ref={inputRef}
          id={inputId}
          className="landing-input"
          type="text"
          name="prompt"
          value={planner.value}
          onChange={(event) => planner.change(event.target.value)}
          placeholder={landingContent.planner.placeholder}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="go"
          aria-describedby={messageId}
          aria-invalid={invalid ? true : undefined}
        />
        <button
          type="submit"
          aria-label={landingContent.planner.submitLabel}
          className="landing-control landing-action"
        >
          <ArrowRight aria-hidden="true" strokeWidth={2} />
        </button>
      </div>

      <PlannerMessage
        id={messageId}
        error={planner.error}
        length={planner.length}
        refusals={planner.refusals}
      />

      <PromptSuggestions onSelect={handleSuggestion} />
    </form>
  )
}
