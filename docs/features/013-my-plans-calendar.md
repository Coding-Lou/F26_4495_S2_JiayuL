# FEATURE-013 — My Plans & Calendar

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-20).** Product gate accepted by the user 2026-10-20. Lean QA PASS; repair cycles 0/2; build and lint PASS; no backend change. Record in §30–§30.1. FEATURE-014 is next and not started. Earlier: **APPROVED — FROZEN FOR IMPLEMENTATION (2026-10-20)** with U1–U8 (U8 narrowed) and amendment A1 pagination safety (§29.1) |
| Date | 2026-10-20 |
| Roadmap | Third of the approved extension: FEATURE-011 (PASS / FROZEN) → FEATURE-012 (PASS / FROZEN) → **FEATURE-013** → FEATURE-014 Plan → Memory Bridge (final product feature). There is no FEATURE-015 |
| Route | New authenticated route `/plans` (one route; no `/plans/:id`) |
| Backend | None planned (§6). `plan-service` and `trail-service` consumed as they are |
| Depends on | FEATURE-002 (session, `ProtectedRoute`, return destination), FEATURE-004 (Trail Detail, Trip Preparation routes, trail detail query), FEATURE-007 / 009 (collection and journal patterns, header links), FEATURE-011 (Plan API), FEATURE-012 (Continue) |
| Followed by | FEATURE-014 (past Plan → Add memory) |
| Feature cycle (proposed) | Recover → Scope → `frontend` → lead diff review → Lean QA → product gate → closeout. `backend-api: SKIP` (inspection found no gap, §6), `ui-ux`: design done in §10, implementation guidance only if the lead asks, `three-d: SKIP`, Blender: SKIP |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (§2.1, §4, §11, §14, §15, §17) → `docs/FRONTEND_CONTEXT.md` (§3, §4, §7, §8, §9, §10, §13) → `docs/DESIGN_SYSTEM.md` (§13, §18, §27, §36, §37) → specs 004, 007, 009, 011, 012 |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–4, 10, 24, 28, 29 |
| `backend-api` | 5.1, 6 |
| `frontend` | 5.2, 7–9, 11–23, 26 |
| `ui-ux` | 10 |
| `qa` | 24, 25 |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`, "FC §x" is `docs/FRONTEND_CONTEXT.md`, "DS §x" is `docs/DESIGN_SYSTEM.md`, "011 §x" and so on are those feature specifications; a bare "§x" is this document. Decisions are `D…`, acceptance criteria `AC-…`, approval items `U…`, copy ids `PL…`.

---

## 1. Feature Summary

FEATURE-011 saves a Plan when the user presses **Finish preparation**, and FEATURE-012 celebrates it, but nothing shows the Plans afterwards. FEATURE-013 adds the user's personal Plan destination.

- A new authenticated page, **My Plans** at `/plans`, reached from a new **Plans** header link, from FEATURE-012's **Continue**, and directly.
- The left of the page lists the user's Plans as one collection, split by date into **Upcoming** (today and later, nearest first) and **Past** (most recent first). The right shows a **monthly calendar** that marks the days with Plans, with a count where a day has several.
- Selecting a Plan expands it in place, shows its month and day in the calendar, and offers **View trail**, **Review gear** (Upcoming only), and **Delete plan** (two-step confirmation). Selecting a calendar day selects its Plan, or narrows the list to that day's Plans.
- Trail facts come from the existing public trail detail read, cached per trail. Synthetic and curated trails are shown alike.
- **Continue** after "Ready for the trail." now goes to `/plans` instead of `/home`.

No backend change, no new Plan field or status, no dependency, no 3D. The Memory bridge is FEATURE-014.

## 2. Product Problem

```text
Today:  … → Gear Studio → Finish preparation → Plan saved → Ready for the trail. → Continue → /home (the Plan is out of sight)
After:  … → Gear Studio → Finish preparation → Plan saved → Ready for the trail. → Continue → My Plans → Calendar → Go in real life
```

Plans are persisted, private, and idempotent (011), yet once the user leaves the Studio they cannot see them. They cannot answer: what trips have I planned, what is next, which dates are taken, which trail is on a date, which Plans are past, how do I reopen the trail or my preparation, and how do I remove a Plan I no longer intend to do. The only way to "find" a Plan today is to reopen the same Studio address, which shows Finish preparation again.

## 3. Goal

1. One authenticated `/plans` page and a **Plans** navigation entry (§7).
2. The owner's Plans read whole from the existing list endpoint, with no backend change (§6, §8).
3. Trail facts hydrated from the existing cached trail detail read (§9).
4. Upcoming / Past derived from the trip date against the viewer's local today (§11).
5. A monthly calendar linked both ways with the list, multiple Plans per day included (§13, §14).
6. Lightweight inline Plan detail with View trail, Review gear, Delete plan (§12, §15).
7. FEATURE-012's Continue lands on `/plans` (§17).
8. Per-user isolation of cached Plan data (§18) and calendar-date correctness without time-zone shifts (§19).

FEATURE-013 is not a scheduler, not a weather or readiness dashboard, not a Plan editor, and not the Memory bridge.

## 4. 011 / 012 / 013 / 014 Boundary

| Feature | Owns | FEATURE-013 must not |
|---|---|---|
| **011 Plan Foundation** (FROZEN) | `plan-service`, the Plan contract, `features/plans` API layer, Finish preparation | change the Plan model, statuses, schema, create behaviour, or `useCreatePlan`. Allowed: an additive optional `cancel` argument on `planRequest` (U3) |
| **012 Ready-to-Go** (FROZEN) | The `ready_to_go` clip, its timing and fallbacks, "Ready for the trail." | change anything but the Continue destination value (§17) |
| **013 My Plans & Calendar** | `/plans`, the Plans header link, list / delete consumers, Upcoming / Past, the monthly calendar, inline Plan detail, delete UI, Continue → `/plans` | — |
| **014 Plan → Memory Bridge** | Past Plan → **Add memory** with trail and date preselected; recognising a Memory made for a Plan; how past synthetic Plans behave there | add any Memory button, prompt ("How was your trip?"), indicator, Memory request, or Memory messaging on synthetic Plans |

Invariants carried forward: D-INV-1 (completion only after a confirmed save) is untouched; D-INV-2 is resolved here (the temporary `/home` destination becomes `/plans`).

---

## 5. Current Implementation Inspection

### 5.1 Backend inspection (owner: `backend-api`)

<!-- BACKEND-API: BEGIN — backend-api writes only between these markers -->
Read-only inspection of the working tree, 2026-10-20 (no code run). `P/` = `Project/Backend/plan-service/src/main/java/com/jay/outdoor/plan/`, `PT/` = `plan-service/src/test/java/com/jay/outdoor/plan/integration/`, `T/` = `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/`.

| # | Finding | Source |
|---|---|---|
| B1 | `GET /api/plans` takes `page` (default 0) and `size` (default 20); owner from the token only | `P/controller/PlanController.java:38-45` |
| B2 | `page < 0`, `size < 1`, `size > 50`, `page × size > Integer.MAX_VALUE` → `400 VALIDATION_ERROR` with `errors[{field,message}]`; non-integer → `400 VALIDATION_ERROR` without `errors` | `P/service/PlanPaging.java:11-35`; `PT/PlanReadDeleteIntegrationTest.java:119-131` |
| B3 | A page beyond the last is `200` with `items: []` and the real `totalItems` / `totalPages` | `PT/PlanReadDeleteIntegrationTest.java:115-117` |
| B4 | Envelope `PlanPage { items, page, size, totalItems (long), totalPages (int) }`, built from Spring's `Page`, not Spring's own JSON | `P/dto/PlanPage.java:8-24` |
| B5 | `PlanResponse { id, trailId, tripDate, status, createdAt, updatedAt }`; no owner, no `deleted`; same record for create, list, detail | `P/dto/PlanResponse.java:17-35` |
| B6 | `tripDate` is `LocalDate` (DB `DATE`), serialized `"YYYY-MM-DD"`, no time or zone | `P/entity/Plan.java:33-34`; `V1__create_plan_tables.sql:5`; `PT/PlanCreateIntegrationTest.java:53` |
| B7 | `createdAt` / `updatedAt`: `OffsetDateTime` normalized to UTC, ISO-8601 ending in `Z`, up to microsecond fraction | `P/dto/PlanResponse.java:37-39`; `P/entity/Plan.java:79-82`; `PT/PlanCreateIntegrationTest.java:60` |
| B8 | `status` is always `READY` (DB check constraint) | `V1__create_plan_tables.sql:6,11` |
| B9 | Order `tripDate ASC, createdAt ASC, id ASC`, a total order (id is unique); backed by the partial index on `(owner_subject, trip_date, created_at, id) WHERE deleted = false` | `P/service/PlanPaging.java:14-18`; `V1__create_plan_tables.sql:19-23`; `PT/PlanReadDeleteIntegrationTest.java:72` |
| B10 | List = owner + `deleted = false`, past and upcoming alike, no trail-service call; offset paging (`PageRequest`), no snapshot between page reads | `P/service/PlanService.java:99-111`; `P/repository/PlanRepository.java:25` |
| B11 | `GET /api/plans/{id}` returns the same `PlanResponse` as the list item; no trail call | `P/service/PlanService.java:113-116` |
| B12 | `DELETE /api/plans/{id}` → `204`, soft delete (`deleted = true`, `updatedAt` bumped), only the plans row; a second delete, a foreign id, or an unknown id → `404 PLAN_NOT_FOUND`, foreign row unchanged | `P/controller/PlanController.java:68-75`; `P/service/PlanService.java:118-135`; `P/entity/Plan.java:73-77`; `PT/PlanReadDeleteIntegrationTest.java:188-233` |
| B13 | Non-UUID id → `400 VALIDATION_ERROR`; `PUT`/`PATCH` → `405`; unknown path → `404 NOT_FOUND` | `PT/PlanReadDeleteIntegrationTest.java:173-183,238-252` |
| B14 | Every path authenticated; missing / invalid token or a token without `sub` → `401 AUTHENTICATION_REQUIRED`, before any controller | `P/config/SecurityConfig.java:35-58`; `P/security/SubjectRequiredFilter.java:39-48`; `P/security/OwnerSubject.java:12-24`; `PT/PlanSecurityIntegrationTest.java:59-86` |
| B15 | Server clock (`Clock.systemDefaultZone()`) is used only by the create date rule; list, read, delete never read it | `P/config/ClockConfig.java:13-15`; `P/service/PlanFieldRules.java:27` |
| B16 | `GET /api/trails/{uuid}` is public (regex matcher, GET only); found → `200 TrailDetailResponse`, missing or `deleted = true` → `404` with an **empty body** (no ProblemDetail) | `T/config/SecurityConfig.java:52-56`; `T/controller/TrailController.java:98-105`; `T/repository/TrailRepository.java:178-185`; `trail-service/.../TrailControllerTest.java:44` |
| B17 | Detail returns both populations (`DEMO_SEED` and `SYNTHETIC_DEMO`) | `T/repository/TrailRepository.java:93-97`; `trail-service/.../TrailCatalogVisibilityTest.java:82-87` |
| B18 | `TrailDetailResponse { id, name, description, difficulty (String), distanceKm (Double), elevationGainM (Integer), estimatedDurationMin (Integer), latitude, longitude, route (GeoJSON or null), source, coverImageUrl (null), scenery[], baselineGearRequirements[] }`; wrapper types, so numbers may be null | `T/dto/TrailDetailResponse.java:9-24` |
| B19 | `route` is NULL for every seeded trail (curated and synthetic), so a detail payload is a few hundred bytes; each call is three small indexed queries (detail, scenery, gear) | `trail-service/src/main/resources/db/migration/V2__seed_demo_trails.sql:10,24` (every row `NULL`); `V8__seed_synthetic_planner_trails.sql:334,364`; no later migration sets `route`; `T/service/TrailService.java:195-225` |
| B20 | No rate limiting or batch endpoint in trail-service | grep of `trail-service/` for rate-limit libraries: none |

**Open for lead** (draft points that need a correction or a decision; sections not edited):

1. **§8 D4, de-duplication.** Offset paging is not a snapshot (B10). A delete between page reads shifts later rows **earlier**, so the next page *skips* a Plan; de-duplicating by `id` does not catch that (it only catches a create shifting rows later). With ≤ 50 Plans (one request) this cannot happen. Proposed wording: on a multi-page read, if `totalItems` differs between the first and a later page, restart from page 0 once; then de-duplicate by `id`. No backend change.
2. **§16 "Trail gone (404)".** trail-service's 404 has no body (B16): the frontend must classify on status alone, not on a `ProblemDetail` `code`. A trail-service `5xx` or network failure is the "lookup failed" row.
3. **§12 D8 / §9 facts.** `distanceKm`, `elevationGainM`, `estimatedDurationMin` are nullable wrappers (B18); the entry must omit a missing fact, never show 0.
4. **§12 Review gear on today's Plan.** Pack validates `tripDate ≥` the recommendation-service's own today. Only if the viewer's local date is behind the server's could a client-Upcoming Plan be refused by pack (`400` → back to Trip Preparation, the existing behaviour). Not reachable in the single-machine dev setup; record as a known limitation, no change.
<!-- BACKEND-API: END -->

### 5.2 Frontend inspection and proposed architecture (owner: `frontend`)

<!-- FRONTEND: BEGIN — frontend writes only between these markers -->
Read-only inspection by `frontend` on 2026-10-20 against the working tree (paths under `Project/Frontend/src/`). Draft decisions are marked **Confirmed** or **Correction**. Nothing under `Project/` was changed.

| Area | Finding | Source |
|---|---|---|
| F1. Router, lazy routes | **Confirmed (D1).** Protected routes are the children of one `ProtectedRoute` element. `/gear` and `/memories` are plain children backed by lazy pages (`lazyPage` + `Suspense` with the `ink` `ShellFallback`), and each page wraps a feature screen. `/plans` is one more child, `PlansRoute`, plus `pages/PlansPage.tsx`. `*` still catches `/plans/<anything>` as Not Found | `app/router/routes.tsx:39–72`; `pages/LazyRoutes.tsx:12–17, 46–48, 82–96`; `pages/GearPage.tsx`, `MemoriesPage.tsx` |
| F2. Shell | Screens render `TripShell` themselves with a scoping class and `TripAnnouncer` (`MyGearScreen` uses `className="my-gear"`). `TripShell` makes `main` inert while signing out | `features/gear/components/MyGearScreen.tsx:67–78`; `components/layout/TripShell.tsx:28–55` |
| F3. Navigation | **Confirmed (D3).** Neither header has a Planner link: the brand links to `/home`. `TripHeader` marks Gear and Memories current with `useMatch({ end: true })`, in both the wide row and `TripMenu`, which takes `onGear`/`onMemories` props. `HomeHeader` marks nothing current (nothing is current on `/home`) and has New Plan after the brand. The minimal change is a `Plans` link before Gear in four places (two rows, two menus), with `useMatch("/plans", end)` in `TripHeader` only | `components/layout/TripHeader.tsx:12–27, 72–102, 107–189`; `features/home/HomeHeader.tsx:56–78, 138–145` |
| F4. Header width 768–1023 px | The links sit edge to edge with no gap, each with 12 px side padding (Plans adds about 60 px). The identity is the only part that shrinks: `min-width: 0`, ellipsis, maximum 160 px. My estimate at 768 px: the trip header leaves about 185 px for the identity, so no truncation. The **Home** header also carries New Plan, which leaves about 50–60 px, so the identity is cut to a few characters (about 120 px today). The layout does not break; the effect is cosmetic. Needs a check at 768 (open item O5) | `trip-shell.css:54–59, 291–298, 338–352, 377–379, 630–639`; `auth/auth.css:110–117`; `home/home.css:271–297` |
| F5. Return destination | **Confirmed (D2).** `isProtectedPath` is an allowlist with `/home` and `/gear` as exact matches, so add `path === "/plans"`. No other auth change is needed: `ClosedRoute` passes the **pathname only**, so a signed-out `/plans?plan=<id>` returns to `/plans` with no selection (acceptable, O9) | `features/auth/returnDestination.ts:37–45`; `ProtectedRoute.tsx:45–51`; `authSession.ts:691–705` |
| F6. Plan API layer | `planRequest(path, init)` gives a 20 s limit and a `PlanRequestOutcome`, but it **replaces any caller signal** with its own controller, so a query's `AbortSignal` cannot reach it today. `memoryRequest` has the pattern for this: an optional `cancel` signal linked to its controller. `readPlan` already validates one `PlanResponse`, and `PlanPage` is typed. `PlanRequestError`/`failureOf` map no-session, timeout→`unconfirmed`, network/5xx→`unavailable`, other→`unexpected`; these cover list and delete without new kinds (`trail-gone`/`invalid-date` never arise there). `useCreatePlan` writes **no cache** by design. **Confirmed:** no `getPlan` is needed | `features/plans/api/planRequest.ts:37–87`; `api/plans.ts:13–70, 99–118`; `types/plan.ts:22–32, 51–63`; `hooks/useCreatePlan.ts:4–17`; `memories/api/memoryRequest.ts:35–110` |
| F7. Query conventions | The subject comes from `getAuthenticatedSubject()` at render. Keys are `["memories","mine",subject]` and `["gear","items",subject]`; with no subject the query is disabled and its `queryFn` throws `no-session`. Policy: retry once only on `unavailable`, `networkMode: "always"`, no reconnect refetch. Gear uses `refetchOnMount: "always"`. Defaults are `retry: 1` and `staleTime: 30 s`. Sign-out and expiry call `queryClient.clear()`. Delete: gear uses `useMutation` (`retry: false`, `networkMode: "always"`), treats 2xx and 404 as success, then `setQueryData(filter)` + `invalidateQueries`. Memories do the same through a plain async function | `memories/hooks/memoryQueries.ts:31–69, 89–119`; `gear/hooks/useGearItems.ts:19–50`; `useGearItemChanges.ts:56–72`; `gear/api/gearItems.ts:137–156`; `memories/api/memories.ts:191–205`; `app/providers/queryClient.ts:3–10`; `AppProviders.tsx:10`; `auth/authSession.ts:467–475` |
| F8. Trail hydration | **Confirmed (D5).** `trailDetailQueryKey(id)` = `["trails","detail",id lower]`, used with a tokenless `requestTrailDetail(id, signal)`. The policy is retry once on `unavailable`, `networkMode: "always"`, no focus or reconnect refetch, and the default 30 s stale time. The 404 is classified on **status alone** as `not-found`; `refused` (400/401/403/unreadable), `timeout`, and `unavailable` are the "lookup failed" row. Every `TrailDetail` field is nullable (name null → `trailContent.unnamed`). `useQueries` is not used anywhere yet, but it fits: same key, same options | `trails/hooks/useTrailDetail.ts:5–35`; `trails/api/trailDetail.ts:33–94`; `trails/types/trail.ts:98–107`; `trails/content.ts:31, 109–120` |
| F9. Fact labels | `difficultyLabel`, `formatDistance`, `formatElevationGain`, and `formatDuration` all take `unknown` and return null for a missing value, so a missing fact is never 0. `isSampleTrailSource` exists | `planning/presentation.ts:38–87`; `trails/content.ts:109` |
| F10. Dates | **Confirmed (D21).** `toLocalDate` builds `new Date(y, m−1, d, 12)` (local noon) and rejects rolled-over dates; nothing parses as UTC. `todayIso`, `addDays`, `isIsoDate`, `formatTripDateShort` ("Sat, Oct 17", with the year outside the current one), and `formatTripDateLong` are exported. The month and weekday arrays and `toLocalDate` are **private**. **Correction (D8):** no formatter returns "Today"/"Tomorrow"; only `dateQuickPicks` has those labels (O1). Missing for a grid: month label, weekday headers, days-in-month, first weekday, ±1 month. Week start: all formatting is hard-coded en-US, the weekday arrays begin on Sunday, and nothing locale-dependent is used (O6). `memoryText.ts` already duplicates the month names locally, which is precedent for a plans-local helper | `planning/tripDate.ts:9–46, 57–130, 142–147`; `memories/model/memoryText.ts:35–47`; `gear/model/myGearModel.ts:49` |
| F11. Action routes | `trailDetailLocation(trailId, null)` and `tripPreparationLocation(trailId, tripDate, null)` both return `{ pathname, search }`. **Confirmed:** Trip Preparation turns a past date into its `choose-date`/`passed` view with no pack request, so Review gear is Upcoming-only | `trails/tripRoutes.ts:17–36`; `packing/components/TripPreparationScreen.tsx:118–127, 160–161` |
| F12. Continue | **Confirmed (D19).** The change is exactly one value, at `GearStudioScreen.tsx:789` (`continueTo="/home"`). The `to="/home"` at `:706` is the trail-not-found "Back to planning" link and must stay. `FinishPreparation` only renders `<Link to={continueTo}>` | `loadout/components/GearStudioScreen.tsx:700–712, 780–791`; `plans/components/FinishPreparation.tsx:33, 198` |
| F13. Reusable patterns | Two-step confirm: `RemoveConfirmation` (role group, Cancel focused on mount, Escape handled and stopped, an `aria-disabled` working state, a persistent `role="alert"` line). Its CSS is **scoped** to `.my-gear`/`.memories`, so Plans needs its own copy under `.my-plans`. Also available: the announcer (`useTripAnnouncer` + `TripAnnouncer`), `TripRetryButton tone="paper"`, the focus-after-change pattern (`focusRequest` + `scrollIntoView`), `useMediaQuery`, and the address selection write (functional `setSearchParams`, `{ replace: true }`), on which `?plan=` fits | `gear/components/GearDetail.tsx:158–258`; `my-gear.css:666–735`; `memories.css:846–940`; `layout/useTripAnnouncer.ts:21–55`; `TripRetryButton.tsx:23`; `MyGearScreen.tsx:180`; `discover/components/DiscoverSection.tsx:787–808`; `lib/useMediaQuery.ts:7` |
| F14. Dependencies | No date or calendar library is installed and none is needed. `visibilitychange` is used only by auth, the landing, and the avatar runtime | `Project/Frontend/package.json` |

**Proposed architecture** (smallest slice).

- `features/plans/api/planRequest.ts`: add an optional third argument `{ cancel?: AbortSignal }`, linked to the controller as `memoryRequest` does. `createPlan` passes nothing, so its behaviour is unchanged.
- `features/plans/api/plans.ts`: add `requestPlans(signal): Promise<{ plans: Plan[]; truncated: boolean }>`. It reads `?page=n&size=50` from n = 0 up to `min(totalPages, 10) − 1`, sequentially, de-duplicating by `id` and keeping the server order. An unreadable page **or item** fails the whole read with `unexpected` (D4, no partial collection). Add `deletePlan(id): Promise<void>`: 2xx or 404 resolves; anything else throws through `failureOf`.
- `features/plans/hooks/usePlans.ts`: `plansQueryKey(subject) = ["plans","mine",subject]`; `usePlans()` = `useQuery`, `enabled: subject !== null`, retry once on `unavailable`, `networkMode: "always"`, **`refetchOnMount: "always"`** (O2), no focus or reconnect refetch.
- `features/plans/hooks/useDeletePlan.ts`: `useMutation`, `retry: false`, `networkMode: "always"`. `onSuccess` runs `setQueryData` (filter by id) and then `invalidateQueries(plansQueryKey(subject))`.
- `features/plans/hooks/usePlanTrails.ts`: `useQueries` over the distinct lowercased `trailId`s with the trail detail options, returning `Map<id, { status: "loading" | "ready" | "gone" | "failed"; trail; refetch }>`. To keep the policy from drifting, export `trailDetailQueryOptions(id)` (`queryOptions`) from `trails/hooks/useTrailDetail.ts` and have `useTrailDetail` spread it. The edit is behaviour-preserving; the alternative is copying the options.
- `features/plans/hooks/useTodayIso.ts`: `todayIso()` in state, updated on `visibilitychange` → visible (D22), with no timer.
- `features/plans/model/planCollection.ts` (pure): `splitPlans(plans, today)` → `{ upcoming, past }`. Upcoming keeps the server order. Past uses a stable sort by `tripDate` DESC, which keeps createdAt ASC within a day (D7). Also `plansByDate(plans): Map<iso, Plan[]>` and `initialMonth(selected, upcoming, today)` (D12).
- `features/plans/model/calendarMonth.ts` (pure, integers only): `{ year, month }`, `addMonths`, `monthLabel` ("October 2026"), Sunday-first weekday short and long names, `monthCells(year, month)` → leading blanks + ISO day strings (`new Date(y, m, 0).getDate()`, `new Date(y, m − 1, 1).getDay()`). It does not import `planning/tripDate.ts` privates. Display still uses `formatTripDateShort/Long`.
- `features/plans/components/`: `MyPlansScreen.tsx` (shell, title, announcer, `?plan` and day-filter state, focus requests); `PlanSection.tsx` + `PlanEntry.tsx` (inline expand, View trail / Review gear / Delete); `PlanCalendar.tsx` (buttons only on days with Plans); `DeletePlanConfirmation.tsx` (the F13 recipe); `PlansStates.tsx` (skeleton, empty, error).
- `features/plans/myPlansContent.ts` (copy ids PL…; `content.ts` stays Finish's) and `features/plans/my-plans.css` (`@layer components`, scoped `.my-plans`).
- Outside `features/plans/`: `pages/PlansPage.tsx`; `LazyRoutes.tsx` (+`PlansRoute`); `routes.tsx` (+`{ path: "plans" }`); `TripHeader.tsx` and `HomeHeader.tsx` (Plans before Gear, row and menu); `returnDestination.ts` (`/plans`); `GearStudioScreen.tsx:789` (one value); `trails/hooks/useTrailDetail.ts` (optional options export); `types/plan.ts` (comment only).
- `?plan=<id>`: compared lowercased against the loaded list, and dropped (replace) **only after the list query succeeds** without that id, never while it is loading or failed. It is never sent to a server.

**Open for lead** (disagreements or risks in §7–§19; those sections are not edited).

- O1. D8: "Today"/"Tomorrow" are not produced by the existing formatter (F10). Either drop them or add a plans-local prefix from `today`/`addDays(today, 1)`.
- O2. D20/§17: because `useCreatePlan` writes no cache, a list cached in the last 30 s would omit the Plan just saved when Continue lands on `/plans`. The proposal is `refetchOnMount: "always"` on the list, which avoids touching frozen `useCreatePlan`. Please record it in §8/§18.
- O3. Two behaviour-preserving edits sit in frozen or shared files: the `planRequest` cancel option (FEATURE-011) and `trailDetailQueryOptions` (FEATURE-004). Approve or reject each.
- O4. FC §10 currently allows `plans → services, auth, planning/tripDate.ts, layout`. My Plans adds `plans → trails` (trail detail api/hook, `tripRoutes`, content) and `plans → planning/presentation.ts`. There is no cycle, because `trails` imports only `auth` and `planning`. FC §9's `["plans", subject, …]` should read `["plans","mine",subject]` at closeout.
- O5. Home header at 768–~900 px: the identity is cut to a few characters (F4). Accept it, or ask `ui-ux`. No header redesign is proposed.
- O6. Week start Sunday and the en-US month label match all existing formatting. `ui-ux` should confirm.
- O7. D4: offset pages can also *skip* an item when a delete happens between page reads, not only duplicate one. This is reachable only above 50 Plans, and the next refetch corrects it. Accept it.
- O8. §16 "retries when selected": implement as `refetch()` on selection when that trail query has failed with a kind other than `not-found` and is not already fetching.
- O9. A signed-out deep link `/plans?plan=<id>` loses `?plan` through sign-in (pathname-only return destination, F5). Accept it.
- O10. D13/D14: the proposal is a semantic `<table>` whose plan days are `<button>`s in tab order, with no arrow-key grid (`role="grid"` would require roving focus). `ui-ux`/lead should confirm.
- O11. Hydration volume: one public request per distinct trail, and the dev proxy is HTTP/1.1, about 6 in parallel. This is fine for the expected volume, but slow near the 500-Plan cap. No cap is proposed.
<!-- FRONTEND: END -->

## 6. Plan API Findings (owner: `backend-api`)

<!-- BACKEND-API-6: BEGIN — backend-api writes only between these markers -->
**Verdict: no backend change.** The existing contract fully supports FEATURE-013. `backend-api: SKIP` for implementation is confirmed. Sources in §5.1 (B-numbers).

**List: `GET /api/plans?page=0&size=50`** (bearer token through `authenticatedApiRequest()`):

```json
{ "items": [ { "id": "<uuid>", "trailId": "<uuid>", "tripDate": "2026-10-24", "status": "READY",
               "createdAt": "2026-10-20T17:03:12.123456Z", "updatedAt": "2026-10-20T17:03:12.123456Z" } ],
  "page": 0, "size": 50, "totalItems": 1, "totalPages": 1 }
```

- `size` max 50, default 20; 51 or 0 is `400 VALIDATION_ERROR` (B2), so the client must send `size=50`, never more. A page past the last is `200` with `items: []` (B3); with no Plans `totalPages` is `0`, so "read while `page + 1 < totalPages`" ends correctly.
- Order is `tripDate ASC, createdAt ASC, id ASC`, a total and stable order (B9). Upcoming can use it as is; Past re-sorts by `tripDate DESC` on the client (§11 D7 is consistent).
- Paging is offset-based with no snapshot (B10). Concurrent changes between page reads can skip (delete) or repeat (create) a Plan; only relevant above 50 Plans. Mitigation in §5.1 Open item 1.
- Sufficiency: Upcoming / Past, the month grid, and several Plans per date (different trails on one date are separate rows; the same trail + date is at most one active row) are all derivable from `tripDate` alone. No range, calendar, or count endpoint is needed; a range filter would only be an additive optional parameter if volume ever required it (FC §9).

**Plan detail `GET /api/plans/{id}`:** returns exactly the list item's fields (B11). The frontend has no use for it; not consumed (§8 confirmed).

**Delete `DELETE /api/plans/{id}`:** `204` no body; soft delete of that one row (B12). Missing, already deleted, or another user's Plan → `404` ProblemDetail `code: PLAN_NOT_FOUND`, so a repeated delete is `404`, not `204`. Treating `204` and `404` as "removed" (§15) is correct and safe: the id always comes from the caller's own list. No trail, gear, Memory, or other Plan data is touched; a deleted Plan no longer blocks re-creating the same trail + date (011). Other failures: `401 AUTHENTICATION_REQUIRED`, `5xx INTERNAL_SERVER_ERROR` → the inline error of §15.

**`tripDate`:** a `LocalDate`, wire `"YYYY-MM-DD"` with no time or zone (B6). The server's clock is used only at create (`tripDate ≥` server today, B15); list and delete never reclassify or filter by date, so past Plans are returned and Upcoming / Past is purely the client's local-date comparison (§11, §19 consistent). Timestamps are UTC instants (B7) and are not needed by the UI.

**Security:** every endpoint requires a token with a non-blank `sub`; otherwise `401 AUTHENTICATION_REQUIRED` before any query (B14). Every query filters by the token's `sub` and `deleted = false` in SQL (B10, B12); no endpoint accepts an owner. A guessed id of another user is the same `404` as an unknown id, and a foreign delete changes nothing. The frontend cannot cause cross-user leakage through these endpoints; client-side isolation is the subject-bound key and the cache clear of §18.

**Trail hydration `GET /api/trails/{uuid}`** (tokenless, `publicRequest`): `200 TrailDetailResponse` (fields in B18) for curated and synthetic trails (B17); `404` with an empty body for a missing or soft-deleted trail (B16) → "Trail unavailable". Use `name`, `difficulty` (`EASY | MODERATE | HARD`), `distanceKm`, `estimatedDurationMin`, optional `elevationGainM`, `source`; numbers are nullable. `route` is null for every seeded trail (B19) and `coverImageUrl` is null, so a payload is small. No rate limit or batch endpoint exists (B20); one cached call per distinct `trailId` for a handful of Plans is appropriate and reuses the Trail Detail cache entry.
<!-- BACKEND-API-6: END -->

---

## 7. Route / Navigation

- **D1. One authenticated route, `/plans`.** Lazy route chunk wrapped in the existing `ProtectedRoute`, inside the trip shell (`TripShell` + `TripHeader`), as `/gear` and `/memories`. No `/plans/:id`, no nested routes.
- **D2. Signed-out `/plans`** behaves as every protected route: the user is sent to `/` with the sign-in gate, and `/plans` is saved as the return destination, so sign-in lands on `/plans`. This needs `/plans` added to the return-destination allowlist (`returnDestination.ts`); no other auth change.
- **D3. Navigation entry "Plans".** Added to the authenticated header (both `TripHeader` and `HomeHeader`, wide row and the narrow Menu) immediately **before Gear**. The header has no "Planner" link today: the brand links to `/home` and is the Planner entry (the Home header adds New Plan). The resulting order is brand (Planner) · [New Plan on `/home`] · **Plans** · Gear · Memories · account, which is the PRD §14 order without adding a "Planner" link or redesigning the header. "Plans" carries `aria-current="page"` on `/plans` exactly (DS §36.8).
- Reached from: the header link, FEATURE-012's **Continue** (§17), and a direct authenticated `/plans`. All three render the same page.

## 8. Data Loading Architecture

- **D4. The existing owner list, read whole.** `GET /api/plans?page=0&size=50` (the contract maximum). If `totalPages > 1`, the same query function reads the following pages in order until the last, then returns one flat list. Pagination is never visible to the user: the page presents one collection.
- Expected volume: a handful of Plans per user (single digits to low tens). One request in normal use.
- **Safety window and A1 (approved amendment).** With `totalPages <= 10` every page is read normally. With `totalPages > 10` (more than 500 Plans) the read **does not stop at page 10 and render what it has**: it ends in a controlled **overflow** state (§16, PL45) saying the complete collection could not be loaded, with no list and no calendar. The same applies if the collection is still inconsistent after the single restart below. Partial data is never presented as complete. This is a correctness guard, not a feature; real and demo counts are far below it.
- **Offset consistency (B10, §5.1 open item 1, O7).** On a multi-page read, if `totalItems` or `totalPages` differs between the first page and a later one, the read restarts from page 0 once; items are then de-duplicated by `id`. If the metadata changes again during the restarted read, the query fails into the overflow / incomplete state (A1), never a partial list. Reachable only above 50 Plans.
- A failure on any page, or an unreadable page or item, fails the whole query (the page shows its error state, §16): a partial collection would make the calendar claim dates are free.
- **D4a. The list refetches whenever `/plans` mounts** (`refetchOnMount: "always"`, the gear precedent; O2). `useCreatePlan` writes no cache by design (011 §13.3) and stays frozen, so this is what guarantees that **Continue** lands on a list containing the Plan just saved. No focus or reconnect refetch.
- Request cancellation: `planRequest` gains an optional `cancel` signal linked to its controller (the `memoryRequest` pattern, F6) so the list query's `AbortSignal` reaches it; `createPlan` passes none and is unchanged (U3).
- No `GET /api/plans/{id}` consumer (§28 Q19): the list returns exactly the detail's fields (B11, 011 D11).
- No calendar-specific or range endpoint; the calendar is derived from the list on the client.

## 9. Trail Hydration

- **D5. One cached trail detail query per distinct `trailId`**, using the existing `GET /api/trails/{uuid}` (public, tokenless) with the existing key `trailDetailQueryKey(trailId)` = `["trails", "detail", <id lower>]`, so Trail Detail and Trip Preparation reuse the result after **View trail** / **Review gear**. Run with `useQueries` over the distinct ids with the same options as `useTrailDetail`, shared through an exported `trailDetailQueryOptions(id)` that `useTrailDetail` spreads (behaviour-preserving, U3).
- Classification: `200` → ready; `404` (empty body, B16) → **gone**, on the status alone; any other failure (`refused`, `timeout`, `unavailable`) → **failed**. A failed (not gone) lookup is refetched once when its Plan is selected, if not already fetching (O8).
- Every fact is nullable (B18, F9): a missing distance, duration, elevation, or difficulty is omitted, never shown as 0 (the `planning/presentation.ts` formatters already return null).
- No trail data in plan-service; no batch trail endpoint; no `GET /api/trails` catalog load (it covers curated trails only and would not hydrate synthetic Plans).
- Fields used: `name`, `difficulty`, `distanceKm`, `estimatedDurationMin`, `elevationGainM` (optional), `source` (only to know a trail is sample data; no Memory messaging).

## 10. My Plans Visual and Interaction Design (owner: `ui-ux`)

<!-- UI-UX: BEGIN — ui-ux writes only between these markers -->
All sizes px; colours DS §8; "`ink` 0.12" = `ink` at 12 % (the shell's `--trip-ink-*` family). Tiers as 007 §21: **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279, **T** 768–1023, **N** <768 (validated to 320). Composed at 1440×900, checked at 1920×1080, 1366×768, 1024×768; track math assumes a classic 15px scrollbar (DS §36.3).

**Design idea in one line: a trip itinerary written on warm paper — dated entries read top to bottom like a logbook, with one small month calendar beside them as the map of when.** Not §36 slots (no artwork, plates, or cards) and not §37 journal (no photos, spine, or long text): Plans are dates and decisions, so the page is typographic. No counts summary, percentages, readiness, weather, badges, or chips.

### 10.1 Page surface and title block

| Part | Specification |
|---|---|
| Shell | `TripShell` + `TripHeader`, scoping class `my-plans` (F2), solid `ink` base, document scrolls, header scrolls away (007 §21.1) |
| Sheet | DS §36.2 collection sheet exactly as 007 §21.1: `paper`, radius 24 (20 on N), width `min(100vw − 2 × gutter, 1600)`, top 16 (8 N), bottom 40 / 24 / 16, min-height to the viewport floor, padding 56 / 48 / 40 / 32 / 32 / 20 (16 below 360) |
| Order | Title block → collection row (10.2), or the state of 10.7 that replaces it. Nothing else (A1: no cap note) |
| `h1` PL2 | `ink` 36/42 (XL, L), 32/38 (M, S, T), 28/34 (N), weight 600, −0.02em, `tabindex="-1"`, no ring |
| Support PL3 | 8 below; `stone` 16/24 (14/20 N). No count line: section headings and the calendar already say how much there is |
| Primary action | **None in the title row.** The page is for reviewing; the brand is the Planner entry. **Plan a trip** appears only in the empty and no-upcoming states (10.7) |
| Cap note PL45 | **Superseded by amendment A1 (lead, 2026-10-20):** there is no cap note over a partial list. PL45 is the heading of the overflow state, composed exactly as the List failed state of §10.7 (heading `tabindex="-1"` + **Try again**), with no list and no calendar |
| Gap to collection | 32 |

### 10.2 Collection row (desktop ≥1024)

`display: grid; grid-template-columns: minmax(0, 1fr) var(--plans-calendar-w); column-gap: var(--plans-gap); align-items: start`. DOM order **list, then calendar** at every width. The calendar column is `position: sticky; top: 24` when the viewport is ≥ 600 tall (otherwise static), so the selected day stays visible while a long list scrolls.

| Tier | Reference | Content (with scrollbar) | Calendar | Gap | List | Split list / calendar |
|---|---|---:|---:|---:|---:|---|
| XL | 1920×1080 | 1473 | 512 | 64 | 897 | 61 / 35 % |
| L | **1440×900** | 1217 | **440** | 48 | **729** | 60 / 36 % |
| M | 1366×768 (1280) | 1191 (1105) | 416 | 40 | 735 (649) | 62 / 35 % (59 / 38) |
| S | 1024×768 | 881 | 344 | 32 | 505 | 57 / 39 % |

At 1440×900: columns start at y ≈ 242; the calendar panel (≈ 512 tall) ends at ≈ 754, fully on screen on arrival; about seven Upcoming entries are visible. At 1920 the 1600 sheet cap turns extra width into margin; entries never stretch beyond 897. At 1024×768 the calendar (≈ 420 tall at S) is sticky and fits.

### 10.3 Plan entry (collapsed)

**Semantics.** Each section is an `h2` + `ul`; each Plan an `li` holding one `button type="button"` (the whole row), `aria-expanded`, `aria-controls` = the detail region's id (10.4; the attribute is present only while the region is rendered). Accessible name by `aria-labelledby` (name slot, hidden long date, Today, status) = **PL11**, e.g. "Lynn Canyon Loop, Saturday, October 24, Today, Ready to go"; the facts line is the `aria-describedby` ("Moderate, 8.4 km, 3 h 30 min"). Chevron `aria-hidden`.

**Geometry.** Entries are separated by 1px `ink` 0.12 rules (top of each `li`, plus bottom of the last); no card container. Button: `width: 100%`, `text-align: start`, radius 12, padding 16 12 (12 12 on Past), grid `var(--date-col) minmax(0, 1fr) auto 20px`, column-gap 20 (16 at S, T), `align-items: start`. `--date-col` 128 (XL–M), 112 (S, T).

| Part | Upcoming | Past (quieter by size and value, never by opacity) |
|---|---|---|
| Date (col 1) | `formatTripDateShort`, `ink` 16/22 weight 600, tabular; may wrap to a 2nd line when it carries a year. `aria-hidden`; the hidden long date is in the name | `stone` 16/22 weight 500 |
| Today (col 1) | Only on a Plan dated today: PL7 4 below the date, `conifer-press` 14/20 weight 600 (≈ 11:1 on `paper`). Word carries it, colour only reinforces | Never |
| Name (col 2) | `ink` 18/24 weight 600, 2-line clamp, `overflow-wrap: anywhere` (full name in the accessible name) | `ink` 16/22 weight 600 |
| Facts (col 2) | 4 below. `stone` 14/20: difficulty · distance · duration, joined by " · " (F9 formatters; a null fact is omitted with its separator; all null → line not rendered). **Elevation is not in the row** (it is in the detail): three facts read in one glance and stay on one line down to 505px | Same |
| Status (col 3) | XL–M: PL6 at the row end, aligned to the name's first line: 16px `CircleCheck` `conifer` + 6 + `ink` 14/20 weight 500, `nowrap`. S, T, N: moves under the facts, 6 below | Not rendered |
| Chevron (col 4) | 20px `ChevronDown` `stone`, aligned to the first line; rotated 180° while expanded | Same |

Fallbacks in the name slot (DS §37.11; date, Today, and status always render from the Plan itself):

| Trail state | Name slot | Facts | Name in PL11 |
|---|---|---|---|
| Loading | Static bar 55 % × 16, `ink` 0.08, radius 6, `aria-hidden` | Bar 35 % × 12, 8 below | PL10 "Loading trail" |
| Gone (404) | PL8 `stone` 16/24 weight 500 | Not rendered | PL8 |
| Lookup failed | PL9 `stone` 16/24 weight 500 | Not rendered | PL9 |

States (colour 150ms `--ease-ui`, cursor `pointer`): hover (fine pointer) fill `ink` 0.04 and name underline 1px offset 3; active fill `ink` 0.08; focus-visible DS §18 ring (radius 12; no ancestor clips: the `ul` and sheet have no `overflow: hidden`); disabled never; forced colours: rules `CanvasText`, focus by the transparent outline.

**Loading list.** One placeholder `h2` bar 120 × 22 and four skeleton rows in the exact row geometry (date bar 80 × 14, name bar 55 % × 16, facts bar 35 % × 12, `ink` 0.08, radius 6); static, no shimmer; the region is `aria-busy="true"` with the hidden status PL37.

### 10.4 Selected Plan and inline detail (D9)

**Selected / expanded.** The `li` becomes a `snow` surface, radius 16, with a **2px inset `ink` ring** (the §36.5 "pressed in" ring, here on a raised paper → `snow` value change); the rules above and below it are hidden; the chevron is rotated; `aria-expanded="true"`. Shape and value carry the state, never hue; no shadow, lift, or glow. Activating the selected entry collapses it (D16). Focus **stays on the entry button** on expand and collapse: the detail follows it directly in the DOM, so nothing needs to move.

**Detail region** (`div`, the `aria-controls` target), padding 0 12 20; at ≥768 its content starts at the name column (`padding-inline-start: 12 + date-col + column-gap`). Top to bottom:

| Part | Specification |
|---|---|
| Long date | `formatTripDateLong` in `ink` 16/24 weight 500 (the row shows the short form; this states it fully) |
| Facts | 12 below. A `dl` as a wrapping row, gap 8 32: each pair `dt` PL12 `stone` 14/20, `dd` `ink` 16/24 weight 600 — Difficulty, Distance, Duration, Elevation gain (F9; a null pair is omitted, never 0). Not rendered for gone or failed trails |
| Context lines | 12 below, `stone` 14/20, 4 apart, only those that apply: PL13 when `isSampleTrailSource(source)`; PL14 on Past Plans; PL15 on a gone trail. Never weather, readiness, gear, or Memory text |
| Actions | 16 below, after a 1px `ink` 0.12 rule with 16 below it. A wrapping row, gap 8, DOM order as D9: **View trail** PL16 — `Link`, secondary on paper (004 §21.17: no fill, 1px `stone` border, `ink` 14/20 600, 40 tall / 44 coarse, radius 10, padding 0 16, 16px `MapPinned`); **Review gear** PL17 — Upcoming only, `Link` styled as the page's one filled action: `conifer`, `snow` 14/20 weight 600, 16px `Backpack`, same box; hover `conifer-deep`, active `conifer-press`; **Delete plan** PL18 — the quiet destructive text button (007 §21.8: no border, `ink` 14/20 600, 16px `Trash2` in `ember`, 40 / 44 tall, padding 0 10, radius 10; hover underline + `ink` 0.04, active `ink` 0.08), pushed to the row end (`margin-inline-start: auto`) at ≥768. Gone trail: only Delete plan. Failed lookup: all that apply (§16 table) |

Below 768 the detail starts at the button's start padding; View trail and Review gear share a line (`flex: 1 1 0`), Delete plan sits start-aligned on its own line below.

### 10.5 Day filter (D15)

While a day with ≥ 2 Plans is active, the list column's section headings are replaced by one **filter row** at its top: fill `ink` 0.04, radius 12, padding 12 16, flex, space-between, wrap, gap 8 16. Start: PL26 as `ink` 16/24 weight 600 (a `p`, not a heading). End: **Show all plans** PL27, secondary on paper at 36 tall (44 coarse), 16px `X`. Below it, 12 gap, only that day's entries, keeping their Upcoming or Past styling. Activating a day announces PL28 politely; Show all plans announces PL29, removes the row, restores both sections, clears the selected day, and, because the button itself disappears, moves focus to the first section heading (`tabindex="-1"`).

### 10.6 Monthly calendar (D11–D14)

**Surface (≥768).** `section` with hidden `h2` PL36. `snow`, 1px `ink` 0.12 border, radius 20, padding 24 (XL 28; S, T 20), no shadow. T: width `min(100%, 480)`, start-aligned. **N:** no panel: it sits on `paper` after a 1px `ink` 0.12 rule with 24 above and 20 below, so its cells get the full width.

**Header row** (44 tall, flex, space-between). Month label PL32 as `h3`, `ink` 18/24 weight 600, inside an `aria-live="polite"` wrapper so a month change is announced. End: **Previous month** PL30 and **Next month** PL31, 8 apart: icon actions (DS §14 circle) 36 (44 coarse), 18px `ChevronLeft` / `ChevronRight` `ink`, `snow` fill, 1px `ink` 0.12 border; hover `paper`, active `ink` 0.08, focus DS §18. Never disabled; unbounded. **No Today control** (agreeing with the lead): the initial month (D12) already lands on what matters, and a third button would compete with the grid; reload returns to it.

**Grid.** Confirm **O10**: a semantic `<table>` labelled by the month label, `border-collapse: separate; border-spacing: 4` (2 on N and on a coarse pointer at S), 7 equal columns, **always 6 week rows** (trailing rows blank) so the panel's height never jumps between months. Confirm **O6**: Sunday first, en-US, matching every existing formatter. Weekday headers `th scope="col"`: visible PL33 "Sun"… `stone` 14/20 weight 600 (`aria-hidden`), with the full name (PL33-long) visually hidden; 28 tall. Days outside the month are empty `td`s.

| Tier | Cell (w × h) | Number |
|---|---|---|
| XL | ≈ 61 × 56 | 16/20 |
| L | ≈ 52 × 52 | 16/20 |
| M | ≈ 49 × 48 | 16/20 |
| S | ≈ 40 × 44 (≈ 41 × 44 coarse) | 14/18 |
| T | ≈ 59 × 52 | 16/20 |
| N | ≈ 44 × 44 at 390; ≈ 36 × 44 at 320 | 14/18 |

Cell box: radius 10, number top-centred 6 from the top, mark row (14 tall) 4 below the number.

| Day kind | Element | Treatment |
|---|---|---|
| No Plans | Plain text in the `td`; not focusable | `stone` weight 400. Nothing on hover or click |
| Has Plans (upcoming date) | `button` filling the cell | Number `ink` weight 600; mark: a 6px solid `conifer` dot; **≥ 2 Plans:** the dot plus the count, `conifer-press` 14/14 weight 600, 3 apart ("● 2") |
| Has Plans (past date) | `button` | Number `ink` weight 500; mark: a 6px **ring** (1.5px `stone`, no fill) — quieter and a different shape, not only a different colour; count in `stone` |
| Today | `td` (`aria-current="date"`), button or text | A 1.5px inset `ink` outline on the cell box, number weight 600 |
| Selected day | Its button, `aria-pressed="true"` (all other day buttons `aria-pressed="false"`) | Solid `ink` fill, number `snow`, dot/ring/count in `snow`. Fill vs outline separates it from Today |
| Today and selected | — | The selected fill plus an inner `paper` ring (`inset 0 0 0 3px ink, inset 0 0 0 4.5px paper`) |

Day-button states: hover fill `ink` 0.06 (selected: unchanged), active `ink` 0.10, focus-visible DS §18 ring (border-spacing ≥ 2 and no clipping ancestor keep it whole). Forced colours: selected `Highlight` fill with `HighlightText`; today 2px `CanvasText` outline; marks `CanvasText`.

Accessible name of a day button (PL34): "{formatTripDateLong}, 1 plan" / "…, N plans", prefixed "Today, " when it is today (e.g. "Today, Tuesday, October 20, 1 plan"; "Saturday, October 24, 2 plans"). A plain today cell carries a visually hidden ", today".

**Legend** (16 below the grid): `stone` 14/20, two items 16 apart: the dot + PL35a, the ring + PL35b; marks `aria-hidden`, words visible. **Loading:** same panel with a 140 × 20 bar for the month label, the two circles as 1px `ink` 0.08 outlines (no buttons rendered), real weekday headers, 6 rows of empty cells; `aria-hidden` (PL37 covers it). Never an empty interactive grid while loading.

### 10.7 Screen states

| State | Composition |
|---|---|
| Ready | 10.2 |
| **No Plans** | **No calendar** (an empty month says nothing and reads as a dashboard). The collection row is replaced by one start-aligned column, max-width 480, 16 top: `h2` PL38 `ink` 22/28 weight 600 `tabindex="-1"`; 8; PL39 `stone` 16/24; 24; **Plan a trip** PL40 → `/home`, the primary recipe (004/007: `conifer`, `snow` 16/24 600, 44 tall, radius 12, padding 0 20, 16px `Compass`; full width on N). No artwork |
| No Upcoming, Past exists | Upcoming `h2` stays; under it, 12 below: PL41 `ink` 16/24, then 12 below **Plan a trip** PL40 as secondary on paper (Past still holds the page, so no filled action). Past and calendar normal |
| Past empty | Past `h2` and list not rendered |
| List failed | Replaces the collection row (no calendar): `h2` PL42 `ink` 22/28 600 `tabindex="-1"`; 24; **Try again** PL43, `TripRetryButton tone="paper"` (`RotateCw`; working `LoaderCircle` + PL44, `aria-disabled`). Never the empty state |
| Loading | 10.3 and 10.6 placeholders in their final geometry; title block real |

Section headings: `h2` PL4 / PL5, `ink` 22/28 (20/26 N) weight 600, `tabindex="-1"` (focus targets, D18); 12 to the first rule; 48 between Upcoming's last rule and Past's heading.

### 10.8 Delete confirmation (D18, DS §36.9)

Replaces the detail's action row in place (no new surface), inside the selected entry: `role="group"` `aria-labelledby` the question. Question PL19 `ink` 16/24 weight 600 (the trail name is visible directly above, in the same expanded surface); 4; PL20 `stone` 14/20; 16; **Cancel** PL21 (secondary on paper, initial focus), 8, **Delete** PL22 (`ember` fill, `snow` 14/20 weight 600 (4.8:1), 16px `Trash2`, 40 / 44 tall, radius 10, padding 0 16; hover `ember` 12 % toward `ink`, active 24 %). Below 768 both buttons full width, Cancel first. Escape or Cancel restores the action row and focuses Delete plan. **Working:** Delete shows spinning `LoaderCircle` + PL23, `aria-disabled`, cursor `progress`; Cancel `aria-disabled`; Escape ignored; the entry button stays operable but collapsing is ignored until the request settles. **Failure:** PL24 12 above the buttons, 16px `CircleAlert` `ember` + `ink` 14/20 weight 500, `role="alert"`; confirmation stays; Delete retries. **Success:** the entry leaves instantly (no exit animation), PL25 announced, focus per D18.

### 10.9 Tablet and mobile

- **T (768–1023): stacked, list first, calendar below**, same DOM order as desktop so keyboard and screen-reader order never changes between widths. Reasoning: the list is the complete, actionable view (names, dates, actions); at 768×1024 a calendar above (≈ 470 tall) would push every Plan below the fold, and the calendar is a secondary map of the same data. 40 between the list's last rule and the calendar. Entry: date column 112, status under facts.
- **N (<768): basic usable fallback.** One column. Entry button padding 14 8, no date column: a top line `formatTripDateShort` + (" · " + PL7 when today) in `ink` 14/20 weight 600 (Past `stone` 500); then name 16/22 600; facts; status. Chevron at the top-right. Touch targets ≥ 44 everywhere except calendar cell width at 320 (≈ 36; height 44; still above WCAG 2.5.8's 24). Detail actions per 10.4. Calendar after the list on paper (10.6). Nothing is hidden on N.
- Coarse pointer at any width: buttons 44 tall, icon actions 44, no hover dependence (every action is visible text in the expanded entry).

### 10.10 Focus and motion

- Focus ring DS §18 on every control; `h1`, section headings, and the empty / error `h2`s are `tabindex="-1"` targets with no ring. Tab order: header → entries (each entry, then its detail controls when expanded) → filter row (when active, it precedes the entries) → Previous / Next month → day buttons in date order.
- Motion (`--duration-base`, `--ease-ui`): detail region opacity 0 → 1 with a 4px rise on expand; collapse, switching selection, month change, filtering, deletion, and grid updates are instant; chevron rotation 150ms; colour changes 150ms. Scroll-into-view (D15) `smooth` only without reduced motion.
- `prefers-reduced-motion: reduce`: no rise, no fade, no rotation transition (the chevron is simply in its end state), instant scroll; `LoaderCircle` static with its text. Nothing moves by itself; no Pause control needed.

### 10.11 Copy deck

| Id | Text |
|---|---|
| PL1 | Plans (header link, Gear's link class and §36.8 current treatment; not a header redesign) |
| PL2 | My Plans |
| PL3 | The trips you've finished preparing for. |
| PL4 / PL5 | Upcoming / Past |
| PL6 | Ready to go |
| PL7 | Today |
| PL8 | Trail unavailable |
| PL9 | Trail details couldn't be loaded. |
| PL10 | Loading trail |
| PL11 | {trail name or PL8 / PL9 / PL10}, {formatTripDateLong}[, Today][, Ready to go] |
| PL12 | Difficulty · Distance · Duration · Elevation gain (`dt` labels) |
| PL13 | This is sample trail data. (reuse `trailContent.sampleData`) |
| PL14 | This trip date has passed. |
| PL15 | This trail is no longer available. You can still delete this plan. |
| PL16 / PL17 / PL18 | View trail / Review gear / Delete plan |
| PL19 | Delete this plan? |
| PL20 | This removes it from My Plans. Your gear and trail data are not deleted. |
| PL21 / PL22 / PL23 | Cancel / Delete / Deleting… |
| PL24 | This plan couldn't be deleted. Try again. |
| PL25 | Plan deleted. (polite announcement) |
| PL26 | {N} plans on {formatTripDateLong} |
| PL27 | Show all plans |
| PL28 | Showing {N} plans on {formatTripDateLong}. (polite) |
| PL29 | Showing all plans. (polite) |
| PL30 / PL31 | Previous month / Next month |
| PL32 | {Month} {YYYY}, e.g. "October 2026" |
| PL33 | Sun Mon Tue Wed Thu Fri Sat (visible); Sunday … Saturday (hidden) |
| PL34 | [Today, ]{formatTripDateLong}, 1 plan / {N} plans; plain today cell: hidden ", today" |
| PL35a / PL35b | Upcoming plan / Past plan |
| PL36 | Plan calendar (hidden `h2`) |
| PL37 | Loading your plans… (hidden status) |
| PL38 | No plans yet. |
| PL39 | Plan a trip and finish your preparation to see it here. (wording as approved 2026-10-20) |
| PL40 | Plan a trip |
| PL41 | No upcoming plans. |
| PL42 | Your plans couldn't be loaded. |
| PL43 / PL44 | Try again / Trying again… |
| PL45 | Your complete plan list couldn't be loaded. (overflow / incomplete state, amendment A1; with **Try again** PL43) |

### 10.12 O5 — Home header at 768–~900 px

Acceptable as is for this feature. The identity is a confirmation, not a control; it truncates with an ellipsis and never breaks the row; its full text (with the hidden "Signed in as") stays in the DOM, so assistive technology reads it whole; Sign out and every link keep full size. A 4–6 character identity is a cosmetic weakness, so record it as a post-freeze polish candidate (for example, hiding the visible identity text in the Home header only between 768 and ~899 while Sign out remains). Do not change it in FEATURE-013.

### 10.13 Closeout notes for DS (proposed, not edited)

- A §36 sibling for **typographic itinerary lists**: rule-separated entry buttons with a date column, inline expansion as a `snow` surface with the 2px inset `ink` ring, quieter past entries by size and value (never opacity).
- A **month calendar** pattern: `<table>`, buttons only on days with content, fixed 6 rows, dot (upcoming) vs ring (past) marks, today = outline, selected = solid `ink` fill, both = fill plus inner `paper` ring.

### 10.14 Open for lead

1. **D15 focus on stacked layouts.** Below 1024 the list sits above the calendar, so scrolling the matched entry into view takes the focused day off screen. Proposal: below 1024 only, a day activation moves focus to the selected entry (one Plan) or the filter row's text (several, `tabindex="-1"`); at ≥1024 focus stays on the day as D15 says.
2. **Focus after deleting the last Plan of a section** (D18 "else the section heading"): if Past empties, Past is no longer rendered; proposal: the Upcoming heading. If no Plans remain: the empty-state `h2` PL38.
3. **Delete question without the trail name** (PL19) differs from DS §36.9 "a question naming the item". Kept the lead's copy, because the name is directly above in the same surface; alternative "Delete your plan for "{trail}"?".
4. **Calendar cell width exception** at 320 (≈ 36 × 44) and S coarse (≈ 41 × 44): below the DS 44 × 44 in width only. Accept, or drop border-spacing to 0 at those sizes (≈ 38 / 43 wide).
5. **Failed trail lookup in an expanded entry** has no visible Try again (selection is the retry, O8); after a second failure the user must collapse and reselect. A quiet **Try again** under PL9 in the detail would be clearer; behavioural, so not added.
<!-- UI-UX: END -->

### 10.15 Lead resolution of §10.14 and of the inspection open items (2026-10-20)

| Item | Resolution |
|---|---|
| §10.14-1 focus on stacked layouts | **Rejected.** The brief requires that a day activation never steals focus. At every width focus stays on the day; the entry or group is scrolled into view, and the result is announced: PL28 for several Plans, **PL46** "Showing your plan for {trail name} on {formatTripDateLong}." for one. A Tab from the day continues in the calendar, where the user already is |
| §10.14-2 focus after deleting the last of a section | **Accepted** (§20) |
| §10.14-3 delete question | **Kept** "Delete this plan?": the trail name is directly above in the same expanded surface (the brief's preferred copy) |
| §10.14-4 calendar cell width | **Accepted** as a known exception (U6 f) |
| §10.14-5 retry of a failed trail lookup | **Accepted:** a quiet **Try again** (PL43, the 004 quiet secondary on paper, 36 tall / 44 coarse) under PL9 in the expanded entry refetches that trail only; selection also retries once (O8) |
| O1 Today / Tomorrow | "Today" computed in Plans (PL7); no "Tomorrow" (D8) |
| O2 new Plan after Continue | `refetchOnMount: "always"` (D4a) |
| O3 edits in frozen / shared files | U3 |
| O4 dependency rule, key wording | FC closeout (§27) |
| O5 Home header identity | Accepted, post-freeze polish candidate (§10.12, U6 b) |
| O6 / O10 Sunday-first `<table>` | Confirmed by `ui-ux` (§10.6) |
| O7 offset paging; B open 1 | Restart-once rule (§8) |
| O8 retry on selection | Adopted (§9) |
| O9 signed-out `?plan` | Accepted (D17, U6 d) |
| O11 hydration volume | Accepted (§22) |
| B open 2 / 3 | Status-only 404 (§9); null facts omitted (§9) |
| B open 4 date skew | Known limitation (U6 e) |

## 11. Upcoming / Past

- **D6. Derived on the client, never stored.** `today` is the viewer's local calendar date as `YYYY-MM-DD` (`todayIso()`). **Upcoming** = `tripDate >= today`; **Past** = `tripDate < today`. Today's Plans are Upcoming. Comparison is string comparison of ISO dates (§19).
- **D7. Order.** Upcoming: the server order (`tripDate ASC, createdAt ASC, id ASC`), nearest first. Past: `tripDate DESC`, keeping the server's `createdAt ASC, id ASC` within one date, most recent first.
- `status` stays `READY` for every Plan; it is not used to classify.

## 12. Plan Card / Detail

- **D8. A Plan is a compact list entry.** Visible: trail name, trip date (`formatTripDateShort`; a Plan dated today also carries the text **Today**, computed in Plans because no existing formatter produces it, O1; no "Tomorrow"), difficulty, distance, estimated duration (elevation only if §10 keeps the card readable), and, on Upcoming Plans only, **Ready to go** (the user-facing form of `READY`; a Past Plan does not claim to be ready). Never: Plan id, owner, timestamps, `deleted`, weather, Gear Readiness, or Memory state.
- **D9. Detail is inline.** Selecting a Plan expands it in place (one selected at a time) to show its facts and actions. No detail route, no modal, no separate panel.
- **Actions:** **View trail** → Trail Detail `/trails/:trailId` (existing route, no `?rec`). **Review gear** → Trip Preparation `/trails/:trailId/prepare/:tripDate` (`tripPreparationLocation`), Upcoming Plans only: a Past date is rejected by preparation (011 §15), so it is not offered there. **Delete plan** (§15).
- No Edit date, Edit trail, notes, participants, weather, reminders, packing history, or Memory button.
- **D10. Review gear reopens the existing flow, unchanged.** Trip Preparation recomputes the current forecast and Owned / Missing; **Gear up** leads to the Studio, whose idle **Finish preparation** row appears again because the Studio does not read Plans (011 §26.1 limitation D). Pressing it returns `200` "already saved" and creates nothing. FEATURE-013 records this and does not add a Plan lookup to the Studio.

## 13. Monthly Calendar

- **D11. Monthly view only.** One month grid, Previous month / Next month. No year picker, week or agenda view, drag, date editing, or creation from a date.
- **D12. Initial month:** the month of the selected Plan when one is selected on arrival (§14); otherwise the month of the nearest Upcoming Plan; otherwise the current month.
- **D13. Indicator:** a day with Plans shows one small mark; with two or more it also shows the count. Past-day marks are quieter than upcoming ones but present. The day's accessible name carries the date and "1 plan" / "N plans". Today and the selected day each have their own non-colour treatment.
- **D14. Only days with Plans are interactive.** Other days are plain text and not tab stops, so a click on an empty day does nothing and can never create a Plan. An empty month is normal (no message other than the grid itself).
- The calendar needs no request of its own.

## 14. Plan ↔ Calendar Interaction

- **D15. Calendar → Plans.** Activating a day with Plans selects that day. With one Plan on the day, that Plan becomes the selected Plan. With several, the list is narrowed to that day's Plans under a line "N plans on {date}" with **Show all plans**, and no Plan is selected until the user picks one. The relevant entry or group is scrolled into view if off-screen (no smooth scroll under reduced motion); focus stays on the day at every width, and the result is announced (PL28 / PL46, §10.15, §20).
- **D16. Plans → Calendar.** Selecting a Plan shows its month in the calendar (if not already shown) and marks its day as selected. Collapsing the selected Plan clears the selected day.
- Navigating months does not change the selected Plan.
- **D17. Selection in the address: `?plan=<id>`**, written with `replace` (the Discover `?trail=` precedent), so Back from View trail / Review gear and a reload return to the same Plan and month. It is compared lowercased with the loaded list and dropped (with `replace`) only after the list has loaded successfully without it, never while loading or failed; it is never sent to a server. The day filter is page state only, not in the address. A signed-out `/plans?plan=<id>` returns to plain `/plans` after sign-in (the return destination keeps the pathname only, F5; accepted, O9).

## 15. Delete Plan

- **D18. Two-step inline confirmation** inside the selected Plan (DS §36.9, the project's destructive pattern; no modal). Step one: **Delete plan**. Step two: "Delete this plan?", the reassurance "This removes it from My Plans. Your gear and trail data are not deleted.", **Cancel** (initial focus) and **Delete** (`ember`). Escape cancels.
- `DELETE /api/plans/{id}` through `useMutation` (`retry: false`, `networkMode: "always"`, not optimistic). `204` and `404` both mean removed (the gear precedent; a second tab may have deleted it).
- On success: the Plan is removed from the cached list (`setQueryData`) and the list query is invalidated; the calendar count drops or the mark disappears; the selection clears; `?plan` is removed; a day filter whose day is now empty is cleared; "Plan deleted." is announced politely; focus moves to the next Plan entry in the same section, else the previous, else the other section's heading, else the empty-state heading (§20).
- On failure: the Plan stays, the confirmation stays open with an inline error line, Delete can be pressed again; nothing else on the page changes.
- Trail data, gear, loadout, and Memories are untouched.

## 16. Empty / Loading / Error

| State | Behaviour |
|---|---|
| Loading Plans | The shell and page heading render at once; the collection and calendar show static placeholders in their final geometry; never the empty state, never an empty calendar |
| No Plans | "No plans yet." + "Plan a trail and finish your preparation to see it here." + **Plan a trip** → `/home` |
| No Upcoming, Past exists | Upcoming shows "No upcoming plans." (one line + **Plan a trip**); Past and the calendar work normally |
| Upcoming exists, no Past | The Past section is omitted |
| Plan list failed | "Your plans couldn't be loaded." + **Try again**; no list, no calendar, never the empty state |
| Collection incomplete (A1) | More than 10 pages, or paging metadata still changing after the one restart: PL45 "Your complete plan list couldn't be loaded." + **Try again**; no list, no calendar, never the empty state, never a partial list |
| Trail details loading | The entry shows date and status at once; trail name and facts as placeholders |
| Trail gone (`404`) | Name slot "Trail unavailable" (DS §37.11); date kept; View trail and Review gear not offered; Delete works |
| Trail lookup failed (other) | Name slot "Trail details couldn't be loaded." (PL9); date kept; View trail, Review gear (Upcoming), and Delete still offered; the entry retries once when selected, and its detail has a quiet **Try again** (§10.15) |

## 17. FEATURE-012 Continue Integration

- **D19.** The one change: `continueTo="/home"` → `continueTo="/plans"` in `GearStudioScreen.tsx`. Save order, the `ready_to_go` clip, its timings, fallbacks, reduced motion, announcements, and assets are untouched. Continue does not select the new Plan (plain `/plans`, U4); the list refetch on mount (D4a) guarantees the new Plan is listed and marked.

## 18. Account Isolation / Query Cache

- **D20.** Plan list key `["plans", "mine", <subject>]` (the Memories precedent); no request without a subject. Trail detail keys stay subject-free (public data). Sign-out and session end already `queryClient.clear()` (queries and mutations). No Plan data in web storage. The backend enforces ownership (011 §9); the frontend never sends an owner.

## 19. LocalDate Semantics

- **D21.** `tripDate` is a calendar date string, never a `Date` instant. Comparisons are ISO string comparisons; month grids are built from integer year / month / day (or local-time `new Date(y, m − 1, d)`), never `new Date("YYYY-MM-DD")` (UTC parse). Display uses the existing local-date formatters in `planning/tripDate.ts`.
- **D22. Midnight.** `today` is read at render and again when the page becomes visible; no timer. A page left open across midnight reclassifies on its next render or return to visibility.

## 20. Accessibility

Visuals, names, and copy are in §10 (PL ids); this section is the behavioural minimum.

- **Structure.** One `h1` "My Plans" (PL2); `h2` Upcoming / Past (PL4 / PL5), each followed by a `ul` of entries; the calendar is a `section` with a hidden `h2` (PL36) and a semantic `<table>` labelled by the month (`h3`, PL32), Sunday-first `th scope="col"` with full weekday names available to assistive technology. No `role="grid"`, no roving focus (O10).
- **Entries.** One native `button` per Plan with `aria-expanded` / `aria-controls` and the accessible name PL11 (name, long date, Today, Ready to go); the facts line is its description. Selection is carried by the expanded state and the inset ring, never by colour alone.
- **Calendar.** Only days with Plans are `button`s (tab stops in date order, Enter / Space activate); their name is PL34 ("Saturday, October 24, 2 plans", "Today, …"). Today's cell has `aria-current="date"`; the selected day's button `aria-pressed="true"`. Marks are `aria-hidden`; the count is in the name. Previous / Next month are named buttons (PL30 / PL31); the month label is in a polite live region so a change is announced.
- **Keyboard model.** Tab: header → entries (and the controls of the expanded one) → filter row when active → Previous / Next month → day buttons. Enter / Space on an entry toggles it; on a day, selects it. Escape inside the delete confirmation cancels (ignored while working). Nothing needs a pointer.
- **Focus.** Expanding / collapsing an entry keeps focus on its button. **Activating a day never moves focus** (D15, at every width); the result is announced (PL28 for several Plans, PL46 for one). **Show all plans** removes itself, so focus goes to the first section heading. **After a delete**, focus goes to the next entry in the same section, else the previous, else the other section's heading, else the empty-state heading PL38 (§10.14 item 2). Cancel / Escape in the confirmation returns focus to **Delete plan**.
- **Announcements** (the trip shell's `useTripAnnouncer`): PL25 "Plan deleted." polite; PL24 delete failure as `role="alert"` in the confirmation; PL28 / PL29 / PL46 polite; loading PL37 as a hidden status with `aria-busy` on the region; the list error heading PL42 receives focus only when it replaces content after a Try again, not on first load.
- **Reduced motion:** §10.10. Forced colours: §10.3, §10.6.
- **Targets:** 44 px on a coarse pointer; accepted exception: calendar day cells are 44 tall but ≈ 36–41 wide at 320 px and on a coarse pointer at 1024 px (above WCAG 2.5.8's 24 px, U6).

## 21. Responsive

Detail in §10.2 and §10.9. DOM order is identical at every width (list, then calendar).

| Width | Layout |
|---|---|
| ≥ 1024 (primary 1440×900; quick 1920×1080, 1024×768) | Two columns: list `1fr`, calendar 344–512 px (≈ 60 / 36 % at 1440), calendar sticky when the viewport is ≥ 600 px tall; the 1600 px sheet cap turns extra width into margin |
| 768–1023 | Stacked: list, then the calendar (≤ 480 px wide) |
| < 768 | Basic fallback: one column, the date on its own line above the name, calendar on the paper without its panel, nothing hidden, no horizontal scroll down to 320 px |

The header gains one link (PL1). At 768–~899 px the Home header's visible identity truncates further; accepted as a post-freeze polish candidate, no header redesign (§10.12, U6).

## 22. Performance

Expected request pattern for one visit to `/plans` (normal use, ≤ 50 Plans on T distinct trails):

| When | Requests |
|---|---|
| Page mount | 1 × `GET /api/plans?page=0&size=50` (always, D4a) + up to T × `GET /api/trails/{id}` in parallel, each only when its cache entry is absent or older than the default 30 s freshness |
| Revisit within 30 s (for example Back from View trail) | 1 × `GET /api/plans`; trail reads come from the cache |
| Selecting a Plan, changing month, selecting a day, Show all plans | none (a failed, not gone, trail lookup is retried once on selection, O8) |
| Delete | 1 × `DELETE /api/plans/{id}` + 1 × `GET /api/plans` (invalidation) |
| View trail / Review gear | Trail Detail reuses the cached trail; Trip Preparation runs its usual pack request |

- No request per calendar cell, per month change, or per render; the calendar is derived from the loaded list. No polling, no focus or reconnect refetch, no catalog (`GET /api/trails`) load.
- Above 50 Plans: one more list request per 50, sequential, within the 10-page window (beyond it, the A1 overflow state; no partial render). Trail reads scale with distinct trails, not Plans (≤ 6 in parallel through the HTTP/1.1 dev proxy, O11); acceptable at expected volume.
- The page is a lazy route chunk; it loads no `three`, avatar, map, or planner code.

## 23. Test Strategy

There is no frontend test runner (CLAUDE.md), and the backend is unchanged, so no backend tests are added.

- **Pure helpers** (`planCollection.ts`, `calendarMonth.ts`) are written so their behaviour can be checked by reading and in the browser: Upcoming / Past split on the today boundary, Past order, grouping by day, initial month, month grids for 28-, 29-, 30-, and 31-day months, a month starting on Sunday and on Saturday, December → January and January → December.
- `npm run build` (`tsc -b` + `vite build`) and `npm run lint` exit 0.
- Lead diff review against §26 (write scope), §18 (keys), §19 (no `new Date("YYYY-MM-DD")`, no `toISOString()` for dates), and the out-of-scope list (§28).
- Lean QA (§25) in a real browser with deterministic data (§25.1).

## 24. Acceptance Criteria

43 criteria: **P0 24**, **P1 13**, **P2 6**. "A" and "B" are two QA accounts (§25.1).

### P0

| Id | Criterion |
|---|---|
| AC-01 | `/plans` is an authenticated route rendering **My Plans** (PL2) in the trip shell. Signed out, a direct `/plans` goes to `/` with the sign-in gate, and after signing in the user lands on `/plans` |
| AC-02 | **Plans** (PL1) sits immediately before Gear in `TripHeader` and `HomeHeader`, in the wide row and the narrow Menu; on `/plans` it has `aria-current="page"`; the brand still goes to `/home`; Gear, Memories, New Plan, and the account controls are otherwise unchanged |
| AC-03 | A sees exactly A's non-deleted Plans, Upcoming and Past, and nothing of B's |
| AC-04 | A signs out and B signs in in the same tab: at no moment does `/plans` render any of A's entries, trail names, or calendar marks. The list key includes the subject; no Plan request is sent without one |
| AC-05 | Upcoming holds every Plan with `tripDate >= today` (viewer's local date), nearest first, server order within a day |
| AC-06 | Past holds every Plan with `tripDate < today`, most recent first |
| AC-07 | A Plan dated today is under Upcoming and shows **Today** (PL7) and **Ready to go** (PL6) |
| AC-08 | At ≥ 1024 px a monthly calendar sits beside the list: month label, Previous / Next month, Sunday-first weekdays, 6 week rows; no week, agenda, or year view |
| AC-09 | Each day with Plans is marked (upcoming: dot; past: ring) and is a button; a day without Plans is plain text, not focusable, and does nothing when clicked. Changing month sends no request |
| AC-10 | A day with two or more Plans shows one mark plus the count; its accessible name says "N plans" |
| AC-11 | Activating a day with one Plan selects and expands that Plan; a day with several narrows the list to them with PL26 and **Show all plans**, none selected until the user picks. No navigation; focus stays on the day; the entry or group is scrolled into view |
| AC-12 | Selecting a Plan shows its month in the calendar and marks its day as selected (`aria-pressed="true"`); collapsing it clears the selected day; changing month keeps the selected Plan |
| AC-13 | Each entry shows the trail's name, difficulty, distance, and duration from `GET /api/trails/{id}`, with one request per distinct trail (none repeated for a second Plan on the same trail) under the key Trail Detail uses; a missing fact is omitted, never 0 |
| AC-14 | A Plan on a synthetic trail is listed and marked in the calendar like a curated one; its detail shows the sample-data line (PL13) and no Memory text or action |
| AC-15 | **View trail** opens `/trails/:trailId` for that Plan's trail; Back returns to `/plans` with the same Plan selected (`?plan=`) and its month shown |
| AC-16 | **Review gear** appears on Upcoming Plans only and opens `/trails/:trailId/prepare/:tripDate` with that Plan's trail and date; it is absent on Past Plans |
| AC-17 | **Delete plan** asks first: PL19, PL20, **Cancel** (initial focus) and **Delete**; Cancel or Escape sends nothing and keeps the Plan |
| AC-18 | Confirmed delete sends one `DELETE /api/plans/{id}`; on `204` (or `404`) the entry disappears, the day's count drops by one or its mark disappears, without a reload; after a reload it stays absent; other Plans, gear, trail data, and Memories are unchanged |
| AC-19 | When the list request fails, the page shows PL42 and **Try again** (which recovers once the service is back); never the empty state, never an empty calendar |
| AC-20 | After **Finish preparation** → `ready_to_go` → **Ready for the trail.**, **Continue** goes to `/plans`, and the just-saved Plan is listed and marked, even when `/plans` was opened less than 30 s earlier |
| AC-21 | FEATURE-011 / 012 unchanged: one `POST` per activation, a repeat save is `200` "already saved" with one row; clip, fallbacks, reduced motion, and announcements as before; the Studio diff is the single `continueTo` value |
| AC-22 | `/plans` has no Add memory, "How was your trip?", Memory indicator, or Memory request, for Past Plans included |
| AC-23 | No backend file changed; B's attempt to read or delete A's Plan id is `404` and A's Plan is unchanged |
| AC-24 | `/plans` never creates or edits a Plan: no `POST`, `PUT`, or `PATCH` from the page, no creation from an empty day, no drag and drop, no date or trail editing |

### P1

| Id | Criterion |
|---|---|
| AC-25 | Initial month: the `?plan=` Plan's month, else the nearest Upcoming Plan's month (also when it is next month), else the current month |
| AC-26 | No Plans: PL38, PL39, **Plan a trip** → `/home`; no calendar |
| AC-27 | No Upcoming but Past exists: Upcoming shows PL41 and a secondary **Plan a trip**; Past and the calendar work. With Upcoming and no Past, the Past section is not rendered |
| AC-28 | A Plan whose trail is `404` shows PL8 with only **Delete plan** (which works); a Plan whose trail lookup failed shows PL9 with View trail, Review gear (if Upcoming), Delete, and a quiet **Try again**; the other Plans are unaffected |
| AC-29 | More than one page of Plans (> 50) is read whole without visible pagination; with `totalPages > 10`, or metadata still changing after the one restart, the page shows the A1 overflow state (PL45 + Try again) and never a partial list or calendar (verified by code review or a temporarily lowered page size / window; Lean QA does not seed 51 Plans) |
| AC-30 | While loading, the header and title render, the list and calendar show static placeholders in their final geometry, never the empty state or an interactive empty grid; replacing them shifts nothing else on the page |
| AC-31 | At 1024×768: two columns as §10.2, sticky calendar fully visible, no horizontal scroll, no clipped focus ring |
| AC-32 | Keyboard only: every entry, action, month control, and Plan day is reachable and operable (Enter / Space); focus is always visible; the delete confirmation works by keyboard |
| AC-33 | After a delete, PL25 is announced and focus goes per §20; a failed delete shows PL24 (`role="alert"`), keeps the confirmation and the Plan, and a second Delete can succeed |
| AC-34 | A Plan for `2026-11-01` appears on November 1 in the list and the calendar with the browser in `America/Vancouver` and in `Asia/Tokyo`; the code contains no `new Date("YYYY-MM-DD")` or `toISOString()` date derivation |
| AC-35 | `?plan=` is written with `replace` (no extra history entries); a reload restores the selection and month; an unknown id is dropped only after the list has loaded |
| AC-36 | Today has `aria-current="date"`, the selected day `aria-pressed="true"`, entries `aria-expanded`; none of these states relies on colour alone (checked in forced colours or greyscale) |
| AC-37 | Deleting a Plan already deleted elsewhere (`404`) is treated as removed, with no error shown |

### P2

| Id | Criterion |
|---|---|
| AC-38 | Below 768 px (390 and 320): one column, all content and actions reachable, no horizontal scroll |
| AC-39 | 1920×1080: list ≤ 897 px, nothing stretches; the offset-restart rule and the A1 overflow guard of §8 are present in code |
| AC-40 | Multi-Plan day polish: PL28 / PL29 announced; **Show all plans** restores both sections and moves focus to the first section heading |
| AC-41 | Month boundaries: December → January and January → December change the year; February 2028 has 29 days; months starting on Sunday and on Saturday render in 6 rows correctly |
| AC-42 | Leaving `/plans` open across midnight reclassifies a Plan dated "yesterday" into Past on returning to the tab (visibility), with no timer |
| AC-43 | The Plan entry and calendar use only existing tokens and the trip shell; no new dependency in `package.json` |

## 25. Lean QA Plan

About 10 minutes, Chrome DevTools MCP first (Playwright over CDP as fallback), `npm run dev` on 5173 with trail-, recommendation-, user-, and plan-service and Keycloak running. Not Full Regression.

### 25.1 Test data (deterministic, QA-owned only)

- Two QA accounts, A and B (new `otc-qa-f013-*@example.test`, or the 011 QA accounts).
- For A: at least **2 Upcoming** Plans (one dated today if possible), **2 on the same future date** on different trails, **1 on a synthetic trail**, and **2 Past** Plans on different dates. Plans are created only through the real journey or `POST /api/plans` with A's token. **Past Plans without DB injection (U8 as approved):** the API rejects past dates, so Past is produced on the client by moving the **browser's** clock forward (Playwright `page.clock` / an equivalent `Date` override in the QA page only, no product code path) so that Plans created for near-future dates fall before the emulated today; QA-account Plans whose date has already passed (for example the FEATURE-011 rows dated 2026-10-19) may also be used. Server calls are unaffected by the browser clock.
- For B: one Plan.
- For AC-28: **the only permitted DB injection** — one `plans` row for a QA account on a random trail UUID (direct test SQL through `docker exec … psql -d plan_db`; `status 'READY'`, `deleted false`, a future date), recorded in the checkpoint; it may stay or be soft-deleted afterwards. No migration, seed change, validation weakening, frontend test path, or non-QA row change. The lookup-failure case uses a DevTools / Playwright block of one `/api/trails/{id}` (or a brief trail-service stop).

### 25.2 Steps

1. As A, open `/plans` directly (1440×900). AC-01, AC-02.
2. Check Upcoming / Past membership and order, today's Plan under Upcoming. AC-05–07.
3. Calendar opens on the nearest Upcoming Plan's month; marks, ring vs dot, count on the shared day. AC-08–10, AC-25.
4. Select a Plan in another month → calendar moves there and marks the day. AC-12.
5. Activate a single-Plan day, then the shared day → filter row, Show all plans. AC-11, AC-40.
6. Synthetic Plan: listed, sample line, no Memory text. AC-14, AC-22.
7. View trail → Back (selection restored); Review gear on an Upcoming Plan → Trip Preparation for that trail and date; return. AC-15, AC-16, AC-35.
8. Delete one of the two Plans on the shared day: Cancel first, then Delete → count 2 → 1; reload → still absent. AC-17, AC-18, AC-33.
9. Trail 404 Plan and blocked trail lookup → PL8 / PL9, other Plans fine, delete works. AC-28.
10. Stop plan-service (or block `/api/plans`) → reload → PL42 + Try again, not empty; restart → Try again recovers. AC-19.
11. Sign out; sign in as B in the same tab → only B's Plan; B's direct `DELETE` of an A id → `404`. AC-03, AC-04, AC-23.
12. As B, complete a new trip preparation → `ready_to_go` → Continue → `/plans` lists the new Plan. AC-20, AC-21.
13. Keyboard pass over entries, month controls, days, delete. AC-32.
14. 1920×1080 and 1024×768 quick sweeps. AC-31, AC-39 (layout only).
15. `npm run build` and `npm run lint` exit 0.

Deferred unless time allows (not passed, not defects): AC-29, AC-34 (time-zone emulation), AC-38, AC-41, AC-42, real screen reader, Safari, phones.


## 26. Future Implementation Write Scope

### 26.1 `frontend`

- **New:** `Project/Frontend/src/features/plans/` — `hooks/usePlans.ts`, `hooks/useDeletePlan.ts`, `hooks/usePlanTrails.ts`, `hooks/useTodayIso.ts`, `model/planCollection.ts`, `model/calendarMonth.ts`, `components/MyPlansScreen.tsx`, `PlanSection.tsx`, `PlanEntry.tsx`, `PlanCalendar.tsx`, `DeletePlanConfirmation.tsx`, `PlansStates.tsx`, `myPlansContent.ts`, `my-plans.css`; `src/pages/PlansPage.tsx`. Names may vary; the boundary may not.
- **Edits inside `features/plans/`:** `api/plans.ts` (+ `requestPlans`, `deletePlan`), `api/planRequest.ts` (optional `cancel`, U3), `types/plan.ts` (comment only). `FinishPreparation.tsx`, `useCreatePlan.ts`, and `content.ts` are not edited.
- **Edits outside, exactly:** `pages/LazyRoutes.tsx` (+ `PlansRoute`), `app/router/routes.tsx` (+ `plans` child of `ProtectedRoute`), `components/layout/TripHeader.tsx` and `features/home/HomeHeader.tsx` (Plans link before Gear in row and menu; `aria-current` in `TripHeader`), `features/auth/returnDestination.ts` (+ `/plans`), `features/loadout/components/GearStudioScreen.tsx` (one value, `continueTo="/plans"`), `features/trails/hooks/useTrailDetail.ts` (export `trailDetailQueryOptions`, behaviour-preserving, U3), and the header CSS only if §10's header note requires it.
- **Not authorised:** `Project/Backend/**`, `vite.config.ts` (the `/api/plans` proxy exists), `features/memories/**`, `features/community-memories/**`, `features/discover/**`, `features/planning/**` (imports only), `features/avatar/**`, `public/models/**`, Blender files, `package.json` / lockfile, `docs/**` (lead closeout only).

### 26.2 `backend-api`

None. Inspection found no gap (§6). Not invoked during implementation.

### 26.3 `ui-ux`

No implementation. Guidance only if the lead asks during the diff review. `DESIGN_SYSTEM.md` additions at closeout per §27.

### 26.4 `three-d` / Blender

Skipped. Nothing under `features/avatar/`, `public/models/`, or any `.blend` changes.

## 27. Documentation Follow-ups (closeout; not done during specification)

- `docs/PRODUCT_REQUIREMENTS.md`: §11.1 Continue → `/plans`; §11.2 FEATURE-013 PASS / FROZEN, FEATURE-014 NEXT; §14 Plans in the authenticated navigation (brand = Planner); §15 Plans list unavailable / no Plans states; §22 roadmap table; a decision-record row.
- `docs/FRONTEND_CONTEXT.md`: §1 status; §4 note that the frontend consumes list and delete (not detail); §7 return destination includes `/plans`, request layer `cancel`; §8 route table (`/plans`, `?plan=`), a "My Plans" subsection, Continue → `/plans`; §9 FEATURE-013 done, keys `["plans","mine",subject]`; §10 dependency rule `plans → services, auth, trails (detail api/hook, tripRoutes, content), planning/tripDate.ts, planning/presentation.ts, layout` (O4).
- `CLAUDE.md`: roadmap lines (013 PASS / FROZEN, 014 NEXT).
- `docs/DESIGN_SYSTEM.md`: only if the implementation adds a reusable pattern (the month calendar and the compact Plan list entry, §10's closeout note); otherwise nothing.
- Checkpoint `.claude/state/features/013-my-plans-calendar.md` and the implementation record in this spec.

## 28. Final Product Decisions

| Q | Question | Decision |
|---|---|---|
| Q1 | Route | `/plans` (D1) |
| Q2 | Authenticated | **Yes**, existing `ProtectedRoute`; return destination `/plans` (D2) |
| Q3 | Nav label | **Plans** |
| Q4 | Nav order | Brand (Planner) · [New Plan on `/home`] · **Plans** · Gear · Memories. No separate "Planner" link is added: the brand is the Planner entry today (D3) |
| Q5 | Backend schema change | **No** |
| Q6 | New Plan status | **No**; `READY` only |
| Q7 | Upcoming rule | `tripDate >= today` (viewer's local date) |
| Q8 | Past rule | `tripDate < today` |
| Q9 | Today belongs to | **Upcoming** |
| Q10 | Upcoming sort | Nearest first: `tripDate ASC, createdAt ASC, id ASC` (server order) |
| Q11 | Past sort | Most recent first: `tripDate DESC`, server order within a day |
| Q12 | Calendar view | **Monthly only** |
| Q13 | Default month | Selected Plan's month (`?plan=`), else the nearest Upcoming Plan's month, else the current month (D12) |
| Q14 | Multiple Plans per day | **Yes** |
| Q15 | Indicator | One small mark; with the count from 2 (D13, §10) |
| Q16 | Day click | One Plan → selected; several → list narrowed to that day, user picks (D15) |
| Q17 | Plan click | Selects it, shows its month, marks its day (D16) |
| Q18 | `/plans/:id` route | **No**; inline detail (D9) |
| Q19 | Plan detail API used | **No**; the list returns the same fields (B11) |
| Q20 | Trail hydration | Existing `GET /api/trails/{id}`, one cached query per distinct trail, shared key with Trail Detail (D5) |
| Q21 | Synthetic Plans visible | **Yes**, alike, with no Memory messaging |
| Q22 | Add Memory | **No** — FEATURE-014 |
| Q23 | Edit Plan date | **No** (delete + create a new Plan through the journey) |
| Q24 | Drag / drop | **No** |
| Q25 | External calendar / ICS | **No** |
| Q26 | Weather | **No** |
| Q27 | Review gear | **Yes**, Upcoming only → Trip Preparation `/trails/:trailId/prepare/:tripDate` (D10) |
| Q28 | View trail | **Yes** → `/trails/:trailId` |
| Q29 | Delete Plan | **Yes** |
| Q30 | Delete confirmation | **Yes**, two-step inline (D18) |
| Q31 | Continue destination | `/plans` (D19) |
| Q32 | New calendar / date dependency | **No** |
| Q33 | URL selection state | `?plan=<id>` only, `replace` (D17); the day filter is not in the address |
| Q34 | LocalDate handling | ISO string comparisons and integer month math; no UTC parse; no time-zone setting (D21) |
| Q35 | Backend change | **None**; inspection found the API sufficient (§6) |

Out of scope (explicit): Memory bridge, Add Memory, "How was your trip?", Memory indicators; reminders, notifications, email, push, countdowns, scheduled jobs; Google / Apple / Outlook calendar, ICS, sync; week view, day agenda, year picker; drag and drop; Plan editing (date, trail, status), `PUT` / `PATCH`; recurring Plans; participants; notes; weather; Gear Readiness or gear snapshots; Plan sharing or public Plans; AI planning inside `/plans`; creating a Plan from the calendar; new Plan statuses; schema changes; a Plan lookup in the Gear Studio; 3D, animation, and Blender changes.

## 29. Blockers / Approval Items

| Id | Item | Lead recommendation |
|---|---|---|
| **U1** | Approve this specification and the decisions Q1–Q35 (§28), with backend unchanged and FEATURE-012 changed only in its Continue value | Approve |
| U2 | Navigation: add **Plans** before Gear; do **not** add a separate "Planner" link (the brand is the Planner entry today, so the order reads Planner · Plans · Gear · Memories without a header redesign) | Approve |
| U3 | Two behaviour-preserving edits outside the 013 surface: an optional `cancel` argument on FEATURE-011's `planRequest` (so the list query can be cancelled; `createPlan` unchanged), and an exported `trailDetailQueryOptions` in FEATURE-004's `useTrailDetail.ts` (one policy for Trail Detail and My Plans). Alternative: copy the options into `features/plans` and accept an uncancellable list request | Approve both |
| U4 | **Continue** goes to plain `/plans` and does not select the new Plan. Selecting it (`/plans?plan=<id>`) would need `FinishPreparation` to build the destination from the save result, a change inside frozen FEATURE-012 beyond the value | Approve plain `/plans` |
| U5 | **Review gear** opens Trip Preparation (current forecast, Owned / Missing, then Gear up), not the Studio directly, and only for Upcoming Plans | Approve |
| U6 | Accepted known limitations, no change in 013: (a) reopening the Studio shows the idle Finish row again; pressing it is a harmless `200` (011 §26.1 D); (b) Home header identity truncates further at 768–~899 px (§10.12); (c) offset paging above 50 Plans can momentarily skip a Plan if one is deleted between page reads (mitigated, §8); (d) a signed-out `/plans?plan=` returns to plain `/plans`; (e) if the viewer's local date were behind the servers', a today Plan's Review gear could be refused by the pack (single-machine dev: not reachable); (f) calendar cells narrower than 44 px at 320 px and on touch at 1024 px | Accept |
| U7 | Past Plans on synthetic trails get no Memory messaging in 013; their behaviour in the Memory bridge is decided by FEATURE-014 (011 U5) | Defer to 014 |
| U8 | Lean QA may insert Past and missing-trail Plan rows directly into `plan_db` for QA-owned subjects only (the API rejects past dates and unknown trails) | **Approved narrowed:** the missing-trail fixture only; Past via browser clock (§25.1) |

**No blockers.** With U1–U8 approved, FEATURE-013 is ready for implementation under `/feature-cycle 013-my-plans-calendar` (Recover → Scope → `frontend` → lead diff review → Lean QA → product gate).

### 29.1 Approval record (2026-10-20)

The user approved FEATURE-013: U1 (spec, Q1–Q35; no schema, status, endpoint, or service), U2 (Plans in the existing header; conceptual order Planner · Plans · Gear · Memories; no header redesign), U3 (A: cancellation in the Plan request helper; B: the minimum reusable Trail Detail query primitive; existing consumers preserved, no API-layer rewrite, no duplicate trail query logic), U4 (Continue → `/plans` only; FEATURE-012 never appends `?plan=`; save order, clip, timing, fallbacks, reduced motion, and assets untouched), U5 (Review gear → Trip Preparation `/trails/:trailId/prepare/:tripDate`, Upcoming only), U6 (limitations a and b not repaired in 013), U7 (synthetic Plans shown normally; no Memory text of any kind), U8 narrowed (DB injection only for the missing-trail fixture, QA accounts only, recorded in the checkpoint).

**Amendment A1 — pagination safety** (recorded in §8, §10.1, §10.11 PL45, §16, §22, AC-29, AC-39): `totalPages <= 10` loads all pages; `totalPages > 10`, or metadata still changing after the one restart, enters a controlled overflow / incomplete state and never renders a partial collection as complete. Also adopted: PL39 wording "Plan a trip and finish your preparation to see it here." as written in the approval.

The specification is **frozen** from this point; changes go through the lead as recorded amendments.

## 30. Implementation Record (2026-10-20)

Cycle: Recover → Scope → `frontend` → lead diff review → Lean QA → product gate (accepted 2026-10-20). `backend-api`, `ui-ux`, `three-d`, Blender: SKIPPED in implementation. Checkpoint: `.claude/state/features/013-my-plans-calendar.md`.

- **Frontend:** files as §26.1 (list in the checkpoint). Build and lint exit 0. No backend, `vite.config.ts`, or dependency change. FEATURE-012: only `continueTo="/plans"`.
- **Accepted deviations:** D-I1–D-I9 (checkpoint), notably a plans-local **Try again** button (the shared Retry button's label differs), PL11 via `aria-label`, and "N m gain" under "Elevation gain".
- **Lean QA PASS (run 1, repair cycles 0/2):** every P0 and the selected P1 criteria validated in the browser; deferred AC-29, AC-34 (time zones), AC-36 (forced colours), AC-38, AC-41, AC-42. Fixture: one injected missing-trail Plan for a QA account (U8). Observations O-1 (month after deleting a `?plan` arrival Plan) and O-2 (dev-only StrictMode duplicate) are non-blocking.

### 30.1 Product gate (2026-10-20)

**Accepted: PASS / FROZEN.** No further repair cycle and no Full QA for FEATURE-013.

- **Final behaviour.** One protected route `/plans` (no `/plans/:id`); **Plans** before Gear in both headers (the brand is the Planner entry). On entry the whole collection is read from `GET /api/plans?page=n&size=50` (refetched on every mount); more than 10 pages, or paging metadata still changing after one restart, shows the explicit incomplete state, never a partial list or calendar. Upcoming = `tripDate >= today` (nearest first, today marked Today and Ready to go), Past = `tripDate < today` (most recent first); no stored status change.
- **Calendar.** Monthly, Sunday first, 6 rows; upcoming days a solid dot, past days a hollow ring, today an outline, the selected day a solid fill; a count from two Plans; days without Plans inert; month changes send no request; no calendar dependency.
- **Plan ↔ calendar.** A day with one Plan selects it; with several the list narrows ("N plans on {date}", Show all plans) and the result is announced; focus stays on the day. Selecting a Plan shows its month and marks its day. `?plan=<id>` keeps a user selection across reload and Back; Continue enters plain `/plans`.
- **Trails.** One cached trail-detail query per distinct trail (the Trail Detail contract); a `404` shows "Trail unavailable" (Delete only); another failure affects only that Plan and offers Try again. No trail snapshot in the Plan.
- **Actions.** View trail → Trail Detail; Review gear (Upcoming only) → `/trails/:trailId/prepare/:tripDate`; Delete plan: two-step inline confirmation, Cancel first, `204`/`404` = removed, list and calendar update without reload, failure keeps the Plan and the confirmation, retry possible, focus restored; backend soft delete unchanged.
- **States.** No Plans: "No plans yet." + Plan a trip → `/home`, no calendar; no Upcoming: "No upcoming plans." with Past kept; no Past: section omitted; list failure: "Your plans couldn't be loaded." + Try again, never the empty state.
- **Isolation.** A → sign out → B in one tab exposed none of A's Plans, marks, selection, or details at any moment; cross-user read and delete remain `404`.
- **LocalDate.** No UTC parsing of Plan dates, calendar-day classification, no time-zone settings, no midnight scheduler.
- **FEATURE-012.** Only Continue `/home` → `/plans`; FEATURE-012 stays frozen.
- **Polish backlog (non-blocking, not repaired):** (A) arriving with `?plan=` and deleting that Plan returns the calendar to its default month instead of staying on the deleted Plan's month; (B) the detail's elevation reads "370 m gain" under "Elevation gain" (copy duplication); (C) the earlier accepted limitations: reopening the Gear Studio can show Finish preparation again (idempotent), and the signed-in name truncates more tightly around 768–900 px.
- **Deferred / not run (not passed, not defects):** a 50+ Plan browser dataset; forced colours / high contrast; 390 / 320 px; unusual month boundaries; midnight with the page open; time-zone emulation; real screen reader; Safari; physical phones.
- **QA data left in place:** accounts `otc-qa-f013-a-8d16d1` and `otc-qa-f013-b-8d16d1` (@example.test); Plans created through the API and the real Finish preparation, two of them soft-deleted; one QA-only missing-trail fixture inserted directly into `plan_db` (id `eff5ed7b-d514-47c5-8278-a7425c67440f`). No migration or seed change; no product backdoor. Cleanup not required.
- **Design system:** not updated. The itinerary list and month calendar are page-specific to My Plans; §10.13's proposal stays recorded here for a future reuse.
- **Next:** FEATURE-014 Plan → Memory Bridge (final product feature). Not started.

