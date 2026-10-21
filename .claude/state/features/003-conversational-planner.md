Feature: 003-conversational-planner
Spec: docs/features/003-conversational-planner.md
Branch: Dev_Frontend
Phase: CLOSED (hardening pass complete)
Status: PASS
Updated: 2026-10-12

Design: APPROVED (spec complete; Q1, Q2, Q3, Q5 decided by the user 2026-10-12; user started the cycle)
Implementation: COMPLETE (frontend)
Build: PASS (exit 0, rerun by frontend after repair 1; no file changed since)
Lint: PASS (exit 0, rerun by frontend after repair 1; no file changed since)
QA: PASS (run 1: 42 PASS, 2 FAIL (AC-30, AC-39), AC-37 NOT VERIFIED; run 2 after repair 1: AC-30 and AC-39 PASS, 7 touched criteria re-PASS; final 44 of 45 PASS, 0 FAIL, AC-37 NOT VERIFIED by QA)

Security review: COMPLETE — lead read of this feature's diff (apiClient.ts, api/plannerTurn.ts, vite.config.ts, storage grep). No blocking finding; one edge case recorded under Known limitations (identity switch from another tab).
Repair cycle: 1/2 used (AC-30, AC-39 fixed and confirmed)

Path: ordinary web feature (frontend → lead diff review → security review → qa)

Granted write paths beyond Project/Frontend/** (spec section 23):
- docs/FRONTEND_CONTEXT.md, limited to what actually changed: the /home route and shell, the authenticated API request, the development proxy, the planning feature structure, the planner session-storage key, and the removal of the saved-request block
Not authorized for any agent: Project/Backend/**, Project/docker/**, Project/docker-compose.yml, Keycloak realm/client/theme, infrastructure, docs/DESIGN_SYSTEM.md (D27)

Baseline at cycle start (2026-10-12 09:59 PDT):
- git status --short had 124 entries, including unrelated uncommitted work under Project/Backend/ and Project/docker-compose.yml (AC-43 is judged against this)
- Local stack listening: 5173 (vite dev), 8081, 8082, 8083 (Spring services), 8180 (Keycloak), 5432 (Postgres)
- Existing planning files: Project/Frontend/src/features/planning/{pendingPrompt.ts, planningPrompt.ts, SavedTripRequest.tsx}
- Home media present: Project/Frontend/public/media/home/{background.mp4, background.png}

Lead diff review: PASS (scope only, 2026-10-12)
- Every file newer than the cycle-start marker is under Project/Frontend/src/**, Project/Frontend/vite.config.ts, or docs/FRONTEND_CONTEXT.md. Nothing under Project/Backend, Project/docker, docker-compose.yml. package.json / package-lock.json mtime unchanged (Oct 11 22:09).
- vite.config.ts: one proxy entry, "/api/planner" -> http://localhost:8083, no changeOrigin, nothing else.
- Non-goal grep clean: no 3D/WebGL, no WebSocket/SSE, no other /api/ path, no console.*, no localStorage, no authSession/keycloak-js import. Links in HomeHeader go to /home and /gear only.
- FRONTEND_CONTEXT.md edits stay inside the section 23 limit (sections 7, 8, 10, 13 step 1).

Security review detail:
- Token: fetched from getAccessToken() immediately before each request, set only as the Authorization header, never stored or logged. authenticatedApiRequest() refuses any path not matching ^/api/ before asking for a token; URL is API_BASE_URL + path, so the header stays on the configured API origin.
- Storage: one sessionStorage key "outdoor-trip-companion.planner" (messages, context, tripDate, startingPoint incl. coordinates, draft, draftFromLanding). No token, nothing in localStorage.
- No secret or new env variable in the bundle. Proxy forwards unchanged.

Q4: RESOLVED. POST http://localhost:5173/api/planner/turn with Origin: http://localhost:5173 and no token -> 401, empty body (authentication judged, no origin refusal). Same result direct to 8083. Still to be shown by QA: a 200 with a real bearer token.

Deviations accepted by the lead (QA: verify, do not fail on these alone):
1. HomeMedia layers are last in the DOM, not first (19.1); aria-hidden, fixed, behind content.
2. AccountControls rendered twice inside the phone Menu, each showing one part via CSS (signOut is not exported from @/features/auth). Must not produce duplicate focusable or announced controls.
3. 768-1023px Pause/Play control is position:absolute under the header, not fixed.
4. Header scrim feather uses FEATURE-001's eased five-stop profile; plateau is ink at 0.72.
5. Stored state has one extra field, draftFromLanding (keeps N1 across a reload).
6. Stored recommendations are reduced to the displayed fields.
Lead rulings on spec ambiguities:
- 19.2 vs 10.2.6: N1 and V5 may be present in the initial DOM inside their status/alert roles; "nothing announced on load" is judged on the announcer regions.
- 10.2.5: the composer control row's 44px is content height; row box 52px.
- 17.2 at 768px: identity may shrink below 160px with ellipsis while "Signing you out..." is shown.
- Interpretations 7-14 from the frontend report (greeting stays first, zero-result collapse rule, V5 at send, D1 not while typing the year, stricter reply check, geolocation timeout via the browser option, cleanup on redirecting/callback states, one-column score row type) accepted.

Known limitations found so far:
- Identity switch from another tab: planner state is cleared only when this tab observes a no-session state. If a different user signs in at Keycloak from another tab and this tab is reloaded before its own renewal fails, the earlier conversation (and stored starting-point coordinates) is restored under the new session. Spec section 16 forbids storing anything from the auth adapter, so state is not bound to an identity. Needs a user decision; not an AC-32 case.
- SavedTripRequest.tsx was untracked and is deleted (spec D20); git cannot restore it.

Agents completed:
- frontend (implementation; build 0, lint 0)
- qa (run 1; interrupted once by the usage limit, resumed, completed)
- frontend (repair 1)
- qa (run 2, targeted rerun)

Agents skipped:
- ui-ux (spec and design already complete; ambiguities ruled on by the lead)
- backend-api (Q4 passed; no contract gap found)
- three-d (no realtime 3D; Home is pre-rendered video)

Files changed:
- Project/Frontend/vite.config.ts
- Project/Frontend/src/services/apiClient.ts
- Project/Frontend/src/pages/HomePage.tsx
- Project/Frontend/src/app/router/routes.tsx
- Project/Frontend/src/app/providers/AppProviders.tsx
- Project/Frontend/src/index.css
- Project/Frontend/src/lib/{useMediaQuery.ts, useDismissable.ts} (new)
- Project/Frontend/src/features/home/{AuthenticatedHome.tsx, HomeHeader.tsx, HomeMedia.tsx, homeMediaConfig.ts, home.css} (new)
- Project/Frontend/src/features/planning/{PlannerSessionBoundary.tsx, content.ts, presentation.ts, tripDate.ts, readRecommendation.ts, plannerDom.ts, planner.css} (new)
- Project/Frontend/src/features/planning/{types/planner.ts, api/plannerTurn.ts, storage/plannerSession.ts, state/plannerStore.ts, hooks/usePlannerTurn.ts, hooks/useGeolocation.ts} (new)
- Project/Frontend/src/features/planning/components/{ConversationalPlanner, PlannerConversation, PlannerMessages, PlannerComposer, PlannerContextControls, PlannerNoteLine, RecommendationGroup, TrailRecommendationCard, NewPlanButton, NewPlanConfirmation, PlannerAnnouncer}.tsx (new)
- Project/Frontend/src/features/planning/SavedTripRequest.tsx (deleted)
- docs/FRONTEND_CONTEXT.md (sections 7, 8, 10, 13)

Unresolved failures:
- (none)

QA run 1 detail (qa, webapp-testing skill: Python Playwright 1.60 in a scratch venv driving installed Chrome headless; 390/320 via context viewports):
- Live (real stack, no interception): AC-14, AC-15, AC-16, AC-18 PASS. 5 real planner turns. First request {"message":"I want to go hiking","context":null,"latitude":49.2827,"longitude":-123.1207,"tripDate":"2026-10-13"}, no radiusKm; 200 with Bearer token through the proxy (Q4 fully closed). Ready turn took 4.4 s; trails Quarry Rock 74, Bowen Lookout 71, Dog Mountain 71.
- Panel box (x, y, w x h; header): 1920x1080 64,104,680x760 (72); 1440x900 56,104,640x756 (72); 1366x768 40,80,620x664 (64); 768x1024 64,365.1,640x634.9 (64); 390x844 0,256,390x588 (56); 320x568 0,116,320x452 (56). Match spec 9.2 / 17.1.
- AC-11 white fill: panel rgb(41,56,59), header band rgb(78-79,91,94). Black fill: panel (10,25,28), header (7-8,20,23). No text-shadow / backdrop-filter.
- AC-42: lowest text ratio 4.83 (stone on a pressed score button), lowest boundary 4.43 (ember on paper); snow on panel 12.19 / 17.97; smallest coarse target 44x44.
- AC-05: same video node, 0 backward jumps, mp4 requested once. AC-36: scrollWidth == viewport at all six in 13 states.
- AC-32: sessionStorage empty after sign-out; same user and a different user in the same tab get the initial state; same after expiry and reload-after-end.
- AC-33: only http://localhost:5173 and http://localhost:8180 contacted; token in no URL, storage, or console.
- Not verified: AC-37 (no on-screen keyboard in headless desktop Chrome; with a stubbed visualViewport.height the panel keeps its 420px minimum and the control row sat at y 474-518 against 508px visible at 390x844 and outside 308px at 320x568 — needs a real phone). AC-45 regression clause by smoke test only (landing at six viewports, registration, sign-in, callback, return destination, sign-out, session-ended notice, silent restore); the 86 criteria of 001/002 were not rerun; no file under features/landing or features/auth changed. AC-28 timeout via a stubbed error code. AC-13 IME via a synthetic composition event. Not attempted: real screen reader, Safari/iOS, Firefox, forced colours, 200% zoom.
- Observations that did not fail a criterion:
  1. AC-21: the application logs nothing, but Chrome itself logs "Failed to load resource ... status of 500". Lead reading: the criterion is about what the application writes; PASS stands.
  2. Phone Menu: on open, focus stays on the Menu button (HomeMenu tries to focus the CSS-hidden Sign out of the first AccountControls instance). Spec 17.2 does not require focus to move in; Tab reaches Gear and Sign out; no duplicate in the accessibility tree.
  3. A pending-prompt key planted by hand while signed in survives session expiry and comes back as the draft with N1. Cannot normally exist while signed in. Not fixed.
  4. A reply taller than the history lands with its "Planner" label 12px below the history top; 10.2.4 says 16px. Sent to frontend with the repair.
  5. After a stale-date restore the stored value keeps the past tripDate until the next write; interface correct.
  6. "Sent." announcement is skipped if the reply arrives within 50 ms (live turns took 1.8-4.4 s).
  7. Backend quality: "Make it an easy hike instead" returned Hard and Moderate trails; a Lake preference returned no lake trail; backend text is "3 trails". Shown verbatim. Not a frontend issue.
  8. /favicon.ico 404 (pre-existing).
- Accounts left in the realm: otc-qa-5f16f1cb ("Quinn Tester", used for live turns, so user-service likely created its profile), otc-qa-581ee810 ("Robin Second").
- Scratch (does not persist): <session scratchpad>/qa-003/ incl. results.md, live_turns.json, shots/.

Repair 1 (frontend, 2026-10-12): files state/plannerStore.ts, planner.css, components/PlannerConversation.tsx. Build 0, lint 0. Not verified by frontend in a real reload or with real Tab presses.
- AC-30: the store tracks page leaving (pagehide, plus beforeunload while a turn is in flight). A failure arriving then is held, so storage keeps delivery "sending" and restores as E6. If the page stays (pageshow, or 10 s after a beforeunload with no pagehide) the held failure is applied with its real kind. Page-open failures and New Plan discard unchanged.
- AC-39: .planner-history scroll-padding 8px. Below 768px the Conversation region's ring is inset: 6px double ink border + sun outline at offset -4px; padding 16px -> 10px while focused so content does not move. From 768px unchanged.
- 10.2.4: reply top offset now read from offsetTop (ignores the 4px entrance transform); .planner-history is position: relative. Frontend measured 16px on the instant-scroll path.

QA run 2 (qa, same tooling, 2026-10-12; 2 more live turns): PASS.
- AC-30: real reload with a held request and with a live request (net::ERR_ABORTED): storage stays delivery "sending", restore shows "Not sent" with E6 and Retry; Retry resends once (live Retry 200 in 3.0 s, 3 cards). Navigation away and Back also E6. Normal restore identical; 0 requests, 0 geolocation calls; stale date cleared with V5.
- AC-39: real Tab / Shift+Tab, 30 history stops + 28 edge cases per viewport at all six: clipped pixels 0 everywhere (run 1: 3, 5, 6, 6, 6, 6). Region ring at 390/320 inset, bands ink ink sun sun ink ink whole on four sides; outer ring whole at 1440 and 768.
- AC-21: network error, 500, 503 -> E1 in 13-36 ms; other 400 -> E4; 401 -> E5; Unsafe Prompt -> E3; 45 s hang -> E2 at 45.2 s. AC-22, AC-24 (late response discarded), AC-32 (sign-out with a turn in flight: storage empty, clean initial state), AC-36 at 390/320 with the region focused (no overflow, no content shift), AC-38 history tab order: all PASS.
- AC-23: reply label row 16px below the history top at 1920/1440/1366/390 on the smooth path and at 1440 under reduced motion.
- New mechanism edge (beforeunload that does not navigate): a failure that arrives then stays hidden and surfaces as E1 exactly 10.0 s after the beforeunload; the user sees the waiting indicator for a turn that has already failed during that window. Accepted as a bounded edge.

Unverified at close:
- AC-37 on-screen keyboard at 390x844: needs a real phone. Risk from QA's stubbed visualViewport: the panel keeps its 420px minimum, so the date / starting-point / Send row may sit partly below the visible area at 390x844 and outside it at 320x568.
- AC-45 regression clause: smoke test only; the 86 criteria of FEATURE-001 and FEATURE-002 were not rerun (no file under features/landing or features/auth changed).
- Real screen reader, Safari/iOS, Firefox (incl. the beforeunload branch of the AC-30 fix), forced colours, 200% zoom, a real IME, a real geolocation timeout.

Open decisions for the user:
- Planner state is not bound to a user identity (other-tab identity switch + reload restores the earlier conversation and starting-point coordinates). Fixing it needs a change to spec section 16's rule against storing anything from the auth adapter.
- Backend recommendation quality seen in live turns ("easy" refinement returned Hard and Moderate trails; Lake preference returned no lake trail). Outside this feature; a backend-api question if the user wants it looked at.
- Spec wording that could be tidied by ui-ux in a later pass, none blocking: AC-21 "console shows no status code" (Chrome logs failed requests itself); 19.3 on ring clearance and the inset region ring on phones; 19.2 vs 10.2.6; 10.2.5 row height.

Left in the environment:
- Keycloak accounts otc-qa-5f16f1cb and otc-qa-581ee810 (realm outdoor-trip); the first likely has a user-service profile row.
- 7 live planner turns in total were made against OpenAI / Open-Meteo.

=== HARDENING PASS (reopened by the user 2026-10-12 14:40 PDT; first cycle closed PASS at 14:26) ===

Source: a brief pasted by the user, confirmed by the user ("Run it now"). Frontend-only follow-up. Not FEATURE-004. No backend change, no dependency, no commit, no push.
Scope:
1. Bind planner session state to the authenticated Keycloak `sub` so a different user never restores another user's messages, context, recommendations, date, draft, or starting-point coordinates.
2. Regression against the backend recommendation-semantics hardening the user made outside this cycle (explicit difficulty and scenery are now eligibility constraints; zero results possible). No client-side filtering. Fix the empty-result state only if it is broken.
User decisions:
- `sub` may be stored for ownership only (it is not a secret). This overrides spec section 16 "Never contains ... anything from the auth adapter" for that one value. No token, no localStorage.
- Desktop-web first: QA widths 1920x1080, 1440x900, 1366x768, ~1024px. Below 768px best-effort. AC-37 = N/A by user decision; recorded as a note only. PRD section 42 (mobile usability of primary flows) is NOT edited and the mismatch is reported to the user.
- Not addressed: phone keyboard, the ~10 s cancelled-navigation edge, production routing, gateway, CORS, Safari/Firefox.
Write scope granted by the user: Project/Frontend/src/features/planning/** ; the smallest required change under features/auth/**, app/**, services/** ONLY to expose the subject; docs/features/003-conversational-planner.md and docs/FRONTEND_CONTEXT.md for behaviour clarification.
Lead design decision: owner-in-payload. The single key "outdoor-trip-companion.planner" stays (AC-31 keeps "one key"); the stored value gains the owner subject and a version bump; a value whose owner is missing or differs from the current subject is discarded and removed, never merged. The subject reaches planning as a plain string through the existing auth abstraction (AuthSnapshot / useAuth or one exported getter); no second Keycloak client, no token decoding in planning.

Baseline for this pass (14:40 PDT): markers hardening-start.marker and hardening-baseline-status.txt in the session scratchpad.
- Backend files already changed by the USER before this pass (14:37): recommendation-service TrailScoringService.java and four test classes; docs/FRONTEND_CONTEXT.md (14:36) now documents the eligibility rules. These are not this pass's changes.
- recommendation-service process (pid 87969) started 08:53 from IntelliJ; spring-boot-devtools is on its classpath and target/classes/TrailScoringService.class was rebuilt 14:37:47, so it has probably restarted with the new code, but that is unconfirmed. QA confirms by behaviour; if the old behaviour shows, it is an environment block, and no agent restarts the user's service.

Hardening status:
- Implementation: COMPLETE (frontend). Build 0, lint 0. package.json / lockfile untouched.
- Lead scope check: PASS. Files newer than hardening-start.marker: features/auth/{authSession.ts, index.ts}, features/planning/{state/plannerStore.ts, storage/plannerSession.ts}, docs/FRONTEND_CONTEXT.md (section 7, two bullets), plus the lead's spec edit and this file. No backend, docker, Keycloak, dependency, landing, or home change. The only .filter calls in planning are a string type guard and a null-part removal, both pre-existing; no recommendation filtering, sorting, or score change.
- Security read (lead): getAuthenticatedSubject() returns only the `sub` string from idTokenParsed ?? tokenParsed, null unless status is authenticated or signing-out; no token leaves the auth module. Stored value: version 2, owner, messages, context, tripDate, startingPoint, draft, draftFromLanding. readPlannerSession(owner) removes any value it does not return.
- Spec update (lead): COMPLETE. docs/features/003-conversational-planner.md: status row, section 16 (Owner, Never contains, Restore, Different user, Validation rows), D28 (ownership), D29 (desktop-web first, AC-37 N/A, PRD 42 mismatch noted), AC-32 extended, AC-37 marked N/A, 24.1 viewport note.
- Empty result: unchanged. Backend no-match message verbatim + caption + Z1, no cards, composer available. Lead ruling: the visually hidden h2 "Trails for {date}, from {place}" on a zero-result group stays (spec-defined, passed AC-19 and AC-40); noted as a possible later wording tidy.
- QA (targeted, scenarios A-D): PASS (run 3, 2026-10-12 evening; one usage-limit interruption before any work, then completed). 0 FAIL, nothing blocked by the environment.

Implementation detail:
- Root cause: the stored value had no owner and the store restored any valid value under the key; ownership relied on this tab observing a session end.
- Subject: getAuthenticatedSubject() exported from @/features/auth, read only in state/plannerStore.ts (before first storage access, and on each access to compare with the in-memory owner). A subject change in memory is treated as a session end for the old owner. No usable sub -> memory only, nothing restored or written.
- Frontend verified ten cases with a throwaway Node harness over the real store/storage modules and a simulated subject (28 assertions). NOT verified by frontend: the real sub from a live Keycloak session, the two-user scenario end to end, repair-cycle-1 behaviours in a browser after this change.
- Side effect: any planner value stored before this change (version 1) is discarded once on first load.

QA run 3 — hardening (qa, same tooling, desktop viewports only, 16 live turns, no account registered):
- Subjects: A otc-qa-5f16f1cb = d39bb3fe-cbb8-4722-b3e9-d9d241c77e5e; B otc-qa-581ee810 = 9114a1b9-eb03-414f-84d9-1d08e3992820.
- D1 (identity change in another tab, then reload of tab 1): as B, none of A's messages, summary, groups, date, draft, or starting point; planner key absent; reload made 0 planner requests and 0 geolocation calls; B's first request under B's token with context null and Vancouver. If tab 1 is used BEFORE reloading, the old document still shows A and sends under A's own still-valid token (200); no request ever went under B's token with A's data. Accepted.
- D2 (same tab A -> B -> A): each sign-in gets the initial state; key absent after each sign-out.
- C: stored value version 2, owner == A's sub; reload restores 5 items, 2 cards, summary, date, "Your location", draft; 0 requests, 0 geolocation calls; key first read 2-4 ms after the token response.
- Discard: 12 bad values (invalid JSON, v1, no / empty / numeric / null / object owner, B's real sub, A's sub with trailing space, A's sub uppercased, messages as a string, malformed message item) each gave a clean initial state and removed the key.
- Hygiene: no JWT-shaped string or "Bearer" in any storage value; localStorage has nothing from the planner; owner is the only identity value; sub not in the DOM, URLs, or console. Sign-out removes only the planner key and FEATURE-002's session-held marker.
- New Plan: clears messages, context, groups, date, draft; keeps the starting point; value still owned by A.
- Backend semantics (the running 8083 process DID have the new code):
  A: "A moderate hike, about three hours." -> 3 MODERATE trails (Bowen Lookout 84, Quarry Rock 84, Dog Mountain 83). "Actually, make it an easy hike instead." -> context difficulty EASY, recommendations [], "I couldn't find a trail that fits those preferences."; next request carried that context deeply equal. Run 1's backend had returned Hard and Moderate trails here.
  B: "An easy hike with lake views." -> EASY + LAKE, empty list; page showed the backend message, caption, Z1, no card. Refinement "A moderate hike with forest scenery is fine too." -> 2 trails.
  Positive checks: HARD + MOUNTAIN from Vancouver -> Grouse Grind 84, Stawamus Chief 81; HARD + LAKE from 49.9575 / -123.12 -> Garibaldi Lake 85. Cards equal the response in count, order, names, scores every turn.
- Regression spot checks: E6 after a real reload with a held turn; E1 for a 500 in 43 ms; 30 Tab stops, 0 px clipped.
- Layout: panel 64,104,680x760 at 1920x1080; 40,80,620x664 at 1366x768; 32,80,560x664 at 1024x768; unchanged with results and with an empty result; no document scroll, no horizontal overflow.

Findings for the user (not frontend defects):
- Seed data (V2__seed_demo_trails.sql) has four Moderate and four Hard trails and NO Easy trail, so with the corrected backend every "easy" request returns the empty state. No lake trail is within the default radius of Vancouver either. "Every returned trail is EASY" could therefore only be observed as an empty list.
- Backend text "I found 1 trail that fit what you're looking for." is ungrammatical; shown verbatim.
- PRD section 42 still says primary flows remain usable on mobile; the spec's D29 (desktop-web first, AC-37 N/A) is a note only.

Not verified in the hardening pass: anything below 768px (by scope), browsers other than Chrome.

Final state: build 0, lint 0 (frontend, after its last edit at 14:43; no file changed since). Nothing committed or pushed.

Next:
- Closed. The user decides whether to freeze and commit FEATURE-003. The next feature starts only when the user asks.
