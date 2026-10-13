Feature: 002-authentication
Spec: docs/features/002-authentication.md
Branch: Dev_Frontend
Phase: CLOSED
Status: PASS
Updated: 2026-10-12

Scope: APPROVED (spec sections 1-20, user-approved 2026-10-11, 37 acceptance criteria)
Design: APPROVED (ui-ux wrote spec section 21, about 440 lines; Lead approved 2026-10-11 with decisions D15-D26 and new item K21 in spec section 20/15)
Implementation: COMPLETE (frontend; parts 1, 2a, 2b; part 2b was interrupted once by the usage limit and resumed)
Build: PASS (frontend, after part 2a, exit 0; part 2b changed theme CSS only, so not rerun)
Lint: PASS (frontend, after part 2a, exit 0, no warnings)
Security review: PASS (Lead read the FEATURE-002 diff; parts 1 and 2a; part 2b changed one CSS value only). No high or medium finding.
Lead diff review: PASS (2026-10-12: only approved paths changed; no Backend file newer than cycle start; only keycloak-js added;
  no product API call, 3D import, or canvas; one template and one script in the theme, both approved (D28, D29))
QA: PASS (run 1, 2026-10-12: 36 of 37 criteria PASS, 0 FAIL; AC-37 NOT VERIFIED by QA)
AC-37: CLOSED by the Lead on 2026-10-12 after the user supplied K14 and K18 (see "AC-37 closed"). All 37 criteria are now met; QA was not rerun.

Repair cycle: 0/2

Cycle start: 2026-10-11 22:07 PDT. Newest file under Project/Backend at that moment: 2026-10-10 19:50
  (recommendation-service .../client/weather/WeatherServiceClient.java). Any Backend file newer than the cycle start is a scope failure.

Recover findings (2026-10-11):
- Branch Dev_Frontend. No prior 002 checkpoint: new cycle. 001-public-landing is PASS / CLOSED.
- Spec has one uncommitted wording edit in section 8 (non-goal renamed to "Authenticated Home room background"); no scope change.
- Section 19 prerequisite is met: .claude/agents/frontend.md line 50 already allows spec-authorized extra write paths.
- Running locally: outdoor-keycloak 26.7.4 on 8180 (discovery document answers 200), outdoor-postgres,
  the project's Vite dev server on 5173 (cwd Project/Frontend), and user-service on 8081
  (com.jay.outdoor.user.UserServiceApplication; GET /api/users/me without a token answers 401).
  Everything section 19 "What QA needs running" lists is up, except the theme (not built yet).
- Project/docker/ holds only postgres/. No Keycloak theme dir yet. keycloak-js not in package.json.
- features/auth holds only authBoundary.ts (the FEATURE-001 placeholder).

Approved extra write paths for frontend (FEATURE-002 only, spec section 19):
- Project/docker/keycloak/themes/outdoor-trip-companion/login/** (new): login theme only
- Project/docker-compose.yml: one read-only bind mount inside the keycloak service, no other line

Agents completed:
- ui-ux (section 21; changed only section 21 and the Status row, verified from the diff hunks)

- frontend (implementation part 1)

- frontend (part 2a: D27, D28, D29)

- frontend (part 2b: visual pass on the rendered theme; one CSS fix)

- qa (run 1)

Agents in flight:
- (none)

Agents skipped:
- three-d (no realtime 3D)
- backend-api (no backend change pre-authorized; called only if a real contract gap is reported)

Files changed:
- docs/features/002-authentication.md (ui-ux: section 21; Lead: status row, K21, D15-D26, Q2/Q4 marked resolved)
- Project/Frontend changed: package.json, package-lock.json (keycloak-js ^26.2.4 only), vite.config.ts (port 5173 + strictPort),
  .env.example, src/vite-env.d.ts, src/main.tsx, src/index.css, src/app/providers/AppProviders.tsx, src/app/router/routes.tsx,
  src/components/layout/AppLayout.tsx, src/pages/HomePage.tsx, src/features/auth/authBoundary.ts,
  src/features/landing/{PlannerMessage.tsx, LandingNav.tsx, LandingHero.tsx, HeroIntro.tsx, usePlannerPrompt.ts, content.ts, landing.css}
- Project/Frontend created: .env.local (git-ignored, needed by the dev server), public/silent-check-sso.html,
  src/features/auth/{authSession.ts (only keycloak-js importer), authConfig.ts, authResponse.ts, authNotices.ts, authContent.ts,
  returnDestination.ts, useAuth.ts, index.ts, ProtectedRoute.tsx, PublicLandingRoute.tsx, AuthCallbackRoute.tsx, AuthWaitingScreen.tsx,
  AccountControls.tsx, auth.css}, src/features/landing/{AuthGateActions.tsx, AuthActionLabel.tsx, authControlAttributes.ts},
  src/features/planning/SavedTripRequest.tsx
- Project/docker/keycloak/themes/outdoor-trip-companion/login/{theme.properties, messages/messages_en.properties,
  resources/css/outdoor-trip-companion.css, resources/img/favicon.ico}
- Project/docker-compose.yml: keycloak service gained a volumes key with the one read-only mount (3 added lines incl. a blank)
- Part 2a: authSession.ts (D27 marker outdoor-trip-companion.session-held), theme login-page-expired.ftl (new, D28),
  theme resources/js/registration-focus.js (new, D29, 68 lines), theme.properties (scripts=js/registration-focus.js),
  messages_en.properties (pageExpiredRestart added, empty pageExpiredMsg2 override removed), theme CSS (page-expired hiding rules removed)
- docs/FRONTEND_CONTEXT.md (Lead, 2026-10-11): section 7 auth flow + client settings table + theme, section 8 routes and landing boundary,
  section 10 tree, section 12 risks, section 13 step 1
- Template overrides: exactly one, login-page-expired.ftl (D28), derived from keycloak-themes 26.7.4 base/login/login-page-expired.ftl

Lead scope check of part 1 (2026-10-11): PASS. Only the paths above changed; no Backend file newer than the cycle start;
compose diff is the one mount; package.json gained only keycloak-js; only authSession.ts imports the adapter.

Token and session strategy (implementer's report):
- Tokens in adapter memory only. Signed in and after reload: localStorage empty, no app-origin cookie, no JWT-shaped value, console clean.
- Adapter writes localStorage kc-callback-<state> (state, nonce, redirectUri, pkceCodeVerifier, expires) per authorization request;
  removed when processed, else ages out after 60 min. No tokens in it.
- App sessionStorage keys: pending prompt (existing), outdoor-trip-companion.return-destination,
  outdoor-trip-companion.sign-out-started (chooses O1 vs O2 on the next load; grants nothing).
- Restore: hidden iframe prompt=none -> /silent-check-sso.html -> code exchange; silentCheckSsoFallback false; bounded at 9 s.
- Renewal: refresh 30 s before expiry, on protected-route navigation, on tab-visible, inside getAccessToken(); refused -> session-expired.

V1-V9 (implementer): V1 keycloak-js 26.2.4, full flow works against 26.7.4. V2 as above. V3 hidden frame; same-site on localhost,
cross-site depends on third-party cookies and fails closed. V4 access 300 s, refresh/SSO idle 1800 s, SSO max not observable (user later reported 12 hours, see "AC-37 closed").
V5 one startup check per load under StrictMode. V6 fragment response; adapter replaces history, route then replaces /auth/callback;
error responses in query or fragment stripped with replaceState. V7 POST to end-session with id_token_hint in the body, no confirmation page.
V8 strictPort 5173. V9 scope=openid; client defaults yield openid email profile.

K1-K21 (observed without admin credentials unless marked USER):
K1 matches. K2 public (exchange with no secret). K3 implicit, hybrid, password grant all refused. K4 no-challenge and plain refused.
K5 WILDCARD: any path on localhost:5173 accepted; other ports/origins refused. K6 decided: /auth/callback and /silent-check-sso.html.
K7 / and /home accepted; foreign refused. K8 token POST allowed from :5173 only. K9 on, both paths. K10 visible.
K11 six fields, rendered order Username, Password, Confirm password, Email, First name, Last name. K12 not blocking (USER to confirm setting).
K13 link shown; email delivery USER. K14 no length/case/digit/special policy; other policy types USER. K15 as spec. K16 no display name.
K17 keycloak.v2. K18 as V4; SSO max USER. K19 token has sub, email, name, preferred_username (AC-33 not run). K20 none.
K21 Home URL appears unset: no back link on the error page.

Keycloak items K1-K21: re-verified this cycle; values are in the "K1-K21" block and the "User said done" block below.

User actions that will be needed (admin console / container, spec sections 15 and 19):
- recreate the keycloak container after the theme mount is added (docker compose up -d keycloak from Project/)
- select the custom login theme for the realm, set the realm display name (K16, K17)
- confirm the items not observable without admin sign-in (K2 client auth off, K3 direct access grants, K12, K13, K14, K18)

Scoped security review (spec section 14), part 1:
- Method: Lead read the FEATURE-002 diff directly (neither the security-guidance plugin's findings nor /security-review was used;
  the built-in review is branch-wide and the tree carries unrelated backend work). 2026-10-11.
- Files covered: features/auth/{authSession, authResponse, returnDestination, authConfig, authBoundary, ProtectedRoute, AuthCallbackRoute,
  PublicLandingRoute, AccountControls}.ts(x), app/router/routes.tsx, main.tsx, AppProviders.tsx, AppLayout.tsx (diff),
  planning/SavedTripRequest.tsx, public/silent-check-sso.html, .env.example, .env.local (keys only), package.json, docker-compose.yml,
  theme.properties, messages_en.properties and the theme CSS (pattern search for scripts, @import, external URLs).
- Findings: no high or medium finding.
  1. Low, accepted: unconsumed kc-callback-<state> entries (state, nonce, PKCE verifier; no token) stay in localStorage up to 60 min.
     A verifier is useless without its authorization code. Adapter behaviour, recorded under V2.
  2. Config, USER action: K5 redirect URIs are a wildcard on localhost:5173. Narrow to /auth/callback and /silent-check-sso.html;
     set post-logout URI explicitly to http://localhost:5173/ (not "+"). Resolves Q3.
  3. Info: a forged callback or error URL on any route only produces notice F1/F2; the description is never shown; state not issued
     by this browser is rejected by the adapter. A late-arriving session after the startup bound is discarded (clearToken).
  4. Info: sessionStorage markers (sign-out-started, and had-session once D27 is built) select a notice only; no guard reads them.
  5. Confirmed: PKCE S256 + nonce, fixed redirect addresses from window.location.origin, return destination validated on write and read
     and never taken from a URL, tokens only in adapter memory, logging off, logout by POST so the ID token is not in a URL,
     identity and prompt rendered as text nodes, not-found route shows no account info when signed out, apiClient.ts untouched,
     no password field, no secret, theme loads nothing third-party and adds no script.

User decision 2026-10-11: registration focus = option A -> D29 (one theme script, resources/js/registration-focus.js, via scripts= in theme.properties).
Lead decisions after part 1: D27 (X1-on-reload marker approved, notice-only) and D28 (login-page-expired.ftl override approved, ~11 lines).

Open items from part 1 (not QA failures):
- AC-14: X1 after a RELOAD is not shown (memory gone -> G3). APPROVED fix: D27 marker. To be built in part 2.
- AC-30 / 21.7: registration page does not focus the first field on load or the first invalid field after a failed submit.
  Fix needs a theme script (outside the approved kinds of theme file) or a large template override. USER decision requested.
- Page-expired page: second option hidden with CSS only; accessible name reads "Click here Start again". An 11-line
  login-page-expired.ftl override would fix it. APPROVED: D28. To be built in part 2.
- Theme never seen rendered by Keycloak (preview only): message keys, sanitizer on loginTitleHtml, darkMode=false, favicon.
- Deviations to verify in QA, not fail on alone: reset-password button stays "Submit"; registration field order is the realm's;
  parent markup has no aria-describedby on field errors (they sit in an aria-live=polite container).
- Throwaway account otc-probe-<8 hex> remains in the realm.

Unresolved failures:
- (none)

Lead design decisions (full text in spec section 20):
- D15 mobile gate stacks and may shift the field up once (001 growth rule); R not raised. D16 no Create account in the nav.
- D17 notice O2 approved. D18 wordmark placement approved. D19 identity fallback name -> email -> preferred_username.
- D20 return destination survives G3 dismissal. D21 K21 client Home URL. D22 theme ships a plain conifer placeholder favicon.
- D23 W3 10 s ceiling. D24 design-system proposals P1-P3 deferred, DESIGN_SYSTEM.md untouched.
- D25 hidden-frame prompt=none session check is allowed; only top-level navigations need a user activation.
- D26 frontend confirms 21.10.8 against the rendered parent theme; template overrides need Lead approval first.

Observed by the Lead without credentials (2026-10-11): the web app serves no favicon; the Keycloak login page title is
"Sign in to outdoor-trip" and its icon is the parent theme's img/favicon.ico; vite.config.ts sets no port or strictPort (V8);
Project/Frontend has .env.example only.

Part 2a review (Lead, 2026-10-11): scope PASS (only authSession.ts and theme files changed; no Backend file newer than cycle start).
Security re-read PASS: the session-held marker is read only at the top of initialize(), set in enterAuthenticated(), cleared in
expireSession() and clearLocalSession(); no guard or getAccessToken reads it; on an "unknown" startup outcome it shows no X1 and is not
restored (accepted: stricter reading). registration-focus.js has no request, storage, console, timer, or field-value read; it returns
unless #kc-register-form exists and never takes focus from an element that has it; invalid fields found by aria-invalid="true".

Not confirmable until Keycloak renders the theme (for part 2b): that the .ftl is picked up and template.ftl resolves to keycloak.v2's
layout; that message key pageExpiredRestart resolves; that scripts= is honoured in 26.7.4 (parent prefers themeResources.scripts when
present); script timing against the parent's own module scripts; loginTitleHtml surviving the sanitizer; darkMode=false; favicon;
the real page-expired page; plus everything in the part 1 list.

Keycloak state, probed without credentials 2026-10-11 after part 2a: login page title is now "Sign in to Outdoor Trip Companion"
(the user has set the realm display name, K16). Container still NOT recreated (0 mounts, created 2026-09-28), so the theme is not
loadable or selectable yet. Redirect-URI narrowing and the other items: not re-probed since the earlier check.

User said "done" (2026-10-11). Lead verified without credentials:
- Container recreated 2026-10-12T06:15Z with the read-only theme mount; postgres untouched (up 5 days).
- K17 theme selected: login page loads outdoor-trip-companion css/styles.css + outdoor-trip-companion.css, the theme favicon, and
  js/registration-focus.js (so scripts= IS honoured in 26.7.4). K16: page title is "Outdoor Trip Companion".
- K5 narrowed: /auth/callback and /silent-check-sso.html accepted (200); /, /home, /anything refused (400). Q3 resolved.
- K7: post-logout / accepted (302); /home and https://example.org/ refused (400).
- K13: no Forgot password link on the login page (off). K10: Register link present.
- K21: error page shows "Back to Outdoor Trip Companion" -> http://localhost:5173/ (Home URL set).
- Dev server 5173 answers 200; user-service 8081 answers 401 without a token.
- NOT yet read back by the user: password policy (K14, beyond what the registration page exposes) and SSO session max (K18);
  K2/K3/K4/K8/K9/K12 confirmed by observed behaviour in part 1, admin-console confirmation implied by "done" but not itemised.

Interruption (2026-10-11 night): the frontend agent hit the session usage limit during part 2b. Not a failure.
Lead audit on resume (2026-10-12 02:51 PDT): no file under Project/Frontend or Project/docker is newer than the part 2b launch,
so part 2b made no edits before it was cut off; parts 1 and 2a are intact. Stack still up (keycloak 4 h, postgres, 5173, 8081, 8180).

Part 2b result (frontend, 2026-10-12): theme renders as designed on the real pages. One fix: min-height of the field-less pages
336px -> 304px (login is 360px tall because Forgot password is off). All message overrides, loginTitleHtml, darkMode=false, favicon,
the .ftl override, and the script confirmed on the rendered pages. Submit states confirmed (wrong password; empty field; password
mismatch; existing username; existing email; values kept; focus on first invalid field; error text #A8361F). Error, logout-confirmation
and page-expired pages themed; page-expired reached honestly. Full app flow passed with the narrowed client settings.
Rendered login geometry: identity 41.7%, column 400px (>=1024), 440/358/288px below; login 360px (368 below 1024); no scroll at any
of the seven viewports; no horizontal scroll. Registration scrolls vertically at 1366x768, 1280x800, 390x844, 320x568.

Accepted deviations (QA: verify, do not fail on these alone):
- D30: field errors are in the parent's aria-live=polite region with aria-invalid on the input; no aria-describedby, no role=alert.
- Registration field order is the realm's (Username, Password, Confirm password, Email, First name, Last name).
- Forgot password is off (D13): reset pages not reachable; login is 360px tall, not about 392px.
- Logout-confirmation document title is Keycloak's "Sign out?"; other pages are "Outdoor Trip Companion".
- Parent wording "Action expired. Please continue with login now." kept (says "login", not "sign in"). Known limitation.
- No password-rules hint (no policy to state, as far as observable).

Throwaway accounts left in the realm: otc-probe-e9eb5940, one more otc-probe-<8 hex> from part 1, plus whatever qa registers.

Still owed by the USER for AC-37: read back the password policy (K14) and the SSO session max (K18) from the admin console.

QA run 1 (qa, 2026-10-12; webapp-testing skill, Python Playwright in a scratch venv driving installed Chrome headless):
- Verdict PASS. AC-01..AC-36 PASS, AC-37 NOT VERIFIED. No repair cycle used.
- Build and lint were not rerun by QA (no Project/Frontend file newer than 23:11 on 2026-10-11; last run exit 0 after part 2a).
- Flow evidence: authorization request carries response_type=code, client_id=outdoor-web, code_challenge, S256, state, scope=openid;
  token POST has grant_type=authorization_code + code_verifier, no client_secret; 0 password-grant requests. Keycloak refuses
  no-challenge, plain, response_type=token, password grant, foreign redirect and foreign post-logout URIs.
- Session: reload of /home shows only "Loading..." until confirmed; token renewed at 270 s of 300 s with 0 navigations; other-tab sign-out
  -> X1 on reload and on client-side navigation; Keycloak blocked -> landing usable in 0.3 s, F3 in 0.2-4.1 s, longest wait 4.2 s;
  a token exchange that never answers ends in F1 at 9.2 s.
- Storage: signed in and after reload localStorage empty, 0 app-origin cookies, no JWT-shaped value; after sign-out both storages empty.
  Session storage only ever held the pending prompt, the return destination, session-held, sign-out-started.
- Return destination: 8 hostile stored values all end on /home; returnTo/redirect/next parameters ignored; /trails/<id> and /gear restored.
- Prompt: in 0 URLs and 0 Keycloak requests; state values are UUIDs; markup in a prompt renders as text.
- AC-33: token of a just-registered user -> GET /api/users/me 200, email matches, display name non-empty.
- Keycloak pages (rendered): identity 41.7% / form 58.3% from 1024px (1024x768 side by side, 1023 stacked); fields and actions 400px
  (440 at 768, 358 at 390, 288 at 320), 48px high; login bottom y 720/630/564/580 at the four desktop sizes, no scroll at any of the 7;
  registration scrolls vertically at 1366x768, 1280x800, 390x844, 320x568; text sizes 14/16/28/32/40; hit areas at 390 and 768:
  show/hide 44x44, "Create account" 116x44, "Back to sign in" 112x44. Dark scheme: pixel-identical screenshots.
- Contrast, pixel-sampled: ink on paper 16.04; link 7.38; muted 5.92; white on primary 8.05; white on identity 17.48;
  error text #a8361f on paper 6.0; field border 5.92 / 6.45; invalid outline 4.43 / 4.83.
- Landing gate: field moves 0px at 1920, 1440, 1366, 1280, 768; gate one row 40px (60px for G2 from 1366 down), 44px at 768;
  at 390x844 stacked 96/116/76px with the field moving -36/-56/-16 (G1/G2/G3), no scroll; at 320x568 field -8, vertical scroll only.
  Gate actions 78x36 and 137x36 desktop, 78x44 and 138x44 at 768, 174x44 and 176x44 at 390.
- Not verified by QA: a real screen reader (only the live-region mechanism), other browsers (Chrome headless only), a real password
  manager, the back/forward-cache pageshow paths (Playwright's Chrome disables bfcache), refresh-token idle expiry (1800 s),
  SSO session max, the missing-configuration F3 path, the D19 name fallbacks, the implementer's report itself (it is in the Lead's
  conversation, not in a file).

AC-37 closed (2026-10-12, after the final report):
- User read back from the admin console: K18 SSO session max = 12 hours. K14 password policy = minimum length 8.
- K14 was changed by the user AFTER QA run 1: QA had registered an account with a one-character password, so no length policy was
  in force then. Lead probe after the read-back (no admin credential, registration form only): a 7-character password is refused,
  HTTP 200 with the form redisplayed, the password field marked aria-invalid, message "Invalid password: minimum length 8.";
  no account was created. An 8-character password was not submitted (it would create another account).
- K18 SSO session max is the user's value; it is not observable without admin sign-in and was not observed.
- Final K14: minimum length 8 (no other policy type reported). Final K18: access token 300 s (observed), SSO idle / refresh
  1800 s (observed), SSO session max 12 hours (user). K1-K13, K15-K17, K19-K21 as recorded above.
- The implementer's report contained the section 15 checklist. No admin credential appears in any file, and no agent used one.
- Recorded in docs/FRONTEND_CONTEXT.md section 7 and in the K14 and K18 rows of the spec, section 15.

Open after close:
- NEW, caused by the K14 change, NOT fixed: the registration page does not state the password rule before the visitor submits.
  Spec section 10 ("Password rules, when the realm has a policy, are stated before the visitor submits") and the section 21 copy
  table (help text under Password, "At least 8 characters.", only if K14 finds a policy) now apply. Today the rule appears only
  after a refused submit, in Keycloak's own words. No numbered acceptance criterion covers it, and QA ran while the realm had no
  policy, so QA's result stands. Owner if fixed: frontend (theme). keycloak.v2 has no slot for help text under Password, so it
  likely needs a second template override (D26: Lead approval) or an addition to the approved script; then qa on the
  registration criteria (AC-29, AC-30, AC-31 and the registration layout measurements).
- Not criterion failures, found by QA:
  1. Back immediately after sign-in shows F1 "We couldn't sign you in" on the landing although the session exists (Back re-requests the
     Keycloak URL, which returns an already-consumed state). Forward or reload shows /home. No loop. Owner if fixed: frontend
     (on a failed callback, run the silent session check before reporting F1); would need AC-02, AC-11, AC-21 rechecked.
  2. First Tab after an arrival notice lands on the gate's Sign in, not the brand link (cycle order unchanged).
  3. Under reduced motion the 150 ms background-colour transition on landing controls remains (section 21.2.3 keeps it).
  4. Console: Chrome's iframe-sandbox warning for the adapter's hidden frame on each load; the app's /favicon.ico is 404 (no product icon).
  5. Keycloak's error page for a refused post-logout URI says "Sign-in couldn't be completed" (tamper-only path).
  6. Page-expired "Start again" link hit area 84x24 at 1440; not measured at 390.
- Known limitations: D30 (no aria-describedby / role=alert on Keycloak errors); parent wording "Action expired. Please continue with
  login now."; session restore depends on Keycloak cookies in a hidden frame (same-site only); npm run preview (4173) cannot sign in;
  no bearer token attached to any request yet (D8); reset-password pages never rendered (Forgot password off).
- Realm clean-up for the USER: delete users qa-002-* (16 named in QA's report plus one unnamed that has a one-character password;
  a policy added later does not change existing passwords, so that account still signs in with it),
  otc-probe-e9eb5940 and the other otc-probe-* account. user-service has a local profile row for qa-002-mkwfncde (from AC-33).
- Uncommitted: nothing was committed or staged in this cycle.

Next:
- Nothing automatic. FEATURE-003 starts only when the user asks.
- AC-37: done (2026-10-12).
- If the user wants the password rule stated on the registration page: reopen with frontend (theme only), Lead approves the
  mechanism first, then qa on AC-29, AC-30, AC-31 and the registration layout.
- If the user wants the Back-after-sign-in fix: reopen with frontend (same agent if still resumable), then qa on AC-02, AC-11, AC-21.
