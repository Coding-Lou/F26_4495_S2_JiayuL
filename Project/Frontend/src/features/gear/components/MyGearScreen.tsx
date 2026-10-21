import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Info, Plus } from "lucide-react"
import { TripAnnouncer } from "@/components/layout/TripAnnouncer"
import { TripShell } from "@/components/layout/TripShell"
import {
  useTripAnnouncer,
  type Announce,
} from "@/components/layout/useTripAnnouncer"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { gearFailureKindOf } from "../api/gearItems"
import { gearSummaryText, myGearContent } from "../content"
import { gearFamilyOf, type GearFamilyChoice } from "../families"
import { useAddGearItem, useGearItems } from "../hooks/useGearItems"
import {
  useRemoveGearItem,
  useUpdateGearItem,
} from "../hooks/useGearItemChanges"
import {
  itemsInFamily,
  knownCategoryCount,
  presentFamilies,
} from "../model/myGearModel"
import {
  isGearCategory,
  type GearCategory,
  type GearFailureKind,
  type GearItem,
} from "../types/gear"
import { GearCard, GearCardSkeleton } from "./GearCard"
import { GearEmptyState, GearUnavailableState } from "./GearCollectionStates"
import { GearDetail } from "./GearDetail"
import { GearDetailPanel, GearDetailSheet } from "./GearDetailSurfaces"
import { GearFamilySelector } from "./GearFamilySelector"
import { GearFormDialog, type GearFormResult } from "./GearFormDialog"
import "../my-gear.css"

/** From here the detail is a panel beside the grid; below, a sheet (D16). */
const PANEL_QUERY = "(min-width: 1024px)"

/** Loading slots, two rows at 1440×900 (section 21.12). */
const SKELETON_COUNT = 10

type FormState =
  | { mode: "add"; opener: HTMLElement | null }
  | { mode: "edit"; item: GearItem; opener: HTMLElement | null }

/** Where focus goes once the screen has rendered a change (section 21.17). */
type FocusRequest =
  | { kind: "detail-heading"; cardId: string; reveal: boolean }
  | { kind: "card"; id: string }
  | { kind: "edit" }
  | { kind: "remove" }
  | { kind: "title" }
  | { kind: "title-if-lost" }
  | { kind: "empty-heading" }
  | { kind: "opener"; element: HTMLElement | null; fallbackId: string | null }

/**
 * My Gear, `/gear` (FEATURE-007): the signed-in user's permanent collection
 * of owned gear, as slots on one `paper` sheet in the trip shell. Ownership
 * only: nothing here knows about trips, recommendations, or what is equipped.
 *
 * Server state is the existing gear list query; selection, the chosen
 * family, and open forms are this screen's React state and nothing else.
 */
export function MyGearScreen() {
  useDocumentTitle(myGearContent.documentTitle)
  const { statusRef, alertRef, announce } = useTripAnnouncer()

  return (
    <TripShell
      className="my-gear"
      announcer={<TripAnnouncer statusRef={statusRef} alertRef={alertRef} />}
    >
      <MyGearView announce={announce} />
    </TripShell>
  )
}

function MyGearView({ announce }: { announce: Announce }) {
  const { announce: say, remove, form: formCopy } = myGearContent

  const gearQuery = useGearItems(true)
  const addGear = useAddGearItem()
  const updateGear = useUpdateGearItem()
  const removeGear = useRemoveGearItem()
  const wide = useMediaQuery(PANEL_QUERY)

  const detailId = useId()
  const headingId = useId()
  const gridHeadingId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [family, setFamily] = useState<GearFamilyChoice>("all")
  const [form, setForm] = useState<FormState | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [arrivedId, setArrivedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  // The selection as it is now, for a removal that ends after the user has
  // moved on.
  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    selectedIdRef.current = selectedId
  })

  const items = gearQuery.data
  const families = items !== undefined ? presentFamilies(items) : []
  const selectorShown = families.length >= 2

  // A chosen family that has no items left, or a selector that is no longer
  // shown, returns to All (section 11.4).
  if (
    family !== "all" &&
    items !== undefined &&
    (!selectorShown || !families.includes(family))
  ) {
    setFamily("all")
  }
  const activeFamily: GearFamilyChoice =
    family !== "all" && selectorShown && families.includes(family)
      ? family
      : "all"

  const selected =
    selectedId !== null && items !== undefined
      ? (items.find((item) => item.id === selectedId) ?? null)
      : null

  // The selected item left the list without being removed here: it was
  // removed in another tab or session (section 21.8).
  if (
    selectedId !== null &&
    items !== undefined &&
    selected === null &&
    removingId !== selectedId
  ) {
    setSelectedId(null)
    setConfirming(false)
    setRemoveError(null)
    setNotice(myGearContent.gone)
    setFocusRequest({ kind: "title-if-lost" })
  }

  const failure = gearQuery.isError ? gearFailureKindOf(gearQuery.error) : null
  const phase: "loading" | "unavailable" | "empty" | "ready" =
    items !== undefined
      ? items.length === 0
        ? "empty"
        : "ready"
      : failure !== null && failure !== "no-session"
        ? "unavailable"
        : "loading"

  const visible = items !== undefined ? itemsInFamily(items, activeFamily) : []
  const detailOpen = phase === "ready" && selected !== null

  useEffect(() => {
    if (focusRequest === null) {
      return
    }
    const root = rootRef.current
    if (root === null) {
      return
    }
    const card = (id: string) =>
      root.querySelector<HTMLElement>(`[data-gear-card="${CSS.escape(id)}"]`)

    switch (focusRequest.kind) {
      case "detail-heading":
        // The grid narrowed: show the selected card if it moved out of view.
        if (focusRequest.reveal) {
          card(focusRequest.cardId)?.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: "instant",
          })
        }
        root
          .querySelector<HTMLElement>("[data-gear-detail-heading]")
          ?.focus({ preventScroll: true })
        break
      case "card":
        card(focusRequest.id)?.focus()
        break
      case "edit":
        root.querySelector<HTMLElement>('[data-gear-action="edit"]')?.focus()
        break
      case "remove":
        root.querySelector<HTMLElement>('[data-gear-action="remove"]')?.focus()
        break
      case "title":
        titleRef.current?.focus()
        break
      case "title-if-lost": {
        const active = document.activeElement
        if (active === null || active === document.body) {
          titleRef.current?.focus()
        }
        break
      }
      case "empty-heading":
        emptyHeadingRef.current?.focus()
        break
      case "opener":
        if (focusRequest.element?.isConnected) {
          focusRequest.element.focus()
        } else if (focusRequest.fallbackId !== null) {
          card(focusRequest.fallbackId)?.focus()
        }
        break
    }
  }, [focusRequest])

  function activateCard(id: string) {
    setConfirming(false)
    setRemoveError(null)
    if (id === selectedId) {
      // The selected card again: the detail closes and focus stays.
      setSelectedId(null)
      return
    }
    setSelectedId(id)
    setNotice(null)
    setFocusRequest({ kind: "detail-heading", cardId: id, reveal: wide })
  }

  function closeDetail() {
    if (selectedId === null) {
      return
    }
    const id = selectedId
    setSelectedId(null)
    setConfirming(false)
    setRemoveError(null)
    setFocusRequest({ kind: "card", id })
  }

  // Escape while focus is on a card or in the panel closes the panel.
  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "Escape" ||
      !wide ||
      selectedId === null ||
      removingId === selectedId
    ) {
      return
    }
    event.preventDefault()
    closeDetail()
  }

  function chooseFamily(next: GearFamilyChoice) {
    setFamily(next)
    if (
      selected !== null &&
      next !== "all" &&
      gearFamilyOf(selected.category) !== next
    ) {
      setSelectedId(null)
      setConfirming(false)
      setRemoveError(null)
    }
  }

  function openAdd(opener: HTMLElement) {
    setNotice(null)
    setForm({ mode: "add", opener })
  }

  function openEdit(opener: HTMLElement) {
    if (selected !== null) {
      setForm({ mode: "edit", item: selected, opener })
    }
  }

  function closeForm() {
    const opener = form?.opener ?? null
    setForm(null)
    setFocusRequest({ kind: "opener", element: opener, fallbackId: null })
  }

  /** An add or edit that leaves the chosen family shows All (D17). */
  function keepVisible(category: GearCategory) {
    if (activeFamily !== "all" && gearFamilyOf(category) !== activeFamily) {
      setFamily("all")
    }
  }

  async function submitForm(
    name: string,
    category: GearCategory,
  ): Promise<GearFormResult> {
    if (form === null) {
      return { ok: false, message: null }
    }

    if (form.mode === "add") {
      try {
        const created = await addGear.mutateAsync({ name, category })
        keepVisible(category)
        setForm(null)
        setArrivedId(created?.id ?? null)
        announce("status", say.added(created?.name ?? name))
        setFocusRequest({
          kind: "opener",
          element: form.opener,
          fallbackId: created?.id ?? null,
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, message: addFailureText(gearFailureKindOf(error)) }
      }
    }

    const { item } = form
    // `PUT` replaces every field: the description goes back unchanged.
    const current = items?.find((entry) => entry.id === item.id) ?? item
    try {
      const saved = await updateGear.mutateAsync({
        id: item.id,
        request: { name, category, description: current.description },
      })
      keepVisible(category)
      setForm(null)
      announce("status", say.saved(saved?.name ?? name))
      setFocusRequest({ kind: "edit" })
      return { ok: true }
    } catch (error) {
      const kind = gearFailureKindOf(error)
      if (kind === "not-found") {
        // Removed elsewhere: say so, close everything, and catch up.
        setForm(null)
        setSelectedId(null)
        setConfirming(false)
        setRemoveError(null)
        setNotice(myGearContent.gone)
        setFocusRequest({ kind: "title" })
        return { ok: true }
      }
      return { ok: false, message: editFailureText(kind) }
    }
  }

  function askRemove() {
    setRemoveError(null)
    setConfirming(true)
  }

  function cancelRemove() {
    setConfirming(false)
    setRemoveError(null)
    setFocusRequest({ kind: "remove" })
  }

  async function confirmRemove() {
    if (selected === null || items === undefined || removingId !== null) {
      return
    }
    const item = selected
    const allBefore = items
    const shownBefore = visible
    const familyBefore = activeFamily

    setRemovingId(item.id)
    setRemoveError(null)
    try {
      await removeGear.mutateAsync(item.id)
    } catch (error) {
      setRemovingId(null)
      const kind = gearFailureKindOf(error)
      setRemoveError(
        kind === "no-session"
          ? null
          : kind === "timeout"
            ? remove.timedOut
            : remove.failed,
      )
      return
    }

    setRemovingId(null)
    announce("status", say.removed(item.name))
    if (selectedIdRef.current !== item.id) {
      return
    }
    setSelectedId(null)
    setConfirming(false)
    setRemoveError(null)
    setFocusRequest(
      focusAfterRemoval(allBefore, shownBefore, familyBefore, item.id),
    )
  }

  const detail =
    detailOpen && selected !== null ? (
      <GearDetail
        item={selected}
        headingId={headingId}
        variant={wide ? "panel" : "sheet"}
        confirming={confirming}
        removing={removingId === selected.id}
        removeError={removeError}
        onEdit={openEdit}
        onAskRemove={askRemove}
        onCancelRemove={cancelRemove}
        onConfirmRemove={() => void confirmRemove()}
        onClose={closeDetail}
      />
    ) : null

  return (
    <div ref={rootRef} className="gear-sheet">
      <div className="gear-title-row">
        <div className="gear-title-text">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="trip-focus-target gear-title"
          >
            {myGearContent.title}
          </h1>
          <p className="gear-support">{myGearContent.support}</p>
          {phase === "ready" && items !== undefined ? (
            <p className="gear-summary">
              {gearSummaryText(items.length, knownCategoryCount(items))}
            </p>
          ) : null}
        </div>
        {phase === "ready" ? (
          <button
            type="button"
            className="trip-control gear-primary"
            onClick={(event) => openAdd(event.currentTarget)}
          >
            <Plus aria-hidden="true" strokeWidth={2} />
            {myGearContent.addGear}
          </button>
        ) : null}
      </div>

      <div role="status" className="gear-notice">
        {notice !== null ? (
          <>
            <Info aria-hidden="true" strokeWidth={2} />
            <span>{notice}</span>
          </>
        ) : null}
      </div>

      {phase === "loading" ? (
        <section className="gear-collection" aria-labelledby={gridHeadingId}>
          <h2 id={gridHeadingId} className="sr-only">
            {myGearContent.gridHeading}
          </h2>
          <ul className="gear-grid" aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <GearCardSkeleton key={index} />
            ))}
          </ul>
          <p role="status" className="sr-only">
            {myGearContent.loading}
          </p>
        </section>
      ) : null}

      {phase === "empty" ? (
        <GearEmptyState headingRef={emptyHeadingRef} onAdd={openAdd} />
      ) : null}

      {phase === "unavailable" ? (
        <GearUnavailableState
          retrying={gearQuery.isFetching}
          onRetry={() => void gearQuery.refetch()}
        />
      ) : null}

      {phase === "ready" ? (
        <>
          {selectorShown ? (
            <GearFamilySelector
              families={families}
              chosen={activeFamily}
              onChoose={chooseFamily}
            />
          ) : null}
          <div className="gear-row" onKeyDown={handleRowKeyDown}>
            <section
              className="gear-collection"
              aria-labelledby={gridHeadingId}
            >
              <h2 id={gridHeadingId} className="sr-only">
                {myGearContent.gridHeading}
              </h2>
              <ul className="gear-grid">
                {visible.map((item) => (
                  <GearCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    detailId={detailOpen ? detailId : null}
                    arrived={item.id === arrivedId}
                    onActivate={activateCard}
                    onArrivalEnd={() => setArrivedId(null)}
                  />
                ))}
              </ul>
            </section>
            {wide && detail !== null ? (
              <GearDetailPanel id={detailId} headingId={headingId}>
                {detail}
              </GearDetailPanel>
            ) : null}
          </div>
        </>
      ) : null}

      {!wide && detail !== null && selected !== null ? (
        <GearDetailSheet
          id={detailId}
          headingId={headingId}
          blocked={removingId === selected.id}
          onRequestClose={closeDetail}
        >
          {detail}
        </GearDetailSheet>
      ) : null}

      {form !== null ? (
        <GearFormDialog
          mode={form.mode}
          initialName={form.mode === "edit" ? form.item.name : ""}
          initialCategory={
            form.mode === "edit" && isGearCategory(form.item.category)
              ? form.item.category
              : null
          }
          onSubmit={submitForm}
          onClose={closeForm}
        />
      ) : null}
    </div>
  )

  function addFailureText(kind: GearFailureKind): string | null {
    switch (kind) {
      case "timeout":
        return formCopy.addTimedOut
      case "rejected":
        return formCopy.rejected
      case "no-session":
        // FEATURE-002 takes over; nothing of this feature's is drawn.
        return null
      default:
        return formCopy.addFailed
    }
  }

  function editFailureText(kind: GearFailureKind): string | null {
    switch (kind) {
      case "timeout":
        return formCopy.editTimedOut
      case "rejected":
        return formCopy.rejected
      case "no-session":
        return null
      default:
        return formCopy.editFailed
    }
  }
}

/**
 * Focus after a removal (section 21.11): the card now at the removed card's
 * position in the visible grid, else the one before it. When the chosen
 * family has emptied, the same rule applies to All. When nothing is left,
 * the empty state's heading.
 */
function focusAfterRemoval(
  allBefore: readonly GearItem[],
  shownBefore: readonly GearItem[],
  familyBefore: GearFamilyChoice,
  removedId: string,
): FocusRequest {
  const remaining = allBefore.filter((item) => item.id !== removedId)
  if (remaining.length === 0) {
    return { kind: "empty-heading" }
  }

  const familyEmptied =
    familyBefore !== "all" &&
    !remaining.some((item) => gearFamilyOf(item.category) === familyBefore)
  const list = familyEmptied ? allBefore : shownBefore
  const index = list.findIndex((item) => item.id === removedId)
  const rest = list.filter((item) => item.id !== removedId)
  const target = rest[index] ?? rest[index - 1]

  return target !== undefined ? { kind: "card", id: target.id } : { kind: "title" }
}
