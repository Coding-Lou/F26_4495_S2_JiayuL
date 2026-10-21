Workflow: FINAL FULL REGRESSION (PRD §48; feature freeze active; not a feature cycle)
Branch: Dev_Frontend
Started: 2026-10-18
Status: COMPLETE (2026-10-19) — exit criteria met; READY FOR POLISH / DEMO PREPARATION (caveat: 5 DB-backed trail-service tests not run, environment)
Mode: FULL (user-requested) — grouped journeys; P0 all, practical P1, representative P2
Commit / push: NONE (user instruction)
Production code changed: R2 (DiscoverSection.tsx close focus, D1); plus one backend TEST file repaired (R1)

## Environment

- Frontend: Vite dev server :5173 (pid 86555, already running, reused)
- Keycloak :8180 (docker outdoor-keycloak), Postgres/PostGIS :5432 (docker outdoor-postgres); volumes and databases untouched
- user-service :8081, trail-service :8082, recommendation-service :8083: already running from IntelliJ (devtools); reused
- memory-service :8085: down at start; the lead may not read DB credentials, so the user starts it from IntelliJ (user decision, 2026-10-18)
- activity-service :8084: not running, not required (Daily Trail Activity is served by trail-service)
- Data: trail-service live: catalog 8 DEMO_SEED (none EASY), /nearby 150 km from Vancouver = 408 (400 SYNTHETIC_DEMO + 8)
- Browser tooling: Chrome DevTools MCP not configured (.mcp.json has only blender) → qa uses the Playwright fallback (Python, channel="chrome", scratch venv)
- Safari: no Playwright WebKit installed; safaridriver present but remote automation not known to be enabled

## Build / static

- Frontend `npm run build` (tsc -b + vite build): exit 0. Only the known >500 kB chunk warning (AvatarRuntime 803 kB / 213 kB gz, trailMapRuntime 1,039 kB / 283 kB gz)
- Frontend `npm run lint`: exit 0
- Backend tests (`mvn -B -fae -pl user-service,trail-service,recommendation-service,memory-service test`, wrapper Maven 3.9.16):
  - user-service: 21 run / 21 pass / 0 fail / 0 skip
  - trail-service: 27 run / 22 pass / 0 fail / 5 errors / 0 skip. All 5 are ApplicationContext load failures (TrailServiceApplicationTests.contextLoads, TrailCatalogVisibilityTest x4): Flyway cannot authenticate because POSTGRES_USER/PASSWORD are not set in the lead's shell (`password authentication failed for user "${POST…`). INFRASTRUCTURE, not functional. The lead may not read DB credentials; these DB-backed tests need the user's env (IntelliJ run config) to execute. NOT RUN functionally.
  - recommendation-service: 51 run / 50 pass / 1 FAIL → RecommendationControllerTest.shouldReturnPackRecommendation expected 200 got 400: the test hardcoded tripDate 2026-10-17, now past; pack validates @FutureOrPresent. TEST DEFECT (time bomb), not a product regression. Repaired (R1). Re-run: 51 / 51 pass, exit 0.
  - memory-service: 95 run / 95 pass / 0 fail / 0 skip
  - Weather resilience + bound (journey D2): covered by passing RecommendationServiceTest.shouldLookUpWeatherOnlyForTheHardFilteredShortlist (WEATHER_SHORTLIST_SIZE = 15), shouldKeepRankingWhenOneWeatherLookupFails, shouldStillRecommendWhenEveryWeatherLookupFails; PackRecommendationServiceTest.shouldReturnBaselineGearWhenWeatherServiceFails

## Regression matrix (built from the frozen checkpoints 001–010 and their deferred lists)

| # | Journey | Priority focus | Batch | Result |
|---|---|---|---|---|
| A | Public Landing: `/`, Hero media/posters, header, Explore trails, no planner composer, lazy map, reduced motion; 1440/1920/1024 | P0 + 006 deferred AC-04/08/09 | QA-1 | PASS (QA-1) |
| B | Discover: public /nearby, clustering, list/count, shared selection, settled requests, stale-safe, cache, wheel vs Ctrl+wheel, sample disclosure, synthetic activity neutral, popup collision; wide-screen limitation A | P0 + 006 deferred | QA-1 | PASS functional (QA-1); a11y defects D1, D2 |
| C | Auth: protected routes → gate → sign in → return destination; bad password; reload restore; logout; Back after logout | P0 | QA-2 | PASS (QA-2) |
| D | Planner: EASY+FOREST+short; MODERATE+LAKE+distance; HARD+MOUNTAIN+VIEWPOINT; multi-turn; synthetic in results; weather shortlist ≤ 15 | P0 | QA-2 | PASS (QA-2) |
| D2 | Weather failure resilience (one lookup fails → turn completes) | P1 | automated test evidence | PASS (unit tests) |
| E | Trail Detail: curated (Add a memory present) vs synthetic (sample notice, no Add a memory) | P0 | QA-2 | PASS (QA-2) |
| F | Preparation: weather, Recommended/Owned/Missing, readiness, Gear up | P0 | QA-2 | PASS (QA-2) |
| G | My Gear: CRUD, same-category multiples, reload, detail panel, icons; cross-feature with Studio | P0 | QA-2 | PASS (QA-2) |
| H | Gear Studio: equip, one per category, avatar, removal in My Gear reconciles | P0 | QA-2 | PASS (QA-2) |
| ISO-G | Gear account isolation A → B (UI + cache) | P0 | QA-2 | PASS (QA-2) |
| I | My Memories: create (trail, ?trail=, future date, title, story, photos, PRIVATE default, sequential uploads), detail, edit, reorder/cover, visibility, delete, reload | P0 | QA-3 | PASS (QA-3); D5 FIXED (R3) |
| I2 | My Memories pagination (>12) | P1 (009 deferred) | QA-3 | PASS (QA-3; incl. Show older failure + Try again) |
| I3 | Partial-upload failure | P1 | QA-3 | PASS (QA-3; 1 POST, Retry → reorder; View memory path) |
| I4 | Signed photo URL failure → one refetch, no loop | P1 (deferred) | QA-3 | PASS (QA-3; fresh 0 refetch, aged exactly 1, no loop) |
| ISO-M | Memory account isolation A → B; PRIVATE unavailable publicly | P0 | QA-3 | PASS (QA-3; UI, cache, API 404, public 404) |
| I5 | My Memories <768 narrow view; Save/Cancel order | P2 (deferred) | QA-3 | PASS (QA-3); D6 LOW: <768 Save visually first, DOM/Tab order Cancel first |
| J | Community Memories: popup preview, View all rail, Detail, nav (in-app Back, Escape, browser Back, refresh, invalid params), close restores popup | P0 | QA-4 | PASS (QA-4) |
| J2 | Community pagination (≥ 9 PUBLIC on one curated trail) | P1 (deferred) | QA-4 | PASS (QA-4; 12 → 8 + Show older 4, no dupes) |
| J3 | Community error states: list, Detail, Show older failure | P1 (deferred) | QA-4 | PASS (QA-4) |
| J4 | PUBLIC → PRIVATE transition (preview, View all, direct Detail URL) | P0 (deferred) | QA-4 | PASS (QA-4; incl. open Detail refetch after stale+refocus) |
| J5 | Synthetic trail: no public Memory request, no Community section | P0 | QA-1 | PASS (QA-1) |
| J6 | 1024×768 popup/rail; <1024 modal sheet | P1/P2 (deferred) | QA-4 | 1024/1920 PASS; <1024 sheet: D8 FIXED (R4), Targeted PASS on dev server and production build |
| X1 | Reduced motion (Hero, Discover, My Gear, My Memories, Community) | P2 (deferred) | QA-1/3/4 | PASS (emulated; QA-1/3/4 + search polish) |
| X2 | Keyboard journey | P1 | spread across batches | PASS (D1, D5 fixed; D2 accepted limitation; LOW D9) |
| X3 | Real screen reader | P2 | — | NOT RUN (ARIA checked in DOM only) |
| X4 | Safari | P2 | — | NOT RUN (no WebKit; safaridriver not enabled) |
| X5 | Performance smoke | P2 | QA-1/2/4 | PASS (dev server) |
| X6 | Console / network health | P0 | all batches | PASS (no JS exceptions; known SSO iframe + favicon warnings; known missing Quarry photo file) |

## Known deployment blockers (not app regressions)

- Production routing for `/api/memories/**` (owner + public) to memory-service; only the Vite dev proxy exists
- No S3 bucket / IAM / production Memory storage config; local filesystem adapter is development only
- API gateway (:8080) has no routes, security, or CORS; frontend relies on 5 dev-proxy entries; CORS only on trail-service
- A deployed build must not include devtools (stack traces in error bodies)

## QA-2 result (authenticated Plan → Prepare → Gear): PASS

- Tooling: Playwright fallback (headless Chrome 155, channel chrome), one long-lived driver. memory-service was down (only effect: 2× 502 on the Discover popup's public preview, out of batch).
- C Auth: gate on /home, /gear, /memories, /memories/new (+?trail=) → `/` with gate, never Keycloak; return to /memories/new without ?trail=; wrong password → Keycloak error, no session; reload /gear restores silently; sign-out notice; Back after sign-out shows gate (bfcache disabled in Playwright: NOT VERIFIED); popup "Sign in to plan this trip" → /trails/<Quarry Rock>.
- D Planner (5 turns, all 200, Bearer): EASY+forest+<2 h → 3 EASY synthetic with FOREST (3.5 s / 5.4 s); MODERATE+lake → +max 10 km → 3 MODERATE LAKE ≤ 7.9 km; HARD mountain+viewpoint → 2 synthetic + Grouse Grind, all HARD with MOUNTAIN+VIEWPOINT (4.3 s). Context carried; no EASY no-match regression; synthetic in results. Weather-call count not observable in browser (unit-tested bound 15).
- E Trail Detail: synthetic → sample notice, no Add a memory, Why this trail 84/100; curated (Grouse Grind, Lindeman) → Add a memory → /memories/new?trail=<id>.
- F Preparation: pack 200 (0.9 s), Owned/Missing rows, readiness 0% / 75%, forecast, Gear up.
- G My Gear: empty state, 8 POST 201 (two BACKPACK), PUT 200, DELETE 204 with inline confirm, reload persists, detail panel, icons; SIMULATED 503 → unavailable + Try again (not empty), recovers.
- H Gear Studio: My Gear items Owned; equip backpack/poles/headlamp/food (canvas screenshot opened by the lead: backpack, poles, headlamp on avatar); one-per-category replace; Studio Add gear → My Gear; deleting both backpacks in My Gear → Studio shows Backpack Missing, loadout entry dropped, no pack on canvas; unequip removes from canvas.
- ISO-G: A sign-out clears session storage; B in same context sees none of A's items (DOM, Studio, API); distinct Bearer subjects; A back sees own items only.
- X: keyboard through gate, /home, My Gear dialog/panel/remove (focus return correct), Studio (no trap, visible ring); reduced motion (/home poster only, /gear usable); 1920 + 1024 sweep no overflow.
- Console: known only (silent-SSO sandbox warning, THREE.Clock deprecation, favicon 404) + simulated 503 + environmental 502. Network: 121 API calls, 0 unexpected 4xx/5xx, all 66 authenticated calls Bearer, 55 public reads tokenless, no loops.
- Accounts: otc-qa-fr2-a-47ce, otc-qa-fr2-b-037b (@example.test); gear data listed in qa2/progress.md (scratch).
- Observations: (O1, LOW/demo) in the default Discover view no curated trail is among the 50 nearest list rows (400 synthetic trails crowd them out); curated trails remain on the map and reachable by zoom/selection — approved viewport behaviour, demo-script note. (O2, POLISH, ui-ux) Trail Detail opened without planner context shows no scenery line though the API returns scenery (matches 004 AC-07; PRD 11.2 lists scenery).

## QA-1 result (signed-out Landing + Discover): functional PASS; 2 MEDIUM a11y

- Tooling: Playwright fallback; a read-only test hook exposed the MapLibre instance (route-rewritten dev module, in-browser only) for coordinates/cluster leaves; all state changes by real input. memory-service down the whole run (popup Community section showed "Community memories are unavailable." + Retry; popup/list/map kept working — incidental J3-popup evidence).
- A: poster at 0.6 s, video plays/rotates, Pause/Play, fixed header, Explore trails → Discover (route stays /, focus h2), no textarea/input/form on `/`, 0 map/tile/nearby/3D requests before activation (only /activity early, allowed); reduced motion: 0 mp4, posters, instant jump; 1920/1024 no overflow. Static dist check: entry + DiscoverPage chunks contain no three/GLTF/maplibre.
- B: 0 HTML markers; cluster numbers = leaf counts (4 checked) and splits sum to parent; "408 trails in this area", 50 rows + selected; shared selection (replace history); 1 request per drag (0.32 s after mouse-up), 3 quick zooms → 1, return view cached → 0, 10 pans + 2 zooms → 6; SIMULATED late stale response ignored; plain wheel scrolls page + hint, Ctrl/⌘+wheel zooms; popup content/no link/edge flipping; SIMULATED persistent 503 → alert + Retry, never "0 trails", recovers. Limitation A at 1920×1080: STILL SHOWS (not at 1440). 1024×768 popup reachable, no trap.
- J5 synthetic: sample disclosure, "Today's activity isn't available.", no Community section, 0 /api/memories/public requests; `memories=1` dropped.
- X keyboard: rows, popup actions, Escape/Close → row, canvas one stop with arrow pan and +/- zoom; ARIA semantics OK. REAL SCREEN READER — NOT RUN.
- P: 298 DOM nodes, 0 long tasks over 10 drags + 2 zooms, rAF median 16.7 ms.
- N: no uncaught errors; public requests carry no Authorization and no cookie; known warnings only + environmental 502.

## QA-3 result (My Memories + Memory isolation): PASS except one MEDIUM a11y (D5)

Accounts: otc-qa-fr3-a-8495 / otc-qa-fr3-b-8495 (@example.test; creds in scratchpad qa3/creds.json). Trails: Lindeman Lake, Dog Mountain. A: 16 Memories left (all Private; ids in qa3/progress.md); B: 939ab335-… (Dog Mountain, Public ~1 min as positive control, now Private). 3 soft-deleted.
- I: empty state, signed-out gate + return destination, ?trail= preselect (malformed/unknown/synthetic → nothing + message), picker = 8 curated only, validation (future date, title 120, empty), Private default; create with 3 photos: exactly 1 POST (double-click), sequential uploads, multipart `file`, orientation upright, PNG alpha kept; server sanitisation verified on raw API uploads with EXIF+GPS → stored bytes have none; Detail, Edit (one PUT, no trailId; reorder PUT; remove cover; Save disabled while uploading), Delete (204 → /memories, notice, focus h1), reload persists. PASS.
- I2 15 Memories → 12 + Show older (page=1, server order, no dupes, focus first new card); page=1 503 → alert + Try again (1 auto retry) → recovers. PASS.
- I3 2nd upload 503 → "Memory saved, 2 of 3 photos added" + Retry/Remove; no second POST; Retry → photo POST + reorder PUT → Detail. PASS.
- I4 photo URLs 403: fresh result 0 refetch → fallback; aged (~67 s) exactly 1 detail refetch → fallback; no loop over 30 s. PASS.
- ISO-M: B sees nothing of A (DOM watcher, neutral not-found, API 404 GET/PUT/DELETE); A's PRIVATE public GET 404 and absent from public list; B Public→Private positive control. PASS.
- I5 390×844 / 700×900 no horizontal scroll; leave dialog bottom sheet. Footer: desktop Cancel | Save (DOM = visual); <768 Save on top, Cancel below (spec "Save first" met visually) but DOM/Tab order Cancel → Save (D6 LOW).
- Reduced motion PASS; keyboard PASS except D5; network: 115/115 owner calls Bearer, 0 on trail reads and signed photos; no map/3D/media chunks on Memory pages; console clean (only simulated-failure resource errors + known SSO iframe warning). Storage: no localStorage/cookie; no title/URL stored.
- NOT RUN: Safari, real screen reader, phones, classic scrollbars, production-build chunk names, MM142 upload line in leave dialog, Remove path in partial-upload state.

## QA-4 result (Community Memories): PASS except D8 (MEDIUM, dev-server sheet)

Account otc-qa-fr4-a-e184 (@example.test; creds in scratchpad qa4/creds.json). Quarry Rock now 10 PUBLIC (8 new N1–N8 + the 2 existing); N9, N10 made PRIVATE; Garibaldi 1 PUBLIC (G1); ids in qa4/created.json.
- J popup section order, count, 2 rows, View all → rail (popup hidden+inert), Detail, Escape/Back/Close/browser Back/refresh/invalid params, stale safety, no author/owner/social UI; existing PRIVATE 0dd5026e never shown. PASS.
- J2 12 → 8 + Show older (1 request, 4 appended, no dupes, server order). J3 preview/list/Show older/Detail 503 + Retry, 404 and trailId mismatch → unavailable; never zero. J4 PUBLIC→PRIVATE gone from preview/list/count/direct URL; open Detail refetches after stale+refocus → unavailable. J5 synthetic 0 requests. PASS.
- J6 1024×768 rail 360, controls clear; 1920 rail 440. 900×768 / 390×844: D8 (dev server only); production build sheet PASS (modal, focus, Escape order, backdrop, Back, 92dvh).
- Keyboard, reduced motion, request budget, lazy covers / no gallery preload, signed-URL recovery (fresh 0, aged 1, no loop), no Authorization/cookie on public calls: PASS. Console: no JS exceptions.
- LOW observations: focus to <body> after a successful Retry; stale "unavailable" text left in the status region after recovery (not re-announced); deep-linked Detail focus on body (accepted); header count stale while Detail open until Back.
- NOT RUN: screen reader, Safari, phones, >15 min session, expired-urlExpiresAt clause of AC-23.

## Defects

- D1 MEDIUM (a11y, frontend) — Closing the popup of the selected-only extra row ("row 51", e.g. `/?trail=<Quarry Rock>` or a map point outside the 50) loses focus to <body> (006 §16.15.2 expects the row). Decision: FIX. Repaired (R2, 2 cycles) — FIXED, Targeted PASS.
- D2 MEDIUM→ accepted limitation (a11y, ui-ux decision) — Before Discover activates, Tab goes header → Explore trails → Pause and leaves the page: the list has no rows until activation (by design of the lazy, viewport-driven Discover; PRD 44 forbids a nearby request before activation). Keyboard paths exist (Explore trails, header Discover). Decision: NOT FIXED in regression (would need a design decision, e.g. activate on focus entering the section); polish backlog.
- D3 LOW/POLISH (frontend) — A cluster click does not always visibly split: the settled view's new nearby response re-clusters (observed 1 of 4 trials); counts always correct; second click splits.
- D4 LOW/POLISH (frontend/ui-ux) — The polite status announces the default-region count ("385 trails") once and not the map's first view (408).
- D5 MEDIUM (a11y, frontend) — My Memories editor: cancelling the leave dialog (Escape or Keep editing) leaves focus on <body> instead of the opener (009 §22.12, §21.1). Decision: FIX — FIXED (R3), Targeted PASS.
- D6 LOW/POLISH (ui-ux decision, then frontend) — <768 editor footer shows Save above Cancel while DOM/Tab order is Cancel → Save (spec N: "full width, Save first" is met visually; DOM order unspecified). Polish backlog.
- D8 MEDIUM (frontend) — <1024 Community modal sheet never opens on the dev server: StrictMode re-runs CommunitySheet's layout effect (close → showModal) and the queued `close` event calls onDismiss → history back. Production build works, but the demo runs on the dev server (only it can reach memory-service). Decision: FIX — FIXED (R4), Targeted PASS.
- D9 LOW/POLISH (frontend) — Community: focus to <body> after a successful Retry; stale "unavailable" text in the status region after recovery; header count stale while a Detail is open.
- D7 LOW/POLISH (frontend; pre-existing, found by the search-polish Targeted QA) — a map drag released over the trail popup does not end MapLibre's pan: no settled update/`/nearby` until the next mouse move (cause of FRONTEND_CONTEXT limitation B). CDP input only.

## Repairs

- R4 (frontend, lead-approved, D8): features/community-memories/components/CommunityPanel.tsx CommunitySheet onClose — ignore a `close` event when the dialog is open again (`!leaving.current && !event.currentTarget.open`). Root cause confirmed: StrictMode effect cleanup close() queues a close event that fires after the re-run showModal(), and onDismiss navigated back. One condition, one file. Agent verification at 900×768 and 390×844: View all, deep links, Escape/Close/backdrop/Back, Detail inside; ≥1024 rail unchanged; build 0, lint 0. Targeted QA (batched R3+R4): PASS — 900×768/390×844 open/:modal/memories=1 kept/focus heading; Escape/Close/backdrop/Back close with focus to opener, no duplicate history; Detail inside; deep links + refresh; ≥1024 rail unchanged; production build (vite preview) PASS. Repair cycles for D8: 1 of 2.

- R3 (frontend, lead-approved, D5): features/memories/components/LeaveDialog.tsx — keepEditing() closes the native dialog before calling onKeepEditing (Escape via onCancel and the Keep editing button). Root cause traced: React Router applies blocker.reset() in a transition, so the editor's focus request ran while the dialog was still modal (page inert → focus() no-op), then the dialog was removed with focus inside → <body>. ~10 lines, one file. Agent verification: Create/Edit × Escape/Keep editing × keyboard/mouse → focus on header Gear link; build 0, lint 0. Lead diff review OK. Targeted QA (batched R3+R4): PASS 8/8 (Create/Edit × Escape/Keep editing × keyboard/mouse → Gear link); h1 fallback verified naturally at 390 (menu link unmounted); backdrop does nothing; Leave → /gear; sign-out not blocked; 390 bottom sheet. Repair cycles for D5: 1 of 2.

- R2 (frontend, lead-approved, D1): features/discover/components/DiscoverSection.tsx close(focusRow) — if the selected trail is not among the first MAX_ROWS visible trails (row kept only for the selection), focus the list heading (listHeadingRef, same fallback as the results-changed effect); else focus the row as before. ~8 lines. build 0, lint 0. Lead diff review: only this file newer than the record; logic mirrors the `rows` memo.
  Targeted QA cycle 1: Close/Escape paths PASS; FAIL on re-activating the selected row 51 (close(false) path) → BODY.
  Cycle 2 (frontend): close() also moves focus to the list heading when the row exists only for the selection and focus is in that row or the popup, even for close(false); canvas Escape and within-50 rows unchanged. build 0, lint 0.
  Targeted QA cycle 2: PASS — row 51 re-activation (Enter/Space/click), Close Enter/click, Escape in popup, Escape on row → h3.discover-list-heading; within-50 row re-activation/Close/Escape → the row; canvas Escape keeps focus on canvas; Tab from heading → row 1; no new console errors. Repair cycles used for D1: 2 of 2. Heading has no ring by design (§23.2).

- R1 (backend-api, lead-approved, test only): recommendation-service/src/test/.../controller/RecommendationControllerTest.java shouldReturnPackRecommendation — tripDate now LocalDate.now().plusDays(1) (style of the neighbouring test). 6+/2-. recommendation-service 51/51 PASS. Not a production change.
  Hardening notes (not failing, not changed): hardcoded 2026-10-17 also sent to /api/recommendations/query (RecommendationControllerTest:215) and /api/planner/turn (PlannerControllerTest:81,130); they break only if those endpoints gain @FutureOrPresent.

## Final status (2026-10-19)

- All journeys run. BLOCKER 0, HIGH 0. MEDIUM: D1, D5, D8 fixed and Targeted PASS; D2 accepted limitation (polish backlog). LOW/POLISH: D3, D4, D6, D7, D9, O1, O2.
- Build 0 / lint 0 after all repairs (re-run by Targeted QA R3+R4). Backend: user 21/21, memory 95/95, recommendation 51/51 (after R1), trail 22/27 with 5 DB-backed tests NOT RUN (Flyway credentials not available to the lead) — the user should run `mvn -pl trail-service test` with the IntelliJ POSTGRES_* env.
- Post-freeze polish landed during the regression: Discover trail name search (.claude/state/polish/discover-trail-search.md, Targeted PASS).
- NOT RUN: real screen reader, Safari/WebKit, physical phones, >15 min signed-URL session, bfcache Back after sign-out.
- Demo-data notes: Quarry Rock now shows 10 PUBLIC QA Memories (titles like "FR4 N1 …", "QA Public 1 …"); one Quarry photo file (f9529fd5 cover) is missing from local storage. Consider making QA Memories Private or replacing them with demo content before a demo.
- Polish backlog: D2 (Tab skips Discover before activation), D3 (cluster split re-cluster), D4 (first count announcement), D6 (<768 Save/Cancel DOM order), D7 (drag released over popup), D9 (Community Retry focus / stale status / stale count), O1 (curated trails not in default 50 rows — mitigated by search), O2 (Trail Detail scenery line), limitation A (1920 zoom-in line).
- No commit, no push.
- Follow-up: post-regression polish + demo preparation recorded in `.claude/state/polish/final-polish.md` (trail-service 27/27; D2, D6, D7, D9 fixed).
