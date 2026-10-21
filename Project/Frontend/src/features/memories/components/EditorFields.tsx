import { useId, type ReactNode, type RefObject } from "react"
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Globe,
  Info,
  LoaderCircle,
  Lock,
} from "lucide-react"
import { memoriesContent } from "../content"
import {
  trailFactsText,
  trailNameText,
  type TrailLine,
  type TrailLookup,
} from "../model/memoryText"
import { MEMORY_VISIBILITIES, type MemoryVisibility } from "../types/memory"
import { TryAgainButton } from "./MemoryCommon"

type FieldLabelProps = {
  htmlFor?: string
  id?: string
  label: string
  marker: "required" | "optional" | null
}

/** The shared field label: the name, then a text Required / Optional (22.9). */
export function FieldLabel({ htmlFor, id, label, marker }: FieldLabelProps) {
  const { editor } = memoriesContent
  const content = (
    <>
      <span className="memory-field-name">{label}</span>
      {marker !== null ? (
        <span className="memory-field-marker">
          {marker === "required" ? editor.required : editor.optional}
        </span>
      ) : null}
    </>
  )
  return htmlFor !== undefined ? (
    <label htmlFor={htmlFor} id={id} className="memory-field-label">
      {content}
    </label>
  ) : (
    <span id={id} className="memory-field-label">
      {content}
    </span>
  )
}

/** A field's error line: it replaces the helper (section 22.9). */
export function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="memory-field-error">
      <CircleAlert aria-hidden="true" strokeWidth={2} />
      <span>{text}</span>
    </p>
  )
}

type HelperRowProps = {
  helperId: string
  helper: string | null
  error: string | null
  counterId?: string
  counter?: string | null
}

/** Helper (or error) at the start, the counter at the end (22.9). */
export function HelperRow({
  helperId,
  helper,
  error,
  counterId,
  counter,
}: HelperRowProps) {
  return (
    <div className="memory-field-meta">
      {error !== null ? (
        <FieldError id={helperId} text={error} />
      ) : helper !== null ? (
        <p id={helperId} className="memory-field-help">
          {helper}
        </p>
      ) : (
        <span />
      )}
      {counter != null && counterId !== undefined ? (
        <span id={counterId} className="memory-counter">
          {counter}
        </span>
      ) : null}
    </div>
  )
}

type TrailFieldProps = {
  /** Create, before the Memory exists: a select. Otherwise read-only. */
  editable: boolean
  mode: "create" | "edit"
  value: string
  onChange: (trailId: string) => void
  trails: TrailLookup
  error: string | null
  /** The `?trail=` preselection could not be used (MM77). */
  badPreselect: boolean
  selectRef: RefObject<HTMLSelectElement | null>
  disabled: boolean
}

/**
 * Trail (sections 10, 22.9): a native select sorted by name before the
 * Memory is saved, read-only text afterwards, because a Memory's trail can
 * never change (Q4).
 */
export function TrailField({
  editable,
  mode,
  value,
  onChange,
  trails,
  error,
  badPreselect,
  selectRef,
  disabled,
}: TrailFieldProps) {
  const { editor } = memoriesContent
  const selectId = useId()
  const labelId = useId()
  const helperId = useId()
  const noteId = useId()
  const factsId = useId()

  const loaded = trails.query.data !== undefined
  const loading = !loaded && !trails.query.isError
  const failed = !loaded && trails.query.isError
  const line: TrailLine = value === "" ? { kind: "loading" } : trails.lineFor(value)
  const facts = line.kind === "found" ? trailFactsText(line.trail) : ""

  if (!editable) {
    const name =
      line.kind === "found"
        ? line.name
        : line.kind === "missing"
          ? memoriesContent.trail.unavailable
          : line.kind === "failed"
            ? memoriesContent.trail.failed
            : null
    return (
      <div className="memory-field memory-field-trail">
        <FieldLabel id={labelId} label={editor.trailLabel} marker={null} />
        <p className="memory-trail-readonly">
          {name ?? (
            <span className="memory-skeleton-bar" data-bar="trail-name" aria-hidden="true" />
          )}
        </p>
        {facts !== "" ? <p className="memory-field-help">{facts}</p> : null}
        <p className="memory-trail-note">
          <Info aria-hidden="true" strokeWidth={2} />
          <span>{editor.trailNoteEdit}</span>
        </p>
      </div>
    )
  }

  const describedBy = [
    error !== null || loading || failed ? helperId : null,
    facts !== "" ? factsId : null,
    noteId,
  ]
    .filter((id) => id !== null)
    .join(" ")

  return (
    <div className="memory-field memory-field-trail">
      <FieldLabel
        htmlFor={selectId}
        label={editor.trailLabel}
        marker="required"
      />
      <div className="memory-select-box">
        <select
          ref={selectRef}
          id={selectId}
          className="trip-control memory-control memory-select"
          value={value}
          disabled={loading || failed}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            if (!disabled) {
              onChange(event.target.value)
            }
          }}
        >
          <option value="">{editor.trailFirstOption}</option>
          {trails.sorted.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trailNameText(trail)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" strokeWidth={2} className="memory-select-icon" />
      </div>

      {error !== null ? (
        <FieldError id={helperId} text={error} />
      ) : loading ? (
        <p id={helperId} className="memory-field-help memory-field-help-icon">
          <LoaderCircle aria-hidden="true" strokeWidth={2} />
          <span>{editor.trailsLoading}</span>
        </p>
      ) : null}

      {failed ? (
        <div className="memory-trail-failed">
          {error === null ? <FieldError id={helperId} text={editor.trailsFailed} /> : null}
          <TryAgainButton
            compact
            working={trails.query.isFetching}
            onRetry={() => void trails.query.refetch()}
          />
        </div>
      ) : null}

      {loaded && trails.sorted.length === 0 ? (
        <p className="memory-field-help">{editor.noTrails}</p>
      ) : null}

      {badPreselect && value === "" ? (
        <p className="memory-trail-note">
          <Info aria-hidden="true" strokeWidth={2} />
          <span>{editor.badPreselect}</span>
        </p>
      ) : null}

      {facts !== "" ? (
        <p id={factsId} className="memory-field-help">
          {facts}
        </p>
      ) : null}

      <p id={noteId} className="memory-trail-note">
        <Info aria-hidden="true" strokeWidth={2} />
        <span>{mode === "create" ? editor.trailNoteCreate : editor.trailNoteEdit}</span>
      </p>
    </div>
  )
}

type VisibilityChoiceProps = {
  value: MemoryVisibility
  onChange: (value: MemoryVisibility) => void
  /** Saved and not editable here any more (create after the save). */
  readOnly: boolean
}

/**
 * Who can see this memory (sections 15.1, 22.11): two native radios as
 * stacked choice tiles in a fieldset, one tab stop, arrows choose. Both
 * values look the same: Public is never coloured or warned about.
 */
export function VisibilityChoice({ value, onChange, readOnly }: VisibilityChoiceProps) {
  const { visibilityChoice: copy, visibility: words } = memoriesContent
  const name = useId()
  const baseId = useId()
  const meaning: Record<MemoryVisibility, string> = {
    PRIVATE: copy.privateMeaning,
    PUBLIC: copy.publicMeaning,
  }

  return (
    <fieldset className="memory-visibility-choice" data-readonly={readOnly ? "" : undefined}>
      <legend className="memory-section-heading">{copy.legend}</legend>
      <div className="memory-choice-tiles">
        {MEMORY_VISIBILITIES.map((option) => {
          const Icon = option === "PUBLIC" ? Globe : Lock
          const meaningId = `${baseId}-${option}`
          return (
            <label key={option} className="memory-choice">
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={option}
                checked={value === option}
                aria-describedby={meaningId}
                aria-disabled={readOnly ? true : undefined}
                onChange={() => {
                  if (!readOnly) {
                    onChange(option)
                  }
                }}
              />
              <Icon aria-hidden="true" strokeWidth={2} className="memory-choice-icon" />
              <span className="memory-choice-text">
                <span className="memory-choice-label">{words[option]}</span>
                <span id={meaningId} className="memory-choice-meaning">
                  {meaning[option]}
                </span>
              </span>
              <CircleCheck aria-hidden="true" strokeWidth={2} className="memory-choice-check" />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** A heading with its Optional marker, for the Photos section (22.10). */
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="memory-section-heading">
      {children}
      <span className="memory-field-marker">{memoriesContent.editor.optional}</span>
    </h2>
  )
}
