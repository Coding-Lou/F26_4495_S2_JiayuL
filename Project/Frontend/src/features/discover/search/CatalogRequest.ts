import { useTrailList } from "@/features/trails/hooks/useTrailList"

/**
 * The curated catalog's one request for trail search (`GET /api/trails`,
 * tokenless), made through the shared trail-list hook as it is: its key,
 * freshness, and retry rules are not repeated here.
 *
 * Discover renders this only once the search field has been focused or
 * typed in, so page load and Discover's activation request nothing; once
 * mounted it stays, and the result is cached for the hook's five minutes.
 * The search reads the same cache entry without requesting it
 * (`useTrailSearch`).
 */
export function CatalogRequest(): null {
  useTrailList()
  return null
}
