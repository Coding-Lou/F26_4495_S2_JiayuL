Feature: 014-plan-memory-bridge
Spec: docs/features/014-plan-memory-bridge.md
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (2026-10-20)
Updated: 2026-10-20
Cycle started: 2026-10-20 22:36 (reference time for the "no Project/Backend file newer" check)

Design: APPROVED (spec §10, §10.11; frozen 2026-10-20 with U1–U7 and amendment A1, spec §29.1)
Implementation: COMPLETE (frontend)
Lead diff review: PASS (11 files, all in spec §25.1; no Project/Backend file newer than 22:36; A1 direction verified by grep: plans → memories only; no /public, no focus refetch on the index)
Build: PASS (frontend, exit 0)
Lint: PASS (frontend, exit 0)
QA: LEAN PASS (run 1: all P0 run PASS, AC-30 FAIL → repair 1 → Targeted QA PASS)

Repair cycles: 1 / 2 (AC-30: MyPlansScreen.tsx memoryIndexState() checks `retrying && isFetching` before isError; build 0, lint 0; Targeted QA PASS)
3D pipeline: SKIP (the spec requires no realtime 3D, no 3D assets, no Blender; FEATURE-012 frozen)

Agents completed:
- frontend (implementation)
- qa (Lean run 1: FAIL on AC-30 only; Playwright fallback, Chrome MCP unavailable to the agent)
- frontend (repair 1, AC-30)
- qa (Targeted run: PASS — AC-30 working state keeps focus, re-announces PM4, success → focus on Add memory; D-I2 mount refetch shows checking only; AC-15 checking → view, no add flash)
- (specification phase) backend-api inspection, frontend inspection, ui-ux §10

Agents skipped:
- ui-ux (design approved in spec §10)
- backend-api (spec §6: no contract gap; only on an unexpected contradiction → stop and report)
- three-d / Blender (no 3D)

Write scope (spec §25.1, U3 approved):
- features/plans/: new model/planMemory.ts, components/PlanMemoryBridge.tsx; edits MyPlansScreen.tsx, PlanEntry.tsx, myPlansContent.ts, my-plans.css
- features/memories/: new hooks/useOwnerMemoryIndex.ts (or in memoryQueries.ts); edits api/memories.ts (strict all-pages read), components/MemoryEditorScreen.tsx (date), components/MemoryEditor.tsx (preselectDate, initialDate baseline)
- features/trails/tripRoutes.ts: optional tripDate on newMemoryLocation, + memoryDetailLocation
- Dependency direction: plans → memories only (A1)

Files changed (Project/Frontend/src/):
- New: features/plans/model/planMemory.ts, features/plans/components/PlanMemoryBridge.tsx
- Edited: features/plans/components/MyPlansScreen.tsx, PlanEntry.tsx, myPlansContent.ts, my-plans.css
- Edited: features/memories/api/memories.ts (requestAllMemories, readStrictMemoryPage, MemoryListIncompleteError), hooks/memoryQueries.ts (ownerMemoryIndexKey, useOwnerMemoryIndex), components/MemoryEditorScreen.tsx (date), components/MemoryEditor.tsx (preselectDate, initialDate baseline)
- Edited: features/trails/tripRoutes.ts (newMemoryLocation tripDate?, memoryDetailLocation)

Accepted deviations:
- D-I1: malformed item / incomplete read use the existing failure kind `unusable` (spec §8 said `invalid`, which does not exist; types/memory.ts out of scope). Same behaviour: no auto retry, unavailable state
- D-I2: an errored index refetching without Try again (mount refetch over a cached error) shows `checking`; only a Try-again refetch shows the working unavailable row (`memoriesRetrying` flag). Never Add

Unresolved failures:
- none

Resolved:
- AC-30 (P1, owner: frontend, fixed in repair 1): after a failed first Memory read, Try again shows `checking` (PM4 + Try again removed, bars after 500 ms) and focus drops to BODY; on a second failure focus stays on BODY. Expected (§10.2 unavailable working state, §10.6, §8 rule 5): PM4 stays, Try again shows "Trying again…" aria-disabled and keeps focus. Probable cause: TanStack v5 resets a no-data errored query to pending/error null on refetch, so `memoryIndexState()` (MyPlansScreen.tsx ~522–548) never reaches its `retrying` branch

Lean QA run 1 validated (browser): AC-01–AC-11, AC-13–AC-22, AC-25, AC-28 (focus/reconnect part), AC-32; indirectly AC-31, AC-38 (1920). Deferred: AC-12 (code review), AC-24, AC-26, AC-27, AC-29, AC-33–AC-37, AC-38 <768. Not verified: screen reader, Safari, phones, forced colours.
Observation (outside 014, non-blocking): on Back from a saved Memory to /plans each trail detail was requested twice (013 trail queries)

QA data (QA accounts, real UI/APIs, no DB injection):
- A otc-qa-f014-a-acbfe9@example.test: Plans ea42ef77 (Grouse 2026-10-20, deleted), 7770728e (Dog Mountain 2026-10-30), 67f222b9 (Quarry Rock 2026-10-21), 7a3a99f3 (Eagle Woods synthetic 2026-10-21), 8c956c1c (Bowen Lookout 2026-10-21); Memories d2b0db62, ea254a49 (both deleted)
- B otc-qa-f014-b-acbfe9@example.test: Plan ac199d32 (Quarry Rock 2026-10-21)
- A2 otc-qa-f014-a2-…@example.test (Targeted run; run-1 password discarded): Plan c8c51a4f (Quarry Rock 2026-10-21, kept); Memory d0b36a58 (created and deleted via UI)

Deferred / not run (NOT passed; to Final Full Regression where applicable): AC-12 (code review only), AC-24, AC-26, AC-27, AC-29, AC-33–AC-38, multiple-match browser verification, real screen reader, Safari, physical phones, forced-colours mode
No DB injection used in FEATURE-014. QA data kept (not cleaned for closeout).

Known limitations (spec U5 and §30.1 A–E, accepted): offset-paging window above 50 Memories; > 500 Memories → unavailable; server accepts synthetic trail ids for Memories (UI-enforced); URL trail/date are prefills only. Unattributed "400 (Bad Request)" console resource error during Keycloak registration runs (no app flow failed). Back-from-Memory return re-requests each trail detail once more (013 trail queries; outside 014)

Next:
- FINAL FULL REGRESSION (separate explicit step; not started). Then approved final polish if necessary, demo preparation, deployment preparation
- FEATURE-001 to FEATURE-014 PASS / FROZEN; there is no FEATURE-015; feature freeze ACTIVE

Closeout (2026-10-20, docs only): spec §30–§30.1 + status; PRD §1, §4, §11.1, §11.2, §12.1, §15, §22; FRONTEND_CONTEXT header, §1, §3, §8, §9, §10, §12, §13; CLAUDE.md roadmap. DESIGN_SYSTEM.md unchanged. No Project/** change during closeout.
