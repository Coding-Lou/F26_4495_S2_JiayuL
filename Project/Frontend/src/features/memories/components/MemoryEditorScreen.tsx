import { useEffect, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { isIsoDate, todayIso } from "@/features/planning/tripDate"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { isMemoryId, memoryFailureKindOf } from "../api/memories"
import { memoriesContent } from "../content"
import { useMemoryDetail } from "../hooks/memoryQueries"
import { JournalPage, MemoriesShell } from "./MemoriesShell"
import { TryAgainButton } from "./MemoryCommon"
import { MemoryEditor } from "./MemoryEditor"

type MemoryEditorScreenProps = {
  mode: "create" | "edit"
}

/**
 * Add a memory, `/memories/new` (optionally `?trail=<id>`, and from
 * FEATURE-014 `&date=<YYYY-MM-DD>`), and Edit memory,
 * `/memories/:memoryId/edit` (FEATURE-009 sections 9, 14, 22.9): one editor
 * on the journal sheet, under its Back row.
 */
export function MemoryEditorScreen({ mode }: MemoryEditorScreenProps) {
  const announcer = useTripAnnouncer()
  const { memoryId: routeId = "" } = useParams()

  return (
    <MemoriesShell announcer={announcer}>
      {mode === "create" ? (
        <CreateView announce={announcer.announce} />
      ) : (
        <EditView key={routeId} routeId={routeId} announce={announcer.announce} />
      )}
    </MemoriesShell>
  )
}

function CreateView({ announce }: { announce: Announce }) {
  const { editor, detail } = memoriesContent
  useDocumentTitle(memoriesContent.documentTitle.create)
  const [searchParams] = useSearchParams()
  // Read once on arrival (section 10.2).
  const [preselect] = useState(() => searchParams.get("trail"))
  // FEATURE-014 section 11: a real date that is not after today, or nothing.
  // Anything else is ignored without a word; the field starts empty.
  const [preselectDate] = useState(() => {
    const date = searchParams.get("date")
    return date !== null && isIsoDate(date) && date <= todayIso() ? date : null
  })
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <JournalPage
      back={{ to: "/memories", label: detail.back }}
      sheetProps={{ "data-layout": "editor" }}
    >
      <div className="memory-editor-head">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="trip-focus-target memory-editor-title"
        >
          {editor.createTitle}
        </h1>
        <p className="memory-editor-support">{editor.createSupport}</p>
      </div>
      <MemoryEditor
        mode="create"
        preselect={preselect}
        preselectDate={preselectDate}
        headingRef={headingRef}
        announce={announce}
      />
    </JournalPage>
  )
}

type EditViewState = "loading" | "not-found" | "unavailable" | "ready"

function EditView({ routeId, announce }: { routeId: string; announce: Announce }) {
  const { editor, detail } = memoriesContent
  const memoryId = isMemoryId(routeId) ? routeId.toLowerCase() : null
  const query = useMemoryDetail(memoryId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [gone, setGone] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const failure = query.isError ? memoryFailureKindOf(query.error) : null
  const state: EditViewState =
    memoryId === null || gone || failure === "not-found"
      ? "not-found"
      : query.data !== undefined
        ? "ready"
        : failure !== null && failure !== "no-session"
          ? "unavailable"
          : "loading"

  useDocumentTitle(
    state === "not-found"
      ? memoriesContent.documentTitle.notFound
      : memoriesContent.documentTitle.edit,
  )

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [state])

  const back =
    memoryId !== null && state !== "not-found"
      ? { to: `/memories/${memoryId}`, label: editor.backToMemory }
      : { to: "/memories", label: detail.back }

  if (state === "ready" && query.data !== undefined) {
    return (
      <JournalPage back={back} sheetProps={{ "data-layout": "editor" }}>
        <div className="memory-editor-head">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="trip-focus-target memory-editor-title"
          >
            {editor.editTitle}
          </h1>
        </div>
        <MemoryEditor
          mode="edit"
          memory={query.data}
          query={query}
          headingRef={headingRef}
          announce={announce}
          onGone={() => setGone(true)}
        />
      </JournalPage>
    )
  }

  return (
    <JournalPage back={back} sheetProps={{ "data-layout": "single" }}>
      <div className="memory-detail-state">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="trip-focus-target memory-editor-title"
        >
          {state === "loading" ? (
            <>
              <span className="memory-skeleton-bar" data-bar="h1" aria-hidden="true" />
              <span className="sr-only">{detail.loading}</span>
            </>
          ) : state === "not-found" ? (
            detail.notFoundTitle
          ) : (
            detail.unavailableTitle
          )}
        </h1>
        {state === "not-found" ? (
          <>
            <p className="memory-state-body">{detail.notFoundBody}</p>
            <p className="memory-state-action">
              <Link to="/memories" className="trip-control trip-button">
                <ArrowLeft aria-hidden="true" strokeWidth={2} />
                {detail.back}
              </Link>
            </p>
          </>
        ) : null}
        {state === "unavailable" ? (
          <>
            <p className="memory-state-body">{detail.unavailableBody}</p>
            <p className="memory-state-action">
              <TryAgainButton
                working={retrying}
                onRetry={() => {
                  setRetrying(true)
                  void query.refetch().finally(() => setRetrying(false))
                }}
              />
            </p>
          </>
        ) : null}
      </div>
    </JournalPage>
  )
}
