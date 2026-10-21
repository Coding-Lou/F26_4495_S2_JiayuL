import { NotAuthenticatedError } from "@/features/auth"
import { authenticatedApiRequest } from "@/services/apiClient"

/** JSON requests (FEATURE-009 section 17.1). */
export const MEMORY_REQUEST_TIMEOUT_MS = 20_000

/** One photo upload (section 11.4). */
export const MEMORY_UPLOAD_TIMEOUT_MS = 60_000

/**
 * What a failed response's body said, read once and best effort as a
 * `ProblemDetail` (D28). Only its `code` and the names of the fields it
 * reports are kept; its text is never shown or logged.
 */
export type MemoryProblem = {
  code: string | null
  fields: string[]
}

/** How a request ended, without interpretation. */
export type MemoryRequestOutcome =
  /** A `2xx`. `body` is null for an empty body (`204`). */
  | { kind: "ok"; body: unknown }
  /** Any other response. */
  | { kind: "status"; status: number; problem: MemoryProblem }
  /** A `2xx` whose body is not JSON. */
  | { kind: "unreadable" }
  | { kind: "timeout" }
  /** No response: offline, refused, or abandoned. */
  | { kind: "network" }
  /** There is no session, so no request was made. */
  | { kind: "no-session" }

type MemoryRequestOptions = {
  /** Abandons the request (a query's signal). */
  cancel?: AbortSignal
  /** The client time limit, which covers reading the body as well. */
  timeoutMs?: number
}

/**
 * One authenticated request to memory-service, with the client time limit.
 * The `Content-Type` of a `FormData` body is left to the browser, so the
 * multipart boundary is its own. Nothing about a request or a response is
 * logged.
 */
export async function memoryRequest(
  path: string,
  init: RequestInit,
  { cancel, timeoutMs = MEMORY_REQUEST_TIMEOUT_MS }: MemoryRequestOptions = {},
): Promise<MemoryRequestOutcome> {
  const controller = new AbortController()
  let timedOut = false

  const abandon = () => controller.abort()
  cancel?.addEventListener("abort", abandon)
  if (cancel?.aborted) {
    controller.abort()
  }

  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let response: Response
    try {
      response = await authenticatedApiRequest(path, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof NotAuthenticatedError) {
        return { kind: "no-session" }
      }
      return { kind: timedOut ? "timeout" : "network" }
    }

    let text: string
    try {
      text = await response.text()
    } catch {
      if (timedOut) {
        return { kind: "timeout" }
      }
      return response.ok
        ? { kind: "unreadable" }
        : { kind: "status", status: response.status, problem: NO_PROBLEM }
    }

    if (!response.ok) {
      return {
        kind: "status",
        status: response.status,
        problem: readProblem(text),
      }
    }

    if (text.trim() === "") {
      return { kind: "ok", body: null }
    }
    try {
      return { kind: "ok", body: JSON.parse(text) as unknown }
    } catch {
      return { kind: "unreadable" }
    }
  } finally {
    window.clearTimeout(timer)
    cancel?.removeEventListener("abort", abandon)
  }
}

const NO_PROBLEM: MemoryProblem = { code: null, fields: [] }

function readProblem(text: string): MemoryProblem {
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    return NO_PROBLEM
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return NO_PROBLEM
  }

  const record = value as Record<string, unknown>
  const code = typeof record.code === "string" ? record.code : null
  const fields: string[] = []
  if (Array.isArray(record.errors)) {
    for (const entry of record.errors) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).field === "string"
      ) {
        fields.push((entry as Record<string, string>).field)
      }
    }
  }
  return { code, fields }
}
