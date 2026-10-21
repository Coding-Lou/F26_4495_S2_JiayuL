# FEATURE-014 — Plan → Memory Bridge

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-20).** Product gate accepted by the user 2026-10-20. Lean QA PASS; repair cycles 1/2 (AC-30); build and lint PASS; no backend or schema change. Record in §30–§30.1. FEATURE-001 to FEATURE-014 PASS / FROZEN; there is no FEATURE-015; the feature freeze is active; Final Full Regression is next. Earlier: **APPROVED — FROZEN FOR IMPLEMENTATION (2026-10-20)** with U1–U7 and amendment A1 (§29.1) |
| Date | 2026-10-20 |
| Roadmap | Final feature of the approved extension: FEATURE-011, 012, 013 (PASS / FROZEN) → **FEATURE-014**, the final product feature. There is no FEATURE-015. After 014 is accepted and frozen the project returns to the feature freeze (PRD §22) |
| Route | No new route. `/plans` (selected Past Plan detail) gains the bridge; `/memories/new` accepts an optional `date` query parameter |
| Backend | **None** (§6). `memory-service`, `plan-service`, `trail-service` consumed as they are |
| Depends on | FEATURE-002 (session, subject-bound cache), FEATURE-004 (`tripRoutes`), FEATURE-008 (owner Memory API), FEATURE-009 (Memory editor, owner detail, invalidation), FEATURE-013 (`/plans`, trail hydration, `useTodayIso`, paging pattern) |
| Feature cycle (proposed) | Recover → Scope → `frontend` → lead diff review → Lean QA → product gate → closeout. `backend-api: SKIP` (§6), `ui-ux`: design done in §10, `three-d: SKIP`, Blender: SKIP |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (§4, §11, §12, §13, §15, §17, §22) → `docs/FRONTEND_CONTEXT.md` (§3, §4, §8 My Plans / My Memories, §9, §10, §13) → `docs/DESIGN_SYSTEM.md` → specs 008, 009, 011 §4, 013 |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–4, 7, 9, 10, 23, 27–29 |
| `backend-api` | 5.1, 6 |
| `frontend` | 5.2, 6–22, 25 |
| `ui-ux` | 10 |
| `qa` | 23, 24 |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`, "FC §x" is `docs/FRONTEND_CONTEXT.md`, "DS §x" is `docs/DESIGN_SYSTEM.md`, "009 §x", "013 §x" and so on are those feature specifications; a bare "§x" is this document. Decisions are `D…`, acceptance criteria `AC-…`, approval items `U…`, copy ids `PM…` (013's `PL…` ids are reused where named). Paths in code references are relative to `Project/Frontend/src/` unless they start with `Project/`.

---

## 1. Feature Summary

FEATURE-013 shows the user's Plans, but a Plan whose date has passed leads nowhere: the product journey stops at "Go in real life" and the user has to find **My Memories** on their own. FEATURE-014 closes the loop **Past Plan → Memory**.

- In `/plans`, the **selected Past Plan on a curated trail** shows one quiet bridge row in its inline detail:
  - no matching Memory: **How was your trip?** + **Add memory**, which opens the existing FEATURE-009 editor with the Plan's trail **and** trip date preselected;
  - a matching Memory exists (PRIVATE or PUBLIC): **View memory**, which opens the existing owner Memory detail.
- "Matching" is derived, never stored: the signed-in owner's active Memories with the same `trailId` and `tripDate` as the Plan.
- Upcoming Plans (today included), Past Plans on synthetic trails, and Past Plans whose trail is unavailable or not yet resolved show **no** bridge.
- While the user's Memory collection is not yet known, nothing is offered; if it cannot be read completely, the row says **Memory status is unavailable.** with **Try again**. Unknown and error are never "no Memory".

No backend change, no Plan or Memory schema change, no new Plan status, no Plan↔Memory link field, no new route, no dependency, no 3D. The calendar, the Plan rows, and the Memory pages keep their design.

## 2. Product Problem and Goal

**Problem.** After the real trip the user's last touchpoint is My Plans, where a Past Plan says only "This trip date has passed." (013 PL14). The Remember stage (PRD §12) exists but is disconnected from the Plan that preceded it, and re-entering a trail and date the product already knows is friction.

**Goal.** From a Past Plan, one action lands the user in the existing Memory editor with trail and date filled in; once a Memory exists, the same place leads to it. The product journey (PRD §4) becomes continuous: **… → My Plans → Past Plan → Memory → optionally Public → Community Memories.**

## 3. Boundaries

- **011 / 012 / 013 unchanged.** Finish preparation, the ready-to-go clip, Continue → `/plans`, the Plan API, and the `/plans` layout, rows, calendar, delete, and URL state are not modified (011 §4, 013 §28).
- **013 criteria superseded on purpose (only these):** 013 AC-22 ("`/plans` has no Add memory, 'How was your trip?', Memory indicator, or Memory request") and the "no Memory text or action" clause of 013 AC-14 apply from now on to **Upcoming** Plans and to **synthetic** Past Plans only. 013 §10.4's "never … Memory text" context-line rule is replaced by §10 of this document for curated Past Plans. Everything else in 013 stands.
- **008 / 009 reused, minimally extended.** The owner Memory API, the editor, the detail route, the leave guard, and the invalidation model are reused. The only 009 changes are an optional `date` prefill (with its dirty-check baseline) and a new all-pages owner read beside the existing infinite list (§8, §11, U3).
- **010 untouched.** Community Memories and `/api/memories/public` are not used by the bridge.

## 4. Approved Product Decisions (from the specification prompt)

| Id | Decision |
|---|---|
| D1 | Plan and Memory stay separate domains. No `memoryId` on Plan, no foreign key, no relationship table, no new Plan status (`READY` only), no `hasMemory`. Upcoming / Past stays derived from `tripDate` |
| D2 | **Matching identity:** authenticated owner + `trailId` + `tripDate` + not deleted, derived on the client from owner data (§7) |
| D3 | **Eligibility:** `tripDate < today` (viewer's local date, 013 `useTodayIso`). A Plan dated today is Upcoming and has no Memory CTA. Upcoming Plans show no Add, no View, no disabled action, no "come back later" |
| D4 | **Synthetic Past Plans** (`SYNTHETIC_DEMO`) do not participate: listed normally under Past, no Add, no View, no explanatory copy (PRD §12.1, §13) |
| D5 | Curated Past Plan, no match → **How was your trip?** + **Add memory** in the selected Plan detail; not on collapsed rows (§10) |
| D6 | Curated Past Plan, ≥ 1 match → **View memory** instead of Add (never both); opens the owner Memory detail, never Community |
| D7 | PRIVATE and PUBLIC Memories both count; detection uses owner data only, never `/api/memories/public` |
| D8 | Add memory reuses `/memories/new`, extended to `/memories/new?trail=<trailId>&date=<YYYY-MM-DD>`; no `/plans/:id/memory`, no Plan-specific editor |
| D9 | Trail **and** date are prefilled and stay editable; the relationship is whatever the saved Memory says |
| D10 | Query parameters are convenience only: they never bypass trail validation, date validation, authentication, or backend validation |
| D11 | No conclusion "no Memory" from an incomplete collection (P0). Unknown → no CTA; error → unavailable + Try again |
| D12 | Unavailable trail (404) → no bridge; a create flow known to fail is never launched |
| D13 | FEATURE-009 create-success behaviour is kept; Memory queries refresh so that `/plans` shows View memory afterwards without a hard reload |
| D14 | Plan delete never deletes a Memory; Memory delete never deletes a Plan; a recreated Plan derives its state again |
| D15 | Calendar and Plan rows unchanged: no Memory marks, counts, filters, or legend changes |
| D16 | `?plan=<id>` behaviour kept; no `fromPlan` / `source` / `returnTo` / `planId` parameters |
| D17 | One shared owner Memory read for the page, never one per Plan; no polling; subject-aware |

---

## 5. Current Implementation Inspection

### 5.1 Backend inspection (owner: `backend-api`, 2026-10-20, read-only)

Base `Project/Backend/memory-service/src/main/java/com/jay/outdoor/memory/` (`M/`); migration `memory-service/src/main/resources/db/migration/V1__create_memory_tables.sql` (the only one).

- **Owner list.** `GET /api/memories`, `MemoryController.listOwnMemories` (`M/controller/MemoryController.java:39-46`); bearer token required (`M/config/SecurityConfig.java:49-62`). Params: `page` (default 0) and `size` (default 20, max 50, `M/service/MemoryPaging.java:11-12`). **No `trailId`, `tripDate`, or visibility filter**; an unknown param is ignored and the full list returned. `size` outside 1–50 or `page < 0` → `400 VALIDATION_ERROR` (not clamped; `MemoryPaging.java:24-32`). A page past the end is `200` with empty `items`.
- **Page shape.** `MemoryPage<T>(items, page, size, totalItems, totalPages)` (`M/dto/MemoryPage.java:8-24`) from Spring Data `Page`: the count runs again on every page, each page is its own read-only transaction (`M/service/MemoryService.java:66`); no cross-page snapshot.
- **Order.** `tripDate DESC, createdAt DESC, id DESC` (`MemoryPaging.java:14-18`), backed by the partial index `idx_memories_owner_active … WHERE deleted = FALSE` (V1:21-23). Total and deterministic (`id` breaks ties).
- **DTOs.** `OwnerMemorySummary` (`M/dto/OwnerMemorySummary.java:9-19`): `id`, `trailId`, `tripDate` (`"YYYY-MM-DD"`), `title`, `visibility`, `photoCount`, `coverPhoto`, `createdAt`, `updatedAt`. `OwnerMemoryDetail` adds `story`, `photos[]`. The summary carries everything matching needs.
- **Deleted / owner.** List `findByOwnerSubjectAndDeletedFalse` (`M/repository/MemoryRepository.java:34`); detail / update / delete `findByIdAndOwnerSubjectAndDeletedFalse` (`:19`), foreign = missing = deleted = `404 MEMORY_NOT_FOUND`. Owner only from the token `sub` (`M/security/OwnerSubject.java:12-20`). The owner list makes no trail-service call, so Memories on a later-deleted trail still list for the owner.
- **Duplicates.** Allowed: no unique index on `(owner_subject, trail_id, trip_date)` (V1:1-28), no existence check in `MemoryService.create` (`:80-102`). 0..N matches per Plan.
- **Create validation.** Bean validation → `MemoryFieldRules` (`tripDate` ≤ server today + 1, no lower bound; `M/service/MemoryFieldRules.java:25,41-43,66-68`) → tokenless `GET /api/trails/{id}` (`M/client/TrailCatalogClient.java:39-63`): 200 accepted, 404 → `400 TRAIL_NOT_FOUND`, anything else → `503 TRAIL_SERVICE_UNAVAILABLE`. **Synthetic trails are accepted by the server**: neither trail-service detail nor memory-service filters by source; "curated only" is enforced by the UI (picker = `GET /api/trails`, curated). A deleted trail → `400 TRAIL_NOT_FOUND`.
- **Update.** `trailId` immutable (`updatable=false`), `tripDate` editable (`MemoryService.java:123`): a later edit can create or break a match.
- **Public endpoints.** `GET /api/memories/public?trailId=` and `/public/{id}` filter `PUBLIC` and not deleted in the query (`M/service/PublicMemoryService.java:55-77`) and carry no owner; unusable for, and not used by, the bridge.
- **plan-service.** `PlanResponse` = `{ id, trailId, tripDate, status, createdAt, updatedAt }` (`plan-service/.../dto/PlanResponse.java:17-24`); no Memory field, client, FK, or cascade in either direction.
- **Verdict.** Exact detection is correct with the current API by reading every page at `size=50` and matching on `trailId` + `tripDate`, provided an incomplete read is treated as unknown. Residual risk: offset paging can skip or repeat a row if the owner creates / deletes / re-dates a Memory in another tab between page reads; with ≤ 50 Memories (one page) there is no race. Smallest fallback if ever required: optional both-or-neither `trailId` + `tripDate` filters on `GET /api/memories` (same page DTO, order, owner scoping; one derived repository method; no migration). **Not recommended** (still one request per Plan; §6).
- Unrelated observations (not acted on): no test for owner/public `size > 50` → 400; Memory timestamps are not UTC-normalised (Plans are).

### 5.2 Frontend inspection (owner: `frontend`, 2026-10-20, read-only)

**`/plans` structure.**
- `plans/components/MyPlansScreen.tsx`: `MyPlansView` (91–471) owns `usePlans()` (92), `useTodayIso()` (94), `?plan=` (45, 96, 149–165), `usePlanTrails(plans)` (121), `splitPlans` (122), `findPlan` (124); phase `loading | failed | incomplete | empty | ready` (109–118). Per-entry data flows through the `PlanEntryContext` object (368–388) into `PlanSection` / `PlanEntryList` (441–453); a bridge status joins this context the way `trails` does.
- `plans/components/PlanEntry.tsx`: `PlanEntry` (55–147) computes `section` / `upcoming` (62–63) and renders `PlanDetail` only when selected (134–144). `PlanDetail` (160–255): long date (179) → trail retry when `failed` (181–189) → facts `dl` (191–200) → `.plan-context` (202–208: sample line, PL14 on Past, PL15 on gone) → `.plan-actions-area` (210–252: delete confirmation, or View trail / Review gear (Upcoming) / break / Delete plan).
- `plans/hooks/usePlanTrails.ts`: `PlanTrail` = `loading | ready{ trail } | gone (404 or non-UUID id) | failed{ retrying, retry }` (9–15); one query per distinct trail via `trailDetailQueryOptions` (43); `planTrailKey` = lowercased id (21–23). `trail.source` is known only when `ready`.
- `trails/content.ts:109` `isSampleTrailSource` (DEMO_SEED or SYNTHETIC_DEMO), `:117` `isSyntheticTrailSource` (SYNTHETIC_DEMO). Trail Detail shows Add a memory on `!isSyntheticTrailSource(source)` (`trails/components/TrailDetailScreen.tsx:257`).
- `plans/model/planCollection.ts`: `splitPlans` (20–30) Upcoming `>= today`, Past `< today` descending; `sectionOf` (32–34). `plans/hooks/useTodayIso.ts:19–21` re-reads on visibility.

**Plans query (pattern to reuse).** `plans/hooks/usePlans.ts` key `["plans","mine",subject]`, enabled with a subject, one retry on `unavailable`, `networkMode: "always"`, `refetchOnMount: "always"`, no focus/reconnect refetch (14–47). `plans/api/plans.ts` `requestPlans` → `readAllPlanPages` (170–215): size 50, sequential pages, `overflow` above 10 pages, `changed` when `totalItems`/`totalPages` differ from page 0 → one restart → `PlanListIncompleteError` (136–141); `readPlanPage` (240–263) fails the page on any unreadable item; dedup by lowercased id.

**Owner Memory list.**
- `memories/api/memories.ts:91–109` `requestMemoryPage(page, size, cancel)`, 20 s limit (`memoryRequest.ts:5`). **Hazard:** `readMemoryPage` (405–425) silently drops unreadable items (418–423); a complete read must not inherit that.
- `memories/hooks/memoryQueries.ts`: `MEMORY_PAGE_SIZE = 12` (17); `memoriesRootKey` `["memories","mine",subject]` (31–33); `memoryDetailKey` `["memories","detail",subject,id]` (35–37); `sharedOptions` stale 5 min, gc 10 min, `refetchOnMount: true`, `refetchOnWindowFocus: true`, one retry on `unavailable` (39–49). `useMemoryPages` (52–69) is an infinite query extended only by Show older (`MyMemoriesScreen.tsx:104–121, 197–203`): never complete by itself, so not reusable for detection.
- Invalidation, all in `memories/hooks/useMemoryChanges.ts`: `refreshList` (37–38) = `invalidateQueries({ queryKey: ["memories","mine",subject] })`, a **prefix** match, after create (46), update (60), remove (68), uploadPhoto (87), reorderPhotos (102), removePhoto (114), memoryGone (120). Detail-key `setQueryData` at 45/56/80/97/108, `removeQueries` at 66. `memoryQueries.ts:95` `dropFromMemoryPages` writes the exact root key only. Nothing else reads the `mine` prefix with an assumed shape; Community keys are `["community-memories", …]`.
- `memories/types/memory.ts:33–43` `MemorySummary` = `id`, `trailId` (lowercased), `tripDate` (`YYYY-MM-DD`), `title`, `visibility`, `photoCount`, `coverPhoto`; **no `createdAt`** (the parser reads only these). Server order puts the most recently created first within a date. `Plan.trailId` is not lowercased (`plans/api/plans.ts:117`).

**Create route.** `/memories/new` (`app/router/routes.tsx:72`). `memories/components/MemoryEditorScreen.tsx:40–75` `CreateView` reads `?trail=` once (45) and passes `preselect` (67–72). `memories/components/MemoryEditor.tsx`: create starts with `trailId: ""` and **`tripDate: ""`** (153–169); preselect (184–204): non-UUID → `badPreselect` without a request; a UUID is matched (lowercased) against `useTrailLookup()` = `GET /api/trails` `["trails","list"]` (curated only); no match → note "The trail from that link couldn't be found. Choose a trail." (`EditorFields.tsx:231–236`, `content.ts:181`) with an empty editable select. So today a synthetic or unknown id never fails silently and sends no request for it. Trail stays editable in create (`trailEditable`, 250; native select `EditorFields.tsx:175–203`). Date validation (416–425): empty → `dateMissing`, non-ISO → `dateInvalid`, `> todayIso()` → `dateFuture`; input `max={todayIso()}` (1204). **Leave-guard dirty check** uses `values.tripDate !== ""` (260–266): a prefilled date without a baseline would make the untouched form dirty.
- `trails/tripRoutes.ts:60–65` `newMemoryLocation(trailId)` → `{ pathname: "/memories/new", search: "?trail=<id>" }`, sole caller `TrailDetailScreen.tsx:261`. No route uses a `date` query parameter today (dates travel in path segments; query names in use: `trail`, `rec`, `plan`, `memories`).
- `auth/returnDestination.ts:28–34` stores the pathname only (existing behaviour: a sign-in round trip loses `trail` and `date`).

**Create success / cancel.** One `POST` (`MemoryEditor.tsx:941–947`) → detail cache seeded + `refreshList` (`useMemoryChanges.ts:43–48`) → photos → `finishCreate` (640–688) `release()` then `navigate("/memories/<id>", { replace: true, state: noticeState("saved") })` (674–678). History after a save from `/plans`: `/plans?plan=X` → `/memories/<id>`; browser Back → `/plans?plan=X`. Partial photo failure keeps the `incomplete` phase with View memory (1070–1080). Cancel (1056–1068) = `navigate(-1)` when there is history, else `/memories`. Leave guard `hooks/useLeaveGuard.ts:15–74`.

**Owner detail.** `memories/:memoryId` (`routes.tsx:73`), `MemoryDetailScreen.tsx:63–88` `useMemoryDetail` (owner key, `GET /api/memories/{id}`); non-UUID → not-found without a request. No location helper: paths are inline (`MemoryEditor.tsx:675`, `MemoryEditorScreen.tsx:109`).

**Isolation.** `app/providers/AppProviders.tsx:10` `registerSessionCleanup(() => queryClient.clear())`; every owner key carries the subject and is disabled without one.

**Dependencies.** `memories` imports nothing from `plans`; no ESLint boundary rules. A `plans → memories` edge creates no cycle. Current `plans` imports: layout, `auth`, `planning/{presentation,tripDate}`, `trails/{api/trailDetail,content,hooks/useTrailDetail,trailId,tripRoutes,types/trail}`, `lib/useDocumentTitle`, `services/apiClient`.

**CSS (`plans/my-plans.css`, under `.my-plans` in `@layer components`).** `.plan-context` (528–540), `.plan-actions` / `.plan-link` (548–573), `.plans-secondary` (585–588), `.plans-filled` (591–627, "the page's one filled action"; Past has none today), `PlansRetryButton size="quiet"` (693–697), `.plan-trail-retry` (504–506), forced-colours rules (1130–1135). `plans/myPlansContent.ts:7` comment "none mentions Memories" must change with the strings.

**Risks named by the inspection** (resolved in §8–§10): Add→View flicker from stale cached data during the mount refetch; focus refetch inherited from `sharedOptions`; `data` kept alongside `isError`; partial page reads; trail `failed` (source unknown); curated test (`!isSyntheticTrailSource` vs `=== "DEMO_SEED"`); query enablement; focus on resolution; client-side refusal of a hand-edited future `date`.

## 6. Memory API Findings and Backend Decision

| Question | Finding |
|---|---|
| Owner list endpoint | `GET /api/memories?page&size`, token, owner = `sub`, not deleted |
| Filters | None (no `trailId` / `tripDate` / visibility) |
| Page size | default 20, **max 50**, out of range = `400` (not clamped) |
| Ordering | `tripDate DESC, createdAt DESC, id DESC`, deterministic |
| `trailId` / `tripDate` returned | Yes, in the summary (`YYYY-MM-DD`) |
| Both visibilities | Yes |
| Duplicates (owner + trail + date) | **Allowed** (no unique index, no check) |
| Synthetic trail on create | Accepted by the server; UI-enforced curated rule |
| Exact matching without backend change | **Yes**, by a strict all-pages read (§8) |

**Decision (D-B1): no backend change.** Preference hierarchy (prompt §14): A (an existing exact filter) does not exist; **B (safely load the complete owner collection) is chosen**; C (a new filter endpoint) is not needed: B is correct for any collection the page cap admits, costs one request for ≤ 50 Memories, and a filter endpoint would need one request per Past Plan or a batch contract. The residual offset-paging race above 50 Memories is accepted (U5). No Plan schema migration, Memory schema migration, relationship table, `Plan.memoryId`, or Plan status.

## 7. Matching Identity and Multiple Matches

- **Identity (D2):** a Plan *P* and an owner Memory *M* correspond when `lower(M.trailId) === lower(P.trailId)` and `M.tripDate === P.tripDate` (exact `YYYY-MM-DD` string equality), where *M* is in the signed-in user's owner collection (the server already excludes deleted rows and other owners). Visibility is ignored (D7).
- **Multiple matches (D-M1):** the backend allows several; FEATURE-014 does **not** add a uniqueness rule. One or more matches = "Memory exists". **View memory opens the first match in server order**, which within one `trailId` + `tripDate` is the **most recently created** Memory (`createdAt DESC`, then `id DESC`): the prompt's preferred rule, obtained from the API order without parsing `createdAt` (absent from the client type). Deterministic across reloads.
- **Pure function:** `plans/model/planMemory.ts` builds once per successful read a `Map<"<lowercased trailId>/<tripDate>", memoryId>` keeping the first occurrence in server order, and exposes `memoryForPlan(index, plan): string | null`. No date parsing.
- The match is recomputed from data every time; nothing is stored on a Plan or a Memory, and opening Add memory changes nothing (D14, §13).

## 8. Detection Architecture

**Owner Memory index (one shared read, D17).**

| Aspect | Specification |
|---|---|
| Request | `requestAllMemories(cancel)` in `memories/api/memories.ts`: `GET /api/memories?page=n&size=50` for n = 0, 1, … sequentially, through the existing `memoryRequest` layer (20 s per page, `AbortSignal`) |
| Strict pages | A new strict page reader (or a strict mode of `readMemoryPage`): **any unreadable item fails the read** (kind `invalid`); the existing lenient reader used by My Memories is not changed |
| Paging rules (013 A1 pattern) | Page 0 fixes `totalItems` / `totalPages`. `totalPages > 10` → overflow. A later page whose metadata differs, or a final distinct-id count (dedup by lowercased id) ≠ `totalItems` → `changed` → **one restart from page 0**; a second `changed` → `MemoryListIncompleteError` |
| Result | `MemorySummary[]` in server order, complete by construction, or an error. Never a partial array |
| Hook | `useOwnerMemoryIndex(enabled)` in `memories/hooks/` (owned by `memories`, which owns the key and its invalidation) |
| Key | `["memories","mine",subject,"all"]`: under the `mine` prefix, so every existing `refreshList` (create, update, remove, photo changes, memoryGone) also invalidates it; the infinite list's exact-key writes do not touch it |
| Options | Own options, **not** `sharedOptions`: `enabled` only with a subject **and** the caller's flag; `refetchOnMount: "always"`; `refetchOnWindowFocus: false`; `refetchOnReconnect: false`; no `refetchInterval`; one retry on `unavailable` only; `networkMode: "always"`; stale 5 min, gc 10 min |
| Enablement | `MyPlansView` enables it when the Plans phase is `ready` and **at least one potentially eligible Past Plan exists**: a Past Plan whose trail is not already known to be synthetic or gone (a trail still loading or failed counts as potentially eligible). No request for users without such Plans; status is usually known when a Past Plan is first expanded. It does not wait for trail hydration |
| Retry | **Try again** calls the index query's `refetch()` only; Plans and trail queries are not refetched |
| Sign-out | `queryClient.clear()` (existing) |

**Bridge status (derived per selected Plan, D11).** Evaluated in this order; the first matching row wins.

| # | Condition | Status | Rendered |
|---|---|---|---|
| 1 | Plan is Upcoming (`tripDate >= today`) | `none` | Nothing (no region, no text) |
| 2 | Trail `loading`, `gone`, or `failed` | `none` | Nothing (013's own trail states and retry remain) |
| 3 | Trail `ready` and `isSyntheticTrailSource(source)` | `none` | Nothing (D4) |
| 4 | Index `isError` (including with cached data), overflow, or incomplete, and not currently refetching | `unavailable` | PM4 + Try again |
| 5 | Index `isError` and refetching after Try again | `unavailable-retrying` | PM4 + Try again in its working state |
| 6 | Index pending, disabled, `no-session`, or `isFetching` (including a background or mount refetch over cached data) | `checking` | Neutral checking state (§10); **no CTA** |
| 7 | Index success, not fetching, ≥ 1 match | `view` | **View memory** → `/memories/<id>` |
| 8 | Index success, not fetching, 0 matches | `add` | PM1 + **Add memory** → `/memories/new?trail=&date=` |

- **Curated test (D-C1):** "curated" = trail `ready` and `!isSyntheticTrailSource(source)`, the rule Trail Detail already uses for Add a memory. A source outside the catalog (none exists today) would reach the editor's existing "couldn't be found" note, never a failed `POST`.
- Rule 6 before 7/8 is what prevents the Add → View flicker after returning from a create: the index was invalidated while inactive, so its stale data is hidden until the mount refetch settles.
- Rule 2 for `failed` (D-T1): the source is unknown, so curated vs synthetic cannot be decided; the existing 013 trail **Try again** resolves it, after which rules 3–8 apply.

## 9. Eligibility Summary

| Plan | Trail | Memory | Bridge |
|---|---|---|---|
| Upcoming (incl. today) | any | any | none |
| Past | synthetic | any (even if a Memory was created through the API) | none |
| Past | gone (404) | any | none (D12) |
| Past | loading / failed | any | none until the trail resolves |
| Past | curated | index unknown | checking, no CTA |
| Past | curated | index error / incomplete | **Memory status is unavailable.** + Try again |
| Past | curated | 0 matches | **How was your trip?** + **Add memory** |
| Past | curated | ≥ 1 match (PRIVATE or PUBLIC) | PM2 + **View memory** (most recently created match) |

## 10. Bridge Visual and Interaction Design (owner: `ui-ux`)

All sizes px; colours DS §8; "`ink` 0.08" = `ink` at 8 % (the `--plans-ink-*` family); tiers T / N and coarse pointer as 013 §10.9. Everything not named here is 013 §10 unchanged.

**Design idea in one line: a quiet postscript to a finished trip — one line of text and one secondary control, written in the same ink as the Plan above it.** No card, panel, fill, badge, photo, or Memory title. The bridge invites; it never competes with the Plan's own facts.

### 10.1 Placement and geometry

| Part | Specification |
|---|---|
| Element | `div.plan-memory` with `data-state="add | view | checking | unavailable"` (`unavailable-retrying` renders as `unavailable` with Try again working). Rendered only for those states; for `none` nothing is in the DOM and no space is reserved |
| Position | Inside `PlanDetail`, **after `.plan-context`, before `.plan-actions-area`** (so DOM, reading, and Tab order are: long date → facts → context lines → bridge → rule → View trail → Delete plan). On a curated Past Plan `.plan-context` always renders (PL14, and PL13 for `DEMO_SEED`), so the bridge always follows it |
| Spacing | `margin-top: 16` from the context lines. The actions area keeps its own 16 + rule + 16; the rule therefore separates "what happened" (bridge) from "manage this Plan" (actions) |
| Layout | Stacked, start-aligned, at every width: line (`p`), 8 gap, control. Stacked, not inline, so add / view / unavailable have the **same height** whatever the text length (no reflow when the state resolves) |
| Reserved height | `min-height: 72` (24 line + 8 + 40 control); **76** on a coarse pointer (44 control). Applies in every rendered state, so checking → add / view / unavailable never moves the rule or the action row below it. Holds at ≥ 360; below 360 a line that wraps may add 24 once (accepted) |
| Line | `ink` 16/24 (all tiers). PM1 and PM2 weight 600 (same voice as PL19, a question / statement addressed to the user); PM4 weight 500. No icon on the line, never `stone` (the line must read as content, not as a footnote) |
| Clipping | No `overflow: hidden` on `.plan-memory`; the DS §18 ring on the control is never clipped |
| Delete confirmation | **The bridge stays rendered and unchanged** while the delete confirmation is open or working: hiding it would shift the confirmation up by 72 while focus is on Cancel, and would remount the row (re-triggering 10.4 announcements). Nothing in it becomes false: deleting a Plan never deletes a Memory (D14). On delete success the whole entry leaves as 013 §10.8 |

### 10.2 The four rendered states

| State | Line | Control |
|---|---|---|
| `add` | PM1 **How was your trip?** | **Add memory** PM5, `Link` → `newMemoryLocation(lower(trailId), tripDate)`; icon `NotebookPen` |
| `view` | PM2 **You kept a memory of this trip.** (states the fact, so the control is not a bare button; never the Memory title, visibility, or a count when several match) | **View memory** PM6, `Link` → `memoryDetailLocation(id)`; icon `BookOpen` |
| `checking` | No visible text. Hidden PM3 in the row (reading order only). After **500 ms** still checking: two static placeholder bars appear (line bar 144 × 14 at the line's centre, radius 6; control bar 136 × 40 / 44 coarse, radius 10; both `ink` 0.08, `aria-hidden`, no shimmer, no fade: an instant opacity step). Before 500 ms the reserved band is simply empty paper, so the usual fast mount refetch (return from a create) shows nothing at all | **None**: no CTA, no disabled control |
| `unavailable` | PM4 **Memory status is unavailable.** | **Try again** PL43 = `PlansRetryButton size="quiet"` (36 / 44 coarse, `RotateCw`), refetching the Memory index only (§8). Working (`unavailable-retrying`): `LoaderCircle` + PL44 **Trying again…**, `aria-disabled`, keeps focus and place; PM4 stays visible |

Not `role="alert"` and no `ember` / `CircleAlert` on PM4: the failure is not the result of the user's action and the Plan is unaffected (§19).

### 10.3 Control styling

- **Add memory / View memory: secondary on paper**, the View trail box exactly (`trip-control trip-button plans-secondary`: no fill, 1px `stone` border, `ink` 14/20 weight 600, 40 tall / 44 coarse, radius 10, padding 0 16, 16px icon, gap 8; hover / active / focus as View trail, cursor `pointer`). **Not filled.** `.plans-filled` stays the page's one filled action (Review gear, Upcoming only): a Past Plan is quieter than an Upcoming one (013 §10.3), and remembering is an invitation, not a next obligation. The lead-in line, not colour, gives the bridge its presence.
- Width: content width at ≥ 768 (≈ 140 / 150), start-aligned; **full width below 768** (matching the Past Plan's full-width View trail on N), still 44 tall on coarse pointers.
- Icons: `NotebookPen` (add) and `BookOpen` (view), lucide, 16px, `strokeWidth={2}`, `aria-hidden`, consistent with `MapPinned` / `Backpack` / `Trash2` beside them. The label is always visible text; no icon-only state.
- No disabled state exists for either link; nothing is rendered when they cannot act.

### 10.4 Labels and accessible names

- **Sentence case confirmed (U2): Add memory / View memory.** Verb + noun matches View trail, Review gear, Delete plan, 009's View memory, and PRD §11.2. Trail Detail's **Add a memory** sits after a different lead-in (MM150) and is not changed; the editor's title "Add a memory" is the destination's sentence and reads naturally after the action.
- **No hidden context in the accessible names**: the visible label is the name (WCAG 2.5.3). Only one Plan is expanded at a time, so the page holds at most one Add / View memory, and its context (trail name, long date, PM1 / PM2) is in the same `li` directly above, as for View trail. The links carry no `aria-describedby`.
- The live region (10.5) and the line are separate nodes; the link is not labelled by the line.

### 10.5 Announcements (one polite region, change-only)

One visually hidden `span role="status"` (polite, atomic) inside `.plan-memory`, present in every rendered state, **empty when mounted**. One 500 ms `slow` flag (one timer, cleared on resolution and unmount) drives both the placeholder bars and PM3.

| Situation | Written to the region |
|---|---|
| Checking resolves within 500 ms (first read, or mount refetch over cache) | Nothing: the visible result is the information; a repeated visit says nothing |
| Checking lasts 500 ms | PM3 |
| …then resolves | add → PM7, view → PM2, unavailable → PM4 |
| Detail expanded on a Plan whose index is already failed, or a check resolves to unavailable | PM4 once |
| Try again resolves | add → PM7, view → PM2; failing again → PM4 re-written (cleared, then set) so it is heard again |
| Same outcome as last written in this mount | Nothing |

### 10.6 Focus

- Detection never moves focus (§19). Expand / collapse focus stays on the entry button (013 §10.4).
- Exception (§19): focus is on Try again and the row resolves → focus moves to the new **Add memory** / **View memory** link; if the bridge resolves to `none`, to the Plan's entry button. While working, Try again keeps focus (`aria-disabled`, not `disabled`).
- Focus ring DS §18 on both links and Try again (radius 10).

### 10.7 Responsive, pointer, forced colours, motion

| Context | Behaviour |
|---|---|
| ≥ 1024 (L 1440: line + control within the ≈ 557 detail column; S 1024: ≈ 353) | 10.1 as written; content-width control. 1920: nothing stretches (detail column capped by 013 §10.2) |
| T 768–1023 | Same as desktop; detail inset by the date column as 013 |
| N < 768 (390, 320) | Detail padding 8 (013); line, then control **full width**; PM2 may wrap at 320 (10.1) |
| Coarse pointer, any width | Links and Try again 44 tall; reserved height 76; nothing depends on hover |
| Forced colours | Line and labels system text; link borders render as `CanvasText` (as View trail); placeholder bars disappear (decorative; PM3 still in the DOM); focus by the transparent-outline rule of 013. No new forced-colours rule needed beyond `.plan-memory` inheriting `CanvasText` |
| Motion | **None new.** The bridge enters with the detail's existing fade + 4px rise (013 §10.10); every state change is an instant swap; the 500 ms placeholder is a step, not a transition. Reduced motion: as 013 (no rise or fade; `LoaderCircle` static with PL44) |

### 10.8 Copy deck

| Id | Text | Where |
|---|---|---|
| PM1 | How was your trip? | Visible line, `add` |
| PM2 | You kept a memory of this trip. | Visible line, `view`; also the polite announcement for a resolution to `view` |
| PM3 | Checking for a memory of this trip… | Hidden text in the row while `checking`; polite announcement only after 500 ms |
| PM4 | Memory status is unavailable. | Visible line, `unavailable`; polite announcement |
| PM5 | Add memory | Link |
| PM6 | View memory | Link (009's `viewMemory` wording; own string in `myPlansContent`) |
| PM7 | You can add a memory of this trip. | Announcement only, for a resolution to `add` after PM3 or Try again |
| PL43 / PL44 | Try again / Trying again… | Reused |

No copy mentions the Plan's status, visibility, synthetic trails, or why a bridge is absent.

### 10.9 Closeout notes for DS (proposed, not edited)

- A **derived-status action row** pattern: reserve the resolved geometry while unknown; an empty band for the first 500 ms, then static placeholders; announce on change of outcome only; unknown and error never render the "absent" action.
- §36 / itinerary note: a past entry's follow-up action is secondary on paper with a one-line lead-in; the filled action stays reserved for the forward-looking step.

### 10.10 Open for lead

1. **§19 / AC-31 wording.** "Checking … announced politely": this design announces PM3 only when checking lasts 500 ms (silent otherwise). This is a refinement of "does not announce on every mount refetch"; confirm AC-31 is read this way.
2. **500 ms timer.** §18's "no timer" concerns date rollover; this UI-only timer is separate. Confirm, or drop the delay (then bars and PM3 appear immediately, and the return-from-create refetch briefly shows bars).
3. **Bridge during delete confirmation** stays visible (10.1). If the lead prefers hiding it, the confirmation will jump up by 72 / 76.
4. **Trail resolution jump.** `none` reserves no space (as briefed), so a Past Plan expanded while its trail is still loading grows by 88 / 92 (16 + 72 / 76) when the trail resolves to curated. Accepted as part of 013's existing loading → ready change (facts also appear then).
5. PM2 and PM7 are new strings not named in §1 / §9 (which only define PM1 / PM4 and the labels); no conflict, recorded for the copy closeout.

### 10.11 Lead resolution of §10.10 (2026-10-20)

1. **Accepted.** "Announced politely" in §19 and AC-31 means: announced on a change of outcome per §10.5; PM3 only after 500 ms of checking. §19 and AC-31 are worded accordingly.
2. **Accepted.** The 500 ms delay is a presentation timer for the placeholder and PM3 only; §18's "no timer" concerns date rollover and stays true. No timer drives data, polling, or eligibility.
3. **Accepted: the bridge stays visible** during the delete confirmation.
4. **Accepted** as part of 013's loading → ready change.
5. **Accepted**, with PM2 submitted for product approval under U2: the prompt preferred the bare **View memory** control; PM2 is a one-line statement above it so the row keeps one shape in every state. If the user prefers the bare control, PM2 is dropped from the line (it remains the announcement) and the reserved height is unchanged.

## 11. Add Memory Route and Prefill

- **Location (D8, D-R1):** `newMemoryLocation(trailId, tripDate?)` in `trails/tripRoutes.ts` gains an optional second argument: `{ pathname: "/memories/new", search: "?trail=<id>&date=<YYYY-MM-DD>" }` (`encodeURIComponent` on both). Without it the result is unchanged, so Trail Detail's caller is untouched. The bridge passes the Plan's **lowercased** `trailId` and its `tripDate`. Query name `date` (new, consistent with `trail` / `plan`); no other parameter.
- **Trail prefill (D9):** the existing `?trail=` preselect, unchanged: matched against the curated list once loaded, editable, "couldn't be found" note when absent.
- **Date prefill (D9, required):** `CreateView` reads `date` once alongside `trail` and accepts it only when `isIsoDate(value) && value <= todayIso()` (`planning/tripDate.ts`). An accepted value seeds `initial.tripDate`; anything else is **ignored silently** (empty field, the existing `dateMissing` validation on save). The field stays the existing editable date input with `max={todayIso()}`. The date prefill is independent of the trail prefill (a bad trail does not drop a good date).
- **Dirty baseline (required):** `MemoryEditor` takes a `preselectDate` prop and records it as an `initialDate` baseline, so the leave guard treats an untouched prefilled date as clean (exactly as `initialTrail` does for the trail). Opening Add memory and pressing Cancel or Back with no edits never shows the leave dialog.
- **Validation (D10):** nothing bypasses the editor's validation, the session (`/memories/new` is protected), or the server (`TRAIL_NOT_FOUND`, `tripDate` ≤ server today + 1). The URL is never treated as persisted data.
- **No Plan coupling:** the editor does not know about Plans; nothing is sent to the server about a Plan.

## 12. View Memory

- `memoryDetailLocation(id)` → `"/memories/<id>"`, added beside `newMemoryLocation` in `trails/tripRoutes.ts` (the module `plans` already imports; `trails` still imports nothing from `memories`).
- Opens the existing owner detail (`useMemoryDetail`, owner key), never Community. A Memory deleted elsewhere in the meantime shows the existing not-found state there; on return to `/plans` the mount refetch yields Add memory.

## 13. Lifecycle

| Event | Result |
|---|---|
| Add memory → save (any visibility) | FEATURE-009 unchanged: `POST`, photos, `replace` to `/memories/<id>` with the "saved" notice; `refreshList` invalidates the index. Browser Back (or later visiting `/plans?plan=X`) → mount refetch → **View memory**, no hard reload, no Add flash |
| Add memory → Cancel / Back without saving | Nothing created; the Plan still shows **Add memory**; no leave dialog when nothing was edited (§11) |
| User changes trail and/or date before saving | The saved Memory matches whatever Plan has its trail + date; the originating Plan may still show **Add memory** (correct, D9) |
| Memory edited to another date | Match moves accordingly after the next index read (`refreshList` after update) |
| Memory deleted (My Memories) | Plan untouched; next `/plans` visit → **Add memory** |
| Plan deleted | Memory untouched in My Memories; no cascade (D14). Delete copy PL19 / PL20 unchanged |
| Plan recreated for the same trail + date while a Memory exists | Derives **View memory** automatically (once Past) |
| Partial photo upload on create | 009's `incomplete` phase with its own View memory; the Memory exists, so the Plan shows **View memory** |

## 14. `/plans` and Calendar Unchanged

No change to: the collapsed rows (no CTA, no Memory indicator, PL11 accessible name unchanged), the calendar (Plans only: no Memory icons, counts, filters, legend change), Upcoming / Past rules, sorting, `?plan=`, View trail, Review gear, Delete plan and its confirmation, empty / loading / error / incomplete states, the header. PL14 "This trip date has passed." stays.

## 15. URL and Return Navigation

- `/plans?plan=<id>` unchanged (`replace`); the Add memory and View memory links are plain `Link` pushes, so browser Back returns to `/plans?plan=<id>` with the Plan selected and its month shown (013 AC-15 behaviour).
- No `fromPlan`, `source`, `returnTo`, or `planId` parameter; 009's post-create navigation (`replace` to detail) and the editor's back row (to `/memories`) are unchanged (D16). Returning to `/plans` from the Memory detail is browser Back (accepted, U6).

## 16. Account Isolation

- Index key `["memories","mine",subject,"all"]`; disabled and sends nothing without a subject; cleared with the whole cache on sign-out or expiry.
- P0 scenario: A has a Past Plan with a Memory (View memory) → sign out → B signs in (same tab) with a Plan on the same trail + date and no Memory → B sees **Add memory**, never A's View memory, at no moment.
- No owner identity in the UI; no Memory title is shown in the bridge (§10).

## 17. Network Pattern and Performance

- Per `/plans` mount with Past Plans: the existing Plans read + one trail detail per distinct trail (cached) + **one** owner Memory index read (one request for ≤ 50 Memories; ≤ 10 sequential requests otherwise). Selecting Plans, changing month, filtering a day, and expanding / collapsing make no Memory request.
- No per-Plan Memory request, no `GET /api/memories/{id}` from `/plans`, no `/api/memories/public` request, no polling, no focus or reconnect refetch.
- No Past Plans → no Memory request at all.

## 18. LocalDate Semantics

`Plan.tripDate` and `Memory.tripDate` are both `YYYY-MM-DD` and compared as strings; eligibility uses 013's `todayIso()` / `useTodayIso` string comparison. No `new Date("YYYY-MM-DD")`, no `toISOString()` date derivation, no UTC conversion, no date timer (the 500 ms presentation delay of §10.5 is unrelated to dates); a Plan becomes Past on the next visibility re-read after midnight (013 AC-42 behaviour).

## 19. Accessibility

- The bridge is real text plus real controls: Add memory and View memory are `Link`s (navigation), Try again is a `button`.
- One polite, change-only status region (§10.5): nothing when checking resolves within 500 ms; PM3 after 500 ms of checking, then the outcome (PM7 / PM2 / PM4); a Try again result is always announced. No `role="alert"` for unavailable: it is not a result of the user's action.
- **No focus stealing:** resolution never moves focus. Exception: if focus is on Try again and that control disappears on resolution, focus moves to the resulting Add memory / View memory link (or, for `none`, to the Plan entry button).
- No Memory control, disabled or otherwise, on Upcoming Plans. Keyboard order: inside the expanded detail, the bridge comes after the context lines and before the action row.
- Forced colours: the row uses the existing tokens and the plans forced-colours rules (§10).

## 20. Responsive

Reuses 013 §10.4 / §10.9. Checked at 1440×900, 1920×1080, 1024×768; below 768 a basic usable fallback (the bridge stacks; its control at full width per §10). No layout change to the list, calendar, or page grid.

## 21. Dependencies (FC §10 follow-up)

**Final dependency direction (amendment A1, 2026-10-20): `plans → memories`, one way. Nothing under `features/memories/**` imports from `features/plans/**`.** The Memory feature stays independent of Plans: the `date` prefill is a generic Memory-create capability (it knows nothing about Plans), and the all-pages owner index is a generic Memory read. Plans consumes them. A helper is moved to an existing neutral location only if importing it from `memories` would create an undesirable edge; no new abstraction layer.

- New edge `plans → memories`, limited to `useOwnerMemoryIndex` (hook) and the `MemorySummary` type (and `memoryFailureKindOf` only if needed to recognise `no-session`). `memories` does not import `plans`.
- Route helpers stay in `trails/tripRoutes.ts` (`newMemoryLocation`, `memoryDetailLocation`); `trails` still imports nothing from `memories`.
- No new package (`package.json` unchanged).

## 22. Test Strategy

No test runner exists (CLAUDE.md). Validation is: `npm run build` and `npm run lint` exit 0; lead diff review against §8 (strict reader, cap, restart, own options), §11 (date acceptance rule, dirty baseline), §21 (imports), §25 (write scope), the out-of-scope list (§28); Lean QA (§24) in a real browser.

## 23. Acceptance Criteria

38 criteria: **P0 23**, **P1 10**, **P2 5**. "A" and "B" are the QA accounts (§24.1). "Bridge" = the §10 row in the selected Plan's detail.

### P0

| Id | Criterion |
|---|---|
| AC-01 | A selected Past Plan on a curated trail whose trail + date match none of the user's Memories shows PM1 **How was your trip?** and **Add memory**, and no View memory |
| AC-02 | A selected Past Plan on a curated trail with a matching **PRIVATE** Memory shows PM2 and **View memory**, no Add memory, and never the Memory's title or visibility |
| AC-03 | A matching **PUBLIC** Memory also yields **View memory** |
| AC-04 | Upcoming Plans, including a Plan dated today, show no bridge at all: no Add, no View, no disabled control, no checking / unavailable text, no "come back later" |
| AC-05 | A Past Plan on a synthetic trail is listed normally under Past and shows no bridge and no explanatory Memory copy |
| AC-06 | **Add memory** opens the existing FEATURE-009 editor at `/memories/new?trail=<trailId>&date=<tripDate>`; no Plan-specific route or editor exists |
| AC-07 | In that editor the Plan's trail is preselected in the trail field |
| AC-08 | In that editor the Plan's trip date is prefilled in the date field |
| AC-09 | Saving a PRIVATE Memory from there follows 009 (detail with the saved notice); returning to `/plans?plan=<id>` by browser Back or navigation shows **View memory** for that Plan without a hard reload |
| AC-10 | **View memory** opens `/memories/<id>`, the owner detail of a Memory whose trail and date equal the Plan's (never a Community view) |
| AC-11 | Detection uses `GET /api/memories?page&size=50` with the user's token only; `/plans` sends no `/api/memories/public` request (network log) |
| AC-12 | Detection never concludes "no Memory" from a partial collection: all pages are read, a malformed item, metadata change after one restart, or more than 10 pages yields the unavailable state, never Add memory (code review; QA where feasible) |
| AC-13 | When the Memory read fails (e.g. `/api/memories` blocked), `/plans` still lists Plans, calendar and actions work, and the bridge shows PM4 **Memory status is unavailable.** + **Try again**; Add memory is not shown |
| AC-14 | **Try again** refetches only the Memory read; after the service recovers it resolves to Add or View correctly; Plans and trail requests are not repeated |
| AC-15 | While the Memory state is unknown (first load, and the mount refetch after returning from a create), no Add memory is rendered; there is no Add → View flicker |
| AC-16 | A signs out, B signs in in the same tab; B's Plan on the same trail + date as A's View-memory Plan shows **Add memory** at every moment; the Memory key includes the subject |
| AC-17 | No Plan field, status, or schema changes: Plan responses remain `{ id, trailId, tripDate, status: "READY", createdAt, updatedAt }`; no backend file changed |
| AC-18 | Deleting a Plan leaves its Memory in My Memories (and readable at its detail) |
| AC-19 | Deleting a Memory leaves its Plan in `/plans`; on the next visit the Plan shows **Add memory** |
| AC-20 | A Past Plan whose trail is unavailable (404) shows no bridge; nothing launches a create for that trail |
| AC-21 | No Memory is ever created without the user saving the editor: opening `/plans`, selecting Plans, and opening Add memory send no `POST /api/memories` |
| AC-22 | The calendar and the collapsed Plan rows are unchanged: no Memory marks, counts, filters, legend entries, or row CTAs |
| AC-23 | `npm run build` and `npm run lint` exit 0 |

### P1

| Id | Criterion |
|---|---|
| AC-24 | Both prefills stay editable; changing trail or date before saving saves those values, and the originating Plan then still shows **Add memory** |
| AC-25 | Opening Add memory and leaving with Cancel or Back without editing shows no leave dialog and creates nothing; the Plan still shows **Add memory** |
| AC-26 | A `date` that is not a strict `YYYY-MM-DD` or is after the viewer's today is ignored (empty date field, normal validation); a bad `trail` shows 009's existing note; server validation is unchanged |
| AC-27 | With two matching Memories, View memory opens the most recently created one, consistently across reloads |
| AC-28 | Cache refresh: after creating, editing the date of, or deleting a Memory, the next `/plans` visit reflects it with no hard reload; focus changes and reconnects trigger no Memory request |
| AC-29 | A Plan recreated (same trail + date) after deletion derives **View memory** when a matching Memory exists |
| AC-30 | Keyboard only: Add memory, View memory, and Try again are reachable in detail order (after the context lines, before View trail) and operable; focus is never moved by detection resolving, except per §19 |
| AC-31 | One polite change-only region per §10.5: silent when checking resolves within 500 ms, PM3 after 500 ms then PM7 / PM2 / PM4, Try again results always announced; no `role="alert"`; real text, no icon-only control |
| AC-32 | 1440×900 and 1024×768: the bridge fits the detail column as §10, no horizontal scroll, no clipped focus ring |
| AC-33 | Trail Detail's **Add a memory** link and the 009 create flow without `date` behave exactly as before |

### P2

| Id | Criterion |
|---|---|
| AC-34 | More than 50 Memories are read across pages without a visible difference (code review or a temporarily lowered page size; Lean QA does not seed 51) |
| AC-35 | A Plan becomes Past across midnight on returning to the tab (visibility re-read) and then shows its bridge state; no timer |
| AC-36 | A Plan dated `2026-10-19` matches a Memory dated `2026-10-19` with the browser in `America/Vancouver` and `Asia/Tokyo`; no `new Date("YYYY-MM-DD")` / `toISOString()` date derivation |
| AC-37 | Stale cache: a Memory created in another tab appears as View memory on the next `/plans` mount (mount refetch), never via polling |
| AC-38 | Below 768 px (390 and 320): the bridge is usable, its control full width per §10, no horizontal scroll; 1920×1080: nothing stretches |

## 24. Lean QA Plan

About 10 minutes, Chrome DevTools MCP first (Playwright over CDP as fallback), `npm run dev` on 5173 with trail-, user-, memory-, and plan-service and Keycloak running. Not Full Regression.

### 24.1 Test data (deterministic, QA-owned accounts only)

- Two QA accounts A and B (the 013 QA accounts or new `otc-qa-f014-*@example.test`).
- **Past Plans without DB injection:** as 013 §25.1 (U8 as approved): the Plan API rejects past dates, so Past is produced by moving the **browser's** clock forward (Playwright `page.clock` or an equivalent `Date` override in the QA page only). Create Plans for **server tomorrow** and emulate a browser date ≥ the day after: they become Past, and a Memory for that date is accepted by the server (today + 1 allowance). QA-account Plans already in the past (e.g. the 011 rows dated 2026-10-19) may also be used. The "today → Upcoming" check runs without clock emulation.
- For A: 1 Upcoming curated Plan (today if possible); 1 Past curated Plan with no Memory (P1); 1 Past curated Plan with a **PRIVATE** Memory on the same trail + date (P2; the Memory created through the bridge itself or `POST /api/memories` with A's token); 1 Past synthetic Plan (P3).
- For B: 1 Past Plan on **the same trail + date as P2**, no Memory.
- Trail unavailable: **no DB row needed**: a DevTools / Playwright interception returns `404` for that Plan's `GET /api/trails/{id}` (and a non-404 failure for the failed case). Memory detection failure: block `/api/memories` (request blocking or a brief memory-service stop).
- Memories created by QA are QA-account rows only; no migration, seed change, or validation weakening.

### 24.2 Steps

1. A, `/plans` at 1440×900 without clock emulation: Upcoming (today) Plan → no bridge. AC-04.
2. With clock emulation: select P3 (synthetic Past) → no bridge, no Memory copy. AC-05.
3. Select P1 → PM1 + **Add memory** (no flash of another state). AC-01, AC-15.
4. Add memory → `/memories/new?trail=…&date=…`; trail preselected, date prefilled. AC-06–08.
5. Back without editing → no leave dialog, P1 still Add memory. AC-25.
6. Add memory again → save as **PRIVATE** → detail with saved notice → browser Back → P1 shows **View memory**, no Add flash. AC-09, AC-15, AC-21.
7. View memory → correct owner detail (trail + date equal the Plan's). AC-10.
8. Select P2 → **View memory**; network log shows only owner `/api/memories?…size=50`, no `/public`. AC-02, AC-11.
9. Delete the Memory created in step 6 (My Memories) → `/plans` → P1 back to **Add memory**; Plan still present. AC-19.
10. Block `/api/memories` → reload `/plans` → Plans and calendar usable, P1 shows PM4 + Try again, no Add memory; unblock → Try again → resolves. AC-13, AC-14.
11. Intercept P1's trail detail with `404` → no bridge. AC-20.
12. Calendar and collapsed rows unchanged. AC-22.
13. Sign out; B signs in in the same tab, same clock emulation → B's Plan (P2's trail + date) shows **Add memory** at every moment. AC-16.
14. Keyboard pass over the bridge in each state. AC-30.
15. 1920×1080 and 1024×768 quick sweeps. AC-32, AC-38 (1920 only).
16. `npm run build`, `npm run lint`. AC-23.

Deferred unless time allows (not passed, not defects): AC-03 (PUBLIC; covered by code review, one toggle if time), AC-12 (code review), AC-18, AC-24, AC-26–AC-29, AC-34–AC-37, AC-38 below 768, real screen reader, Safari, phones.

## 25. Future Implementation Write Scope

### 25.1 `frontend`

- **New:** `features/memories/hooks/useOwnerMemoryIndex.ts` (or inside `memoryQueries.ts`), `features/plans/model/planMemory.ts`, `features/plans/components/PlanMemoryBridge.tsx`. Names may vary; the boundary may not.
- **Edits inside `features/plans/`:** `components/MyPlansScreen.tsx` (enable the index, pass status through `PlanEntryContext`), `components/PlanEntry.tsx` (render the bridge in `PlanDetail` per §10), `myPlansContent.ts` (PM strings; update the "none mentions Memories" comment), `my-plans.css` (bridge row, forced colours).
- **Edits outside `plans`, exactly (U3):** `features/memories/api/memories.ts` (+ `requestAllMemories`, strict page reader, `MemoryListIncompleteError`; the lenient reader and `requestMemoryPage` unchanged), `features/memories/hooks/memoryQueries.ts` (key helper only if the hook lives elsewhere), `features/memories/components/MemoryEditorScreen.tsx` (read `date`), `features/memories/components/MemoryEditor.tsx` (`preselectDate` prop, `initialDate` dirty baseline), `features/trails/tripRoutes.ts` (optional `tripDate` on `newMemoryLocation`, + `memoryDetailLocation`).
- **Not authorised:** `Project/Backend/**`, `vite.config.ts`, `package.json` / lockfile, `features/community-memories/**`, `features/discover/**`, `features/loadout/**`, `features/avatar/**`, `features/planning/**` (imports only), `features/trails/**` other than `tripRoutes.ts`, `plans/components/FinishPreparation.tsx`, `plans/api/**`, `plans/components/PlanCalendar.tsx`, `public/models/**`, Blender files, `docs/**` (lead closeout only).
- Estimated size: about 300–350 lines across ~10 files.

### 25.2 `backend-api`

None. Inspection found no gap (§6). Not invoked during implementation.

### 25.3 `ui-ux`

No implementation. Guidance only if the lead asks during the diff review. `DESIGN_SYSTEM.md` additions at closeout only if §10 proposes a reusable pattern.

### 25.4 `three-d` / Blender

Skipped. FEATURE-012 stays frozen; nothing under `features/avatar/`, `public/models/`, or any `.blend` changes.

## 26. Documentation Follow-ups (closeout; not done during specification)

- `docs/PRODUCT_REQUIREMENTS.md`: §4 journey (Past Plan → Memory), §11.1 (bridge behaviour, synthetic rule), §11.2 and §22 (014 PASS / FROZEN; freeze resumes), §12.1 (a Memory can be started from a Past Plan), §15 (Memory status unavailable), a decision-record row; §1/§22 freeze statement.
- `docs/FRONTEND_CONTEXT.md`: §1 status; §3 note that memory-service accepts synthetic trail ids on create (curated-only is UI-enforced, §5.1); §8 My Plans (bridge, index key and options), My Memories (`date` prefill, `initialDate` baseline, all-pages index), route table (`/memories/new?trail=&date=`); §9 014 done; §10 dependency line `plans → … memories (useOwnerMemoryIndex, MemorySummary type)`; §13 (unknown / error never "no Memory").
- `CLAUDE.md`: roadmap (001–014 PASS / FROZEN, no FEATURE-015, freeze resumed; final regression next, run separately).
- `.claude/agents/qa.md` needs no change (its Full QA line already names FEATURE-014).
- Checkpoint `.claude/state/features/014-plan-memory-bridge.md` and the implementation record in this spec.

## 27. Final Product Decisions

| Q | Question | Decision |
|---|---|---|
| Q1 | Backend change | **None** (D-B1) |
| Q2 | Plan field / status / FK / relationship table | **None** (D1) |
| Q3 | Matching identity | Owner + lowercased `trailId` + exact `tripDate`, not deleted (§7) |
| Q4 | Eligible Plans | `tripDate < today`, trail `ready`, not synthetic (§8–§9) |
| Q5 | Today | Upcoming, no bridge |
| Q6 | Synthetic Past Plans | No bridge, no copy (D4) |
| Q7 | Placement | Selected Past Plan's inline detail only (§10) |
| Q8 | Labels | **Add memory** / **View memory** in the page's sentence case (U2) |
| Q9 | PRIVATE / PUBLIC | Both count (D7) |
| Q10 | Detection source | Strict all-pages owner read, one per page mount, key `["memories","mine",subject,"all"]` (§8) |
| Q11 | Multiple matches | Allowed; View opens the most recently created (server order) (D-M1) |
| Q12 | Unknown state | Checking, no CTA (§8 rule 6) |
| Q13 | Error / incomplete | **Memory status is unavailable.** + Try again; never Add (§8 rules 4–5) |
| Q14 | Trail gone / failed / loading | No bridge (D12, D-T1) |
| Q15 | Create route | `/memories/new?trail=<id>&date=<YYYY-MM-DD>` (D-R1) |
| Q16 | Prefills editable | Yes, both (D9) |
| Q17 | Invalid `date` param | Ignored silently; existing validation (§11) |
| Q18 | Create success | FEATURE-009 unchanged (D13) |
| Q19 | View route | `/memories/<id>` owner detail (§12) |
| Q20 | Return to `/plans` | Browser Back; no return parameters (D16, U6) |
| Q21 | Calendar / rows | Unchanged (D15) |
| Q22 | Plan ↔ Memory deletion | Independent, no cascade (D14) |
| Q23 | New dependency | **No** |

## 28. Out of Scope

Plan status changes, COMPLETED / DONE; Memory auto-creation; AI recap; video generation; photo montage; social features, ratings, comments; notifications, reminders; Calendar redesign or Memory marks; Plan editing; Memory editor or detail redesign; Community redesign; a Plan-specific Memory route or editor; return-to-Plans parameters; a backend filter endpoint; a uniqueness rule for Memories; a server-side curated-only rule for Memory creation; 3D, animation, Blender; FEATURE-015.

## 29. Blockers / Approval Items

| Id | Item | Lead recommendation |
|---|---|---|
| **U1** | Approve this specification, decisions D1–D17, D-B1, D-M1, D-C1, D-R1, D-T1, and Q1–Q23, with no backend change | Approve |
| U2 | **Label case.** The prompt writes "Add Memory" / "View Memory"; the page's actions are sentence case (View trail, Review gear, Delete plan), PRD §11.2 writes **Add memory**, Trail Detail says **Add a memory**, and 009's incomplete phase says **View memory**. Use **Add memory** / **View memory** (§10). Also: the `view` state carries the line PM2 "You kept a memory of this trip." above **View memory** (§10.2, §10.11-5); alternative is the bare control | Approve sentence case and PM2 |
| U3 | Minimal edits inside frozen FEATURE-009 / FEATURE-004 code: the `date` prefill with its dirty baseline in `MemoryEditorScreen` / `MemoryEditor`, the new strict all-pages read and index hook in `memories`, and the optional `tripDate` + `memoryDetailLocation` in `trails/tripRoutes.ts`. Existing behaviour preserved (AC-33) | Approve |
| U4 | Supersede 013 AC-22 and the Memory clause of 013 AC-14 / §10.4 for curated Past Plans only (§3) | Approve |
| U5 | Accepted limitations: (a) above 50 Memories, offset paging can mis-state a Plan if the owner creates / deletes / re-dates a Memory in another tab during the read, until the next refetch (no data or privacy effect; worst case a duplicate Memory, which the backend allows); (b) more than 500 Memories → the bridge shows "unavailable" (no partial result); (c) the server accepts synthetic trail ids for Memories (UI-enforced curated rule; documented, not changed); (d) a hand-edited `trail` / `date` in the URL is only a prefill | Accept |
| U6 | Return navigation: browser Back from the Memory detail returns to `/plans?plan=<id>`; the editor's and detail's own back links still go to `/memories`; no `returnTo` | Approve |
| U7 | Lean QA uses browser-clock emulation for Past Plans and request interception for the trail-404 / failure and Memory-failure cases; **no DB injection** | Approve |

**No blockers.** With U1–U7 approved, FEATURE-014 is ready for implementation under `/feature-cycle 014-plan-memory-bridge`. After it is implemented, accepted, and frozen: FEATURE-001 through FEATURE-014 PASS / FROZEN, no FEATURE-015, the feature freeze resumes, and the final project regression runs separately (not part of this feature).

### 29.1 Approval record (2026-10-20)

The user approved FEATURE-014: U1 (spec and decisions; no backend, schema, Plan field or status, relationship table); U2 (sentence case **Add memory** / **View memory**; PM1 "How was your trip?" for `add`; PM2 "You kept a memory of this trip." above View memory for `view`; no celebratory, social, or gamified copy); U3 (the minimum extensions inside FEATURE-009 / FEATURE-004 code: optional `date` on the create route helper, valid-date prefill parsing, the prefilled date in the initial dirty baseline, a minimal route helper; no redesign, restructuring, or broad cleanup; FEATURE-004 behaviour unchanged); U4 (013's "no Memory text" rule superseded only for a selected Past Plan on a curated trail that resolved successfully; Upcoming, synthetic Past, and the calendar unchanged); U5 (the offset-paging window above one page accepted; no backend endpoint; **unknown is never "no Memory"**: malformed item, instability after the one restart, more than 10 pages, request failure, or any incomplete read → unknown / error → no Add memory, local Try again); U6; U7.

**Amendment A1 — dependency direction** (recorded in §21): `plans → memories` only; `features/memories/**` never imports `features/plans/**`; a generic helper moves to an existing neutral location only if needed; no new abstraction layer. Also clarified in §8: the index read runs only when at least one potentially eligible Past Plan exists; no refetch on focus or reconnect; one strict read per `/plans` visit.

Workflow: Recover → Scope → `frontend` → lead diff review → Lean QA (not Full) → **stop at the product gate**. `backend-api` only on an unexpected contract contradiction (stop and report; no endpoint); `ui-ux` design closed (§10, §10.11); `three-d` / Blender skipped.

The specification is **frozen** from this point; changes go through the lead as recorded amendments.

## 30. Implementation Record (2026-10-20)

Cycle: Recover → Scope → `frontend` → lead diff review → Lean QA (run 1) → repair 1 → Targeted QA → product gate (accepted 2026-10-20). `backend-api`, `ui-ux`, `three-d`, Blender: SKIPPED in implementation. Checkpoint: `.claude/state/features/014-plan-memory-bridge.md`.

- **Frontend** (11 files, all within §25.1): new `plans/model/planMemory.ts`, `plans/components/PlanMemoryBridge.tsx`; edited `plans/components/MyPlansScreen.tsx`, `PlanEntry.tsx`, `myPlansContent.ts`, `my-plans.css`; `memories/api/memories.ts` (`requestAllMemories`, strict page reader, `MemoryListIncompleteError`), `memories/hooks/memoryQueries.ts` (`ownerMemoryIndexKey`, `useOwnerMemoryIndex`), `memories/components/MemoryEditorScreen.tsx` (`date`), `memories/components/MemoryEditor.tsx` (`preselectDate`, `initialDate` baseline); `trails/tripRoutes.ts` (`newMemoryLocation(trailId, tripDate?)`, `memoryDetailLocation`). Dependency direction `plans → memories` only (A1), verified by grep. Build and lint exit 0. No backend, schema, `vite.config.ts`, or dependency change.
- **Accepted deviations:** D-I1 (malformed item / incomplete read use the existing failure kind `unusable`; spec said `invalid`, which does not exist); D-I2 (an errored index refetching without Try again shows `checking`; only a Try-again refetch shows the working unavailable row; never Add).
- **Lean QA run 1:** every P0 run PASS; **AC-30 (P1) FAIL**: Try again after a failed first read fell to `checking` and focus dropped to the body (TanStack v5 resets a no-data errored query to pending during refetch).
- **Repair 1 (frontend):** `memoryIndexState()` checks `retrying && isFetching` before `isError`. **Targeted QA PASS:** the working state keeps focus and shows "Trying again…" (`aria-disabled`); a second failure keeps focus and re-announces PM4; success moves focus to Add memory; D-I2 page entry shows only checking; AC-15 checking → view with no Add flash.
- QA tooling: Playwright fallback (the QA agent had no Chrome DevTools MCP tools). No DB injection; Past Plans by browser-clock emulation, trail-404 / failure and Memory failure by request interception (U7).

### 30.1 Product gate (2026-10-20)

**Accepted** by the user: FEATURE-014 PASS / FROZEN; Lean QA PASS; repair cycles 1/2; the AC-30 repair accepted as is.

- **Final behaviour:** a selected Past Plan (`tripDate < today`) on a curated trail that resolved shows **How was your trip?** + **Add memory** (no match) or **You kept a memory of this trip.** + **View memory** (≥ 1 match). Today and future Plans, synthetic Past Plans, and trail unavailable / loading / failed show no bridge. Match = authenticated owner + lowercased `trailId` + exact `tripDate` + not deleted; PRIVATE and PUBLIC both count; several matches → the first in server order (`tripDate DESC, createdAt DESC, id DESC`), i.e. the most recently created (browser check deferred).
- **Verified in the browser:** AC-01–AC-11, AC-13–AC-22, AC-25, AC-28 (focus / reconnect part), AC-30 (after repair), AC-32; indirectly AC-31 and AC-38 (1920). PRIVATE → View memory after Back without a hard reload; PUBLIC also View memory; View memory opens the correct owner detail; delete independence both ways (Memory delete → Add memory again; Plan delete → Memory kept); account isolation A → B in one tab; calendar and collapsed rows unchanged; network: one owner `size=50` read per visit, none without Past Plans, no `/public`, `POST` only on Save.
- **Detection architecture:** strict all-pages owner read, key `["memories","mine",subject,"all"]`, ≤ 10 pages (500 Memories), one restart on unstable paging, malformed item / instability / overflow / request failure → unknown or error, never "no Memory"; no N+1, no polling, no focus or reconnect refetch.
- **Backend / domain:** no backend or schema change; `Plan.status` still `READY` only; no `Plan.memoryId`, relationship table, cascade, or `hasMemory`.
- **Accepted limitations (final-regression observations):** (A) above one page of Memories, a change in another tab during offset paging can be missed until the next visit; (B) above 500 Memories the bridge shows "unavailable"; (C) the backend accepts synthetic trail ids for Memories, curated eligibility is enforced by the frontend; (D) editable trail and date mean a Memory saved with other values no longer matches the originating Plan (intended); (E) returning from a Memory may re-request trail details (013 behaviour, not a 014 defect). Also observed: an unattributed "400 (Bad Request)" console resource error during Keycloak registration runs; no app flow failed.
- **Deferred / not run (not passed; to Final Full Regression where applicable):** AC-12 (code review only), AC-24, AC-26, AC-27, AC-29, AC-33–AC-38, multiple-match browser verification, real screen reader, Safari, physical phones, forced-colours mode.
- **Documentation closeout (2026-10-20):** PRD (§1, §4, §11.1, §11.2, §12.1, §15, §22), `FRONTEND_CONTEXT.md` (header, §1, §3, §8, §9, §10, §12, §13), `CLAUDE.md` roadmap. `DESIGN_SYSTEM.md` unchanged (the §10.9 notes describe no pattern needed elsewhere yet).

FEATURE-001 through FEATURE-014 are PASS / FROZEN. There is no FEATURE-015. The feature freeze is active; the next phase is a Final Full Regression, run separately, then approved final polish if necessary, demo preparation, and deployment preparation.
