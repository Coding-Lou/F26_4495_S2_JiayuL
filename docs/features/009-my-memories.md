# FEATURE-009 — My Memories

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-17).** Product gate accepted by the user 2026-10-17. Lean QA PASS (run 1); repair cycles 0 of 2. Implementation owner `frontend`; `ui-ux` during specification only; `backend-api`, `three-d`: SKIPPED; Blender: NOT REQUIRED; FEATURE-008 contract reused unchanged. FEATURE-010: NEXT, NOT STARTED. Implementation record: section 28. History: specification ready 2026-10-16; approved for implementation 2026-10-17 (Q1–Q20, D1–D30, §22.20 decisions, D12 transparency amendment) |
| Date | 2026-10-16 |
| Routes | `/memories`, `/memories/new`, `/memories/:memoryId`, `/memories/:memoryId/edit` (all authenticated, new) |
| Depends on | FEATURE-002 (Authentication, protected routes, return destination), FEATURE-004 (Trail Detail, trip shell), FEATURE-006 (public `GET /api/trails`), FEATURE-007 (collection patterns, DS §36), FEATURE-008 (memory-service owner API, frozen) |
| Followed by | FEATURE-010 (Community Memories in Discover), then the feature freeze (PRD §48) |
| Feature cycle | `ui-ux`: done (section 22, during this specification). `backend-api`: SKIP unless a verified contract defect. `three-d`: SKIP. Blender: NOT REQUIRED. Recover → Scope → `frontend` → lead diff review → `qa` (Lean) → product gate → closeout (section 25) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (§4.3, §4.8, §33, §35, §45.3) → `docs/FRONTEND_CONTEXT.md` (§3, §4, §7, §8, §10) → `docs/DESIGN_SYSTEM.md` (§8, §9, §14, §18, §36) → FEATURE-008 (§13, §17, §24) |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–4, 7, 24, 26, 27 |
| `frontend` | 5–21, 22, 25 |
| `ui-ux` / design review | 7–16, 19, 21, 22 |
| `qa` | 23, with the sections each criterion names |
| `backend-api` | Not engaged. Section 5.2 records the contract as it is |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; "FC §x" is `docs/FRONTEND_CONTEXT.md`; "DS §x" is `docs/DESIGN_SYSTEM.md`; "004 §x", "007 §x", "008 §x" are those feature specifications; a bare "§x" is this document. Lead decisions are `D…`, acceptance criteria `AC-…`, copy ids from section 22 `MM…`.

Authorship. Section 22 was designed by `ui-ux` (2026-10-16). The lead wrote and reconciled the rest.

---

## 1. Feature Summary

FEATURE-009 builds **My Memories**: the signed-in user's own journal of real trips.

The user opens **Memories** from the authenticated header, sees their Memories as a photo-led collection of journal cards (newest trip first), opens one to read it as a journal entry, and can add a Memory, edit it, change its photos, choose whether it is Private or Public, and delete it. A Memory can also be started from an authenticated Trail Detail with that trail already chosen.

Every Memory is stored by the frozen FEATURE-008 `memory-service`; FEATURE-009 is frontend only, plus one development proxy entry. A Memory made **Public** becomes eligible for FEATURE-010's Community Memories; FEATURE-009 itself shows nobody else's Memories.

## 2. Goals

The user's sentence: *"After a trip, I can keep the photos and the story of it, come back to them, correct them, and decide whether other people exploring that trail may see it."*

Success state:

1. A signed-in user reaches My Memories from the header in one step.
2. They can add a Memory (trail, date, title, optional story, 0–5 photos, Private or Public) on one page and land on it afterwards.
3. Photos appear upright and in the order the user chose; the first is the cover.
4. They can read a Memory as a journal entry, then edit its text, date, visibility, and photos, or delete it; each change survives a reload.
5. Nothing in the collection or detail is ever another user's, including after a sign-out and a different sign-in in the same browser.
6. Empty, loading, unavailable, and partially saved are distinct states, and none is shown as another.

## 3. Roadmap Boundary: 008 / 009 / 010

| Feature | Owns | Does not own |
|---|---|---|
| **FEATURE-008 Memory Foundation** (frozen) | `memory-service`, `memory_db`, owner and public APIs, sanitization, storage, signed URLs | Any UI, proxy entry, or copy |
| **FEATURE-009 My Memories** (this) | `/memories` routes and pages, header entry, Create / Detail / Edit / Delete, Public/Private control, trail picker and preselection, photo picking, client photo preparation, upload sequencing, reorder, Trail Detail's **Add a memory** entry, the `/api/memories` Vite proxy entry | Backend contracts (consumes 008 §13); any public or community presentation |
| **FEATURE-010 Community Memories** | Community preview in the Discover trail popup, view-all, signed-out reading, public API integration | Owner experience; backend contracts (consumes 008 §14) |

Product chain: Discover → Plan → Prepare → Go in real life → **Remember (009)** → optionally share back to Discover (010).

## 4. Scope and Non-goals

### 4.1 In scope

- My Memories collection at `/memories`: title block, quiet count, **Add memory**, card grid in server order, **Load more**.
- Create at `/memories/new` (optionally `?trail=<id>`), one page.
- Memory Detail at `/memories/:memoryId`: cover, title, trail, date, visibility, story, photo gallery, Edit, Delete.
- Edit at `/memories/:memoryId/edit`: date, title, story, visibility, photos (add, remove, reorder); trail read-only.
- Client-side photo preparation (orientation, size cap, re-encode) and sequential upload with progress and partial-failure recovery.
- Header **Memories** link (trip header and Home header); Trail Detail **Add a memory** link.
- Empty, loading, unavailable, not-found, partial-success, and per-action failure states.
- Development proxy entry for `/api/memories/**`.

### 4.2 Non-goals

- **FEATURE-010:** Community Memories in Discover, public previews, view-all, signed-out reading, other users' Memories, any public author presentation. Trail Detail shows no public Memory cards or counts.
- **Social:** likes, comments, follows, follower counts, reposts, public profiles, notifications, feeds, moderation UI, ranking.
- **AI / media pipelines:** GPX upload or replay, AI story, title, recap, or alt text, video of any kind.
- **Other:** search, sort, filters (including Private/Public chips), tags, maps or geolocation in Memory creation, rich text or Markdown, autosave, drafts in web storage, HEIC conversion, drag-and-drop reordering or file dropping, lightbox or carousel libraries, any new runtime dependency, any backend change, new raster illustration assets, Blender, 3D.

## 5. Current Implementation Inspection

Inspected 2026-10-16 on `Dev_Frontend` (working tree).

### 5.1 Frontend

| Area | Finding | Evidence | Consequence |
|---|---|---|---|
| A. Routing | `createBrowserRouter(appRoutes)`. Protected children under `ProtectedRoute`: `home`, `trails/:trailId`, `.../prepare/:tripDate?`, `.../pack`, `gear`. No `/memories` route | `app/router/index.tsx`, `routes.tsx` | Four new children (§6). A data router, so `useBlocker` is available (§19.5) |
| A. Return destination | `isProtectedPath` accepts `/home`, `/gear`, `/trails/<seg>`, prepare and pack paths only; pathname only, never a query | `features/auth/returnDestination.ts` | A signed-out visit to `/memories…` would land on `/home` after sign-in. One additive pattern is needed (D5). `?trail=` never survives sign-in (accepted: the entry is on an authenticated page) |
| B. Navigation | Two headers: `TripHeader` (trip shell; Gear link with `aria-current` on `/gear` exact; narrow Menu) and `HomeHeader` (Home; Gear link; narrow Menu). No Memories item | `components/layout/TripHeader.tsx`, `features/home/HomeHeader.tsx` | Add **Memories** after Gear in both, wide row and Menu (D4) |
| C. Lazy routes | `pages/LazyRoutes.tsx` wraps each page in `Suspense` with the `ink` shell fallback | That file | Three new lazy pages (D3) |
| D. Query conventions | Default `retry: 1`, `staleTime: 30 s`. Private data keyed by subject (`["gear","items",subject]`); `refetchOnMount: "always"`; no focus refetch; `networkMode: "always"`; mutations non-optimistic, `retry: false`, update cache from the response then invalidate | `app/providers/queryClient.ts`, `features/gear/hooks/*` | Memory queries follow, with the signed-URL freshness rules of §17 |
| E. Authenticated client | `authenticatedApiRequest(path, init)`: token fetched per request, only for `/api/...`, sets `Accept: application/json`, never sets `Content-Type` itself | `services/apiClient.ts` | Works for JSON and for `FormData` (the browser sets the multipart boundary). Feature-local wrapper with time limit as `gearRequest` (§17.1) |
| F. Public vs authenticated | Trail reads use tokenless `publicRequest`; owner data uses `authenticatedApiRequest` | `features/trails/api/publicRequest.ts` | Trail names come from the public list; Memory calls are authenticated (§18) |
| G. Trail data | `useTrailList()`: key `["trails","list"]`, fresh 5 min, no subject, returns `TrailSummary[]` (id lower case, name, difficulty, distance, …). `isTrailId()` checks UUID shape. Dataset: 8 `DEMO_SEED` trails | `features/trails/hooks/useTrailList.ts`, `trailId.ts`, trail-service `V2__seed_demo_trails.sql` | One shared query for names and the picker; no N+1 (D8, D9) |
| K. Forms and dialogs | Native `<dialog>` + `showModal()` (`GearFormDialog`); inline two-step destructive confirm (DS §36.9); polite/assertive announcer (`TripAnnouncer`, `useTripAnnouncer`); `useDocumentTitle` | `features/gear/components/*`, `components/layout/*`, `lib/useDocumentTitle.ts` | Reused patterns; no form library |
| K. Date control | `TripDateControl` allows **today or later only** (planning) | `features/planning/components/TripDateControl.tsx` | Not reusable for a past trip date. Memories use a native `<input type="date" max=today>` (D10). `todayIso()` / `isIsoDate()` from `features/planning/tripDate.ts` are reused (local calendar, no UTC) |
| L. Image handling | No `<input type="file">`, `FormData`, `FileReader`, `createImageBitmap`, canvas encoding, or image utility anywhere in `src/` | Repository search | All photo preparation is new code in `features/memories` (§11) |
| M. Orientation / compression utility | None | Same search | Native browser APIs only; no dependency (D12, D27) |
| Session cleanup | `registerSessionCleanup(() => queryClient.clear())` on sign-out and expiry | `app/providers/AppProviders.tsx` | Memory cache is emptied with the session; keys also carry the subject (§20) |
| Dev proxy | `/api/planner`, `/api/trails`, `/api/recommendations/pack`, `/api/users/me/gear` only | `vite.config.ts` | Add `/api/memories` → `http://localhost:8085` (D26) |
| Dependencies | No drag-and-drop, gallery, form, or image library; `lucide-react` present | `package.json` | None needed |

### 5.2 FEATURE-008 contract, as implemented

Verified against `memory-service` controllers and DTOs; it matches 008 §13 and FC §4.

| Operation | Request | Success | Errors FEATURE-009 handles |
|---|---|---|---|
| List own | `GET /api/memories?page=&size=` (size ≤ 50) | `200 MemoryPage<OwnerMemorySummary>` ordered `tripDate DESC, createdAt DESC, id DESC` | `401` |
| Create | `POST /api/memories` `{ trailId, tripDate, title, story?, visibility? }` | `201 OwnerMemoryDetail` (`photos: []`) | `400 VALIDATION_ERROR` (`errors[].field`), `400 TRAIL_NOT_FOUND`, `503 TRAIL_SERVICE_UNAVAILABLE` |
| Read | `GET /api/memories/{id}` | `200 OwnerMemoryDetail` | `404 MEMORY_NOT_FOUND` (missing, deleted, or another user's: identical) |
| Update | `PUT /api/memories/{id}` `{ tripDate, title, story, visibility }` (full replacement, `visibility` required, no `trailId`) | `200 OwnerMemoryDetail` | `400`, `404` |
| Delete | `DELETE /api/memories/{id}` | `204` | `404` (already deleted) |
| Add photo | `POST /api/memories/{id}/photos`, `multipart/form-data`, one part `file` | `201 MemoryPhotoResponse` (appended at the end) | `409 PHOTO_LIMIT_REACHED`, `413 PAYLOAD_TOO_LARGE` / `IMAGE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `503 STORAGE_UNAVAILABLE`, `404` |
| Reorder | `PUT /api/memories/{id}/photos/order` `{ photoIds }` (exactly the current ids) | `200 MemoryPhotoResponse[]` | `400`, `404` |
| Remove photo | `DELETE /api/memories/{id}/photos/{photoId}` | `204` | `404 PHOTO_NOT_FOUND` / `MEMORY_NOT_FOUND` |

`OwnerMemorySummary`: `id`, `trailId`, `tripDate`, `title`, `visibility`, `photoCount`, `coverPhoto | null`, `createdAt`, `updatedAt`. `OwnerMemoryDetail`: `id`, `trailId`, `tripDate`, `title`, `story | null`, `visibility`, `photos[]` (ascending position; first is the cover), `createdAt`, `updatedAt`. `MemoryPhotoResponse`: `id`, `position`, `url`, `urlExpiresAt`. Errors are `ProblemDetail` with `code`. Signed URLs live 15 minutes; locally they are root-relative (`/api/memories/local-photos/...`), with S3 absolute.

Field rules (server): title trimmed 1–120; story ≤ 5000, blank → `null`; `tripDate` ≤ server today + 1 (time-zone allowance only); input JPEG/PNG/WebP ≤ 10 MB, ≤ 40 MP, ≤ 12,000 px a side; ≤ 5 photos; the server re-encodes every photo and drops EXIF, so it never rotates.

**Classification: COMPLETE.** Every FEATURE-009 behaviour is supported. No backend change, migration, or endpoint is needed; `backend-api` is not engaged (Q19).

### 5.3 Deployment state

`api-gateway` is a Spring Cloud Gateway shell with no routes; no AWS or other deployment configuration exists in the repository (008 L-F). FEATURE-009 adds only the **development** proxy. Production routing is a deployment follow-up (§27.3, F9), not invented here.

## 6. Routes and Navigation

### 6.1 Routes (Q1, Q2)

| Route | Page | Notes |
|---|---|---|
| `/memories` | My Memories collection | |
| `/memories/new` | Add a memory (editor, create mode) | Optional `?trail=<uuid>` preselects a trail (§10.2). Static segment, ranked above `:memoryId` |
| `/memories/:memoryId` | Memory Detail (reading) | A `memoryId` that is not a UUID is not-found with no request |
| `/memories/:memoryId/edit` | Edit memory (editor, edit mode) | Same not-found rule |

All four are children of `ProtectedRoute`, render in `TripShell` + `TripHeader` (as `/gear`, 007 D1), and are lazy page chunks in `pages/LazyRoutes.tsx` (D3). There is no drawer, modal route, per-photo route, or search parameter other than `?trail=` on create.

**D1. Memory Detail is a dedicated page** (not a drawer over `/memories`). A Memory holds a cover, up to five photos, a story of up to 5000 characters, and its own actions; it reads as one journal entry, deserves its own URL and document title, and the trip shell already hosts full pages. FEATURE-007's side panel suits short facts, not long-form reading.

**D2. Create and Edit are dedicated editor pages sharing one editor component** (`MemoryEditor`, `mode: "create" | "edit"`). Reasons: one form for both; reading (Detail) stays free of form chrome; browser Back has an honest meaning; the unsaved-changes guard is page-scoped. Editing inline inside Detail was rejected: it mixes reading and managing, and a Back press would silently discard edits.

### 6.2 Authentication

- Signed out, any `/memories…` route follows FEATURE-002: the visitor is sent to `/` with the sign-in gate, no Memory request is made, and the pathname is kept as the return destination.
- **D5.** `features/auth/returnDestination.ts` `isProtectedPath` additionally accepts `/memories`, `/memories/new`, `/memories/<uuid>`, and `/memories/<uuid>/edit` (one regular expression). Pathname only, as for every destination; `?trail=` is not carried (§10.2).
- There is no public owner UI and no public Memory route.

### 6.3 Header (Q18)

**D4.** Both authenticated headers gain **Memories** → `/memories`, placed immediately after **Gear**, in the wide row and in the narrow Menu: `TripHeader` (trip shell: Trail Detail, Trip Preparation, Studio, My Gear, and now the Memory pages) and `HomeHeader` (Authenticated Home). Label **Memories** (PRD §35); the page is titled **My Memories**.

- On `/memories` exactly, the link has `aria-current="page"` and the DS §36.8 treatment, as Gear has on `/gear` (007 D13). On Memory Detail, Create, and Edit it carries no current marker (those pages have their own Back link).
- Resulting authenticated items: brand (to `/home`), Gear, Memories, identity, Sign out (Home additionally keeps New Plan). No Community, Discover, or Profile item is added.

### 6.4 Document titles

"My Memories · Outdoor Trip Companion", "Add a memory · …", "{title} · …" on Detail, "Edit memory · …" on Edit, "Memory not found · …". The title is user text and is never written anywhere else (URL, storage, console).

## 7. Memory Product Model

| Concept | Meaning | Source |
|---|---|---|
| Memory | One user's record of one real trip on one trail | `memory-service` |
| Trail | The trail it happened on; chosen at creation, **immutable afterwards** | `trailId`; name joined from the trail list |
| Trip date | The day of the trip; today or earlier in the viewer's local calendar | `tripDate` |
| Title | Required, 1–120 characters after trimming | `title` |
| Story | Optional plain text, ≤ 5000 characters | `story` |
| Photos | 0–5; order chosen by the user; **the first is the cover** | `photos[]` |
| Visibility | **Private** (default): only the owner. **Public**: eligible to appear for people exploring this trail (FEATURE-010) | `visibility` |

My Memories is a personal journal, not a feed and not a photo backup: photos are re-encoded copies sized for storytelling (§11.6, 008 L-C), and no copy suggests archival or original-quality storage (§22 copy deck).

## 8. My Memories Collection

### 8.1 Hierarchy

1. Trip header.
2. Title block: **My Memories**, one support line, a quiet count ("8 memories"; singular "1 memory"; from `totalItems`), and **Add memory** as the page's one primary action.
3. The card grid.
4. **Show older memories** (the Load more button) under the grid while more pages exist.

**Add memory** appears once the first page has loaded with at least one Memory; the empty state carries its own action; nothing offers Add while loading or unavailable (as 007 D15).

### 8.2 Card

A card shows, in priority order: the cover photo (or the no-photo treatment, §8.5), the title, the trail name, the trip date, and the visibility label. The whole card is one link to `/memories/:id`; its accessible name includes title, trail, date, and visibility. **No Edit, Delete, menu, count, or engagement element on a card**; activating a card opens Detail, never Edit. Design: §22.4.

### 8.3 Order and density

Server order, `tripDate DESC, createdAt DESC, id DESC`, preserved exactly; no client sorting and no sort control. At 1440×900, 3–4 cards per row, larger than gear cards (photographs need room); never 5–6 per row. Exact tracks in §22.

### 8.4 Pagination (Q5)

**D6. Load more**, not numbered pages and not infinite scroll. A TanStack `useInfiniteQuery` with page size **12** (divisible by 3 and 4, so full rows at both densities). The button's label is **Show older memories** (MM14, true for the trip-date order). It requests the next page and appends it; it is shown while `page < totalPages - 1`. While loading it shows a working state; on failure the loaded cards stay, an inline error appears, and the same button becomes **Try again** (§22.3). Focus stays on the button; when the last page has loaded and the button is gone, focus moves to the first newly added card. The addition is announced politely (MM18).

### 8.5 Memory without photos

A Memory may have zero photos (Q8). Its card and its Detail use a designed **no-photo treatment**: a calm paper-and-contour surface built from DS tokens and an existing `lucide-react` line glyph, carrying no fake photo, no broken image, and no empty grey box. No new raster asset (D24). Design: §22.

### 8.6 Filters

None (Q16, D7). At the expected scale (a handful to a few dozen personal entries, already ordered by trip date) a Private/Public filter adds a control without a real need; visibility is visible on each card.

## 9. Create Memory

### 9.1 One page, one form (Q6)

`/memories/new`, a single journal-entry page; no wizard and no modal. Field order: **Trail → Trip date → Title → Story → Photos → Visibility → Save memory**. Grouping and layout in §22.

| Field | Rule (client, before any request) |
|---|---|
| Trail | Required; one of the trails currently in the trail list (§10) |
| Trip date | Required; a real date ≤ the viewer's local today (D10) |
| Title | Required; trimmed length 1–120; whitespace only is an error. A counter appears from 100 characters |
| Story | Optional; ≤ 5000 characters; plain `textarea`, no formatting, no AI. A counter appears from 4500 characters |
| Photos | Optional; 0–5 (§11) |
| Visibility | Private (default) or Public (§15) |

Validation runs on submit and then live for fields already in error; each error is tied to its field (`aria-describedby`, `aria-invalid`), and focus moves to the first invalid field. Server `400 VALIDATION_ERROR` with `errors[].field` of `title`, `story`, or `tripDate` is shown on that field; anything else as a form-level message.

### 9.2 Save sequence (D15)

```text
Save memory
  1. validate locally                                  → errors: stop, nothing sent
  2. wait for any photo still being prepared (§11.3)
  3. POST /api/memories  { trailId, tripDate, title (trimmed), story (or omitted when blank), visibility }
       fail → form unchanged, photos kept, error shown, Save retries step 3 (§19.3)
       ok   → memoryId known; set detail cache; invalidate the list
              metadata fields become read-only on this page (they are saved)
  4. upload prepared photos one at a time, in the chosen order (§11.4)
       status: "Uploading photo 2 of 4…"
  5. if every photo succeeded and the server order differs from the chosen order
       (only possible after a retry): one PUT .../photos/order with the chosen order
  6a. all photos added → navigate (replace) to /memories/:id with notice "saved"
  6b. some failed      → stay on this page in the "saved, photos incomplete" state (§19.4)
```

Rules:

- **Exactly one `POST` per Memory.** Once step 3 has succeeded the page holds the `memoryId`, and nothing on it can send another `POST` (retries apply to photos only). A double activation of Save sends one request.
- `POST` timeout (no answer within the 20 s limit) is ambiguous: the page says it could not confirm the save and offers **Check My Memories** instead of a blind retry (§19.3).
- A Memory is never deleted because a photo failed (Q11).
- Navigation after success uses `replace`, so Back from the new Detail goes to where the user came from, not to an empty create form.

### 9.3 Cancel

**Cancel** returns to the previous page (or `/memories` when there is none), through the unsaved-changes guard (§19.5).

## 10. Trail Selection

### 10.1 Picker (D9)

A native `<select>` labelled **Trail**, with a first empty option ("Choose a trail"), listing every trail of `useTrailList()` sorted by name (case-insensitive), each option's text being the trail name only. Under it, once chosen, one quiet line of facts from the same summary (difficulty · distance) so the user can confirm it is the right trail. No search box, map, geolocation, or new endpoint: with 8 trails a native select is fully keyboard and screen-reader accessible at zero cost. Reconsider a searchable picker if the dataset grows to about 30 trails (the PRD §7.3 threshold).

| Trail list state | Picker |
|---|---|
| Loading | Disabled select with a loading line; Save is allowed to validate but reports "Choose a trail" if still empty |
| Failed | Error line "Trails couldn't be loaded." with **Try again** (refetches the shared query); Save cannot pass validation |
| Loaded, empty | "No trails are available right now." Save cannot pass validation |
| A trail with a null name | Shown as "Unnamed trail" |

### 10.2 Preselection from `?trail=` (Q3, Q17)

- `/memories/new?trail=<id>` is read once on mount. If `<id>` is a UUID and matches (case-insensitively) a trail in the loaded list, that trail is selected and the field shows it plainly.
- If the parameter is malformed or the trail is not in the list, nothing is selected and one quiet line says the trail couldn't be found, so the user chooses one. No request is made for the bad id; the page never fails because of it.
- **Before the first successful save the trail can be changed** (the select stays enabled). Wording near the field: the trail can't be changed after the memory is saved.
- **After saving the trail is permanent (Q4).** Edit shows it as read-only text with the same note; `PUT` never carries `trailId`, and no workaround (delete and recreate) is offered.

### 10.3 Server rejection

`400 TRAIL_NOT_FOUND` (the trail was removed between listing and saving): the trail field shows "That trail is no longer available. Choose another trail.", the trail list is refetched, and focus moves to the field. `503 TRAIL_SERVICE_UNAVAILABLE`: a form-level message that the trail couldn't be checked right now, with Save available to retry. The backend stays authoritative; the client never skips its check.

## 11. Photo Preparation and Upload

### 11.1 Picking

- One **Add photos** button opens `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>` (visually hidden; the button is the control). No drop zone in the MVP.
- The editor shows how many more can be added. Picking more than the remaining slots keeps the first ones in picking order and says how many were not added ("Only 5 photos per memory. 2 weren't added.").
- On iOS, an `accept` list without HEIC makes the system picker hand over JPEG, so most iPhone photos arrive in a supported format without any conversion code.

### 11.2 Type checks (Q12)

| File | Result |
|---|---|
| `image/jpeg`, `image/png`, `image/webp` | Prepared (§11.3) |
| HEIC / HEIF (`image/heic`, `image/heif`, or a `.heic` / `.heif` name) | **Rejected:** "This photo format isn't supported yet. Please use JPEG, PNG, or WebP." |
| Anything else (GIF, AVIF, TIFF, video, …) | Rejected with the same sentence |
| Over 40 MB before preparation | Rejected: "This photo is too large to add." (a decoding-memory guard; typical camera files are far smaller) |
| Decoding fails | Rejected: "This photo couldn't be read." |

A rejected file never becomes a tile; the message appears once in the photo section's status line and is announced. **D13.** HEIC is rejected consistently in every browser, although Safari could decode it: one rule, one message, no conversion code.

### 11.3 Preparation (Q13, D12)

Purpose: correct orientation (the server strips EXIF and never rotates, 008 §10.2) and a sensible upload size. **Not** privacy: the server re-encodes every upload and is the only metadata boundary; nothing in the client claims to remove location data.

1. Decode with orientation applied: `createImageBitmap(file, { imageOrientation: "from-image" })`. Fallback where that rejects: an `HTMLImageElement` from an object URL, `await img.decode()`; current browsers apply EXIF orientation when drawing such an image.
2. Scale so the long edge is at most **2560 px**; never upscale. Draw onto an `HTMLCanvasElement` with `imageSmoothingQuality = "high"`.
3. Choose the output (transparency amendment, user approval 2026-10-17): a JPEG input is always opaque. For a PNG or WebP input, read the drawn pixels once (`getImageData`) and check whether any alpha value is below 255.
   - **Opaque** (every JPEG, and a PNG or WebP with no transparent pixel): fill white beneath, then `canvas.toBlob(…, "image/jpeg", 0.88)`.
   - **Genuinely transparent** (a PNG or WebP with at least one pixel of alpha < 255): `canvas.toBlob(…, "image/png")`, transparency kept. The server stores PNG input as PNG (008 §10.2).
4. If the result is over 10 MB (not expected at 2560 px; possible only for a very detailed transparent PNG), reject with the "too large" message.

No dependency, no general image-editing pipeline: one decode, one scale, one optional alpha check, one encode.
5. Release the bitmap and canvas; create one preview object URL from the prepared blob.

Decisions behind the values:

- **JPEG for opaque images, PNG only for real transparency; never WebP output.** The server stores WebP as JPEG or PNG anyway, and Safari before 17 cannot encode WebP from a canvas (it silently returns PNG). Trail photographs are opaque, so practically every upload is a JPEG; transparency is preserved rather than flattened when it genuinely exists.
- **2560 px long edge.** Covers the largest display in this product (the Detail photo at about 1100–1300 CSS px on a 2× display) with margin; a 2560 × 1920 JPEG at 0.88 is typically 0.8–1.5 MB, so five photos upload in seconds and the server decodes about 5 MP instead of 12–48 MP. Well inside every browser's canvas limits.
- **Quality 0.88.** Visually indistinguishable at display size; the server's single re-encode at 0.90 (008 L-C) is the only further loss.
- **Main thread, one photo at a time, at pick time.** Previews show exactly what will be uploaded, failures appear before Save, and memory use stays bounded. A worker or `OffscreenCanvas` is not needed for ≤ 5 photos; tiles show a "Preparing…" state meanwhile.
- An animated WebP becomes its first frame, which the server then accepts as a still.

Object URLs are revoked when a tile is removed, after a successful upload has been replaced by the server photo, and when the editor unmounts.

### 11.4 Upload (D14)

- **Sequential: one request at a time** (008 §24.3), in the chosen order. No upload queue library, no parallelism.
- Each upload is `POST /api/memories/{id}/photos` with a `FormData` holding one part `file` (the prepared blob, filename `photo-<n>.jpg`, or `.png` for a transparent PNG). The request must not set `Content-Type` itself.
- Client time limit per upload: **60 s** (JSON requests keep 20 s).
- Progress is per photo, not per byte: "Uploading photo 2 of 4…" plus each tile's state (waiting, uploading, added, couldn't be added). No byte progress bar, so plain `fetch` is enough.
- Failure messages by response: `409` "This memory already has 5 photos."; `413` "This photo is too large."; `415` the unsupported-format sentence; `503 STORAGE_UNAVAILABLE`, network, or timeout "This photo couldn't be added right now."; `404` the Memory is gone (§19.6).
- In Edit, photos picked are prepared and then uploaded immediately, with the same rules (§14.3).

### 11.5 Limits shown to the user

Five photos per Memory; JPEG, PNG, or WebP. Size and dimension limits are not shown up front; the 2560 px preparation means a user practically never meets them.

### 11.6 What the user is told

One quiet line in the photo section says photos are resized for the journal (exact copy in §22). No promise of original quality or backup.

## 12. Photo Ordering and Cover (Q9, Q10)

- **The first photo is the cover.** User-facing: "The first photo is your cover." The first tile carries a visible **Cover** label (text, not only a mark). No separate cover control, no `coverPhotoId`, and `position` is never shown.
- **D17. Reorder by explicit controls only:** each tile has **Move earlier** and **Move later** icon buttons (accessible names "Move photo 2 earlier", …; `aria-disabled` at the ends). There is **no Make cover** control (§22.10): Move earlier reaches the cover in at most four presses. No drag-and-drop and no dependency: explicit controls are fully keyboard accessible and enough for five photos.
- Focus follows the moved photo (tracked by its local or server id), and the new position is announced ("Photo moved to position 1. It's your cover.").
- **Create:** order is local until upload; photos upload in that order (§9.2).
- **Edit:** a move sends `PUT /api/memories/{id}/photos/order` with every current photo id in the new order. Not optimistic: the new order is shown from the response, and on failure the previous order stays with an error line. **While any photo request is in flight on Edit (upload, remove, or order), every Move, Remove, and Retry control is `aria-disabled`**; Add photos stays available and its picks queue. Order requests therefore never race each other or an upload.
- **Removing the cover** makes the next photo the cover (server rule, 008 D8); with no photos left the no-photo treatment is used.

## 13. Memory Detail

`/memories/:memoryId`, reading first. Hierarchy (design in §22):

1. **Back to My Memories** link.
2. Title (`h1`), then trail name and trip date, then the visibility label.
3. The large photo area: the cover by default; no photos: the no-photo treatment.
4. Directly under it, when there are two or more photos, the photo strip: thumbnails as buttons that show that photo in the large area (no route change). One photo: no strip. (The strip sits with the photo it controls, not after the story; §22.7.)
5. The story as plain text with line breaks kept (`white-space: pre-line`), never interpreted as HTML or Markdown. No story: nothing is shown for it.
6. Actions: **Edit** (link to `/memories/:id/edit`) and **Delete memory** (§16), quieter than the content.

No comments, likes, share buttons, view counts, owner identity, or ids. A `PUBLIC` Memory is labelled Public with its plain meaning; nothing claims it was posted anywhere (§15.3).

Arrival notices (from router state, an enum only, never content): `saved` → "Memory saved."; `updated` → "Changes saved." (or the public sentence of §15.3 when visibility just became Public). Shown once in the page's notice slot and announced politely; not shown again on reload.

The selected photo is page state, keyed by photo id (never by URL), reset to the cover on each visit.

## 14. Edit Memory

### 14.1 What can change

Trip date, title, story, visibility, and photos (add, remove, reorder). **Trail is read-only** text with the permanence note (Q4).

### 14.2 Saving the details (D16)

**Save changes** sends one `PUT /api/memories/{id}` with the full editable body: `tripDate`, trimmed `title`, `story` (`null` when blank), and `visibility` (always sent). On `200`: the detail cache is replaced by the response, the list is invalidated, and the page navigates (`replace`) to `/memories/:id` with notice `updated`. If no detail field changed, Save changes sends nothing and returns to Detail.

On failure: the typed values stay, the error is shown, and no cache is updated (no false success); Save retries. `404` → the Memory-gone state (§19.6).

### 14.3 Photos in Edit

Photo changes **persist immediately and independently** of Save changes. **While a photo is preparing or uploading, Save changes is `aria-disabled`** with the line MM117, so a navigation after the `PUT` can never abort an upload. Photos: adding prepares and uploads at once (§11.4), removing asks a small inline confirmation on the tile ("Remove this photo?" Cancel / Remove) and then sends `DELETE`, and reordering sends the order (§12). One quiet line in the photo section says photo changes are saved as they are made. Cancel never undoes them. The page never presents the details save and the photo requests as one transaction (§22 copy).

After each photo change the detail query is invalidated so Detail and the collection cover are current on arrival.

### 14.4 Leaving

**Cancel** and **Back** return to Detail through the guard (§19.5): the guard asks only when detail fields differ from the saved values or a photo is still preparing or uploading.

## 15. Visibility

### 15.1 Control (Q7)

A labelled two-option radio group, **Private** (default and preselected on create) and **Public**, each with a one-line meaning:

- **Private** — Only you can see this memory.
- **Public** — This memory may appear for other people exploring this trail.

No other level (Followers, Friends, Unlisted). Labels and icons never rely on colour alone. Changing visibility uses the normal create/update body: no publish endpoint, no moderation step, no duplicate record (008 D7).

### 15.2 Label on card and Detail

A restrained text label, "Private" or "Public", with a small line icon; never an engagement-style badge (§22).

### 15.3 Wording rules

- Use "Public", "Make public", "Memory is public." Never "Post", "Publish to feed", "Share with followers", "Posted to Community", or a claim that anyone has seen it.
- After saving a Memory as Public (create or edit) the notice says: "Memory saved. It's public and can appear for people exploring this trail." (final copy §22). Before FEATURE-010 ships this is still true: the public API already serves it.
- Public → Private takes effect on the next request (008 D7); FEATURE-009 does nothing else. A photo link handed out earlier may work for up to 15 minutes (008 L-A); the UI does not mention signed URLs.

## 16. Delete

- **Delete memory** on Detail opens the DS §36.9 inline two-step confirmation in the action area: the question naming the Memory ("Delete “{title}”?", MM48), one reassurance line (MM49), **Cancel** (initial focus) and **Delete memory** (`ember` confirm). For a Public Memory a second line says it will stop appearing for people exploring the trail (MM50). No "soft delete", "Community", or "permanently erased" wording; no typed confirmation; no large modal.
- Request: `DELETE /api/memories/{id}`. On `204` or `404` (already gone, 007 D10): remove the detail query, remove the Memory from every cached list page, invalidate the list, and navigate (`replace`) to `/memories` with notice `deleted` ("Memory deleted.", announced; focus to the page heading).
- On failure: stay on Detail, keep the confirmation open with an error line, **Delete memory** retries.
- A reload afterwards never shows it again (the server excludes deleted Memories everywhere).

## 17. Queries, Cache, and Signed URLs

### 17.1 Request layer

`features/memories/api/memoryRequest.ts`, modelled on `gearRequest`: `authenticatedApiRequest` with an `AbortController` time limit (20 s JSON, 60 s photo upload), outcome kinds `ok`, `status`, `unreadable`, `timeout`, `network`, `no-session`. **D28.** Unlike gear, a failed memory response's body is read once, best effort, as a `ProblemDetail` for its `code` and `errors[]`; when it is not one, the status alone decides. Nothing about a request or response is logged.

Failure kinds: `no-session`, `timeout`, `unavailable` (network, `5xx` other than the coded `503`s), `rejected` (`400` with field errors), `trail-missing` (`400 TRAIL_NOT_FOUND`), `trail-check-unavailable` (`503 TRAIL_SERVICE_UNAVAILABLE`), `not-found` (`404`), `photo-limit` (`409`), `too-large` (`413`), `unsupported` (`415`), `storage-unavailable` (`503 STORAGE_UNAVAILABLE`), `unusable` (`2xx` that cannot be read or fails response checking).

Responses are checked before use: ids are UUID strings, `visibility` is one of the two values, `photos` is an array of photos with string `id` and `url`; a malformed photo is dropped, a malformed Memory is `unusable`.

### 17.2 Query keys (D21)

| Data | Key | Notes |
|---|---|---|
| Own Memories (pages) | `["memories", "mine", subject]` (infinite; page size 12) | |
| One Memory | `["memories", "detail", subject, memoryId (lower case)]` | |
| Trail names, picker | `["trails", "list"]` (existing `useTrailList`) | Public, no subject; never copied into Memory state |

No request without a subject. `networkMode: "always"`; `retry` once only for `unavailable`; `refetchOnReconnect: false`.

### 17.3 Signed-URL freshness (Q14, D20)

Photo URLs expire 15 minutes after the response that carried them. The cache must never hand out a URL much older than that.

| Setting | Value | Why |
|---|---|---|
| `staleTime` (list and detail) | **5 minutes** | Comfortably inside 15: any data older than 5 minutes is refetched before or as it is shown |
| `gcTime` (list and detail) | **10 minutes** | Unobserved data is discarded before its URLs can expire, so a return visit never renders old URLs first |
| `refetchOnMount` | `true` (when stale) | |
| `refetchOnWindowFocus` | `true` (when stale) | A tab left open for 20 minutes renews its URLs on return; harmless for these small reads |

Image-level recovery: every Memory image has an `error` handler. On the first error for a photo id within one query result, if that result is older than 60 seconds, or the photo's `urlExpiresAt` is in the past, the owning query is refetched once and the image re-renders with the new URL; meanwhile and on a second failure the photo's fallback is shown (§19.7). An image never loops. Before rendering, a photo whose `urlExpiresAt` is already past triggers the same refetch instead of a doomed request.

URLs are presentation only: never stored in `localStorage`, `sessionStorage`, history state, or the URL; never used as React keys, cache keys, or identifiers; never sent back. Mutations use photo ids.

### 17.4 Mutations

All non-optimistic, `retry: false`, cache updated from the server's answer and then invalidated (007 D11).

| Mutation | On success |
|---|---|
| Create | `setQueryData(detail, response)`; invalidate `mine` |
| Update | `setQueryData(detail, response)`; invalidate `mine` |
| Delete (`204` or `404`) | `removeQueries(detail)`; remove the id from every cached `mine` page; invalidate `mine` |
| Add photo, remove photo, reorder | Invalidate `detail` and `mine` (reorder may set the detail's `photos` from its response first) |

## 18. Trail Integration

### 18.1 Trail names (Q15, D8)

Names come from the one shared `useTrailList()` query, joined client-side on lower-cased `trailId` through a memoized map. There is never a request per card or per Memory (no N+1), and no trail field is stored with a Memory.

| Situation | Card and Detail show |
|---|---|
| List loading | A short text skeleton where the name goes |
| `trailId` found | The trail name (or "Unnamed trail") |
| List loaded, `trailId` absent (trail removed, 008 §15.3) | **Trail unavailable**, in `stone`; the Memory is fully usable and never hidden |
| List failed | No trail line on cards; on Detail a quiet "Trail name couldn't be loaded"; nothing else fails |

### 18.2 Trail Detail entry (Q17, D25)

The authenticated Trail Detail (`features/trails/components/TrailDetailScreen.tsx`) gains one quiet link, **Add a memory**, at the end of the reading column (after the description and sample-data line), with a short lead-in that frames it as after-the-trip ("Been here already?" or similar, §22). It links to `/memories/new?trail=<id>`, built by a new `newMemoryLocation(trailId)` in `features/trails/tripRoutes.ts` (so `trails` imports nothing from `memories`).

It is not in the decision rail, is not a button, and never competes with the date control or **Choose this trail**. It appears only once the trail has loaded. Trail Detail gains no Memory list, count, preview, or public content (that is FEATURE-010's, and not on this page). Nothing else on Trail Detail changes.

## 19. Empty, Loading, Error, and Partial Success

### 19.1 Collection

| State | Condition | Behaviour |
|---|---|---|
| Loading | First page not yet answered | Static card skeletons in the grid geometry; title block without count or Add. Never the empty state |
| Empty | First page loaded, `totalItems` 0 | Journal-style empty state: "No trail memories yet." / "After your next adventure, save the photos and story here." / **Add your first memory**. No sample cards, nothing seeded |
| Unavailable | First page failed | "Your memories couldn't be loaded." + **Try again**. Never empty, never zero |
| Refetch failed with data | Later refetch fails | Keep the cards; optional quiet notice |
| Show older memories failed | | Loaded cards stay; inline error; the button becomes **Try again** |

### 19.2 Detail and Edit

| State | Behaviour |
|---|---|
| Loading | Page geometry kept: photo area, title and meta skeletons; Back link present |
| Not found (`404`, or a non-UUID id) | "Memory not found" (`h1`), one neutral sentence ("It may have been deleted, or the link isn't right."), **Back to My Memories**. Never says it belongs to someone else |
| Unavailable | "This memory couldn't be loaded." + **Try again** |

### 19.3 Create failure (before any Memory exists)

Every field and every prepared photo is kept; the error appears at the form level or on its field; Save retries the `POST`. A `POST` that timed out is ambiguous: "We couldn't confirm your memory was saved." with **Check My Memories** (opens `/memories` in place, through the guard) and Save still available; the user decides.

### 19.4 Partial photo upload (Q11)

After the `POST` succeeded, if any photo upload failed, the create page stays and switches to its **saved** state:

```text
Memory saved
2 of 3 photos added. 1 photo couldn't be added.
[tile ✓] [tile ✓] [tile ✕ Couldn't be added · Retry · Remove]
[ Retry failed photos ]   [ View memory ]
```

- Successful photos stay; nothing is deleted; the Memory exists and is in the collection.
- **Retry** (per tile) and **Retry failed photos** upload again sequentially; **Remove** drops the local file.
- **View memory** navigates (`replace`) to Detail; failed photos are then dropped, and the line under the button says photos can be added later from Edit.
- Never "Failed to save memory" when the Memory exists.

### 19.5 Unsaved changes (D22)

- Guarded when meaningful: on Create, once any field differs from its initial value or a photo has been picked, until the save sequence finishes (the "saved, photos incomplete" state of §19.4 is not guarded: MM136 states what is dropped); on Edit, while detail fields differ from the saved values or a photo is preparing or uploading.
- In-app navigation (links, header, Back): React Router `useBlocker` opens a small native `<dialog>`: "Leave without saving?" with **Keep editing** (initial focus) and **Leave**. While uploads run, its text says photos still uploading won't be added.
- Reload or closing the tab: the browser's own `beforeunload` prompt, attached only while guarded.
- **Never blocks** a navigation caused by authentication (sign-out, session expiry, the sign-in gate): the blocker allows every navigation while the auth status is not `authenticated`.
- No autosave and no draft in any storage.

### 19.6 Memory gone mid-edit

A `404` on any Edit request (another tab deleted it): stop, show the not-found state, invalidate `mine`. On Create's photo uploads a `404` cannot normally happen; if it does, the saved state shows the Memory is no longer available.

### 19.7 Photo failure

A photo that cannot be shown after the one refresh of §17.3 shows a quiet fallback in its frame ("Photo couldn't be shown") with the same geometry; title, story, and other photos are unaffected. Never a broken-image icon.

Messages never contain status codes, endpoint or service names, `code` values, "signed URL", "soft delete", or backend text (PRD §37).

## 20. Security and Account Isolation

- **P0 account isolation.** Memory query keys begin with the signed-in subject (§17.2), and the existing session cleanup empties the whole query cache on sign-out and on session expiry (`registerSessionCleanup(() => queryClient.clear())`). User B signing in after user A in the same browser therefore can never be shown A's cached Memories, covers, or details. No Memory data is kept anywhere else.
- The frontend never sends an owner or user id; ownership is the backend's (008 §9.1). A foreign, missing, or deleted Memory is the same neutral not-found.
- No owner subject, storage key, signature, or internal field is ever read, shown, or stored (the owner DTOs contain none).
- User text (title, story) is rendered as text only. It is not written to the URL, web storage, or the console; it is in the document title only on Detail, as Trail Detail does with trail names.
- Photo URLs are presentation only (§17.3). Local preview object URLs are revoked (§11.3).
- FEATURE-009 adds **no web-storage key and no cookie**. Router state carries only a notice enum.
- Client photo preparation is not a privacy control; the server's re-encoding is (008 U2).

## 21. Accessibility, Responsive, Performance

### 21.1 Accessibility

- One `h1` per page ("My Memories", "Add a memory", the Memory title, "Edit memory"); section headings below it.
- Collection: a `ul` of cards; each card one link whose accessible name is "{title}, {trail}, {date}, {Private|Public}"; focus ring DS §18.
- Forms: every field has a visible label; required fields marked in text; errors linked by `aria-describedby` and `aria-invalid`; first invalid field focused on submit.
- Visibility: native radios in a `fieldset` with `legend`; one tab stop; the description of each option associated with it.
- Photos: the picker button has a visible label; each tile is a group labelled "Photo n of N" (plus "cover" for the first); Move earlier / Move later / Remove are buttons with explicit names; reorder and upload results are announced in the polite live region; errors in the assertive one.
- Upload progress ("Uploading photo 2 of 4…") is announced at start, on each failure, and at the end; not on every intermediate tick.
- Dialogs: native `<dialog>` with `showModal()`, focus on the safe action, Escape cancels, focus returns to the opener. Inline confirmations (delete, remove photo) move focus to Cancel and back to the trigger on cancel.
- **Alt text (D23).** No user-written alt text in the MVP and none generated. Cover images on cards: `alt=""` (the link's name carries the entry). Detail large photo: `alt` = "Photo {n} of {N} from {title}" (identifies, does not invent content). Thumbnails: buttons named "Show photo {n} of {N}", image `alt=""`. Editor tiles: `alt=""` inside the labelled group. FEATURE-010 may need richer public photo semantics (§26).
- Reduced motion removes every movement; nothing depends on hover; text ≥ 14px; contrast per DS §9.

### 21.2 Responsive

Desktop first: acceptance at **1440×900**; quick checks at **1920×1080** and **1024×768**. Below 768px a basic usable single-column layout (cards one or two per row, editor single column, photo tiles wrapping). Not a mobile-first photo app.

### 21.3 Performance

- Three lazy chunks (`MemoriesPage`, `MemoryDetailPage`, `MemoryEditorPage`); none loads `three`, `@react-three/fiber`, the avatar runtime, a GLB, MapLibre, or hero/home video. **No new runtime dependency** (D27).
- Collection: one page request (plus Show older memories on demand) and the shared trail list; no polling.
- Images: fixed-aspect frames (no layout shift), `loading="lazy"` and `decoding="async"` except the Detail's first large photo.
- Photo preparation is sequential and releases bitmaps and canvases promptly; uploads are sequential.

## 22. UI/UX Design

All sizes px. Colours are DS §8 tokens; "`ink` 0.12" means `ink` at 12% opacity (the shell's `--trip-ink-12` family). `paper-shade` is `#ECE8DD`, the value DS §35.2 calls `map-land` and 007 §21.6 calls `gear-plate` (22.19 proposes one name). Tiers as 007 §21: **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279, **T** 768–1023, **N** <768 (validated to 320). Composed at 1440×900, checked at 1920×1080 and 1024×768. Track math assumes a classic 15px scrollbar (DS §36.3).

**Design idea in one line: an open field journal on warm paper — photographs mounted on the page with their captions written beneath, and each entry opened as a two-page spread, photos on the left page and the writing on the right.**

What makes it a journal and not FEATURE-007: photographs are the cards (no `snow` slot box, no plate, no pictogram); captions sit directly on the paper; reading opens a spread instead of a side panel; the only ornament is a single spine rule. No textures, tape, torn edges, bindings, handwriting fonts, stickers, streaks, or counts beyond the quiet total.

### 22.1 Page surfaces (A)

All four routes: `TripShell` + `TripHeader` on the solid `ink` base (no scene, image, or scrim), the document scrolls, the header is in flow and scrolls away, never horizontal scroll. Gutters 64 / 56 / 40 / 32 / 32 / 16 (12 below 360); header 72 (XL, L), 64 (M, S, T), 56 (N).

| Surface | Used by | Specification |
|---|---|---|
| **Collection sheet** | `/memories` | DS §36.2 exactly: `paper`, radius 24 (20 on N), no shadow or texture, 1px transparent border, no `overflow: hidden`; width `min(100vw − 2 × gutter, 1600)`, centred; top 16 below the header (8 on N); bottom margin 40 (XL, L), 24 (M, S, T), 16 (N); min-height `100dvh − header − top − bottom margin`; padding 56 / 48 / 40 / 32 / 32 / 20 (16 below 360) |
| **Journal sheet** | Detail, Create, Edit | Same surface, width `min(100vw − 2 × gutter, 1440)`, centred, same padding and bottom margin. Above it, on `ink`, the **Back row** (004 §21.4 recipe: 16px `ArrowLeft`, 8, label `snow` 14/20 weight 600, 44 tall, 12 horizontal padding, icon's left edge on the sheet's left edge): 8 below the header on XL and L, directly below on M, S, T, N; 12 (XL, L) or 8 (others) to the sheet |
| **Spine rule** | Detail and editor at ≥1280 | The sheet's content is a spread: `grid-template-columns: minmax(0, 7fr) 1px minmax(0, 5fr)`; the 1px track is filled `ink` 0.10 for the spread's full height. Column gap each side of it: 56 (XL), 40 (L), 32 (M). Below 1280 there is no spread and no rule |

Reference boxes (sheet x-extent, top). Collection: as 007 §21.1 (1920: 160–1760, 88; 1440: 56–1384, 88; 1024: 32–992, 80). Journal sheet: 1920×1080: 240–1680, 136; 1440×900: 56–1384, 136; 1366×768: 40–1326, 116; 1024×768: 32–992, 116.

### 22.2 Header and Trail Detail entry (L, M)

**Header (D4).** `TripHeader` and `HomeHeader` render **Memories** (MM7) immediately after Gear with Gear's exact link class and states: wide row `… Gear   Memories   identity   Sign out`; narrow Menu rows identity, Gear, Memories, Sign out. On `/memories` exactly (`useMatch({ path: "/memories", end: true })`): `aria-current="page"`, persistent 2px `snow` underline at 4px offset (wide) or the 3px inline-start `ink` bar and weight 600 (Menu), DS §36.8. No marker on `/memories/new`, `/:id`, `/:id/edit`, and Gear's behaviour is unchanged. Home's header gains the same link with no current marker (Home is never `/memories`).

**Trail Detail "Add a memory" (D25).** One `p` appended as the last child of Trail Detail's main column (`trail-column`), rendered only in the loaded state (`view.kind === "trail"`):

| Part | Specification |
|---|---|
| Separation | 32 above; a 1px `ink` 0.12 top border across the column; 16 padding-top |
| Lead-in MM150 | `stone` 14/20, then a space |
| Link MM151 | `<a href="/memories/new?trail=<id>">` from `newMemoryLocation(trailId)`; `ink` 14/20 weight 600; underline at rest (1px, offset 3); no icon, no fill, no border. Hover: underline 2px. Active: fill `ink` 0.06, radius 6. Focus-visible: DS §18 ring. Hit box `inline-flex`, padding 0 4, margin-inline −4, min-height 32 (44 on a coarse pointer) |

It is not in the rail and has no button geometry, so **Choose this trail** stays the only `conifer` element and the date control the only rail control. Effect on 004 §22.1: the main column grows about 70px; at 1440×900 the page now scrolls about 70px; the rail is sticky, so the decision row is still on screen on arrival at every reference size.

### 22.3 Collection: title block, grid, Load more (B)

Order inside the collection sheet: title block → notice slot → grid → Load more row. No filter row (D7).

| Part | Specification |
|---|---|
| `h1` MM2 | `ink` 36/42 (XL, L), 32/38 (M, S, T), 28/34 (N); weight 600; −0.02em; `tabindex="-1"`, no ring |
| Support MM3 | 8 below; `stone` 16/24 (14/20 on N) |
| Count MM4 | 4 below; `ink` 14/20 weight 500, tabular. From `totalItems`, only in the ready state with ≥1 Memory |
| **Add memory** MM5 | At the row's end, vertically centred on the `h1`'s first line (below 768: under the count, 16 below, full width). A link to `/memories/new` styled as the primary action: 16px `Plus`, 8, label; fill `conifer`, `snow` 16/24 weight 600 (8.05:1); 44 tall, radius 12, padding 0 20; hover `conifer-deep`, active `conifer-press`, 150ms. Rendered only in the ready state with ≥1 Memory (§8.1) |
| Notice slot | 24 below the title block when used; `role="status"`, no space when empty. 16px `CircleCheck` in `ink`, 8, `ink` 14/20 weight 500, on a `ink` 0.04 fill, radius 10, padding 10 14, `width: fit-content`. Holds MM26 only; cleared on leaving the page, never shown on reload |
| Grid | 32 below the title block (or the notice). Visually hidden `h2` MM6, then a `ul` with `grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--memory-card-min)), 1fr))` |

Grid tracks (the per-tier `--memory-card-min` keeps 4 per row at 1440 and never 5):

| Tier | `--memory-card-min` | Column gap | Row gap | Reference | Columns | Card width | Cover height (4:3) |
|---|---:|---:|---:|---|---:|---:|---:|
| XL | 300 | 40 | 48 | 1920×1080 (content 1488) | 4 | 342 | 257 |
| L | 272 | 32 | 40 | 1440×900 (content 1217) | **4** | **280** | **210** |
| M | 260 | 28 | 36 | 1366×768 (1191) / 1280 (1105) | 4 / 3 | 277 / 350 | 208 / 262 |
| S | 240 | 24 | 32 | 1024×768 (881) | 3 | 278 | 208 |
| T | 240 | 24 | 32 | 768 (625) | 2 | 300 | 225 |
| N | 240 | 20 | 28 | 390 (318) / 320 (264) | 1 | 318 / 264 | 239 / 198 |

Checks: L at 1679 without a scrollbar (content 1471) needs 1488 for 5 columns, so stays 4; XL at 1680 (content 1425) holds 4 (1320). At 1440×900 the first row's captions and the second row's covers are on screen on arrival (grid top ≈ 266, row 1 ends ≈ 588, row-2 covers 628–838).

**Load more row (D6).** 40 below the grid; centred; rendered while `page < totalPages − 1`.

| State | Treatment |
|---|---|
| Ready | **Show older memories** MM14: secondary button on paper (004 §21.17: no fill, 1px `stone` border, `ink` 14/20 weight 600, 40 tall / 44 coarse, radius 10, padding 0 16), 16px `ArrowDown` before the label. N: full width |
| Working | `LoaderCircle` (spinning) + MM15, `aria-disabled="true"`, cursor `progress`; keeps focus; ignores activation |
| Failed | Loaded cards stay. 12 above the button, centred: 16px `CircleAlert` `ember`, 8, MM16 `ink` 14/20 weight 500, `role="alert"`. The same button is relabelled **Try again** MM17 (`RotateCw`) and retries the same page; focus stays on it |
| Success | Cards append in server order; MM18 announced politely. Focus stays on the button; if the button is no longer rendered (last page), focus moves to the first newly added card |

### 22.4 Memory card (C)

**Semantics.** Each Memory is an `li` holding exactly one `a` to `/memories/:id`. Text order inside the link is title, trail, date, visibility with visually hidden ", " separators, so the accessible name is MM8 (full title even when clamped). Cover `img` `alt=""`. No other control, menu, count, or badge (§8.2).

**Anatomy** (no card container: the photograph is the card, the caption sits on the paper):

| Part | Specification |
|---|---|
| Link box | `display: flex; flex-direction: column`; no fill, no border; radius 14 (shapes the focus ring); padding 0 0 4 |
| Cover frame | Full width, `aspect-ratio: 4 / 3`, radius 12, `overflow: hidden`, background `paper-shade` (shown while the image loads). A 1px `ink` 0.08 inset edge drawn by an overlay above the image, so pale photos keep an edge on `paper` |
| Cover image | `coverPhoto.url`; `object-fit: cover; object-position: 50% 50%` (a display crop only: Detail shows the whole photo); `width`/`height` attributes; `loading="lazy"`, `decoding="async"`; opacity 0 → 1 on load (22.13). No cover: the no-photo surface (22.5). Failure: 22.5 |
| Title | 14 below the frame. `ink` 18/24 (16/22 below 1024), weight 600, `line-clamp: 2`, `overflow-wrap: anywhere`, text node |
| Trail | 6 below. `ink` 14/20 weight 500, one line, ellipsis. Loading: a static bar 50% × 12, `ink` 0.08, radius 6 (`aria-hidden`). Absent from the list: MM10 in `stone`. Null name: MM11. List failed: line not rendered |
| Meta row | 4 below. Flex, `justify-content: space-between`, wrap, gap 4 12. Start: trip date MM32-short in `stone` 14/20, tabular. End: visibility label — 16px line icon (`Lock` for Private, `Globe` for Public) in `stone`, 6, MM9 in `stone` 14/20 weight 500. Same colour for both values; meaning is the word |

**States** (colour changes 150ms `--ease-ui`; cursor `pointer`):

| State | Treatment |
|---|---|
| Hover (fine pointer) | Title underline 1px, offset 3; frame edge `ink` 0.32. No zoom, lift, or shadow |
| Focus-visible | DS §18 ring on the link (radius 14), unclipped (gaps ≥20) |
| Active | Frame overlay `ink` 0.08 fill; title underline |
| Forced colors | Frame edge 1px `CanvasText`; focus by the transparent outline |
| Skeleton | Same geometry, `aria-hidden`: frame `ink` 0.06; bars `ink` 0.08 radius 6: title 70% × 16, trail 50% × 12, meta 35% × 12, 10 apart. Static |

### 22.5 No-photo surface and photo fallbacks (D)

One recipe, three sizes (card cover, Detail frame, empty-state art); tokens and CSS only, no raster.

| Layer | Specification |
|---|---|
| Base | `paper-shade` |
| Contour lines | `repeating-radial-gradient(ellipse at 72% 118%, transparent 0 18px, ink 0.07 18px 19px)` — soft concentric lines rising from the lower right, like a topographic sheet. No other gradient |
| Glyph | `lucide-react` `Mountain`, `stone`, stroke 1.75, `absoluteStrokeWidth`, `aria-hidden`: 32 on cards, 48 on Detail, 40 in the empty state. Centred, nudged 8 above centre when a caption follows |
| Caption | MM12, `stone` 14/20 weight 500 (5.27:1 on `paper-shade`), 10 below the glyph. Cards and Detail; not in the empty state |

It is never a grey box, never a fake photo, and never says "error".

**Photo that cannot be shown** (after the one refresh of §17.3): the frame keeps its geometry and base `paper-shade`, without contour or glyph; MM13 centred in `stone` 14/20. No broken-image or `ImageOff` glyph. Thumbnails and editor tiles show the plain `paper-shade` base only.

### 22.6 Collection states (E)

| State | Grid area | Title block |
|---|---|---|
| Loading | 8 skeleton cards (22.4) in the tracks; `ul` `aria-busy="true"`; hidden status MM19 | `h1` + support only |
| Empty | Replaces the grid. Centred column, max-width 480, 48 top padding: the no-photo surface at 240 × 180, radius 12, `aria-hidden`; 24; `h2` MM20 `ink` 22/28 weight 600, `tabindex="-1"`; 8; MM21 `stone` 16/24; 24; **Add your first memory** MM22 (the Add memory recipe) | `h1` + support only |
| Unavailable | Same column, no art: `h2` MM23; 8; MM24 `stone` 16/24; 24; **Try again** MM17 (secondary on paper, `RotateCw`; working `LoaderCircle` + MM25, `aria-disabled`) | `h1` + support only |
| Refetch failed with data | Cards stay; nothing shown | Unchanged |
| Load more failed | 22.3 | Unchanged |

### 22.7 Memory Detail (J)

Reading, not managing: it should feel like opening one journal entry.

**DOM order** (every width): Back row MM31 → sheet: notice slot → `article` labelled by the `h1`: head (`h1`, meta line, visibility line) → photo figure (large frame, caption, strip) → story → actions.

**Placement.** At ≥1280 the article is the spread (22.1): the figure occupies the left page across all rows (`grid-row: 1 / -1`), and head, story, and actions stack in the right page. The figure is `position: sticky; top: 24; align-self: start` when the viewport is ≥720 tall, so the photograph stays beside a long story. Below 1280: one centred column, max-width 760, in DOM order.

| Part | Specification |
|---|---|
| Notice slot | First in the sheet, the 22.3 notice recipe, 24 below when used. MM44–MM47; announced politely once; not on reload |
| `h1` | The title as a text node. `ink` 40/46 (XL, L), 36/42 (M), 32/38 (S, T), 28/34 (N); weight 600; −0.02em; wraps, never truncated; `tabindex="-1"` |
| Meta line | 12 below, 16/24: trail name `ink` weight 500, " · ", long date MM32 `stone`; hidden prefixes MM35. Trail loading: bar 160 × 14 `ink` 0.08; unavailable MM10 `stone`; list failed MM36 `stone` in place of the name |
| Visibility line | 8 below: 16px `Lock` / `Globe` in `ink`, 8, MM9 `ink` 14/20 weight 600, 8, meaning MM33 / MM34 in `stone` 14/20; wraps under the label |
| Large frame | Mat: `paper-shade`, radius 16, padding 16 (12 below 1280). Spread: `aspect-ratio: 4 / 3` (1440: 653 × 490; 1920: 709 × 532; 1366: 647 × 485). Single column: `aspect-ratio: 3 / 2` (1024: 760 × 507; 390: 350 × 233). The photo is `object-fit: contain` inside the padding, radius 2: the **whole photograph is always visible**, with mat around it. First photo `loading="eager"`, others lazy. `alt` MM37. No photos: the no-photo surface fills the frame (22.5) |
| Caption | Two or more photos only: 8 below the frame, `stone` 14/20: MM39 |
| Strip | 12 below the caption; a `ul` of `button`s, gap 10, wraps. Thumb 64 × 64 (56 below 1280), radius 8, image `object-fit: cover`, `alt=""`; name MM38. Selected: `aria-current="true"` and an outer ring `0 0 0 2px paper, 0 0 0 4px ink`. Hover: `0 0 0 2px paper, 0 0 0 3px ink 0.32`. Active: overlay `ink` 0.12. Focus-visible: DS §18 ring (replaces the selection ring while focused; the caption still names the photo). Activating shows that photo in the frame (22.13); focus stays. Default selection: the cover, on every visit |
| Story | Spread: 24 below the visibility line, after a 1px `ink` 0.12 rule with 24 below it. Single column: 32 below the strip. `ink` 18/30 at ≥1280, 16/26 below; `max-width: 66ch`; `white-space: pre-line`; `overflow-wrap: anywhere`; text node. Visually hidden `h2` MM41. Null story: nothing |
| Actions | 32 below the story (or the visibility line), after a 1px `ink` 0.12 rule with 20 below. Row, gap 8, wraps: **Edit** MM42 — a link to `/:id/edit` styled as the secondary button on paper with 16px `Pencil`; **Delete memory** MM43 — the quiet destructive text button (007 §21.8: no border, `ink` 14/20 weight 600, 16px `Trash2` in `ember`, 40 tall / 44 coarse, padding 0 10, radius 10; hover underline + `ink` 0.04; active `ink` 0.08) |

Photo heights in the spread fit the sticky rule at every reference size (1366×768: frame + caption + strip ≈ 593 ≤ 720).

**States.** Loading: Back row, the spread geometry with a frame of `ink` 0.06 (no mat), bars for the `h1` (60% × 32), meta (40% × 16), and three story lines, hidden status MM58. Not found: journal sheet with one column, `h1` MM55, MM56 `stone` 16/24, 24, **Back to My Memories** (secondary on paper, `ArrowLeft`). Unavailable: `h1` MM57-title, MM57-body, **Try again**.

### 22.8 Delete (K)

DS §36.9, inline in the actions row (it replaces the row; no new surface):

| Part | Specification |
|---|---|
| Container | `role="group"` `aria-labelledby` the question |
| Question MM48 | `ink` 16/24 weight 600, the title in curly quotes as text, wraps |
| Body | 4 below, `stone` 14/20: MM49; for a Public Memory, MM49 followed by MM50 |
| Actions | 16 below: **Cancel** MM51 (secondary on paper) — initial focus; 8; **Delete memory** MM43: fill `ember`, `snow` 14/20 weight 600 (4.8:1), 16px `Trash2`, 40 tall / 44 coarse, radius 10, padding 0 16; hover `ember` mixed 12% toward `ink`, active 24% |
| Cancel / Escape | The action row returns; focus to Delete memory |
| Deleting | Confirm shows `LoaderCircle` + MM52, `aria-disabled`; Cancel `aria-disabled`; Escape ignored |
| Failure | MM53 above the actions, 16px `CircleAlert` `ember` + `ink` 14/20 weight 500, `role="alert"`; confirmation stays; confirm retries |
| Success | §16: `replace` to `/memories` with the `deleted` notice; focus to its `h1`; MM26 announced |

### 22.9 Editor: layout and fields (F)

One component, two modes. Inside the journal sheet: `h1` (MM62 / MM63, the 22.7 `h1` scale one step smaller: 36/42 XL–L, 32/38 M–T, 28/34 N, `tabindex="-1"`) → support MM64 (create only; `stone` 16/24, 8 below) → status slot (22.12) → `form` → footer. 32 between the head and the form.

**Layout decision: a two-page spread at ≥1280, one journal column below.** The left page is the entry (Trail, Trip date, Title, Story); the right page is Photos then Visibility. DOM order is exactly §9.1's field order; the spread reads left page then right page. Below 1280: one centred column, max-width 760. Reason: a single 760 column at 1440 would be a narrow form in a wide sheet (DS §3.3) with Save ~1100px down; the spread puts writing and photos side by side, as in the Detail. Column widths at 1440: left 663, right 473 (1920: 739 / 532; 1366: 645 / 465).

Field recipe (shared): label `ink` 14/20 weight 600, then 8, a `stone` 14/20 weight 500 marker **Required** MM67 or **Optional** MM68; 6 below, the control; 6 below, helper (`stone` 14/20) at the start and the counter (`stone` 14/20, tabular) at the end; both in the control's `aria-describedby`. Control: fill `snow`, 1px `stone` border, radius 10, `ink` 16/24. Hover: border `ink`. Focus-visible: DS §18 ring. Invalid: 2px `ember` border, `aria-invalid="true"`, and the helper replaced by the error (16px `CircleAlert` `ember`, 8, `ink` 14/20 weight 500). No placeholders. No `maxlength` on Title or Story, so a pasted text is never silently cut; the counter and the error carry the limit.

| Field | Specification |
|---|---|
| Trail + Trip date | One row (gap 16; stacked on N): Trail flexible, Trip date 220 wide |
| Trail (create) | Native `<select>` MM69, 44 tall, `appearance: none`, padding 0 40 0 12, 16px `ChevronDown` in `ink` at the end (`pointer-events: none`). First option MM70; trails by name. Below: facts line MM71 `stone` 14/20 (once chosen), then 4, the note MM72 `stone` 14/20 with a 16px `Info` before it. States per §10.1: loading → disabled, helper MM74 with a static `LoaderCircle`; failed → MM75 error line plus a 36-tall secondary **Try again** (44 coarse) 8 below; empty → MM76; bad preselect → MM77 under the select in `stone` with `Info` |
| Trail (edit; create after the save) | No control. A "label" `span` MM69 (field label style, no Required marker), 6, the name as `p` `ink` 16/24 weight 600 in a 44-tall row (fill `ink` 0.04, radius 10, padding 0 12, no border), then the facts line and the note MM73. Unavailable / unnamed / failed: MM10 / MM11 / MM36 |
| Trip date | Native `<input type="date">` MM78, `max` = local today, 44 tall, padding 0 12, `color-scheme: light`, the browser's own picker. Helper MM79. Errors MM119–MM121 |
| Title | 24 below the row. `<input type="text">` MM80, **52 tall, `ink` 20/28 weight 600** (the entry's heading, written), padding 0 14, `autocomplete="off"`. Helper MM81; counter MM82 from 100 characters, `ember`-bordered error MM123 over 120 |
| Story | 24 below. `<textarea>` MM83, Optional; fill `snow`, radius 12, padding 16 18, `ink` 16/26, `resize: vertical`; min-height 300 (XL, L), 240 (M, S, T), 180 (N). Helper MM84 (above the counter line). Counter MM85 from 4500; error MM124 over 5000. Plain text only: no toolbar, formatting, or AI |

### 22.10 Editor: photos (G)

A `section` labelled by its `h2` MM86 (`ink` 18/24 weight 600) with **Optional** beside it. On the spread it is the first block of the right page; below 1280 it follows Story by 32.

| Part | Specification |
|---|---|
| Lines | 8 below the heading, `stone` 14/20, 4 apart: MM87; MM88; Edit only: MM90 |
| Add photos | 16 below. `button` MM91: secondary on paper with 16px `ImagePlus`; it clicks a visually hidden `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>`. Beside it (8, same line, wraps): remaining line MM89 `ink` 14/20 weight 500. At 5 photos the button is `aria-disabled="true"` and MM89 says so |
| Status line | 12 below, `role` none (announcements go to the page regions, §21.1): picking messages MM105 (16px `CircleAlert` `ember` + `ink` 14/20 weight 500; replaced at the next pick), upload progress MM104 (`LoaderCircle` + `ink` 14/20 weight 500), order status MM107. Takes no space when empty |
| Photo list | 16 below. An `ol` of photo tiles laid out as rows, gap 8 — a vertical list because "earlier" and "later" then mean up and down. No drag handle, no drop zone |

**Photo tile** (`li`, `role="group"`, name MM92):

| Part | Specification |
|---|---|
| Box | Fill `snow`, 1px `ink` 0.10 inset border, radius 12, padding 8; flex row, gap 16, `align-items: center` |
| Preview | 120 × 90 (4:3; 96 × 72 below 1280; 80 × 60 on N), radius 8, `object-fit: cover` (preview only), `alt=""`, base `paper-shade`. Create: the prepared blob's object URL; Edit: the server photo |
| Text | Flexible, `min-width: 0`. Line 1: MM93 `ink` 14/20 weight 600; on the first tile, 8, then the **Cover** tag MM94 (`ink` 14/20 weight 600, 1px `ink` 0.32 border, radius 6, padding 0 6, 24 tall): a word, not a mark. Line 2, 2 below, the state (table below) |
| Controls | At the end, gap 4: **Move earlier** (`ArrowUp`), **Move later** (`ArrowDown`), **Remove** (`X`): icon actions, circle 36 (44 coarse), 18px icon `ink`, no fill, 1px `ink` 0.16 border; hover fill `ink` 0.06; active `ink` 0.10; names MM96 / MM97. Move earlier is `aria-disabled` on the first tile, Move later on the last (`aria-disabled`, not `disabled`, so focus is never lost; 40% opacity). On N the controls wrap to a second line under the text, start-aligned |
| **Make cover** | **Not provided.** Cover = first; Move earlier reaches it in at most four presses with focus following; a fourth control per tile adds clutter to five rows for little gain |

Tile states (line 2):

| State | Text and treatment | Controls |
|---|---|---|
| Preparing | `LoaderCircle` 16 + MM95-preparing, `stone` | Move, Remove |
| Ready (create, before Save) | MM95-ready, `stone` | Move, Remove |
| Waiting | MM95-waiting, `stone` | `aria-disabled` |
| Uploading | `LoaderCircle` + MM95-uploading, `ink` weight 500 | `aria-disabled` |
| Added | 16px `Check` `ink` + MM95-added, `ink` | Create saved state: none; Edit: Move, Remove |
| Couldn't be added | 16px `CircleAlert` `ember` + MM95-failed `ink` weight 500, then the reason MM106 in `stone` on line 3; preview at 50% opacity | **Retry** (secondary on paper, 32 tall / 44 coarse, `RotateCw`, name MM98) and Remove |
| Saved (edit, settled) | No state line | Move, Remove |

**Remove.** Create: immediate and local; focus moves to the Remove control of the tile now at that position, else the previous tile's, else Add photos; MM102. Edit: an inline confirmation inside the tile, spanning the text and controls area on a second line: MM99 question `ink` 14/20 weight 600, **Cancel** (initial focus) and **Remove** (`ember` fill, 32 tall / 44 coarse); Cancel or Escape returns focus to the Remove icon; while removing MM100; failure: MM107-remove in the status line, confirmation stays.

**Move.** Focus stays on the same control of the moved photo; if that control became `aria-disabled` (photo reached an end), focus moves to the opposite move control. MM101 announced. Edit: while any photo request is in flight (upload, remove, order), every Move, Remove, and Retry is `aria-disabled`; Add photos stays available and queues.

### 22.11 Visibility control (I)

A `fieldset` after Photos (24 below; on the spread, in the right page), visible `legend` MM108 `ink` 18/24 weight 600. Two native radios as stacked **choice tiles** (DS §36.6), gap 8, one tab stop, arrows choose; Private checked by default on create.

| Part | Specification |
|---|---|
| Tile | `label` wrapping the visually hidden radio; fill `snow`, 1px `ink` 0.16 inset border, radius 12, padding 14 16, min-height 72; grid: 20px icon (`Lock` / `Globe`, `ink`) · text · 18px reserved check space |
| Text | Option MM109 / MM110 `ink` 16/22 weight 600; 2 below, meaning MM33 / MM111 `stone` 14/20 (the radio's `aria-describedby`) |
| Hover / active | Border `ink` 0.32 / fill `ink` 0.04 |
| Selected | 2px `ink` inset ring and a 18px `CircleCheck` `ink` at the end. Same treatment for both values: Public is not coloured or warned about |
| Focus-visible | DS §18 ring on the tile (`label:has(:focus-visible)`) |
| Read-only (create after the save) | Both tiles `aria-disabled`, selected one kept, opacity 1 for the selected, 0.5 for the other |

### 22.12 Footer, saving, partial success, leaving (H, K)

**Footer.** After the form, full content width: 32 above, a 1px `ink` 0.12 rule, 24 below. Form-level error line (when any) first: 16px `CircleAlert` `ember`, 8, `ink` 14/20 weight 500, `role="alert"`, 16 above the buttons. Buttons end-aligned, gap 8: **Cancel** MM112 (secondary on paper), then **Save memory** MM113 / **Save changes** MM114 (fill `conifer`, `snow` 16/24 weight 600, 44 tall, radius 12, padding 0 20; hover / active as Add memory). N: full width, Save first.

| Situation | Treatment |
|---|---|
| Save, invalid | Errors on fields; focus to the first invalid field; nothing sent |
| Saving (create, `POST`) | Save: `LoaderCircle` + MM115, `aria-disabled`; Cancel `aria-disabled`; fields read-only; second presses send nothing |
| Adding photos (create) | Fields now saved: Trail and Visibility shown read-only (22.9, 22.11), Trip date / Title / Story `readonly` with fill `ink` 0.04 and border `ink` 0.12. Save: MM116; status line MM104; tiles Waiting → Uploading → Added |
| Ambiguous timeout | A status block in the status slot (below the head): `role="alert"`, fill `ink` 0.04, radius 12, padding 16 20; 16px `CircleAlert` `ember` + MM129 `ink` 16/24 weight 600; 4; MM129-body `stone` 14/20; 12; **Check My Memories** MM130 (secondary link to `/memories`, through the guard). Save stays available below |
| Saving (edit, `PUT`) | Save changes: MM115; Cancel `aria-disabled`; photo controls `aria-disabled`. While a photo is preparing or uploading, Save changes is `aria-disabled` with MM117 `stone` 14/20 beside it |
| Failures | Messages MM125–MM128, MM131 on their field or the form line; values kept |

**Saved, photos incomplete (§19.4).** The status slot shows a block (fill `ink` 0.04, radius 12, padding 20 24, `role="group"` labelled by its heading): 20px `CircleCheck` `ink` + `h2` MM132 `ink` 20/28 weight 600, `tabindex="-1"` (focus moves here); 4; MM133 `ink` 14/20 weight 500. The form is read-only; tiles show Added or Couldn't be added. The footer becomes **Retry failed photos** MM134 (`conifer`, `RotateCw`) and **View memory** MM135 (secondary, `replace` to Detail), with MM136 `stone` 14/20 under the row. No Cancel; no leave guard (the line says what is dropped). MM133 is announced politely; a Memory gone (`404`) replaces the block text with MM137.

**Leave without saving (D22).** DS §36.7 dialog, width 440 (≥768; bottom sheet below), padding 28: `h2` MM140 `ink` 20/28 weight 600; 8; MM141 `stone` 14/20, plus MM142 while uploads run; 24; end-aligned **Leave** MM144 (secondary on paper) and **Keep editing** MM143 (`conifer`, initial focus, last). Escape = Keep editing; backdrop click does nothing; focus returns to the element that triggered the navigation, or the `h1` if it is gone.

### 22.13 Motion

| Element | Default | Reduced motion |
|---|---|---|
| Card cover, Detail photo, tile preview | Opacity 0 → 1 on load, `--duration-base` | Instant |
| Detail photo switch (thumbnail) | New photo opacity 0 → 1, `--duration-fast`; frame never resizes | Instant |
| Tile added (create pick, edit upload) | Opacity 0 → 1, `--duration-base`, once | None |
| Tile move, removal, Load more append, notices, confirmations, status blocks | Instant | Instant |
| Leave dialog | DS §36.7 | Instant |
| Hover, press, selection | Colour only, `--duration-fast` | Kept |
| `LoaderCircle` | Spins (900ms) | Static; text still shows |
| Skeletons | Static | Static |

No hover zoom, parallax, scroll effects, sliding gallery, or celebratory effect. Nothing moves by itself; no Pause control needed.

### 22.14 Interaction states summary

| Element | Hover | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|
| Add memory, Add your first memory, Save, Retry failed photos, Keep editing | `conifer-deep` | Ring | `conifer-press` | `aria-disabled` during save only | MM115 / MM116 |
| Memory card link | 22.4 | Ring | 22.4 | Never | Skeleton |
| Secondary on paper (Show older memories, Try again, Edit, Cancel, Add photos, Retry, View memory, Check My Memories, Leave) | `ink` 0.06 | Ring | `ink` 0.10 | `aria-disabled` as specified | Show older / Try again: `LoaderCircle` |
| Delete memory (text) | Underline + `ink` 0.04 | Ring | `ink` 0.08 | — | — |
| Delete / Remove (ember confirm) | 12% toward `ink` | Ring | 24% | — | MM52 / MM100 |
| Thumbnail | 22.7 | Ring | `ink` 0.12 | Never | — |
| Tile icon actions | `ink` 0.06 | Ring | `ink` 0.10 | `aria-disabled`, 40% | — |
| Text fields, select, date | Border `ink` | Ring | — | Read-only after create save | Trail select disabled while trails load |
| Visibility tile | Border `ink` 0.32 | Ring | `ink` 0.04 | `aria-disabled` after create save | — |
| Header Memories, Back row, Trail Detail link | As Gear / 004 §21.17 / 22.2 | Ring | As specified | Never | — |

Every action is visible and labelled at rest; hover reveals nothing; touch works identically.

### 22.15 Focus map

| Situation | Focus goes to |
|---|---|
| Arrive at `/memories` from the header or a link | Browser default (as `/gear`) |
| Arrive at `/memories` after delete | `h1` (`preventScroll`), MM26 announced |
| Arrive at Detail, Create, Edit | Their `h1` (`preventScroll`), as Trail Detail (004 §23.2) |
| Show older memories succeeds | Stays on the button; first new card if the button is gone |
| Thumbnail activated | Stays on it |
| Delete confirmation open / cancel | Cancel / Delete memory |
| Save invalid | First invalid field |
| Create saved with failed photos | The block's `h2` MM132 |
| Tile moved / removed | 22.10 rules |
| Edit remove confirmation open / cancel | Cancel / that tile's Remove |
| Leave dialog open / close | Keep editing / the trigger (or `h1`) |
| Not found or unavailable state | `h1` |

### 22.16 Accessibility checklist

1. One `h1` per page; Detail's `h1` is the title; hidden `h2`s MM6 and MM41 give the grid and the story a heading.
2. Cards: `ul` > `li` > one `a`; name MM8; cover `alt=""`; visibility is a word with an icon, never colour alone.
3. Detail: large photo `alt` MM37; thumbnails are `button`s named MM38 with `aria-current="true"` on the shown one and a shape ring; caption MM39 repeats the position in text.
4. Every field has a visible label and a text Required / Optional marker; helper, counter, and error are in `aria-describedby`; `aria-invalid` on error.
5. Trail is a native `select`; Trip date a native date input with `max`; Visibility a `fieldset` + `legend` with native radios whose meanings are described.
6. Photo tiles: `role="group"` MM92; explicit button names MM96–MM98; `aria-disabled` keeps focus on end controls; the Cover word is text.
7. Announcements: polite — MM18, MM26, MM44–MM47, MM101–MM104 (start, each failure, end), MM133; assertive — form, delete, picking, and request errors (`role="alert"`). Loading completion and thumbnail switches are not announced.
8. Inline confirmations and the leave dialog follow §21.1 (focus to the safe action, Escape cancels, focus returns).
9. Contrast in use: `ink`/`paper` 16.04, `ink`/`snow` ≈17.5, `stone`/`paper` 5.92, `stone`/`snow` ≈6.4, `stone`/`paper-shade` 5.27, `ink`/`paper-shade` 14.3, `snow`/`conifer` 8.05, `snow`/`ink` 17.48, `snow`/`ember` 4.8 (14px weight-600 confirm label only). `ember` is never text on `paper` or `snow`.
10. All text ≥14px; touch targets ≥44 on a coarse pointer (thumbnails 56–64 exceed it).
11. Reduced motion removes every movement (22.13). Forced colors: frames, tiles, and thumbnails keep 1px `CanvasText` edges; selected states 3px `CanvasText`.
12. Titles and stories render as text nodes only; never in the URL, storage, or console; the title is in the document title on Detail only.

### 22.17 Wireframes

1440×900, collection:

```text
┌─ ink ──────────────────────────────────────────────────────────────────────────────┐
│ Outdoor Trip Companion                         Gear   Memories   {Account} Sign out│ 72
│                                                       ‾‾‾‾‾‾‾‾ current             │
│ ┌─ paper sheet · x 56–1384 · top 88 · padding 48 ──────────────────────────────┐   │
│ │ My Memories                                              [ + Add memory ]    │   │
│ │ Your trips, kept in photos and stories.                                      │   │
│ │ 8 memories                                                                   │   │
│ │                                                                              │   │
│ │ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   4 × 280, gap 32    │   │
│ │ │  photo   │  │  photo   │  │ ≈≈ ⛰ ≈≈≈ │  │  photo   │   cover 4:3 (210)    │   │
│ │ │  4:3     │  │          │  │ No photos│  │          │                      │   │
│ │ └──────────┘  └──────────┘  └──────────┘  └──────────┘                      │   │
│ │ Lake morning  First snow at  Rainy loop    Ridge at                         │   │
│ │ swim          the ridge      with Sam      sunset                           │   │
│ │ Lynn Canyon   Mount Seymour  Trail unavail Quarry Rock                       │   │
│ │ Sep 14, 2026  Aug 30, 2026   Aug 2, 2026   Jul 19, 2026                      │   │
│ │      🔒Private     🌐Public       🔒Private     🔒Private                     │   │
│ │ ┌ row 2 covers visible to ≈838 ┐                                            │   │
│ │                       [ ↓ Show older memories ]                              │   │
```

Empty state (title block without count or Add):

```text
│ │ My Memories                                                                  │
│ │ Your trips, kept in photos and stories.                                      │
│ │                         ┌──────────────┐                                     │
│ │                         │ ≈≈≈≈ ⛰ ≈≈≈≈≈ │  240 × 180 contour surface          │
│ │                         └──────────────┘                                     │
│ │                     No trail memories yet.                                   │
│ │       After your next adventure, save the photos and story here.            │
│ │                     [ Add your first memory ]                                │
```

1440×900, Add a memory (spread; left 663, spine, right 473):

```text
│ ← Back to My Memories                                                              │
│ ┌─ paper · padding 48 ────────────────────────────────────────────────────────────┐ │
│ │ Add a memory                                                                    │ │
│ │ Keep the story and photos from a trip you've taken.                             │ │
│ │ Trail  Required                   Trip date  Req. │ Photos  Optional            │ │
│ │ [ Lynn Canyon Loop          ▾ ]   [ 09/14/2026 ] │ The first photo is your cover│ │
│ │ Moderate · 5.8 km                 The day you…   │ Up to 5 photos: JPEG, PNG, …│ │
│ │ ⓘ The trail can't be changed after the memory…   │ [▣ Add photos] You can add 3│ │
│ │ Title  Required                                  │ ┌─────────────────────────┐ │ │
│ │ [ Lake morning swim (20/28)                    ] │ │[img] Photo 1 [Cover] ↑↓✕│ │ │
│ │ A few words you'll recognize later.              │ │      Added when you save │ │ │
│ │ Story  Optional                                  │ ├─────────────────────────┤ │ │
│ │ ┌──────────────────────────────────────────────┐ │ │[img] Photo 2         ↑↓✕│ │ │
│ │ │ We started before sunrise…                   │ │ │      Preparing…         │ │ │
│ │ │                                    (300 min) │ │ └─────────────────────────┘ │ │
│ │ └──────────────────────────────────────────────┘ │ Who can see this memory     │ │
│ │ Plain text. Line breaks are kept.                │ ┏━🔒 Private ━━━━━━━━━━━━✓┓ │ │
│ │                                                  │ ┃ Only you can see this… ┃ │ │
│ │                                                  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ │                                                  │ [ 🌐 Public               ] │ │
│ │ ─────────────────────────────────────────────────────────────────────────────── │ │
│ │                                                    ( Cancel )  [ Save memory ]  │ │
```

Saved, one photo failed:

```text
│ │ Add a memory                                                                    │ │
│ │ ┌ ink 0.04 ───────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ Memory saved                                                              │ │ │
│ │ │ 2 of 3 photos added. 1 photo couldn't be added.                             │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ (form read-only)                                 │ [img] Photo 1 [Cover]  ✓ Added│ │
│ │                                                  │ [img] Photo 2          ✓ Added│ │
│ │                                                  │ [img▒] Photo 3 ⚠ Couldn't be │ │
│ │                                                  │  added · This photo couldn't │ │
│ │                                                  │  be added right now.         │ │
│ │                                                  │       ( ⟳ Retry )  ( ✕ )     │ │
│ │ ─────────────────────────────────────────────────────────────────────────────── │ │
│ │                                    ( View memory )  [ ⟳ Retry failed photos ]   │ │
│ │                      Photos that weren't added can be added later from Edit.    │ │
```

1440×900, Detail with photos:

```text
│ ← Back to My Memories                                                              │
│ ┌─ paper ─────────────────────────────────────────────────────────────────────────┐ │
│ │ ┌─ mat paper-shade 653 × 490 ──────────────┐ │ Lake morning swim          (h1)  │ │
│ │ │   ┌──────────────────────────────────┐   │ │ Lynn Canyon Loop · September 14, │ │
│ │ │   │  whole photo (contain)           │   │ │ 2026                             │ │
│ │ │   └──────────────────────────────────┘   │ │ 🔒 Private  Only you can see this │ │
│ │ └──────────────────────────────────────────┘ │ ──────────────────────────────── │ │
│ │ Photo 1 of 3 · Cover                         │ We started before sunrise, the   │ │
│ │ ╔══╗ ┌──┐ ┌──┐   thumbs 64, ring = shown     │ lake still in shadow…            │ │
│ │ ╚══╝ └──┘ └──┘                     (sticky)  │ ──────────────────────────────── │ │
│ │                                              │ [✎ Edit]  🗑 Delete memory       │ │
```

Detail without photos: the frame holds the contour surface with a 48px mountain and "No photos"; no caption, no strip; the right page is unchanged.

Trail Detail, end of the main column:

```text
│ Description … (16/26)                         │  [ Trip date ] [ Choose this trail → ]
│ Sample trail data.                            │
│ ───────────────────────────────────           │
│ Been on this trail already? Add a memory      │  ← quiet underlined link, not a button
```

N, 390 wide:

```text
┌ Outdoor Trip         (☰) ┐   ┌ ← Back to My Memories ───┐
│┌─ paper ───────────────┐ │   │┌─ paper ──────────────┐ │
││ My Memories           │ │   ││ Add a memory         │ │
││ Your trips, kept in … │ │   ││ Trail  Required      │ │
││ 3 memories            │ │   ││ [ Choose a trail  ▾ ]│ │
││ [ + Add memory (full)]│ │   ││ Trip date  Required  │ │
││ ┌───────────────────┐ │ │   ││ [ mm/dd/yyyy ]       │ │
││ │ photo 4:3 (318)   │ │ │   ││ Title … Story …      │ │
││ └───────────────────┘ │ │   ││ Photos · [Add photos]│ │
││ Lake morning swim     │ │   ││ [img] Photo 1 [Cover]│ │
││ Lynn Canyon Loop      │ │   ││  ↑  ↓  ✕  (2nd line) │ │
││ Sep 14, 2026 🔒Private│ │   ││ Who can see … tiles  │ │
│└───────────────────────┘ │   ││ [ Save memory (full)]│ │
                                ││ [ Cancel (full)    ] │ │
```

### 22.18 Copy deck

User text only. Never: Post, Feed, Content, Uploads (as a noun), Publish, Followers, Community, "soft delete", status codes, service or field names, "signed URL", "original quality", "backup". Curly quotes and "…" as written. Dates: short "Sep 14, 2026", long "September 14, 2026", both built from the ISO date's own parts (no UTC conversion).

| Id | Where | Text |
|---|---|---|
| MM1 | Document title | My Memories · Outdoor Trip Companion |
| MM2 | Collection `h1` | My Memories |
| MM3 | Support | Your trips, kept in photos and stories. |
| MM4 | Count | {n} memories · 1 memory |
| MM5 | Primary | Add memory |
| MM6 | Hidden `h2` | Your memories |
| MM7 | Header link | Memories |
| MM8 | Card name | {title}, {trail or "Trail unavailable"; omitted while unknown}, {short date}, {Private\|Public} |
| MM9 | Visibility label | Private · Public |
| MM10 | Trail absent | Trail unavailable |
| MM11 | Null trail name | Unnamed trail |
| MM12 | No-photo caption | No photos |
| MM13 | Photo fallback | Photo couldn't be shown |
| MM14 | Load more | Show older memories |
| MM15 | Load more working | Loading… |
| MM16 | Load more failed | Older memories couldn't be loaded. |
| MM17 | Retry | Try again |
| MM18 | Announce | {k} more memories shown · 1 more memory shown |
| MM19 | Loading (hidden) | Loading your memories… |
| MM20 | Empty title | No trail memories yet. |
| MM21 | Empty body | After your next adventure, save the photos and story here. |
| MM22 | Empty action | Add your first memory |
| MM23 | Unavailable title | Your memories couldn't be loaded. |
| MM24 | Unavailable body | Nothing in My Memories has changed. Try again in a moment. |
| MM25 | Retry working | Trying again… |
| MM26 | Notice + announce | Memory deleted. |
| MM30 | Detail document title | {title} · Outdoor Trip Companion |
| MM31 | Back (Detail, Create) | Back to My Memories |
| MM32 | Dates | short: Sep 14, 2026 · long: September 14, 2026 |
| MM33 | Private meaning | Only you can see this memory. |
| MM34 | Public meaning (Detail) | It can appear for people exploring this trail. |
| MM35 | Hidden prefixes | Trail: · Trip date: · Visibility: |
| MM36 | Trail name failed | Trail name couldn't be loaded |
| MM37 | Large photo `alt` | Photo {n} of {N} from {title} |
| MM38 | Thumbnail name | Show photo {n} of {N} |
| MM39 | Caption | Photo {n} of {N} — plus " · Cover" when n = 1 |
| MM41 | Hidden `h2` | Story |
| MM42 | Detail action | Edit |
| MM43 | Detail action / confirm | Delete memory |
| MM44 | Notice `saved` | Memory saved. |
| MM45 | Notice `updated` | Changes saved. |
| MM46 | Notice `saved`, Public | Memory saved. It's public and can appear for people exploring this trail. |
| MM47 | Notice `updated`, now Public | Changes saved. This memory is public and can appear for people exploring this trail. |
| MM48 | Delete question | Delete “{title}”? |
| MM49 | Delete body | Its story and photos will be removed from My Memories. This can't be undone. |
| MM50 | Delete body, Public | It will also stop appearing for people exploring this trail. |
| MM51 | Cancel | Cancel |
| MM52 | Deleting | Deleting… |
| MM53 | Delete failed | timeout: This took too long. Your memory is still here. Try again. · other: Your memory couldn't be deleted right now. Try again. |
| MM54 | Not-found document title | Memory not found · Outdoor Trip Companion |
| MM55 | Not-found `h1` | Memory not found |
| MM56 | Not-found body | It may have been deleted, or the link isn't right. |
| MM57 | Unavailable | title: This memory couldn't be loaded. · body: Try again in a moment. |
| MM58 | Loading (hidden) | Loading this memory… |
| MM60 | Create document title | Add a memory · Outdoor Trip Companion |
| MM61 | Edit document title | Edit memory · Outdoor Trip Companion |
| MM62 | Create `h1` | Add a memory |
| MM63 | Edit `h1` | Edit memory |
| MM64 | Create support | Keep the story and photos from a trip you've taken. |
| MM65 | Back (Edit) | Back to memory |
| MM67 / MM68 | Markers | Required · Optional |
| MM69 | Label | Trail |
| MM70 | First option | Choose a trail |
| MM71 | Facts line | {Difficulty} · {distance} (missing parts dropped) |
| MM72 | Note, create | The trail can't be changed after the memory is saved. |
| MM73 | Note, edit | The trail can't be changed after a memory is saved. |
| MM74 | Trails loading | Loading trails… |
| MM75 | Trails failed | Trails couldn't be loaded. |
| MM76 | No trails | No trails are available right now. |
| MM77 | Bad preselect | The trail from that link couldn't be found. Choose a trail. |
| MM78 | Label | Trip date |
| MM79 | Helper | The day you were on the trail. |
| MM80 | Label | Title |
| MM81 | Helper | A few words you'll recognize later. |
| MM82 | Counter | {n} of 120 |
| MM83 | Label | Story |
| MM84 | Helper | Plain text. Line breaks are kept. |
| MM85 | Counter | {n} of 5000 |
| MM86 | Section | Photos |
| MM87 | Line | The first photo is your cover. |
| MM88 | Line | Up to 5 photos: JPEG, PNG, or WebP. Photos are resized for your journal. |
| MM89 | Remaining | You can add {k} more. · You can add 1 more. · This memory has 5 photos, the most it can hold. |
| MM90 | Edit line | Photo changes are saved as you make them. |
| MM91 | Button | Add photos |
| MM92 | Tile group | Photo {n} of {N} — plus ", cover" when n = 1 |
| MM93 | Tile name | Photo {n} |
| MM94 | Tag | Cover |
| MM95 | Tile states | Preparing… · Added when you save · Waiting to upload · Uploading… · Added · Couldn't be added |
| MM96 | Move names | Move photo {n} earlier · Move photo {n} later |
| MM97 | Remove name | Remove photo {n} |
| MM98 | Retry name | Retry photo {n} (visible: Retry) |
| MM99 | Remove confirm | Remove this photo? · Cancel · Remove |
| MM100 | Removing | Removing… |
| MM101 | Announce move | Photo moved to position 1. It's your cover. · Photo moved to position {p} of {N}. |
| MM102 | Announce remove | Photo removed. — plus " The next photo is now your cover." when the cover was removed and photos remain |
| MM103 | Announce edit add | Photo added. |
| MM104 | Upload status | Uploading photo {i} of {k}… · end: {a} of {k} photos added. |
| MM105 | Picking | Only 5 photos per memory. {m} weren't added. (1: 1 wasn't added.) · This photo format isn't supported yet. Please use JPEG, PNG, or WebP. · This photo is too large to add. · This photo couldn't be read. |
| MM106 | Upload reasons | This memory already has 5 photos. · This photo is too large. · (format sentence of MM105) · This photo couldn't be added right now. |
| MM107 | Photo status | Saving photo order… · The photo order couldn't be saved. Try again. · remove: The photo couldn't be removed right now. Try again. |
| MM108 | Legend | Who can see this memory |
| MM109 / MM110 | Options | Private · Public |
| MM111 | Public meaning (editor) | This memory may appear for other people exploring this trail. |
| MM112 | Footer | Cancel |
| MM113 | Create submit | Save memory |
| MM114 | Edit submit | Save changes |
| MM115 | Working | Saving… |
| MM116 | Working, photos | Adding photos… |
| MM117 | Edit wait | Photos are still being added. |
| MM118 | Error | Choose a trail. |
| MM119 | Error | Choose the date of your trip. |
| MM120 | Error | The trip date can't be in the future. |
| MM121 | Error | Enter a real date. |
| MM122 | Error | Give this memory a title. |
| MM123 | Error | Use 120 characters or fewer. |
| MM124 | Error | Use 5000 characters or fewer. |
| MM125 | Trail gone | That trail is no longer available. Choose another trail. |
| MM126 | Trail check | The trail couldn't be checked right now, so your memory wasn't saved. Try again. |
| MM127 | Create failed | timeout handled by MM129 · other: Your memory couldn't be saved right now. Try again. |
| MM128 | Rejected, no field | This couldn't be saved. Check the details, then try again. |
| MM129 | Ambiguous | title: We couldn't confirm your memory was saved. · body: Check My Memories before saving again, so it isn't added twice. |
| MM130 | Action | Check My Memories |
| MM131 | Edit failed | timeout: This took too long, and your changes weren't saved. Try again. · other: Your changes couldn't be saved right now. Try again. |
| MM132 | Saved block | Memory saved |
| MM133 | Saved line | {a} of {k} photos added. {f} photos couldn't be added. (1: 1 photo couldn't be added.) |
| MM134 | Action | Retry failed photos |
| MM135 | Action | View memory |
| MM136 | Line | Photos that weren't added can be added later from Edit. |
| MM137 | Memory gone | This memory is no longer available. |
| MM140 | Dialog | Leave without saving? |
| MM141 | Dialog body | create: Your memory hasn't been saved yet. · edit: Your changes to this memory haven't been saved. |
| MM142 | Dialog, uploading | Photos that are still uploading won't be added. |
| MM143 / MM144 | Dialog actions | Keep editing · Leave |
| MM150 | Trail Detail lead-in | Been on this trail already? |
| MM151 | Trail Detail link | Add a memory |

"No session" shows no MM text (FEATURE-002 takes over). Ids MM27–MM29, MM40, MM59, MM66, MM138–MM139, MM145–MM149 are unused.

### 22.19 Design-system additions for closeout

For the lead to add to `docs/DESIGN_SYSTEM.md` as **§37 Journal Pages (Memories)** after acceptance, and to remove "Memory" and "long-form content" from DS §32:

1. **Token consolidation:** one non-theme name for `#ECE8DD`, proposed `paper-shade`, replacing the separate names `map-land` and `gear-plate` (same value). Pairs: `ink`/`paper-shade` 14.3:1; `stone`/`paper-shade` 5.27:1 (text allowed at 14px+). No other new colour.
2. **Journal sheet and spread:** the DS §36.2 sheet capped at 1440 for single-entry pages; at ≥1280 a `7fr · 1px · 5fr` spread whose 1px track is an `ink` 0.10 spine rule; one centred 760 column below. The only ornament permitted on journal pages.
3. **Photo-led entry card:** the photograph (4:3, `cover`, radius 12, `ink` 0.08 inset edge) is the card; the caption sits on the paper with no container; the whole entry is one link; hover is an underline plus a darker edge, never zoom or lift. Distinct from the §36.4 slot card, which stays for owned-item collections.
4. **Photo mat:** a reading view shows the whole photograph with `object-fit: contain` on a `paper-shade` mat (radius 16, padding 16); crops are for previews only.
5. **No-photo surface:** `paper-shade` + an `ink` 0.07 repeating-radial contour + a `stone` line glyph + a `stone` caption; never a grey box or fake photo.
6. **Ordered media list:** explicit Move earlier / Move later / Remove icon actions per row (`aria-disabled` at the ends, focus follows the item, position announced); "first = cover" stated in words and by a text tag. No drag-and-drop.
7. **Visibility choice:** two stacked §36.6 choice tiles with an icon, a word, and a one-line meaning; identical styling for both values. Labels elsewhere are icon + word in `stone`, never a coloured badge.
8. **Leave-without-saving dialog:** §36.7 at 440 wide; the safe action (Keep editing) is the filled one and receives focus.
9. **Long-form reading:** user text at 18/30 (16/26 below 1280), `max-width: 66ch`, `pre-line`, text node only.

### 22.20 Notes for the lead

1. **Strip position (§13 order).** §13 lists the photo strip fifth (after the story). I placed it directly under the large photo, because it controls that photo and a 5000-character story would separate the two; perceptual priority is unchanged (photo, title, story). Please confirm or override.
2. **No "Make cover"** (D17 left it to §22): 22.10 gives the reason.
3. **"Load more" wording.** The button reads **Show older memories** (true for the `tripDate DESC` order) and, on failure, becomes **Try again** itself instead of a second button beside it. If ACs must say "Load more", swap MM14 only. Added rule: when the last page loads and the button disappears, focus moves to the first new card (§8.4 says focus stays on the button, which no longer exists).
4. **Edit: Save changes waits for photos.** While a photo is preparing or uploading, Save changes is `aria-disabled` (MM117). Otherwise a navigation after `PUT` would abort an in-flight upload. Also, every Move, Remove, and Retry is `aria-disabled` while any photo request is in flight on Edit, so order requests never race uploads. Neither is stated in §12/§14; please encode in section 23.
5. **No `maxlength`** on Title and Story (unlike 007's name field), so a pasted text is never silently cut; the counter and error carry the limit.
6. **Saved-state priority.** In §19.4 **Retry failed photos** is the filled action and **View memory** secondary; there is no leave guard in that state, because MM136 states what is dropped.
7. **Trail Detail grows ~70px** (22.2): the page scrolls at 1440×900; the sticky rail keeps 004's "decision row on screen on arrival". QA should re-check Trail Detail at the four reference sizes.
8. **Editor spread mirrors the Detail** (writing left in the editor, photos left in the Detail) because §9.1's field order is binding. Acceptable to me; flagging in case the lead prefers one column everywhere.
9. **Focus on arrival** at Detail and the editor goes to the `h1` (as Trail Detail); the collection keeps browser default except after delete, as `/gear`.
10. **Thumbnail state** uses `aria-current="true"`, not `aria-pressed` (exclusive choice, not a toggle).
11. The frontend must not improvise: date formatting through UTC, colour-coded visibility, image zoom on hover, drag handles, a placeholder in any field, an `ImageOff`/broken-image glyph, or any count other than MM4.

## 23. Acceptance Criteria

43 criteria: **20 P0**, **16 P1**, **7 P2**. "Live" means checked in a browser against the running services (PostgreSQL with `memory_db`, Keycloak, trail-service, memory-service in local storage mode, `npm run dev`) with real signed-in test users. "Review" means the lead's diff review. Titles, stories, and photos in reports are the tester's own test data; no token or signed URL appears in any report.

### 23.1 Criteria

| Id | P | Criterion |
|---|---|---|
| AC-01 | P0 | **Live.** Signed out, opening `/memories`, `/memories/new`, or `/memories/<uuid>` shows `/` with the sign-in gate and makes no `/api/memories` request; after signing in from that gate the user lands on the same pathname (§6.2, D5). |
| AC-02 | P0 | **Live.** **Memories** appears immediately after **Gear** in the Authenticated Home header and in the trip header, on the wide row and in the narrow Menu, and opens `/memories` in the trip shell. On `/memories` it has `aria-current="page"` and the current-page treatment; on Detail, Create, and Edit it has none; Gear's own marker on `/gear` is unchanged (§6.3, §22). |
| AC-03 | P0 | **Live.** `/memories` sends one `GET /api/memories?page=0&size=12` with `Authorization: Bearer` through the dev proxy, reads trail names from the shared `GET /api/trails` (or its cache), and sends no request per card. Until the first page answers, static skeleton cards show; the empty state, a count, and Add memory never show during loading (§8, §17.2, §18.1, §19.1). |
| AC-04 | P0 | **Live.** With Memories, the page shows "My Memories", the support line, the count with correct singular/plural, **Add memory**, and cards in server order (trip date newest first). Each card shows the cover (or the no-photo treatment), title, trail name, trip date, and a Private/Public text label, and no Edit, Delete, menu, or engagement element. Activating a card opens `/memories/:id` (never Edit) (§8, §22). |
| AC-05 | P0 | **Live.** A user with no Memories sees the empty state with **Add your first memory**, and no grid, count, sample, or placeholder card; the action opens `/memories/new` (§19.1). |
| AC-06 | P0 | **Live.** On `/memories/new` the Trail select lists the trails by name; **Private** is preselected. Submitting with no trail, no date, a blank or whitespace-only title, or a 121-character title sends nothing and shows each error on its field with focus on the first; a date after the viewer's local today cannot be chosen or submitted (§9.1, §10.1, D10). |
| AC-07 | P0 | **Live.** Creating a Memory with a story and two photos, Private: exactly one `POST /api/memories` whose body has `trailId`, `tripDate`, the trimmed `title`, `story`, and `visibility: "PRIVATE"`; then two `POST …/photos` requests, the second starting only after the first finished, each `multipart/form-data` with one `file` part of type `image/jpeg` (opaque test photos); the status line shows upload progress; the page then replaces itself with `/memories/:id` showing the saved notice, both photos in the chosen order, the first as cover (§9.2, §11.4). |
| AC-08 | P0 | **Live.** A JPEG whose pixels are stored sideways with an EXIF orientation tag (for example a portrait phone photo) is upright in the editor preview, on Detail, and on the card; the uploaded file's long edge is at most 2560 px (§11.3). |
| AC-09 | P0 | **Live.** A sixth photo cannot be added: picking more than the remaining slots adds only what fits and says how many were not added; the Add photos control is unavailable at five (§11.1). |
| AC-10 | P0 | **Live.** Memory Detail shows Back to My Memories, the cover in the large photo area, the title as `h1`, trail name and trip date, the visibility label, the story as plain text with its line breaks (markup typed into the story shows as literal text), and, with two or more photos, a thumbnail strip whose buttons change the large photo without any route change; Edit and Delete memory are present; no like, comment, share, count, or owner element exists (§13). |
| AC-11 | P0 | **Live.** On `/memories/:id/edit` the trail is read-only with the permanence note. Changing title, story, and date and choosing **Save changes** sends one `PUT /api/memories/{id}` with `tripDate`, trimmed `title`, `story` (`null` when cleared), and `visibility`, and no `trailId`; on `200` the page replaces itself with Detail showing the new values and the updated notice; a reload and the collection card show the change (§14.2). |
| AC-12 | P0 | **Live.** In Edit, **Move earlier** on photo 2 sends one `PUT …/photos/order` listing every photo id with photo 2 first; that tile is then labelled Cover, focus stays on the moved photo, and the move is announced; Detail and the collection card show the new cover (§12). |
| AC-13 | P0 | **Live.** Changing visibility to **Public** in Edit and saving sends `visibility: "PUBLIC"`; Detail shows the Public label and notice MM47; the card says Public; changing back to Private works the same way. No string says posted, published, feed, followers, or Community (§15). |
| AC-14 | P0 | **Live.** **Delete memory** shows the inline confirmation with focus on Cancel; Cancel restores the actions. Confirming sends one `DELETE /api/memories/{id}`; on `204` the page replaces itself with `/memories`, "Memory deleted." is announced, the card is gone, and after a reload it is still gone (§16). |
| AC-15 | P0 | **Live. Account isolation.** User A, with at least one Memory, opens `/memories`, signs out, and user B signs in in the same tab and opens `/memories`: B sees only B's Memories (or B's empty state), with no frame showing A's cards, count, or covers, and no response containing A's data. Opening A's Memory URL as B shows the neutral not-found state (§20, §19.2). |
| AC-16 | P0 | **Live.** `/memories/<random uuid>` and another user's Memory id both show "Memory not found" with the same neutral text and **Back to My Memories**, never wording about another user; `/memories/not-a-uuid` shows it with no request (§19.2). |
| AC-17 | P0 | **Live.** Trail Detail for a loaded trail shows MM150 and **Add a memory** at the end of the reading column, not in the decision rail; the date control and **Choose this trail** look and behave as before, and the decision row is on screen on arrival at 1440×900, 1920×1080, 1366×768, and 1024×768 (§22.2). The link opens `/memories/new?trail=<id>` with that trail selected; the trail can still be changed before saving (§10.2, §18.2). |
| AC-18 | P0 | **Review + Live.** Memory list and detail queries are keyed by subject and use `staleTime` 5 minutes, `gcTime` 10 minutes, refetch on mount and focus when stale; no signed URL is written to web storage, history state, or the URL, or used as a key. With DevTools blocking `/api/memories/local-photos/*`, a Detail photo shows its fallback, the detail is requested once more, and no request loop follows; after unblocking and a refetch the photo appears (§17.3, §19.7). |
| AC-19 | P0 | **Live.** During the main journey the console shows no uncaught or React error; every `/api/memories` request carries `Authorization: Bearer` and returns its expected status (`200`, `201`, `201`, `200`, `200`, `204`) (§5.2). |
| AC-20 | P0 | **Review.** `npm run build` and `npm run lint` pass; `package.json` gains no dependency; `vite.config.ts` gains exactly the `/api/memories` entry; nothing under `Project/Backend/` changed; every changed path is in §25.2 (§25). |
| AC-21 | P1 | **Live.** Partial upload: with the third of three photo uploads made to fail (DevTools request blocking on the third `POST …/photos`), the create page stays and shows MM132 and MM133 ("2 of 3 photos added. 1 photo couldn't be added."), the failed tile with Retry and Remove, **Retry failed photos**, and **View memory**; Retry (after unblocking) adds the photo with no second `POST /api/memories`; View memory opens Detail (§19.4, §9.2). |
| AC-22 | P1 | **Live.** Create failure: with memory-service stopped, Save shows a form-level error and keeps every field and every photo preview; after restarting the service, Save creates exactly one Memory (§19.3). |
| AC-23 | P1 | **Live.** Edit failure: with memory-service stopped, Save changes shows an error, keeps the typed values, and Detail (after the service is back) still shows the stored values; no cache shows the unsaved change (§14.2). |
| AC-24 | P1 | **Live.** Delete failure: with memory-service stopped, Delete memory keeps the confirmation open with an error line and the Memory visible; confirming again after restart deletes it (§16). |
| AC-25 | P1 | **Live.** With more than 12 Memories, **Show older memories** appends the next page in server order, keeps focus on the button, announces MM18, and disappears after the last page with focus moving to the first new card; a failed request keeps the cards, shows MM16, and the button becomes **Try again** (§8.4, §22.3). |
| AC-26 | P1 | **Live.** In Edit, adding a photo prepares and uploads it immediately; while it prepares or uploads, Save changes is `aria-disabled` with MM117 and every Move, Remove, and Retry is `aria-disabled`; removing a photo asks the inline confirmation (MM99) and then sends `DELETE …/photos/{photoId}`; removing the cover makes the next photo the cover; removing every photo shows the no-photo surface on Detail and on the card (§14.3, §12, §22.5, §22.10). |
| AC-27 | P1 | **Live.** Selecting a `.heic` file (or any GIF) adds no tile and shows MM105's format sentence ("This photo format isn't supported yet. Please use JPEG, PNG, or WebP."), announced (§11.2). |
| AC-28 | P1 | **Live.** `/memories/new?trail=not-a-uuid` and `?trail=<random uuid>` select nothing, show the quiet "trail couldn't be found" line, make no trail request for that id, and otherwise work (§10.2). |
| AC-29 | P1 | **Live.** A Memory whose `trailId` is not in the trail list (simulated by intercepting `GET /api/trails` to omit that trail) shows **Trail unavailable** on its card and Detail and stays fully readable, editable, and deletable (§18.1). |
| AC-30 | P1 | **Live.** Unsaved changes: on Create with a typed title, activating the header's Gear opens the leave dialog with focus on **Keep editing**; Keep editing stays with the values; Leave navigates. Reloading prompts the browser's own confirmation. Signing out with a dirty form is not stopped by the in-app dialog (§19.5). |
| AC-31 | P1 | **Live.** Keyboard only: cards are reachable with names "{title}, {trail}, {date}, {visibility}"; every editor field is labelled with errors announced; visibility is one radio group; each photo's Move earlier / Move later / Remove buttons have explicit names and focus follows a moved photo; inline confirmations start on Cancel and return focus on Cancel; the DS §18 focus ring is visible throughout (§21.1). |
| AC-32 | P1 | **Live.** At 1440×900 the collection has the column count of §22 for that tier (3–4) with classic and overlay scrollbars; at 1920×1080 the surface is capped as §22 says; at 1024×768 it follows §22; Detail and the editor follow their §22 layouts; no horizontal scroll at any of the three (§22). |
| AC-33 | P1 | **Live.** Trail Detail, Trip Preparation, Gear Studio, My Gear, and the Authenticated Home headers and pages behave as before apart from the added Memories link and Trail Detail's Add a memory link (§6.3, §18.2). |
| AC-34 | P1 | **Live.** No title, story, signed URL, or photo appears in `localStorage`, `sessionStorage`, a cookie, or the URL; FEATURE-009 adds no web-storage key; history state holds at most the notice value (§20). |
| AC-35 | P1 | **Live.** The Memory pages are their own lazily loaded chunks; on them the browser downloads no `three`, React Three Fiber, avatar runtime, GLB, MapLibre, hero or home video (§21.3). |
| AC-36 | P1 | **Live.** A `400 TRAIL_NOT_FOUND` on create (simulated by intercepting the `POST`) shows the trail-no-longer-available message on the Trail field, refetches the trail list, and keeps every other value (§10.3). |
| AC-37 | P2 | **Live.** With reduced motion, no element of the four pages moves; everything else works (§21.1, §22). |
| AC-38 | P2 | **Live.** At 390 wide the collection, Detail, and editor are usable in one column, photo tiles wrap, and every action is reachable (§21.2, §22). |
| AC-39 | P2 | **Live.** A `POST /api/memories` that never answers (simulated with a stalled request beyond 20 s) shows the could-not-confirm message with **Check My Memories**, and no automatic second `POST` (§19.3). |
| AC-40 | P2 | **Live.** A 120-character title is clamped on its card and whole on Detail and in the card's accessible name; the story counter appears from 4500 characters and 5000 is the limit (§9.1, §22). |
| AC-41 | P2 | **Live.** In Safari (if available) a photo is prepared upright, uploaded, and shown (§11.3). |
| AC-42 | P2 | **Live.** With a real screen reader, a full create → read → edit → delete pass is understandable, including upload progress and reorder announcements (§21.1). |
| AC-43 | P2 | **Review.** Alt text follows D23: card covers `alt=""`, the Detail large photo "Photo {n} of {N} from {title}", thumbnails as named buttons with `alt=""` images; no generated description exists (§21.1). |

### 23.2 QA model

**Lean QA by default** (`.claude/agents/qa.md`), about 5–10 minutes, one journey in one browser session at 1440×900, with two test users (A with no Memories at the start, B with at least one) and two or three small test photos, one of them a portrait phone JPEG with an EXIF orientation tag:

```text
Signed out → /memories → gate → sign in as A → lands on /memories (AC-01)
→ header Memories, current marker (AC-02) → loading skeletons, then empty state (AC-03, AC-05)
→ Add your first memory → choose trail, past date, title, story, 2 photos (one portrait), Private (AC-06)
→ Save → one POST, two sequential uploads → Memory Detail: photos upright, story (AC-07, AC-08, AC-10)
→ Edit → change title and story → Move earlier on photo 2 → cover changes (AC-12)
→ set Public → Save changes → Detail updated, public notice (AC-11, AC-13)
→ My Memories → card shows new title, cover, Public (AC-04)
→ Trail Detail of another trail → Add a memory → trail preselected → create with 3 photos,
  third upload blocked → saved state → Retry → View memory (AC-17, AC-21)
→ try a sixth photo in Edit (AC-09)
→ Delete one Memory → confirm → collection updated → reload → still gone (AC-14)
→ sign out → sign in as B → only B's Memories; A's Memory URL → not found (AC-15, AC-16)
→ console and network health (AC-19); quick 1920 and 1024 sweep (AC-32)
```

AC-18 is checked once with DevTools request blocking plus the lead's review of the query options. AC-20 is the lead's diff review plus `build` and `lint`. Lean QA also runs, from P1, one more failure path (AC-22 or AC-23), AC-27, AC-30, and keyboard basics (AC-31). The rest of P1 and all of P2 are deferred unless the lead asks. FEATURE-010 public UI is never part of this QA.

**Targeted QA** after a repair (about 2–5 minutes): the failed criterion, the behaviour it touches, one or two adjacent checks. **Full QA** only on the user's request; the project's end-of-roadmap Full QA (after FEATURE-010) covers My Memories in the cross-feature journey.

**Security.** Cross-user isolation on the server is covered by FEATURE-008's automated tests (008 AC-11, AC-12) and is not repeated beyond AC-15 and AC-16, which check the browser's cache isolation and neutral not-found.

## 24. Final Product Decisions

### 24.1 Q1–Q20

| Q | Question | Decision | Basis |
|---|---|---|---|
| Q1 | Memory Detail: drawer or dedicated page? | **Dedicated page** `/memories/:memoryId` | D1, §6.1 |
| Q2 | Edit inline or dedicated route? | **Dedicated route** `/memories/:memoryId/edit`, sharing one editor component with Create | D2, §6.1 |
| Q3 | Can the trail change before the first save? | **Yes** (the select stays enabled until the `POST` succeeds) | §10.2 |
| Q4 | Can the trail change after saving? | **No** (backend contract; read-only in Edit; no workaround) | 008 D9, §10.2, §14.1 |
| Q5 | Collection pagination UX? | **Load more**, page size 12 | D6, §8.4 |
| Q6 | Create as page or modal? | **Page** `/memories/new` | §9.1 |
| Q7 | Default visibility? | **Private** | §15.1, 008 D6 |
| Q8 | Memory with zero photos? | **Yes**, with a designed no-photo treatment | §8.5, D24 |
| Q9 | Photo reorder UX? | **Move earlier / Move later buttons** on a vertical photo list; no Make cover, no drag, no dependency | D17, §12, §22.10 |
| Q10 | How is the cover chosen? | **First photo**; "The first photo is your cover." | D18, §12 |
| Q11 | Partial photo upload failure? | **Memory stays saved; successful photos stay; failed photos retryable or removable; never a second `POST`** | D15, §19.4 |
| Q12 | HEIC? | **Rejected in the MVP with a clear message**, in every browser | D13, §11.2 |
| Q13 | Client resize / orientation strategy? | **`createImageBitmap` with `imageOrientation: "from-image"` (image-element fallback), long edge ≤ 2560 px, JPEG 0.88 for opaque images and PNG only when transparency is real, at pick time, one at a time, main thread** (approved 2026-10-17) | D12, §11.3 |
| Q14 | Signed-URL refresh strategy? | **`staleTime` 5 min, `gcTime` 10 min, refetch on mount and focus when stale, one refetch of the owning query on an image error or an expired `urlExpiresAt`, never stored** | D20, §17.3 |
| Q15 | Trail-name resolution? | **The shared `["trails","list"]` query joined on `trailId`; no N+1; "Trail unavailable" for a missing id** | D8, §18.1 |
| Q16 | Private/Public filter? | **No** | D7, §8.6 |
| Q17 | Add Memory from Trail Detail? | **Yes**: a quiet link to `/memories/new?trail=<id>` at the end of the reading column | D25, §18.2 |
| Q18 | Header gets Memories? | **Yes**, after Gear, in both authenticated headers | D4, §6.3 |
| Q19 | Backend changes? | **No.** Contract complete (§5.2); `backend-api` skipped | §5.2 |
| Q20 | Community / public browsing? | **No.** FEATURE-010 | §3, §4.2 |

### 24.2 Lead decisions

| # | Decision | Section |
|---|---|---|
| D1 | Memory Detail is a dedicated page | §6.1 |
| D2 | Create and Edit are dedicated editor pages sharing `MemoryEditor` | §6.1 |
| D3 | All Memory pages in `TripShell` + `TripHeader`, as three lazy chunks | §6.1, §21.3 |
| D4 | **Memories** link after Gear in `TripHeader` and `HomeHeader`; current marker on `/memories` exactly | §6.3 |
| D5 | `isProtectedPath` accepts the four Memory pathnames; no query carried | §6.2 |
| D6 | Load more with `useInfiniteQuery`, page size 12 | §8.4 |
| D7 | No filter, sort, or search | §8.6 |
| D8 | Trail names from the shared trail list; "Trail unavailable" when absent | §18.1 |
| D9 | Native `<select>` trail picker sorted by name, with a facts line; revisit at about 30 trails | §10.1 |
| D10 | Native date input, `max` = viewer's local today, empty by default, required | §9.1 |
| D11 | Visibility is a two-option radio group, Private preselected | §15.1 |
| D12 | Client photo preparation: orientation, ≤ 2560 px long edge, JPEG 0.88 for opaque images, PNG when a PNG or WebP input has real transparency, at pick time, sequential, main thread, browser-native; not a privacy control | §11.3 |
| D13 | HEIC/HEIF and every non-JPEG/PNG/WebP file rejected client-side with one message | §11.2 |
| D14 | Photo uploads strictly sequential, 60 s limit each | §11.4 |
| D15 | Create sequence: one `POST`, then sequential uploads, optional single reorder, replace-navigate to Detail; partial failure stays on the page in the saved state | §9.2, §19.4 |
| D16 | Edit: details saved by one `PUT`; photo changes persist immediately and independently; no pretended atomicity | §14 |
| D17 | Reorder by explicit Move earlier / Move later buttons only; no Make cover; non-optimistic; on Edit every Move, Remove, and Retry waits while any photo request is in flight, and Save changes waits for photos | §12, §14.3 |
| D18 | Cover = first photo; no cover control beyond ordering | §12 |
| D19 | Delete by DS §36.9 inline confirmation; `404` treated as deleted; replace-navigate to `/memories` | §16 |
| D20 | Signed-URL freshness rules of §17.3 | §17.3 |
| D21 | Memory query keys start with the subject; the existing session cleanup clears the cache | §17.2, §20 |
| D22 | Unsaved-changes guard with `useBlocker` and `beforeunload`, only when meaningful, never blocking auth navigation; no drafts or autosave | §19.5 |
| D23 | Alt-text strategy: positional and contextual, never generated | §21.1 |
| D24 | No-photo treatment from DS tokens and an existing line glyph; no new raster asset | §8.5 |
| D25 | Trail Detail entry: one quiet link at the end of the reading column; `newMemoryLocation` in `trails/tripRoutes.ts` | §18.2 |
| D26 | Dev proxy entry `/api/memories` → `http://localhost:8085` | §5.1, §25.2 |
| D27 | No new runtime or development dependency | §21.3 |
| D28 | The memory request layer reads `ProblemDetail.code` and `errors[]` best effort; status decides otherwise | §17.1 |
| D29 | Arrival notices travel as a router-state enum only (`saved`, `updated`, `deleted`) | §13, §16 |
| D30 | Production routing to memory-service is a deployment follow-up, not part of FEATURE-009 | §5.3, §27.3 |

## 25. Implementation Plan and Write Scope

### 25.1 Agent sequence

```text
Recover → Scope
  → backend-api: SKIP (contract complete, §5.2)
  → three-d / Blender: SKIP
  → ui-ux: already done (§22)
  → frontend (implement §6–§22)
  → lead diff review (write scope, no dependency, one POST per Memory, no storage key, isolation)
  → qa: Lean QA (§23.2); Targeted QA after a repair (at most 2 cycles)
  → product gate (user)
  → closeout (§27.2)
```

`backend-api` is engaged only if `frontend` or `qa` proves that the live API disagrees with §5.2, and only after the lead approves a proposal.

### 25.2 Write scope — `frontend`

| Path | Allowed change |
|---|---|
| `Project/Frontend/src/features/memories/**` (new) | `api/` (request layer, request functions, response checking, failure kinds), `types/`, `hooks/` (queries and mutations), `model/` (trail-name join, counts, date text, editor state, upload sequencing), `photos/` (pick checks and preparation), `components/` (collection, card, no-photo treatment, Detail, gallery, editor, photo tiles, visibility control, confirmations, leave dialog, states), `content.ts` (§22 copy deck), `memories.css` |
| `Project/Frontend/src/pages/MemoriesPage.tsx`, `MemoryDetailPage.tsx`, `MemoryEditorPage.tsx` (new), `pages/LazyRoutes.tsx`, `app/router/routes.tsx` | D1–D3 |
| `Project/Frontend/src/components/layout/TripHeader.tsx`, `trip-shell.css` | D4: the Memories link and its current state. Nothing else |
| `Project/Frontend/src/features/home/HomeHeader.tsx`, `home.css` | D4: the Memories link. Nothing else |
| `Project/Frontend/src/features/auth/returnDestination.ts` | D5: one additional accepted pattern. Nothing else in `features/auth` |
| `Project/Frontend/src/features/trails/components/TrailDetailScreen.tsx`, `trails/tripRoutes.ts`, `trails/content.ts`, `trails/trails.css` | D25: the Add a memory link, its route helper, its copy, and its style. Nothing else |
| `Project/Frontend/vite.config.ts` | D26: the one `/api/memories` proxy entry and its comment. No other proxy change |
| `Project/Frontend/src/index.css` | Only if a §22 token must be declared globally |

Imports: `memories` may import from `trails` (trail list hook, `isTrailId`, types), `planning` (`tripDate.ts` helpers only), `auth` (`getAuthenticatedSubject`, `useAuth`), `components/layout`, and `lib`. No feature imports `memories`. `trails` imports nothing from `memories`. No file under `features/memories` imports `three`, `@react-three/fiber`, or `maplibre-gl`.

Not in scope: `package.json` and the lockfile, `Project/Backend/**`, `Project/docker/**`, `Project/Frontend/public/**`, `features/discover/**`, `features/gear/**`, `features/loadout/**`, `features/avatar/**`, `features/landing/**`, `features/packing/**`, `features/planning/**` (read-only imports), the rest of `features/auth/**` and `features/trails/**`, documentation (closeout is the lead's), `assets/**`, `.claude/**`.

### 25.3 Recommended implementation sequence

1. Proxy entry; confirm memory-service is reachable (§25.4 check 1).
2. Types, request layer, request functions, response checking.
3. Queries and mutations with the §17 keys and freshness rules.
4. Return-destination pattern, routes, lazy pages, header links.
5. Collection: grid, card, no-photo treatment, trail-name join, states, Load more.
6. Detail: photo area, gallery, story, states, signed-URL recovery, delete.
7. Editor, create without photos: fields, trail picker and `?trail=`, validation, `POST`, notices.
8. Photos on create: picking, checks, preparation, tiles, reorder, sequential upload, partial-failure state.
9. Editor, edit mode: `PUT`, immediate photo add, remove, reorder.
10. Unsaved-changes guard; Trail Detail link; accessibility, announcements, and responsive pass; `build` and `lint`.

### 25.4 Implementation checks for `frontend`

1. Before building UI, through the dev proxy: `GET /api/memories` without a token → `401` ProblemDetail; signed in → `200` `MemoryPage`; a created photo's root-relative `url` loads in an `<img>` through the same proxy. If memory-service is not running or `memory_db` is missing, follow `CLAUDE.md` (never delete a volume or database) and report to the lead.
2. Never set `Content-Type` on the photo upload; one `file` part per request.
3. One `POST /api/memories` per Memory, ever, on the create page.
4. `PUT /api/memories/{id}` always sends `tripDate`, `title`, `story`, `visibility`; never `trailId`.
5. Signed URLs never enter storage, keys, or identifiers; object URLs are revoked.
6. `npm run build` and `npm run lint` pass.

## 26. FEATURE-010 Handoff

FEATURE-010 (Community Memories) may assume, once FEATURE-009 passes:

- Signed-in users can create Memories and make each one **Public** or **Private** through the owner UI; the default is Private, and visibility changes go through the normal owner update.
- Photos are uploaded upright and resized (long edge ≤ 2560 px; JPEG, or PNG when transparent) before the server's sanitizing re-encode, in the order the author chose; the first is the cover.
- Owner cards and the owner Detail exist and can inform a consistent public presentation (photo-led card, no-photo treatment, journal tone). Public presentation reuses the §22 patterns where they fit, but must show no owner actions and no author identity (008 D4).
- The FEATURE-008 public APIs are unchanged; FEATURE-009 calls none of them. The `/api/memories` dev proxy entry already carries the public paths and the local-mode photo URLs.
- Trail names are joined client-side from the trail list; a public Memory on a missing trail is already hidden by the server.

FEATURE-010 still owns: the Discover popup's community section and count, view-all, signed-out reading (tokenless calls), empty / loading / unavailable states for public reads, generic author copy, and public photo semantics (alt text, since public readers lack the author's context, §21.1). It needs no backend change and no change to FEATURE-009's pages.

## 27. Blockers, Backend Gaps, and Follow-ups

### 27.1 Blockers and approvals

- **Blockers:** none.
- **Backend gaps:** none (§5.2). FEATURE-008 stays frozen.
- **User decisions required before implementation:** none. The user's product approval of this specification is the gate. Values chosen by the lead that the user may want to confirm at approval (each has a stated rationale and can change without touching the design): page size 12 (D6), long edge 2560 px and JPEG 0.88 (D12), header label **Memories** (D4).

### 27.2 Documentation follow-ups (closeout, not now)

| # | Document | Change | When |
|---|---|---|---|
| F1 | `docs/FRONTEND_CONTEXT.md` header, §1, §9 | FEATURE-009 status; My Memories current | Closeout |
| F2 | FC §4 API-to-frontend mapping, §7 | Memory owner endpoints used (including multipart upload through `authenticatedApiRequest`); dev proxy now includes `/api/memories` (and the local-mode photo URLs); return destinations include the Memory paths | Closeout |
| F3 | FC §8, §10 | Routes table (four Memory routes, lazy chunks), the `memories` feature folder and its dependency rules, `trails/tripRoutes.ts` `newMemoryLocation`, headers' Memories link | Closeout |
| F4 | FC §12 | Risks: client photo preparation (browser support, JPEG output, 2560 px), signed-URL refresh in the client, root-relative local photo URLs require same-origin serving (or memory-service's `public-base-url`) | Closeout |
| F5 | `docs/DESIGN_SYSTEM.md` | Add §37 "Journal Pages (Memories)" from the nine rules of §22.19 (including the `paper-shade` name for `#ECE8DD`, a documentation-level consolidation of `map-land` and `gear-plate`; no code rename in other features); remove "Memory" and "long-form content" from §32's undefined list; note in §36.1 that FEATURE-009 chose a journal pattern rather than the slot pattern | Closeout |
| F6 | `docs/PRODUCT_REQUIREMENTS.md` §1.1, §47 | Decision record row and FEATURE-009 status | Closeout (after the product gate) |
| F7 | `CLAUDE.md` roadmap line | FEATURE-009 status; FEATURE-010 next | Closeout |
| F8 | `.claude/agents/qa.md` | Says the end-of-project Full QA comes "after FEATURE-008"; the roadmap now ends at FEATURE-010 | At the user's discretion |
| F9 | 008 §27.4 L-F, 004 (frozen) | L-F's development half is resolved by FEATURE-009; Trail Detail gained one link. Frozen specs are not edited; at most a one-line note | At the user's discretion |
| F10 | `docs/DESIGN_SYSTEM.md` §36.1 | Says FEATURE-008 "may reuse" the collection patterns; Memories are FEATURE-009 and use their own journal pattern | Closeout (with F5) |

### 27.3 Deployment follow-up (outside FEATURE-009)

Production cannot reach memory-service yet (008 L-F, §5.3). A deployment must: route `/api/memories/**` (owner, public, and in local mode the photo paths) to memory-service alongside the other services; provision the private S3 bucket and IAM role of 008 §11.6 and set `MEMORY_STORAGE_TYPE=s3`; decide production CORS or same-origin routing with the other services; and, if the API is ever served from another origin than the frontend while local storage is used, set memory-service's `public-base-url`. FEATURE-009 neither builds nor assumes any of this; `npm run preview` and a deployed build cannot reach Memories until it exists, as for every other API today.

## 28. Implementation Record (closeout, 2026-10-17)

The approved design above is unchanged; this section records what was built and accepted. Checkpoint: `.claude/state/features/009-my-memories.md`.

### 28.1 Result

| Item | Result |
|---|---|
| Product gate | **ACCEPTED** by the user, 2026-10-17 |
| Implementation | `frontend`, within §25.2's write scope only. No dependency added; `package.json`, the lockfile, `index.css`, `home.css`, `public/`, and `Project/Backend/**` unchanged |
| Build / lint | `npm run build` exit 0 (page chunks `MemoriesPage`, `MemoryDetailPage`, `MemoryEditorPage`, plus a shared `MemoryCommon` chunk; none loads `three`, R3F, the avatar runtime, or MapLibre); `npm run lint` exit 0 |
| Lead diff review and security read | PASS; no findings (scope, granted-path limits, one-POST guard, no web-storage or console writes, router state = notice enum only, subject-keyed queries) |
| QA | **Lean PASS**, run 1, at 1440×900 with a 1920×1080 and 1024×768 sweep (Playwright fallback with installed Chrome; the Chrome DevTools MCP tools were not in `qa`'s toolset) |
| Repair cycles | **0** of 2 |
| Backend | FEATURE-008 contract reused as is; no contract gap found |

### 28.2 As implemented

| Area | Accepted implementation |
|---|---|
| Routes | `/memories`, `/memories/new` (optional `?trail=`), `/memories/:memoryId`, `/memories/:memoryId/edit`; protected, lazy, in the trip shell; all four pathnames are accepted return destinations (no query carried) |
| Navigation | **Memories** after Gear in `TripHeader` and `HomeHeader` (wide row and Menu), current marker on `/memories` exactly; Trail Detail's "Been on this trail already? **Add a memory**" at the end of the reading column |
| Collection | Photo-led journal cards, server order, 12 per page with **Show older memories**, count, empty / loading / unavailable states, "Trail unavailable" fallback |
| Detail / Edit | Dedicated reading page (strip under the large photo); dedicated edit route sharing one editor with Create; trail immutable after the first save; Private default |
| Photo preparation | Browser-native: JPEG / PNG / WebP only (HEIC and others refused); 40 MB source guard; `createImageBitmap` with `imageOrientation: "from-image"` (image-element fallback); long edge ≤ 2560 px, never upscaled; JPEG 0.88 over white for opaque images, PNG only when a PNG or WebP input has real transparency (one `getImageData` check); ≤ 10 MB after preparation; ≤ 5 photos |
| Uploads | One `POST /api/memories` per Memory (ref guard), then sequential uploads (`FormData`, part `file`, 60 s limit), at most one reorder `PUT`, then `replace` to Detail; partial failure keeps the Memory with Retry / Remove; an unconfirmed `POST` shows "Check My Memories" and is not retried automatically. In Edit, photo requests are serialized; photo controls wait and Save changes is disabled while any runs |
| Queries and signed URLs | `["memories","mine",subject]` (infinite) and `["memories","detail",subject,id]`; `staleTime` 5 min, `gcTime` 10 min, refetch on mount and focus when stale; a failed photo refetches its query once per result only when that result is older than 60 s, otherwise shows its fallback; URLs never stored or used as keys |
| Account isolation | Subject in every Memory key plus the existing `queryClient.clear()` on sign-out and expiry; no web-storage key or cookie added |

Accepted implementation interpretations (lead, 2026-10-17): the Public notice (MM46/MM47) is shown whenever the saved Memory is Public (D29 carries only the notice enum); in Edit, a photo not yet on the server cannot be moved and is removed without the inline confirmation; removing or successfully retrying the last failed photo on Create completes the save and opens Detail; Cancel returns through history when there is an in-app entry, else to `/memories` (or Detail from Edit).

### 28.3 QA evidence (Lean run 1)

Validated: AC-01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13 (to Public), 14, 15, 16, 17 (1440, 1920, 1024), 18 (live part), 19, 21, 23 (simulated), 27, 30 (in-app dialog), 32. Covered indirectly: AC-04, 31 (basics), 33 (Trail Detail and Home header), 34 (partly). Key measurements: one memory `POST` per Memory and strictly sequential photo `POST`s; an EXIF-6 JPEG (3000×1800 stored) prepared to 1536×2560 and upright everywhere; user B never saw user A's data in the same tab and A's Memory URL showed the neutral not-found; Choose this trail on screen on arrival at 1440 (184–228, no page scroll), 1920, and 1024; collection 4 / 4 / 3 columns at 1440 / 1920 / 1024; 54 of 54 memory API requests authenticated; no uncaught or React error.

**Deferred / not run** (not passed): P1 AC-22, 24, 25, 26, 28, 29, 35, 36; parts of AC-11 (date change, clearing the story), AC-13 (back to Private), AC-17 (1366×768), AC-30 (reload prompt, sign-out case), AC-32 (classic scrollbars), AC-02 (narrow Menu); all P2 (AC-37–AC-43). Not verified: a real screen reader, Safari, a physical phone, classic-scrollbar rendering.

### 28.4 Accepted known limitations (non-blocking)

| Id | Limitation |
|---|---|
| L-1 | After a photo fails to load on data younger than 60 s, its frame keeps the fallback until the next refetch or remount (consistent with §17.3) |
| L-2 | In Edit, the upload progress line counts oddly across separate picks ("1 of 1", "Uploading…", "2 of 3"); cosmetic |
| L-3 | Production routing to memory-service, the S3 bucket, and CORS remain a deployment task (§27.3, FEATURE-008 L-F); only the development proxy exists |
| L-4 | Photos are re-encoded twice (browser JPEG 0.88, server 0.90); local-mode photo URLs are root-relative and need same-origin serving |
| L-5 | QA test data remains in `memory_db` under accounts `otc-qa-009-a-08cada` and `otc-qa-009-b-08cada` |

**Environment note.** memory-service was started for this cycle by the lead as a session background process; it stopped at the 2-hour background-command limit **after** QA had finished. It had no effect on any result and is not a defect.

### 28.5 Follow-ups

Done at closeout: §27.2 F1–F7 and F10 (`FRONTEND_CONTEXT.md`, `DESIGN_SYSTEM.md` §37 and related lines, PRD §1.1 / §33.1 / §47, `CLAUDE.md` roadmap, `qa.md` Full-QA timing). F9 left as recorded (frozen 004 and 008 specs not edited). Remaining: the same stale "after FEATURE-008" sentence in `.claude/skills/feature-cycle/SKILL.md` (step 5), at the user's discretion; the deployment follow-up of §27.3.

### 28.6 Boundaries going forward

FEATURE-009 is frozen. FEATURE-010 Community Memories is **next and not started**: it owns all public Memory presentation in Discover and needs no change to FEATURE-009's pages (§26). The final Full QA / regression runs after FEATURE-010, then the feature freeze.

