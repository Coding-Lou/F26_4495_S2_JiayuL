import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { useTripAnnouncer } from "@/components/layout/useTripAnnouncer"
import { takeAuthBoundaryArrivalFocus } from "@/features/auth/authBoundary"
import { LandingHero } from "@/features/landing/LandingHero"
import { isTrailId } from "@/features/trails/trailId"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { discoverContent } from "../content"
import {
  DISCOVER_ID,
  DiscoverSection,
  type DiscoverSectionHandle,
} from "./DiscoverSection"
import { PublicHeader } from "./PublicHeader"
import "../discover.css"

const DISCOVER_HREF = `#${DISCOVER_ID}`

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** A plain primary click: anything else keeps the link's own behaviour. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * The public homepage at `/` for signed-out visitors (FEATURE-006 sections
 * 1, 16.3): the fixed public header over one scrolling document of two
 * sections, the Hero, then Discover. No footer: the document ends at
 * Discover's bottom edge, so its end is exactly the aligned Discover view.
 *
 * Signed-in visitors never see it (`PublicLandingRoute`).
 */
export function PublicHomeScreen() {
  useDocumentTitle(discoverContent.title)

  const location = useLocation()
  const navigate = useNavigate()
  const { statusRef, alertRef, announce, silence } = useTripAnnouncer()
  const heroHeadingRef = useRef<HTMLHeadingElement>(null)
  const discoverRef = useRef<DiscoverSectionHandle>(null)

  /*
   * Arrival focus (16.15.2): on a fresh load focus stays at the document
   * start. Arriving from elsewhere in the application (a closed protected
   * route, a sign-out, an ended session), it goes to the Hero `h1`, or, with
   * a `trail` in the address, to that trail's row (Discover's own task).
   */
  const [arrival] = useState(() => ({
    inApp: location.key !== "default",
    withTrail: isTrailId(new URLSearchParams(location.search).get("trail")),
  }))

  useEffect(() => {
    // Taken in every case, so a queued request does not outlive this visit.
    const queued = takeAuthBoundaryArrivalFocus()
    if ((queued || arrival.inApp) && !arrival.withTrail) {
      heroHeadingRef.current?.focus({ preventScroll: true })
    }
  }, [arrival])

  /** The brand on the homepage: back to the top, any popup closed (16.4). */
  function handleBrand(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) {
      return
    }
    event.preventDefault()
    void navigate({ pathname: "/", search: "", hash: "" }, { replace: true })
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "instant" : "smooth" })
    heroHeadingRef.current?.focus({ preventScroll: true })
  }

  /** Explore trails and the header's Discover (16.6). No route change. */
  function handleExplore(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) {
      return
    }
    event.preventDefault()
    discoverRef.current?.goTo()
  }

  return (
    <div className="trip public-home">
      <PublicHeader
        discoverHref={DISCOVER_HREF}
        onBrand={handleBrand}
        onDiscover={handleExplore}
      />

      <main className="public-home-main">
        <LandingHero
          headingRef={heroHeadingRef}
          exploreHref={DISCOVER_HREF}
          onExplore={handleExplore}
        />

        <DiscoverSection
          ref={discoverRef}
          announce={announce}
          silence={silence}
          arrivalFocus={arrival.inApp && arrival.withTrail}
        />
      </main>

      <TripAnnouncer statusRef={statusRef} alertRef={alertRef} />
    </div>
  )
}
