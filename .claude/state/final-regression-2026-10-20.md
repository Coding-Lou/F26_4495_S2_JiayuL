Workflow: FINAL FULL REGRESSION after FEATURE-014 (feature freeze active; not a feature cycle; no FEATURE-015)
Branch: Dev_Frontend
Started: 2026-10-20 23:20
Status: COMPLETE (2026-10-21) — FINAL FULL REGRESSION: PASS, classification B (no product BLOCKER / HIGH / MEDIUM; 2 LOW retained)
Release / Product Gate: ACCEPTED by the user (2026-10-21)
Functional development: COMPLETE (FEATURE-001–014 PASS / FROZEN; no FEATURE-015)
Feature freeze: ACTIVE
Mode: FULL (user-requested) — grouped journeys, P0 all, practical P1, representative P2
Previous regression: .claude/state/final-regression.md (2026-10-19, FEATURE-001–010; COMPLETE) and .claude/state/polish/final-polish.md
Commit / push: NONE by the regression session (user instruction). The 2026-10-21 10:02 commits on Dev_Frontend, the checkout of `main`, the `pull --ff-only origin main`, and the merge of Dev_Frontend (1784594) came from outside this session; see Environment incident
Production code changed: none so far

## Environment (pre-flight 2026-10-20 23:20)

- Frontend: Vite dev server :5173 (pid 86555, running, reused)
- user-service :8081, trail-service :8082, recommendation-service :8083, memory-service :8085, plan-service :8086: all listening (reused)
- Keycloak :8180 (docker outdoor-keycloak, up), PostgreSQL/PostGIS :5432 (docker outdoor-postgres, up); volumes and databases untouched
- api-gateway :8080, activity-service :8084: not running, not required (empty shells)
- Browser tooling: Chrome DevTools MCP not available to the qa agent (FEATURE-014 runs) → Playwright fallback (Python, channel chrome)

## Build / static

- Frontend `npm run build`: exit 0 (known >500 kB chunk warning only)
- Frontend `npm run lint`: exit 0
- Backend tests (`mvn -B -fae -pl user-service,trail-service,recommendation-service,memory-service,plan-service test`, wrapper Maven 3.9.16, POSTGRES_* exported from Project/.env without printing): BUILD SUCCESS, exit 0
  - user-service 21/21, trail-service 27/27 (the 5 DB-backed tests NOT RUN on 2026-10-19 now run and pass), recommendation-service 114/114, memory-service 95/95, plan-service 43/43 — 300 run, 0 failures, 0 errors, 0 skipped
  - Services still answering after the run (all five 401 on actuator without a token; public trails 200)

## QA batches (parallel; separate QA accounts and trails)

| Batch | Scope | Result |
|---|---|---|
| FR-1 | Public Landing (001), Discover + search (006), Community public read + PRIVATE not exposed (010 signed-out), Auth (002) incl. Keycloak registration 400 investigation, Safari availability | **PASS** (parts 1–3). A Landing, B Discover (search, clusters, deep link, D1 fixed, failure states), Auth 002 (gates, registration ×2, wrong password, duplicate username, restore, header Sign in → /home, popup Sign in → Trail Detail, Back from Keycloak, sign-out notice + storage cleared, B isolation incl. A's Memory 404, callback failures ×3, Keycloak unreachable), Keycloak theme AC-07/08/10 re-verified after restore (all sizes, dark scheme, keyboard), Community PRIVATE/PUBLIC/PRIVATE on Bowen Lookout + Quarry signed-out pass, sweeps 1920/1024/390. OBS O-FR1-1 (dev StrictMode duplicates), O-FR1-2 (kc-callback-<state> localStorage entry after abandoned login: documented adapter exception, no token), O-FR1-3 (Keycloak input focus = darker border, not 2 px ring). NOT RUN: Safari (remote automation disabled; WebKit not installed), phones, screen reader, forced colours, 320 Landing/Discover, Show older (Quarry has 2 PUBLIC; FR-4 owns), session expiry/renewal, two-tab sign-out, AC-03 Keycloak refusals, contrast ratios |
| FR-2 | Golden path: Discover → sign in → Planner (3 phrases, 003) → Trail Detail (004) → Preparation (004) → My Gear (007) → Studio (005) → Finish (011) → Ready-to-Go (012) → /plans → Past → Add memory → PRIVATE → View memory → PUBLIC → signed-out Community | **PASS** (parts 1–2). Golden path complete: Discover search → Create account → Trail Detail; Planner A/B/C; Trail Detail curated/synthetic; Preparation (forecast, Owned/Missing, readiness 0→50 %, weather-unavailable); My Gear CRUD; Studio equip/replace/canvas (lead opened shots 17, 21: headlamp, pack, poles, boots; completion); My Gear removal un-equips (canvas 32); Finish at 50 % (1 POST on double-click), ready_to_go 4.08 s once, Continue → /plans (Today); Past via clock → Add memory prefilled → PRIVATE → checking → View memory → PUBLIC → signed-out Community (no author keys) → PRIVATE again (404, 'no longer available'). 011: route date, repeat Finish 200 (accepted), save 503/abort → alert + Try again, no clip; retry 201; synthetic Larch Grove Plan 201. 012: no replay (reload/Back/Retry), reduced motion, Pause, GLB aborted → completion + valid Plan. 004/005 invalid/past dates. Sweeps 1920/1024/390, Studio keyboard. OBS O1 (focus <body> on /plans arrival), O2 (Studio URL with unknown trail UUID: UI 'Trail not found' correct, but parallel pack POST returns 500 — known FC §11 recommendation 500 gap), O3 environment. NOT RUN: 1366, 320, screen reader, forced colours, Safari, hidden-tab clip, CPU throttling |
| FR-3 | My Plans / Calendar (013), Plan → Memory bridge incl. multiple matches + detection failure + AC-30 (014), LocalDate / boundaries / time zone, two-user isolation, error states | **PASS** (parts 1–2). 013: 42/43 ACs run (AC-20/21 covered by FR-2), incl. empty, no-Upcoming, month layouts (Feb 2028, Sunday/Saturday starts, year change), midnight via visibility (no timer), Vancouver vs Tokyo, A1 overflow (simulated), forced-colours emulation + greyscale, sticky calendar at 1920/1440/1024, 390, keyboard-only, reduced motion. 014: 37/38 ACs run (AC-23 build/lint by lead), incl. save → Back checking → view, **two matching Memories → most recently created (70cf7f4e) on 3 reloads (AC-27 previously deferred: PASS)**, PUBLIC counts, Plan delete keeps Memories, recreate → View, Memory delete → next match → Add, edited date → Add stays, invalid date/trail params, Trail Detail link unchanged, another-tab Memory on next mount only, detection failure + Try again focus/announce + D-I2, AC-12 overflow/malformed (simulated), Memory create 503. Two-user isolation: 0 leaks on /plans, /gear, /memories, A's Memory/Plan URLs; B's same trail+date Plan none→checking→add; cross-user GET/PUT/DELETE plans/memories/gear and public private → 404; no owner fields. OBS: one auto retry on /api/plans 503 and failed DELETE (UI correct); hidden status text in bridge innerText. Limitation 'elevation copy' still present; 'trail refetch after Memory return' did not reproduce. NOT RUN: 320, real screen reader, real Windows HC, Safari, phones |
| FR-4 | My Memories (008/009) CRUD, photos, ordering, pagination, visibility, delete; Community Memories (010) preview / detail / pagination / PRIVATE hidden / no author identity | **PASS** (parts 1–2, ~60 checks). 009: gate, empty, create (picker curated, validation, 1 POST, sequential uploads, EXIF orientation, no metadata stored), 5-photo limit, detail, edit, reorder/cover, Public ↔ Private, delete + soft delete, pagination 12 + Show older (+ failure), partial upload, signed-URL recovery fresh/aged (1 refetch, no loop), trail unavailable, ?trail= notes, 014 date prefill, D5/D6 still fixed, sweeps 1920/1024/390, reduced motion, no web storage. ISO-M: B sees nothing of A; B's GET/PUT/DELETE/photo ops on A → 404; A's PRIVATE public 404; no owner fields. 010: preview/list/detail tokenless, rail/inert popup/focus, synthetic no section, PUBLIC→PRIVATE incl. open Detail refetch, error states + D9 Retry focus, Escape/Back/refresh/invalid params, Show older on Garibaldi (10 → 8 + 2), 1920/1024 fit, D8 sheet at 900 and 390, reduced motion. LOW FR4-1 (popup Community count/rows stale vs newer list until own refetch; existing backlog, within spec), LOW FR4-2 (panel hidden status keeps old count after remount refetch to 0; a11y, D9 family). OBS O-a, O-b, L-2. End state: Garibaldi public 0; Quarry Rock 2 demo Memories. NOT RUN: 009 AC-22/23/24 (need a stopped service), AC-35/39/40, narrow header Menu, 010 AC-14/15, CM30, S3, screen reader, forced colours, Safari, phones |

## Environment incident (2026-10-21)

- ~00:05–07:48 host sleep / clock gap; QA drivers hung, sessions expired (agents re-signed in; no service touched)
- 10:02:09–10:02:57 repository committed on Dev_Frontend, switched to `main`, `pull --ff-only origin main`, merge Dev_Frontend (1784594), not by the lead or QA. `git diff Dev_Frontend main` empty → code under test unchanged; tree clean except .DS_Store
- Effects: Vite dev server (pid 86555) hung (requests time out); Keycloak theme bind mount pointed at the deleted directory → theme CSS 404, stock keycloak.v2 look. Host load average up to 221–574 (mediaanalysisd, iOS Simulator)
- Batches paused; results after 10:02:55 discarded as ENVIRONMENT
- Restored 10:24 with the user's approval: Vite killed (SIGTERM ignored → SIGKILL) and restarted (`npm run dev`, background; 5173 200, main.tsx 200); `docker restart outdoor-keycloak` (no volume change; theme CSS 200). Stack now serves branch `main` (= Dev_Frontend content)

## Findings

- ENV-1 BLOCKER (environment, not product): dev server hang after the branch switch — RESOLVED by restart
- ENV-2 HIGH (environment/config, not product): Keycloak theme mount lost after the directory was recreated — RESOLVED by container restart; 002 AC-07/08/10 to re-check
- Keycloak registration "400 Bad Request": NOT REPRODUCED in parts 2 and 3 (two full registrations from gate and popup, validation error, duplicate username, stale resubmit, wrong password, sign-in/out, Back, 3 callback failures: 0 HTTP 400 in any frame; earlier capture:  1,589 CDP responses incl. iframes and Keycloak pages across registration, validation error, callback, token, restore, wrong password, duplicate username, stale form resubmit → 0 responses 400–499; registration completes; one token POST per callback). Treated as not reproducible / ignorable
- O-FR1-1 OBSERVATION: dev StrictMode duplicate (first aborted) preview / default nearby requests; production unaffected
- O-FR2-1 OBSERVATION/LOW (013): focus on <body> after Continue lands on /plans

- FR4-1 LOW (010, frontend; existing polish backlog item, within spec): after a panel list refetch shows fewer PUBLIC Memories, the hidden popup's own preview count/rows stay stale until its own refetch
- FR4-2 LOW (010, frontend, a11y): the panel's hidden status region keeps the previous count after a remount refetch returns 0 (not re-announced; D9 family)
- OBSERVATIONS: O-FR2-2 Studio URL with an unknown trail UUID shows 'Trail not found' correctly but the parallel pack POST returns 500 (known FC §11 recommendation 500 gap); O-FR1-2 adapter `kc-callback-<state>` localStorage entry after an abandoned login (documented exception, no token); O-FR1-3 Keycloak input focus is a darker border, not the 2 px ring; O-FR3 one automatic retry on /api/plans 503 and failed DELETE (UI correct); O-FR4 a/b and 009 L-2 (upload count) unchanged

## Accepted limitations re-checked

- Studio Finish preparation shown again for an existing Plan: still present (harmless 200)
- Home header identity truncation 768–899: not re-measured
- 013 month reset after deleting a ?plan= arrival Plan: not re-run
- "N m gain" under "Elevation gain": still present
- >500 Memories bridge unavailable; offset-paging window: present in code (A1 guards verified), not exercised at scale
- Synthetic Memory enforcement frontend-only: unchanged
- Trail refetch after returning from a Memory detail: seen by FR-2 (one aborted + one 200), not reproduced by FR-3
- D1, D5, D6, D8, D9 fixes still hold; O1 still present; D2-type lazy Tab order timing only

## Deployment blockers (observe only; not product regressions)

- No gateway routes / security / CORS (api-gateway :8080 empty); browser reaches services only through the Vite dev proxy, incl. /api/memories/** and /api/plans/**
- No S3 bucket / IAM; Memory photos use the dev-only local filesystem adapter
- Keycloak realm configured by hand for http://localhost:5173 only (redirects, web origin, post-logout); no realm export; production URIs and secrets/env not set up
- Dev-only stack traces in local error bodies (devtools); `/api/recommendations/*` errors can surface as 500 (O-FR2-2)
- `npm run preview` cannot sign in (dev server pinned to 5173)

## Repairs

None. No BLOCKER/HIGH product regression found; no production code, test, asset, or config file changed by the regression. Environment actions (user-approved): Vite dev server restart, `docker restart outdoor-keycloak`.

## Release / Product Gate (2026-10-21)

**ACCEPTED** by the user: Final Full Regression PASS — classification B; no BLOCKER, HIGH, or MEDIUM finding.

- LOW backlog retained, not repaired, FEATURE-010 not reopened: **FR4-1** (Community popup preview may temporarily keep a stale count / rows after the Community panel refreshes); **FR4-2** (the Community panel's hidden screen-reader status may keep the previous count after the same refresh)
- NOT RUN / DEFERRED (not passed): Safari; physical phones; real screen reader; real Windows high contrast; S3; most 320 px application pages; 1366 px; session expiry / renewal; two-tab sign-out; PKCE refusal cases; the service-stop Memory tests (009 AC-22/23/24)
- Deployment work (not product regressions; not solved here): API Gateway routes / security / CORS; production `/api/memories` routing; production `/api/plans` routing; S3 Memory photo storage; Keycloak production configuration / realm export / URLs / secrets; production environment / secrets; development stack traces; recommendation errors surfacing as 500; `npm run preview` authentication

## Next

- **Demo Preparation + Deployment Preparation** (no feature number; no FEATURE-015). Neither starts, and no polish starts, without an explicit instruction
- Feature freeze ACTIVE; FEATURE-001–014 PASS / FROZEN
