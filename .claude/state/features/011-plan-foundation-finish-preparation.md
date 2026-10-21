Feature: 011-plan-foundation-finish-preparation
Spec: docs/features/011-plan-foundation-finish-preparation.md
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (2026-10-19)
Updated: 2026-10-19 (cycle start 19:56 PDT; Lean QA PASS)

Design: APPROVED (spec frozen 2026-10-19; U1–U6 approved by the user)
Roadmap truth (U1): COMPLETE — PRD §1.1 decision row 2026-10-19, §47 rows 011–014, §48 reopened note, §50, §57; CLAUDE.md roadmap line
Implementation: COMPLETE (backend-api → frontend)
Backend: COMPLETE
Frontend: COMPLETE
Backend tests: PASS (mvn -pl plan-service test: 43 run, 0 fail/err/skip, exit 0)
Backend live smoke: PASS unauthenticated (all /api/plans → 401 AUTHENTICATION_REQUIRED); Flyway V1 applied; plan_db created on the existing volume by backend-api with the §8.3 one-time command (nothing dropped)
plan-service running for QA: JVM PID 87344 on 8086, maven parent PID 87314 (stop: kill 87314); log in session scratchpad plan-service-run.log; started with POSTGRES_USER/PASSWORD from Project/.env (quotes stripped)
Accepted deviation D-A1: plan-service application.yaml sets spring.datasource.hikari.data-source-properties.logServerErrorDetail: false so PostgreSQL's unique-violation detail (which contains owner_subject) is never logged (spec §18 rule 7); race test asserts no subject in logs
Build: PASS (npm run build exit 0; existing large-chunk warning only; plans code in lazy GearStudioPage chunk)
Lint: PASS (exit 0)
Lead diff review: PASS (only granted paths changed; no plans import of three/R3F/maplibre/other features; no web storage; no list/detail/delete client code)
QA: LEAN PASS (run 1; Playwright over CDP, Chrome DevTools MCP unavailable)
  Validated: AC-01,02,03(no/invalid token),04,06,07,08,10,11,12,13,14,15,16,17,18,19,21(partly),22,23(unavailable live; invalid-date/trail-gone simulated),24,25,26,30
  Indirect: AC-20 (Discover→sign-up→Trail Detail→Prep→Studio equip/unequip/avatar; Planner 3 recs; My Gear, My Memories load), AC-09 (index present), AC-29 (source boundary), AC-31 (1920/1024 sweep)
  Deferred: AC-05, AC-28 (trail-service outage not authorized), AC-03 no-sub (backend tests cover), AC-23 unconfirmed/unexpected, AC-27 fresh volume, AC-31 <768, AC-32, AC-33
  Measurements: dblclick+click+Enter during 1.5 s delay → 1 POST 201; reload+Finish → 200 same id, unchanged timestamps, 1 row; 4 parallel POSTs → 1×201 + 3×200 same id, 1 row; past date → 400 tripDate "must not be in the past"; malformed → 400 no errors[]; random trail → 400 TRAIL_NOT_FOUND; B list empty, B GET/DELETE A's id → 404, A row unchanged; DELETE 204, detail 404, 2nd DELETE 404, row deleted=true, recreate 201 new id; size=51/page=-1 → 400; outage → proxy 502 → unavailable alert + Try again, gear zone and loadout byte-identical, after restart 1 POST 201, 1 row; synthetic Copper Hollow Circuit 201, no Add a memory, no Community section; 1920: row x 89–639 vs canvas 696–1856; 1024: 57–456 vs 516–992, no h-scroll; Finish 40 px (F5)
  Non-blocking: announcer keeps "Saving your plan." after failure (not re-announced); at 1440×900 unavailable alert bottom 776 vs zone visible bottom 772 (zone scrollable)
  QA accounts: otc-qa-f011-a-ffacf7, otc-qa-f011-b-778b0c (@example.test; creds in session scratchpad qa011/creds.env). plan_db: 7 rows (1 deleted); ids in spec §26 / QA report
plan-service now running: maven parent PID 93308, JVM 93335 (restarted by QA after the outage test)

Security review: lead manual read of this feature's diff (built-in /security-review would scan the large unrelated uncommitted tree). plan-service: owner from OwnerSubject.of(jwt) only; every repository query scoped owner + deleted=false; only DispatcherType.ERROR permitted, anyRequest authenticated; no log call includes subject/token; D-A1 suppresses PG detail. Frontend: token only via authenticatedApiRequest; no storage, no logging. No findings
Repair cycle: 0/2 (final)
3D pipeline: SKIP (spec §4, §24 Q22: no 3D, no Blender, no assets; FEATURE-012 owns the animation)

Agents completed:
- (spec phase) backend-api review, frontend review
- backend-api (implementation, 2026-10-19)
- frontend (implementation, 2026-10-19)
- qa (Lean, run 1): PASS

Agents skipped:
- ui-ux (U4 approved: existing Studio patterns cover every state)
- three-d (no 3D)

Approved write scope (spec §22, U2):
- backend-api: Project/Backend/plan-service/**; Project/Backend/pom.xml (module line only); Project/docker/postgres/init-databases.sql (CREATE DATABASE plan_db; only); other minimal local service config only if verified necessary
- frontend: Project/Frontend/src/features/plans/**; GearStudioScreen.tsx (Finish row mount); minimal studio.css (.studio-finish); vite.config.ts (/api/plans proxy entry)
- Frontend API: createPlan only (U3); backend implements all four endpoints

Files changed:
- docs/features/011-plan-foundation-finish-preparation.md (status frozen)
- docs/PRODUCT_REQUIREMENTS.md, CLAUDE.md (U1 roadmap truth; closeout: §47 row status, CLAUDE.md plan-service command note and roadmap status)
- docs/FRONTEND_CONTEXT.md (closeout: plan-service in §1–§4, proxy §7, Studio route §8, folder/deps §10, production risk §12)
- docs/features/011-...md (§26 implementation record)

Frontend files: Project/Frontend/src/features/plans/** (new: api/planRequest.ts, api/plans.ts, hooks/useCreatePlan.ts, types/plan.ts, components/FinishPreparation.tsx, content.ts); features/loadout/components/GearStudioScreen.tsx (import + Finish mount in ready branch); features/loadout/studio.css (.studio-finish rules); vite.config.ts (/api/plans → 8086)
Accepted frontend choices: F1 Choose-a-new-date link after the alert (Tab order, AC-24); F2 alert icon as AddGearForm; F3 no-session returns row to idle; F4 timeout reading 2xx body = unconfirmed; F5 .studio-primary keeps existing 40px at ≥768 fine pointer (44 on coarse/narrow) — existing Studio size wins over §17.1's 44px
Dev server already running on 5173 (PID 86555, not started by the cycle); Vite reloaded config, /api/plans proxies to plan-service (401 verified)

Backend files: Project/Backend/plan-service/** (new); Project/Backend/pom.xml (+plan-service module); Project/docker/postgres/init-databases.sql (+CREATE DATABASE plan_db;)

Closeout doc notes from backend-api: mvn not on PATH (used ~/.m2/wrapper/dists/apache-maven-3.9.16/.../bin/mvn); Project/.env values are quoted, strip quotes when exporting in a shell

Unresolved failures:
- none

Known limitations (accepted at the product gate, polish backlog, non-blocking):
- A: Finish button 40 px with a desktop mouse, 44 px on touch/narrow (existing Studio size kept)
- B: polite status may keep "Saving your plan." after a failed save (a11y polish)
- C: at 1440×900 the first failure message can sit ~4 px below the gear zone's visible edge (layout polish)
- D: reopening the Studio shows the idle Finish row (FEATURE-011 does not read Plans); pressing it resolves to the existing Plan; FEATURE-013 may revisit
- Production routing of /api/plans/** not built (U6); dev proxy only

Deferred / not run (not PASS, not defects): trail-service unavailable during create; unconfirmed/unexpected copy; fresh-volume init; <768 px; midnight crossing; session expiry during save; real screen reader; Safari; physical phone

QA data left in place by decision: otc-qa-f011-a-ffacf7, otc-qa-f011-b-778b0c; 7 plans rows (1 soft-deleted); 1 gear item

Next:
- FEATURE-012 — Ready-to-Go 3D Completion (NOT started; begins only when the user asks)
