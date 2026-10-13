const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether a route segment can be a trail id. Trail ids are UUIDs; anything
 * else is "trail not found" with no request made (FEATURE-004 sections 9, 12).
 */
export function isTrailId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}
