import { useCallback, useId, useRef, useState, type RefObject } from "react"
import {
  Check,
  CircleAlert,
  LoaderCircle,
  LocateFixed,
  MapPin,
} from "lucide-react"
import { useDismissable } from "@/lib/useDismissable"
import { plannerContent } from "../content"
import { useFocusOnOpen } from "../hooks/useFocusOnOpen"
import { useGeolocation, type GeolocationLookup } from "../hooks/useGeolocation"
import { PLANNER_IDS } from "../plannerDom"
import { setStartingPoint, setTripDate, usePlanner } from "../state/plannerStore"
import { VANCOUVER } from "../storage/plannerSession"
import { TripDateControl } from "./TripDateControl"

type OpenPopover = "date" | "start" | null

type PlannerContextControlsProps = {
  /** Below 360px: no icons, and a shorter waiting label (section 17.1). */
  compact: boolean
}

/**
 * The trip date and the starting point (FEATURE-003 section 11): two compact
 * controls inside the composer, each opening a small non-modal popover. The
 * backend needs both on every turn and reads neither from the message, so
 * they are set here and nowhere else. Neither has a default, and changing one
 * sends nothing.
 */
export function PlannerContextControls({ compact }: PlannerContextControlsProps) {
  const tripDate = usePlanner((planner) => planner.session.tripDate)
  const startingPoint = usePlanner((planner) => planner.session.startingPoint)
  const sendRefused = usePlanner((planner) => planner.ui.sendRefused)

  const [open, setOpen] = useState<OpenPopover>(null)

  const startControlRef = useRef<HTMLButtonElement>(null)
  const startPopoverRef = useRef<HTMLDivElement>(null)
  const startPopoverId = useId()

  const handleLocated = useCallback((latitude: number, longitude: number) => {
    // If the popover is still open, it closes and focus returns to its
    // control. If the user has moved on, focus is left where they put it.
    const popover = startPopoverRef.current
    const active = document.activeElement
    const returnFocus =
      popover !== null &&
      (popover.contains(active) || active === null || active === document.body)
    setStartingPoint({ kind: "device", latitude, longitude })
    setOpen((current) => (current === "start" ? null : current))
    if (returnFocus) {
      startControlRef.current?.focus()
    }
  }, [])

  const { lookup, locate, discard } = useGeolocation(handleLocated)

  useDismissable({
    open: open === "start",
    parts: [startPopoverRef, startControlRef],
    onDismiss: (reason) => {
      setOpen((current) => (current === "start" ? null : current))
      if (reason === "escape") {
        startControlRef.current?.focus()
      }
    },
  })

  /** The control activated: opens its popover, or closes it when open. */
  function toggleStart() {
    setOpen((current) => (current === "start" ? null : "start"))
    startControlRef.current?.focus()
  }

  /**
   * The date control reports its popover opening or closing. One popover is
   * open at a time, so opening it replaces the starting point's.
   */
  function setDateOpen(next: boolean) {
    setOpen((current) => {
      if (next) {
        return "date"
      }
      return current === "date" ? null : current
    })
  }

  function chooseVancouver() {
    // Any lookup still running is dropped.
    discard()
    setStartingPoint(VANCOUVER)
    setOpen(null)
    startControlRef.current?.focus()
  }

  const { startingPoint: startContent } = plannerContent

  const dateMissing = sendRefused && tripDate === null
  const startMissing = sendRefused && startingPoint === null
  const locating = lookup.status === "locating"

  let startLabel: string = startContent.unsetLabel
  if (locating) {
    startLabel = compact ? startContent.findingShort : startContent.finding
  } else if (startingPoint !== null) {
    startLabel = startContent.labels[startingPoint.kind]
  }

  let startName: string = startContent.notSet
  if (locating) {
    startName = startContent.finding
  } else if (startingPoint !== null) {
    startName = startContent.labels[startingPoint.kind]
  }

  let StartIcon = MapPin
  if (startMissing) {
    StartIcon = CircleAlert
  } else if (locating) {
    StartIcon = LoaderCircle
  }

  return (
    <>
      {/* The one trip-date control, shared with Trail Detail and Trip
          Preparation (FEATURE-004 section 21.7). Here it stores the date for
          the next message. */}
      <TripDateControl
        id={PLANNER_IDS.dateControl}
        value={tripDate}
        onChange={setTripDate}
        open={open === "date"}
        onOpenChange={setDateOpen}
        attention={dateMissing}
        showIcon={!compact}
      />

      <span className="planner-context-slot">
        <button
          ref={startControlRef}
          id={PLANNER_IDS.startControl}
          type="button"
          className="planner-control planner-context"
          data-set={startingPoint !== null && !locating ? "" : undefined}
          data-missing={startMissing ? "" : undefined}
          aria-expanded={open === "start"}
          aria-controls={startPopoverId}
          aria-label={`${startContent.namePrefix}${startName}`}
          onClick={toggleStart}
        >
          {compact ? null : (
            <StartIcon
              aria-hidden="true"
              strokeWidth={2}
              className={locating && !startMissing ? "planner-spin" : undefined}
            />
          )}
          <span className="planner-context-label">{startLabel}</span>
        </button>

        {open === "start" ? (
          <StartPopover
            id={startPopoverId}
            popoverRef={startPopoverRef}
            chosen={startingPoint?.kind ?? null}
            lookup={lookup}
            onLocate={locate}
            onVancouver={chooseVancouver}
          />
        ) : null}
      </span>
    </>
  )
}

type StartPopoverProps = {
  id: string
  popoverRef: RefObject<HTMLDivElement | null>
  chosen: "device" | "vancouver" | null
  lookup: GeolocationLookup
  onLocate: () => void
  onVancouver: () => void
}

/**
 * "Where are you starting from?" (section 11.5.2). Two explicit choices.
 * The device's location is asked for only when its option is activated;
 * Vancouver is a fixed demo point and is never called the user's location.
 */
function StartPopover({
  id,
  popoverRef,
  chosen,
  lookup,
  onLocate,
  onVancouver,
}: StartPopoverProps) {
  const titleId = useId()

  useFocusOnOpen(popoverRef)

  const { startingPoint: content } = plannerContent
  const locating = lookup.status === "locating"
  const unsupported = lookup.status === "failed" && lookup.error === "unsupported"
  const deviceUnavailable = locating || unsupported

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

      <div className="planner-options">
        <button
          type="button"
          className="planner-control planner-option"
          aria-pressed={chosen === "device" && !locating}
          aria-disabled={deviceUnavailable ? true : undefined}
          onClick={() => {
            if (!deviceUnavailable) {
              onLocate()
            }
          }}
        >
          {locating ? (
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="planner-spin"
            />
          ) : (
            <LocateFixed aria-hidden="true" strokeWidth={2} />
          )}
          <span className="planner-option-text">
            <span className="planner-option-title">
              {locating ? content.findingOption : content.useDevice}
            </span>
            <span className="planner-option-hint">{content.useDeviceHint}</span>
          </span>
          {chosen === "device" && !locating ? (
            <Check
              aria-hidden="true"
              strokeWidth={2}
              className="planner-option-check"
            />
          ) : null}
        </button>

        <button
          type="button"
          className="planner-control planner-option"
          aria-pressed={chosen === "vancouver"}
          onClick={onVancouver}
        >
          <MapPin aria-hidden="true" strokeWidth={2} />
          <span className="planner-option-text">
            <span className="planner-option-title">{content.useVancouver}</span>
            <span className="planner-option-hint">{content.useVancouverHint}</span>
          </span>
          {chosen === "vancouver" ? (
            <Check
              aria-hidden="true"
              strokeWidth={2}
              className="planner-option-check"
            />
          ) : null}
        </button>
      </div>

      <p role="alert" className="planner-popover-alert">
        {lookup.status === "failed" ? (
          <span className="planner-popover-error">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{content.errors[lookup.error]}</span>
          </span>
        ) : null}
      </p>
    </div>
  )
}
