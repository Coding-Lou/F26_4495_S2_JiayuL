import type { PropsWithChildren } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { TripShell } from "@/components/layout/TripShell"
import type { useTripAnnouncer } from "@/components/layout/useTripAnnouncer"
import "../memories.css"

type MemoriesShellProps = PropsWithChildren<{
  announcer: Pick<ReturnType<typeof useTripAnnouncer>, "statusRef" | "alertRef">
}>

/**
 * Every Memory page is in the trip shell on its solid `ink` base, with the
 * trip header (FEATURE-009 section 22.1, D3). `.memories` scopes this
 * feature's rules.
 */
export function MemoriesShell({ announcer, children }: MemoriesShellProps) {
  return (
    <TripShell
      className="memories"
      announcer={
        <TripAnnouncer
          statusRef={announcer.statusRef}
          alertRef={announcer.alertRef}
        />
      }
    >
      {children}
    </TripShell>
  )
}

type JournalPageProps = PropsWithChildren<{
  /** The Back row above the sheet (section 22.1). */
  back: { to: string; label: string }
  /** Applied to the sheet, for its layout variants. */
  sheetProps?: { "data-layout"?: string }
}>

/**
 * The journal sheet of Detail, Create, and Edit (section 22.1): a Back row on
 * `ink`, then one `paper` sheet capped at 1440.
 */
export function JournalPage({ back, sheetProps, children }: JournalPageProps) {
  return (
    <div className="memory-journal">
      <div className="memory-back">
        <Link to={back.to} className="trip-control trip-link">
          <ArrowLeft aria-hidden="true" strokeWidth={2} />
          {back.label}
        </Link>
      </div>
      <div className="memory-sheet memory-journal-sheet" {...sheetProps}>
        {children}
      </div>
    </div>
  )
}
