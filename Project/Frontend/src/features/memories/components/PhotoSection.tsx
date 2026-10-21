import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  RotateCw,
  X,
} from "lucide-react"
import { memoriesContent } from "../content"
import type { LocalPhotoStatus } from "../hooks/useLocalPhotos"
import type { PhotoRecovery } from "../hooks/usePhotoRecovery"
import { PHOTO_ACCEPT } from "../photos/preparePhoto"
import type { MemoryPhoto } from "../types/memory"
import { SectionHeading } from "./EditorFields"
import { WorkingLabel } from "./MemoryCommon"
import { MemoryImage } from "./MemoryVisuals"

/** Whether a tile control is there, and whether it can be used now. */
export type ControlState = "on" | "disabled" | "none"

export type PhotoTileModel = {
  /** A local key, or the server photo's id: never a URL. */
  key: string
  status: LocalPhotoStatus | "saved"
  /** A picked photo's prepared preview. */
  previewUrl: string | null
  /** A photo already on the server. */
  serverPhoto: MemoryPhoto | null
  /** MM106, for a failed upload. */
  reason: string | null
  move: ControlState
  remove: ControlState
  retry: ControlState
}

export type PhotoStatusLine = {
  tone: "error" | "progress" | "info"
  text: string
} | null

type PhotoSectionProps = {
  mode: "create" | "edit"
  tiles: readonly PhotoTileModel[]
  /** Add photos can be used; otherwise it is `aria-disabled`. */
  canAdd: boolean
  status: PhotoStatusLine
  recovery: PhotoRecovery | null
  /** The tile whose inline remove confirmation is open (edit). */
  confirmingKey: string | null
  removingKey: string | null
  onPick: (files: File[]) => void
  onMove: (key: string, direction: "earlier" | "later") => void
  onRemove: (key: string) => void
  onRetry: (key: string) => void
  onCancelRemove: (key: string) => void
  onConfirmRemove: (key: string) => void
}

/**
 * Photos (FEATURE-009 sections 11, 12, 22.10): the lines, Add photos with
 * how many more fit, one status line, and a vertical list of tiles, because
 * "earlier" and "later" then mean up and down. The first photo is the cover,
 * said in words. No drag-and-drop and no drop zone.
 */
export function PhotoSection({
  mode,
  tiles,
  canAdd,
  status,
  recovery,
  confirmingKey,
  removingKey,
  onPick,
  onMove,
  onRemove,
  onRetry,
  onCancelRemove,
  onConfirmRemove,
}: PhotoSectionProps) {
  const { photos: copy } = memoriesContent
  const headingId = useId()
  const remainingId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const remaining = Math.max(0, 5 - tiles.length)
  const total = tiles.length

  return (
    <section className="memory-photos" aria-labelledby={headingId}>
      <SectionHeading id={headingId}>{copy.heading}</SectionHeading>
      <div className="memory-photo-lines">
        <p>{copy.coverLine}</p>
        <p>{copy.limitLine}</p>
        {mode === "edit" ? <p>{copy.editLine}</p> : null}
      </div>

      <div className="memory-photo-add">
        <button
          type="button"
          className="trip-control trip-button"
          data-photo-add=""
          aria-disabled={!canAdd || remaining === 0 ? true : undefined}
          aria-describedby={remainingId}
          onClick={() => {
            if (canAdd && remaining > 0) {
              inputRef.current?.click()
            }
          }}
        >
          <ImagePlus aria-hidden="true" strokeWidth={2} />
          {copy.add}
        </button>
        <span id={remainingId} className="memory-photo-remaining">
          {copy.remaining(remaining)}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          accept={PHOTO_ACCEPT}
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            // Picking the same file again must still be noticed.
            event.target.value = ""
            if (files.length > 0) {
              onPick(files)
            }
          }}
        />
      </div>

      {status !== null ? (
        <p className="memory-photo-status" data-tone={status.tone}>
          {status.tone === "error" ? (
            <CircleAlert aria-hidden="true" strokeWidth={2} />
          ) : status.tone === "progress" ? (
            <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
          ) : null}
          <span>{status.text}</span>
        </p>
      ) : null}

      {tiles.length > 0 ? (
        <ol className="memory-tiles">
          {tiles.map((tile, index) => (
            <PhotoTile
              key={tile.key}
              tile={tile}
              position={index + 1}
              total={total}
              recovery={recovery}
              confirming={confirmingKey === tile.key}
              removing={removingKey === tile.key}
              onMove={onMove}
              onRemove={onRemove}
              onRetry={onRetry}
              onCancelRemove={onCancelRemove}
              onConfirmRemove={onConfirmRemove}
            />
          ))}
        </ol>
      ) : null}
    </section>
  )
}

type PhotoTileProps = {
  tile: PhotoTileModel
  position: number
  total: number
  recovery: PhotoRecovery | null
  confirming: boolean
  removing: boolean
  onMove: PhotoSectionProps["onMove"]
  onRemove: PhotoSectionProps["onRemove"]
  onRetry: PhotoSectionProps["onRetry"]
  onCancelRemove: PhotoSectionProps["onCancelRemove"]
  onConfirmRemove: PhotoSectionProps["onConfirmRemove"]
}

/** One photo tile (section 22.10): a group named "Photo n of N". */
function PhotoTile({
  tile,
  position,
  total,
  recovery,
  confirming,
  removing,
  onMove,
  onRemove,
  onRetry,
  onCancelRemove,
  onConfirmRemove,
}: PhotoTileProps) {
  const { photos: copy } = memoriesContent
  const first = position === 1
  const last = position === total
  const [previewLoaded, setPreviewLoaded] = useState(false)

  const earlierBlocked = tile.move !== "on" || first
  const laterBlocked = tile.move !== "on" || last

  return (
    <li
      className="memory-tile"
      role="group"
      aria-label={copy.tileGroup(position, total)}
      data-tile={tile.key}
      data-status={tile.status}
    >
      <span className="memory-tile-preview">
        {tile.serverPhoto !== null && recovery !== null ? (
          <MemoryImage
            photo={tile.serverPhoto}
            recovery={recovery}
            variant="tile"
            alt=""
          />
        ) : tile.previewUrl !== null ? (
          <img
            className="memory-photo"
            data-variant="tile"
            data-loaded={previewLoaded ? "" : undefined}
            src={tile.previewUrl}
            alt=""
            draggable={false}
            onLoad={() => setPreviewLoaded(true)}
          />
        ) : null}
      </span>

      <span className="memory-tile-text">
        <span className="memory-tile-name">
          {copy.tileName(position)}
          {first ? <span className="memory-cover-tag">{copy.cover}</span> : null}
        </span>
        <TileState status={tile.status} />
        {tile.status === "failed" && tile.reason !== null ? (
          <span className="memory-tile-reason">{tile.reason}</span>
        ) : null}
      </span>

      {confirming ? (
        <RemoveConfirmation
          removing={removing}
          onCancel={() => onCancelRemove(tile.key)}
          onConfirm={() => onConfirmRemove(tile.key)}
        />
      ) : (
        <span className="memory-tile-controls">
          {tile.retry !== "none" ? (
            <button
              type="button"
              className="trip-control trip-button memory-tile-retry"
              data-control="retry"
              aria-label={copy.retryName(position)}
              aria-disabled={tile.retry === "disabled" ? true : undefined}
              onClick={() => {
                if (tile.retry === "on") {
                  onRetry(tile.key)
                }
              }}
            >
              <RotateCw aria-hidden="true" strokeWidth={2} />
              {copy.retry}
            </button>
          ) : null}
          {tile.move !== "none" ? (
            <>
              <button
                type="button"
                className="trip-control memory-icon-action"
                data-control="earlier"
                aria-label={copy.moveEarlier(position)}
                aria-disabled={earlierBlocked ? true : undefined}
                onClick={() => {
                  if (!earlierBlocked) {
                    onMove(tile.key, "earlier")
                  }
                }}
              >
                <ArrowUp aria-hidden="true" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="trip-control memory-icon-action"
                data-control="later"
                aria-label={copy.moveLater(position)}
                aria-disabled={laterBlocked ? true : undefined}
                onClick={() => {
                  if (!laterBlocked) {
                    onMove(tile.key, "later")
                  }
                }}
              >
                <ArrowDown aria-hidden="true" strokeWidth={2} />
              </button>
            </>
          ) : null}
          {tile.remove !== "none" ? (
            <button
              type="button"
              className="trip-control memory-icon-action"
              data-control="remove"
              aria-label={copy.remove(position)}
              aria-disabled={tile.remove === "disabled" ? true : undefined}
              onClick={() => {
                if (tile.remove === "on") {
                  onRemove(tile.key)
                }
              }}
            >
              <X aria-hidden="true" strokeWidth={2} />
            </button>
          ) : null}
        </span>
      )}
    </li>
  )
}

function TileState({ status }: { status: PhotoTileModel["status"] }) {
  const { states } = memoriesContent.photos
  switch (status) {
    case "saved":
      return null
    case "preparing":
      return (
        <span className="memory-tile-state">
          <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
          {states.preparing}
        </span>
      )
    case "ready":
      return <span className="memory-tile-state">{states.ready}</span>
    case "waiting":
      return <span className="memory-tile-state">{states.waiting}</span>
    case "uploading":
      return (
        <span className="memory-tile-state" data-strong="">
          <LoaderCircle aria-hidden="true" strokeWidth={2} className="trip-spin" />
          {states.uploading}
        </span>
      )
    case "added":
      return (
        <span className="memory-tile-state" data-strong="">
          <Check aria-hidden="true" strokeWidth={2} />
          {states.added}
        </span>
      )
    case "failed":
      return (
        <span className="memory-tile-state" data-failed="">
          <CircleAlert aria-hidden="true" strokeWidth={2} />
          {states.failed}
        </span>
      )
  }
}

type RemoveConfirmationProps = {
  removing: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Edit: "Remove this photo?" inside the tile (section 22.10). Focus starts on
 * Cancel; Cancel or Escape returns it to the tile's Remove.
 */
function RemoveConfirmation({ removing, onCancel, onConfirm }: RemoveConfirmationProps) {
  const { photos: copy } = memoriesContent
  const questionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      if (!removing) {
        onCancel()
      }
    }
  }

  return (
    <span
      role="group"
      aria-labelledby={questionId}
      className="memory-tile-confirm"
      onKeyDown={handleKeyDown}
    >
      <span id={questionId} className="memory-tile-question">
        {copy.removeQuestion}
      </span>
      <span className="memory-tile-confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          className="trip-control trip-button memory-tile-small"
          aria-disabled={removing ? true : undefined}
          onClick={() => {
            if (!removing) {
              onCancel()
            }
          }}
        >
          {copy.removeCancel}
        </button>
        <button
          type="button"
          className="trip-control memory-danger memory-tile-small"
          aria-disabled={removing ? true : undefined}
          onClick={() => {
            if (!removing) {
              onConfirm()
            }
          }}
        >
          <WorkingLabel working={removing} workingText={copy.removing}>
            {copy.removeConfirm}
          </WorkingLabel>
        </button>
      </span>
    </span>
  )
}
