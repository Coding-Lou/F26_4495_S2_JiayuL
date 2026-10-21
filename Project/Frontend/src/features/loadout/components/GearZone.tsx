import { useEffect, useId, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDashed,
  EyeOff,
  Info,
  PersonStanding,
  Plus,
} from "lucide-react"
import type { AvatarViewerStatus } from "@/features/avatar"
import { isGearCategory, type GearCategory } from "@/features/gear"
import { packContent } from "@/features/packing/content"
import { studioContent } from "../content"
import {
  rowNote,
  type AvatarPresence,
  type StudioModel,
  type StudioRow,
} from "../model/studioModel"
import { AddGearForm, type AddGearResult } from "./AddGearForm"

type OpenPart =
  | { kind: "picker"; category: string }
  | { kind: "add-row"; category: string }
  | { kind: "add-general" }
  | null

export type GearZoneActions = {
  equip: (row: StudioRow) => void
  unequip: (row: StudioRow) => void
  chooseItem: (row: StudioRow, itemId: string) => void
  /** Equips every recommended, owned, unequipped category's current item. */
  equipRecommended: () => void
  /** Resolves after the Studio has applied a success. */
  addGear: (name: string, category: GearCategory) => Promise<AddGearResult>
}

type GearZoneProps = {
  model: StudioModel
  /** S14: the pack came back without a forecast. */
  weatherUnavailable: boolean
  presence: AvatarPresence
  viewerStatus: AvatarViewerStatus | null
  actions: GearZoneActions
}

/**
 * The gear groups (FEATURE-005 sections 11, 12, 16.8–16.10): "Recommended for
 * this trip", "Also in your gear", the uncategorised line, and the general
 * Add gear entry. A list of categories the user acts on: not a table, a
 * checklist, or a form.
 *
 * Rows keep a fixed enum order and never move when their state changes (D19).
 * At most one picker or Add gear form is open at a time.
 */
export function GearZone({
  model,
  weatherUnavailable,
  presence,
  viewerStatus,
  actions,
}: GearZoneProps) {
  const { groups } = studioContent
  const recommendedHeadingId = useId()
  const otherHeadingId = useId()
  const generalFormId = useId()

  const [open, setOpen] = useState<OpenPart>(null)

  const generalButtonRef = useRef<HTMLButtonElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  /** After the shortcut: its sentence. After Add gear: that row's action. */
  const focusNext = useRef<
    { kind: "slot" } | { kind: "row-action"; category: string } | null
  >(null)

  // Focus that waits for the element to exist (section 18.3).
  useEffect(() => {
    const target = focusNext.current
    if (target === null || zoneRef.current === null) {
      return
    }
    const element =
      target.kind === "slot"
        ? zoneRef.current.querySelector<HTMLElement>("[data-slot-sentence]")
        : zoneRef.current.querySelector<HTMLElement>(
            `[data-row-action="${CSS.escape(target.category)}"]`,
          )
    if (element !== null) {
      focusNext.current = null
      element.focus()
      element.scrollIntoView({ block: "nearest" })
    }
  })

  const ownedRecommended = model.recommendedRows.filter(
    (row) => row.items.length > 0,
  )
  const shortcutAvailable = ownedRecommended.some(
    (row) => row.equippedItem === null,
  )

  async function addGear(
    name: string,
    category: GearCategory,
  ): Promise<AddGearResult> {
    const result = await actions.addGear(name, category)
    if (result.ok) {
      focusNext.current = { kind: "row-action", category }
      setOpen(null)
    }
    return result
  }

  function closeTo(element: HTMLElement | null) {
    setOpen(null)
    element?.focus()
  }

  const rowProps = {
    open,
    setOpen,
    presence,
    viewerStatus,
    actions,
    addGear,
  }

  return (
    <div ref={zoneRef} className="studio-groups">
      <section className="studio-group" aria-labelledby={recommendedHeadingId}>
        <h2
          id={recommendedHeadingId}
          tabIndex={-1}
          className="studio-group-heading trip-focus-target"
        >
          {groups.recommendedHeading}
        </h2>
        <p className="studio-group-description">
          {groups.recommendedDescription}
        </p>

        {weatherUnavailable ? (
          <p className="studio-caveat">
            <Info aria-hidden="true" strokeWidth={2} />
            <span>{packContent.gear.noForecastList}</span>
          </p>
        ) : null}

        {model.recommendedRows.length === 0 ? (
          // S10: in place of the slot and the rows.
          <p className="studio-statement">{packContent.gear.none}</p>
        ) : (
          <>
            {/* Always exactly one thing, in a box that keeps its height. */}
            <div className="studio-slot">
              {ownedRecommended.length === 0 ? (
                <p className="studio-slot-sentence">{groups.noneOwned}</p>
              ) : shortcutAvailable ? (
                <button
                  type="button"
                  className="trip-control studio-button"
                  onClick={() => {
                    focusNext.current = { kind: "slot" }
                    actions.equipRecommended()
                  }}
                >
                  {groups.shortcut}
                </button>
              ) : (
                <p
                  className="studio-slot-sentence trip-focus-target"
                  tabIndex={-1}
                  data-slot-sentence=""
                >
                  <Check aria-hidden="true" strokeWidth={2} />
                  <span>{groups.allOwnedEquipped}</span>
                </p>
              )}
            </div>

            <ul className="studio-rows">
              {model.recommendedRows.map((row) => (
                <GearRowItem key={row.category} row={row} {...rowProps} />
              ))}
            </ul>
          </>
        )}
      </section>

      {model.otherRows.length > 0 ? (
        <section className="studio-group" aria-labelledby={otherHeadingId}>
          <h2 id={otherHeadingId} className="studio-group-heading">
            {groups.otherHeading}
          </h2>
          <p className="studio-group-description">{groups.otherDescription}</p>
          <ul className="studio-rows">
            {model.otherRows.map((row) => (
              <GearRowItem key={row.category} row={row} {...rowProps} />
            ))}
          </ul>
        </section>
      ) : null}

      {model.uncategorisedCount > 0 ? (
        <p className="studio-uncategorised">
          <Info aria-hidden="true" strokeWidth={2} />
          <span>{studioContent.uncategorised(model.uncategorisedCount)}</span>
        </p>
      ) : null}

      <div className="studio-general">
        <button
          ref={generalButtonRef}
          type="button"
          className="trip-control studio-button"
          aria-expanded={open?.kind === "add-general"}
          aria-controls={open?.kind === "add-general" ? generalFormId : undefined}
          onClick={() =>
            setOpen((current) =>
              current?.kind === "add-general" ? null : { kind: "add-general" },
            )
          }
        >
          <Plus aria-hidden="true" strokeWidth={2} />
          {studioContent.addGear.openGeneral}
        </button>

        {open?.kind === "add-general" ? (
          <div id={generalFormId} className="studio-general-form">
            <AddGearForm
              category={null}
              onAdd={addGear}
              onCancel={() => closeTo(generalButtonRef.current)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

type GearRowItemProps = {
  row: StudioRow
  open: OpenPart
  setOpen: (open: OpenPart) => void
  presence: AvatarPresence
  viewerStatus: AvatarViewerStatus | null
  actions: GearZoneActions
  addGear: (name: string, category: GearCategory) => Promise<AddGearResult>
}

/**
 * One category (16.8). Line 1: the label, the Equipped tag, the action.
 * Line 2: Owned or Missing, the item, and Change. Line 3: the avatar note.
 * Every state is a word; none is a color, a position, or an icon alone.
 */
function GearRowItem({
  row,
  open,
  setOpen,
  presence,
  viewerStatus,
  actions,
  addGear,
}: GearRowItemProps) {
  const { row: content, addGear: addContent } = studioContent
  const stateId = useId()
  const pickerId = useId()
  const formId = useId()
  const changeRef = useRef<HTMLButtonElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const owned = row.items.length > 0
  const equipped = row.equippedItem !== null
  const pickerOpen = open?.kind === "picker" && open.category === row.category
  const formOpen = open?.kind === "add-row" && open.category === row.category
  const note = owned ? rowNote(row, presence, viewerStatus) : null
  // A row can only add gear in a category the backend accepts.
  const addCategory: GearCategory | null = isGearCategory(row.category)
    ? row.category
    : null

  return (
    <li className="studio-row">
      <div className="studio-row-line">
        <div className="studio-row-title">
          <h3 className="studio-row-label">{row.label}</h3>
          {equipped ? (
            <span className="studio-tag">
              <Check aria-hidden="true" strokeWidth={2.5} />
              {content.equipped}
            </span>
          ) : null}
        </div>

        {owned ? (
          // One button whose label is the action (18.5): no aria-pressed.
          <button
            type="button"
            className="trip-control studio-button studio-row-action"
            data-row-action={row.category}
            aria-label={
              equipped
                ? content.unequipName(row.label)
                : content.equipName(row.label)
            }
            aria-describedby={stateId}
            onClick={() =>
              equipped ? actions.unequip(row) : actions.equip(row)
            }
          >
            {equipped ? content.unequip : content.equip}
          </button>
        ) : addCategory !== null ? (
          <button
            ref={addRef}
            type="button"
            className="trip-control studio-button studio-row-action"
            aria-label={addContent.openName(row.label)}
            aria-expanded={formOpen}
            aria-controls={formOpen ? formId : undefined}
            onClick={() =>
              setOpen(
                formOpen ? null : { kind: "add-row", category: row.category },
              )
            }
          >
            {addContent.open}
          </button>
        ) : null}
      </div>

      <div className="studio-row-line studio-row-detail">
        <p id={stateId} className="studio-row-state">
          {owned ? (
            <CircleCheck aria-hidden="true" strokeWidth={2} />
          ) : (
            <CircleDashed aria-hidden="true" strokeWidth={2} />
          )}
          <span className="studio-row-state-text">
            <span className="studio-row-state-word">
              {owned ? content.owned : content.missing}
            </span>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {/* The user's own words, as text. */}
            <span>
              {owned && row.currentItem !== null
                ? row.currentItem.name
                : content.missingHint}
            </span>
          </span>
        </p>

        {row.items.length >= 2 ? (
          <button
            ref={changeRef}
            type="button"
            className="trip-control studio-change"
            aria-label={content.changeName(row.label, row.items.length)}
            aria-expanded={pickerOpen}
            aria-controls={pickerOpen ? pickerId : undefined}
            onClick={() =>
              setOpen(
                pickerOpen ? null : { kind: "picker", category: row.category },
              )
            }
          >
            {content.change}
            {pickerOpen ? (
              <ChevronUp aria-hidden="true" strokeWidth={2} />
            ) : (
              <ChevronDown aria-hidden="true" strokeWidth={2} />
            )}
          </button>
        ) : null}
      </div>

      {note !== null ? (
        <p className="studio-row-note">
          {note.icon === "avatar" ? (
            <PersonStanding aria-hidden="true" strokeWidth={2} />
          ) : note.icon === "hidden" ? (
            <EyeOff aria-hidden="true" strokeWidth={2} />
          ) : null}
          <span>{note.text}</span>
        </p>
      ) : null}

      {pickerOpen ? (
        <ItemPicker
          id={pickerId}
          row={row}
          onChoose={(itemId) => actions.chooseItem(row, itemId)}
          onClose={() => {
            setOpen(null)
            changeRef.current?.focus()
          }}
        />
      ) : null}

      {formOpen && addCategory !== null ? (
        <div id={formId} className="studio-row-form">
          <AddGearForm
            category={addCategory}
            onAdd={addGear}
            onCancel={() => {
              setOpen(null)
              addRef.current?.focus()
            }}
          />
        </div>
      ) : null}
    </li>
  )
}

type ItemPickerProps = {
  id: string
  row: StudioRow
  onChoose: (itemId: string) => void
  onClose: () => void
}

/**
 * The in-row list of owned items (16.9): native radios in a fieldset, in
 * inventory order. Choosing applies at once and the list stays open. Not a
 * popover, a menu, or a `select`: it cannot be clipped, and names wrap.
 */
function ItemPicker({ id, row, onChoose, onClose }: ItemPickerProps) {
  const name = useId()
  const current = row.currentItem?.id ?? null

  return (
    <fieldset
      id={id}
      className="studio-picker"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <legend className="sr-only">
        {studioContent.row.pickerLegend(row.label)}
      </legend>
      {row.items.map((item) => (
        <label key={item.id} className="studio-option">
          <input
            type="radio"
            className="studio-option-input"
            name={name}
            value={item.id}
            checked={item.id === current}
            onChange={() => onChoose(item.id)}
          />
          <span className="studio-option-ring" aria-hidden="true">
            <span className="studio-option-dot" />
          </span>
          {/* Two items with the same name appear as two identical options. */}
          <span className="studio-option-name">{item.name}</span>
        </label>
      ))}
    </fieldset>
  )
}
