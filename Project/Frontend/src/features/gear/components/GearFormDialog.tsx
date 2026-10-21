import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react"
import { GEAR_CATEGORY_LABELS } from "../categories"
import { myGearContent } from "../content"
import { GEAR_PICKER_ORDER } from "../families"
import { GEAR_NAME_MAX_LENGTH, type GearCategory } from "../types/gear"
import { GearArt } from "./GearArt"
import { GearCloseButton } from "./GearDetail"

/** From this many characters the counter is shown (MG24). */
const COUNTER_FROM = 80

export type GearFormResult =
  | { ok: true }
  /** The request failed; `message` is the copy to show, or null for none. */
  | { ok: false; message: string | null }

type GearFormDialogProps = {
  mode: "add" | "edit"
  initialName: string
  /** Null for Add, and for an item with no known category. */
  initialCategory: GearCategory | null
  /** The request. Resolves once it has succeeded or failed. */
  onSubmit: (name: string, category: GearCategory) => Promise<GearFormResult>
  /** Cancel, Close, or Escape: typed values are discarded without asking. */
  onClose: () => void
}

/**
 * Add Gear and Edit Gear (FEATURE-007 sections 13.1, 13.2, 21.10): one
 * native modal `<dialog>`, so focus is trapped and returns by the caller. A
 * backdrop press does nothing, so typed text is never lost by accident.
 *
 * One request per submit; a second press while saving sends nothing, and
 * Escape is ignored until it ends. Values are kept when it fails.
 */
export function GearFormDialog({
  mode,
  initialName,
  initialCategory,
  onSubmit,
  onClose,
}: GearFormDialogProps) {
  const { form } = myGearContent
  const titleId = useId()
  const radioName = useId()
  const categoryHelpId = useId()
  const nameId = useId()
  const nameHelpId = useId()
  const counterId = useId()

  const dialogRef = useRef<HTMLDialogElement>(null)
  const pickerRef = useRef<HTMLFieldSetElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<GearCategory | null>(initialCategory)
  const [categoryError, setCategoryError] = useState(false)
  const [nameError, setNameError] = useState<"missing" | "long" | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const showCategoryHelper = mode === "add" || initialCategory === null

  // Open as a modal, then place focus (section 21.10.2): the category group
  // when no category is chosen yet, otherwise the name with the caret at
  // its end.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open) {
      dialog.showModal()
    }
    if (initialCategory === null) {
      pickerRef.current?.querySelector<HTMLInputElement>("input")?.focus()
    } else {
      const input = nameRef.current
      if (input !== null) {
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      }
    }
  }, [initialCategory])

  function focusFirstTile() {
    pickerRef.current?.querySelector<HTMLInputElement>("input")?.focus()
  }

  function requestClose() {
    if (!savingRef.current) {
      onClose()
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) {
      return
    }

    const trimmed = name.trim()
    const problem =
      trimmed === ""
        ? "missing"
        : trimmed.length > GEAR_NAME_MAX_LENGTH
          ? "long"
          : null

    setCategoryError(category === null)
    setNameError(problem)
    if (category === null) {
      focusFirstTile()
      return
    }
    if (problem !== null) {
      nameRef.current?.focus()
      return
    }

    savingRef.current = true
    setSaving(true)
    setRequestError(null)

    const result = await onSubmit(trimmed, category)
    if (result.ok) {
      // The dialog is closing.
      return
    }

    savingRef.current = false
    setSaving(false)
    setRequestError(result.message)
  }

  const nameHelpText =
    nameError === "missing"
      ? form.nameMissing
      : nameError === "long"
        ? form.nameTooLong
        : null
  const showCounter = name.length >= COUNTER_FROM

  return (
    <dialog
      ref={dialogRef}
      className="gear-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          // Handled here, so nothing behind the dialog reacts as well.
          event.preventDefault()
          event.stopPropagation()
          requestClose()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
    >
      <form
        className="gear-dialog-body"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="gear-dialog-header">
          <h2 id={titleId} className="gear-dialog-title">
            {mode === "add" ? form.addTitle : form.editTitle}
          </h2>
          <GearCloseButton
            placement="header"
            disabled={saving}
            onClick={requestClose}
          />
        </div>

        <fieldset
          ref={pickerRef}
          className="gear-picker"
          aria-describedby={
            categoryError || showCategoryHelper ? categoryHelpId : undefined
          }
          aria-disabled={saving ? true : undefined}
        >
          <legend className="gear-field-label">{form.categoryLegend}</legend>
          {categoryError ? (
            <p id={categoryHelpId} className="gear-field-error">
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>{form.categoryMissing}</span>
            </p>
          ) : showCategoryHelper ? (
            <p id={categoryHelpId} className="gear-field-help">
              {form.categoryHelper}
            </p>
          ) : null}

          <div className="gear-tiles">
            {GEAR_PICKER_ORDER.map((value) => (
              <label key={value} className="gear-tile">
                <input
                  type="radio"
                  className="sr-only"
                  name={radioName}
                  value={value}
                  checked={category === value}
                  onChange={() => {
                    if (savingRef.current) {
                      return
                    }
                    setCategory(value)
                    setCategoryError(false)
                  }}
                />
                <GearArt category={value} variant="tile" />
                <span className="gear-tile-label">
                  {GEAR_CATEGORY_LABELS[value]}
                </span>
                <CircleCheck
                  aria-hidden="true"
                  strokeWidth={2}
                  className="gear-tile-check"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="gear-name-field">
          <label htmlFor={nameId} className="gear-field-label">
            {form.nameLabel}
          </label>
          <input
            ref={nameRef}
            id={nameId}
            type="text"
            className="trip-control gear-input"
            value={name}
            maxLength={GEAR_NAME_MAX_LENGTH}
            autoComplete="off"
            readOnly={saving}
            aria-invalid={nameError !== null ? true : undefined}
            aria-describedby={
              showCounter ? `${nameHelpId} ${counterId}` : nameHelpId
            }
            onChange={(event) => {
              setName(event.target.value)
              setNameError(null)
            }}
          />
          <div className="gear-name-meta">
            {/* The field error replaces the helper. */}
            {nameHelpText !== null ? (
              <p id={nameHelpId} className="gear-field-error">
                <CircleAlert aria-hidden="true" strokeWidth={2} />
                <span>{nameHelpText}</span>
              </p>
            ) : (
              <p id={nameHelpId} className="gear-field-help">
                {form.nameHelper}
              </p>
            )}
            {showCounter ? (
              <span id={counterId} className="gear-counter">
                {form.counter(name.length)}
              </span>
            ) : null}
          </div>
        </div>

        <p role="alert" className="gear-alert gear-dialog-alert">
          {requestError !== null ? (
            <>
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>{requestError}</span>
            </>
          ) : null}
        </p>

        <div className="gear-dialog-actions">
          <button
            type="button"
            className="trip-control trip-button"
            aria-disabled={saving ? true : undefined}
            onClick={requestClose}
          >
            {form.cancel}
          </button>
          <button
            type="submit"
            className="trip-control gear-submit"
            aria-disabled={saving ? true : undefined}
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                strokeWidth={2}
                className="trip-spin"
              />
            ) : null}
            {saving
              ? mode === "add"
                ? form.addSaving
                : form.editSaving
              : mode === "add"
                ? form.addSubmit
                : form.editSubmit}
          </button>
        </div>
      </form>
    </dialog>
  )
}
