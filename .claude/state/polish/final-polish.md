# Post-regression polish + demo preparation

Phase: POST-REGRESSION POLISH + DEMO PREPARATION (started 2026-10-19). Feature freeze active; no FEATURE-011; no new domain; no commit/push.
Source of truth: `.claude/state/final-regression.md` (COMPLETE, BLOCKER 0, HIGH 0).

## 1. trail-service tests
- `mvn -B -q -pl trail-service test` from `Project/Backend`, with `Project/.env` (the Docker/IntelliJ Postgres settings) loaded into the test process only; no value printed, no DB reset, no test changed.
- Result: exit 0, **27 / 27 PASS** (TrailControllerTest 1, TrailPublicApiTest 14, TrailCatalogVisibilityTest 4, TrailActivityServiceTest 3, TrailServiceApplicationTests 1, TrailServiceTest 4). The 5 previously unrun DB-backed tests pass. A stale `ProbeTmpTest` report dated 2026-10-14 sits in `target/surefire-reports` with no source file; not counted.
- Backend totals: user 21/21, trail 27/27, recommendation 51/51, memory 95/95 = 194/194.

## 2. Work streams
- P-A frontend: D2 (Discover keyboard entry), D7 (drag released over popup), favicon — `features/discover/**`, `index.html`, `public/`.
- P-B frontend: D9 (Community Retry focus/status/count), D6 (<768 editor Save/Cancel order) — `features/community-memories/**`, `features/memories/**`.
- P-C data (qa agent, app/API only): demo-data cleanup, clean PUBLIC Quarry Rock Memories, demo account with gear.

## 3. Results

### D2 — Discover keyboard entry (P-A)
- Finding: the trail search field (added during regression) already renders before activation and is the next Tab stop after Pause; focusing it started activation, but Tab entry only scrolled the field into view (Discover top at 310 px at 1440×900).
- Fix: `features/discover/components/DiscoverSection.tsx` — the search field's engage handler, when the map is not yet requested, also aligns Discover under the header with the same `align()` as Explore trails (instant under reduced motion). No new element, no Hero change. Only keyboard/AT focus can reach it before activation (any visible pixel activates via the observer), so mouse clicks never scroll.
- Agent verification: idle Hero 5 s at 1440/1920/1024(reduced motion)/390 → 0 map chunk, tiles, `/nearby`, catalog; Tab (6 stops, 5 at 390) → Discover aligned, focus kept, map + 50 rows, 2 `/nearby` (default region + first view), 1 catalog; mouse click after scroll → no jump. **Targeted QA: PASS** (idle Hero 0 requests at 1440/1920; Tab → field, Discover top 72 = header, focus kept, 2 `/nearby`, 1 catalog; quarry → Enter → popup + row focus; reduced motion instant; mouse no jump; Explore trails / header Discover unchanged).

### D7 — drag released over the popup (P-A)
- Root cause: MapLibre 6.14's mouse-pan handler ends a drag only on a `mouseup` at its canvas container; its document listener is routed as `mouseupWindow`, which pan doesn't implement, so a release over the popup/list/other UI leaves the drag open until the next mouse move.
- Fix: `features/discover/map/runtime/trailMapRuntime.ts` — one capture-phase document `mouseup` listener (removed in `destroy()`): only when `map.dragPan.isActive()` and the release is outside the canvas container, it re-dispatches a non-bubbling `mouseup` to the container so MapLibre ends the drag normally (inertia → moveend → existing 250 ms settle). Settle architecture and request frequency unchanged.
- Agent verification: release over popup 0→1 `/nearby`, over list 0→1, canvas 1; popup text selection and buttons fine. **Targeted QA: PASS** — release over popup, canvas, list row, zoom button, attribution link → 0 during drag, exactly 1 after settle, 0 on a later move, drag mode ended; popup text selection/Close/Sign in fine; plain canvas click no-op; cluster click splits with 1 request.

### D9 — Community Retry polish (P-B)
- Root causes: (1) TanStack Query v5 resets a dataless query to `pending` on refetch, so every Retry swapped the failed block for its skeleton, unmounting Retry → focus to `<body>`; nothing placed focus on success. (2) The panel's "announce first result once" flag was boolean, so after an announced failure the recovery was never announced and "unavailable" stayed; the Detail's failure text also stayed. (3) The header preferred the disabled list's cached total over the newer preview total while a Detail was open.
- Fix (`features/community-memories/components/`): `CommunityPreview.tsx`, `CommunityList.tsx`, `CommunityDetail.tsx` keep the failed block during a visitor-started Retry ("Trying again…", focus kept) and on success move focus to what replaced Retry (first row/entry, View all, or heading `tabIndex=-1` for an empty result; Detail → title h4) only if focus was on Retry/body/inside the block; `CommunityPanel.tsx` announcement state `null | failed | settled` (recovery announced once, replacing stale text; Detail clears it via `silence`); header count = newer of list and cached preview by `dataUpdatedAt` (no extra request).
- Agent verification: 21/21. **Targeted QA: PASS** (SIMULATED 503s): preview Retry keeps focus while failing, success → first row (zero trail → h5 tabindex -1); list rail + sheet → first entry, status "" → unavailable → "" → "2 memories" once each; Detail → title, status cleared, Back → entry; Show older (simulated 10 items) → 9th entry, "2 more memories shown"; header count follows newer preview with a Detail open, 0 list requests; request budget unchanged.

### D6 — editor footer order <768 (P-B)
- Root cause: `memories.css` `column-reverse` below 768 → Save above Cancel visually, Cancel first in DOM.
- Fix: `features/memories/components/MemoryEditor.tsx` renders the footer buttons in each width's visual order via the existing `useMediaQuery("(width < 768px)")` (narrow: Save, Cancel; ≥768: Cancel, Save); `memories.css` `column-reverse` → `column`. Keeps spec §22.12 narrow "Save first" and the desktop Cancel | Save; no CSS reordering. The "photos incomplete" footer follows the same rule.
- Agent verification: Create + Edit at 390/767/768/1024 → DOM = visual = Tab order. Not verified in browser: photos-incomplete footer, edit "wait for photos" note. **Targeted QA: order PASS** at 390/700/767/768/1024 (DOM = visual = Tab, 2 buttons). **LOW defect found (introduced by this fix):** focus on Cancel → resize across 768 → `<body>` (Cancel remounts in a different JSX slot). Repair cycle 1 (frontend, `MemoryEditor.tsx` only): a `useFooterFocusAcrossFlip` hook remembers a footer control blurred by the flip (focusout on the always-mounted footer, cleared next microtask) and refocuses its counterpart in a layout effect keyed on the breakpoint; an ordinary blur is never pulled back. Stable keys alone don't help (moving a focused node blurs it in Chrome 155). Agent verification: Cancel/Save focus kept across 1024→767→768→390→1024 on new + edit; blank-click then resize stays on body; order checks pass; negative control confirmed the test catches the bug; build 0, lint 0. Re-check in the final smoke: **PASS** (Cancel/Save focus kept through 1024→767→768→390→1024 on new + edit; order consistent; no PUT).

### Favicon (P-A)
- `public/favicon.svg` (new, 3 lines: ink rounded square, paper two-peak mountain) + `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in `index.html`. 200 `image/svg+xml`; copied to dist. **Targeted QA: PASS** — only favicon.svg requested on `/`, `/home`, `/memories`; no `/favicon.ico` 404.

### Targeted QA (polish) also
- build 0, lint 0; no JS errors (known SSO iframe warning; simulated 503 resource errors only).
- New LOW (search polish, backlog): after a search pick the focused row is sometimes scrolled under the list header (2 of 10 runs; list shrinks 50 → 11 and scrollTop is clamped). Popup correct and visible. Timing race in the search-pick reveal; not caused by D2.

## 4. Demo data (P-C, app UI / owner API only; nothing deleted, no SQL, no code)
- QA PUBLIC → PRIVATE (11, full-replacement PUT, only visibility changed): QA-4 N1–N8 on Quarry Rock (8990ebe1, dcefb2d8, 749b5c2a, 8b493418, f1f6c9da, b223668e, 7917dbc4, 4f9e032f) and G1 on Garibaldi (cfd9d260); FEATURE-010 QA "QA Public 1" f9529fd5 (the missing-photo one) and "QA Public 2" eb89cfc8. 0dd5026e already PRIVATE.
- Public audit after (tokenless, all 8 curated trails): Quarry Rock 2 (both demo); every other curated trail 0. No unknown public owner.
- Demo account: username `demo-hiker` (Alex Rivera, demo.hiker@example.test), registered through the app; password only in the session scratchpad `demo/demo-account.txt` (never in the repo).
- Gear (6, via My Gear): Osprey Talon 22 BACKPACK; Arc'teryx Beta Rain Jacket RAIN_GEAR; Merrell Moab 3 Hiking Shoes FOOTWEAR; Nalgene 1L Water Bottle WATER; Petzl Tikka Headlamp HEADLAMP; Black Diamond Trail Poles TREKKING_POLES.
- Memories (demo-hiker, created in the editor, one photo each where used; photos are existing hero artwork, 1672×941 PNG, stylised, not real photos):
  - b3eefd51 "Rainy Morning at Quarry Rock", 2026-09-27, PUBLIC, scene2 (rainy forest)
  - b2dd5663 "Weekend Hike with Friends", 2026-08-22, PUBLIC, scene1 (alpine lake)
  - 49e5c1b2 "Clear Water at Lindeman Lake", 2026-10-11, PRIVATE, no photo (scene3 snowy summit didn't fit)
- Preparation for tomorrow (live weather, re-check on demo day): Quarry Rock 100% (nothing Missing); Garibaldi Lake 75% (Food Missing — baseline, weather-independent); Misty Summit Path (planner) 83% (Warm layer Missing); Joffre 60%; Lindeman 67% (weather-dependent).
- Planner (Tomorrow, Use Vancouver): "A moderate forest hike with a viewpoint, about two hours" → Raven Grove Traverse, **Quarry Rock**, Larch Grove Circuit (5.3 s); "I want a moderate hike with a lake view, under 10 km" → 3 generated trails (5.9 s); follow-up "Something more challenging: a hard full-day hike to a lake with mountain views" → Grouse Grind, Misty Summit Path, Silver Ridge Route (3.7 s).
- Studio: equip Backpack, Trekking poles, Headlamp → all three on the avatar (canvas screenshot viewed by the agent).
- Presenter notes (LOW, not fixed): New Plan clears the trip date (starting point kept) — set it again before sending; "full-day" in a follow-up did not replace an earlier 120-min duration (results still sensible); Studio loadout is per browser session (starts empty).

## 5. Final compact smoke (demo-hiker, 1440×900, Playwright fallback): PASS 13/13
Landing (0 map/nearby idle) → Explore trails (408, clusters) → search Quarry → popup → Community 2 demo Memories, photos 200, View all → Detail → Close (focus View all) → Garibaldi → Sign in to plan → Keycloak → Trail Detail → Tomorrow → Preparation 75% Food Missing → Studio (backpack, poles, headlamp on avatar; canvas viewed) → planner prompt → Raven Grove Traverse, Quarry Rock, Larch Grove Circuit (4.7 s) → "Why this trail" 99/100 → My Gear 6 items → My Memories 3 (Lindeman Private, 2 Quarry Public) → Community loop (public Quarry 2, Lindeman 0) → D6 re-check → sign out. No 4xx/5xx, no JS errors, Bearer only on authenticated calls, favicon.svg only. build 0, lint 0. No demo data changed.
- Info (accepted, not a defect): the idle Hero makes one `GET /api/trails/activity` (DiscoverSection mounts under the Hero). Matches QA-1's regression note ("only /activity early, allowed"); PRD §44's constraint is on map code, tiles and nearby requests.
- Console tech debt: `THREE.Clock` deprecation warning from the avatar runtime (known since QA-2).

## 6. Demo journey (≈ 7 min with narration; essential path machine time ≈ 27 s + planner ≈ 5 s + typing sign-in ≈ 15 s)
| # | Step | Est. | |
|---|---|---|---|
| 1 | Signed-out Landing: Hero, slogan | 30 s | essential |
| 2 | Explore trails → Discover map + list | 20 s | essential |
| 3 | Search "Quarry" → Quarry Rock popup (facts, Sample activity) | 30 s | essential |
| 4 | Community Memories: 2 demo Memories → View all → open "Rainy Morning at Quarry Rock" → Close | 60 s | essential |
| 5 | Search "Garibaldi" → Sign in to plan this trip → sign in as demo-hiker → Trail Detail | 45 s | essential |
| 6 | Tomorrow → Choose this trail → Preparation (75%, Food Missing; Owned vs Missing) | 45 s | essential |
| 7 | Gear up → Studio: equip Backpack, Trekking poles, Headlamp → avatar | 60 s | essential |
| 8 | Brand link (→ /home) → planner, Tomorrow + Use Vancouver: "A moderate forest hike with a viewpoint, about two hours" → Quarry Rock among results | 75 s | essential (opening a result optional) |
| 9 | Gear → My Gear (6 items) | 20 s | optional |
| 10 | Memories → 3 Memories (Private vs Public) → the Quarry Public one is what Discover showed in step 4 (the loop) | 40 s | essential |
| — | Optional: second planner turn; Lindeman → Edit → Public live (set back after); photo reorder; deep map exploration | — | optional |
Presenter notes: header has no "Home" label (brand → /home); New Plan clears the trip date; set Tomorrow and "Use Vancouver" before sending; Studio loadout starts empty per session; re-check Preparation on demo day (live forecast; Garibaldi's Food gap is weather-independent); in dev a lazy route shows the dark background for ~0.5 s.

## 7. Exit status
- trail-service 27/27; backend 194/194. Demo data clean; Quarry Rock path reliable (search). D2, D7, D9, D6 fixed + Targeted PASS (D6 after 1 repair cycle); favicon fixed. build 0, lint 0. No new BLOCKER/HIGH. Demo account ready. Demo ≈ 7 min. Deployment blockers separated (below). → READY FOR FINAL DEMO PREPARATION.
- Remaining LOW/POLISH backlog: D3 (cluster split), D4 (first count announcement), O2 (Trail Detail scenery line), limitation A (1920 zoom-in line), search-pick row occasionally scrolled under the list header (2/10), New Plan clears trip date, follow-up "full-day" not replacing an earlier duration, THREE.Clock deprecation, popup's own Community count not newer-wins (hidden while panel open), demo M2 photo is an alpine-lake artwork (swap with real photos if available).
- NOT RUN: real screen reader, Safari, physical phones.

## 8. Files changed in this phase (none committed; feature folders are untracked so `git diff` won't show them)
Production: `Project/Frontend/src/features/discover/components/DiscoverSection.tsx` (D2), `features/discover/map/runtime/trailMapRuntime.ts` (D7), `features/community-memories/components/CommunityPreview.tsx`, `CommunityList.tsx`, `CommunityDetail.tsx`, `CommunityPanel.tsx` (D9), `features/memories/components/MemoryEditor.tsx`, `features/memories/memories.css` (D6 + repair), `Project/Frontend/index.html`, `Project/Frontend/public/favicon.svg` (new).
Docs/state: `.claude/state/polish/final-polish.md` (new), `docs/FRONTEND_CONTEXT.md` (§12 limitation B marked resolved).

## Deployment blockers

None of these blocks the local classroom demo (dev server + IntelliJ services + Docker). They block a production deployment.

| # | Item | DEMO-BLOCKING | PRODUCTION-BLOCKING | Note |
|---|---|---|---|---|
| 1 | `/api/memories/**` routing (owner + public + signed local photos) to memory-service | No (Vite dev proxy) | Yes | Only the dev proxy exists; `npm run preview`/a deployed build has no route |
| 2 | Production Memory photo storage (S3 bucket, IAM, absolute presigned URLs) | No (local filesystem adapter) | Yes | S3 adapter tested offline only; local adapter is development-only |
| 3 | API gateway (:8080) routes / security | No | Yes | Gateway is an empty shell; frontend relies on 5 dev-proxy entries |
| 4 | CORS beyond `http://localhost:5173` | No | Yes | CORS only on trail-service, localhost only |
| 5 | Exclude devtools / stack traces from error bodies | No | Yes | IntelliJ runs include devtools; trail-service 400 bodies carry `trace` |
| 6 | Environment variables / secrets (POSTGRES_*, OPENAI_API_KEY, VITE_KEYCLOAK_*, VITE_API_BASE_URL, memory-service signing key / public-base-url) | No (local `.env`, IntelliJ run configs) | Yes | Need a secret store and per-environment config; no secret in the repo |
| 7 | Keycloak production config: redirect URIs, post-logout URI, web origins for the production origin; realm export | No | Yes | Realm is configured by hand; no export checked in; same-site cookie needed for silent restore |

Demo prerequisites (local): Docker (Postgres, Keycloak), user/trail/recommendation/memory services from IntelliJ, Vite dev server :5173, network access for OpenAI, Open-Meteo, and OpenFreeMap tiles.

## Performance (recorded, not optimised)
Regression observations accepted: Discover ~300 DOM nodes, 0 long tasks, ~16.7 ms median frame; planner 3.5–5.4 s per turn; clustering; Memory pages don't preload galleries; map and 3D chunks lazy. Known build warning: two chunks > 500 kB (AvatarRuntime ~803 kB / 213 kB gz, trailMapRuntime ~1,039 kB / 283 kB gz), both lazy; no manual chunk splitting.

## Future work (POST-CAPSTONE, not implemented)
Trips / Calendar, notifications, reminders, social features, GPX, AI recap/video — out of the freeze.
