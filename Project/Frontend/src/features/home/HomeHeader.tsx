import { useEffect, useId, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { AccountControls } from "@/features/auth"
import { NewPlanButton } from "@/features/planning/components/NewPlanButton"
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

type HomeAccountProps = {
  /**
   * Which part of the account controls this instance shows. Where the two
   * are separated by another item (the Menu), each is rendered on its own.
   */
  part?: "identity" | "sign-out"
}

/**
 * The signed-in identity and Sign out, exactly as FEATURE-002 defines them:
 * this is its own `AccountControls`, with the same fallback order, the same
 * immediate sign-out, and the same working state. Only the presentation over
 * media is the Home's (FEATURE-003 section 9.5), applied by `home.css`.
 */
function HomeAccount({ part }: HomeAccountProps) {
  return (
    <div className="home-account" data-part={part}>
      <AccountControls />
    </div>
  )
}

/**
 * The Home header (FEATURE-003 sections 9.5, 17.2): one row over the header
 * scrim. From 1024px the brand and New Plan span exactly the panel's width,
 * so the action sits above the thing it clears. Below 768px the account and
 * Gear move into a Menu.
 *
 * DOM order is the visual order at every width: brand, New Plan, Gear,
 * identity, Sign out.
 */
export function HomeHeader() {
  const wide = useMediaQuery(WIDE_HEADER_QUERY)

  return (
    <header className="home-header">
      <div className="home-header-start">
        <Link to="/home" className="home-control home-brand">
          <span>{HEADER_CONTENT.brandStart}</span>{" "}
          <span>{HEADER_CONTENT.brandEnd}</span>
        </Link>
        <NewPlanButton />
      </div>

      {wide ? (
        <div className="home-header-end">
          <Link to="/gear" className="home-control home-nav-link">
            {HEADER_CONTENT.gear}
          </Link>
          <HomeAccount />
        </div>
      ) : (
        <HomeMenu />
      )}
    </header>
  )
}

/**
 * Below 768px: a Menu holding the identity, Gear, and Sign out (section
 * 17.2). It closes on Escape, a press outside, or focus leaving it. While
 * sign-out is working it stays open and its row shows the working state.
 */
function HomeMenu() {
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
        className="home-control home-quiet home-menu-button"
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
          className="home-menu"
          role="group"
          aria-labelledby={buttonId}
        >
          <HomeAccount part="identity" />
          <Link to="/gear" className="home-control home-menu-link">
            {HEADER_CONTENT.gear}
          </Link>
          <HomeAccount part="sign-out" />
        </div>
      ) : null}
    </>
  )
}
