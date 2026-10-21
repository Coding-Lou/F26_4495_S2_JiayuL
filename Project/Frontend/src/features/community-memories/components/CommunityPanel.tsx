import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react"
import { X } from "lucide-react"
import { useTripAnnouncer } from "@/components/layout/useTripAnnouncer"
import { communityContent } from "../content"
import { useCachedPreview, usePublicMemoryList } from "../hooks/communityQueries"
import { CommunityDetail } from "./CommunityDetail"
import { CommunityList } from "./CommunityList"
import "../community-memories.css"

export type CommunityPanelProps = {
  /**
   * `rail`: from 1024px, a non-modal docked rail over the map's far edge.
   * `sheet`: below 1024px, a modal bottom sheet (native `<dialog>`).
   */
  mode: "rail" | "sheet"
  /** The selected trail; the panel belongs to it (§9.3). */
  trailId: string
  trailName: string
  /** The public Memory shown, or null for the list. */
  memoryId: string | null
  /** Opened in the application: focus moves into it on arrival (§16). */
  focusOnOpen: boolean
  /** An entry of the list: show that Memory. */
  onOpenMemory: (memoryId: string) => void
  /** Back to Community Memories (from a Detail). */
  onBack: () => void
  /** Close: the panel goes, the popup returns. */
  onClose: () => void
}

/**
 * The Community panel (FEATURE-010 sections 9, 10, 18.3): a trail's public
 * Memories as a journal index, and one of them read in full, beside the map.
 * Its state is the address (`memories=1`, `memory=<id>`), owned by Discover;
 * this component only shows it and reports what the visitor asked for.
 *
 * A fixed header (the heading, the trail, the count, Close) over one body
 * that scrolls. The list and the Detail each keep their own scroll position.
 * One polite status region says the first list result, a Detail failure, and
 * an older page, once each; nothing else is announced.
 */
export function CommunityPanel({
  mode,
  trailId,
  trailName,
  memoryId,
  focusOnOpen,
  onOpenMemory,
  onBack,
  onClose,
}: CommunityPanelProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const { statusRef, announce, silence } = useTripAnnouncer()

  const showingList = memoryId === null
  const listQuery = usePublicMemoryList(trailId, showingList)
  const previewQuery = useCachedPreview(trailId)

  // The header's count: the newer of the list's answer (its last page) and
  // the preview's. While a Detail is open the list is not requested, but the
  // popup's preview still refreshes (on focus after staleness), so a change
  // in the public count shows here without a request of its own.
  const listPages = listQuery.data?.pages
  const listTotal = listPages?.[listPages.length - 1]?.totalItems
  const previewTotal = previewQuery.data?.totalItems
  const total =
    listTotal === undefined
      ? previewTotal
      : previewTotal === undefined ||
          listQuery.dataUpdatedAt >= previewQuery.dataUpdatedAt
        ? listTotal
        : previewTotal
  const countPending =
    total === undefined && showingList && listQuery.data === undefined && !listQuery.isError

  // A Detail reached by moving inside the panel (or opened in the app) takes
  // focus; one restored from the address on load does not.
  const [moved, setMoved] = useState({ memoryId, changed: false })
  if (moved.memoryId !== memoryId) {
    setMoved({ memoryId, changed: true })
  }
  const detailTakesFocus = moved.changed || focusOnOpen

  /** The list's scroll position, kept while a Detail is open (§18.3). */
  const listScroll = useRef(0)
  /** The Detail was opened from an entry of this list (for Back's focus). */
  const fromEntry = useRef<string | null>(null)
  const previousMemoryId = useRef<string | null | undefined>(undefined)

  function openMemory(id: string) {
    listScroll.current = bodyRef.current?.scrollTop ?? 0
    fromEntry.current = id
    onOpenMemory(id)
  }

  // Scroll: a Detail starts at the top; the list comes back where it was.
  useLayoutEffect(() => {
    const body = bodyRef.current
    const before = previousMemoryId.current
    if (body === null || before === undefined) {
      return
    }
    if (memoryId !== null) {
      body.scrollTo({ top: 0 })
    } else if (before !== null) {
      body.scrollTo({ top: listScroll.current })
    }
  }, [memoryId])

  // Focus (§18.8), after the sheet has been opened: on arrival the heading
  // (the Detail focuses its own title); back on the list, the entry that
  // opened the Detail, else the heading.
  useEffect(() => {
    const before = previousMemoryId.current
    previousMemoryId.current = memoryId
    if (memoryId !== null) {
      return
    }
    if (before === undefined) {
      if (focusOnOpen) {
        headingRef.current?.focus({ preventScroll: true })
      }
      return
    }
    if (before === null) {
      return
    }
    const opener = fromEntry.current
    fromEntry.current = null
    const entry =
      opener === null
        ? null
        : bodyRef.current?.querySelector<HTMLButtonElement>(
            `[data-memory-id="${opener}"]`,
          )
    if (entry !== null && entry !== undefined) {
      entry.focus({ preventScroll: true })
    } else {
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [memoryId, focusOnOpen])

  // The first list result is said once (§18.8). A failure that recovers
  // (Retry, or a refetch) says its result once more, which also replaces the
  // stale failure text in the region.
  const announcedList = useRef<"failed" | "settled" | null>(null)
  const listPhase =
    listQuery.data !== undefined
      ? listQuery.data.pages[0]?.totalItems === 0 &&
        listQuery.data.pages.every((page) => page.items.length === 0)
        ? "empty"
        : "loaded"
      : listQuery.isError
        ? "failed"
        : "loading"
  useEffect(() => {
    if (
      !showingList ||
      listPhase === "loading" ||
      announcedList.current === "settled" ||
      (announcedList.current === "failed" && listPhase === "failed")
    ) {
      return
    }
    announcedList.current = listPhase === "failed" ? "failed" : "settled"
    if (listPhase === "failed") {
      announce("status", communityContent.unavailable)
    } else if (listPhase === "empty") {
      announce("status", communityContent.empty)
    } else {
      const items = listQuery.data?.pages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      )
      announce(
        "status",
        communityContent.count(Math.max(listTotal ?? 0, items ?? 0)),
      )
    }
  }, [announce, listPhase, listQuery.data, listTotal, showingList])

  /** Escape: a Detail goes back to the list first, then the panel closes. */
  function escape() {
    if (memoryId !== null) {
      onBack()
    } else {
      onClose()
    }
  }

  const content = (
    <>
      <div className="cm-panel-header">
        <h3
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="cm-panel-title trip-focus-target"
        >
          {communityContent.heading}
        </h3>
        <p className="cm-panel-sub">
          <span className="cm-panel-trail">{trailName}</span>
          {total !== undefined && total >= 1 ? (
            <>
              <span aria-hidden="true">{" · "}</span>
              <span className="sr-only">, </span>
              <span className="cm-count">{communityContent.count(total)}</span>
            </>
          ) : countPending ? (
            <span className="cm-bar" data-bar="count" aria-hidden="true" />
          ) : null}
        </p>
      </div>

      <div ref={bodyRef} className="cm-panel-body">
        {memoryId === null ? (
          <CommunityList
            query={listQuery}
            labelledBy={headingId}
            bodyRef={bodyRef}
            announce={announce}
            onOpen={openMemory}
          />
        ) : (
          <CommunityDetail
            key={memoryId}
            memoryId={memoryId}
            trailId={trailId}
            trailName={trailName}
            moveFocus={detailTakesFocus}
            announce={announce}
            silence={silence}
            onBack={onBack}
          />
        )}
      </div>

      <p ref={statusRef} role="status" className="sr-only" />

      {/* Last in the DOM, drawn at the top right. */}
      <button
        type="button"
        className="trip-control cm-panel-close"
        aria-label={communityContent.close}
        onClick={onClose}
      >
        <X aria-hidden="true" strokeWidth={2} />
      </button>
    </>
  )

  const name = communityContent.panelName(trailName)

  if (mode === "sheet") {
    return (
      <CommunitySheet name={name} onEscape={escape} onDismiss={onClose}>
        {content}
      </CommunitySheet>
    )
  }

  return (
    <aside
      className="community-memories cm-panel"
      data-mode="rail"
      aria-label={name}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          escape()
        }
      }}
    >
      {content}
    </aside>
  )
}

type CommunitySheetProps = {
  name: string
  /** Escape (the dialog's `cancel`): Detail → list, then closed. */
  onEscape: () => void
  /** A backdrop tap, or the browser closing the dialog by itself. */
  onDismiss: () => void
  children: ReactNode
}

/**
 * The panel below 1024px (DESIGN_SYSTEM §36.7): a native `<dialog>` opened
 * with `showModal()`, so focus is trapped and the page behind is inert. It
 * exists only while the address says the panel is open; it is closed and
 * removed with it, so browser Back closes it in step (§22.2).
 */
function CommunitySheet({ name, onEscape, onDismiss, children }: CommunitySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const leaving = useRef(false)

  // Before any child's passive effect moves focus into it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) {
      return
    }
    leaving.current = false
    if (!dialog.open) {
      dialog.showModal()
    }
    return () => {
      leaving.current = true
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="community-memories cm-panel"
      data-mode="sheet"
      aria-label={name}
      onCancel={(event: SyntheticEvent<HTMLDialogElement>) => {
        // The address decides; the dialog never closes by itself.
        event.preventDefault()
        onEscape()
      }}
      onClose={(event: SyntheticEvent<HTMLDialogElement>) => {
        // A browser that closed it anyway: the address follows. A `close`
        // queued by an earlier cleanup that arrives after the dialog was
        // shown again (StrictMode's remount) is stale and ignored.
        if (!leaving.current && !event.currentTarget.open) {
          onDismiss()
        }
      }}
      onClick={(event) => {
        // Only the backdrop is the dialog itself: its content fills it.
        if (event.target === event.currentTarget) {
          onDismiss()
        }
      }}
    >
      {children}
    </dialog>
  )
}
