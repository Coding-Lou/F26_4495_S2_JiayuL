import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { CircleAlert, LoaderCircle, Pencil, Trash2, X } from "lucide-react"
import { myGearContent } from "../content"
import { addedText, itemCategoryText } from "../model/myGearModel"
import type { GearItem } from "../types/gear"
import { GearArt } from "./GearArt"

export type GearDetailActions = {
  onEdit: (opener: HTMLButtonElement) => void
  onAskRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
  onClose: () => void
}

type GearDetailProps = GearDetailActions & {
  item: GearItem
  headingId: string
  variant: "panel" | "sheet"
  /** The inline remove confirmation replaces the action row. */
  confirming: boolean
  /** The removal of this item is in flight. */
  removing: boolean
  /** MG38, after a failed removal. */
  removeError: string | null
}

/**
 * What the item detail shows (FEATURE-007 sections 12, 21.8): the art, the
 * name as the heading, the category, the description when there is one, two
 * quiet true lines, Edit and Remove from My Gear, and Close last in the DOM.
 * Never a stat, a recommendation, or an Equipped state.
 */
export function GearDetail({
  item,
  headingId,
  variant,
  confirming,
  removing,
  removeError,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
  onClose,
}: GearDetailProps) {
  const { detail } = myGearContent
  const added = addedText(item.createdAt)
  const description =
    item.description !== null && item.description.trim() !== ""
      ? item.description
      : null

  return (
    <>
      <GearArt category={item.category} variant={variant} />

      <h2
        id={headingId}
        tabIndex={-1}
        className="trip-focus-target gear-detail-name"
        data-gear-detail-heading=""
      >
        {item.name}
      </h2>
      <p className="gear-detail-category">
        <span className="sr-only">{detail.categoryPrefix} </span>
        {itemCategoryText(item.category)}
      </p>

      {description !== null ? (
        <p className="gear-detail-description">{description}</p>
      ) : null}

      <div className="gear-detail-context">
        {added !== null ? <p>{added}</p> : null}
        <p>{detail.equipHint}</p>
      </div>

      <div className="gear-detail-actions-area">
        {confirming ? (
          <RemoveConfirmation
            name={item.name}
            removing={removing}
            error={removeError}
            onCancel={onCancelRemove}
            onConfirm={onConfirmRemove}
          />
        ) : (
          <div className="gear-detail-actions">
            <button
              type="button"
              className="trip-control trip-button"
              data-gear-action="edit"
              onClick={(event) => onEdit(event.currentTarget)}
            >
              <Pencil aria-hidden="true" strokeWidth={2} />
              {detail.edit}
            </button>
            <button
              type="button"
              className="trip-control gear-remove-link"
              data-gear-action="remove"
              onClick={onAskRemove}
            >
              <Trash2 aria-hidden="true" strokeWidth={2} />
              {detail.remove}
            </button>
          </div>
        )}
      </div>

      <GearCloseButton
        placement="corner"
        disabled={removing}
        onClick={() => {
          if (!removing) {
            onClose()
          }
        }}
      />
    </>
  )
}

type GearCloseButtonProps = {
  placement: "corner" | "header"
  /** Working: it keeps focus and ignores activation. */
  disabled: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

/** Close (MG17): the icon action of DS §14. */
export function GearCloseButton({
  placement,
  disabled,
  onClick,
}: GearCloseButtonProps) {
  return (
    <button
      type="button"
      className="trip-control gear-close"
      data-placement={placement}
      aria-label={myGearContent.detail.close}
      aria-disabled={disabled ? true : undefined}
      onClick={onClick}
    >
      <X aria-hidden="true" strokeWidth={2} />
    </button>
  )
}

type RemoveConfirmationProps = {
  name: string
  removing: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * The inline remove confirmation (section 21.11). Focus starts on Cancel,
 * the safe choice. Escape cancels, except while the removal is in flight.
 */
function RemoveConfirmation({
  name,
  removing,
  error,
  onCancel,
  onConfirm,
}: RemoveConfirmationProps) {
  const { remove, form } = myGearContent
  const questionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return
    }
    // Handled here: neither the panel nor a sheet closes.
    event.preventDefault()
    event.stopPropagation()
    if (!removing) {
      onCancel()
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      className="gear-confirm"
      onKeyDown={handleKeyDown}
    >
      <p id={questionId} className="gear-confirm-question">
        {remove.question(name)}
      </p>
      <p className="gear-confirm-body">{remove.body}</p>

      <p role="alert" className="gear-alert">
        {error !== null ? (
          <>
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{error}</span>
          </>
        ) : null}
      </p>

      <div className="gear-confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          className="trip-control trip-button"
          aria-disabled={removing ? true : undefined}
          onClick={() => {
            if (!removing) {
              onCancel()
            }
          }}
        >
          {form.cancel}
        </button>
        <button
          type="button"
          className="trip-control gear-danger"
          aria-disabled={removing ? true : undefined}
          onClick={() => {
            if (!removing) {
              onConfirm()
            }
          }}
        >
          {removing ? (
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="trip-spin"
            />
          ) : (
            <Trash2 aria-hidden="true" strokeWidth={2} />
          )}
          {removing ? remove.working : remove.confirm}
        </button>
      </div>
    </div>
  )
}
