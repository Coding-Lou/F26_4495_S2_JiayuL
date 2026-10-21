Feature: 013-my-plans-calendar
Spec: docs/features/013-my-plans-calendar.md (APPROVED — FROZEN 2026-10-20, amendment A1 pagination safety)
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (2026-10-20)
Updated: 2026-10-20 (closeout)
Cycle start: 2026-10-20 21:30 (scratch marker; backend files must not be newer)

Design: APPROVED (spec §10, ui-ux during specification; lead resolutions §10.15)
Implementation: COMPLETE (frontend)
Build: PASS (frontend, exit 0; only the pre-existing >500 kB chunk warning; PlansPage chunk 25.7 kB)
Lint: PASS (exit 0)
Lead diff review: PASS (21:50) — every file newer than cycle start is in §26.1; no Project/Backend, vite.config, package.json/lockfile change in this cycle; GearStudioScreen only continueTo="/plans" (:789), :706 untouched; useTrailDetail behaviour-preserving (options spread); no UTC date parse, Memory, weather, readiness, PUT/PATCH, web storage in features/plans
QA: LEAN PASS (run 1, Playwright over CDP to headless Chrome 155; Chrome DevTools MCP unavailable)
  - Validated: AC-01–AC-28 incl. all 24 P0; P1 AC-25, 26, 27, 28, 30, 31, 32, 33, 35, 37; P2 AC-40
  - Indirect: AC-34 (code: no UTC parse), AC-36 (aria states; forced colours not run), AC-39 (A1 guard by code reading), AC-43
  - Deferred (not passed, not defects): AC-29 (>50 Plans), AC-34 time-zone emulation, AC-36 forced colours, AC-38 (390/320), AC-41 month boundaries, AC-42 midnight, 1366×768
  - Not verified: real screen reader, Safari, phones; ready_to_go pose in pixels (state machine observed: playing ≈ 4 s)
  - Measurements: 1440×900 list 727 / calendar 440 / sheet 1313; 1920×1080 list 910 (no scrollbar; ≈ 897 with one) / 512 / 1600; 1024×768 503 / 344 sticky (top 24, bottom 478); no horizontal scroll
  - Requests: mount = 1 GET /api/plans?page=0&size=50 + 1 GET /api/trails/{id} per distinct trail (7 for 8 Plans); month / selection / filter = 0; delete = 1 DELETE + 1 GET; Finish = 1 POST 201, repeat 200 same id
  - Simulated (Playwright route.abort): /api/plans* (PL42), one /api/trails/{id} (PL9), one DELETE (PL24); browser clock 2026-10-25 and 2027-01-05 for Past / no-upcoming. No service stopped
  - Console: no pageerror; known silent-SSO iframe warning; THREE.Clock deprecation (012); expected 404 of the fixture trail

Repair cycle: 0/2
3D pipeline: SKIP (spec requires no realtime 3D, no GLB or Blender change; FEATURE-012 changes only the Continue value)
Security review: lead diff read (owner-scoped Plan data, subject-bound keys, sign-out clearing); not an auth-architecture change

Agents completed:
- frontend (implementation, 21:52)
- qa (Lean run 1, PASS, 22:15)
- (specification) backend-api, frontend, ui-ux — one inspection each, recorded in spec §5.1, §5.2, §6, §10

Agents skipped:
- backend-api (no contract gap; spec §6 verdict: no backend change)
- ui-ux (design approved in spec §10; reopen only on a real blocker)
- three-d, Blender (no 3D)

Approved write scope (spec §26.1): Project/Frontend/src/features/plans/** (new files + api/plans.ts, api/planRequest.ts cancel option, types/plan.ts comment); pages/PlansPage.tsx; pages/LazyRoutes.tsx; app/router/routes.tsx; components/layout/TripHeader.tsx; features/home/HomeHeader.tsx; features/auth/returnDestination.ts; features/loadout/components/GearStudioScreen.tsx (continueTo value only); features/trails/hooks/useTrailDetail.ts (export trailDetailQueryOptions, behaviour-preserving); header CSS only if needed.

Files changed (Project/Frontend/src/):
- new: pages/PlansPage.tsx; features/plans/{hooks/usePlans.ts, hooks/useDeletePlan.ts, hooks/usePlanTrails.ts, hooks/useTodayIso.ts, model/calendarMonth.ts, model/planCollection.ts, model/planText.ts, components/MyPlansScreen.tsx, PlanSection.tsx, PlanEntry.tsx, PlanCalendar.tsx, DeletePlanConfirmation.tsx, PlansStates.tsx, PlansRetryButton.tsx, myPlansContent.ts, my-plans.css}
- edited: features/plans/api/planRequest.ts (cancel), api/plans.ts (requestPlans, deletePlan, A1 guard), types/plan.ts (comment); features/trails/hooks/useTrailDetail.ts (trailDetailQueryOptions); pages/LazyRoutes.tsx; app/router/routes.tsx; features/auth/returnDestination.ts; components/layout/TripHeader.tsx; features/home/HomeHeader.tsx; features/loadout/components/GearStudioScreen.tsx (continueTo only)

Accepted implementation deviations (verify, do not fail on alone):
- D-I1 PlansRetryButton ("Try again") instead of TripRetryButton ("Retry"), same classes
- D-I2 PL11 via aria-label (exact comma text); facts via aria-describedby
- D-I3 detail elevation reads "420 m gain" under "Elevation gain" (shared formatter; copy polish)
- D-I4 a filtered day reduced to 1 Plan by a delete clears the filter
- D-I5 Show all plans also clears the selected Plan
- D-I6 collapsing inside a filter keeps the filter day pressed
- D-I7 document title "My Plans · Outdoor Trip Companion"
- D-I8 loading calendar shows the legend (no shift)
- D-I9 a failed refetch after a good load shows PL42 (whole query fails); heading focus only when replacing visible content

QA fixture data:
- Accounts (self-registered; passwords only in non-persistent scratch qa013/creds.json): otc-qa-f013-a-8d16d1@example.test (A), otc-qa-f013-b-8d16d1@example.test (B)
- Injected fixture (the one permitted SQL insert, U8): plans id eff5ed7b-d514-47c5-8278-a7425c67440f, trail a2659e8c-463c-4263-95a9-abc8b6a67cea (random, 404), 2026-11-20, READY, deleted=false, owner = A's subject; left in place
- A's Plans via POST: da85bb52 (Quarry Rock 2026-10-20), 043a84bb (Dog Mountain 10-21), 37de8696 (Bowen Lookout 10-22), 0d14ccfa (Dog Mountain 11-07), 8f85d475 (Lindeman Lake 11-07, soft-deleted in UI), d9934645 (Eagle Woods Traverse, synthetic, 11-14), ee397632 (Joffre Lakes 12-05), 6190bff6 (Garibaldi Lake 11-28, soft-deleted), 9887753d (Grouse Grind 11-28)
- B: 633329c0 (Lindeman Lake 2026-10-31, real Finish preparation; repeat POST 200 same row)
- No non-QA data touched; QA data left in place

Unresolved failures:
- none

Observations (non-blocking, for the product gate):
- O-1 arriving via ?plan= (reload / Back) and deleting that Plan before moving the calendar returns the calendar to the D12 default month, not the deleted Plan's month (MyPlansScreen.tsx:143, shownMonth null on arrival); spec does not define the month after delete. Polish candidate
- O-2 dev-only: StrictMode double mount on Back aborts a duplicate trail request (ERR_ABORTED); production unaffected
- D-I3 "370 m gain" under "Elevation gain" (copy polish)

Known limitations (approved, U6): Studio reopened for a saved Plan shows Finish preparation again (POST idempotent); Home header identity truncation at 768–~899 px; plus spec U6 c–f

Polish backlog (accepted, not repaired): A) ?plan arrival + delete returns the calendar to the default month; B) "370 m gain" under "Elevation gain"; C) earlier limitations (Studio shows Finish again; header name truncation 768–900 px)

Deferred / not run (not PASS): 50+ Plan dataset; forced colours; 390/320 px; month-boundary cases; midnight with page open; time-zone emulation; real screen reader; Safari; phones

Docs updated: spec status IMPLEMENTED — PASS / FROZEN and §30.1 product gate; docs/PRODUCT_REQUIREMENTS.md (decision record, journey, §11.1 My Plans, §11.2, §14, §15, §22); docs/FRONTEND_CONTEXT.md (status, route table, return destination, request layer, §8 My Plans, §9, §10); CLAUDE.md roadmap. DESIGN_SYSTEM.md not updated (no reusable pattern needed yet)

Next:
- FEATURE-014 — Plan → Memory Bridge (final product feature). Not started; begins only on the user's request
