Feature: 004-trail-selection-preparation
Spec: docs/features/004-trail-selection-preparation.md
Branch: Dev_Frontend
Phase: CLOSED
Status: PASS
Updated: 2026-10-13

Design: APPROVED (spec and design complete, D1–D22 lead decisions recorded, B1 resolved; the user started the cycle by invoking /feature-cycle 004 on 2026-10-12, which is the approval section 29 waits for)
Implementation: COMPLETE (frontend) — reported ~20:45 PDT; nothing was loaded in a browser by the implementer (no browser tool, no credentials), all visual and interactive behaviour is desk-checked only
Build: PASS (exit 0, rerun by frontend after repair 1; one non-failing Vite chunk-size warning, 520 kB)
Lint: PASS (exit 0, rerun by frontend after repair 1)
QA: PASS (run 1: 47 PASS, 1 FAIL (AC-34); run 2 after repair 1: AC-34 PASS and 12 touched criteria re-PASS; final 48 of 48 PASS, 0 FAIL, nothing blocked by environment; several clauses by emulation only, see Not verified)

Security review: COMPLETE — lead read of this feature's diff (returnDestination.ts, vite.config.ts, trails/api/tripRequest.ts, trails/api/trailDetail.ts, packing/api/packRecommendation.ts, packing/hooks/usePackRecommendation.ts, planning/trailContext.ts, tripRoutes.ts, trailId.ts; grep for storage, history state, console, keycloak, authSession in the new code: none). No finding. Return-destination patterns are anchored, start with /trails/, exclude query strings, validated on write and read. Proxy has exactly /api/planner, /api/trails, /api/recommendations/pack. Requests go only through authenticatedApiRequest; failed bodies are never read; nothing is logged; pack query key starts with the subject and no request is made without one.
Repair cycle: 1/2 used (AC-34 fixed and confirmed; announcer stale text and gear-row cursor fixed in the same repair)

Lead diff review: PASS (scope only, 2026-10-12)
- Every file newer than the cycle-start marker is under Project/Frontend/src/**, Project/Frontend/vite.config.ts, or docs/FRONTEND_CONTEXT.md (sections 7, 8, 10). Nothing under Project/Backend, Project/docker, docker-compose.yml.
- sha1 unchanged: package.json, package-lock.json, docker-compose.yml, DESIGN_SYSTEM.md, PRODUCT_REQUIREMENTS.md, "preparation bg.png". No media file added.
- No 3D, map, chart, date-picker or animation import; no users/me, planner/turn, recommendations/query call in the new code.

Deviations accepted by the lead (QA: verify, do not fail on these alone):
1. View trail link style: the spec gives text and target only. Implemented in the card's existing text-control style (ink, 14/20, 600, underlined, 44px on coarse pointers), after the description, trail name as accessible description.
2. S16 on a 401/403 *response* while the client still believes it is signed in shows the general failure with Retry (S3/S10), not FEATURE-002's session-expired state: @/features/auth exports nothing that ends a session and the spec allows only the return-destination change to FEATURE-002 (spec section 20 S16 vs section 25). The NotAuthenticatedError path does hand over to FEATURE-002. User decision pending on whether to add an auth export later.
3. TripHeader.tsx / trip-shell.css repeat HomeHeader's markup and styling instead of sharing it (features/home was outside the permitted changes). Candidate for a later shared-header extraction together with D22.
4. Fallback wash (14.4) read as full extent 120% x 90%, i.e. radii 60% x 45%.
5. Automatic retry only for a network error or 5xx, once; never after a timeout, 400/401/403/404, or an unusable body.
6. Trail Detail sheet width is min(1120px, between gutters): 960 at 1024, capped at 1120 between ~1184 and 1279px.
7. A session with no sub: no pack request, general failure (S10) shown.
8. Loaded announcement always states both counts; the visible count line drops a zero part.
9. A failed background trail refetch (not 404) leaves the loaded trail on screen.
10. Reading the planner store on Trail Detail runs FEATURE-003's own initialise(); if a landing prompt is still pending when the user first lands on Trail Detail after sign-in, FEATURE-003 writes its planner key. No FEATURE-004 code writes storage.
11. packing imports the timed request helper from features/trails/api/tripRequest (packing → trails direction, allowed by section 24).

Path: ordinary web feature (frontend → lead diff review → security review → qa)

Granted write paths beyond Project/Frontend/** (spec section 29):
- docs/FRONTEND_CONTEXT.md, "limited to what actually changed: the two routes and their shell, the new feature folders, the proxy entries, the return-destination pattern, and the removal of the Trail Detail placeholder"
Inside Project/Frontend, two changes to earlier features are explicitly allowed and nothing else of FEATURE-001/002/003 (spec section 24, 25):
- vite.config.ts: exactly two more proxy entries, /api/trails → :8082 and /api/recommendations/pack → :8083
- features/auth/returnDestination.ts: pattern extended to /trails/<segment>/prepare and /trails/<segment>/prepare/<YYYY-MM-DD>; the only change to FEATURE-002 code
- features/planning: the View trail link on the card, one read-only selector (rec, trailId), shared formatters and the trip-date control (reused or extracted; planner behaviour unchanged)
Not authorized for any agent: Project/Backend/**, Project/docker/**, Project/docker-compose.yml, Keycloak realm/client/theme, API gateway, infrastructure, docs/DESIGN_SYSTEM.md (D22), docs/PRODUCT_REQUIREMENTS.md, any new or modified media file, any new runtime dependency

Baseline at cycle start (2026-10-12 20:11:13 PDT):
- git status --short had 144 entries, including unrelated uncommitted work under Project/Backend/ and Project/docker-compose.yml (AC-47 is judged against this)
- Newest file under Project/Backend (outside target/) is from ~20:06, before the cycle start; any Backend file newer than 20:11:13 is a scope failure
- sha1: docs/FRONTEND_CONTEXT.md 9a413640, docs/DESIGN_SYSTEM.md e1e819ba, docs/PRODUCT_REQUIREMENTS.md 45711aa3, Project/Frontend/package.json 53cea46c, package-lock.json 6e75be53, Project/docker-compose.yml 775a5708, "Project/Frontend/public/media/img/preparation bg.png" 0e915a2c (2478219 bytes)
- Existing: pages/TrailDetailPage.tsx is a placeholder; features/{auth,home,landing,planning}; no features/trails or features/packing; vite proxy has /api/planner only
- Local stack listening: 5173 (vite dev), 8081, 8082, 8083 (Spring services), 8180 (Keycloak), 5432 (Postgres)

Environment risk for Live criteria (not a code issue):
- Rechecked 23:31 PDT: trail-service (pid 87975) and recommendation-service (pid 87969) are STILL the 08:53:50 processes (user-service was restarted at 20:40). No repository file changed after 20:50.
- trail-service (pid 87975) and recommendation-service (pid 87969) were started 08:53:50; the B1 change to TrailDetailResponse/TrailService was compiled at 20:05. Unless they were hot-reloaded, the running trail-service does not return scenery/baselineGearRequirements, and AC-21 (and the baseline rows in AC-15..AC-19 Live) would fail for an environment reason. The user was asked to restart trail-service and recommendation-service from IntelliJ. QA must first confirm that GET /api/trails/{id} returns baselineGearRequirements; if not, report those Live criteria as blocked by the environment, not as a frontend FAIL.

Agents completed:
- frontend (implementation)
- qa (run 1)
- frontend (repair 1)
- qa (run 2, rerun of AC-34 and touched criteria)

Agents skipped:
- ui-ux (spec and design already exist and are accepted; D15–D22)
- backend-api (B1 already resolved; no backend write is authorized by this cycle)
- three-d (no realtime 3D; spec section 28)

Files changed:
- created Project/Frontend/src/components/layout/{TripShell.tsx, TripHeader.tsx, TripAnnouncer.tsx, useTripAnnouncer.ts, TripRetryButton.tsx, trip-shell.css}
- created Project/Frontend/src/features/trails/{api/tripRequest.ts, api/trailDetail.ts, hooks/useTrailDetail.ts, types/trail.ts, components/{TrailDetailScreen,TrailVisual,WhyThisTrail,TrailDecision}.tsx, content.ts, trailId.ts, tripRoutes.ts, trails.css}
- created Project/Frontend/src/features/packing/{api/packRecommendation.ts, hooks/usePackRecommendation.ts, types/pack.ts, components/{TripPreparationScreen,PackBriefing,PreparationScene}.tsx, content.ts, gearCategories.ts, presentation.ts, preparationSceneConfig.ts, packing.css}
- created Project/Frontend/src/features/planning/{components/TripDateControl.tsx, hooks/useFocusOnOpen.ts, trailContext.ts}
- created Project/Frontend/src/lib/{useElapsed.ts, useDocumentTitle.ts}, Project/Frontend/src/pages/TripPreparationPage.tsx
- modified Project/Frontend/src/pages/TrailDetailPage.tsx, src/app/router/routes.tsx, src/index.css, src/features/planning/{components/PlannerContextControls.tsx, components/TrailRecommendationCard.tsx, components/RecommendationGroup.tsx, presentation.ts, content.ts, planner.css}, src/features/auth/returnDestination.ts, vite.config.ts
- modified docs/FRONTEND_CONTEXT.md (sections 7, 8, 10)

Unresolved failures:
- (none)

QA run 1 detail (qa, webapp-testing skill: Python Playwright 1.60 in a scratch venv driving installed Chrome headless):
- First check: backend NOT stale. Live GET /api/trails/1111... returns scenery ["VIEWPOINT","FOREST"] and baselineGearRequirements ["WATER","FOOTWEAR"]; live pack for Quarry Rock includes FOOTWEAR and WATER. (The 08:53 processes evidently picked up the change; the environment risk above is closed.)
- Measurements worth keeping:
  - AC-33 panel x/y/width: 64,104,520 (1920) · 56,104,480 (1440) · 40,80,460 (1366) · 32,80,420 (1024). Left scrim width 584/536/500/452 = panel right edge. Centre pixel at y=20 identical with and without header.
  - AC-32 object-position 50% 30% at 1920/1440/1366/2560, 55% 30% at 1024; crop 0 at 1920 and 1366, 79 left at 1440, 188 left / 153 right at 1024, top 108 / bottom 253 at 2560. Natural 1672x941, one media request.
  - AC-36 white scene: panel (41,56,59), scrim (79,91,94); contrast white/panel 12.19, white/scrim 7.02, hovered on-panel control 8.40, ink/paper 16.04, stone/paper 5.92, white/conifer 8.05, date border 5.26, ember 4.43.
  - AC-38 sheet x/top/width: 400,136,1120 · 160,136,1120 · 123,116,1120 · 32,116,960; columns 568+56+400 (516+40+340 at 1024); decision row bottom 683/683/663/667.
  - AC-15 exactly 1 POST under StrictMode, body {trailId, tripDate}. AC-21 live: 0% all Missing -> footwear Owned, 33%, "2 missing · 1 owned" after POST /api/users/me/gear from the script.
  - AC-24/AC-08 timeout wording at 20.7 s / 20.4 s; "Still loading…" at 10 s.
  - AC-30 mid-visit expiry (token renewal refused) lands on / with "Your session has ended. Sign in again to continue.", return destination saved.
- Not verified: real screen reader (AC-42 at DOM level only); real Windows forced colors (AC-39, AC-20 by Chrome emulation + grayscale); real phone / iOS Safari / touch (AC-44 by emulated viewports); browsers other than Chrome, including the scrim's masked feather; AC-01 "nothing else about the card changes" has no pre-change copy to diff.
- Observations outside the criteria:
  1. Announcer keeps stale text: status still says "Loading your gear list." during a pack failure and S12; alert keeps the failure text after a successful Retry (23.3 says emptied per event). With an instant 400 the "Loading" status is written ~50 ms after the S12 alert. -> included in repair 1 as a spec-conformance item.
  2. Gear row cursor is auto (I-beam); 21.13 says default arrow. -> included in repair 1.
  3. Re-entering Preparation with a cached pack shows the old result first, then updates silently (consistent with 23.3's cache rule).
  4. At 768px-high viewports the lowest ~10px of the right scrim feather overlaps the top of the figure's hair (<= 23 levels, not visible by eye; follows from the spec's own numbers: header zone to 13%, head from 12%).
  5. At 1366 and 1024 the panel's top 24px sit under the left scrim feather: (30,46,49) at the top edge; contrast is higher, not lower.
  6. A trail response whose id differs from the URL's is rendered (spec requires the mismatch check only for the pack). Non-integer readiness 12.5 shows "13%" (backend sends integers).
  7. Forced colors: the pressed quick pick loses its fill; the on-panel date control's calendar icon is very faint.
  8. Console: only /favicon.ico 404 and Keycloak's iframe sandbox warning; no page errors.
  9. Deviation 10 edge case confirmed: FEATURE-003 writes the planner key (prompt as draft) when landing on Trail Detail with a pending prompt; no turn sent.
- Left behind: Keycloak accounts otc-qa-ca800418 (A; owns gear item "QA test boots", FOOTWEAR, in user-service) and otc-qa-ba46d41f (B).

Repair 1 (frontend), files changed:
- features/packing/packing.css: .prep-briefing gains position: relative (containing block for the rows' sr-only separators, so the scroll container clips them); .prep-gear-row gains cursor: default
- components/layout/useTripAnnouncer.ts: new silence() (cancels pending timers, empties both regions); announce() calls it first
- features/packing/components/TripPreparationScreen.tsx: silence() on S8/S12 and on ready-without-wait
- features/trails/components/TrailDetailScreen.tsx: silence() when Retry starts (same staleness on Trail Detail; not reported by QA, three lines)
- Scope check by lead: exactly those four files changed after QA run 1 (all at 2026-10-13 00:13:47; nothing else under Project/ or docs/ is newer than 2026-10-12 23:32); package.json and lockfile hashes unchanged

QA run 2 detail (same tooling, account A, rechecked set only):
- AC-34 PASS: 11 rows at the four desktop viewports and 13 rows at 1366x768 and 1024x768: scrollHeight equals viewport height in all six; wheel, End/PageDown/Space from h1 and scrollTo(0,500) leave scrollY at 0; header/panel/strip/h1/date control/scene boxes identical; only the briefing scrolls (0 -> 89 / 265 / 377 / 377; 0 -> 459 with 13 rows); panel height 936 / 756 / 664 / 664.
- Re-PASS: AC-19, AC-20 (cursor now default), AC-33 panel box unchanged, AC-40 (Preparation), AC-43 (Preparation, six states), AC-44 (Preparation, emulated), AC-42 (DOM level), AC-24 (timeout wording at 20.7 s), AC-25 (no "Loading" status after an instant 400), AC-08 Retry clause, AC-41 Retry focus. Date popover is topmost over the briefing at 9 sample points.
- Stale announcer text gone on both screens: status empty during pack failure, timeout and S12; alert empty after a successful Retry.

Not verified (carry to the user's manual review):
- A real screen reader (announcements observed as live-region mutations only)
- Real Windows forced colors (Chrome emulation + grayscale filter)
- A real phone / iOS Safari / touch (AC-44 by emulated viewports in desktop Chrome)
- Any browser other than Chrome, including the header scrim's masked feather
- The scene composition by a human eye at the four viewports (QA judged "clear of the panel" by eye from screenshots)

Known limitations and open items:
- Accepted deviations 1–11 above stand. Three are the user's to decide: (2) a 401 response shows the general failure with Retry instead of FEATURE-002's session-expired state (needs a new auth export); (1) the View trail link style was chosen by the implementer, not designed; (3) TripHeader duplicates the Home header.
- A date change on Preparation back to a date fetched < 30 s earlier in the same visit shows the cached pack with no request (query client staleTime 30 s in app/providers/queryClient.ts, predates this feature); spec section 16 says the request runs "on a date change". No AC covers it. Entering the screen always refetches.
- Re-entering Preparation with a cached pack shows the old result, then updates silently after the refetch (consistent with 23.3's cache rule).
- A trail response whose id differs from the URL's is rendered (mismatch check exists only for the pack).
- Forced colors: the pressed quick pick loses its fill; the on-panel date control's calendar icon is faint.
- At 768px-high viewports the right scrim's feather overlaps the top ~10px of the figure's hair (not visible by eye; follows from the spec's own numbers).
- Spec open questions Q2–Q10 remain open (section 31.3); Q4 (pre-rendered Pack scene vs PRD section 40) and Q5 ("Choose this trail" vs PRD "Plan This Trip") need a PRD decision by the user.
- docs/FRONTEND_CONTEXT.md sections 7, 8, 10 are current. Sections 9 and 13 still describe the Plan -> Pack slice as planned; left as they are (outside the spec's grant, not an API/route/auth/architecture statement).
- npm run preview and a deployed build cannot reach the trail or pack endpoints (dev proxy only).
- Left in the environment: Keycloak accounts otc-qa-ca800418 (owns gear item "QA test boots", FOOTWEAR) and otc-qa-ba46d41f. QA scripts and screenshots were in a session scratch directory and do not persist.
- Nothing is committed. No git state was changed by the cycle.

Next:
- Cycle closed as PASS. Nothing further unless the user reopens it.
- The next feature starts only when the user asks.
