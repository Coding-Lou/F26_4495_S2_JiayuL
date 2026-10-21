# FEATURE-010 — Community Memories

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN** (product gate accepted by the user, 2026-10-18). Lean QA PASS, 0 of 2 repair cycles. Spec approved 2026-10-17 with both section 24.1 items accepted. Closeout record: section 25. |
| Owner | Lead (scope, decisions, acceptance criteria); `ui-ux` (section 18 only) |
| Depends on | FEATURE-006 (Discover, including its accepted 2026-10-17 viewport-driven evolution), FEATURE-008 (public Memory API, frozen), FEATURE-009 (My Memories, frozen) |
| Agents for the implementation cycle | `frontend` → lead diff review → `qa` (Lean) → product gate → closeout. `backend-api`: skip unless a verified contract defect. `ui-ux`: done in this spec. `three-d`: skip |
| Roadmap | The last numbered feature. After its closeout: feature freeze, then the final Full Regression (section 23) |

---

## 1. Feature Summary

A signed-out visitor exploring a trail on Discover can see that people have recorded experiences there, and read them. The selected trail's popup gains a compact **Community Memories** preview (at most two entries). **View all memories** opens a Discover-side panel with the trail's public Memories as read-only journal entries, and one entry opens as a read-only public Memory Detail inside the same panel. Everything is read through FEATURE-008's public API; nothing is created, edited, or rated.

## 2. Product Goal

> How can a person exploring a trail see public experiences shared by people who actually recorded Memories for that trail?

The product loop closes: Discover → Plan → Prepare → Go in real life → Remember → optionally make a Memory Public → that Memory helps the next person exploring the trail.

**Principle: Community Memories are supporting evidence for a trail, not the primary content of Discover.** Discover stays trail-first. The popup must not become a social feed, a photo wall, a long journal page, or a profile. Community Memories answer one question: *what was this trail like for people who recorded an experience here?*

It is trail storytelling, not a social network.

## 3. 008 / 009 / 010 Boundary

| Feature | Owns | Status |
|---|---|---|
| FEATURE-008 Memory Foundation | Storage, owner API, public API (`GET /api/memories/public?trailId=`, `GET /api/memories/public/{id}`), signed photo URLs, sanitization, the PUBLIC-only and no-author-identity guarantees | Frozen. Not changed |
| FEATURE-009 My Memories | `/memories`, Create, Detail, Edit, Delete, Private/Public choice, photo upload/order/removal, the owner journal UI | Frozen. Not changed |
| **FEATURE-010 Community Memories** | Public presentation of PUBLIC Memories only: popup preview, Community panel (list), public Memory Detail, signed-out access, their states, signed-URL handling for public photos | This spec |

FEATURE-010 has no owner behavior: no create, edit, delete, visibility change, upload, or reorder. It calls no owner endpoint.

## 4. Scope and Non-goals

### 4.1 In scope

- A. Community Memories preview in the selected trail's Discover popup (curated trails only, section 13).
- B. A read-only **View all memories** experience for that trail: the Community panel (section 9).
- C. A read-only public Memory Detail (section 10).
- D. Signed-out access through the public API only.
- E. Loading, empty, error, and unavailable states that never break the trail popup.
- F. Safe handling of expiring signed photo URLs.

### 4.2 Non-goals (explicit; no placeholders for any of them)

- Social features: likes, reactions, comments, follows, followers, share/repost counts, DMs, notifications, ranking, trending, feeds, moderation UI.
- Public author identity of any kind: names, "Anonymous hiker", "Community member", avatars, bios, profile pages (`/users/:id`, `/profile/:id`).
- Memory creation or editing in Discover: no Create / Add / Post Memory, no "Be the first to post".
- A public Trail Detail page or any new public route.
- Any change to viewport-driven Discover: clustering, radius, request semantics, list cap, selection model.
- AI recap, AI titles or stories, GPX, map replay, video, slideshows.
- Backend changes, new endpoints, gateway/production routing (section 24).
- New dependencies (carousel, gallery, lightbox, modal, state-management, social UI packages).
- Generated or stock imagery; Blender; 3D.

## 5. Current Implementation Inspection (2026-10-17)

### 5.1 Discover (FEATURE-006 + viewport-driven evolution)

- `features/discover/components/DiscoverSection.tsx` owns one `selectedTrailId`, mirrored in the `trail` search parameter (constant `TRAIL_PARAM`, written with `setSearchParams(..., { replace: true })`). When the current view's own nearby result no longer contains the selected trail, the popup closes and the parameter is removed. `/?trail=<uuid>` activates Discover at once.
- Trails come from the public `GET /api/trails/nearby` (`useNearbyTrails`); the list shows the visible-area trails (max 50 + the selected one). Map: MapLibre GeoJSON clustering in `map/runtime/trailMapRuntime.ts`.
- `TrailPopup.tsx` renders inside the selected row's `li`, positioned by `map/popupPlacement.ts` (right, then left, then a pan without zoom, then follow, then docked). At ≥ the desktop breakpoint `.discover-popup` has `max-height: calc(100% - 2 * var(--discover-inset))` and `overflow-y: auto`; below it the popup sits in the flow under its row (`max-height: none`).
- Popup content order today: name/heading, facts (`dl`), Daily Trail Activity (`PopupActivity`), "not on map" note, description, sample-data line (`isSampleTrailSource`), **Sign in to plan this trip**, **Create account**, auth status slot, Close (last in DOM, top-right visually).
- Synthetic trails (`SYNTHETIC_DEMO`) appear in Discover with the sample line and "Today's activity isn't available."; `isSyntheticTrailSource()` exists in `features/trails/content.ts`.

### 5.2 Memories (FEATURE-009)

- `features/memories/**`: owner API in `api/memories.ts` through `api/memoryRequest.ts` (authenticated, `authenticatedApiRequest`). Owner query keys `["memories", "mine", <subject>]`, `["memories", "detail", <subject>, <id>]`, page size 12.
- Reusable read-only pieces: `components/MemoryVisuals.tsx` (`MemoryImage` with `card` / `large` / thumbnail variants and the fallback; `NoPhotoSurface`), `hooks/usePhotoRecovery.ts` (signed-URL recovery: one refetch per result, only when the result is older than 60 s; an already expired `urlExpiresAt` triggers the same single refetch; never loops; URLs never stored), `model/memoryText.ts` (date and count text). `MemoryPhoto` is `{ id, position, url, urlExpiresAt: epoch ms | null }`.
- Owner-only pieces that must not be reused publicly: `VisibilityLabel`, `DetailActions` (Edit/Delete), the editor, `PhotoSection`, `useMemoryChanges`, the leave guard.
- `MemoryDetailScreen.tsx`'s `PhotoFigure` (one large photo, caption, a thumbnail strip under it) is the visual reference for the public gallery; it is embedded in the owner screen, so FEATURE-010 builds a small public equivalent rather than parameterising the owner screen.

### 5.3 Request layer and proxy

- `features/trails/api/publicRequest.ts`: tokenless `apiRequest()` with `credentials: "omit"`, no `Authorization` header, a 20 s limit, outcome kinds `ok` / `status` / `unreadable` / `timeout` / `network`. FEATURE-010 uses it. (An invalid bearer token is refused on public paths, so a token must never be sent.)
- Vite dev proxy `/api/memories/**` → memory-service `http://localhost:8085` exists (FEATURE-009 D26) and covers the public reads and the local signed photo URLs (`/api/memories/local-photos/...`). **No proxy change.**

## 6. Public Memory API Contract (FEATURE-008, unchanged)

| Call | Use in FEATURE-010 |
|---|---|
| `GET /api/memories/public?trailId=<uuid>&page=<n>&size=<1..50>` | Popup preview (`page=0&size=2`) and the Community list |
| `GET /api/memories/public/{id}` | Public Memory Detail |

- Envelope `MemoryPage<T> { items, page, size, totalItems, totalPages }`. `totalItems` is the trail's public Memory count. Order `tripDate DESC, createdAt DESC, id DESC`. Size outside 1–50 → `400`.
- `PublicMemorySummary { id, trailId, tripDate, title, storyExcerpt | null, storyTruncated, photoCount, coverPhoto | null, createdAt }`. `storyExcerpt` is at most 240 characters, cut at a word boundary by the server; `storyTruncated` says whether it was cut.
- `PublicMemoryDetail { id, trailId, tripDate, title, story | null, photos[], createdAt }`.
- `PublicPhoto { id, position, url, urlExpiresAt }`: `url` is a signed URL valid about 15 minutes (S3 presigned absolute URL, or root-relative HMAC-signed local URL in development). The lowest position is the cover.
- Server guarantees: only `PUBLIC`, non-deleted Memories on trails that still exist; no `visibility`, `updatedAt`, owner subject, email, user id, display name, object key, or media type in any public response. A `PRIVATE`, deleted, missing, or trail-less Memory gives the same `404 MEMORY_NOT_FOUND`. Each public read makes one trail-service call: trail missing → list `404 TRAIL_NOT_FOUND`; trail-service unreachable → `503`.
- Frontend public types contain exactly these fields (section 22.3). `PublicPhoto` is shaped like `MemoryPhoto` (`urlExpiresAt` parsed to epoch ms or null), so the read-only `MemoryImage` and `usePhotoRecovery` accept it without owner fields.

## 7. Discover Integration

- Community Memories attach to the selected trail's popup and to a panel opened from it. Nothing else in Discover changes: Hero, lazy activation, `/nearby` requests, clustering, the visible-area list and its cap, selection rules, popup placement rules, activity, gestures.
- `features/discover` imports the Community components; the Community feature never imports `discover` (section 22.2).
- The popup keeps every approved FEATURE-006 element in its approved order (section 8.1).

## 8. Trail Popup Community Preview

### 8.1 Hierarchy (final)

1. Trail identity and facts (unchanged)
2. Daily Trail Activity (unchanged)
3. "Not on map" note, description, sample-data line (unchanged)
4. **Community Memories** (new; curated trails only)
5. **Sign in to plan this trip** / **Create account**, auth status slot (unchanged)
6. Close (unchanged)

The brief's preferred order put the description before activity; the existing FEATURE-006 order (activity before description) is kept because FEATURE-010 must not reopen the approved popup. Community sits between the trail's own content and the trail-level actions, so it never pushes the facts out of view.

### 8.2 Content

- A small heading **Community Memories** with the public count when there is at least one ("2 memories"; section 18 owns the exact copy). The count is content, never engagement, and never shaped like a cluster bubble or an activity figure (section 19.4).
- At most **two** preview rows from `page=0&size=2`, in server order. Each row: a small cover thumbnail (or the compact no-photo surface), the Memory title, and the trip date. **No story excerpt in the popup.**
- Each preview row is a button that opens the Community panel directly at that Memory's public Detail.
- **View all memories** appears whenever `totalItems ≥ 1` (section 18 may refine the label, e.g. with the count). With zero public Memories there is no View all.

### 8.3 States (inside the Community section only)

| State | Shown |
|---|---|
| Loading | A small fixed-height skeleton (two row placeholders) so the popup does not jump |
| Success, ≥ 1 | Up to two rows + View all memories |
| Success, 0 | "No public memories yet." No call to action |
| Failure | "Community memories are unavailable." with a compact Retry (section 18 confirms it fits) |

A Community failure never fails, closes, or blocks the popup, the selection, the map, or the list, and never shows "0".

## 9. Community Memories View (the panel)

### 9.1 Decision: a Discover-side panel (Q4, Q5)

Options evaluated: (A) dedicated public page; (B) Discover-side panel; (C) large modal; (D) expanding the popup.
- (A) contradicts FEATURE-006's deliberate absence of a public trail page and leaves the map context.
- (C) hides the whole app for supporting content.
- (D) makes the popup a journal page (the principle in section 2 forbids it) and fights the collision-aware placement.
- **(B) is chosen:** the visitor stays in map exploration; the panel is clearly subordinate to the trail selection; it closes when the selection goes.

No new public route is created (Q5). The panel's placement, size, modality per viewport, and visual design are in section 18.

### 9.2 Content

- Heading: the trail name with **Community Memories** (and the count).
- A read-only list of the trail's public Memories as journal entries: cover photo (or no-photo surface), title, trip date, and the server's story excerpt when present (with an ellipsis when `storyTruncated`).
- **Show older memories** loads the next page (journal language from FEATURE-009). No numbered pagination, no infinite scroll. Page size: section 18 / Q11.
- Close. When a Memory is open, Back to Community Memories (section 10).
- Never shown: Edit, Delete, visibility, upload/reorder, author identity, likes, comments, or any engagement figure.

### 9.3 Relationship to the popup and selection

- The panel belongs to the selected trail. Changing the selected trail (another row or point) closes the panel; the new trail's popup shows its own preview. Selection cleared by map movement closes the popup and the panel. No Community UI outlives its trail selection (sections 15.3, 15.4).
- At ≥1024 the panel is a non-modal docked rail: the map and list stay usable, and the popup is hidden (`visibility: hidden`, `inert`) until the panel closes, then shown again where its anchor puts it (a new popup state; FEATURE-006 placement rules unchanged). Below 1024 the panel is a modal sheet (DESIGN_SYSTEM §36.7): the map and list are inert while it is open (lead decision, section 18.13 note 4).

## 10. Public Memory Detail

- Opened from a popup preview row or a panel entry; rendered inside the panel (no page navigation).
- Shows: title, trail name, trip date, the full story (plain text, line breaks kept, as FEATURE-009 renders user text), and the photos (section 11).
- Back to Community Memories returns to the list (keeping its loaded pages and scroll position where practical); Close closes the panel.
- No owner controls; no auth CTA inside Detail (the trail-level **Sign in to plan this trip** stays in the popup; Q-decision in section 21).
- A `404` (the Memory became `PRIVATE`, was deleted, or its trail disappeared) shows the neutral "This memory is no longer available." with Back. No deletion or visibility internals are exposed.
- If the loaded Detail's `trailId` is not the selected trail (a hand-edited URL), it shows the same unavailable state; the frontend never re-targets the trail selection from a Memory.

## 11. Photo Presentation

- Preview rows and list entries load **only the cover** (`coverPhoto`), lazily. No gallery photo is fetched before a Memory is opened.
- Detail: one large current photo; for two or more photos, a thumbnail strip under it to choose the current photo (keyboard-operable buttons). No carousel, lightbox, slideshow, swipe library, or video.
- Zero photos: the FEATURE-009 no-photo surface (`NoPhotoSurface`, DESIGN_SYSTEM 37.4). Never a broken image, stock photo, or generated image.
- A photo that cannot be loaded shows the FEATURE-009 fallback with the same geometry (`MemoryImage`).
- Alt text: no authored alt text exists and none is invented (no AI alt, never file names). The rule is in section 18 and must be consistent: decorative thumbnails empty; the large photo a contextual label of the form FEATURE-009 ships ("Photo 2 of 3 from <title>", CM28).

## 12. Query, Cache, and Signed URLs

### 12.1 Query keys (public, separate from owner keys)

| Key | Request | Notes |
|---|---|---|
| `["community-memories", "trail", <trailId>, "preview"]` | `page=0&size=2` | Popup preview; enabled only for a selected, non-synthetic trail |
| `["community-memories", "trail", <trailId>, "list"]` | infinite, page size from Q11 | The panel list; enabled only while the panel shows the list for that trail |
| `["community-memories", "detail", <memoryId>]` | `GET /public/{id}` | Detail; enabled only while that Detail is shown |

- No subject in the keys: public data is the same for every visitor. Owner keys (`["memories", ...]`) are never read, written, or invalidated by FEATURE-010, and FEATURE-010 data is never derived from them.
- The preview and the list are separate keys (different page sizes); the list's first page may be fetched when the panel opens even though the preview holds two of its items. Simple over clever.
- Trail ids and Memory ids are lower-cased for keys.

### 12.2 Freshness

- `staleTime` 5 minutes, `gcTime` 10 minutes (both comfortably under the 15-minute URL life, as FEATURE-009).
- Refetch on mount and on window focus when stale; no reconnect refetch; no polling.
- One automatic retry only for an unavailable service (network/5xx), like the trail queries.
- The query function's `AbortSignal` is passed to the request.

### 12.3 Signed URL recovery (Q14)

Reuse `usePhotoRecovery` semantics per owning query result: an image error shows the fallback and, if the result is older than 60 s, refetches that query once; an `urlExpiresAt` already in the past in a result older than 60 s triggers the same single refetch; a fresh result is never refetched for a photo; at most one refetch per result; never a loop. Signed URLs are presentation only: never stored (no web storage, no URL parameter), never keys or identities (photo `id` and Memory `id` are).

### 12.4 Stale-response safety

Each trail and Memory is its own key, and each component reads only its current key, so a slow response for trail A lands in A's cache entry and never renders in trail B's popup or panel. No custom request manager.

## 13. Synthetic Trail Behavior (Q9)

- For a trail where `isSyntheticTrailSource(source)` is true: the preview query is **disabled** (no memory-service request), and the popup renders **no** Community section at all (no heading, no empty state). The existing sample line, facts, activity text, and auth CTAs stay.
- Community params in the URL with a synthetic trail are dropped (section 15.2).
- Every non-synthetic trail (today `DEMO_SEED`; any future real source) gets Community Memories.
- Rationale: generated trails are not verified routes, FEATURE-009 already refuses Memories for them, and an empty "No public memories yet." would falsely suggest a real trail with no history.

## 14. Empty, Loading, and Error

| Surface | Loading | Empty (success, 0) | Failure | Not found |
|---|---|---|---|---|
| Popup preview | compact two-row skeleton | "No public memories yet." | "Community memories are unavailable." + Retry | n/a (a missing trail is a list `404`: treated as failure copy) |
| Panel list | journal-entry skeletons, same geometry as entries | "No public memories yet." (possible if the last one became private) | same failure copy + Retry; already loaded pages stay when only **Show older memories** fails, with its own inline retry | as failure |
| Detail | reading-layout skeleton (photo frame + title lines) | n/a | failure copy + Retry, Back available | "This memory is no longer available." + Back |

Never flash the empty state before the first response. Never turn a failure into a zero count. Loading and failure text inside the popup is read in place, not announced repeatedly (section 16).

## 15. Selection and URL State

### 15.1 Decision (Q6): search parameters, no new route

| Parameter | Meaning |
|---|---|
| `trail=<uuid>` | Existing: the selected trail (written with `replace`, unchanged) |
| `memories=1` | The Community panel is open on the list for that trail |
| `memory=<uuid>` | The panel shows that public Memory's Detail (implies the panel; `memories=1` is also kept so Back has a target) |

Examples: `/?trail=1111…&memories=1`, `/?trail=1111…&memories=1&memory=7c0e…`.

### 15.2 Writes and history

- **Opening** the panel (View all, a preview row) and **opening a Detail** from the list **push** a history entry, marked in router state as opened in-app; so browser Back closes the Detail, then the panel, then (as today) leaves Discover. Trail selection itself stays `replace`, exactly as FEATURE-006.
- **In-app Back / Close**: if the current entry carries the in-app marker, go back one entry (`navigate(-1)`); otherwise (a refreshed or shared URL) remove the parameter with `replace`. This keeps history free of duplicate entries.
- **Invalid combinations are dropped with `replace`**, silently: `memories`/`memory` without `trail`; with a synthetic trail; with a trail not (yet) selected after the deep-link rules of FEATURE-006 resolve; `memory` that is not a UUID.
- Refresh and deep links restore the panel (and Detail) once the trail selection resolves; `/?trail=…&memories=1` activates Discover at once, like `?trail=`.

### 15.3 Selection changes

- Selecting another trail removes `memories` and `memory` (the panel closes; focus rules in section 16). The old trail's Detail can never stay attached to the new trail.
- Closing the popup (Close or Escape) also closes the panel.

### 15.4 Map movement

When the existing rule clears `selectedTrailId` (the trail is no longer in the current view's result), `trail`, `memories`, and `memory` are all removed in the same `replace`, and the popup and panel close together. No orphan Community UI.

## 16. Accessibility

- Popup Community section: a heading at the next level under the popup's trail heading; the count is part of the heading text or directly associated with it.
- Preview rows: native `<button>`s; accessible name = title + trip date in the visible format (CM3, e.g. "Morning fog at the lake, Oct 12, 2026"); the thumbnail is decorative (`alt=""`).
- View all memories: a button that names the trail in its accessible name ("View all memories for Quarry Rock").
- Panel: semantics per section 18 (a labelled region/complementary landmark when non-modal; `role="dialog"` with `aria-modal` and a focus trap only where it is modal). Labelled by its heading.
- Focus: opening the panel moves focus to the panel heading; opening a Detail moves focus to the Memory title (`tabIndex=-1` heading); Back returns focus to the entry that opened it (or the list heading if that entry is gone); Close returns focus to the control that opened the panel (View all or the preview row) when it still exists, otherwise to the popup heading, otherwise to the list heading. Escape closes the Detail first (back to list), then the panel; it does not also close the popup.
- Entries in the panel list: native buttons (or links styled as entries), keyboard-reachable in order; visible focus on every control (DESIGN_SYSTEM focus ring).
- Thumbnails in Detail: buttons with `aria-current="true"` on the current photo (as DESIGN_SYSTEM §37.5 and the shipped FEATURE-009 strip) and names "Show photo 2 of 3" (CM30).
- Loading/error: the panel announces its first load result and failures once through a polite status region; repeated preview loads in the popup are not announced. Errors use text, not colour alone.
- Images: section 11 alt rule. No mouse-only interaction anywhere; reduced motion: the panel appears without slide animation.

## 17. Responsive and Performance

### 17.1 Viewports

Desktop-first. Primary 1440×900; quick support 1920×1080 and 1024×768 (layouts in section 18). Below 768: a basic usable fallback (full-width panel/sheet); not a mobile redesign.

### 17.2 Popup height

The Community section must fit inside the existing popup height rules at 1440×900, 1920×1080, and 1024×768 without removing approved trail content; if space is short, preview density is reduced first (section 18 defines the compact row size). The popup's existing internal scroll at the desktop breakpoint remains the last resort.

### 17.3 Request budget (P0)

- Selecting one curated trail: **one** preview request (`size=2`). Synthetic trail: **zero**.
- Never one Memory request per marker, row, cluster, or viewport result; no prefetching while exploring the map.
- Opening View all: one list request (first page). Each **Show older memories**: one request. Opening a Detail: one request. Returning to a cached, fresh key: zero.
- Cover photos only in preview and list, lazy-loaded; gallery photos only in an opened Detail.

## 18. UI/UX Design

Final decisions, written against DESIGN_SYSTEM §§18, 20, 35, 36.5, 36.7, 37 and the shipped code (`discover.css`, `TrailPopup.tsx`, `popupPlacement.ts`, `memories.css`, `MemoryVisuals.tsx`). Px are CSS px. Tiers follow the existing ones: XL ≥1680, L 1440–1679, M 1280–1439, S 1024–1279, T 768–1023, N <768. "Short" means `(height < 840px)` at 768px wide and up. Every class is scoped to a new root class, `.community-memories`, in `features/community-memories/community-memories.css`.

### 18.1 Popup Community section (§8)

**Place and separation.** A `section` after the sample-data line and before **Sign in to plan this trip**. It is set off from the trail's own content by a 1px `ink` 0.12 top rule: `margin-top` 16, `border-top` 1px, `padding-top` 16 (12 / 1 / 12 when Short). The Community count can never be read as activity or as a cluster number because:
- it is always a number plus a noun ("3 memories"), never a bare numeral;
- it sits in `stone` 14/20 weight 400 after the heading, never right-aligned, never bold, never in a disc, bubble, or badge;
- it never uses the activity glyph, the `ink`/`paper` marker treatments, or the cluster `stone` disc;
- the rule and the heading put it in a separate block from Daily Trail Activity, two blocks further up.

**Heading.** `h5` (the popup's trail name is the `h4`). "Community Memories" in `ink` 14/20 weight 600. When `totalItems ≥ 1`, the heading continues with ` · ` (`aria-hidden`), a visually hidden ", ", and CM2 in `stone` weight 400. The heading wraps naturally: one line at 300 px content width, two lines with long counts at 260. No count while loading, empty, or failed.

**Preview row** (one `li` > one native `button`, at most 2, in server order). `margin-top` 8 above the `ul`, no gap between rows.

| | Full (default) | Compact (Short, ≥768 only) |
|---|---|---|
| Row height | 56: padding 7 × 8, `margin-inline` −8, so the thumbnail lines up with the content edge | 42 (44 min on a coarse pointer): padding 6 × 8 |
| Thumbnail | 56 × 42 (4:3), radius 8, `object-fit: cover`, 1px `ink` 0.08 inset edge, `paper-shade` while loading | 40 × 30, same treatment |
| Text | gap 12; title `ink` 14/20 weight 600, **one line with an ellipsis**; under it the date `stone` 14/20 (`shortDate`, e.g. "Oct 12, 2026") | gap 10; one line: the title (flex 1, ellipsis), then the date (`stone`, `flex: none`, 8 px before it) |
| Radius | 10 | 10 |

- No cover: the compact no-photo mark (§18.4). A cover that fails: `MemoryImage` variant `thumb` (plain `paper-shade`).
- States: hover `ink` 0.04 fill + title underline (1px, offset 3); pressed `ink` 0.08; focus-visible §18 ring (`trip-control`); cursor pointer. No other control inside the row.

**View all** (shown when `totalItems ≥ 1`). A quiet text button under the rows: `margin-top` 4, min-height 36 (44 coarse), padding 0 8, `margin-inline` −8, radius 8, `ink` 14/20 weight 600, label CM4 followed by a 16 px `ChevronRight` (`aria-hidden`). The visible label **does not include the count** (the heading already carries it). Accessible name CM5. Hover underline + `ink` 0.04; pressed `ink` 0.08; focus ring. Never `conifer`: **Sign in to plan this trip** stays the popup's only filled action.

**States** (inside the section only):
- **Loading:** the heading without a count, then two skeleton rows in the active row geometry (thumbnail block `ink` 0.06; title bar 70% × 12 and date bar 40% × 12, radius 6, `ink` 0.08), then a 120 × 12 bar centred in a 36-tall slot where View all goes. Static (no shimmer), `aria-hidden`, plus visually hidden CM9 in place (not live). **Its height equals the loaded two-row state exactly** (213 / 177 px below).
- **Success, 1 Memory:** one row + View all (the popup shrinks by one row; the existing ResizeObserver places it again).
- **Empty:** the heading, then CM6 in `stone` 14/20, `margin-top` 4. No action.
- **Failure:** the heading, then a line with a 16 px `CircleAlert` in `ember` (`margin-top` 2) and CM7 in `ink` 14/20 weight 500, `margin-top` 8. Then `TripRetryButton tone="paper"` ("Retry" / "Trying again…", 40 tall, 44 coarse), `margin-top` 12. It fits: the failure state is 133–153 px tall, shorter than the loaded state.

**Synthetic trail:** no section, no rule (§13).

### 18.2 Popup height budget (§17.2)

Section height added: Full = 16 + 1 + 16 + 20 (heading) + 8 + 2 × 56 + 4 + 36 = **213 px**. Compact = 12 + 1 + 12 + 20 + 8 + 2 × 42 + 4 + 36 = **177 px**. "Today" is a typical `DEMO_SEED` popup with no image: one-line name, scenery, four facts, a two-line activity line, a full 160-character description, the sample line, and both buttons.

| Viewport | Discover section height (header) | Popup CSS `max-height` (inset) | Typical anchored safe height | Popup today | With Community | Result |
|---|---|---|---|---|---|---|
| 1440×900 (L, width 340, Full) | 828 (72) | 780 (24) | ≈768 (clear of attribution), ≈678 in the zoom column | ≈470 (430–510) | ≈683 (643–723) | Fits anchored. Only in the zoom column does Rule 1 move it to the left side or pan, as today |
| 1920×1080 (XL, width 360, Full) | 1008 (72) | 960 (24) | ≈948 | ≈460 | ≈673 | Fits, about 270 px to spare |
| 1024×768 (S, width 300, Compact) | 704 (64) | 672 (16) | ≈652–688 | ≈490 (470–540) | ≈667 (647–717) | Fits in the common case. A long name plus a five-line description scrolls inside the popup by up to about 45 px (the §17.2 last resort). No approved content is removed |

The compact row is the only density lever. The two-row maximum, the order, and the trail content stay the same.

### 18.3 The Community panel (§9)

**Pattern.** At ≥1024 the panel extends DS §35.1's docked `paper` rail to a second docked rail on the map's far edge, with §36.5 behaviour (non-modal, focus to the heading, Close returns focus). Below 1024 it is the §36.7 detail-viewer bottom sheet. Its contents use §37 journal visuals.

| | ≥1024 (S, M, L, XL) | 768–1023 (T) | <768 (N) |
|---|---|---|---|
| Element | `<aside aria-label={CM10}>`, a complementary landmark | native `<dialog>` opened with `showModal()`, `aria-label={CM10}` | same as T |
| Modality | **Non-modal.** Nothing is trapped; the map and list stay usable | **Modal.** Native focus trap, `ink` 0.40 backdrop, no blur. A backdrop tap closes it | **Modal**, as T |
| Placement | `position: absolute` in `section.discover` (the popup's containing block): `inset-block: 0`, `inset-inline-end: 0`, over the map region's right side | bottom-centred sheet, width `min(560px, 100vw − 32px)` | full-width bottom sheet |
| Size | width S 360 · M 380 · L 400 · XL 440; full section height | fixed height `min(88dvh, 800px)` | fixed height 92dvh, plus bottom safe-area padding |
| Edges | 1px `ink` 0.12 rule on the map-facing edge; no radius, shadow, or blur | radius 20 20 0 0, shadow `0 8px 32px rgb(11 28 32 / 0.24)` | as T |
| Padding (inline) | L/XL 24, S/M 20 | 24 | 16 (12 below 360) |
| z-index | 20 (above the map region and popup) | top layer | top layer |

The map region at 1024×768 keeps 304 px of map visible beside the panel; at 1440×900, 600 px; at 1920×1080, 1000 px.

**Surface and structure.** `paper`, `ink` text. It is a flex column with two parts:
1. **Header** (does not scroll, the same in list and Detail). `padding-top` 24 (S/M/T 20, N 16), `padding-bottom` 16, a 1px `ink` 0.12 bottom rule.
   - `h3` CM1, `ink` 20/28 weight 600, `letter-spacing` −0.01em, `padding-inline-end` 44, `tabIndex=-1`, `trip-focus-target` (no ring on programmatic focus).
   - A line `margin-top` 4: the trail name (`ink` 14/20 weight 500), then, once the list has a count, ` · ` and CM2 (`stone`). While the first page loads, the count is an 80 × 12 bar.
   - Close: a 36 px circle (44 coarse) with an 18 px `X`, at top 16 / end 12 (as the popup's Close), last in the panel's DOM, `aria-label` CM15.
   - Header height ≈ 93 px.
2. **Body**: the only scroller, `overflow-y: auto`, `overscroll-behavior: auto` (§35.1), `padding-block` 8 / 32. It holds the list (§18.5) or the Detail (§18.6). The list and the Detail each restore their own scroll position with the scroller's `scrollTo` (§35.6): opening a Detail saves the list's `scrollTop` and starts at 0; Back restores it.

**The popup while the panel is open.**
- At ≥1024 the popup stays mounted and keeps being placed, but it is hidden with `visibility: hidden` and `inert` (its tip too), so there is only ever one `paper` surface over the map. Its row stays selected (`aria-expanded="true"`). On Close the popup shows again where its anchor puts it, with no entrance animation, and focus goes to the opener (§18.8).
- Below 1024 the popup is left as it is, under the modal backdrop.

**The selected marker** keeps its selected treatment and may sit under the panel. The panel **never moves the camera** (no pan, zoom, or fit), so it causes no `/nearby` request and no change to the selection.

**Map overlays while the panel is open (≥1024).** `section.discover` gets `data-community-open` and `--community-panel-width`.
- The zoom group moves to `inset-inline-end: calc(var(--discover-inset) + var(--community-panel-width))`.
- The attribution moves to `inset-inline-end: var(--community-panel-width)` with `max-width: calc(100% - var(--community-panel-width))`, so the licence text stays visible.
- The map's loading and failure states and the gesture hint add the panel width to their `padding-inline-end`.
- Nothing else in the map changes.

**Interactivity (≥1024).** Rows, markers, clusters, zoom, and the canvas keep working. Selecting another trail closes the panel (§15.3).

**Motion.**
- ≥1024: opens with opacity 0 → 1 and a 4 px slide from the map's right edge (`--duration-base`, `--ease-ui`).
- Sheets: opacity and a 4 px rise.
- Closing, and switching between list and Detail, are instant.
- Under reduced motion everything is instant. Photo fade-ins are also removed.

**The document title** does not change: there is no new route.

### 18.4 Shared visuals and the scoped CSS

- Reuse by import: `MemoryImage` (variants `card` for list covers, `thumb` for preview and strip thumbnails, `large` for the Detail photo), `NoPhotoSurface` (`card` in list covers, `detail` in the Detail frame), `usePhotoRecovery`, and `shortDate`. Never reuse `VisibilityLabel`, `MemoryCard` (it is a link to an owner route), or any owner piece.
- `memories.css` is scoped to `.memories` and arrives only with the owner chunks, so on `/` the reused class names (`memory-photo`, `memory-photo-fallback`, `memory-photo-fallback-text`, `memory-nophoto`, `memory-nophoto-glyph`, `memory-nophoto-caption`) get **their styles from `community-memories.css` under `.community-memories`**. The values are the same as in `memories.css` (`paper-shade` `#ECE8DD`, the `ink` 0.07 contour, the fade, `object-fit` rules, a `large` mat inset of 12). Do not import `memories.css`.
- **Compact no-photo mark** (preview thumbnails only; `NoPhotoSurface` has no size that small): the thumbnail box on `paper-shade` with the same contour gradient and a 16 px (compact 14 px) `stone` lucide `Mountain`, no caption, `aria-hidden`. Built in `community-memories`, with no change to `features/memories`.

### 18.5 Public Memory entry (the panel list)

**Layout:** a journal index entry, one per `li`, in one column. It is not a full-width photo card: a stack of large photos with text would read as a feed.

```
┌──────────┐  Title, up to two lines,
│  cover   │  clamped with an ellipsis
│   4:3    │  Oct 12, 2026 · 3 photos
└──────────┘
Story excerpt across the full width, at most three lines,
ending with an ellipsis when the server cut it…
```

- **Grid:** `grid-template-columns: var(--cm-cover-w) minmax(0, 1fr)`, column gap 16. Cover width 128 (96 tall) at L/XL; 112 (84 tall) at S, M, T, N. The cover sits in the first row; the excerpt spans both columns in the second row.
- **Cover:** the §37.3 frame. 4:3, radius 12, `object-fit: cover`, 1px `ink` 0.08 inset edge, `paper-shade` while loading, lazy. No cover: `NoPhotoSurface size="card"`. Failed: `MemoryImage` `card` fallback (MM13).
- **Title:** `ink` 16/22 weight 600, two-line clamp, `overflow-wrap: anywhere`.
- **Date line:** `margin-top` 4, `stone` 14/20, tabular numbers. `shortDate(tripDate)`, then ` · ` and CM19 when `photoCount ≥ 2`. Nothing for 0 or 1 photo: the cover or the no-photo surface already says it.
- **Excerpt:** only when `storyExcerpt` is not null. `margin-top` 12, `ink` 14/20 weight 400, white space collapsed (line breaks become spaces in this preview), a three-line clamp. When `storyTruncated` is true, the text is `storyExcerpt.trimEnd() + "…"` (U+2026, no space). When the clamp also cuts it, the CSS clamp shows its own single ellipsis.
- **Hit target:** the whole entry is one native `button` (no link: there is no route). Padding 12, `margin-inline` −12, radius 12, `text-align: start`.
  - `aria-labelledby` → title and date ids, giving the name CM18. `aria-describedby` → the excerpt.
  - Hover: title underline and the cover edge darkens to `ink` 0.32. Pressed: an `ink` 0.08 wash on the cover. Focus: the §18 ring. Never zoom, lift, or shadow.
- **Between entries:** a 1px `ink` 0.12 rule (inset to the button's padding), hidden next to a hovered or focused entry.
- **Size:** about 193 px with an excerpt (L) and 121 px without. 1440×900 shows about 3.8 entries; 1024×768 about 3.
- **List semantics:** `ul` labelled by the panel `h3`.

**Skeleton** (first page loading): three static entries in the same geometry. The cover block is `ink` 0.06; bars (radius 6, `ink` 0.08) are 70% × 16 for the title, 40% × 12 for the date, and two full-width plus one 60% × 12 for the excerpt. `aria-hidden`, plus visually hidden CM9. The empty state never flashes first.

**Empty:** CM6 in `stone` 16/24 at the top of the body. **Failure:** the §18.1 failure line, then `TripRetryButton` at the top of the body.

**Show older memories** (when another page exists):
- A full-width `trip-button` (40 tall, 44 coarse, radius 10, 1px `stone` border), `margin-top` 24 under the last entry, label CM20.
- Working: a spinner and CM21, `aria-disabled="true"`, focus kept.
- Failure: the loaded entries stay; CM22 (`ink` 14/20 weight 500 with the `ember` alert icon) appears 12 above the button, and the button's label becomes CM23.
- Success: CM24 is announced politely. Focus stays on the button, or moves to the first new entry when the button disappears (§37.3). There is no end-of-list text.

**Page size (Q11): 8.**
- One column in a 320–390 px panel shows about 3–4 entries per screen, so 8 is about two screens before **Show older memories**.
- It keeps the first response and its lazy cover requests small for supporting content.
- FEATURE-009's 12 fits a four-column grid (three rows of four), which this panel does not have.

### 18.6 Public Memory Detail (in the panel, §10)

The header stays (§18.3). The body, top to bottom:
1. **Back:** a quiet text button, min-height 36 (44 coarse), padding 0 12, `margin-inline-start` −12, radius 8, a 16 px `ArrowLeft` and CM16 in `ink` 14/20 weight 600. Hover underline; pressed `ink` 0.08; focus ring.
2. **Title:** `h4`, `tabIndex=-1`, `trip-focus-target`, `margin-top` 12. `ink` 24/30 weight 600 at L/XL; 22/28 at S, M, T, N. `overflow-wrap: anywhere`. No clamp.
3. **Meta line:** `margin-top` 6, 14/20. The trail name (`ink` weight 500), ` · `, then the date (`stone`, `shortDate`). Visually hidden prefixes CM27.
4. **Photo figure:** `margin-top` 20, the full body width.
   - The frame is the §37.5 mat: `paper-shade`, radius 16, padding 12, **4:3**, `object-fit: contain`, so the whole photograph shows. That is 351 × 263 px at L, 319 × 239 at S, and about 358 × 268 in a 390 px sheet.
   - With 2 or more photos: caption CM29 in `stone` 14/20, `margin-top` 8. Then the thumbnail strip, `margin-top` 12: a `ul` labelled CM31, flex-wrap, gap 8, 56 px buttons (all widths, so five fit on one row at every panel width), radius 8, `object-fit: cover`.
   - The current thumbnail carries the 009 ring: a 2 px `paper` gap and a 2 px `ink` ring. The focus ring replaces it while focused. Hover: a 1 px `ink` 0.32 ring. Pressed: an `ink` 0.12 wash.
   - A thumbnail click shows that photo immediately, with no transition.
   - No photos: `NoPhotoSurface size="detail"` in the same frame, with no caption or strip.
   - A failed photo: the `large` fallback (MM13) at the same size.
5. **Story** (when not null): `margin-top` 20, `ink` **16/26** at every width, because the panel column is narrower than a §37.6 reading column, `max-width: 66ch`, `white-space: pre-line`, a text node only. No heading. Nothing is shown for a null story.

There are no owner controls, no auth action, and no author line.

**Skeleton:** Back is real. Then a title bar 70% × 20 in a 30 px line, a meta bar 40% × 12, the 4:3 frame filled `ink` 0.06, and three story bars (100%, 100%, 60% × 12, gap 14). Static, `aria-hidden`, plus visually hidden CM36.

**Unavailable** (404 or a `trailId` mismatch): Back, then CM32 as the `h4` focus target (`ink` 18/24 weight 600). Nothing else, and no reason.

**Failure:** Back, then the alert line CM7 and `TripRetryButton`.

### 18.7 Alt-text rule (§11)

- **One rule:** an image inside a control that already names the Memory is decorative (`alt=""`). The one image that stands on its own is described by the only true facts available: its position and the Memory's title.
- Preview thumbnails and list covers: `alt=""`. The button's name is CM3 or CM18.
- Strip thumbnails: `alt=""`. The button's name is CM30.
- Large photo: CM28.
- No-photo surfaces and marks: `aria-hidden`.
- The large-photo fallback text is read (as in 009).
- **Reason:** no authored description exists, and inventing one (AI, file names) is forbidden. Repeating the title in every image inside a button would make screen readers say it twice.

### 18.8 Focus and keyboard (complements §16)

- **Popup tab order:** row → (popup) preview row 1 → preview row 2 → View all, or Retry when failed → Sign in to plan this trip → Create account → (auth slot) → Close → next row. The Community heading is not focusable.
- **Opening the panel** (View all or a preview row):
  - At ≥1024: focus goes to the panel `h3` (list), or to the Detail `h4` when opened at a Memory. Focus uses `preventScroll: true`, so the document never scrolls.
  - Below 1024: the same targets, inside the modal dialog. The native trap keeps Tab within it.
- **Panel tab order:** list: entries → Show older memories → Close. Detail: Back → thumbnails → Close. Close is last in the DOM and drawn top right.
- **Escape:**
  - Inside the panel (and the dialog's `cancel` event, with `preventDefault` when in Detail): Detail → list first, then list → closed. It never also closes the popup.
  - Outside the panel: the existing row and canvas Escape rules close the selection, and with it the panel (§15.3).
- **Return targets:**
  - Back: the opening entry, or the `h3` when the Detail was opened from the popup or the entry is gone.
  - Close: the opener (View all or that preview row) after the popup is shown again; otherwise the popup's `h4`; otherwise the list heading.
- **Visible focus:** the §18 ring (`trip-control`) on every control. Body padding (8 block; 20–24 inline against a −12 entry bleed) leaves at least 6 px, so no ring is clipped by the scroller.
- **Status region:** one polite, visually hidden status region per panel. It announces the first list result once (CM2, CM6, or CM7), a Detail failure or unavailable result once, and CM24 after an older page. Nothing in the popup is announced.

### 18.9 Viewport layouts

**1440×900 (primary).** Section 828 tall: rail 440 | map 1000.
```
│ rail 440        │ map 1000                                     │
│ Discover        │                ┌ popup 340 ─────┐   [+/−]   │
│ rows…           │       ●────────▶ name, facts    │           │
│ ▌selected row   │                │ activity, desc │           │
│                 │                │ ── Community ──│           │
│                 │                │ 2 rows, View all│          │
│                 │                │ Sign in / Create│          │
│                 │                └────────────────┘ attrib ▸  │
Panel open:
│ rail 440        │ map 600 (popup hidden) [+/−] │ panel 400      │
│ ▌selected row   │                              │ Community M. × │
│                 │                              │ Trail · 3 mem. │
│                 │                       attrib▸│ entries / Detail│
```
**1920×1080.** Rail 480 | map 1440, popup 360, panel 440 (1000 px of map stays visible). Same composition with more space. Nothing grows beyond these widths.

**1024×768.** Section 704 tall: rail 360 | map 664, popup 300 with compact preview rows (Short), panel 360 leaving 304 px of map (zoom and attribution move into that strip). Detail frame 319 × 239.

**768–1023.** Rail 320 | map. The popup is anchored as today. Rows are full unless Short. View all opens the bottom-centred modal sheet, 560 wide.

**<768 (basic fallback).** The popup is in the flow under its row, with full rows. View all or a row opens a full-width modal bottom sheet at 92dvh with the same header, list, and Detail (cover 112 × 84, frame about 4:3 of the sheet width). It is not a mobile redesign.

### 18.10 Reading as a trail journal, not a feed

- Warm `paper` and `paper-shade` surfaces and the §37 photo frame and mat. The system sans throughout: the product has no serif (DS §7.1), so the journal tone comes from paper, spacing, and the photograph, not a typeface.
- An index of entries beside the map, not a stream of full-bleed photos. A Memory opens as a calm reading page.
- No avatars, names, initials, or "by"; no engagement row (likes, comments, shares, saves, views); no relative times ("2 days ago"), only trip dates; no ranking, sort, or filter; no create or post action; no "be the first".
- Counts appear only as "N memories" and "N photos", in `stone`. No figure is ever styled as a statistic.

### 18.11 Copy deck (CM…)

| Id | String | Use |
|---|---|---|
| CM1 | Community Memories | Popup `h5`; panel `h3` |
| CM2 | 1 memory · {n} memories | Count after the heading (popup), header line (panel), first-load announcement |
| CM3 | {title}, {date} | Preview row accessible name (`date` = `shortDate`, e.g. "Oct 12, 2026") |
| CM4 | View all memories | View all, visible label |
| CM5 | View all memories for {trail} | View all, accessible name (`aria-label`) |
| CM6 | No public memories yet. | Empty: popup, panel |
| CM7 | Community memories are unavailable. | Failure: popup, panel list, Detail |
| CM8 | Retry · Trying again… | Existing `TripRetryButton` strings, reused |
| CM9 | Loading memories… | Visually hidden, in place, while the popup preview or panel list loads |
| CM10 | Community Memories for {trail} | Panel landmark / dialog name |
| CM15 | Close Community Memories | Panel Close (`aria-label`) |
| CM16 | Back to Community Memories | Detail Back |
| CM18 | {title}, {date} | List entry accessible name (excerpt as description) |
| CM19 | {n} photos | Entry date line, `n ≥ 2` only |
| CM20 | Show older memories | Load the next page |
| CM21 | Loading… | Show older, working |
| CM22 | Older memories couldn't be loaded. | Show older, failure line |
| CM23 | Try again | Show older, label after a failure |
| CM24 | 1 more memory shown · {k} more memories shown | Announcement after an older page |
| CM27 | Trail: · Trip date: | Visually hidden prefixes in the Detail meta line |
| CM28 | Photo {n} of {m} from {title} | Large photo `alt` (the FEATURE-009 MM37 form) |
| CM29 | Photo {n} of {m} | Caption under the large photo (no "Cover": that is an owner idea) |
| CM30 | Show photo {n} of {m} | Thumbnail button name |
| CM31 | Photos | Thumbnail strip label |
| CM32 | This memory is no longer available. | Detail unavailable (404, trail mismatch) |
| CM36 | Loading this memory… | Visually hidden, in place, while a Detail loads |

The no-photo caption ("No photos", MM12) and the photo fallback ("Photo couldn't be shown", MM13) come with the reused components. The trail name falls back to the existing `trailContent.unnamed`. Ids CM11–14, 17, 25–26, and 33–35 are intentionally unused. Banned in this feature: author or person words ("by", "shared by", "posted", "member", "hiker", "anonymous"), "be the first", "share yours", "community member", "popular", "trending", "latest", and relative times.

### 18.12 Design-system follow-ups for closeout (not edited now)

1. §35.1 amendment (with spec §24.1): over the map, besides the one anchored popup, a **docked Community rail** may open from the selected trail's popup. While it is open, the popup is hidden and the zoom and attribution shift clear of it.
2. A new §35.8 "Supporting content beside the map": the popup preview block (rule, `h5`, count as words, full and compact rows, the skeleton matching the loaded height) and the docked-rail or ≥1024 / sheet-below rule.
3. §37.3 addition: the **journal index entry** (side cover 4:3, title, date, full-width excerpt with clamp and ellipsis rule) for narrow single-column contexts, and page size 8 for single-column lists.
4. §37.5 / §37.6 addition: in a narrow reading column (≤ about 440 px), a 4:3 mat, 56 px thumbnails, and story text at 16/26.
5. §37.4 addition: the compact no-photo mark for thumbnails under 64 px.
6. §14 Control Geometry: Community rail 0 radius (sheet 20 20 0 0); preview row 10; entry 12; quiet text buttons (View all, Back) 8.
7. §37.1 scope note: journal visuals now also appear read-only on public Discover, inside the Community rail only.

### 18.13 Notes for the lead

1. **Thumbnail state attribute.** §16 says `aria-pressed`; DESIGN_SYSTEM §37.5 and the shipped FEATURE-009 strip use `aria-current="true"`. §18.6 styles the current thumbnail by the ring either way. I recommend amending §16 to `aria-current="true"` for consistency. Until then the frontend follows §16.
2. **Alt form.** §11 shows "Photo 2 of 3, <title>"; FEATURE-009 actually ships "Photo 2 of 3 from <title>" (MM37). CM28 uses the shipped form, as §11 intends ("of the form FEATURE-009 uses").
3. **Date in accessible names.** §16's example "12 October 2026" differs from the visible `shortDate` ("Oct 12, 2026"). CM3 and CM18 use the visible form, so the visible label and the accessible name match.
4. **§9.3 "the map and list stay usable"** holds at ≥1024 (non-modal rail). Below 1024 the panel is a §36.7 modal sheet, so the map and list are inert while it is open. Please confirm, or ask for a non-modal sheet below 1024.
5. **New popup state.** At ≥1024 the popup is hidden (`visibility: hidden`, `inert`) while the panel is open, and comes back on Close. This is new FEATURE-006 popup behaviour, but the placement rules do not change. Also, trails under the panel still count as "in view" for `/nearby` and the list, because the map's bounds are unchanged. I accept that.
6. **Map overlay shift.** Moving the zoom group, the attribution, the map states, and the hint by the panel width touches `discover.css` and TrailMap overlay positions (within the §22.2 write scope). It keeps the attribution visible, which is a licence obligation.
7. **CSS scoping.** The reused `MemoryImage` and `NoPhotoSurface` are styled only under `.memories` in the owner chunk. §18.4 has the Community CSS restyle those class names in its own scope, plus a compact no-photo mark, with no change to `features/memories`. Please confirm this reading of §22.2.
8. **1024×768.** With Community, a wrap-heavy popup may scroll internally by up to about 45 px, so **Sign in to plan this trip** can need a small scroll. That is within §17.2's last resort; please accept it at the product gate.
9. **Browser Back with the modal sheet** (below 1024): when §15 removes `memories` or `memory`, the dialog must close (or go back to the list) in step with the URL. That is an implementation note for `frontend`, with no spec change.

**Lead resolution (2026-10-17).** All nine notes accepted. 1–3: sections 11 and 16 amended (`aria-current="true"`, CM28 alt form, visible date format in accessible names). 4: modal sheet below 1024 confirmed; section 9.3 amended. 5: the hidden-popup state is accepted (section 9.3). 6, 7, 9: recorded in section 22.2. 8: listed for approval in section 24.1.

## 19. Security and Privacy

1. **Public API only.** FEATURE-010 calls only `GET /api/memories/public` and `GET /api/memories/public/{id}`, tokenless (`publicRequest`). It never calls an owner endpoint and never sends a token.
2. **Server is authoritative.** The client never filters owner data by `visibility === "PUBLIC"`; there is no visibility field in the public types at all.
3. **No author identity.** Nothing identifies or labels an author; no generic stand-in label is invented.
4. **Distinct counts.** Map cluster number = number of trails; Community count = number of PUBLIC Memories for the selected trail; Daily Trail Activity = planned trips (curated trails, sample). None is presented as people on the trail now; the Community count never uses the cluster bubble or the activity glyph treatment.
5. **Signed URLs** are never stored or logged; no object key or storage credential is ever displayed or derivable.
6. **Cache isolation.** Public keys never mix with owner keys (section 12.1); the existing sign-out `queryClient.clear()` also clears public entries, which is harmless.
7. **PUBLIC → PRIVATE / deletion** take effect on the next refetch (staleness, focus, mount, or Retry); no realtime subscription. An open Detail that becomes unavailable shows the neutral unavailable state.

## 20. Acceptance Criteria

36 criteria: 18 P0, 13 P1, 5 P2. Lean QA (section 20.4) covers the P0 journey; P1 items are checked where the Lean journey reaches them or by a Targeted pass after a repair; P2 items are deferred to the final Full Regression unless the user asks.

### 20.1 P0

| AC | Criterion |
|---|---|
| AC-01 | **Signed-out public access.** Signed out, Community data comes only from `GET /api/memories/public?trailId=` and `GET /api/memories/public/{id}`, sent with no `Authorization` header and `credentials: "omit"`. No owner `/api/memories` endpoint is called anywhere in the feature. |
| AC-02 | **Selected trail only.** Selecting a curated trail sends exactly one preview request (`page=0&size=2`). Discover activation, pan, zoom, cluster clicks, list rendering, and row or marker hover send none. |
| AC-03 | **Synthetic trails.** Selecting a `SYNTHETIC_DEMO` trail sends no memory-service request and renders no Community section or rule; the sample line, facts, "Today's activity isn't available.", and both auth actions are unchanged. |
| AC-04 | **PUBLIC only; PRIVATE never exposed.** With the section 20.4 data (Public 1, Public 2, Private 3 on one curated trail), the signed-out preview, list, and Detail show Public 1 and 2 and never Private 3. A hand-built `?trail=…&memories=1&memory=<Private 3 id>` shows CM32 (the API answers `404`). |
| AC-05 | **Popup preview.** The Community section sits after the sample-data line and before **Sign in to plan this trip**, behind its rule; heading CM1 with the count CM2; at most two rows (thumbnail or compact no-photo mark, title, date); no story excerpt. Every approved trail element (name, facts, activity, description, sample line, both actions, Close) is still present. |
| AC-06 | **Popup states.** Loading shows the static skeleton at the loaded height (no jump); zero shows CM6 with no action; failure shows CM7 with Retry; the count never shows "0" for a failure. |
| AC-07 | **Error isolation.** With the preview request failing (`503` or timeout), the popup, its auth actions, the selection, the map, and the list all keep working; Retry recovers when the service returns. |
| AC-08 | **View all.** Shown whenever `totalItems ≥ 1` (label CM4, accessible name CM5). It opens the Community panel (at 1440×900: the docked non-modal rail; the popup hidden; `memories=1` pushed to history). |
| AC-09 | **Panel list.** Header CM1, trail name, count. Entries in server order with cover (or no-photo surface), title, date (`· N photos` when ≥ 2), and the excerpt (with "…" when `storyTruncated`). The first list request uses `page=0&size=8`. |
| AC-10 | **Public Detail.** From a list entry or a popup preview row: one detail request; title, trail name, trip date, full story with its line breaks, photos; `memory=<id>` in the URL. |
| AC-11 | **No owner, social, author, or create UI.** No Edit, Delete, visibility, upload, or reorder control; no author name or stand-in, avatar, or "by"; no likes, comments, follows, shares, or engagement figures; no Create / Add / Post Memory or "be the first"; no auth action inside the panel. None of the banned words of section 18.11 appear. |
| AC-12 | **Photos signed out.** Cover thumbnails and Detail photos load without a token. A Memory with two or more photos shows the large photo, caption CM29, and the thumbnail strip; a strip button shows its photo. A Memory with no photo shows the no-photo surface. No broken image appears. |
| AC-13 | **Back and Close.** Back returns from Detail to the list with its scroll position; Close closes the panel and the popup reappears where it was. Escape goes Detail → list → closed and never also closes the popup. |
| AC-14 | **Selection synchronisation and stale safety.** Selecting another trail closes the panel, removes `memories` and `memory`, and shows the new trail's preview (one request). With trail A's preview response delayed, selecting trail B never shows A's Memories in B's popup or panel. |
| AC-15 | **Map movement.** When a pan or zoom clears the selection (the existing rule), the popup and the panel close together and `trail`, `memories`, and `memory` are all removed. |
| AC-16 | **Focus core.** Opening the panel focuses the panel heading (or the Detail title when opened at a Memory); opening a Detail focuses its title; Close returns focus to the opener; every control is keyboard-operable with a visible focus ring. |
| AC-17 | **Cache isolation.** Community data lives only under `["community-memories", …]` keys; no `["memories", …]` owner key is read, written, or invalidated by the feature. |
| AC-18 | **No regressions or scope creep.** At page top no Memory request and no map chunk are made; `/nearby` requests, clustering, the list cap, and selection behave as in the accepted Discover evolution; `npm run build` and `npm run lint` pass; no new dependency; no backend, proxy, or `features/memories` behavior change. |

### 20.2 P1

| AC | Criterion |
|---|---|
| AC-19 | **Show older memories.** Appears only when another page exists; one request per press (`page=n&size=8`); new entries are appended; CM24 is announced; focus follows section 18.5. |
| AC-20 | **Show older failure.** Already loaded entries stay; CM22 appears and the button reads CM23; a retry appends the page. |
| AC-21 | **Panel and Detail states.** Panel first-page failure shows CM7 + Retry; an empty list shows CM6; Detail failure shows CM7 + Retry with Back; Detail `404` or a `trailId` mismatch shows CM32 with Back, revealing no reason. |
| AC-22 | **PUBLIC → PRIVATE.** After the owner makes a public Memory private, the signed-out preview and list drop it on the next refetch (Retry, focus after staleness, or a remount after staleness), and its open Detail shows CM32. No realtime update is expected. |
| AC-23 | **Signed URL recovery.** A failing image shows the fallback and refetches its owning query at most once, only when that result is older than 60 s; an expired `urlExpiresAt` in a result older than 60 s triggers the same single refetch; no loop. No signed URL appears in web storage or the address. |
| AC-24 | **Freshness.** Public queries use `staleTime` 5 minutes and `gcTime` 10 minutes, refetch on mount and window focus when stale, no reconnect refetch or polling, and one automatic retry only for an unavailable service. |
| AC-25 | **URL state.** Refreshing `?trail=…&memories=1` restores the panel and `&memory=…` restores the Detail; invalid combinations (no `trail`, a synthetic trail, a non-UUID `memory`) are dropped with `replace`; browser Back closes the Detail, then the panel; in-app Back/Close add no duplicate history entries. |
| AC-26 | **1920×1080.** The popup with Community fits without internal scroll; the panel is 440 px; the zoom group and attribution stay visible beside the panel. |
| AC-27 | **1024×768.** Preview rows are compact; the popup fits or scrolls internally by at most about 45 px; the 360 px panel is non-modal; zoom and attribution remain visible. |
| AC-28 | **Below 1024.** View all opens the modal sheet (native `dialog`): focus is trapped, Escape and the backdrop close it, and browser Back closes it in step with the URL. Below 768 it is full width and usable. |
| AC-29 | **Accessible names and announcements.** Preview rows CM3; list entries CM18 with the excerpt as description; strip buttons CM30 with `aria-current="true"` on the current one; the large photo's alt CM28; other images `alt=""`; panel landmark or dialog named CM10; the panel status region announces the first result, failures, and older pages once each; nothing in the popup is announced. |
| AC-30 | **Reduced motion.** With reduced motion, the panel and sheet appear and disappear without slide or fade, and photos have no fade-in. |
| AC-31 | **Distinct counts.** The Community count is words in `stone` ("3 memories"), never in a disc, bubble, badge, or the activity glyph; cluster numbers and activity text are unchanged. |

### 20.3 P2

| AC | Criterion |
|---|---|
| AC-32 | Real screen reader pass (VoiceOver and/or NVDA) over the popup section, panel list, and Detail. |
| AC-33 | Safari desktop: the Lean journey and the sheet (native `dialog`) below 1024. |
| AC-34 | Long session: a Detail left open past 15 minutes renews its photo URLs on focus or Retry and recovers images without a loop. |
| AC-35 | Photo edge cases: five photos navigated by keyboard; very tall and very wide images contained in the mat; one failing photo among five. |
| AC-36 | Long content: a very long title and story wrap, excerpts clamp, and the panel never scrolls horizontally at any width. |

### 20.4 Lean QA journey (5–10 minutes; default)

**Prerequisites.** memory-service running on 8085 with `memory_db` (section 24.4). Test data, created through the product's own My Memories UI by a QA account with the run's prefix, on one curated trail (Quarry Rock, `11111111-1111-1111-1111-111111111111`): Public 1 with two photos and a story longer than 240 characters; Public 2 with no photo; Private 3. A second curated trail with no public Memory serves the empty state. List every created account and Memory in the report.

Signed out, 1440×900:
1. Load `/`: no Memory request and no map chunk at page top (AC-18).
2. Scroll to Discover; select Quarry Rock: one preview request `size=2`, no token (AC-01, AC-02).
3. Preview shows Public 1 and 2 only, compact, in place, all trail content present (AC-04, AC-05).
4. View all memories: the docked rail opens, focus on its heading, list `size=8`, Private 3 absent (AC-08, AC-09, AC-16).
5. Open Public 1: title, trail, date, full story, two photos, strip switches photos; no owner/social/author controls (AC-10, AC-11, AC-12).
6. Back to the list, then Close: the popup returns, focus on View all (AC-13, AC-16).
7. Open Public 2 from a popup preview row: Detail with the no-photo surface (AC-10, AC-12).
8. Select the empty trail: CM6, no View all (AC-06).
9. Select a `SYNTHETIC_DEMO` trail: no memory request, no Community section (AC-03).
10. Select another trail while the panel is open: the panel closes and the params go (AC-14); pan far away with a selection: everything closes (AC-15).
11. Make the preview request fail once (route interception): popup still usable, CM7 + Retry recovers (AC-06, AC-07).
12. Hand-built `memory=<Private 3 id>` URL: CM32 (AC-04).
13. Console: no blocking errors.

Quick visual sweeps: 1920×1080 (AC-26) and 1024×768 (AC-27). Full QA is not part of this feature cycle (section 23).

## 21. Final Product Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | Community content in the popup? | Yes, a compact preview (section 8) |
| Q2 | How many popup previews? | 2 |
| Q3 | Story excerpt in the popup? | No |
| Q4 | View All experience? | A Discover-side Community panel (section 9.1; layout in 18) |
| Q5 | Dedicated public route? | No |
| Q6 | URL search params for panel/detail state? | Yes: `memories=1`, `memory=<uuid>` beside `trail`; panel steps push history, trail selection stays replace (section 15) |
| Q7 | Public Memory Detail? | Yes, read-only, inside the panel |
| Q8 | Public author identity? | No, none at all |
| Q9 | Synthetic trails query the Community API? | No request and no Community section |
| Q10 | Curated trail with no Memories? | "No public memories yet." (restrained, no CTA) |
| Q11 | Community list page size? | **8** (one-column panel; about two screens per page; section 18.5) |
| Q12 | Pagination interaction? | **Show older memories** |
| Q13 | Photo gallery? | One large photo + thumbnail strip |
| Q14 | Signed URL refresh strategy? | 5-minute stale / 10-minute gc; refetch on mount and focus when stale; `usePhotoRecovery` single-refetch rule (section 12.3) |
| Q15 | Memory-service failure breaks the trail popup? | No; the Community section alone shows unavailable + Retry |
| Q16 | Community requests for all viewport trails? | No; the selected trail only |
| Q17 | PUBLIC/PRIVATE enforced client-side? | No; public API only |
| Q18 | Owner controls in public Detail? | No |
| Q19 | Backend changes? | None |
| Q20 | New dependencies? | None |
| Q21 | Map clustering changes? | None |
| Q22 | After FEATURE-010? | Feature freeze, then the final Full Regression |
| Q23 | Auth CTA inside public Detail? | No; the trail-level CTA stays in the popup |
| Q24 | View all shown when? | Whenever `totalItems ≥ 1` |

## 22. Implementation Plan and Write Scope

### 22.1 Sequence (future cycle)

Recover → Scope → `frontend` → lead diff review → Lean QA → product gate → closeout. `backend-api` only for a verified contract defect; `ui-ux` done here; `three-d` skipped.

1. Public types, response readers, and request functions (`api/`), using `publicRequest`.
2. Query hooks (preview, list, detail) with the keys and freshness of section 12.
3. Popup Community section (preview, states) wired into `TrailPopup`, disabled for synthetic trails.
4. URL parameter handling in `DiscoverSection` (section 15), including clearing on selection change and map movement.
5. The Community panel: list, Show older memories, states.
6. Public Memory Detail with the gallery and photo recovery.
7. Focus management, announcements, reduced motion, responsive layouts.
8. `npm run build`, `npm run lint`, a short self-check against section 20 P0.

### 22.2 Write scope

- New feature folder **`Project/Frontend/src/features/community-memories/**`** (api, hooks, components, content, types, css): public state only, no owner mutation code.
- `Project/Frontend/src/features/discover/**`: the popup section mount point, the panel mount point, URL parameters.
- Read-only reuse, by import, of `features/memories` presentational pieces (`MemoryImage`, `NoPhotoSurface`, `usePhotoRecovery`, `shortDate`). A tiny, behavior-preserving export change in `features/memories` is allowed only if one of these is not yet exported; no owner behavior change. `memories.css` is not imported: `community-memories.css` styles the reused class names under `.community-memories` (section 18.4), and the compact no-photo mark is built in `community-memories` (lead confirmation of section 18.13 note 7).
- `discover.css` / `TrailMap` overlay positions may shift the zoom group, attribution, map states, and gesture hint by the panel width while the panel is open (section 18.3; note 6).
- Below 1024 the modal sheet must close or return to the list in step with the URL when browser Back removes `memory` or `memories` (note 9).
- `features/trails` only for imports (`publicRequest`, `isSyntheticTrailSource`, types).
- Dependency direction: `discover` → `community-memories` → (`memories` read-only visuals/hooks, `trails`, `lib`); `community-memories` imports nothing from `discover`; `memories` imports nothing from `community-memories`; no file in it imports `maplibre-gl`, `three`, or `@react-three/fiber`.
- Not authorized: `Project/Backend/**`, seeds, recommendation-service, My Memories owner behavior, Gear, 3D, map clustering, the Vite proxy, new dependencies.

### 22.3 Public types (exact)

`PublicMemorySummary { id, trailId, tripDate, title, storyExcerpt: string | null, storyTruncated: boolean, photoCount: number, coverPhoto: PublicPhoto | null, createdAt }`, `PublicMemoryDetail { id, trailId, tripDate, title, story: string | null, photos: PublicPhoto[], createdAt }`, `PublicPhoto { id, position, url, urlExpiresAt: number | null }`, `PublicMemoryPage<T> { items, page, size, totalItems, totalPages }`. Responses are untrusted: invalid items dropped, ids lower-cased and de-duplicated, photos sorted by position.

## 23. Final Feature Freeze Handoff

FEATURE-010 is the last numbered feature. After its implementation, Lean QA, product gate, and closeout:

1. **Feature freeze** (PRD section 48): bug fixing, UI / gear-art / 3D polish, performance, deployment and demo preparation, presentation only.
2. **Final Full Regression** (Full QA across FEATURE-001–010 and the Discover evolution), run then and not during this feature's Lean QA.
3. No FEATURE-011 unless the user explicitly approves one later.

## 24. Documentation Follow-ups and Blockers

### 24.1 Requires user approval with this spec

- **PRD section 41 / DESIGN_SYSTEM 35.1 conflict.** PRD §41 says "On Public Discover … avoid floating panels other than the one marker-anchored trail popup", and DESIGN_SYSTEM §35.1 allows over the map "at most one anchored popup … No widgets, cards". The Community panel (Q4, the brief's preferred direction) is a second Discover surface. Approving this spec approves that exception; closeout amends PRD §41 and DESIGN_SYSTEM §35.1 to allow the Community panel, opened only from the selected trail's popup.

- **1024×768 popup scroll (section 18.2, note 8).** With Community, a wrap-heavy popup may scroll internally by up to about 45 px, so **Sign in to plan this trip** can need a small scroll at 1024×768. This is the section 17.2 last resort, with no trail content removed; approving this spec accepts it.

**Approved by the user on 2026-10-17.** The Community panel exception is narrow: Trail popup → View all memories → the popup hides → the panel opens; Close → the panel closes → the selected trail's popup returns. The popup and the panel are never two simultaneous information surfaces, and the exception grants no permission for other floating map panels. The 1024×768 popup scroll is accepted on condition that the popup scroll stays obvious and usable, **Sign in to plan this trip** stays keyboard-reachable, and there is no scroll trap or broken nested scrolling; 1440×900 and 1920×1080 stay comfortable.

### 24.2 Closeout updates (not now)

- `docs/FRONTEND_CONTEXT.md`: the public Memory consumer, query keys, URL parameters, the `community-memories` feature folder and dependency rules, request budget, the routes table note for `/`.
- `docs/DESIGN_SYSTEM.md` (`ui-ux`): the Community preview rows, panel, public Detail patterns; the §35.1 amendment.
- `docs/PRODUCT_REQUIREMENTS.md`: decision record row; §11.3 (Community Memories delivered), §33, §41 amendment, §47 (FEATURE-010 complete / frozen), §48 (freeze active).
- `CLAUDE.md`: roadmap line (FEATURE-010 complete / frozen; feature freeze; final Full Regression next).
- `.claude/agents/qa.md` / feature-cycle skill wording only if still stale.

### 24.3 Known deployment follow-up

Local Community Memories work through the existing `/api/memories/**` dev proxy. Production still needs `/api/memories/**` routed to memory-service, a storage bucket, and the absolute presigned photo URLs (FEATURE-008 L-F, FRONTEND_CONTEXT section 12). FEATURE-010 does not solve production routing.

### 24.4 Environment prerequisite for QA

memory-service must be running on 8085 with `memory_db` (CLAUDE.md, Commands). It was not running during the last Discover QA; the Lean QA in section 20 is blocked without it.

## 25. Implementation Closeout (2026-10-18)

The approved design above is unchanged; this section records what shipped and how it was verified.

**Result.** IMPLEMENTED — PASS / FROZEN. Product gate: ACCEPTED (user, 2026-10-18). QA: Lean PASS (run 1, no defects). Repair cycles: 0 / 2. Agents: `frontend`, `qa`; `ui-ux` (design done in section 18), `backend-api` (FEATURE-008 public API reused unchanged), and `three-d` skipped; Blender not required. Backend unchanged; no new dependency; no proxy change. Build and lint PASS.

**Files.** New `Project/Frontend/src/features/community-memories/**`; changed `features/discover/components/DiscoverSection.tsx`, `TrailPopup.tsx`, and `features/discover/discover.css`. `features/memories` and `features/trails` unchanged.

**Final behaviour, as verified (signed out; 1440×900, with 1024×768 and 1920×1080 sweeps):**
- **Popup preview:** order facts → Daily Trail Activity → description / scenery → sample-data line → Community Memories → Sign in to plan this trip / Create account. Heading "Community Memories · 2 memories"; at most two compact rows (thumbnail, title, date; no story); View all memories. The loading skeleton matches the loaded height. At 1024×768 the compact rows fit with no popup scroll needed in the tested case.
- **Panel:** View all hides the popup (`visibility: hidden`, `inert`) and opens the docked rail (360 / 400 / 440 px at 1024 / 1440 / 1920) with focus on its heading; the map and list stay usable; zoom and attribution stay visible. Close restores the popup in place and focus to View all. The popup and the panel were never visible together.
- **Public Memory Detail:** title, trail, date, the full story with its line break, two photos with a working thumbnail strip; no owner, author, social, or sign-in controls.
- **URL:** `?trail=<id>&memories=1` and `&memory=<id>`. In-app Back, Escape, and browser Back step Detail → list → popup with no extra history entries; refresh restores the panel; invalid parameters are dropped with `replace`.
- **Selection:** switching trails or panning the selection away closes Community state; a late response for the previous trail never appears under the new one.
- **Synthetic trails:** no Memory request and no Community section.
- **Curated trail with no public Memories:** "No public memories yet."
- **PRIVATE protection:** the PRIVATE QA Memory never appeared; a hand-built Detail URL for it showed "This memory is no longer available." (API `404`).
- **Failure isolation:** a forced `503` showed "Community memories are unavailable." with Retry; the popup, map, and list kept working; Retry recovered.
- **Request budget:** page load, activation, hover, and pan 0; select a curated trail 1 (`size=2`); synthetic 0; reselect cached 0; View all 1 (8 items); open a Detail 1; reopen a fresh Detail 0. Every request went to the public endpoints with no `Authorization` header and `credentials: omit`.

**Deferred / not run (not passed, not defects; candidates for the final Full Regression):**
- Not reachable with the QA data (two public Memories): Show older memories (AC-19) and its failure state (AC-20), the panel list error state, and the public Memory Detail error state (AC-21 beyond the `404` path).
- Not run: PUBLIC → PRIVATE refresh behaviour, signed photo URL expiry and refresh in a long session, the modal bottom sheet below 1024 (AC-28), reduced motion, a real screen reader, Safari, and physical phone or narrow-device checks; the remaining P1 / P2 criteria (AC-22–24, AC-30, AC-31, rest of AC-29, AC-32–36).

**Accepted known limitations.**
- Production still needs `/api/memories/**` routed to memory-service and a storage bucket (section 24.3); local development works through the Vite proxy. A deployment concern, not solved here.
- On a deep-linked Detail load, focus stays on the document body (section 16 defines focus for in-app opening only).
- In development, React StrictMode may abort and resend a first request; production sends one.

**Environment note.** memory-service was running throughout QA. It stopped afterwards only because the background command reached its 2-hour limit; no impact, and it was not restarted for closeout. The QA account and Memories persist in `memory_db` and local storage.

**Next.** FEATURE-010 is frozen, the feature freeze is active (PRD section 48), and the next separate workflow is the final Full Regression. No FEATURE-011.
