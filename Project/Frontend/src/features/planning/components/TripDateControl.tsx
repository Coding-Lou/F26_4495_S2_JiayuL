import { useId, useRef, useState, type RefObject } from "react"
import { CalendarDays, CircleAlert } from "lucide-react"
import { useDismissable } from "@/lib/useDismissable"
import { plannerContent } from "../content"
import { useFocusOnOpen } from "../hooks/useFocusOnOpen"
import {
  dateQuickPicks,
  formatTripDateLong,
  formatTripDateShort,
  isIsoDate,
  todayIso,
} from "../tripDate"

export type TripDateControlProps = {
  /** The id of the control itself, when something else moves focus to it. */
  id?: string
  /** Local calendar date, `YYYY-MM-DD`; null when none is chosen. */
  value: string | null
  /** A date that is real and today or later. Nothing else is ever reported. */
  onChange: (date: string) => void
  /**
   * Whether the popover is open, when the owner keeps that state (the planner
   * shares one between its two controls). Left out, the control keeps it.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** A date is needed, or the one shown cannot be used. */
  attention?: boolean
  /** Below 360px the planner drops the icon (FEATURE-003 section 17.1). */
  showIcon?: boolean
  /** The surface the control stands on (FEATURE-004 section 21.7). */
  tone?: "paper" | "panel"
  /** `large` is 44px tall with any pointer. */
  size?: "compact" | "large"
  /**
   * Where the popover opens relative to the control. Left out, it is placed
   * by the planner's composer, as FEATURE-003 section 11.5.2 defines.
   */
  placement?: "above" | "below"
  /** Ids of the messages that go with the control. */
  describedBy?: string
  controlRef?: RefObject<HTMLButtonElement | null>
}

/**
 * The trip-date control (FEATURE-003 section 11.5, FEATURE-004 section 21.7):
 * a button that shows the chosen date and opens a small non-modal popover
 * with quick picks and a native date input. The only rule is today or later.
 *
 * It holds no date of its own and writes nowhere: the owner passes the value
 * in and decides what a choice means. The planner stores it for the next
 * message; Trail Detail keeps it for Choose this trail; Trip Preparation puts
 * it in the address.
 */
export function TripDateControl({
  id,
  value,
  onChange,
  open: openProp,
  onOpenChange,
  attention = false,
  showIcon = true,
  tone = "paper",
  size = "compact",
  placement,
  describedBy,
  controlRef,
}: TripDateControlProps) {
  const [ownOpen, setOwnOpen] = useState(false)
  const ownRef = useRef<HTMLButtonElement>(null)
  const buttonRef = controlRef ?? ownRef
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  const open = openProp ?? ownOpen

  function setOpen(next: boolean) {
    if (openProp === undefined) {
      setOwnOpen(next)
    }
    onOpenChange?.(next)
  }

  useDismissable({
    open,
    parts: [popoverRef, buttonRef],
    onDismiss: (reason) => {
      setOpen(false)
      if (reason === "escape") {
        buttonRef.current?.focus()
      }
    },
  })

  /** A quick pick: the date is set, the popover closes, focus returns. */
  function pick(date: string) {
    onChange(date)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const today = todayIso()
  const { date: content } = plannerContent
  const Icon = attention ? CircleAlert : CalendarDays

  return (
    <span
      className="planner-context-slot"
      data-anchored={placement}
      data-tone={tone === "panel" ? "panel" : undefined}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="planner-control planner-context"
        data-set={value !== null ? "" : undefined}
        data-missing={attention ? "" : undefined}
        data-size={size === "large" ? "large" : undefined}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-describedby={describedBy}
        aria-label={`${content.namePrefix}${
          value !== null ? formatTripDateLong(value, today) : content.notSet
        }`}
        onClick={() => {
          setOpen(!open)
          buttonRef.current?.focus()
        }}
      >
        {showIcon ? <Icon aria-hidden="true" strokeWidth={2} /> : null}
        <span className="planner-context-label">
          {value !== null ? formatTripDateShort(value, today) : content.unsetLabel}
        </span>
      </button>

      {open ? (
        <DatePopover
          id={popoverId}
          popoverRef={popoverRef}
          tripDate={value}
          today={today}
          onPick={pick}
          onInput={onChange}
        />
      ) : null}
    </span>
  )
}

type DatePopoverProps = {
  id: string
  popoverRef: RefObject<HTMLDivElement | null>
  tripDate: string | null
  today: string
  /** A quick pick was chosen. */
  onPick: (date: string) => void
  /** The date input holds a usable date. */
  onInput: (date: string) => void
}

/**
 * "When are you going?" (FEATURE-003 section 11.5.2). Quick picks set the
 * date and close; the native date input sets it and stays open. Nothing is
 * preselected. The only rule is today or later: there is no maximum (D4).
 */
function DatePopover({
  id,
  popoverRef,
  tripDate,
  today,
  onPick,
  onInput,
}: DatePopoverProps) {
  const titleId = useId()
  const inputId = useId()
  const errorId = useId()
  const [inputValue, setInputValue] = useState(tripDate ?? "")
  const [past, setPast] = useState(false)

  useFocusOnOpen(popoverRef)

  const { date: content } = plannerContent

  function handleInput(value: string) {
    setInputValue(value)

    // A year still being typed reads as a year before 1000; it is not judged.
    if (!isIsoDate(value) || value.startsWith("0")) {
      setPast(false)
      return
    }

    if (value < today) {
      // The previous date is kept.
      setPast(true)
      return
    }

    setPast(false)
    onInput(value)
  }

  return (
    <div
      ref={popoverRef}
      id={id}
      className="planner-popover"
      role="group"
      aria-labelledby={titleId}
    >
      <p id={titleId} className="planner-popover-title">
        {content.popoverTitle}
      </p>

      <div className="planner-picks">
        {dateQuickPicks(today).map((pick) => (
          <button
            key={pick.date}
            type="button"
            className="planner-control planner-pick"
            aria-pressed={pick.date === tripDate}
            onClick={() => onPick(pick.date)}
          >
            {pick.label}
          </button>
        ))}
      </div>

      <label className="planner-date-label" htmlFor={inputId}>
        {content.inputLabel}
      </label>
      <input
        id={inputId}
        type="date"
        className="planner-control planner-date-input"
        min={today}
        value={inputValue}
        aria-invalid={past ? true : undefined}
        aria-describedby={errorId}
        onChange={(event) => handleInput(event.target.value)}
        onKeyDown={(event) => {
          // In the planner the popover sits inside the composer's form: Enter
          // in this field must not send the message.
          if (event.key === "Enter") {
            event.preventDefault()
          }
        }}
      />

      <p id={errorId} role="alert" className="planner-popover-alert">
        {past ? (
          <span className="planner-popover-error">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{content.past}</span>
          </span>
        ) : null}
      </p>
    </div>
  )
}
