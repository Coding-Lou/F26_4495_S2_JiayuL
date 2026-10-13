import { CircleAlert, Info } from "lucide-react"
import { plannerContent } from "../content"
import { PLANNER_IDS } from "../plannerDom"
import { selectNoteId, usePlanner } from "../state/plannerStore"

/**
 * The one slot above the composer for its messages (FEATURE-003 section
 * 10.2.6), referenced by the textarea's `aria-describedby`. One message at a
 * time; a validation outranks a note. The two kinds differ by icon, wording,
 * and live-region role, not by color. Both regions are always in the DOM, so
 * a message that appears is announced.
 */
export function PlannerNoteLine() {
  const noteId = usePlanner(selectNoteId)

  const validation = noteId !== null && noteId.startsWith("V")
  const text = noteId === null ? null : plannerContent.notes[noteId]

  return (
    <div
      id={PLANNER_IDS.note}
      className="planner-note"
      data-active={noteId !== null ? "" : undefined}
    >
      <p role="alert">
        {validation ? (
          <span key={noteId} className="planner-note-line">
            <CircleAlert aria-hidden="true" strokeWidth={2} />
            <span>{text}</span>
          </span>
        ) : null}
      </p>
      <p role="status">
        {noteId !== null && !validation ? (
          <span key={noteId} className="planner-note-line">
            <Info aria-hidden="true" strokeWidth={2} />
            <span>{text}</span>
          </span>
        ) : null}
      </p>
    </div>
  )
}
