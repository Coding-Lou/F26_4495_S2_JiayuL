import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react"
import { CircleAlert, CircleCheck, RotateCw } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import type { Announce } from "@/components/layout/useTripAnnouncer"
import { isIsoDate, todayIso } from "@/features/planning/tripDate"
import { isTrailId } from "@/features/trails/trailId"
import { useMediaQuery } from "@/lib/useMediaQuery"
import {
  memoryFailureFieldsOf,
  memoryFailureKindOf,
} from "../api/memories"
import { memoriesContent } from "../content"
import { noticeState } from "../hooks/useArrivalNotice"
import { useLeaveGuard } from "../hooks/useLeaveGuard"
import { useLocalPhotos, type LocalPhoto } from "../hooks/useLocalPhotos"
import type { useMemoryDetail } from "../hooks/memoryQueries"
import { useMemoryChanges } from "../hooks/useMemoryChanges"
import { usePhotoRecovery } from "../hooks/usePhotoRecovery"
import { useTrailLookup } from "../model/memoryText"
import { checkPickedFile, MAX_PHOTOS, type PhotoRejection } from "../photos/preparePhoto"
import type {
  MemoryDetail,
  MemoryFailureKind,
  MemoryVisibility,
} from "../types/memory"
import {
  FieldLabel,
  HelperRow,
  TrailField,
  VisibilityChoice,
} from "./EditorFields"
import { LeaveDialog } from "./LeaveDialog"
import { InlineAlert, WorkingLabel } from "./MemoryCommon"
import {
  PhotoSection,
  type ControlState,
  type PhotoStatusLine,
  type PhotoTileModel,
} from "./PhotoSection"

/** Title: 1–120 characters after trimming; the counter from 100 (9.1). */
const TITLE_MAX = 120
const TITLE_COUNTER_FROM = 100
/** Story: at most 5000; the counter from 4500 (9.1). */
const STORY_MAX = 5000
const STORY_COUNTER_FROM = 4500

type Field = "trail" | "tripDate" | "title" | "story"
type FieldErrors = Partial<Record<Field, string>>
const FIELD_ORDER: readonly Field[] = ["trail", "tripDate", "title", "story"]

type Values = {
  trailId: string
  tripDate: string
  title: string
  story: string
  visibility: MemoryVisibility
}

/**
 * Create:  editing → saving (the one POST) → uploading → Detail, or
 *          incomplete (saved, some photos not added).
 * Edit:    editing → saving (the PUT) → Detail.
 * Either:  gone, when the Memory no longer exists (section 19.6).
 */
type Phase = "editing" | "saving" | "uploading" | "incomplete" | "gone"

type FocusRequest =
  | { kind: "field"; field: Field }
  | { kind: "tile"; key: string; control: "earlier" | "later" | "remove" | "retry" }
  | { kind: "add" }
  | { kind: "saved-heading" }
  | { kind: "element"; element: Element | null }

export type MemoryEditorProps =
  | {
      mode: "create"
      /** The `?trail=` value, read once; null when absent. */
      preselect: string | null
      /** The `?date=` value, read once and already checked; null when absent. */
      preselectDate: string | null
      headingRef: RefObject<HTMLHeadingElement | null>
      announce: Announce
    }
  | {
      mode: "edit"
      /** The Memory as the detail query holds it now. */
      memory: MemoryDetail
      query: ReturnType<typeof useMemoryDetail>
      headingRef: RefObject<HTMLHeadingElement | null>
      announce: Announce
      onGone: () => void
    }

function rejectionText(rejection: PhotoRejection): string {
  const { pick } = memoriesContent.photos
  switch (rejection) {
    case "format":
      return pick.format
    case "too-large":
      return pick.tooLarge
    case "unreadable":
      return pick.unreadable
  }
}

function uploadReason(kind: MemoryFailureKind): string {
  const { reasons } = memoriesContent.photos
  switch (kind) {
    case "photo-limit":
      return reasons.limit
    case "too-large":
      return reasons.tooLarge
    case "unsupported":
      return reasons.unsupported
    default:
      return reasons.unavailable
  }
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Add a memory and Edit memory (FEATURE-009 sections 9, 10, 11, 12, 14, 15,
 * 19, 22.9–22.12): one journal-entry form for both. On create, exactly one
 * `POST` is ever sent for the Memory; photos then upload one at a time in
 * the chosen order. On edit, the details are saved by one `PUT` and photo
 * changes are saved as they are made, never presented as one transaction.
 */
export function MemoryEditor(props: MemoryEditorProps) {
  const { mode, headingRef, announce } = props
  const { editor, photos: photoCopy } = memoriesContent
  const navigate = useNavigate()
  const location = useLocation()
  const changes = useMemoryChanges()
  const trails = useTrailLookup()
  const local = useLocalPhotos()

  const memory = props.mode === "edit" ? props.memory : null
  const memoryIdForEdit = memory?.id ?? null

  // ------------------------------------------------------------------
  // Values. Edit starts from the Memory as it was when the page opened.
  // ------------------------------------------------------------------
  const [initial] = useState<Values>(() =>
    memory !== null
      ? {
          trailId: memory.trailId,
          tripDate: memory.tripDate,
          title: memory.title,
          story: memory.story ?? "",
          visibility: memory.visibility,
        }
      : {
          trailId: "",
          tripDate: (props.mode === "create" ? props.preselectDate : null) ?? "",
          title: "",
          story: "",
          visibility: "PRIVATE",
        },
  )
  const [values, setValues] = useState<Values>(initial)
  const [initialTrail, setInitialTrail] = useState(initial.trailId)
  // A prefilled date (FEATURE-014 section 11) is where the form starts, not
  // an edit: left as it is, the form is still clean.
  const initialDate = initial.tripDate
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [ambiguous, setAmbiguous] = useState(false)
  const [phase, setPhase] = useState<Phase>("editing")
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [status, setStatus] = useState<PhotoStatusLine>(null)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(0)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  // `?trail=` (section 10.2): a malformed value is refused at once, with no
  // request; a UUID is looked up once the trail list has loaded.
  const preselect = props.mode === "create" ? props.preselect : null
  const [preselectPending, setPreselectPending] = useState(
    preselect !== null && isTrailId(preselect),
  )
  const [badPreselect, setBadPreselect] = useState(
    preselect !== null && !isTrailId(preselect),
  )
  if (preselectPending && trails.query.data !== undefined && preselect !== null) {
    setPreselectPending(false)
    const match = trails.query.data.find(
      (trail) => trail.id === preselect.toLowerCase(),
    )
    if (match !== undefined) {
      setValues((current) => ({ ...current, trailId: match.id }))
      setInitialTrail(match.id)
    } else {
      setBadPreselect(true)
    }
  }

  const busy = useRef(false)
  const createdRef = useRef<string | null>(null)
  const goneRef = useRef(false)
  const serverOrder = useRef<string[]>([])
  const photoChain = useRef<Promise<void>>(Promise.resolve())
  const uploadBatch = useRef({ total: 0, done: 0, added: 0 })

  const formId = useId()
  const dateId = useId()
  const dateHelpId = useId()
  const titleId = useId()
  const titleHelpId = useId()
  const titleCounterId = useId()
  const storyId = useId()
  const storyHelpId = useId()
  const storyCounterId = useId()
  const savedHeadingId = useId()

  const trailRef = useRef<HTMLSelectElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const storyRef = useRef<HTMLTextAreaElement>(null)
  const savedHeadingRef = useRef<HTMLHeadingElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------
  const localPhotos = local.photos
  const serverPhotos = memory?.photos ?? []
  const pendingLocal =
    mode === "edit"
      ? localPhotos.filter((photo) => photo.status !== "added")
      : localPhotos
  const tileCount = serverPhotos.length + pendingLocal.length
  const photosPreparingOrUploading = localPhotos.some(
    (photo) =>
      photo.status === "preparing" ||
      photo.status === "waiting" ||
      photo.status === "uploading",
  )

  const saved = createdId !== null
  const readOnly = phase !== "editing" || saved
  const trailEditable = mode === "create" && !saved

  const detailsChanged =
    memory !== null &&
    (values.tripDate !== initial.tripDate ||
      values.title.trim() !== initial.title.trim() ||
      (values.story.trim() === "" ? "" : values.story) !==
        (initial.story.trim() === "" ? "" : initial.story) ||
      values.visibility !== initial.visibility)

  const createDirty =
    values.trailId !== initialTrail ||
    values.tripDate !== initialDate ||
    values.title !== "" ||
    values.story !== "" ||
    values.visibility !== "PRIVATE" ||
    localPhotos.length > 0

  const guarded =
    mode === "create"
      ? (phase === "editing" && createDirty) ||
        phase === "saving" ||
        phase === "uploading"
      : phase !== "gone" && (detailsChanged || photosPreparingOrUploading)

  // ------------------------------------------------------------------
  // Tiles, as shown
  // ------------------------------------------------------------------
  const tiles: PhotoTileModel[] = [
    ...serverPhotos.map((photo) => serverTile(photo.id, photo)),
    ...pendingLocal.map((photo) => localTile(photo)),
  ]

  function serverTile(id: string, photo: MemoryDetail["photos"][number]): PhotoTileModel {
    const locked: ControlState = photoBusy > 0 || phase !== "editing" ? "disabled" : "on"
    return {
      key: id,
      status: "saved",
      previewUrl: null,
      serverPhoto: photo,
      reason: null,
      move: locked,
      remove: locked,
      retry: "none",
    }
  }

  function localTile(photo: LocalPhoto): PhotoTileModel {
    const base = {
      key: photo.key,
      status: photo.status,
      previewUrl: photo.previewUrl,
      serverPhoto: null,
      reason: photo.reason,
    }
    if (mode === "create") {
      if (phase === "editing" && !saved) {
        // Before the save: free to move and remove.
        return { ...base, move: "on", remove: "on", retry: "none" }
      }
      if (photo.status === "failed") {
        const state: ControlState = retrying || phase !== "incomplete" ? "disabled" : "on"
        return { ...base, move: "none", remove: state, retry: state }
      }
      if (photo.status === "added") {
        return { ...base, move: "none", remove: "none", retry: "none" }
      }
      // Saving, waiting, uploading.
      return { ...base, move: "disabled", remove: "disabled", retry: "none" }
    }

    // Edit: a local photo is not on the server yet, so it cannot be moved.
    const locked: ControlState = photoBusy > 0 || phase === "saving" ? "disabled" : "on"
    if (photo.status === "failed") {
      return { ...base, move: "none", remove: locked, retry: locked }
    }
    if (photo.status === "preparing") {
      return { ...base, move: "none", remove: phase === "saving" ? "disabled" : "on", retry: "none" }
    }
    return { ...base, move: "none", remove: "disabled", retry: "none" }
  }

  const { blocker, release, openerRef } = useLeaveGuard(guarded)

  const recovery = usePhotoRecovery({
    dataUpdatedAt: props.mode === "edit" ? props.query.dataUpdatedAt : 0,
    photos: serverPhotos,
    refetch: props.mode === "edit" ? props.query.refetch : noop,
  })

  // ------------------------------------------------------------------
  // Focus requests run after the render that made their target.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (focusRequest === null) {
      return
    }
    const root = rootRef.current
    switch (focusRequest.kind) {
      case "field": {
        const target = {
          trail: trailRef,
          tripDate: dateRef,
          title: titleRef,
          story: storyRef,
        }[focusRequest.field].current
        target?.focus()
        break
      }
      case "tile": {
        const all = Array.from(
          root?.querySelectorAll<HTMLElement>("[data-tile]") ?? [],
        )
        const tile = all.find(
          (element) => element.dataset.tile === focusRequest.key,
        )
        const index = tile !== undefined ? all.indexOf(tile) : -1
        // A move that reached an end: that control no longer applies, so
        // focus goes to the opposite one (22.10).
        let control = focusRequest.control
        if (control === "earlier" && index === 0) {
          control = "later"
        } else if (control === "later" && index === all.length - 1) {
          control = "earlier"
        }
        const wanted = tile?.querySelector<HTMLElement>(
          `[data-control="${control}"]`,
        )
        if (wanted != null) {
          wanted.focus()
        } else {
          root?.querySelector<HTMLElement>("[data-photo-add]")?.focus()
        }
        break
      }
      case "add":
        root?.querySelector<HTMLElement>("[data-photo-add]")?.focus()
        break
      case "saved-heading":
        savedHeadingRef.current?.focus()
        break
      case "element":
        if (focusRequest.element instanceof HTMLElement && focusRequest.element.isConnected) {
          focusRequest.element.focus()
        } else {
          headingRef.current?.focus()
        }
        break
    }
  }, [focusRequest, headingRef])

  // ------------------------------------------------------------------
  // Validation (section 9.1): on submit, then live for fields in error.
  // ------------------------------------------------------------------
  function errorFor(field: Field, current: Values): string | undefined {
    const { errors: text } = editor
    switch (field) {
      case "trail": {
        if (!trailEditable) {
          return undefined
        }
        const known =
          current.trailId !== "" &&
          (trails.query.data?.some((trail) => trail.id === current.trailId) ?? false)
        return known ? undefined : text.trailMissing
      }
      case "tripDate":
        if (current.tripDate === "") {
          return dateRef.current?.validity.badInput
            ? text.dateInvalid
            : text.dateMissing
        }
        if (!isIsoDate(current.tripDate)) {
          return text.dateInvalid
        }
        return current.tripDate > todayIso() ? text.dateFuture : undefined
      case "title": {
        const trimmed = current.title.trim()
        if (trimmed === "") {
          return text.titleMissing
        }
        return trimmed.length > TITLE_MAX ? text.titleLong : undefined
      }
      case "story":
        return current.story.length > STORY_MAX ? text.storyLong : undefined
    }
  }

  function validateAll(current: Values): FieldErrors {
    const found: FieldErrors = {}
    for (const field of FIELD_ORDER) {
      const error = errorFor(field, current)
      if (error !== undefined) {
        found[field] = error
      }
    }
    return found
  }

  function change<K extends keyof Values>(key: K, value: Values[K]) {
    if (readOnly) {
      return
    }
    const next = { ...values, [key]: value }
    setValues(next)
    const field: Field = key === "trailId" ? "trail" : (key as Field)
    if (key !== "visibility" && errors[field] !== undefined) {
      setErrors((current) => ({ ...current, [field]: errorFor(field, next) }))
    }
  }

  function showErrors(found: FieldErrors) {
    setErrors(found)
    const first = FIELD_ORDER.find((field) => found[field] !== undefined)
    if (first !== undefined) {
      setFocusRequest({ kind: "field", field: first })
    }
  }

  /** A `400` that named fields: each on its own field, else the form line. */
  function showServerRejection(fields: readonly string[], current: Values) {
    const { errors: text } = editor
    const found: FieldErrors = {}
    for (const field of fields) {
      if (field === "title") {
        found.title =
          current.title.trim().length > TITLE_MAX ? text.titleLong : text.titleMissing
      } else if (field === "story") {
        found.story = text.storyLong
      } else if (field === "tripDate") {
        found.tripDate =
          isIsoDate(current.tripDate) && current.tripDate > todayIso()
            ? text.dateFuture
            : text.dateInvalid
      }
    }
    if (Object.keys(found).length > 0) {
      showErrors(found)
    } else {
      setFormError(text.rejected)
    }
  }

  // ------------------------------------------------------------------
  // Photos: picking (section 11.1, 11.2)
  // ------------------------------------------------------------------
  const canAdd =
    mode === "create" ? phase === "editing" && !saved : phase !== "gone" && phase !== "saving"

  function pick(files: File[]) {
    if (!canAdd) {
      return
    }
    const messages: string[] = []
    const accepted: File[] = []
    let refused: PhotoRejection | null = null
    for (const file of files) {
      const rejection = checkPickedFile(file)
      if (rejection === null) {
        accepted.push(file)
      } else {
        refused ??= rejection
      }
    }
    const room = Math.max(0, MAX_PHOTOS - tileCount)
    const kept = accepted.slice(0, room)
    const overflow = accepted.length - kept.length
    if (overflow > 0) {
      messages.push(photoCopy.pick.overflow(overflow))
    }
    if (refused !== null) {
      messages.push(rejectionText(refused))
    }

    if (messages.length > 0) {
      const text = messages.join(" ")
      setStatus({ tone: "error", text })
      announce("alert", text)
    } else {
      setStatus(null)
    }
    if (kept.length === 0) {
      return
    }

    local.add(kept, {
      onPrepared: mode === "edit" ? (key) => queueEditUpload(key) : undefined,
      onRejected: (rejection) => {
        const text = rejectionText(rejection)
        setStatus({ tone: "error", text })
        announce("alert", text)
      },
    })
  }

  // ------------------------------------------------------------------
  // Photos: uploading (section 11.4, D14). One request at a time.
  // ------------------------------------------------------------------
  function photoName(key: string): string {
    const index = local.photosRef.current.findIndex((photo) => photo.key === key)
    const position = serverPhotos.length + Math.max(0, index) + 1
    const photo = local.photosRef.current[index]
    return `photo-${position}.${photo?.prepared?.extension ?? "jpg"}`
  }

  /** Uploads one local photo; true when it was added. */
  async function uploadOne(memoryId: string, key: string): Promise<"added" | "failed" | "stop"> {
    const photo = local.photosRef.current.find((entry) => entry.key === key)
    if (photo === undefined || photo.prepared === null) {
      return "stop"
    }
    local.patch(key, { status: "uploading", reason: null })
    try {
      const added = await changes.uploadPhoto(
        memoryId,
        photo.prepared.blob,
        photoName(key),
        local.signal(),
      )
      if (added !== null) {
        serverOrder.current.push(added.id)
      }
      local.patch(key, { status: "added", serverId: added?.id ?? null })
      return "added"
    } catch (error) {
      const kind = memoryFailureKindOf(error)
      if (kind === "no-session" || local.signal()?.aborted) {
        local.patch(key, { status: "failed", reason: uploadReason("unavailable") })
        return "stop"
      }
      if (kind === "not-found") {
        local.patch(key, { status: "failed", reason: uploadReason("unavailable") })
        memoryGone()
        return "stop"
      }
      const reason = uploadReason(kind)
      local.patch(key, { status: "failed", reason })
      const position = local.photosRef.current.findIndex((entry) => entry.key === key)
      announce(
        "status",
        `${photoCopy.tileName(serverPhotos.length + position + 1)}: ${photoCopy.states.failed}. ${reason}`,
      )
      return "failed"
    }
  }

  /** Create: uploads the given photos in order, one at a time (9.2 step 4). */
  async function uploadPass(memoryId: string, keys: readonly string[]) {
    const total = keys.length
    if (total === 0) {
      return
    }
    local.update((list) =>
      list.map((photo) =>
        keys.includes(photo.key)
          ? { ...photo, status: "waiting" as const, reason: null }
          : photo,
      ),
    )
    let added = 0
    for (let index = 0; index < total; index += 1) {
      if (goneRef.current || local.signal()?.aborted) {
        break
      }
      const text = photoCopy.uploading(index + 1, total)
      setStatus({ tone: "progress", text })
      if (index === 0) {
        announce("status", text)
      }
      const result = await uploadOne(memoryId, keys[index])
      if (result === "added") {
        added += 1
      } else if (result === "stop") {
        break
      }
    }
    // Anything still waiting after a stop could not be added.
    local.update((list) =>
      list.map((photo) =>
        keys.includes(photo.key) && photo.status === "waiting"
          ? { ...photo, status: "failed" as const, reason: uploadReason("unavailable") }
          : photo,
      ),
    )
    const end = photoCopy.uploadedEnd(added, total)
    setStatus({ tone: "info", text: end })
    announce("status", end)
  }

  /** Create, after a pass: Detail when all is added, otherwise the saved state. */
  async function finishCreate(memoryId: string, first: boolean) {
    // The page has gone: nothing here may navigate any more.
    if (left()) {
      return
    }
    if (goneRef.current) {
      setPhase("incomplete")
      setFocusRequest({ kind: "saved-heading" })
      announce("status", editor.memoryGone)
      return
    }
    const photos = local.photosRef.current
    const failed = photos.filter((photo) => photo.status === "failed")
    if (failed.length === 0) {
      // Step 5: only after a retry can the server's order differ.
      const chosen = photos.map((photo) => photo.serverId)
      if (
        chosen.every((id): id is string => id !== null) &&
        !sameOrder(chosen, serverOrder.current)
      ) {
        setStatus({ tone: "progress", text: photoCopy.orderSaving })
        try {
          const ordered = await changes.reorderPhotos(memoryId, chosen)
          serverOrder.current = ordered?.map((photo) => photo.id) ?? chosen
        } catch {
          setPhase("incomplete")
          setStatus({ tone: "error", text: photoCopy.orderFailed })
          announce("alert", photoCopy.orderFailed)
          return
        }
      }
      if (left()) {
        return
      }
      release()
      void navigate(`/memories/${memoryId}`, {
        replace: true,
        state: noticeState("saved"),
      })
      return
    }

    setPhase("incomplete")
    const addedCount = photos.length - failed.length
    announce("status", editor.savedLine(addedCount, photos.length, failed.length))
    if (first) {
      setFocusRequest({ kind: "saved-heading" })
    }
  }

  /** Edit: a photo request joins the one queue (section 12, D17). */
  function runPhotoRequest(task: () => Promise<void>) {
    setPhotoBusy((count) => count + 1)
    photoChain.current = photoChain.current
      .then(task)
      .catch(() => undefined)
      .finally(() => setPhotoBusy((count) => count - 1))
  }

  function queueEditUpload(key: string) {
    if (memoryIdForEdit === null) {
      return
    }
    const memoryId = memoryIdForEdit
    local.patch(key, { status: "waiting", reason: null })
    uploadBatch.current.total += 1
    runPhotoRequest(async () => {
      if (goneRef.current || local.signal()?.aborted) {
        return
      }
      const batch = uploadBatch.current
      const text = photoCopy.uploading(batch.done + 1, batch.total)
      setStatus({ tone: "progress", text })
      if (batch.done === 0) {
        announce("status", text)
      }
      const result = await uploadOne(memoryId, key)
      batch.done += 1
      if (result === "added") {
        batch.added += 1
        // The server photo has replaced it.
        local.drop(key)
      }
      if (batch.done >= batch.total) {
        const end =
          batch.total === 1 && batch.added === 1
            ? photoCopy.added
            : photoCopy.uploadedEnd(batch.added, batch.total)
        uploadBatch.current = { total: 0, done: 0, added: 0 }
        setStatus(result === "stop" ? null : { tone: "info", text: end })
        announce("status", end)
      }
    })
  }

  /** The page has been left (its lifetime signal is aborted). */
  function left(): boolean {
    return local.signal()?.aborted === true
  }

  function memoryGone() {
    goneRef.current = true
    const id = createdRef.current ?? memoryIdForEdit
    if (id !== null) {
      changes.memoryGone(id)
    }
    if (props.mode === "edit") {
      setPhase("gone")
      props.onGone()
    }
  }

  // ------------------------------------------------------------------
  // Tile actions
  // ------------------------------------------------------------------
  function moveTile(key: string, direction: "earlier" | "later") {
    const control = direction
    if (mode === "create") {
      const list = local.photosRef.current
      const index = list.findIndex((photo) => photo.key === key)
      const target = direction === "earlier" ? index - 1 : index + 1
      if (index < 0 || target < 0 || target >= list.length) {
        return
      }
      const next = [...list]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      local.update(() => next)
      announce("status", photoCopy.moved(target + 1, next.length))
      setFocusRequest({ kind: "tile", key, control })
      return
    }

    // Edit: the server's order, saved at once and shown from the answer.
    if (memoryIdForEdit === null || photoBusy > 0) {
      return
    }
    const memoryId = memoryIdForEdit
    const ids = serverPhotos.map((photo) => photo.id)
    const index = ids.indexOf(key)
    const target = direction === "earlier" ? index - 1 : index + 1
    if (index < 0 || target < 0 || target >= ids.length) {
      return
    }
    const next = [...ids]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)

    runPhotoRequest(async () => {
      setStatus({ tone: "progress", text: photoCopy.orderSaving })
      try {
        await changes.reorderPhotos(memoryId, next)
        setStatus(null)
        announce("status", photoCopy.moved(target + 1, next.length))
        setFocusRequest({ kind: "tile", key, control })
      } catch (error) {
        if (memoryFailureKindOf(error) === "not-found") {
          memoryGone()
          return
        }
        setStatus({ tone: "error", text: photoCopy.orderFailed })
        announce("alert", photoCopy.orderFailed)
      }
    })
  }

  /** Focus after a removal (22.10): the tile now there, the one before, or Add. */
  function focusAfterRemoval(keysBefore: readonly string[], removedKey: string) {
    const index = keysBefore.indexOf(removedKey)
    const rest = keysBefore.filter((key) => key !== removedKey)
    const target = rest[index] ?? rest[index - 1]
    setFocusRequest(
      target !== undefined
        ? { kind: "tile", key: target, control: "remove" }
        : { kind: "add" },
    )
  }

  function removeTile(key: string) {
    const keysBefore = tiles.map((tile) => tile.key)
    const localPhoto = local.photosRef.current.find((photo) => photo.key === key)

    if (localPhoto !== undefined) {
      // Not on the server: dropped here at once.
      const wasCover = keysBefore[0] === key
      local.drop(key)
      announce("status", photoCopy.removed(wasCover && keysBefore.length > 1))
      focusAfterRemoval(keysBefore, key)
      if (
        mode === "create" &&
        phase === "incomplete" &&
        createdRef.current !== null &&
        !local.photosRef.current.some((photo) => photo.status === "failed")
      ) {
        // With nothing left to retry, the Memory is complete as it is.
        void finishCreate(createdRef.current, false)
      }
      return
    }

    // A server photo (edit): asked first, inside the tile.
    if (photoBusy > 0) {
      return
    }
    setStatus(null)
    setConfirmingKey(key)
  }

  function cancelRemove(key: string) {
    setConfirmingKey(null)
    setFocusRequest({ kind: "tile", key, control: "remove" })
  }

  function confirmRemove(key: string) {
    if (memoryIdForEdit === null || removingKey !== null) {
      return
    }
    const memoryId = memoryIdForEdit
    const keysBefore = tiles.map((tile) => tile.key)
    const wasCover = keysBefore[0] === key
    setRemovingKey(key)
    runPhotoRequest(async () => {
      try {
        await changes.removePhoto(memoryId, key)
        setConfirmingKey(null)
        announce("status", photoCopy.removed(wasCover && keysBefore.length > 1))
        focusAfterRemoval(keysBefore, key)
      } catch (error) {
        if (memoryFailureKindOf(error) === "not-found") {
          memoryGone()
          return
        }
        setStatus({ tone: "error", text: photoCopy.removeFailed })
        announce("alert", photoCopy.removeFailed)
      } finally {
        setRemovingKey(null)
      }
    })
  }

  function retryTile(key: string) {
    if (mode === "edit") {
      if (photoBusy > 0) {
        return
      }
      queueEditUpload(key)
      return
    }
    void retryCreate([key])
  }

  async function retryCreate(keys: readonly string[]) {
    const memoryId = createdRef.current
    if (memoryId === null || busy.current) {
      return
    }
    busy.current = true
    setRetrying(true)
    setStatus(null)
    await uploadPass(memoryId, keys)
    busy.current = false
    setRetrying(false)
    await finishCreate(memoryId, false)
  }

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === "create") {
      await saveCreate()
    } else {
      await saveEdit()
    }
  }

  async function saveCreate() {
    // A second activation, or any activation once the Memory exists, sends
    // nothing: there is exactly one POST per Memory (9.2).
    if (busy.current || createdRef.current !== null) {
      return
    }
    const current = values
    const found = validateAll(current)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }

    busy.current = true
    setErrors({})
    setFormError(null)
    setAmbiguous(false)
    setPhase("saving")

    // Step 2: every photo still being prepared is finished first.
    await local.settled()

    let created: MemoryDetail
    try {
      created = await changes.create({
        trailId: current.trailId,
        tripDate: current.tripDate,
        title: current.title.trim(),
        story: current.story.trim() === "" ? undefined : current.story,
        visibility: current.visibility,
      })
    } catch (error) {
      busy.current = false
      setPhase("editing")
      handleCreateFailure(error, current)
      return
    }

    createdRef.current = created.id
    setCreatedId(created.id)
    if (left()) {
      return
    }
    setPhase("uploading")

    const keys = local.photosRef.current
      .filter((photo) => photo.prepared !== null)
      .map((photo) => photo.key)
    await uploadPass(created.id, keys)
    busy.current = false
    await finishCreate(created.id, true)
  }

  function handleCreateFailure(error: unknown, current: Values) {
    const { errors: text } = editor
    const kind = memoryFailureKindOf(error)
    switch (kind) {
      case "no-session":
        // FEATURE-002 takes over; nothing of this feature's is drawn.
        return
      case "timeout":
      case "unusable":
        // It may exist: the user checks before saving again (19.3).
        setAmbiguous(true)
        return
      case "trail-missing":
        setErrors({ trail: text.trailGone })
        setFocusRequest({ kind: "field", field: "trail" })
        void trails.query.refetch()
        return
      case "trail-check-unavailable":
        setFormError(text.trailCheck)
        return
      case "rejected":
        showServerRejection(memoryFailureFieldsOf(error), current)
        return
      default:
        setFormError(text.createFailed)
    }
  }

  async function saveEdit() {
    if (busy.current || memoryIdForEdit === null || photosPreparingOrUploading) {
      return
    }
    const memoryId = memoryIdForEdit
    const current = values
    const found = validateAll(current)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    if (!detailsChanged) {
      // Nothing of the details changed: nothing is sent.
      release()
      void navigate(`/memories/${memoryId}`, { replace: true })
      return
    }

    busy.current = true
    setErrors({})
    setFormError(null)
    setPhase("saving")
    try {
      await changes.update(memoryId, {
        tripDate: current.tripDate,
        title: current.title.trim(),
        story: current.story.trim() === "" ? null : current.story,
        visibility: current.visibility,
      })
    } catch (error) {
      busy.current = false
      setPhase("editing")
      const kind = memoryFailureKindOf(error)
      const { errors: text } = editor
      if (kind === "no-session") {
        return
      }
      if (kind === "not-found") {
        memoryGone()
        return
      }
      if (kind === "rejected") {
        showServerRejection(memoryFailureFieldsOf(error), current)
        return
      }
      setFormError(kind === "timeout" ? text.editTimedOut : text.editFailed)
      return
    }
    if (left()) {
      return
    }
    release()
    void navigate(`/memories/${memoryId}`, {
      replace: true,
      state: noticeState("updated"),
    })
  }

  function cancel() {
    if (phase === "saving") {
      return
    }
    const hasHistory = location.key !== "default"
    if (hasHistory) {
      void navigate(-1)
    } else if (mode === "edit" && memoryIdForEdit !== null) {
      void navigate(`/memories/${memoryIdForEdit}`, { replace: true })
    } else {
      void navigate("/memories")
    }
  }

  function viewMemory() {
    const memoryId = createdRef.current
    if (memoryId === null) {
      return
    }
    release()
    void navigate(`/memories/${memoryId}`, {
      replace: true,
      state: goneRef.current ? undefined : noticeState("saved"),
    })
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const counterTitle =
    values.title.length >= TITLE_COUNTER_FROM ? editor.titleCounter(values.title.length) : null
  const counterStory =
    values.story.length >= STORY_COUNTER_FROM ? editor.storyCounter(values.story.length) : null

  const failedCount = localPhotos.filter((photo) => photo.status === "failed").length
  const editWaitsForPhotos = mode === "edit" && photosPreparingOrUploading
  const saveWorking = phase === "saving" || phase === "uploading"
  // §22.12: end-aligned Cancel | Save from 768px, stacked with Save first
  // below. The buttons are rendered in the order shown at each width (the
  // CSS never reorders them), so the Tab order always follows the screen.
  const narrowFooter = useMediaQuery(NARROW_FOOTER)
  const footerRef = useFooterFocusAcrossFlip(narrowFooter)
  const cancelButton = (
    <button
      type="button"
      className="trip-control trip-button"
      data-footer-control="cancel"
      aria-disabled={phase === "saving" ? true : undefined}
      onClick={cancel}
    >
      {editor.cancel}
    </button>
  )
  const waitNote = <p className="memory-footer-wait">{editor.waitForPhotos}</p>
  const viewMemoryButton = (
    <button
      type="button"
      className="trip-control trip-button"
      data-footer-control="view"
      onClick={viewMemory}
    >
      {editor.viewMemory}
    </button>
  )
  const saveLabel =
    phase === "uploading"
      ? editor.addingPhotos
      : mode === "create"
        ? editor.saveCreate
        : editor.saveEdit

  function describedBy(...ids: (string | null)[]): string | undefined {
    const list = ids.filter((id): id is string => id !== null)
    return list.length > 0 ? list.join(" ") : undefined
  }

  return (
    <div ref={rootRef} className="memory-editor">
      {/* Status slot (22.12): the unconfirmed save, or the saved state. */}
      {ambiguous && phase === "editing" ? (
        <div role="alert" className="memory-status-block">
          <p className="memory-status-title">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{editor.ambiguousTitle}</span>
          </p>
          <p className="memory-status-body">{editor.ambiguousBody}</p>
          <p className="memory-status-action">
            <Link to="/memories" className="trip-control trip-button">
              {editor.checkMemories}
            </Link>
          </p>
        </div>
      ) : null}

      {phase === "incomplete" && mode === "create" ? (
        <div
          role="group"
          aria-labelledby={savedHeadingId}
          className="memory-status-block"
          data-kind="saved"
        >
          <h2
            ref={savedHeadingRef}
            id={savedHeadingId}
            tabIndex={-1}
            className="trip-focus-target memory-saved-title"
          >
            <CircleCheck aria-hidden="true" strokeWidth={2} />
            <span>{editor.savedTitle}</span>
          </h2>
          <p className="memory-saved-line">
            {goneRef.current
              ? editor.memoryGone
              : editor.savedLine(localPhotos.length - failedCount, localPhotos.length, failedCount)}
          </p>
        </div>
      ) : null}

      <form
        id={formId}
        className="memory-form"
        noValidate
        aria-busy={phase === "saving" ? true : undefined}
        onSubmit={(event) => void submit(event)}
      >
        <div className="memory-editor-spread">
          <div className="memory-editor-entry">
            <div className="memory-field-row">
              <TrailField
                editable={trailEditable}
                mode={mode}
                value={values.trailId}
                onChange={(trailId) => change("trailId", trailId)}
                trails={trails}
                error={errors.trail ?? null}
                badPreselect={badPreselect}
                selectRef={trailRef}
                disabled={readOnly}
              />

              <div className="memory-field memory-field-date">
                <FieldLabel htmlFor={dateId} label={editor.dateLabel} marker="required" />
                <input
                  ref={dateRef}
                  id={dateId}
                  type="date"
                  className="trip-control memory-control memory-date"
                  value={values.tripDate}
                  max={todayIso()}
                  required
                  readOnly={readOnly}
                  aria-invalid={errors.tripDate !== undefined ? true : undefined}
                  aria-describedby={dateHelpId}
                  onChange={(event) => change("tripDate", event.target.value)}
                />
                <HelperRow
                  helperId={dateHelpId}
                  helper={editor.dateHelper}
                  error={errors.tripDate ?? null}
                />
              </div>
            </div>

            <div className="memory-field memory-field-title">
              <FieldLabel htmlFor={titleId} label={editor.titleLabel} marker="required" />
              <input
                ref={titleRef}
                id={titleId}
                type="text"
                className="trip-control memory-control memory-title-input"
                value={values.title}
                autoComplete="off"
                readOnly={readOnly}
                aria-invalid={errors.title !== undefined ? true : undefined}
                aria-describedby={describedBy(
                  titleHelpId,
                  counterTitle !== null ? titleCounterId : null,
                )}
                onChange={(event) => change("title", event.target.value)}
              />
              <HelperRow
                helperId={titleHelpId}
                helper={editor.titleHelper}
                error={errors.title ?? null}
                counterId={titleCounterId}
                counter={counterTitle}
              />
            </div>

            <div className="memory-field memory-field-story">
              <FieldLabel htmlFor={storyId} label={editor.storyLabel} marker="optional" />
              <textarea
                ref={storyRef}
                id={storyId}
                className="trip-control memory-control memory-story-input"
                value={values.story}
                readOnly={readOnly}
                aria-invalid={errors.story !== undefined ? true : undefined}
                aria-describedby={describedBy(
                  storyHelpId,
                  counterStory !== null ? storyCounterId : null,
                )}
                onChange={(event) => change("story", event.target.value)}
              />
              <HelperRow
                helperId={storyHelpId}
                helper={editor.storyHelper}
                error={errors.story ?? null}
                counterId={storyCounterId}
                counter={counterStory}
              />
            </div>
          </div>

          <span className="memory-spine" aria-hidden="true" />

          <div className="memory-editor-side">
            <PhotoSection
              mode={mode}
              tiles={tiles}
              canAdd={canAdd}
              status={status}
              recovery={mode === "edit" ? recovery : null}
              confirmingKey={confirmingKey}
              removingKey={removingKey}
              onPick={pick}
              onMove={moveTile}
              onRemove={removeTile}
              onRetry={retryTile}
              onCancelRemove={cancelRemove}
              onConfirmRemove={confirmRemove}
            />

            <VisibilityChoice
              value={values.visibility}
              onChange={(visibility) => change("visibility", visibility)}
              readOnly={readOnly}
            />
          </div>
        </div>

        <div ref={footerRef} className="memory-footer">
          <InlineAlert text={formError} className="memory-form-alert" />

          {phase === "incomplete" && mode === "create" ? (
            <>
              <div className="memory-footer-buttons">
                {narrowFooter ? null : viewMemoryButton}
                {!goneRef.current ? (
                  <button
                    type="button"
                    className="trip-control memory-submit"
                    aria-disabled={retrying ? true : undefined}
                    onClick={() => {
                      const keys = local.photosRef.current
                        .filter((photo) => photo.status === "failed")
                        .map((photo) => photo.key)
                      void retryCreate(keys)
                    }}
                  >
                    <WorkingLabel working={retrying} workingText={editor.addingPhotos}>
                      <RotateCw aria-hidden="true" strokeWidth={2} />
                      {editor.retryFailed}
                    </WorkingLabel>
                  </button>
                ) : null}
                {narrowFooter ? viewMemoryButton : null}
              </div>
              <p className="memory-footer-note">{editor.laterFromEdit}</p>
            </>
          ) : (
            <div className="memory-footer-buttons">
              {editWaitsForPhotos && !narrowFooter ? waitNote : null}
              {narrowFooter ? null : cancelButton}
              <button
                type="submit"
                className="trip-control memory-submit"
                aria-disabled={saveWorking || editWaitsForPhotos ? true : undefined}
              >
                <WorkingLabel
                  working={saveWorking}
                  workingText={phase === "uploading" ? editor.addingPhotos : editor.saving}
                >
                  {saveLabel}
                </WorkingLabel>
              </button>
              {narrowFooter ? cancelButton : null}
              {editWaitsForPhotos && narrowFooter ? waitNote : null}
            </div>
          )}
        </div>
      </form>

      {blocker.state === "blocked" ? (
        <LeaveDialog
          mode={mode}
          uploading={photosPreparingOrUploading}
          onKeepEditing={() => {
            const opener = openerRef.current
            blocker.reset()
            setFocusRequest({ kind: "element", element: opener })
          }}
          onLeave={() => blocker.proceed()}
        />
      ) : null}
    </div>
  )
}

/** The footer's narrow layout; the same query as `memories.css`. */
const NARROW_FOOTER = "(width < 768px)"

/**
 * Keeps keyboard focus on a footer control that changes place when the
 * footer flips between its narrow and wide order. The control is rendered in
 * a different slot at each width, so the focused button is removed and a new
 * one mounted; the browser then drops focus to the page. A removal blurs the
 * button inside the same synchronous commit that runs the layout effect, so
 * the blur is remembered only until the next microtask: the effect can move
 * focus to the new button, while an ordinary blur (a click elsewhere) is
 * forgotten before any later resize.
 */
function useFooterFocusAcrossFlip(narrow: boolean): RefObject<HTMLDivElement | null> {
  const footerRef = useRef<HTMLDivElement>(null)
  const blurredRef = useRef<string | null>(null)

  useEffect(() => {
    const footer = footerRef.current
    if (footer === null) return
    function onFocusOut(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const control = target.dataset.footerControl
      if (control === undefined) return
      blurredRef.current = control
      queueMicrotask(() => {
        if (blurredRef.current === control) blurredRef.current = null
      })
    }
    footer.addEventListener("focusout", onFocusOut)
    return () => footer.removeEventListener("focusout", onFocusOut)
  }, [])

  useLayoutEffect(() => {
    const control = blurredRef.current
    blurredRef.current = null
    if (control === null) return
    const active = document.activeElement
    if (active !== null && active !== document.body) return
    footerRef.current
      ?.querySelector<HTMLElement>(`[data-footer-control="${control}"]`)
      ?.focus()
  }, [narrow])

  return footerRef
}

function noop() {
  return undefined
}
