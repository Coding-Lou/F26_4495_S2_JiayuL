import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * What a page says on arrival after a save or a delete (D29). It travels as
 * router state and is only this enum: never a title, a story, or an id.
 */
export type MemoryNotice = "saved" | "updated" | "deleted"

export type MemoryNoticeState = { memoryNotice: MemoryNotice }

export function noticeState(notice: MemoryNotice): MemoryNoticeState {
  return { memoryNotice: notice }
}

function readNotice(state: unknown): MemoryNotice | null {
  if (typeof state !== "object" || state === null) {
    return null
  }
  const value = (state as Record<string, unknown>).memoryNotice
  return value === "saved" || value === "updated" || value === "deleted"
    ? value
    : null
}

/**
 * The notice this page arrived with, read once. The router state is then
 * cleared in place, so a reload or a return through history never shows it
 * again (sections 13, 16).
 */
export function useArrivalNotice(): MemoryNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [notice] = useState(() => readNotice(location.state))

  const carriesNotice = readNotice(location.state) !== null
  const { pathname, search, hash } = location
  useEffect(() => {
    if (carriesNotice) {
      void navigate({ pathname, search, hash }, { replace: true, state: null })
    }
  }, [carriesNotice, hash, navigate, pathname, search])

  return notice
}
