import { useId, type KeyboardEvent, type Ref } from "react"
import { Search } from "lucide-react"
import { discoverContent } from "../content"

type TrailSearchFieldProps = {
  inputRef: Ref<HTMLInputElement>
  query: string
  /** The results listbox is shown (a query with at least one match). */
  expanded: boolean
  listboxId: string
  /** The active result's element id, or undefined for none. */
  activeOptionId: string | undefined
  onQueryChange: (query: string) => void
  /** First focus or input: the trail catalog may now be requested. */
  onEngage: () => void
  onMove: (delta: 1 | -1) => void
  /** Enter: the active result, else the first. */
  onPick: () => void
  /** Escape with text: the query is cleared and the results leave. */
  onClear: () => void
}

/**
 * The trail name search field above Discover's list: an ARIA 1.2 combobox
 * whose listbox is `TrailSearchResults`. Focus stays in the field while
 * ArrowDown and ArrowUp move the active result (`aria-activedescendant`);
 * Enter picks it; Escape with text clears the query and goes no further,
 * so it never also closes the trail popup. Tab leaves the field as usual.
 */
export function TrailSearchField({
  inputRef,
  query,
  expanded,
  listboxId,
  activeOptionId,
  onQueryChange,
  onEngage,
  onMove,
  onPick,
  onClear,
}: TrailSearchFieldProps) {
  const inputId = useId()

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        if (expanded) {
          event.preventDefault()
          onMove(event.key === "ArrowDown" ? 1 : -1)
        }
        return
      case "Enter":
        if (expanded) {
          event.preventDefault()
          onPick()
        }
        return
      case "Escape":
        // An empty field leaves Escape alone.
        if (query !== "") {
          event.preventDefault()
          event.stopPropagation()
          onClear()
        }
        return
    }
  }

  return (
    <div className="discover-search">
      <label htmlFor={inputId} className="sr-only">
        {discoverContent.search.label}
      </label>
      <Search
        aria-hidden="true"
        strokeWidth={2}
        className="discover-search-icon"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listboxId : undefined}
        aria-activedescendant={expanded ? activeOptionId : undefined}
        className="trip-control discover-search-input"
        placeholder={discoverContent.search.placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={onEngage}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
