import { useEffect, useId, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { AccountControls } from "@/features/auth"
import { useDismissable } from "@/lib/useDismissable"
import { useMediaQuery } from "@/lib/useMediaQuery"

/** From here the header is one row; below it, a Menu holds the account. */
const WIDE_HEADER_QUERY = "(min-width: 768px)"

const HEADER_CONTENT = {
  brandStart: "Outdoor Trip",
  brandEnd: "Companion",
  gear: "Gear",
  menu: "Menu",
} as const

export type TripHeaderSurface = "base" | "scene"

type TripHeaderProps = {
  /**
   * What the header's text stands on: the shell's solid base, which needs
   * nothing, or a scene, which needs the scrims of FEATURE-004 section 14.3.3.
   */
  surface: TripHeaderSurface
}

type TripAccountProps = {
  /**
   * Which part of the account controls this instance shows. Where the two
   * are separated by another item (the Menu), each is rendered on its own.
   */
  part?: "identity" | "sign-out"
}

/**
 * The signed-in identity and Sign out, exactly as FEATURE-002 defines them:
 * its own `AccountControls`, with only the presentation on a dark surface
 * applied by `trip-shell.css`.
 */
function TripAccount({ part }: TripAccountProps) {
  return (
    <div className="trip-account" data-part={part}>
      <AccountControls />
    </div>
  )
}

/**
 * The header of Trail Detail and Trip Preparation (FEATURE-004 section 21.2):
 * the Authenticated Home's header with New Plan left out, because New Plan
 * clears the planner's conversation and belongs to `/home` only. Nothing
 * takes its place.
 *
 * DOM order is the visual order at every width: brand, Gear, identity,
 * Sign out. Below 768px the account and Gear move into a Menu.
 */
export function TripHeader({ surface }: TripHeaderProps) {
  const wide = useMediaQuery(WIDE_HEADER_QUERY)

  return (
    <header className="trip-header" data-surface={surface}>
      <Link to="/home" className="trip-control trip-brand">
        <span>{HEADER_CONTENT.brandStart}</span>{" "}
        <span>{HEADER_CONTENT.brandEnd}</span>
      </Link>

      {wide ? (
        <div className="trip-header-end">
          <Link to="/gear" className="trip-control trip-nav-link">
            {HEADER_CONTENT.gear}
          </Link>
          <TripAccount />
        </div>
      ) : (
        <TripMenu />
      )}
    </header>
  )
}

/**
 * Below 768px: a Menu holding the identity, Gear, and Sign out. It closes on
 * Escape, a press outside, or focus leaving it. While sign-out is working it
 * stays open and its row shows the working state.
 */
function TripMenu() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const buttonId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useDismissable({
    open,
    parts: [menuRef, buttonRef],
    onDismiss: (reason) => {
      setOpen(false)
      if (reason === "escape") {
        buttonRef.current?.focus()
      }
    },
  })

  // Focus moves to the first control inside when the menu opens.
  useEffect(() => {
    if (open) {
      menuRef.current?.querySelector<HTMLElement>("a, button")?.focus()
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="trip-control trip-quiet trip-menu-button"
        aria-label={HEADER_CONTENT.menu}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.currentTarget.focus()
          setOpen((current) => !current)
        }}
      >
        <Menu aria-hidden="true" strokeWidth={2} />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          className="trip-menu"
          role="group"
          aria-labelledby={buttonId}
        >
          <TripAccount part="identity" />
          <Link to="/gear" className="trip-control trip-menu-link">
            {HEADER_CONTENT.gear}
          </Link>
          <TripAccount part="sign-out" />
        </div>
      ) : null}
    </>
  )
}
