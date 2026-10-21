Feature: 010-community-memories
Spec: docs/features/010-community-memories.md (IMPLEMENTED — PASS / FROZEN; closeout record in section 25)
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (user, 2026-10-18)
QA: LEAN PASS
Repair cycles: 0 / 2
Backend: UNCHANGED (FEATURE-008 public API reused)
Frontend: COMPLETE
Dependencies: NO NEW DEPENDENCIES
Blender: NOT REQUIRED
FEATURE-010: FROZEN
FEATURE FREEZE: ACTIVE
FEATURE-011: DOES NOT EXIST
Next: FINAL FULL REGRESSION (separate workflow; not run)
Updated: 2026-10-18

Design: APPROVED (spec section 18 by ui-ux; both section 24.1 items accepted by the user)
Implementation: COMPLETE (frontend)
Lead diff review: PASS (only community-memories/** new + discover DiscoverSection.tsx, TrailPopup.tsx, discover.css; no backend, features/memories, dependency, or proxy change)
Build: PASS (exit 0)
Lint: PASS (exit 0)
QA: PASS (Lean, run 1; no defects)

Repair cycle: 0/2
3D pipeline: SKIP (the spec requires no realtime 3D and no 3D assets)
Security review: Lead diff read for public-API-only use (no token, no owner endpoint); no auth or identity code changes

Decisions recorded at start:
- Popup order (user, 2026-10-17): facts → Daily Trail Activity → description/scenery → sample-data line → Community Memories → existing auth actions. FEATURE-006 order is not changed.
- Write scope: Project/Frontend/src/features/community-memories/** (new), features/discover/** (mount points, URL params, overlay shift), read-only imports from features/memories and features/trails (tiny behavior-preserving export change only if needed). No backend, proxy, dependency, or features/memories behavior change.

Agents completed:
- frontend
- qa (Lean run 1: PASS)

Agents skipped:
- ui-ux (design done in the spec, section 18)
- backend-api (FEATURE-008 public API is complete; call only for a verified contract defect)
- three-d (no 3D)

Files changed:
- Project/Frontend/src/features/community-memories/** (new: types/publicMemory.ts, api/publicMemories.ts, hooks/communityQueries.ts, content.ts, components/{CommunityPreview,CompactNoPhoto,CommunityPanel,CommunityList,CommunityDetail}.tsx, community-memories.css)
- Project/Frontend/src/features/discover/components/{DiscoverSection,TrailPopup}.tsx, discover.css

Accepted interpretations (verify, do not fail on alone):
- thumbnail hover is a plain 1px ink 0.32 ring (section 18.6 text)
- --community-panel-width set in CSS on .discover[data-community-open]
- a memory param without memories=1 still opens the Detail; Back adds memories=1 with replace
- dev StrictMode sends the first preview/list request twice (first aborted); production once

Lean QA evidence (run 1, Playwright fallback: Chrome DevTools MCP not exposed; Chrome 155 headless):
- Validated: AC-01–AC-16, AC-25, AC-26, AC-27, AC-29 (spot checks). AC-17, AC-18 partly by code reading / lead results (page-top laziness seen in the browser).
- Deferred (not run): AC-19, AC-20 (no second page with 2 Memories), AC-21 (Detail 404 seen via Private 3 only), AC-22, AC-23, AC-24, AC-28 (sheet below 1024), AC-30, AC-31 (stone count seen; clusters/activity not re-audited), rest of AC-29; P2 AC-32–AC-36. Not verified: screen reader, Safari, phones.
- Request counts (completed; dev StrictMode duplicate excluded): page top 0; activation 0; hover/pan with no selection 0; select curated trail 1 (size=2) + lazy cover; select synthetic 0; reselect cached 0; View all 1 (size=8); open Detail 1 + 2 gallery photos; reopen fresh Detail 0; strip click 0; pan away with panel open 0; simulated 503: 2 failures (request + one retry) then 1 success on Retry.
- Popup: order facts → activity → description → sample → Community → auth actions; heading h5 "Community Memories · 2 memories"; skeleton 197 px = loaded height at 1440×900; 1024×768 compact rows 42 px, popup 633 px, no internal scroll needed; 1920×1080 popup 360×649, panel 440, Detail frame 391×293; 1024×768 panel 360, Detail frame 319×239.
- Security: only public endpoints, no Authorization, credentials omit; Private 3 never shown; hand-built Private 3 URL → CM32 (API 404); trail-mismatch URL → CM32; no signed URL in the address or web storage.
- Console: only the known silent-SSO iframe warning and the expected 503s during the simulated failure.
- Info (not failures): StrictMode duplicate also on selection changes in dev; on a deep-link Detail load focus stays on body (section 16 defines focus for in-app opening only).

QA data (kept): account qa-f010-<hex> (credentials only in the session scratch directory); Quarry Rock Memories: Public 1 "QA Public 1 fog lifting at Quarry Rock" f9529fd5-5b3f-4a87-84d0-424e433497ce (2 photos), Public 2 "QA Public 2 quick evening loop" eb89cfc8-ea5f-4ee3-a60a-206f7da9338c, Private 3 "QA PRIVATE do not show" 0dd5026e-f825-4781-8c24-1212869df6b9. Local photo files under memory-service/.local-storage/.

Deferred / NOT RUN (not PASS, not defects; candidates for the final Full Regression):
- Due to current test data: Show older memories; Show older memories failure state; Community panel error state; public Memory Detail error state.
- Not run: PUBLIC → PRIVATE refresh; signed photo URL expiry / refresh after a long session; <1024 modal bottom sheet; reduced motion; real screen reader; Safari; physical phone / narrow device checks.

Known limitations (accepted): production routing of /api/memories/** to memory-service and an S3 bucket remain a deployment task (spec 24.3; local works through the Vite proxy; not solved in FEATURE-010); focus on body after a deep-linked Detail load; dev StrictMode duplicate first request.

memory-service: running throughout QA; stopped afterwards only because the background command reached its 2-hour limit. Impact: none. Not restarted for closeout. QA data persists in memory_db and local storage.

Commit / push: NONE (user instruction).

Closeout (2026-10-18, documentation and state only; no production code, backend, service restart, QA, or new data):
- docs/FRONTEND_CONTEXT.md: Community Memories architecture (public consumer, query keys, URL state, panel/Detail navigation, request budget, isolation, no author identity), folder tree and dependency rules, `/` route note, proxy and production-routing notes, deferred checks.
- docs/DESIGN_SYSTEM.md: §35.1 narrow Community rail exception; new §35.8; §14, §37.1, §37.3, §37.4, §37.5, §37.6 additions.
- docs/PRODUCT_REQUIREMENTS.md: decision record 2026-10-18; §2, §7.3, §7.4, §11.3, §33.1, new §33.3, §41 exception, §47 complete, §48 freeze active.
- CLAUDE.md: roadmap line (FEATURE-010 frozen; feature freeze; final Full Regression next).
- Spec: status IMPLEMENTED — PASS / FROZEN; section 25 closeout record.

Next:
- FINAL FULL REGRESSION, as a separate workflow when the user starts it: the whole journey (Public Landing → Discover → Authentication → Planner → Trail Detail → Preparation → Gear / Gear Studio → My Memories → Community Memories), cross-feature correctness first, plus the deferred checks accumulated across frozen features (including the list above).
- Feature freeze: no new product capability without explicit user approval. No FEATURE-011.
