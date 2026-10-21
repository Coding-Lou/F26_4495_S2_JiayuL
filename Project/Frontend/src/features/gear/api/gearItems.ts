import type {
  CreateGearItemRequest,
  GearFailureKind,
  GearItem,
  UpdateGearItemRequest,
} from "../types/gear"
import { gearRequest } from "./gearRequest"

const GEAR_ITEMS_PATH = "/api/users/me/gear"

/** A gear request that produced no usable answer, and which kind it was. */
export class GearRequestError extends Error {
  readonly kind: GearFailureKind

  constructor(kind: GearFailureKind) {
    super("Gear request failed")
    this.name = "GearRequestError"
    this.kind = kind
  }
}

export function gearFailureKindOf(error: unknown): GearFailureKind {
  return error instanceof GearRequestError ? error.kind : "unavailable"
}

/**
 * The signed-in user's owned gear, newest first, as the backend orders it
 * (section 6.1). The order is kept.
 */
export async function requestGearItems(cancel: AbortSignal): Promise<GearItem[]> {
  const outcome = await gearRequest(GEAR_ITEMS_PATH, { method: "GET" }, cancel)

  switch (outcome.kind) {
    case "ok": {
      const items = readGearItems(outcome.body)
      if (items === null) {
        throw new GearRequestError("unusable")
      }
      return items
    }
    case "status":
    case "network":
      throw new GearRequestError("unavailable")
    case "unreadable":
      throw new GearRequestError("unusable")
    case "timeout":
      throw new GearRequestError("timeout")
    case "no-session":
      throw new GearRequestError("no-session")
  }
}

/**
 * Adds one item (section 13.2). The body is exactly `{ name, category }`:
 * no description is sent. Resolves with the created item as the backend
 * returned it, or null when it was created but the answer cannot be read.
 */
export async function createGearItem(
  request: CreateGearItemRequest,
): Promise<GearItem | null> {
  const body: CreateGearItemRequest = {
    name: request.name,
    category: request.category,
  }

  const outcome = await gearRequest(GEAR_ITEMS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  switch (outcome.kind) {
    case "ok":
      return readGearItem(outcome.body)
    case "unreadable":
      // Created: the status said so. Its answer is simply not used.
      return null
    case "status":
      throw new GearRequestError(
        outcome.status === 400 ? "rejected" : "unavailable",
      )
    case "network":
      throw new GearRequestError("unavailable")
    case "timeout":
      throw new GearRequestError("timeout")
    case "no-session":
      throw new GearRequestError("no-session")
  }
}

/**
 * Changes one item's name and category (FEATURE-007 section 13.2). `PUT`
 * replaces every field, so the body is always `{ name, category,
 * description }` with the description the caller read, unchanged (section
 * 8.3). Resolves with the item as the backend returned it, or null when it
 * was saved but the answer cannot be read. A `404` is `not-found`.
 */
export async function updateGearItem(
  id: string,
  request: UpdateGearItemRequest,
): Promise<GearItem | null> {
  const body: UpdateGearItemRequest = {
    name: request.name,
    category: request.category,
    description: request.description,
  }

  const outcome = await gearRequest(gearItemPath(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  switch (outcome.kind) {
    case "ok":
      return readGearItem(outcome.body)
    case "unreadable":
      // Saved: the status said so. Its answer is simply not used.
      return null
    case "status":
      throw new GearRequestError(statusFailureKind(outcome.status))
    case "network":
      throw new GearRequestError("unavailable")
    case "timeout":
      throw new GearRequestError("timeout")
    case "no-session":
      throw new GearRequestError("no-session")
  }
}

/**
 * Removes one item (FEATURE-007 section 13.3). The backend marks it deleted;
 * nothing is restored. Any `2xx` is success: the `204` has no body, which the
 * request layer reports as `unreadable`, and that is not a failure here. A
 * `404` means it is already gone, which is the outcome asked for (D10).
 */
export async function removeGearItem(id: string): Promise<void> {
  const outcome = await gearRequest(gearItemPath(id), { method: "DELETE" })

  switch (outcome.kind) {
    case "ok":
    case "unreadable":
      return
    case "status":
      if (outcome.status === 404) {
        return
      }
      throw new GearRequestError("unavailable")
    case "network":
      throw new GearRequestError("unavailable")
    case "timeout":
      throw new GearRequestError("timeout")
    case "no-session":
      throw new GearRequestError("no-session")
  }
}

function gearItemPath(id: string): string {
  return `${GEAR_ITEMS_PATH}/${encodeURIComponent(id)}`
}

function statusFailureKind(status: number): GearFailureKind {
  switch (status) {
    case 400:
      return "rejected"
    case 404:
      return "not-found"
    default:
      return "unavailable"
  }
}

/**
 * Checks a list against the contract. Null when it is not a list at all. An
 * entry with no usable `id` or `name` is dropped; the rest are kept in the
 * order they arrived (section 6.4).
 */
export function readGearItems(body: unknown): GearItem[] | null {
  if (!Array.isArray(body)) {
    return null
  }

  const items: GearItem[] = []
  for (const entry of body) {
    const item = readGearItem(entry)
    if (item !== null) {
      items.push(item)
    }
  }
  return items
}

/** One entry, each field a checked value or null. Null without id or name. */
export function readGearItem(value: unknown): GearItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const record = value as Record<string, unknown>

  const id = readText(record.id)
  const name = readText(record.name)
  if (id === null || name === null) {
    return null
  }

  return {
    id,
    name,
    category: readText(record.category),
    // Kept exactly as it arrived, so an edit can send it back unchanged
    // (FEATURE-007 section 8.3). Screens show it only when it has text.
    description:
      typeof record.description === "string" ? record.description : null,
    createdAt: readText(record.createdAt),
  }
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
