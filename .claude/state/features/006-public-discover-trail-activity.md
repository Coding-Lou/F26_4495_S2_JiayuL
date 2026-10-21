Feature: 006-public-discover-trail-activity
Spec: docs/features/006-public-discover-trail-activity.md
Branch: Dev_Frontend
Phase: CLOSED
Status: PASS / FROZEN
QA mode: LEAN
Repair cycles: 1 (of 2)
Targeted QA: PASS
Product Gate: ACCEPTED (user, 2026-10-15)
Commit / push: NONE (user instruction: do not commit or push)
Updated: 2026-10-15

## Final summary

Revision 2 (user decision 2026-10-15): signed-out `/` = fixed public header -> FEATURE-001 cinematic Hero (no planner) -> Discover (MapLibre + OpenFreeMap map, synchronized list, one selectedTrailId, marker-anchored trail popup, Daily Trail Activity SIMULATED + "Sample activity"). Popup CTAs Sign in to plan this trip / Create account -> startTrailPlanning saves /trails/<id> -> authenticated FEATURE-004 Trail Detail. /trails/:trailId protected. No public Trail Detail, no View trail. D1-D16 canonical; HR2 = "Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories."

## Cycle record

- Design: section 16 by ui-ux (revision 2), approved by lead; sections 17 (AC-01..AC-45) and 18 by lead.
- Backend B1/B2 (trail-service): COMPLETE (backend-api); unit/slice tests pass (TrailServiceApplicationTests needs live DB env, infrastructure only).
- Frontend rev2: COMPLETE; build PASS, lint PASS; lead diff review PASS.
- QA rev2 run 1 (Lean): FAIL on AC-41/AC-20 P0 only (manual scroll never loaded the map). All other executed P0 PASS, including live auth conversion and the AC-44 regression.
- Repair 1 (frontend): DiscoverSection.tsx IntersectionObserver threshold [0, halfPixel]; mapStyle.ts boundary filter coalesce(admin_level, 99).
- Targeted QA after repair 1: PASS (wheel/keyboard scroll loads the map at 1440/1024/1920; 0 map requests while on the Hero; Explore trails + selection OK; console warning gone).
- Product gate: ACCEPTED by the user 2026-10-15; Full QA explicitly not requested.

## Accepted deviations (recorded at lead review)

Lazy-map trigger = first pixel of Discover (spec 14 corrected); custom gesture hint via cooperativegestureprevented; auth surface page/popup in authBoundary.ts; list/activity queries use own AbortController (StrictMode); <768 bleed capped, row tap no page scroll; map isolation:isolate; in-app ?trail= unknown UUID focuses h2; Joffre Lakes popup has no tip at 1024; D-PF1 entry chunk keeps planner/loadout session-cleanup boundaries. Backend: DispatcherType.ERROR permitAll; daily rotating simulated level; ISO.DATE parser leniency.

## Backend live smoke check (closeout, 2026-10-15): PASS

trail-service (previously IntelliJ pid 49458, pre-fix build) stopped and restarted from current source with the same POSTGRES_USER/POSTGRES_PASSWORD env via `mvn -pl trail-service spring-boot:run` (Maven wrapper dist ~/.m2/wrapper/dists/apache-maven-3.9.16; `mvn` is not on PATH). No code or configuration changed. Unauthenticated results:
- GET /api/trails -> 200 (8 trails)
- GET /api/trails/44444444-4444-4444-4444-444444444444 -> 200
- GET /api/trails/activity?date=2026-10-15 -> 200, source SIMULATED, 8 entries
- GET /api/trails/nearby?lat=49.28&lon=-123.12&radiusKm=50 -> 401
- (extra) GET /api/trails/activity?date=2000-01-01 -> 400 (the old build's 401 is fixed)
B1/B2 live verification: PASS. Note: the restarted instance runs as a background process of the closeout session, not from IntelliJ.

## Deferred QA items (deferred, NOT failures)

- P1 not executed: AC-04, 08, 09, 13, 19, 21, 22, 23, 28, 31, 32, 33, 35, 36, 39 (incl. loading/error states, reduced motion, popup following the marker during pan).
- P2 not executed: AC-40.
- 1366x768 viewport not explicitly run.
- Real screen reader not tested; Safari not tested; real forced-colors not tested.
- Design follow-up (ui-ux, closeout): map style labels are 12-13px against the 14px text minimum (DS 7.5, spec 16.15.5); decide whether map cartography labels are exempt. Polish only.

## QA tooling follow-up (not a FEATURE-006 blocker)

Chrome DevTools MCP tools were absent from the qa agent's toolset in this cycle, so QA used Playwright (channel="chrome") as fallback. Fix the qa agent's Chrome MCP access separately; not repaired during this closeout.

## Closeout (2026-10-15)

- docs/FRONTEND_CONTEXT.md: public trail reads + activity contract, verified live statuses, publicRequest (credentials omit), routes (`/` two-stage, /trails/:trailId protected), homepage structure, lazy map runtime + chunks, query keys, maplibre-gl dependency, features/discover tree and dependency rules, auth surface + startTrailPlanning, risks (tiles, simulated activity).
- docs/DESIGN_SYSTEM.md (ui-ux): fold of spec 16.18: 3.2, 4.4 (new), 9, 10, 13, 13.1 (new), 14, 18, 35 (new: map-rail layout, map palette, markers, anchored popup, map on a scrolling page, in-page section navigation, activity text and sample disclosure). Implemented values preferred over 16.18 in two small cases (gesture hint drawn by the product; marker hover ring).
- docs/PRODUCT_REQUIREMENTS.md: narrow amendment per spec 3.3 (decision record row 2026-10-15; 2, 4.1, 4.2, 5, 7.1-7.7, 11.3, 31, 33, 34, 35, 38, 39, 40, 40.1, 40.6, 41, 44, 45.1, 45.3, 47, 50, 51, 57).
- Spec: status -> IMPLEMENTED, PASS / FROZEN; 3.3 marked applied; B1/B2 live PASS; 18.4 prerequisites met.
- No production code changed during closeout. FEATURE-007 not started.

## Files changed by FEATURE-006 (uncommitted)

- Backend: trail-service config/SecurityConfig.java, controller/TrailController.java, service/TrailActivityService.java, dto/{ActivitySource,TrailActivityItemResponse,TrailActivityResponse}.java, tests TrailPublicApiTest, TrailControllerTest, TrailActivityServiceTest.
- Frontend: package.json/lock (maplibre-gl); app/router/routes.tsx; pages/{DiscoverPage,LazyRoutes}.tsx; features/discover/** (new); features/landing (HeroIntro, LandingHero, content, landing.css modified; HeroNotice new; planner prompt modules deleted; hero-media restored); features/trails (activity.ts, api/{publicRequest,trailList,trailActivity}.ts, hooks/{useTrailList,useTrailActivity}.ts new; api/trailDetail.ts, types, content modified); features/auth (authBoundary.ts, index.ts, PublicLandingRoute.tsx).
- Docs: FRONTEND_CONTEXT.md, DESIGN_SYSTEM.md, PRODUCT_REQUIREMENTS.md, features/006-public-discover-trail-activity.md.

## Post-freeze evolution: viewport-driven Discover (2026-10-17)

The original 2026-10-15 PASS / FROZEN result above is unchanged. This is an approved evolution of FEATURE-006, not a new feature.

- Status: PASS / FROZEN. Product Gate: ACCEPTED (user, 2026-10-17). QA mode: TARGETED (15 / 15 PASS). Repair cycles: 0 (one lead-review fix before QA: the "capped" note uses the raw farthest-corner distance). Full QA not run (user decision).
- Context: the trail dataset change of the same day added 400 `SYNTHETIC_DEMO` planner trails (`discover_visible = false`) beside the 8 curated `DEMO_SEED` trails; `GET /api/trails` became the curated catalog (My Memories' picker).
- Backend (trail-service): `GET /api/trails/nearby` public (GET only; other methods and paths still protected); `0 < radiusKm <= 150`; class-level `@Validated` removed from `TrailController`, so invalid parameters return 400 (documented semantics restored). recommendation-service unchanged.
- Frontend: Hero -> viewport-driven Discover: settled map view -> centre + radius (farthest corner x 1.15, clamped [2, 150]) -> public `/nearby` -> MapLibre GeoJSON clustering (no HTML marker per trail; cluster count = number of trails; selected trail drawn above clusters) -> visible-rectangle list (max 50 nearest + the selected trail) -> unchanged popup. One shared selection; stale-safe TanStack query keyed by rounded centre and radius. Synthetic trails: sample disclosure, "Today's activity isn't available.", no "Add a memory" on Trail Detail.
- Tests: trail-service 27 / 27 PASS; frontend build PASS, lint PASS.
- QA observations (1440x900, headless; not production guarantees): default view 408 fetched, 50 rows, 7 clusters + 3 points; Squamish / Whistler 75 fetched, 42 listed; one drag ~1 request; rapid zooms coalesce to ~1; cached view 0 requests; 0 per-trail DOM markers, ~300 DOM nodes, no long tasks, median frame ~16.7 ms.
- Accepted non-blocking limitations: A. wide-screen (1920x1080) default view shows "Zoom in to explore trails in this area." (polish: tighter initial camera or cap review); B. unconfirmed missed settle after a drag in a long-lived test page; C. no trail points while the nearby request is in error (map usable, list Retry); D. devtools stack traces in local error bodies (deployment concern).
- Docs: FRONTEND_CONTEXT.md, PRODUCT_REQUIREMENTS.md (decision record; 7.3, 42-44), DESIGN_SYSTEM.md (35.3 clusters).
- No production code changed during closeout. No FEATURE-010 work included. Commit / push: NONE.
