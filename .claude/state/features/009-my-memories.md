Feature: 009-my-memories
Spec: docs/features/009-my-memories.md
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (user, 2026-10-17)
FEATURE-010: NEXT, NOT STARTED
Updated: 2026-10-17

Design: APPROVED (spec §22 by ui-ux during specification; user approval 2026-10-17, incl. §22.20 decisions and the D12 transparency amendment)
Implementation: COMPLETE (frontend)
Lead diff review: PASS (2026-10-17): only §25.2 paths changed, each within its limit; package.json/lockfile, index.css, home.css, public/, backend unchanged; no storage/console writes; router state = notice enum only; one-POST ref guard; memories imports only trails/planning-tripDate/auth/layout/lib/services-apiClient
Build: PASS (frontend, exit 0; chunks MemoriesPage, MemoryDetailPage, MemoryEditorPage + MemoryCommon)
Lint: PASS (frontend, exit 0)
QA: LEAN PASS (run 1, 2026-10-17; Playwright fallback with installed Chrome headless — Chrome DevTools MCP tools were not in qa's toolset)

Security review: lead diff read of the feature's files (owner data, token on multipart, cache isolation, return destination, no tokens/URLs in storage). Done in diff review: no token/URL/title in storage, URL or console; multipart sets no Content-Type; subject-scoped keys + existing cache clear; return-destination pattern limited to the four pathnames. No findings.
Repair cycles: 0/2 (none needed)
Backend: FEATURE-008 contract reused; no backend change
memory-service: started by the lead as a session background process; stopped AFTER QA finished because of the 2-hour background-command timeout. Impact: NONE (not a defect; not restarted for closeout)
3D pipeline: SKIP (spec requires no realtime 3D, no 3D assets; §4.2 non-goal)

Cycle started: 2026-10-17 ~12:50 (baseline: scratchpad git-status-before.txt; memory-service started by lead via wrapper Maven, local storage mode)

Agents completed:
- (none in this cycle; ui-ux ran during specification)

Agents completed (cont.):
- frontend (implementation; deviations 1–8 in its report: photo-recovery 60 s rule literal, expired-URL precheck post-render, Public notice shown whenever saved Memory is Public, imports services/apiClient, saved-state completes on last failed photo removed/retried, local edit tiles unmovable/removed without confirm, Cancel history behaviour, reorder-after-retry edge) — accepted by lead

- qa (Lean run 1: PASS, no failures)

Agents skipped:
- ui-ux (spec approved; §22 complete)
- backend-api (FEATURE-008 contract complete and verified, spec §5.2; only on a proven defect)
- three-d (no 3D)

Granted write paths (spec §25.2): Project/Frontend/src/features/memories/** (new); pages/MemoriesPage.tsx, MemoryDetailPage.tsx, MemoryEditorPage.tsx (new), pages/LazyRoutes.tsx, app/router/routes.tsx; components/layout/TripHeader.tsx + trip-shell.css (Memories link only); features/home/HomeHeader.tsx + home.css (Memories link only); features/auth/returnDestination.ts (D5 pattern only); features/trails/components/TrailDetailScreen.tsx, trails/tripRoutes.ts, trails/content.ts, trails/trails.css (D25 only); vite.config.ts (/api/memories entry only); src/index.css (only if needed).

Files changed:
- Project/Frontend/src/features/memories/** (new: content.ts, memories.css, api/{memoryRequest,memories}.ts, types/memory.ts, hooks/{memoryQueries,useMemoryChanges,usePhotoRecovery,useArrivalNotice,useLeaveGuard,useLocalPhotos}.ts, model/memoryText.ts, photos/preparePhoto.ts, components/{MemoriesShell,MemoryCommon,MemoryVisuals,MemoryCard,MyMemoriesScreen,MemoryDetailScreen,MemoryEditorScreen,MemoryEditor,EditorFields,PhotoSection,LeaveDialog}.tsx)
- Project/Frontend/src/pages/{MemoriesPage,MemoryDetailPage,MemoryEditorPage}.tsx (new), pages/LazyRoutes.tsx, app/router/routes.tsx
- Project/Frontend/src/components/layout/TripHeader.tsx, trip-shell.css (comment only)
- Project/Frontend/src/features/home/HomeHeader.tsx
- Project/Frontend/src/features/auth/returnDestination.ts
- Project/Frontend/src/features/trails/components/TrailDetailScreen.tsx, tripRoutes.ts, content.ts, trails.css
- Project/Frontend/vite.config.ts

Unresolved failures:
- none

QA evidence (measured):
- Create: POST /api/memories 201 once per Memory; photo POSTs 201 strictly sequential (2nd started when 1st finished); multipart part `file`, image/jpeg; title trimmed.
- Orientation: EXIF 6 JPEG 3000×1800 stored → prepared 1536×2560; upright in preview, Detail, card.
- Reorder PUT order 200, cover changed, focus followed, announced. Edit PUT body without trailId, visibility PUBLIC; MM47 notice. Delete 204 → list refetch; gone after reload.
- Isolation: A signs out, B registers in same tab: no frame with A's text; B's list has none of A's ids; A's URL → neutral Memory not found.
- Partial upload (3rd upload aborted): saved block, 2 of 3, Retry sent one photo POST, no second memory POST.
- 5-photo limit on create and edit; HEIC/GIF rejected; leave dialog; future date blocked; simulated PUT failure keeps values, no false success.
- Trail Detail: Choose this trail on screen on arrival (1440: 184–228, page does not scroll; 1920: 184–228; 1024: 148–192); Add a memory in .trail-column; preselects trail.
- Collection columns: 1440 4×283.5; 1920 4×341.5; 1024 3×282. Editor spread at 1440/1920, single column at 1024.
- Console: 0 uncaught/React errors (known non-feature: favicon 404, silent-SSO iframe sandbox warning). 54/54 memory API requests carried Bearer.
- AC-18: one detail refetch after 65 s with photo URLs blocked, no loop.
Deferred / not run: P1 AC-22, 24, 25, 26, 28, 29, 35, 36; parts of AC-11 (date change, story clear), AC-13 (back to Private), AC-17 (1366×768), AC-30 (reload prompt, sign-out case), AC-32 (classic scrollbars), AC-02 narrow Menu; all P2 (AC-37–43). Not verified: real screen reader, Safari, physical phone.
Known limitations: (1) after a transient photo failure on fresh data the frame keeps the fallback until the next refetch/remount (consistent with the 60 s rule of §17.3); (2) Edit upload progress text counts oddly across batches ("1 of 1", "Uploading…", "2 of 3") — cosmetic; (3) QA data left in memory_db: accounts otc-qa-009-a-08cada ("QA partial upload A", Lindeman Lake, 5 photos; one deleted Memory) and otc-qa-009-b-08cada ("QA B quarry walk"); (4) production routing to memory-service is still a deployment concern (spec §27.3); only the dev proxy exists. (5) memory-service is down until restarted (e.g. from IntelliJ); see the memory-service line above.

Closeout (2026-10-17, documentation and state only; no production code changed, no tests rerun, memory-service not restarted):
- docs/features/009-my-memories.md: status IMPLEMENTED — PASS / FROZEN; §28 implementation record
- docs/DESIGN_SYSTEM.md: extension note; §9 paper-shade pairs; §14 journal surfaces; §32 Memory / long-form lines; §36.1 note; new §37 Journal Pages (Memories)
- docs/PRODUCT_REQUIREMENTS.md: §1.1 decision row 2026-10-17; §33.1 My Memories note; §47 FEATURE-009 complete/frozen, FEATURE-010 next
- docs/FRONTEND_CONTEXT.md: header, §1, §3, §4, §7 (callers, return destinations, five proxy paths), §8 (routes, lazy chunks, My Memories architecture), §9, §10 (tree, dependency rules), §12 (risks)
- CLAUDE.md: roadmap line; .claude/agents/qa.md: final Full QA after FEATURE-010
- Remaining follow-up (user's discretion): .claude/skills/feature-cycle/SKILL.md step 5 still says the final Full QA comes after FEATURE-008

Next:
- none for FEATURE-009 (frozen). FEATURE-010 Community Memories starts only when the user asks.
