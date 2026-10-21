import { useEffect, useId, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { Link, useMatch } from "react-router-dom"
import { AccountControls } from "@/features/auth"
import { useDismissable } from "@/lib/useDismissable"
import { useMediaQuery } from "@/lib/useMediaQuery"

/** From here the header is one row; below it, a Menu holds the account. */
const WIDE_HEADER_QUERY = "(min-width: 768px)"

/** The Plans link marks itself as the current page here only (FEATURE-013 D3). */
const PLANS_PATH = "/plans"

/** The Gear link marks itself as the current page here only (FEATURE-007 D13). */
const GEAR_PATH = "/gear"

/**
 * The Memories link marks itself as the current page on `/memories` exactly,
 * never on a Memory, Add, or Edit page (FEATURE-009 D4).
 */
const MEMORIES_PATH = "/memories"

const HEADER_CONTENT = {
  brandStart: "Outdoor Trip",
  brandEnd: "Companion",
  /** FEATURE-013 PL1 */
  plans: "Plans",
  gear: "Gear",
  /** FEATURE-009 MM7 */
  memories: "Memories",
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
 * DOM order is the visual order at every width: brand, Plans, Gear,
 * Memories, identity, Sign out. Below 768px the account, Plans, Gear, and
 * Memories move into a Menu.
 */
export function TripHeader({ surface }: TripHeaderProps) {
  const wide = useMediaQuery(WIDE_HEADER_QUERY)
  const onPlans = useMatch({ path: PLANS_PATH, end: true }) !== null
  const onGear = useMatch({ path: GEAR_PATH, end: true }) !== null
  const onMemories = useMatch({ path: MEMORIES_PATH, end: true }) !== null

  return (
    <header className="trip-header" data-surface={surface}>
      <Link to="/home" className="trip-control trip-brand">
        <span>{HEADER_CONTENT.brandStart}</span>{" "}
        <span>{HEADER_CONTENT.brandEnd}</span>
      </Link>

      {wide ? (
        <div className="trip-header-end">
          <Link
            to={PLANS_PATH}
            className="trip-control trip-nav-link"
            aria-current={onPlans ? "page" : undefined}
          >
            {HEADER_CONTENT.plans}
          </Link>
          <Link
            to={GEAR_PATH}
            className="trip-control trip-nav-link"
            aria-current={onGear ? "page" : undefined}
          >
            {HEADER_CONTENT.gear}
          </Link>
          <Link
            to={MEMORIES_PATH}
            className="trip-control trip-nav-link"
            aria-current={onMemories ? "page" : undefined}
          >
            {HEADER_CONTENT.memories}
          </Link>
          <TripAccount />
        </div>
      ) : (
        <TripMenu onPlans={onPlans} onGear={onGear} onMemories={onMemories} />
      )}
    </header>
  )
}

type TripMenuProps = {
  /** The page is My Plans: its row is marked as the current page. */
  onPlans: boolean
  /** The page is My Gear: its row is marked as the current page. */
  onGear: boolean
  /** The page is My Memories: its row is marked as the current page. */
  onMemories: boolean
}

/**
 * Below 768px: a Menu holding the identity, Plans, Gear, Memories, and Sign
 * out. It
 * closes on Escape, a press outside, or focus leaving it. While sign-out is
 * working it stays open and its row shows the working state.
 */
function TripMenu({ onPlans, onGear, onMemories }: TripMenuProps) {
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
          <Link
            to={PLANS_PATH}
            className="trip-control trip-menu-link"
            aria-current={onPlans ? "page" : undefined}
          >
            {HEADER_CONTENT.plans}
          </Link>
          <Link
            to={GEAR_PATH}
            className="trip-control trip-menu-link"
            aria-current={onGear ? "page" : undefined}
          >
            {HEADER_CONTENT.gear}
          </Link>
          <Link
            to={MEMORIES_PATH}
            className="trip-control trip-menu-link"
            aria-current={onMemories ? "page" : undefined}
          >
            {HEADER_CONTENT.memories}
          </Link>
          <TripAccount part="sign-out" />
        </div>
      ) : null}
    </>
  )
}
