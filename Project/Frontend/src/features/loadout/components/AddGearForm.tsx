import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { ChevronDown, CircleAlert, LoaderCircle } from "lucide-react"
import {
  GEAR_CATEGORY_VALUES,
  GEAR_NAME_MAX_LENGTH,
  isGearCategory,
  type GearCategory,
  type GearFailureKind,
} from "@/features/gear"
import { gearCategoryLabel } from "@/features/packing/gearCategories"
import { studioContent } from "../content"

export type AddGearResult =
  | { ok: true }
  | { ok: false; kind: GearFailureKind }

type AddGearFormProps = {
  /** The row's category, fixed; null for the general form with a chooser. */
  category: GearCategory | null
  /** The request. Resolves once it has succeeded or failed. */
  onAdd: (name: string, category: GearCategory) => Promise<AddGearResult>
  /** Cancel, or Escape: the form closes and its values are discarded. */
  onCancel: () => void
}

/**
 * Add gear (FEATURE-005 sections 13, 16.10): "I have one of these; call it
 * this". One request, `{ name, category }`. Nothing it adds is equipped.
 *
 * The form has no box of its own. It cannot be sent twice while a request is
 * in flight, and its values are kept when the request fails so the user can
 * try again. No backend text is ever shown.
 */
export function AddGearForm({ category, onAdd, onCancel }: AddGearFormProps) {
  const { addGear } = studioContent
  const general = category === null

  const formNameId = useId()
  const nameId = useId()
  const nameHelpId = useId()
  const categoryId = useId()
  const categoryHelpId = useId()

  const nameRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)

  const [name, setName] = useState("")
  const [chosen, setChosen] = useState("")
  const [nameError, setNameError] = useState(false)
  const [categoryError, setCategoryError] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Opening the form moves focus into it (section 18.3).
  useEffect(() => {
    if (general) {
      categoryRef.current?.focus()
    } else {
      nameRef.current?.focus()
    }
  }, [general])

  const label = category !== null ? gearCategoryLabel(category) : null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // A second press while saving is ignored.
    if (savingRef.current) {
      return
    }

    const trimmed = name.trim()
    const target = category ?? (isGearCategory(chosen) ? chosen : null)
    const missingCategory = target === null
    const missingName = trimmed === ""

    setCategoryError(missingCategory)
    setNameError(missingName)
    if (missingCategory) {
      categoryRef.current?.focus()
      return
    }
    if (missingName) {
      nameRef.current?.focus()
      return
    }

    savingRef.current = true
    setSaving(true)
    setRequestError(null)

    const result = await onAdd(trimmed, target)

    savingRef.current = false
    setSaving(false)
    if (!result.ok) {
      setRequestError(requestErrorText(result.kind))
    }
  }

  return (
    <form
      className="studio-form"
      aria-labelledby={formNameId}
      noValidate
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !savingRef.current) {
          event.stopPropagation()
          onCancel()
        }
      }}
    >
      <span id={formNameId} className="sr-only">
        {label !== null ? addGear.rowFormName(label) : addGear.generalFormName}
      </span>

      {general ? (
        <div className="studio-field">
          <label htmlFor={categoryId} className="studio-field-label">
            {addGear.categoryLabel}
          </label>
          <span className="studio-select">
            <select
              ref={categoryRef}
              id={categoryId}
              className="trip-control studio-input"
              value={chosen}
              required
              aria-invalid={categoryError ? true : undefined}
              aria-describedby={categoryError ? categoryHelpId : undefined}
              aria-readonly={saving ? true : undefined}
              data-invalid={categoryError ? "" : undefined}
              onChange={(event) => {
                if (savingRef.current) {
                  return
                }
                setChosen(event.target.value)
                setCategoryError(false)
              }}
            >
              <option value="" disabled>
                {addGear.chooseCategory}
              </option>
              {GEAR_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {gearCategoryLabel(value)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" strokeWidth={2} />
          </span>
          {categoryError ? (
            <p id={categoryHelpId} className="studio-field-error">
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>{addGear.categoryEmpty}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="studio-field">
        <label htmlFor={nameId} className="studio-field-label">
          {addGear.nameLabel}
        </label>
        <input
          ref={nameRef}
          id={nameId}
          type="text"
          className="trip-control studio-input"
          value={name}
          maxLength={GEAR_NAME_MAX_LENGTH}
          required
          autoComplete="off"
          readOnly={saving}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameHelpId}
          data-invalid={nameError ? "" : undefined}
          onChange={(event) => {
            setName(event.target.value)
            setNameError(false)
          }}
        />
        {/* The field error replaces the helper. */}
        <p
          id={nameHelpId}
          className={nameError ? "studio-field-error" : "studio-field-help"}
        >
          {nameError ? (
            <>
              <CircleAlert aria-hidden="true" strokeWidth={2} />
              <span>{addGear.nameEmpty}</span>
            </>
          ) : label !== null ? (
            addGear.rowHelper(label)
          ) : (
            addGear.generalHelper
          )}
        </p>
      </div>

      <p role="alert" className="studio-form-alert">
        {requestError !== null ? (
          <>
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{requestError}</span>
          </>
        ) : null}
      </p>

      <div className="studio-form-actions">
        <button
          type="submit"
          className="trip-control studio-primary"
          aria-disabled={saving ? true : undefined}
        >
          {saving ? (
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="trip-spin"
            />
          ) : null}
          {saving ? addGear.saving : addGear.submit}
        </button>
        <button
          type="button"
          className="trip-control studio-button"
          aria-disabled={saving ? true : undefined}
          onClick={() => {
            if (!savingRef.current) {
              onCancel()
            }
          }}
        >
          {addGear.cancel}
        </button>
      </div>
    </form>
  )
}

function requestErrorText(kind: GearFailureKind): string | null {
  const { addGear } = studioContent
  switch (kind) {
    case "rejected":
      return addGear.rejected
    case "timeout":
      return addGear.timedOut
    case "no-session":
      // FEATURE-002 takes over; nothing of this feature's is drawn.
      return null
    default:
      return addGear.failed
  }
}
