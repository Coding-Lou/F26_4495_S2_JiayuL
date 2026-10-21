import type { PropsWithChildren, ReactNode } from "react"
import { useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"
import { TripHeader, type TripHeaderSurface } from "./TripHeader"

type TripShellProps = PropsWithChildren<{
  /** The screen's own class, where its per-tier values are set. */
  className?: string
  headerSurface?: TripHeaderSurface
  /**
   * Decorative layers behind the page. They are siblings of the content and
   * share nothing with it; each hides itself from assistive technology.
   */
  backdrop?: ReactNode
  /** The screen's announcer, after `main` in the document. */
  announcer?: ReactNode
}>

/**
 * The full-viewport shell of Trail Detail and Trip Preparation (FEATURE-004
 * section 21.1): the `ink` base, the header, and one `main`. It stands inside
 * the protected route and outside the application layout, as the
 * Authenticated Home does.
 *
 * While sign-out is in flight the page stays but cannot be used, as
 * FEATURE-002 defines for every authenticated screen.
 */
export function TripShell({
  className,
  headerSurface = "base",
  backdrop,
  announcer,
  children,
}: TripShellProps) {
  const { status } = useAuth()
  const signingOut = status === "signing-out"

  return (
    <div className={cn("trip", className)}>
      {backdrop}

      <TripHeader surface={headerSurface} />

      <main
        className="trip-main"
        inert={signingOut}
        aria-busy={signingOut ? true : undefined}
      >
        {children}
      </main>

      {announcer}
    </div>
  )
}
