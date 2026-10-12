import { landingContent } from "./content"

type PromptSuggestionsProps = {
  /** Called with the chip's exact text. Selecting never submits. */
  onSelect: (text: string) => void
}

/**
 * The suggestion chips (FEATURE-001 §11.5). They are shortcuts, not toggles:
 * a chip fills the input and has no lasting selected state.
 */
export function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  return (
    // Tailwind's reset removes list markers, which makes some screen readers
    // drop the list semantics; the explicit role keeps them.
    <ul
      role="list"
      aria-label={landingContent.suggestionsLabel}
      className="landing-chips"
    >
      {landingContent.suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            className="landing-control landing-quiet landing-chip"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  )
}
