# FEATURE-002 — Authentication + Keycloak

| | |
|---|---|
| Status | Scope approved by the user on 2026-10-11. Acceptance criteria consolidated to 37 and ownership questions resolved the same day. Section 21 (design) was written by `ui-ux` and approved by the Lead on 2026-10-11, with decisions D15–D30 (section 20). Implemented under `/feature-cycle`; QA `PASS` on 2026-10-12 (36 of 37 criteria observed). AC-37 was closed the same day when the user read back K14 (password policy: minimum length 8) and K18 (SSO session max: 12 hours). The registration page does not yet state the password rule that section 10 asks for once a policy exists; see the checkpoint. Checkpoint: `.claude/state/features/002-authentication.md`. |
| Owner | Lead (sections 1–20), `ui-ux` (section 21), `frontend` (implementation, later step) |
| PRD references | §4.7, §5, §7.1, §7.4, §7.5, §36, §37, §38, §39, §41–§44, §45.1, §45.2, §51, §57 |
| Depends on | FEATURE-001 (Public Landing, `PASS`). Local Keycloak 26.7.4 from `Project/docker-compose.yml`, realm `outdoor-trip`. |
| Replaces | The placeholder body of `Project/Frontend/src/features/auth/authBoundary.ts` and the FEATURE-001 "sign-in isn't available yet" notices. |

Sections 1–20 are the Lead's scope and are the bar the implementation is judged against. Section 21 is the design specification, owned by `ui-ux`. If section 21 needs to depart from sections 1–20, `ui-ux` reports it to the Lead instead of changing them.

Two kinds of statement appear below and must not be confused:

- **Requirement**: what the finished feature must do.
- **Observed**: what the local Keycloak answered on 2026-10-11 to unauthenticated, read-only requests (the public discovery document and `GET` requests for the login, registration, and logout pages). Nothing was configured, submitted, or changed. Observed values are a starting point for implementation-time verification, not a guarantee.

## 1. Feature Goal

Replace the temporary authentication gate from FEATURE-001 with a real identity flow, so that a visitor can move from the Public Landing into the authenticated product and back out again:

- sign in or create an account on Keycloak-hosted pages, never in the React application;
- return to the web application as an authenticated user, with the planning request they typed before authenticating still available;
- stay authenticated across a page refresh;
- be kept out of authenticated routes when not signed in;
- sign out in a way that ends both the application session and the Keycloak session.

The Keycloak pages the visitor passes through carry the product's visual identity, so the step from the cinematic landing to credential entry does not feel like leaving the product.

This feature proves the identity flow. It does not build the Authenticated Home (FEATURE-003), and it calls no product API.

## 2. User Stories

- As a visitor who has typed a trip request, I want to create an account or sign in at the moment I start planning, and find my request waiting for me afterwards, so that I do not type it twice.
- As a new visitor, I want to create an account myself, without asking anyone to make one for me.
- As a returning user, I want Sign in to take me straight to credential entry, with no prompt required.
- As a signed-in user, I want a refresh to keep me signed in, and I want to sign out when I am done, on a shared computer in particular.
- As anyone who opens a link to an authenticated page while signed out, I want to be told that sign-in is needed and to arrive at that page once I have signed in.
- As a visitor using a keyboard, a screen reader, a phone, or a password manager, I want sign-in and registration to work for me.

## 3. User Flows

### 3.1 Start planning, then create an account (primary)

```text
Public Landing "/"
        ↓  types "Easy hike with a lake view this weekend", activates Start planning
Prompt validated and saved in the tab
        ↓
Authentication gate appears on the landing (no navigation)
  "Sign in"   "Create account"
        ↓  Create account
Keycloak registration page (themed)                    ← credentials entered here only
        ↓  account created
Back to the application, code exchanged, session established
        ↓
"/home" (minimal authenticated destination) showing the saved request
```

Choosing **Sign in** at the gate follows the same path through the Keycloak login page.

### 3.2 Sign in from the navigation

```text
"/"  →  Sign in  →  Keycloak login page  →  application  →  "/home"
```

No prompt is required. A valid prompt in the input is saved first (unchanged from FEATURE-001). The Keycloak login page offers a link to registration, so this path also reaches account creation.

### 3.3 Direct access to an authenticated route while signed out

```text
"/home" (or "/gear", "/trails/:trailId")
        ↓  not authenticated
"/" with the authentication gate: sign-in is needed to continue
        ↓  Sign in or Create account
Keycloak  →  application  →  the route originally requested
```

The application never redirects to Keycloak on its own. Every trip to Keycloak starts from a control the user activates. This is what rules out redirect loops and Back-button traps (section 7).

### 3.4 Refresh, session end, sign out

```text
Refresh on "/home", session valid      →  waiting state  →  "/home" again, no credentials asked
Refresh on "/home", session not valid  →  waiting state  →  "/" with the gate
Signed-in user opens "/"               →  "/home"
Session ends while the app is open     →  "/" with a "session has ended" notice
Sign out                               →  Keycloak ends the session  →  "/" with a "signed out" notice
```

## 4. Authentication Architecture

```text
React web application (public client)
        →  OIDC Authorization Code flow with PKCE (S256)
        →  Keycloak, realm "outdoor-trip"        credentials are entered here
        →  redirect back to the application with an authorization code
        →  code exchanged for tokens at Keycloak's token endpoint
        →  authenticated frontend session
```

Requirements:

- **Authorization Code + PKCE, S256 only.** No implicit flow, no hybrid flow, no resource-owner password grant.
- **Keycloak-hosted credential entry.** The application has no password field, no username/password form, and no API that accepts credentials. It never sees a password.
- **Public client.** There is no client secret anywhere in the frontend, its environment files, or its bundle.
- **No fake authentication.** There is no mock user, no development bypass, and no stored flag that by itself makes the application treat someone as signed in. Authenticated state exists only after a successful code exchange or a session restored by the OIDC library from Keycloak.
- **One auth module.** All of this lives under `Project/Frontend/src/features/auth/`. The existing single boundary stays the only entry into authentication for the landing. No other feature folder imports the OIDC library.
- **Configuration, not constants.** Keycloak base URL, realm, and client id come from Vite environment variables documented in `Project/Frontend/.env.example`. These three values are not secrets. Local development uses the existing architecture: application at `http://localhost:5173`, Keycloak at `http://localhost:8180`, realm `outdoor-trip`. No production domain is invented in this feature.
- **Backend stays authoritative.** Route protection in the browser decides what is shown. It is not the security boundary: the Spring services already validate the JWT on every request and that does not change.

### 4.1 OIDC library

Pre-approved runtime dependency: **`keycloak-js`**, the official Keycloak JavaScript adapter, at a version compatible with Keycloak 26.7.4. It is the only new runtime dependency this feature may add. A different OIDC library, or any wrapper around the adapter, needs Lead approval before it is installed.

### 4.2 Token and session handling

The exact storage mechanics depend on the adapter and are verified at implementation time (4.3). The requirements the result must meet:

- Use the safest practical handling the adapter supports. The expected outcome is tokens held in memory only, with the session restored after a refresh from the Keycloak session, not from a copy of the tokens kept by the application.
- No access token, refresh token, or ID token is written to `localStorage`, `sessionStorage`, an application-set cookie, a URL, or the console. If the adapter makes long-lived browser storage unavoidable, the frontend stops and reports it; it is used only with an explicit justification, Lead approval, and the security review's agreement, all recorded in the checkpoint.
- No custom persistence. The application does not invent its own way of remembering a session.
- The access token is kept valid while the Keycloak session lives: it is renewed before or at expiry without a full-page redirect and without user action. When renewal fails, the application moves to the session-expired state (section 5).
- The auth module exposes one way for later features to obtain a currently valid access token. No caller exists in this feature (see D8).
- The token and session strategy that results is described in the implementer's report and is an explicit subject of the scoped security review (section 14).

### 4.3 Implementation-time architecture verification

The frontend verifies each item against the installed adapter and the running Keycloak, and reports what it found. None of these is to be assumed.

| # | Verify |
|---|---|
| V1 | Adapter version and its compatibility with Keycloak 26.7.4. |
| V2 | Where tokens live at runtime, and everything the adapter writes to web storage or cookies on the application origin (for example short-lived callback state), with its lifetime. |
| V3 | The session-restore mechanism after a refresh. It must not show a Keycloak page to a visitor who is not signed in, and must not depend on something that only works on `localhost`. If it relies on Keycloak cookies being readable from a hidden frame, say so: that works when both origins are the same site and can fail across sites. |
| V4 | Token lifetimes as configured (access token lifespan, session idle and maximum) and the renewal strategy that follows from them. |
| V5 | Initialization runs once and is safe under React StrictMode's repeated effects in development. |
| V6 | How the authorization response arrives (fragment or query) and how its parameters are removed from the address bar and from history. Keycloak's error redirects were observed arriving as query parameters and as a fragment; both must be handled. |
| V7 | Sign-out sends what Keycloak needs to end the session without an extra confirmation page. |
| V8 | The development server stays on port 5173. If it silently moved to another port, every redirect would be refused by Keycloak. |
| V9 | The scopes requested, kept to what is needed: `openid` plus whatever the realm requires to issue the `email` and `name` or `preferred_username` claims that `user-service` reads. |

## 5. Application Auth States and Copy

The application is always in exactly one of these states. Only `authenticated` shows protected content.

| State | Meaning | On `/` | On a protected route |
|---|---|---|---|
| `initializing` | The adapter is finding out whether a Keycloak session exists. | The landing renders and works in full. Its planner does not wait for Keycloak. | A quiet waiting state. No protected content, not even briefly. |
| `unauthenticated` | No session. | The landing. | Replaced by `/` with the gate (section 7). |
| `redirecting` | The user activated Sign in or Create account and the browser is leaving for Keycloak. | The activated control shows that it is working and cannot be activated twice. | n/a |
| `callback-processing` | The browser has returned with an authorization response and the exchange is in flight. | A quiet waiting state. Protocol parameters are removed from the address bar. | Same. |
| `authenticated` | A session is established. | Replaced by `/home`. | The route renders. |
| `callback-failed` | The response carried an error, could not be validated, or the exchange failed. | The landing with a failure notice. The saved prompt is still in the input. | Ends on `/` as above. |
| `session-expired` | The application was authenticated and the session can no longer be renewed. | The landing with a session-ended notice. | Ends on `/` as above. |
| `signing-out` | The user activated Sign out. | n/a | The control shows that it is working. Protected content is no longer interactive. |
| `signed-out` | Sign-out finished and the browser is back in the application. | The landing with a signed-out notice. | Behaves as `unauthenticated`. |

Rules:

- **Bounded waiting.** `initializing` and `callback-processing` end within 10 seconds, in success or in failure. There is no endless spinner. If Keycloak cannot be reached, initialization ends as `unauthenticated`, and a sign-in attempt then reports that sign-in is unavailable.
- **Fail closed.** Any doubt resolves to `unauthenticated`. A failed or timed-out check never grants access.
- **Other tabs.** When the session ends elsewhere (sign-out in another tab, session ended in Keycloak), this tab reaches `session-expired` at the latest on its next renewal attempt, its next reload, or its next navigation to a protected route.
- **No technical detail.** No user-facing message contains a token, an authorization code, an HTTP status, an error code, a stack trace, a URL, the word "Keycloak", or the realm id. The `error_description` returned by Keycloak is never shown.
- **No planning language.** As in FEATURE-001, no message says or implies that planning, searching, or recommending has happened or is in progress.

Baseline copy. `ui-ux` may refine the wording inside these rules; the meaning of each is fixed.

| Id | State | Text |
|---|---|---|
| G1 | Gate, from Start planning, prompt saved | "Sign in or create an account to plan this trip. Your request is saved in this tab." |
| G2 | Gate, from Start planning, prompt could not be saved | "Sign in or create an account to plan this trip. Your request couldn't be saved in this browser, so you may need to enter it again." |
| G3 | Gate, from a protected route | "Sign in or create an account to continue." |
| F1 | `callback-failed` | "We couldn't sign you in. Please try again." |
| F2 | `callback-failed`, the user declined or cancelled | "Sign-in was cancelled." |
| F3 | Sign-in attempted while Keycloak cannot be reached, or configuration is missing | "Sign-in is unavailable right now. Please try again in a moment." |
| X1 | `session-expired` | "Your session has ended. Sign in again to continue." |
| O1 | `signed-out` | "You're signed out." |
| W1–W3 | Waiting states | "Loading…", "Signing you in…", "Signing you out…" |

Action labels are **"Sign in"**, **"Create account"**, and **"Sign out"**, in the application and on the Keycloak pages alike.

## 6. Public Landing Integration

The landing's layout, hero, planner, validation, suggestions, and scene control stay as FEATURE-001 delivered them. What changes is what the auth boundary does.

### Sign in (navigation)

Activating Sign in saves a valid prompt if the input holds one (unchanged), then begins real authentication: a top-level navigation to the Keycloak login page. It stays a `button`, because it starts a redirect built at that moment and has no fixed address. The navigation keeps its two items; whether it gains a "Create account" entry is a design question for `ui-ux` (Q2).

### Planner authentication gate (primary action)

Activating the primary action with a valid prompt:

1. saves the trimmed prompt (unchanged);
2. shows the authentication gate in place, with no navigation: message G1 or G2 and two actions, **Sign in** and **Create account**;
3. on Sign in, goes to the Keycloak login page; on Create account, goes directly to the Keycloak registration page.

The gate lives where FEATURE-001 put its notices, the planner's message slot, which that specification designed as the lasting recovery path. It is not a modal dialog and not a separate page. Empty and over-limit prompts behave exactly as before and never show the gate.

The same gate, with message G3 and no prompt wording, is what a visitor sees after being sent to `/` from a protected route.

### Returning to the landing in a failure or ended state

After `callback-failed`, `session-expired`, or `signed-out`, the visitor is on `/`, the matching notice (F1, F2, X1, O1) is in the message slot, and the Sign in and Create account actions are available. A saved prompt is back in the input and editable, except after sign-out, which clears it (section 9).

### Planning-intent preservation

- The prompt stays where FEATURE-001 put it: session storage, under the single key defined in `features/planning/pendingPrompt.ts`. It is scoped to the tab and the application's origin, survives the same-tab round trip to Keycloak, and disappears when the tab closes. That is the intended lifetime: short, and no longer than the visit.
- The prompt is user-typed text and is not a credential. It is still treated as untrusted on the way back: validated by the existing prompt check when read, and rendered as text only.
- The prompt is never placed in a URL, in the OIDC `state`, or in any request to Keycloak.
- If the round trip does not finish in the same tab (for example, a flow completed from an email link in another tab), the prompt may not be there afterwards. That is the limit of "when practical" in PRD §7.5; the user is then simply signed in with no prompt, and nothing claims otherwise.
- Whether this mechanism is acceptable is confirmed by the scoped security review. If the review prefers a different short-lived mechanism, the behavior in this section is what must be preserved.

### FEATURE-001 criteria amended by this feature

Every FEATURE-001 criterion not listed here still holds and is regression-checked (AC-34).

| FEATURE-001 | Change |
|---|---|
| AC-13, AC-15, notices N1–N4 | Superseded. The boundary no longer reports that sign-in is unavailable; it shows the gate or starts authentication (this section). |
| AC-11 | Still invoked exactly once per activation; the visible result is the gate, not a notice. |
| AC-16 | Amended: requests to the configured Keycloak origin are allowed. Requests to any product API are still not. |
| AC-33 | Amended: while the gate or a notice with actions is shown, its actions are in the tab order directly after the primary action and before the suggestions. |
| AC-07 | Still holds, now with the gate shown. The gate is taller than the three-line message the layout reserves; fitting it without moving the field is a design task for section 21. |
| D1, D11 | Resolved here: a signed-in user who opens `/` goes to `/home`; Sign in navigates away instead of writing to the message slot. |

## 7. Protected Routes and Return Destination

**Protected routes:** `/home`, `/gear`, and `/trails/:trailId`. The Public Landing `/` is public. The not-found route stays reachable by anyone and shows no account information to a signed-out visitor.

Behavior:

- A signed-out visitor never sees protected content, including during `initializing` and `callback-processing`.
- A signed-out visitor who requests a protected route ends on `/` with the gate (G3). The protected address is replaced in history, not added to it, so Back does not bounce the visitor between the two.
- The route they asked for is remembered as the **return destination**. After a successful sign-in or registration started from that gate, they arrive there. With no return destination, the destination is `/home`.
- A signed-in user reaches every protected route. After sign-out, or when the session has expired, the routes are closed again.

No redirect loops:

- The application starts a navigation to Keycloak only in response to the user activating Sign in or Create account. Arriving on a route, finishing initialization, a failed callback, or an expired session never starts one.
- Pressing Back on a Keycloak page returns to the application in the `unauthenticated` state and nothing navigates forward again.
- A failed or abandoned attempt ends on `/` and stays there.

Safe handling of the return destination:

- It is an in-application path only: it begins with a single `/`, has no scheme and no host, and matches one of the protected routes above. Anything else is discarded in favor of `/home`.
- It is never read from a query parameter or a fragment. The application honors no `returnTo`-style parameter at all, which removes that class of open redirect.
- It is short-lived: held for the tab only, used once, and cleared on use, on sign-out, and on a failed attempt.
- The redirect addresses handed to Keycloak come from a fixed set the application builds itself, never from user input, and every one of them is covered by the client's valid redirect URIs (section 15).

## 8. Authenticated Destination

The minimum needed to prove the identity flow, and nothing more. It is the existing `/home` placeholder inside the existing application layout, with these additions:

- **Identity.** The signed-in user's display name, falling back to their email, read from the identity the adapter provides and rendered as text. No call to `GET /api/users/me` is made in this feature.
- **Sign out.** A control in the application layout's header, present on every authenticated route.
- **The saved request.** When a pending prompt exists, it is shown as plain, clearly labelled text (for example "Your trip request"). It is read, not consumed: it is still there after a refresh, so FEATURE-003's planner can pick it up. Nothing on the page suggests that planning has happened, is loading, or has produced results.

Not in this feature: the Authenticated Home room background, the planner input on `/home`, recommendations, any restyling of the placeholder pages beyond what these three additions need, and any redesign of the application layout. `ui-ux` specifies the three additions only and does not design FEATURE-003.

## 9. Logout

- **Entry.** The Sign out control (section 8).
- **What it ends.** Both sessions: the application's in-memory session and the Keycloak session, through Keycloak's OIDC end-session endpoint. Discarding tokens locally while the Keycloak session survives is not logout, because the next Sign in would succeed with no credentials.
- **Return.** The browser comes back to `/`, the Public Landing, with notice O1. The post-logout address is one the client explicitly allows (section 15).
- **What it clears.** In-memory tokens and identity, the TanStack Query cache, the pending planning prompt, and the return destination. The prompt is cleared so that one person's request is not shown to the next person at a shared computer.
- **Afterwards.** Protected routes are closed. Back does not bring protected content back. Sign in asks for credentials again.
- **If Keycloak cannot be reached,** the application still clears its own state and returns to `/` in the `unauthenticated` state. It does not report a successful sign-out it cannot confirm: the notice is F3's wording adapted by `ui-ux`, not O1.

## 10. Keycloak-Hosted Pages: Content and States

These pages are served by Keycloak and styled by the theme in section 11. Their structure and behavior come from Keycloak; this section states what each must present. Field sets defer to the realm: the theme styles what the realm requires and adds or removes nothing.

### Login

- Heading "Sign in", under the product name.
- A username-or-email field and a password field, each with a visible label. Observed label today: "Username or email".
- A show/hide control on the password field (present in the parent theme today).
- Primary action "Sign in".
- A link to registration, "Create account", visible without scrolling at desktop sizes.
- "Forgot password?" only under the conditional rule below. Observed: the link is shown today.
- No "Remember me" (observed: off; turning it on is not part of this feature), no social sign-in buttons, no language switcher.

### Registration

- Heading "Create your account", under the product name.
- The six fields the realm requires today, all required: Username, Email, First name, Last name, Password, Confirm password. This set is kept for FEATURE-002 (D12). The theme styles these fields and adds, removes, or reorders none. The user-profile schema is not redesigned here; a simplification such as email-as-username is outside this feature unless authentication cannot work correctly without it.
- Required fields are marked in text or with a symbol that is explained, not by color.
- Password rules, when the realm has a policy, are stated before the visitor submits, not only after a failure.
- Primary action "Create account". A link back to the login page, "Back to sign in".
- Successful registration signs the visitor in and returns them to the application without a second sign-in (this requires the realm setting in section 15, item K12).

### Errors and other states

| Situation | Page | Requirement |
|---|---|---|
| Wrong username or password | Login | One message that does not reveal which of the two was wrong. The username is kept, the password is cleared. |
| Username or email already registered | Registration | The message is tied to the field concerned. Other fields keep their values; passwords are cleared. |
| Password does not meet the realm's policy, or the two passwords differ | Registration | The message says what is required, in the realm's own terms. |
| Required field left empty | Either | Message tied to the field. |
| Sign-in attempt timed out, or the page was reloaded or reopened mid-flow | Page-expired / error page | Says the attempt expired and offers one way to start again that leads back into the application's flow. |
| Any other authentication failure | Error page | A plain statement that sign-in could not be completed and a way back to the application. |
| Forgot password | Reset-request page and its confirmation | Themed and tested only when the conditional rule below is met. |
| Sign-out confirmation | Logout-confirm page | Themed if it can be reached. The normal sign-out path should not show it (V7). |

Copy on all of these is clear and non-technical: no error codes, no "realm", no "client", no stack traces. Keycloak's default English messages are acceptable where they already meet this; the theme overrides the ones that do not, and the page titles and headings so that the product name appears and the realm id ("outdoor-trip") never does.

### Forgot password is conditional

Forgot password depends on the realm being able to send email, and nothing in the repository configures email delivery.

- If email delivery and the reset flow are configured and can be exercised locally, Forgot password may stay enabled. Its pages are then themed and QA tests the flow.
- If email delivery is not configured, Forgot password is turned off in the realm (a user-applied step, section 15) or omitted from the login page, and the reset pages are out of scope.
- Either outcome is acceptable. Missing email infrastructure, and the absence of Forgot password that follows from it, is not a QA failure and does not block `PASS`.
- The one outcome that is not acceptable is a visible Forgot password link whose flow cannot complete.

Email verification on registration follows the same logic: it must not stand between a new account and the authenticated return unless email can actually be delivered (K12).

### Pages not designed individually

Every other page of the login flow that this feature does not design individually (required actions, email verification, and so on) still renders in the theme through the shared page shell, so nothing a visitor can reach falls back to stock Keycloak styling.

## 11. Keycloak Theme: Visual Requirements

Lightweight customization of Keycloak's **login theme type**, which covers login, registration, reset, error, and logout-confirmation pages. The account console, admin console, and email themes are out of scope.

### Approach

- A custom login theme that **inherits from an official Keycloak parent theme**. Observed parent in use today: `keycloak.v2`.
- Customize in this order and stop as early as the design allows: theme properties, stylesheet and static resources, message overrides for copy, and only then templates.
- No `.ftl` template is overridden unless the approved design cannot be met otherwise. Each override needs Lead approval, is the smallest one that works, and is listed in the implementer's report with its reason. The target is zero.
- The theme is checked into the repository at the approved path and loaded by the local Keycloak container through one Compose mount (section 19). Selecting it for the realm is a user-applied configuration step (section 15).
- The theme loads nothing from a third-party origin: no remote fonts, scripts, images, or stylesheets.

### Direction

The pages belong to the same product as the landing and are deliberately **simpler and quieter** than it.

- **Palette.** Design-system tokens only: `ink`, `paper`, `snow`, `conifer` (with `conifer-deep` and `conifer-press` for hover and pressed), `stone` for muted text, `sun` in the focus ring, `ember` for invalid outlines and icons.
- **Surfaces.** The form sits on a light surface (`paper`) with `ink` text. `ink` is the brand surface. No purple, no gradient washes, no glass, no stacked shadows.
- **Typography.** The design system's system font stack. The parent theme's bundled typeface is not used. Minimum 14px for any text, 16px for input text.
- **Brand.** The text wordmark "Outdoor Trip Companion", as on the landing. No logo mark is invented, and no Keycloak logo or realm id is shown.
- **Controls.** Restrained rounding: text fields and the primary button share one modest corner radius chosen by `ui-ux` in the 8–14px range. Fields are not pills. The primary action is `conifer` with `snow` text and the hover and pressed tokens. Secondary actions are text links in `conifer`, distinguishable without relying on color alone.
- **One dominant action per page:** Sign in on login, Create account on registration.
- **Focus.** The design system's focus ring on every interactive element.
- **Errors.** Ordinary-size error text must measure at least 4.5:1 against the background it is actually rendered on. `ember` (`#C8452D`) on `paper` (`#F7F5EF`) computes to about 4.43:1, so `ember` is not used for error text. Two choices are approved, and `ui-ux` picks one in section 21:
  - `ink`, the existing dark token; or
  - an auth-specific darker error text color, defined as a feature-level value of this specification. For example `#A8361F` computes to about 6.0:1 on `paper` and 6.5:1 on `snow`.

  The global `ember` token in `docs/DESIGN_SYSTEM.md` is not changed. `ember` may still be used for the field outline, an icon, or another supporting cue, where 3:1 is the bar. An error never relies on color alone: the message is text, and an icon or outline accompanies it. QA measures the colors as rendered; conformance is not assumed from a token name.
- **Motion.** None beyond short color and opacity transitions within the design system's motion tokens. No entrance animation.
- **One appearance.** The pages look the same whatever the visitor's system color scheme. The parent theme switches to a dark variant under a dark system setting (observed); the design system defines no dark mode, so that switch must not apply.
- **No hero.** No video, no scene rotation, no cinematic media, no scrim-over-media composition. The landing's hero is not recreated here. A still image is not part of the baseline; `ui-ux` may propose one to the Lead if it stays quiet and static.

### Composition

- **Desktop and laptop (≥1024px).** A clean desktop authentication page that uses the canvas on purpose: two regions side by side, an `ink` identity region carrying the wordmark and at most one short line of product copy, and a `paper` form region. Each region is at least 30% of the viewport width. This is not a small card floating in empty space, and not a mobile layout stretched wide.
- **Form width.** The fields and the primary action sit in a readable column 360–440px wide at every desktop size. This is narrower than the landing's planner on purpose.
- **Tablet and mobile (<1024px).** One column: wordmark above, form below, controls spanning the content width up to 440px.
- `ui-ux` confirms that this composition can be reached on the parent theme's markup with styles alone. If it cannot, `ui-ux` proposes the nearest composition that can before asking for a template override.

Exact sizes, spacing, radii, and states are section 21's job. This section sets what they must achieve.

### Design-system proposal

Form controls on a light surface (text field, primary button, text link, inline field error, page-level error summary) are likely to be reused by the Gear inventory forms. They are **not** added to `docs/DESIGN_SYSTEM.md` by this specification. `ui-ux` may propose a reusable addition while writing section 21; it is added only if clearly necessary and approved by the Lead. Until then every value is a feature-level value recorded in section 21.

## 12. Responsive Requirements

This is a web application; desktop is the baseline and smaller sizes are adaptations.

Reference viewports for the Keycloak pages and for the application's new states: **1920×1080**, **1440×900**, **1366×768**, **1280×800**, **768×1024**, **390×844**, and **320×568**.

| Concern | ≥1024px | 768–1023px | <768px |
|---|---|---|---|
| Keycloak page layout | Two regions side by side | One column | One column |
| Form column | 360–440px | Content width, at most 440px | Content width, side gutters at least 16px |
| Login page | Everything visible without scrolling at all four desktop viewports | May scroll | May scroll; the primary action is reachable without horizontal scrolling |
| Registration page | May scroll vertically; nothing is clipped | Same | Same |
| Touch targets | n/a for a fine pointer | At least 44×44 CSS px | At least 44×44 CSS px |
| Landing gate | Fits with no scrolling at the four desktop viewports (FEATURE-001 AC-07) | Fits or scrolls vertically | Same |

At every width from 320px there is no horizontal page scroll on any Keycloak page or application state. Input text is at least 16px so mobile browsers do not zoom on focus. With the on-screen keyboard open, the focused field and the primary action stay reachable.

## 13. Accessibility Requirements

For the Keycloak pages and for everything this feature adds to the application:

- **Labels.** Every input has a visible, programmatically associated label. Placeholder text is not a label.
- **Keyboard.** Sign-in, registration, and sign-out can each be completed with the keyboard alone. Tab order follows the visual order. There are no keyboard traps.
- **Focus.** Every interactive element shows the design-system focus ring. On the Keycloak login and registration pages the first field receives focus on load.
- **Password fields.** They are real password inputs with the correct `autocomplete` value (`current-password` on login, `new-password` on registration; `username` and `email` on those fields). Pasting is allowed and password managers are not obstructed. The show/hide control is a button with an accessible name that reflects its state.
- **Validation messages.** Each is text, is programmatically associated with its field or exposed in an alert region so it is announced, and never relies on color alone. After a failed submit, focus goes to the first invalid field or to an error summary, where the parent theme makes that practical.
- **Contrast.** Text meets 4.5:1; large text, icons that carry meaning, and the boundaries of controls meet 3:1. Error message text is held to 4.5:1 against its actual background (section 11), measured on the implemented pages.
- **Application notices.** The gate and notices G1–G3, F1–F3, X1, and O1 are announced through the landing's existing live-region structure. Waiting states are announced once and do not steal focus.
- **Focus after navigation.** When the application sends the visitor to `/` with a notice, the notice is announced and focus is not left on an element that no longer exists.
- **Touch.** Targets of at least 44×44 CSS px on touch layouts, with at least 8px between adjacent targets.
- **Motion and zoom.** Nothing animates under `prefers-reduced-motion: reduce`. At 200% zoom every page works without horizontal scrolling.

## 14. Security Requirements

This feature is security-sensitive. Each item is a requirement on the implementation.

| # | Requirement |
|---|---|
| S1 | Authorization Code flow with PKCE, challenge method S256. Implicit, hybrid, and password grants are never used. |
| S2 | Credentials are entered only on Keycloak-hosted pages, reached by top-level navigation. The Keycloak login page is never embedded in a frame. |
| S3 | No password handling in application code: no password input, no credential state, no credential request. |
| S4 | No hard-coded credentials, secrets, or tokens in source, environment files, test scripts, or documentation. The public client has no secret. |
| S5 | Tokens and authorization codes are never written to the console, to error messages, or to any log. Auth objects are not logged wholesale. |
| S6 | No token ever appears in a URL. The only authentication data in a URL is what the protocol requires in the authorization response (code, state, issuer, session state), and it is removed from the address bar and history as soon as it has been processed. |
| S7 | No fake authentication and no fallback that grants access when Keycloak is unavailable or misconfigured. Failures resolve to `unauthenticated`. |
| S8 | The `state` and nonce of the authorization response are validated. A response that fails validation is treated as `callback-failed`. |
| S9 | Logout ends the Keycloak session as well as the local one, and clears the local state listed in section 9. |
| S10 | Protected routes render nothing protected unless the state is `authenticated`. |
| S11 | Session and token lifecycle follows section 4.2: no long-lived token persistence in browser storage without recorded justification, renewal without user action, safe degradation to `session-expired`. |
| S12 | Redirect and return-destination handling follows section 7: fixed redirect addresses, in-application return paths only, nothing taken from URL parameters. |
| S13 | Identity values (name, email) and the saved prompt are rendered as text only, never as markup. |
| S14 | The Keycloak client's redirect URIs, post-logout redirect URIs, and web origins contain no entry broader than the application needs (section 15). |
| S15 | Access tokens are attached only to requests for the application's own API origin, never to arbitrary URLs. No request carries one in this feature (D8); the rule binds the feature that adds the first one. |

### Scoped security review

- The `security-guidance` plugin is already active through hooks: it checks each edit, reviews the diff at the end of a turn, and reviews commits. It needs no agent instruction. Its findings during implementation count toward the review.
- **One scoped review** is performed after implementation and before the Lead's diff review and QA. Its scope is the files FEATURE-002 changed, taken from the checkpoint's file list. The repository holds a large amount of unrelated uncommitted work, so a branch-wide or repository-wide audit is explicitly not required and not wanted.
- The review looks at least at: token and session storage (4.2, V2), redirect and return-destination handling (S12), PKCE parameters (S1), secrets in the bundle or environment files (S4), tokens in logs or URLs (S5, S6), the prompt-preservation mechanism (section 6), and the theme's resources (no third-party origins, no inline script added).
- Real findings go back to the implementer as part of implementation and do not use up a repair cycle. The checkpoint records the method used, the files covered, each finding, and how it was resolved.

## 15. Keycloak Configuration

### Ownership

Keycloak realm and client administration is a **user-applied local-development configuration step**. The user makes every change in the Keycloak admin console.

- Implementation and QA agents must not request, store, or use Keycloak administrator credentials. They do not read `Project/.env` for them, do not call the admin API or admin CLI, and do not sign in to the admin console.
- The repository was inspected on 2026-10-11 and contains no declarative realm configuration: no realm export or import file, and `Project/docker-compose.yml` starts Keycloak with `start-dev` and no import option. The frontend checks again at implementation time and does not assume. If a version-controlled realm configuration that safely owns these settings exists by then, the frontend may propose the smallest change to it for Lead approval. This feature does not introduce one.
- "Verify" in the table means: observe the behavior without administrator credentials where that is possible (the public discovery document and unauthenticated requests, as on 2026-10-11), and otherwise ask the user to confirm the value from the admin console. Confirmed values are recorded in the checkpoint and in `FRONTEND_CONTEXT.md`.

### Configuration checklist delivered by the implementation

The implementation produces a concise checklist the user can follow in the admin console, stating for each item the required value and whether it already holds. It covers at least:

1. Realm `outdoor-trip` (K1).
2. Client `outdoor-web` (K2).
3. Public client: client authentication off, no client secret (K2).
4. Authorization Code flow on; implicit flow and direct access grants off (K3).
5. PKCE required, method S256 (K4).
6. Valid redirect URIs, listed exactly (K5, K6).
7. Valid post-logout redirect URIs, listed exactly (K7).
8. Web origins (K8).
9. User registration enabled (K9).
10. Registration link available on the login page (K10).
11. Password policy: the current policy, read back so the registration page can state it (K14).
12. Forgot password enabled only if email delivery and the reset flow are actually configured; otherwise off (K13, section 10).
13. Login theme set to the custom theme, and the realm display name set (K16, K17).

### Items

Nothing in this table is changed by this specification.

| # | Item | Required | Observed 2026-10-11 | Action at implementation |
|---|---|---|---|---|
| K1 | Realm | `outdoor-trip`, issuer `http://localhost:8180/realms/outdoor-trip` | Matches | Verify |
| K2 | Web client | A public client (no secret). `FRONTEND_CONTEXT.md` names it `outdoor-web`. | A client `outdoor-web` exists and serves the login page. Public or confidential: not observable without signing in. | Verify client authentication is off |
| K3 | Flow | Standard flow (Authorization Code) on. Implicit flow off. Direct access grants off. | Implicit is refused for this client. Direct access grants: not observed. | Verify; turn direct access grants off if on |
| K4 | PKCE | Required by the client, method S256 | A request with no challenge is refused; a `plain` challenge is refused | Verify |
| K5 | Valid redirect URIs | Cover exactly the addresses the application redirects to on `http://localhost:5173`, and nothing on another origin | `/`, `/home`, and `/auth/callback` on `localhost:5173` are accepted, which suggests a wildcard path. Port 3000 and a foreign origin are refused. | Verify; narrow to the set the application uses if the adapter allows; record the decision in the security review |
| K6 | Frontend callback URL | The in-application address or addresses Keycloak returns to. Chosen at implementation (V6); may be the route the user was on or a dedicated route. | n/a | Decide, then make K5 match |
| K7 | Valid post-logout redirect URIs | Include `http://localhost:5173/` and no foreign origin | `http://localhost:5173/` accepted; a foreign origin refused | Verify |
| K8 | Web origins | `http://localhost:5173`, so the browser may call the token endpoint; no `*` | The token endpoint's preflight allows `http://localhost:5173`. The value configured on the client was not observed. | Verify |
| K9 | User registration | On (realm login setting "User registration"). This is the setting behind the message "Registration not allowed". | The registration page loads and the login page shows a Register link, so it appears to be on today. The "Registration not allowed" message was not reproduced. | Verify on every path the application uses, including Create account going straight to registration |
| K10 | Registration link | Visible on the login page | Visible | Verify after the theme is applied |
| K11 | Registration fields | The six fields observed, unchanged (D12) | Username, Email, First name, Last name, Password, Confirm password, all required | Verify; no change |
| K12 | Email verification | Must not block the registration → authenticated return, unless email delivery works | Not observed | Verify; if it is on and email cannot be sent, the user turns it off |
| K13 | Forgot password | On only if email delivery and the reset flow are configured and testable; otherwise off (section 10) | The link is shown, so it appears to be on. Whether the realm can send email was not observed. | Verify whether email can be sent; the user turns it off if not |
| K14 | Password policy | As configured; not changed by this feature | Not observed. Recorded 2026-10-12: minimum length 8, set by the user after QA and read back from the admin console; a 7-character password is refused on the registration page | Record it; the registration page states it (not yet done) |
| K15 | Login with email, Remember me, internationalization | As configured; the pages show no Remember me and no language switcher | "Username or email" label; no Remember me; no language switcher | Verify |
| K16 | Realm display name | The product name appears in page titles, never the realm id | Page title reads "Sign in to outdoor-trip" | Set a display name, or override the message in the theme |
| K17 | Login theme | The custom theme of section 11 is selected for the realm | `keycloak.v2` | The user selects it after the theme is loaded |
| K18 | Token and session lifetimes | As configured | Not observed. Recorded 2026-10-12: access token 300 s and SSO session idle 1800 s (observed); SSO session max 12 hours (read back by the user) | Record (V4) |
| K19 | Claims | Access tokens carry `sub`, `email`, and `name` or `preferred_username`, which `user-service` needs to create a profile | Not observed | Verify with a self-registered user (AC-33) |
| K20 | Social providers, MFA | None added. MFA only if the realm already requires it. | No provider buttons on the login page. MFA: not observed. | Verify |
| K21 | Client home URL | `http://localhost:5173/`, so Keycloak's error and information pages can offer a link back to the application (D21) | Not observed | Verify whether the error page shows the link; the user sets the client's Home URL if it does not. Recorded with K1–K20 under AC-37 |

A production deployment needs its own values for K5–K8. They are not defined here.

## 16. Explicit Non-Goals

- No AI recommendation API integration, and no call from the browser to any product API (recommendation, trail, or user service).
- No trail recommendation results, trail cards, or weather recommendation UI.
- No gear recommendation and no redesign of the Gear page.
- No real-time 3D, no avatar, no Three.js or related library.
- No final Authenticated Home; no planner on `/home`.
- No user profile management beyond showing who is signed in: no profile editing, no account settings page, no preferences.
- No social login.
- No MFA, unless the existing realm configuration already requires it.
- No custom React username/password authentication, and no application-side password handling of any kind.
- No backend change, and none pre-authorized. A real Keycloak or backend contract problem is reported to the Lead and goes through `backend-api` only after approval.
- No change to the registration fields or the user-profile schema (D12).
- No realm export, import, or other declarative realm mechanism, and no use of Keycloak administrator credentials by any agent (D11).
- No infrastructure change beyond the single Compose mount in section 19.
- No browser path to the backend (gateway routes, CORS, development proxy). That gap stays as documented in `FRONTEND_CONTEXT.md` §11 and belongs to the first feature that calls an API.
- No Keycloak account-console, admin-console, or email theme.
- No redesign of the Public Landing beyond the gate and notices in section 6.
- No test framework setup.
- No whole-repository security audit.

## 17. Acceptance Criteria

37 criteria. Each one covers a coherent behavior, so that one QA pass through a flow settles a whole criterion. A criterion passes only when every clause in it was observed.

Unless a criterion says otherwise, it is checked against the local stack (application on `http://localhost:5173`, Keycloak on `http://localhost:8180`) in Chrome. "The Keycloak origin" means the configured Keycloak base URL. QA creates its own throwaway accounts through the registration flow and uses them for the sign-in checks, so no credential is shared or stored anywhere.

Forgot password and email verification are conditional (section 10). Where they are off because email delivery is not configured, the clauses that mention them do not apply, and their absence is not a failure.

### Sign-in and the code flow

- **AC-01** Activating Sign in on the Public Landing, with the planner empty, causes a top-level navigation to the realm's authorization endpoint with `response_type=code`, the configured client id, a `code_challenge`, `code_challenge_method=S256`, a `state`, and a scope containing `openid`. The credential page is served from the Keycloak origin, and the application renders no credential field. The code is exchanged by one request to the token endpoint with `grant_type=authorization_code` and a `code_verifier`, without a `client_secret`. No request with `grant_type=password` is ever sent.
- **AC-02** Signing in as an existing user returns to the application and ends on `/home` in the authenticated state, with the user's display name or email and a Sign out control visible. Afterwards the address bar and the session history contain no `code`, `state`, `session_state`, `iss`, or `error` parameter.
- **AC-03** Keycloak refuses each of these for the web client: an authorization request with no code challenge; one with `code_challenge_method=plain`; one with `response_type=token`; a `grant_type=password` token request; a redirect URI on another origin; a post-logout redirect URI on another origin.

### Registration

- **AC-04** Create account at the planner gate navigates directly to the Keycloak registration page, not the login page, with the PKCE properties of AC-01. The login page shows a link to registration that opens the same page. "Registration not allowed" appears on neither path.
- **AC-05** The registration page shows exactly these six fields: Username, Email, First name, Last name, Password, Confirm password. Completing it with details not used before creates the account and returns to the application in the authenticated state with no second sign-in.
- **AC-06** Submitting registration with an already-registered username or email, with two different passwords, and with a required field empty each shows a message on the registration page, creates no account, and keeps the non-password values. Signing in with a wrong password shows one message that does not say which value was wrong.

### Keycloak theme

- **AC-07** The login and registration pages render in the custom theme: the wordmark "Outdoor Trip Companion" is visible; neither the realm id "outdoor-trip" nor a Keycloak logo appears in the page or its title; the primary action's background is `conifer` (`#1F5A46`) with `snow` text; body text is `ink` on `paper`; the computed font family is the design system's system stack. Both pages look the same when the browser emulates a dark system color scheme.
- **AC-08** The error page, the page-expired page, and the logout-confirmation page (if it can be reached) render in the theme, and no page reachable in the flows of section 3 shows stock Keycloak styling. If Forgot password is enabled, its pages are themed and the reset flow completes. If it is off or omitted because email delivery is not configured, the login page shows no Forgot password link, and that is a pass.
- **AC-09** The theme inherits from an official Keycloak parent theme. The implementer's report lists every overridden template with its reason, and the list is empty unless the Lead approved each entry. The Keycloak pages contain no video and no rotating or animated scenery, and they request nothing from any origin other than the Keycloak origin.
- **AC-10** At 1920×1080, 1440×900, 1366×768, 1280×800, 768×1024, 390×844, and 320×568 the login and registration pages have no horizontal scroll and no clipped or overlapping element, and every field and the primary action can be reached. At widths of 1024px and above, an identity region and a form region sit side by side, each at least 30% of the viewport width, and the form's fields and primary action are 360–440px wide. At the four desktop viewports the whole login page is visible without scrolling. Input text is at least 16px and no text is smaller than 14px. At 390px and 768px every interactive element has a hit area of at least 44×44 CSS px.

### Callback failure

- **AC-11** Each of these ends on `/` in the unauthenticated state with notice F1 or F2: an error authorization response (for example `error=access_denied` with a description) delivered as a query string and again as a fragment; a response whose `state` the application did not issue; a response whose code has already been used. In every case the description text is not displayed, the address bar is cleaned, protected content is never rendered, no navigation to Keycloak starts, a prompt saved before the attempt is in the planner input and editable, and the Sign in and Create account actions are available.

### Session restore and lifecycle

- **AC-12** Reloading `/home` while signed in shows `/home` again in the authenticated state without credential entry, and protected content is not rendered until authentication has been confirmed. A signed-in user who loads `/` ends on `/home`.
- **AC-13** After the access token's expiry time has passed while the Keycloak session is still valid, the application is still authenticated and holds a token that has not expired, with no full-page navigation and no user action. QA may wait for the configured lifetime or advance the browser clock.
- **AC-14** After the Keycloak session has been ended elsewhere (sign-out in a second tab of the same browser), the first tab leaves the authenticated state at the latest on its next reload or renewal attempt: it ends on `/` with notice X1, and protected content is not shown.
- **AC-15** With the Keycloak origin unreachable at startup, the Public Landing's heading, planner, suggestions, and Sign in are rendered and operable; activating Sign in shows notice F3; `/home` is not rendered; and no waiting state lasts longer than 10 seconds.

### Logout

- **AC-16** A Sign out control is visible on every protected route when signed in. Activating it sends the browser to the realm's end-session endpoint and back to `/` in the unauthenticated state with notice O1, with no Keycloak confirmation page on the way. Activating Sign in afterwards shows the Keycloak login form and requires credentials.
- **AC-17** After sign-out, loading `/home` directly does not render it, pressing Back does not reveal protected content, and the pending-prompt key and the return destination are absent from web storage.

### Protected routes

- **AC-18** A signed-in user can load `/home`, `/gear`, and `/trails/<any id>` directly. A signed-out visitor who loads any of them never sees protected content and ends on `/` with the gate and message G3, and no navigation to the Keycloak origin happens until the visitor activates Sign in or Create account.
- **AC-19** After being sent to the gate from a protected route, signing in or registering from that gate ends on the route originally requested, including the trail id.
- **AC-20** The return destination cannot leave the application. With the stored destination replaced by `//example.org`, `https://example.org/`, a `javascript:` value, or a path that is not a protected route, a completed sign-in ends on `/home`. Adding a query parameter such as `returnTo`, `redirect`, or `next` to any application URL has no effect on where the user ends up.
- **AC-21** There is no redirect loop and no Back-button trap. Pressing Back on the Keycloak login page returns to the application in the unauthenticated state and nothing navigates forward again. Across AC-11, AC-14, and AC-18 the application starts zero navigations to the Keycloak origin without a user activation.

### Planner prompt preservation

- **AC-22** Activating the primary action with a valid prompt while signed out navigates nowhere, saves the trimmed prompt under the single key defined in `features/planning/pendingPrompt.ts`, and shows the gate with Sign in and Create account. The message is G1 when the prompt was saved and G2 when it could not be. Empty and over-limit prompts behave as in FEATURE-001 (its AC-10 and AC-12) and do not show the gate.
- **AC-23** Completing sign-in from the gate, and separately completing registration from the gate, ends on `/home` with the exact trimmed prompt displayed as text, and it is still displayed after a reload. `/home` shows no recommendation, trail, score, weather result, results-loading indicator, or wording implying that planning has occurred or is in progress.
- **AC-24** The prompt appears in no URL, not in the OIDC `state`, and in no request to the Keycloak origin, at any point in AC-22 and AC-23.

### Credentials, tokens, and scope

- **AC-25** `Project/Frontend/src` contains no password input, no state or variable holding a password, and no request that sends credentials. The frontend source, `.env.example`, and the built bundle contain no credential, client secret, or token; the only Keycloak configuration values are the base URL, the realm, and the client id.
- **AC-26** While signed in, and again after a reload, `localStorage`, `sessionStorage`, and cookies on the application origin contain no access token, refresh token, or ID token (no value in JWT form). The only permitted exception is one recorded in the checkpoint with its justification, the Lead's approval, and the security review's agreement. Across the whole demo of section 18 the browser console contains no token, no authorization code, and no logged auth object.
- **AC-27** Every user-facing message the application shows in the states of section 5 is free of tokens, codes, HTTP statuses, stack traces, URLs, the word "Keycloak", and the realm id.
- **AC-28** In every state of this feature the browser sends requests only to the application's own origin and to the Keycloak origin; none goes to the recommendation, trail, or user service. `Project/Frontend/package.json` gains exactly one runtime dependency, the approved OIDC adapter, and no 3D library; no `canvas` element or 3D scene is rendered. No file outside `features/auth` imports the adapter.

### Accessibility

- **AC-29** Using only the keyboard, a user can complete sign-in, complete registration, and sign out. On every Keycloak page and on the gate, tab order follows the visual order and nothing traps focus. Every interactive element on the Keycloak pages, the gate's actions, and the Sign out control shows a visible focus indicator when focused by keyboard.
- **AC-30** Every input on the Keycloak pages has a programmatically associated visible label. Password inputs are of type `password` with `autocomplete` `current-password` (login) or `new-password` (registration) and accept pasted text, and their show/hide control is a button with an accessible name that reflects its state. Each validation message is text, is associated with its field or exposed in an alert region, and is accompanied by an icon or outline so it does not rely on color alone. After a failed submit, focus is on the first invalid field or on an error summary.
- **AC-31** Measured on the rendered Keycloak pages, not inferred from token names: text is at least 4.5:1 against its actual background, control boundaries are at least 3:1, and ordinary-size error message text is at least 4.5:1 against the background it sits on.
- **AC-32** The gate and notices G1–G3, F1–F3, X1, and O1 are exposed through a live region and announced when they appear. With `prefers-reduced-motion: reduce`, nothing this feature adds animates. With the gate shown, the Public Landing still meets FEATURE-001's AC-07 (no scrolling at the four desktop viewports) and AC-28 (no horizontal scroll or clipping at any reference width).

### Backend, security review, and engineering

- **AC-33** With `user-service` running, the access token of a user who has just self-registered is accepted by `GET /api/users/me` (HTTP 200), and the response carries that user's email and a non-empty display name. QA makes this request outside the page and does not write the token to disk or to output. This is an integration check only: if a correctly issued token is rejected, the result is reported as a contract gap for `backend-api` and is not fixed from the frontend.
- **AC-34** No file under `Project/Backend/` is modified by this feature, unless a `backend-api` proposal approved by the Lead is recorded in the checkpoint. The FEATURE-001 criteria not amended in section 6 still pass; QA reruns at least its AC-04, AC-08 through AC-12, AC-19 through AC-21, AC-27, AC-28, AC-36, and AC-41.
- **AC-35** The checkpoint records one scoped security review performed after implementation and before QA: the method, the list of files covered (FEATURE-002 changes only), each finding, and its resolution. No high-severity finding is left open.
- **AC-36** From `Project/Frontend/`, `npm run build` and `npm run lint` both exit with code 0 and no new warnings. Every file changed by this feature lies inside the approved write paths of section 19. `docs/FRONTEND_CONTEXT.md` is updated for the authentication flow, the route table, the feature boundaries, and the Keycloak client configuration the frontend depends on.
- **AC-37** The implementer's report contains the realm configuration checklist of section 15, and the checkpoint records the value of each item K1–K20 as observed without administrator credentials or as confirmed by the user. No file, script, report, or checkpoint contains Keycloak administrator credentials, and no implementation or QA step used them.

## 18. Expected Demo

| Step | Action | Expected | Criteria |
|---|---|---|---|
| 1 | Open the Public Landing | Landing as in FEATURE-001 | AC-34 |
| 2 | Enter "Easy hike with a lake view this weekend" | Text in the planner | — |
| 3 | Activate Start planning | No navigation; prompt saved | AC-22 |
| 4 | — | The gate says sign-in is needed and offers Sign in and Create account | AC-22 |
| 5 | Choose Create account | Browser leaves for Keycloak | AC-04 |
| 6 | — | Branded Keycloak registration page | AC-04, AC-07 |
| 7 | Create an account | Account created | AC-05 |
| 8 | — | Back in the application, authenticated | AC-02, AC-05 |
| 9 | — | The original request is shown | AC-23 |
| 10 | — | `/home` is accessible | AC-18 |
| 11 | Refresh | — | AC-12 |
| 12 | — | Still authenticated; request still shown | AC-12, AC-23 |
| 13 | Sign out | Keycloak session ended | AC-16 |
| 14 | — | Back on the Public Landing, signed out | AC-16, AC-17 |
| 15 | Open `/home` | Not rendered | AC-17, AC-18 |
| 16 | — | The gate asks for sign-in again | AC-18 |

Separately: sign in as the user created in step 7, from the navigation's Sign in with an empty planner (AC-01, AC-02), and confirm after sign-out that credentials are required (AC-16).

## 19. Implementation Cycle

Not run now. When the user starts the cycle, it follows `.claude/skills/feature-cycle/SKILL.md` with this routing:

```text
Lead
  → ui-ux            section 21 only: the application's new states and the Keycloak theme
  → Lead             approves section 21 or sends it back
  → frontend         React integration and the theme files
  → backend-api      only if a real Keycloak or backend contract change is required, after Lead approval
  → scoped security review of the FEATURE-002 changes
  → Lead diff review
  → qa
  → repair, at most 2 cycles
  → PASS / BLOCKED
```

- **`three-d` is skipped.** Nothing here is real-time 3D.
- **`ui-ux`** writes section 21 of this file and nothing else. It may propose a design-system addition (section 11) but does not edit `docs/DESIGN_SYSTEM.md` without Lead approval.
- **`frontend`** may use the `frontend-design` skill for execution quality. The skill never overrides this specification or `docs/DESIGN_SYSTEM.md`, and never justifies a redesign.
- **`security-guidance`** is already active through hooks and needs no brief. The one scoped review is defined in section 14.
- **`qa`** prefers the `webapp-testing` skill when its runtime is available, and otherwise drives the installed Chrome with a Playwright installed in the session scratch directory. Playwright is never added to `Project/Frontend/package.json`.

AC-33 is an integration check. It gives the frontend no permission to change backend code, and no backend change is pre-authorized. If the existing backend rejects a correctly issued token because of a genuine contract or configuration defect, the gap is reported, routed through `backend-api`, and nothing under `Project/Backend/` changes before the Lead approves.

### Approved write paths (FEATURE-002 exception)

The `frontend` agent normally writes only under `Project/Frontend/`. This feature needs Keycloak theme files that cannot live there. No new specialist agent is created. For FEATURE-002 only, the Lead authorizes the two additional paths below.

The repository was inspected on 2026-10-11: `Project/docker-compose.yml` is its only Compose file; `Project/docker/` holds only `postgres/`; no Keycloak theme directory exists yet; and the running container's theme directory, `/opt/keycloak/themes`, is empty apart from a README.

| Path | What `frontend` may write there |
|---|---|
| `Project/docker/keycloak/themes/outdoor-trip-companion/login/**` (new) | The Keycloak login theme only: `theme.properties`, stylesheets, static images, and message overrides. Template files only as section 11 allows (one approved: D28). One script file, `resources/js/registration-focus.js`, within the limits of D29. |
| `Project/docker-compose.yml` | Inside the `keycloak` service only: one read-only bind mount of `./docker/keycloak/themes/outdoor-trip-companion` at `/opt/keycloak/themes/outdoor-trip-companion`. No other line of the file changes. |

Limits of the exception:

- Keycloak theme assets and theme configuration only, plus the minimum Compose configuration needed to load the theme.
- No other file under `Project/docker/`. No change to the `postgres` service, to ports, environment variables, image versions, the start command, or named volumes. `Project/.env` is not read or written.
- Nothing under `Project/Backend/`, and no infrastructure refactor.
- If loading the theme needs anything beyond this one mount, the frontend stops and reports it, and the Lead decides.
- The exception ends with this feature and does not carry over to later ones.

The mount takes effect when the Keycloak container is recreated (`docker compose up -d keycloak` from `Project/`). Realm data lives in PostgreSQL and is not affected. That restart is done by the user, or by the Lead once the user has said to go ahead.

The complete set of paths the Lead's diff review enforces:

| Area | Who writes |
|---|---|
| `Project/Frontend/**` | `frontend` |
| `Project/docker/keycloak/themes/outdoor-trip-companion/login/**` | `frontend`, FEATURE-002 only |
| `Project/docker-compose.yml`, the one mount described above | `frontend`, FEATURE-002 only |
| `docs/features/002-authentication.md`, section 21 | `ui-ux` |
| `docs/FRONTEND_CONTEXT.md`, `.claude/state/features/002-authentication.md` | Lead |
| `Project/Backend/**` | Nobody, unless a `backend-api` proposal is approved |
| Keycloak realm and client settings | The user, in the admin console (section 15) |

A change anywhere else fails the diff review.

### Prerequisite before the cycle runs

`.claude/agents/frontend.md` currently hard-limits the agent: its Rules section says "Do not modify anything under `Project/Backend/`. Your write scope is `Project/Frontend/`." As written, the agent would be right to refuse the theme files. One small change is needed before `/feature-cycle 002-authentication` is run, and it is not made by this specification:

- Replace the sentence "Your write scope is `Project/Frontend/`." with: "Your write scope is `Project/Frontend/`, plus any additional paths the approved feature specification lists as a Lead-authorized exception for that feature, used only for the purpose stated there."

The ban on `Project/Backend/` stays as it is. For consistency, the `frontend` row of the agent table in `CLAUDE.md` and the two lines of `.claude/skills/feature-cycle/SKILL.md` that name `Project/Frontend/` as the frontend's area (the implementation brief and the Lead diff review) should carry the same one-clause allowance. The Lead's brief names the two paths above explicitly in any case.

### What QA needs running

Arranged by the Lead with the user before the QA step: PostgreSQL and Keycloak from `Project/docker-compose.yml` with the theme loaded and the realm configured per section 15; the frontend dev server on port 5173; and `user-service` on port 8081 for AC-33. QA registers throwaway accounts in the local realm; they are not cleaned up automatically.

## 20. Decisions, Open Questions, and Contract Gaps

### Lead decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Start planning shows a gate on the landing with Sign in and Create account; it does not redirect by itself. | The user chooses between the two before leaving for Keycloak, registration is reachable in one step, and the visitor is told their request is kept before the page changes. |
| D2 | The navigation's Sign in goes straight to the Keycloak login page. | A returning user asked for sign-in; an extra step adds nothing. |
| D3 | A signed-out visitor on a protected route is sent to `/` with the gate. The application never redirects to Keycloak without a user activation. | Loops and Back-button traps become impossible by construction, and Create account is available on this path too. |
| D4 | The return destination is an in-application path held for the tab, validated against the protected routes, and never read from a URL parameter. | Removes open-redirect risk without a parameter to sanitize. |
| D5 | The theme source lives at `Project/docker/keycloak/themes/outdoor-trip-companion/login/` and is loaded through one mount in `Project/docker-compose.yml`. `frontend` writes both under a FEATURE-002-only exception, with the exact paths in section 19. No new agent is created. | The theme is frontend work (styles, copy, static resources) but cannot live in `Project/Frontend/`. Approved by the user on 2026-10-11. |
| D6 | The pending prompt stays in session storage under its existing key, is displayed on `/home` without being consumed, and is cleared on sign-out. | Already built and tab-scoped; FEATURE-003's planner is what consumes it. |
| D7 | Protected routes are `/home`, `/gear`, and `/trails/:trailId`; a signed-in user who opens `/` goes to `/home`. | PRD §7.1: returning users are not made to pass through the landing. Resolves FEATURE-001 D1. |
| D8 | No browser request to a product API in this feature. Identity on `/home` comes from the adapter. Attaching the bearer token in the shared API client is left to the first feature that calls an API. | No browser path to the backend exists yet (gateway and CORS gap). Attaching tokens with nothing to call would be untestable code. S15 fixes the rule in advance. |
| D9 | `keycloak-js` is the one pre-approved new dependency. | Official adapter; the earlier client in this repository used it. |
| D10 | AC-33 checks that a self-registered user's token is accepted by `user-service`, outside the browser. It is a verification, not permission to change the backend. | It is the only proof that the registration fields produce the claims the backend needs, and it is the feature's backend-regression check. A genuine defect goes to `backend-api` and needs Lead approval. |
| D11 | Keycloak realm and client administration is user-applied local configuration. Agents never request, store, or use administrator credentials. The implementation delivers a checklist (section 15). | Capstone scope, and no declarative realm configuration exists in the repository. Approved by the user on 2026-10-11. |
| D12 | The six observed registration fields are kept: username, email, first name, last name, password, confirm password. | The user-profile schema is not redesigned in this feature. Simplification is out of scope unless authentication correctness requires it. |
| D13 | Forgot password is conditional on working email delivery. Without it, the feature may be turned off or omitted, and that does not block `PASS`. | QA must not fail the feature for email infrastructure the project does not have. |
| D14 | Error text on the Keycloak pages is `ink` or an auth-specific darker color measuring at least 4.5:1 on its actual background. The global `ember` token is unchanged and is limited to icons, outlines, and supporting cues. | `ember` on `paper` is about 4.43:1, below the requirement for normal text. |
| D15 | Q4 resolved as section 21.2.4: from 768px the gate is one row inside the existing 60px allowance and nothing moves. Below 768px it stacks and uses FEATURE-001's existing growth rule, so the field may shift up once when the gate appears (up to 56px at 390×844). The mobile reserve R is not raised. | Keeps every FEATURE-001 default position. The shift is the behavior 001 already has for its four- and five-line message states. |
| D16 | Q2 resolved: the landing navigation gains no "Create account" entry. | No room at 320px without a menu; registration is one step away at the gate and on the login page. |
| D17 | Notice **O2** is approved for section 9's unconfirmed sign-out: "Sign-out couldn't be completed right now. To be sure your session has ended, close your browser." It is bound by the same rules as the other notices (AC-27, AC-32). | Section 9 required the wording but gave it no id or text. |
| D18 | Section 10's "under the product name" is satisfied by 21.5: the wordmark sits in the identity region beside the form from 1024px and above the heading below it. | It precedes the heading in reading order at every width. |
| D19 | Identity shown in the header: the `name` claim; if blank, `email`; if blank, `preferred_username`; if all are absent, the Sign out control alone. | Mirrors the fallback `user-service` already applies. With the six required registration fields the third case should not occur; it is a safe floor, not a new feature. |
| D20 | The return destination survives the dismissal of the G3 gate. The next successful sign-in or registration in that tab uses it once, from whichever control it was started; it is cleared exactly as section 7 says. | Section 7 already defines it as held for the tab and used once. Tying it to one rendering of the gate would add state for no benefit. |
| D21 | K21 is added to section 15: the client's Home URL. If Keycloak's error page offers no way back because it is unset, the frontend reports it and the user sets it. No template is overridden to add the link. | Section 10 requires a way back to the application; Keycloak derives it from client configuration. |
| D22 | The theme ships its own browser-tab icon in place of the parent's Keycloak logo: a plain solid `conifer` square, explicitly a placeholder and not a product mark. The web application's own icon is not changed in this feature. | AC-07 excludes the Keycloak logo, and no product icon exists yet. Designing one is out of scope. |
| D23 | The 10-second ceiling on W3 (21.3) is approved. How the application learns that Keycloak is unreachable (F3) is an implementation choice inside sections 5 and 7. | Consistent with section 5's bounded-waiting rule. |
| D24 | Design-system proposals P1–P3 (21.9) are deferred. Their values stay feature-level values of this specification, and `docs/DESIGN_SYSTEM.md` is not edited by this feature. The optional contour drawing (21.10 item 12) is not included. The "Frontend ready" placeholder button on `/home` stays. | D14 already allows an auth-specific error color. The tokens are decided when the Gear forms need them. |
| D25 | "Navigation to Keycloak" in D3, section 7, and AC-21 means a top-level navigation. A hidden-frame session check with `prompt=none` at startup is allowed, provided it never displays a Keycloak page, never blocks the landing, and ends within the 10-second bound (V3, S2). | It is how the adapter restores a session after a refresh without a copy of the tokens (section 4.2). A top-level check at every load would be the redirect the rule forbids. |
| D26 | The items of 21.10.8 are confirmed by `frontend` against the rendered parent theme. Where an outcome cannot be reached with properties, styles, static resources, and message overrides, the fallback order of 21.5.5 applies; a template override is requested from the Lead before it is written (section 11). The structural change to the planner's message slot in 21.10.10 is approved as part of section 6. | Keeps the zero-override target and the existing approval rule. |
| D27 | A tab-scoped marker may record that this tab held a session, for one purpose: on the next load, when the startup check finds no session, the landing shows X1 instead of G3 (AC-14). It is session storage, holds no token or identity, is read once at startup and removed, is cleared on sign-out, and is never consulted by a route guard or by anything that decides the auth state. | Without it a reload after the session ended elsewhere cannot tell "your session has ended" from "you never signed in". It selects a notice and grants nothing, so it is not the stored signed-in flag that section 4 forbids. Approved 2026-10-11 after implementation part 1; covered by the scoped security review. |
| D28 | One template override is approved: `login-page-expired.ftl`, the smallest version that renders the single "Start again" link of 21.7 as real text and omits the parent's second option. No other template is approved. | Hiding the second option with styles leaves "Click here Start again" and stray punctuation in the accessibility tree. The override is about 11 lines. It is listed in the implementer's report (AC-09). |
| D29 | The theme exception of section 19 is widened by one file: `resources/js/registration-focus.js`, loaded through the `scripts` property of `theme.properties`. Its only job is focus on the registration page: the first field on load, and the first invalid field after a failed submit. It is served from the Keycloak origin, is not inline, makes no request, reads no field value, and stores nothing. No other script is allowed. | AC-30 and 21.7 require the focus behavior; the parent theme does not provide it and styles cannot. The alternative was copying 100–200 lines of parent templates. Chosen by the user on 2026-10-11 (option A) over a template override or waiving the clause. |
| D30 | For AC-30's "associated with its field or exposed in an alert region", the parent theme's own markup is accepted: each field error is text inside the parent's live region, on a field marked `aria-invalid`, and focus moves to the first invalid field (D29). `aria-describedby` on each field and `role="alert"` on page messages are not required in this feature. | Adding them means overriding the parent's field and layout templates, which section 11 keeps at a minimum. The message is still text, announced, and paired with focus, an icon, and an outline. QA verifies those and reports the missing attributes without failing on them alone. Lead decision, 2026-10-12; flagged for the user's review at close. |

### Open questions

None of these blocks the cycle from starting; each has a working assumption.

| # | Question | Working assumption | Who decides |
|---|---|---|---|
| Q1 | "Registration not allowed" was not reproduced on 2026-10-11: the registration page loads. Was it seen on a path this probe did not take, or has the setting already been changed? | Treated as a configuration requirement regardless (K9, AC-04). | User, to confirm where it was seen |
| Q2 | Does the landing navigation gain a "Create account" entry next to Sign in? | **Resolved by D16.** No. Registration is reached from the gate and from the login page. `ui-ux` may propose otherwise. | Lead, on `ui-ux`'s proposal |
| Q3 | The redirect URIs appear to use a wildcard path on `localhost:5173`. Narrow them to the exact addresses the application uses? | Decided in the security review once V6 is known; the user applies the change. | Lead, with the security review |
| Q4 | **Resolved by D15.** The gate (message plus two actions) is taller than the three-line message FEATURE-001's layout reserves on desktop. How does it fit without moving the field? | A design task for section 21; FEATURE-001's AC-07 must still hold (AC-32). | `ui-ux` |

### Contract gaps

| Gap | Effect on this feature | Handling |
|---|---|---|
| No realm or client export in the repository. | Configuration can only be verified against the running Keycloak, and only the user can change it. | Section 15, D11, AC-37. |
| No browser path to the backend (gateway has no routes; CORS only on `trail-service`). | None, because this feature calls no product API (D8). | Stays documented in `FRONTEND_CONTEXT.md` §11 for the next feature. |
| `user-service` creates a profile from the `email` and `name` or `preferred_username` claims and fails when they are missing. | A registration form that does not yield those claims would break later features. | K19, AC-33. A real defect is routed through `backend-api` with Lead approval. |
| The Keycloak theme has no owning area in `CLAUDE.md`'s agent table. | The `frontend` agent's own rules forbid writing outside `Project/Frontend/`. | Resolved by the FEATURE-002 exception in section 19 (D5). The one-sentence change to `.claude/agents/frontend.md` described there is still to be made. |
| Email delivery is not configured anywhere in the repository. | Forgot password and email verification may not be usable. | Conditional rule in section 10 (D13); not a blocker. |
| Several realm settings could not be observed without signing in (client type, direct access grants, email delivery, password policy, token lifetimes). | They are unknown, not assumed. | Marked "not observed" in section 15; the user confirms them from the admin console. |

## 21. Design Specification

Owned by `ui-ux`. Written 2026-10-11; approved by the Lead the same day. Every item of 21.9 and 21.10 is settled by D15–D30 in section 20, which take precedence where they differ from the text below. This section adds design decisions only. Requirements are cited by section number and not restated. Token names are those of `docs/DESIGN_SYSTEM.md` ("V2"); "001 §x" means `docs/features/001-public-landing.md`. Everything the design could not settle inside sections 1–20 is listed in 21.10 and is not designed around.

### 21.1 Decisions at a glance

| Topic | Decision |
|---|---|
| Q4, gate height | From 768px the gate is one row (message beside its two actions), at most 60px tall, which is exactly the three-line message 001 already reserves. R, the field, and every 001 position are unchanged. Below 768px the gate stacks and uses 001's existing growth rule (21.2.4). |
| Q2, navigation | No "Create account" entry. The landing navigation keeps two items (21.2.7). |
| Error text color (D14) | Feature-level value `#A8361F` on `paper` `#F7F5EF`: 6.00:1 (21.6.4). |
| Keycloak layout | Two regions from 1024px, 5 : 7 (41.67% `ink` identity, 58.33% `paper` form), 400px form column; one column below (21.5). |
| Shared radius | 12px for the gate actions, Keycloak fields, and Keycloak buttons. |

Feature-level values (not design-system tokens; see 21.9):

| Name | Value | Used for |
|---|---|---|
| auth radius | 12px | Gate actions; Keycloak text fields and buttons |
| auth error text | `#A8361F` | Error message text on `paper` or `snow` |
| gate pressed fill | `#DBDBD6` (`paper` 88% mixed with `ink` 12%) | Pressed state of the filled gate action |
| waiting delay | 400ms | Delay before a waiting line is shown (21.3) |

### 21.2 Public Landing: the gate and notices

**What does not change.** Navigation, heading, supporting text, label, field, primary action, chips, scene control, both scrims, the row-4 reserve R (128px from 1024px, 188px below), and every value in 001 §11.2. Only the content of the planner's message slot changes. Notices N1–N4 and their copy are removed; E1, E2, and the counter are untouched.

#### 21.2.1 Anatomy

```text
field
  12px
message slot (as wide as the field)
  gate = one centred block, width fit-content, max-width 100%

  from 768px   [icon 16] 8 [message text, wraps] 16 [ Sign in ] 8 [ Create account ]     one row, items vertically centred

  below 768px  [icon 16] 8 [message text, wraps]
                 12px
               [     Sign in     ] 8 [  Create account  ]                               two equal columns, full slot width
  20px
chips
```

| Part | Content | Geometry and size | Notes |
|---|---|---|---|
| Message | Icon (16px lucide, `snow`, centred on the first line) and text, `snow`, 14/20 weight 500, lines start-aligned | Text column takes the width left by the actions: about 460px at ≥1440, 400px at 1024–1439, 380px at 768–1023; full slot width minus 24px below 768 | Unchanged from 001 §11.11: no box, border, or background; sits in the content scrim's solid region |
| Sign in (gate) | "Sign in" | Compact rounded, radius 12px, horizontal padding 16px, 14/20 weight 600. Height 36px with a fine pointer at ≥1024px; 44px below 1024px and on any coarse pointer | Filled: `paper` fill, `ink` text (16.04:1), no border, no shadow |
| Create account (gate) | "Create account" | Same size and radius | Quiet: fill `ink` at 0.72, 1px `snow` border, `snow` text (001's quiet-control recipe with a 12px radius in place of the pill) |

Sign in is the filled one because it is first in reading and tab order, it is the right default for five of the seven notices (G3, F1, F2, X1, O1), and Create account stays a full-size button beside it. The 12px radius and the filled surface keep both visibly different from the pill chips below. Neither uses `conifer`: the planner's own action remains the only `conifer` element on the page.

Below 768px the two actions are `flex: 1` with a 44px minimum height; if a system font makes "Create account" wider than its column, the row wraps and each action takes the full width. Nothing has a fixed width above 288px.

The scrim's "content bottom" (001 §11.8) is the bottom edge of the gate, so the message text is always inside the solid region. The actions carry their own surfaces.

#### 21.2.2 Notices

Copy for G1–G3, F1–F3, X1, and O1 is the baseline of section 5, unchanged. All are polite (`role="status"` region of 001 §11.11).

| Id | Icon | Actions | Appears when | Focus when it appears |
|---|---|---|---|---|
| G1, G2 | `Info` | Sign in, Create account | Primary action or Enter with a valid prompt | Stays on the element that was used (001 §11.11) |
| G3 | `Info` | Both | Arrival on `/` from a protected route | Landing `h1` (21.2.5) |
| F1 | `CircleAlert` | Both | Arrival after `callback-failed` | Landing `h1` |
| F2 | `Info` | Both | Arrival after a cancelled attempt | Landing `h1` |
| F3 | `CircleAlert` | Both when it was caused by a gate action; none when caused by the navigation's Sign in | A sign-in attempt that cannot start | Stays on the control that was activated |
| X1 | `Info` | Both | Arrival after `session-expired` | Landing `h1` |
| O1 | `Info` | Both | Arrival after sign-out (a page load) | Not moved |
| O2 (new, see 21.10) | `CircleAlert` | Both | Section 9, sign-out that could not be confirmed | Landing `h1` |

O2 text: "Sign-out couldn't be completed right now. To be sure your session has ended, close your browser."

Expected line counts (system font, 14px): G3, F1, F2, X1, O1 are one line and G1, O2, and F3-with-actions two lines from 768px; G2 is two or three. At 390px: G3, F2, O1 one line; G1, F1, X1, F3, O2 two; G2 three. At 320px add one line to each multi-line case.

**Lifetime.** 001 §11.11's rule, unchanged: a notice stays until the input's value changes (typing, deleting, or a chip) or the next activation of the primary action or the navigation's Sign in replaces it. No close button, no timeout, not restored after a reload. The actions appear and disappear with their message as one unit. While the value is over the limit, E2 and the counter remain and a text-only F3 from the navigation's Sign in is shown beneath them (three lines, 60px, the same tallest state as 001).

#### 21.2.3 States of the gate actions and of the navigation's Sign in

| State | Sign in (gate, filled) | Create account (gate, quiet) | Sign in (navigation) |
|---|---|---|---|
| Default | `paper` fill, `ink` text | `ink`/0.72 fill, 1px `snow` border, `snow` text | As 001 §11.6 |
| Hover (fine pointer) | Fill `snow` | Fill `ink`/0.88, 2px `snow` edge | As 001 |
| Active | Fill `#DBDBD6` | Fill solid `ink`, 2px edge | As 001 |
| Focus-visible | V2 §18 focus ring, plus `outline: 2px solid transparent; outline-offset: 2px` | Same | As 001 |
| Working (`redirecting`, this control was activated) | Label hidden visually but kept as the accessible name; a 16px `LoaderCircle` centred in its place, `ink`, one turn per 900ms linear; width unchanged; `aria-disabled="true"`; further activations ignored; cursor `progress` | Same, spinner `snow` | Same, spinner `snow` |
| Unavailable (`redirecting`, another control was activated) | `aria-disabled="true"`, opacity 0.56, activations ignored, still focusable | Same | Same |
| Error | None of its own: a failed start shows F3 and every control returns to Default | | |

Under `prefers-reduced-motion: reduce` the working state shows no spinner: the label stays visible and the control takes its Active fill. Working and Unavailable end when the browser leaves, when F3 replaces the message, or when the page is shown again after Back (including a restore from the back/forward cache); a control is never left stuck in Working. All three are `button type="button"`. Cursor is `pointer` in Default, Hover, and Active. Transitions: `background-color`, `--duration-fast`, `--ease-ui`.

#### 21.2.4 Fit per viewport (Q4, AC-32)

From 768px the gate's height is `max(text height, action height)`: 36px (one-line text, fine pointer), 40px (two lines), 44px (touch actions), or 60px (three lines). It never exceeds the 60px message allowance inside R, so row 4 does not grow, the field does not move, and 001's no-scroll arithmetic (fixed height 668px on large desktop, 588px on a short laptop) holds unchanged.

| Viewport | Field (y) | Gate top | Gate height: 1-line / G1 / G2 worst | Chips (y) for those three | Reserve ends | Field moves | Scrolls |
|---|---|---|---|---|---|---|---|
| 1920×1080 | 731–799 | 811 | 36 / 40 / 60 | 867–903 / 871–907 / 891–927 | 927 | 0 | No |
| 1440×900 | 581–649 | 661 | 36 / 40 / 60 | 717–753 / 721–757 / 741–777 | 777 | 0 | No |
| 1366×768 | 478–542 | 554 | 36 / 40 / 60 | 610–646 / 614–650 / 634–670 | 670 | 0 | No |
| 1280×800 | 505–569 | 581 | 36 / 40 / 60 | 637–673 / 641–677 / 661–697 | 697 | 0 | No |
| 768×1024 | 633–697 | 709 | 44 / 44 / 60 | 773–869 / 773–869 / 789–885 | 885 | 0 | No |
| 390×844 | 508–564 / 488–544 / 468–524 | 576 / 556 / 536 | 76 / 96 / 116 | 672–768 in all three | 768 | Up 16 / 36 / 56, once, at the activation | No |
| 320×568 | Unchanged | Field bottom + 12 | 96 / 116 / 136 | Pushed down by 12 + gate | n/a (001's very-short rule, R = 0) | 0 | Vertically only; page about 692–732px tall |

- **Guard at 1024–1439px.** G2 is the only text that can reach three lines. A fourth line would need an average glyph wider than 9px at 14px, which no system font in the V2 stack has. If it ever happens, 001's rule applies (row 4 grows by 20px from the scene window and spacer); the page still does not scroll, since the smallest spare height is 180px at 1366×768.
- **Below 768px** the gate needs text + 12px + 44px, which cannot fit in 60px with 44px targets. R is deliberately not raised, so the default mobile composition of 001 is untouched; the excess is taken from the scene window exactly as 001 §11.2 already does for its four- and five-line states. At 390×844 the actions always land at y 608–652 and the chips at y 672–768; only the block above them shifts. The scene window keeps 220px in the worst case (minimum 24px).
- **Reaching the actions on short screens.** When the gate appears and its bottom edge is outside the visual viewport, the page scrolls the shortest distance that brings the whole gate into view with a 16px margin. The scroll is instant (never smooth) and happens once per appearance.
- **AC-28.** The gate is `max-width: 100%` of the slot at every width; text wraps; actions wrap as described in 21.2.1. No horizontal scroll or clipping from 320px.
- **Coarse pointer at ≥1024px** (not a reference viewport): actions are 44px; the gate is still at most 60px.

#### 21.2.5 Focus, tab order, and announcement

- **Tab order while actions are shown:** brand → Sign in → input → Start planning → gate Sign in → gate Create account → chip 1 → chip 2 → chip 3 → background control (ten stops; 001 AC-33 as amended in section 6). The gate sits in the DOM between the field and the chips.
- **On appear:** see the table in 21.2.2. Focus is never moved onto a gate action.
- **On dismiss:** a notice is dismissed only by an input change (focus is then in the input) or by another activation (focus is on the control used), so focus is never on an element that is being removed.
- **Arrival from inside the running application** (a protected route or a waiting screen is replaced by the landing): focus moves once to the landing's `h1`, which is given `tabindex="-1"` and no focus ring (it is not operable), with scrolling prevented. On a fresh page load focus is left at the document start.
- **Structure.** The two actions are a `role="group"` with `aria-label="Account"`. The group is outside both live regions and outside the element named by the input's `aria-describedby`, so button labels are not read as part of a notice or of the field's description.
- **Live region.** Both regions exist empty from first render (001 §11.11). An arrival notice is inserted after the landing's first render, not rendered with it, so it is announced. A repeat that produces the same text is re-announced as in 001. Working and Unavailable are not announced.
- **Entrance motion.** Message and actions enter together: opacity 0 → 1 and a 4px upward slide, `--duration-base`, `--ease-ui` (001's message entrance). Under reduced motion they simply appear.

#### 21.2.6 Screen-level states on `/`

| State (section 5) | What the landing shows |
|---|---|
| `initializing` | The landing exactly as in 001. No indicator of any kind. |
| `unauthenticated` | The landing; slot empty unless a notice applies. |
| `redirecting` | 21.2.3 Working and Unavailable. |
| `callback-processing` | Waiting screen W2 (21.3), not the landing. |
| `callback-failed`, `session-expired`, `signed-out` | The landing with F1 or F2, X1, O1 (or O2) and both actions. |
| Media not loaded or failed | No effect on the gate: it sits on the scrim over the `ink` base layer (001 §11.7). |

#### 21.2.7 Q2: the landing navigation

No "Create account" entry. Reasons: at 320px the brand and Sign in already share the row with 8px to spare (001 §11.2), so a third item would force a menu; registration is one activation away at the gate and one link away on the login page (21.7); and a second account control in the navigation would compete with the planner for the first interaction. The navigation's Sign in keeps its 001 appearance and gains only the states in 21.2.3.

### 21.3 Waiting states

One waiting screen serves W1 and W2. It replaces the whole route, including the application layout, so nothing protected and no identity is on screen.

| Property | Value |
|---|---|
| Surface | Full viewport (`min-height: 100dvh`), `paper`, no media, no card |
| Content | Centred on both axes: the wordmark "Outdoor Trip Companion" (`ink`, 16/24 weight 700, letter-spacing 0.01em), then 24px, then the waiting line |
| Waiting line | 16px `LoaderCircle` (`ink`, one turn per 900ms linear) + 8px + text, `ink`, 14/20 weight 500 (16.04:1) |
| Timing | Wordmark from the first paint. The waiting line appears after 400ms (opacity 0 → 1 over `--duration-fast`), so a fast check never flashes a spinner. The state ends within 10 seconds (section 5) |
| Announcement | The line is inserted into a `role="status"` region when it becomes visible, once. Focus is not moved |
| Reduced motion | The spinner does not rotate and the line appears without a fade |

| Id | State | Text | Ends in |
|---|---|---|---|
| W1 | `initializing` on a protected route | "Loading…" | The route, or `/` with G3 |
| W2 | `callback-processing`, any route | "Signing you in…" | The return destination, or `/` with F1 or F2 |
| W3 | `signing-out` | "Signing you out…" | Keycloak, then `/` with O1; or `/` with O2 |

W3 is not a full screen (section 5: the control shows that it is working). The application layout stays; the Sign out control enters its Working state (21.4.2); the layout's `main` becomes `inert` with `aria-busy="true"` and opacity 0.4 (`--duration-fast`; no transition under reduced motion); a visually hidden `role="status"` region announces W3 once. The design applies the same 10-second ceiling to W3: if the application is still on screen then, section 9's unreachable rule applies and the visitor lands on `/` with O2.

### 21.4 Authenticated destination: three additions

Nothing else on the placeholder pages or in the application layout changes. The layout keeps its neutral shadcn styling (V2 §29).

#### 21.4.1 Identity (layout header)

| Property | Value |
|---|---|
| Content | The display name; if it is absent or blank, the email (section 8). Rendered as a text node |
| Semantics | A `span` preceded by visually hidden text "Signed in as ". Not interactive, not a link, no avatar or icon |
| Type and color | 14/20 weight 400, the layout's existing muted foreground; one line, `text-overflow: ellipsis`, the full value in the DOM |
| Placement, from 640px | One header row: wordmark · flexible space · navigation (Home, Gear) · 24px · identity (max-width 240px) · 12px · Sign out |
| Placement, below 640px | The header wraps to two rows, 8px apart. Row 1: wordmark. Row 2: navigation at the start; identity (flexible, `min-width: 0`, end-aligned) and Sign out at the end, 12px between them. At 320px the identity has about 76px and truncates |

#### 21.4.2 Sign out (layout header)

The existing shadcn `Button`, `variant="outline"`, with label "Sign out". 36px tall with a fine pointer from 768px; 44px tall below 768px and on any coarse pointer. `flex: none`, so it never wraps or truncates. Present on `/home`, `/gear`, and `/trails/:trailId`.

| State | Appearance |
|---|---|
| Default, hover, active | The existing outline variant |
| Focus-visible | V2 §18 focus ring in place of the primitive's default ring |
| Working (`signing-out`) | Label becomes "Signing you out…" with a 16px `LoaderCircle` before it (static under reduced motion); `aria-disabled="true"`; activations ignored; cursor `progress`. The control may grow toward the start; the wordmark does not move |

No confirmation dialog: sign-out is immediate (section 9).

#### 21.4.3 The saved request (`/home`)

| Property | Value |
|---|---|
| Rendered when | A pending prompt exists and passes the existing prompt check. Otherwise nothing is rendered: no empty state, no placeholder |
| Placement | The last element of the existing `/home` section, 32px below the content above it |
| Structure | A `section` labelled by its heading: an `h2` "Your trip request", the request, a note |
| Heading | 14/20 weight 600, the layout's foreground color |
| Request | A `p` holding the exact trimmed prompt as a text node. 18/28 weight 400, foreground color, max-width 640px, `overflow-wrap: anywhere`, never truncated (2,000 characters wrap). 8px below the heading. A 2px `conifer` rule on its start edge with 16px of padding marks it as the visitor's own words; no card, fill, or quotation marks |
| Note | "Saved from before you signed in. Trip planning isn't available on this page yet." 14/20, muted foreground, 12px below the request |
| Behavior | Read-only text. No button, link, edit control, loading indicator, or result. It is identical after a reload (D6) |

### 21.5 Keycloak theme: page shell and composition

Specified as outcomes. The `frontend` agent maps them onto the parent theme's markup and reports anything that cannot be reached with styles, properties, static resources, and message overrides (21.10).

#### 21.5.1 Shell rules, every page of the login theme type

| Rule | Value |
|---|---|
| Font | The V2 §7.1 system stack for every element, form controls included. The parent's bundled typeface is not applied |
| Colors | Only the values in 21.6; `color-scheme: light` only. Under a dark system setting every computed color is identical, including field fills, autofilled fields, and scrollbars |
| Media | No video, image, illustration, pattern, gradient wash, blur, or shadow. No Keycloak logo anywhere, the browser-tab icon included (21.10) |
| Resources | Everything from the Keycloak origin; icons come from the parent theme or are embedded in the stylesheet |
| Motion | `color`, `background-color`, `border-color`, and `box-shadow` transitions at `--duration-fast` (150ms) with `--ease-ui`; no entrance animation; no transition at all under `prefers-reduced-motion: reduce` |
| Page height | `min-height: 100dvh` (`100vh` fallback); vertical scroll only; no horizontal scroll from 320px or at 200% zoom |
| Not shown | Language switcher, "Remember me", social providers, realm id |
| Other pages | Any page not listed in 21.7 uses this shell and the controls of 21.6 with Keycloak's own content |

#### 21.5.2 Two regions, from 1024px

```text
0                      41.67%                                                    100%
┌───────────────────────┬─────────────────────────────────────────────────────────┐
│ Outdoor Trip Companion│                                                         │
│                       │                 Sign in                                 │
│        ink            │                 Username or email                       │
│                       │                 [                          ]     paper  │
│                       │                 Password                                │
│ From “Where should I  │                 [                      (eye)]           │
│ go?” to “I’m ready to │                 [         Sign in          ]            │
│ hike.”                │                 New here? Create account                │
└───────────────────────┴─────────────────────────────────────────────────────────┘
```

| Property | ≥1440px | 1024–1439px |
|---|---|---|
| Region widths | Identity 5 parts, form 7 parts: 41.67% and 58.33% of the viewport (each ≥ 30%) | Same |
| Identity region | `ink`, full viewport height, pinned to the viewport while the form region scrolls | Same |
| Wordmark | "Outdoor Trip Companion", `snow`, 16/24 weight 700, letter-spacing 0.01em, one line; 80px from the left edge, vertically centred in a 44px box that starts 32px from the top (the landing navigation's position) | 64px from the left; 24px from the top; 16px from the top when the viewport is at most 839px tall |
| Product line | "From “Where should I go?” to “I’m ready to hike.”" (PRD §60), `snow`, 40/48 weight 600, letter-spacing −0.02em, max-width 440px, `text-wrap: balance`; start-aligned 80px from the left, its last line 80px above the bottom | 32/40; 64px from the left and from the bottom; max-width the region's width minus 128px |
| Form region | `paper`. The form column is centred horizontally and vertically (safe centring: content taller than the region starts at the top and scrolls). Vertical padding at least 48px | Same |
| Form column | 400px (inside the required 360–440px) | 400px |

The identity region holds nothing else: no link, no image, no rule.

#### 21.5.3 One column, below 1024px

| Property | 768–1023px | Below 768px |
|---|---|---|
| Brand band | `ink`, full width, 76px tall; wordmark as above, 48px from the left, vertically centred | 56px tall; wordmark 16px from the left |
| Product line | Not shown | Not shown |
| Form region | `paper`, the rest of the page | Same |
| Form column | `min(100% − 96px, 440px)`, centred; 64px below the band; 48px bottom padding | `100% − 32px` (gutters 16px), capped at 440px; 40px below the band; 40px bottom padding plus the safe-area inset |

#### 21.5.4 Expected geometry at the seven viewports (AC-10)

Login content is about 392px tall from 1024px (456px with a page message) and about 420px below it, where the links take 44px rows.

| Viewport | Identity / brand | Form region | Form column (x) | Login | Registration |
|---|---|---|---|---|---|
| 1920×1080 | x 0–800 | x 800–1920 | 1160–1560 (400px) | y 344–736, no scroll | Fits (about 870px with padding) |
| 1440×900 | x 0–600 | x 600–1440 | 820–1220 (400px) | y 254–646, no scroll | Fits, or scrolls a few px when a password hint is shown |
| 1366×768 | x 0–569 | x 569–1366 | 768–1168 (400px) | y 188–580, no scroll | Scrolls vertically; identity region stays pinned |
| 1280×800 | x 0–533 | x 533–1280 | 707–1107 (400px) | y 204–596, no scroll | Scrolls vertically |
| 768×1024 | Band y 0–76 | Below the band | 164–604 (440px) | Starts y 140, no scroll | Fits or scrolls |
| 390×844 | Band y 0–56 | Below the band | 16–374 (358px) | Starts y 96, no scroll | Scrolls |
| 320×568 | Band y 0–56 | Below the band | 16–304 (288px) | Starts y 96; may scroll a few px | Scrolls |

With the on-screen keyboard open, the page stays scrollable and the focused field and the primary action can both be brought into view; nothing is fixed to the viewport below 1024px.

#### 21.5.5 If the two-region layout cannot be reached with styles alone

The design assumes the parent renders the brand header and the form area as two sibling blocks inside one page container, so the container can become a two-column grid. If that is not so, the nearest composition, in order: (1) the page background painted as two flat color regions with a hard edge at 41.67% and the brand header positioned over the `ink` side; (2) the same without the product line; (3) only then a template override, requested from the Lead (section 11).

### 21.6 Keycloak theme: controls and states

#### 21.6.1 Type and spacing in the form column

| Element | Value |
|---|---|
| Page heading (`h1`) | `ink`, weight 600, letter-spacing −0.01em; 32/40 from 1024px, 28/36 below |
| Heading → first block | 32px from 1024px; 24px below |
| Field label | `ink`, 14/20 weight 600, 6px above its field |
| Field group → field group | 20px on login; 16px on registration |
| Body text, links | 16/24; body weight 400 `ink` |
| Help text | `stone`, 14/20 weight 400, 6px below its field (5.92:1) |
| Last field → primary action | 24px (after the Forgot password row when it is shown) |
| Primary action → secondary line | 24px |
| Smallest text anywhere | 14px |

#### 21.6.2 Text field

48px tall at every width, radius 12px, horizontal padding 14px, text 16/24 `ink`, no placeholder text, full column width.

| State | Fill | Boundary | Other |
|---|---|---|---|
| Default | `snow` | 1px `stone` (5.92:1 on `paper`, 6.45:1 on `snow`) | Cursor `text` |
| Hover | `snow` | 1px `ink` | |
| Focus-visible | `snow` | 1px `ink`, plus the V2 §18 focus ring and the transparent outline | Applies on pointer focus too: a text field always shows where typing goes |
| Invalid | `snow` | 2px `ember` drawn inward so the field's size does not change (4.43:1 on `paper`, 4.83:1 on `snow`) | `aria-invalid`; error text below (21.6.4) |
| Invalid + focus | `snow` | 2px `ember`, plus the focus ring | |
| Disabled or read-only | `paper` | 1px `stone` | Text `stone`; cursor `not-allowed` |
| Autofilled | `snow`, forced | As the current state | Text `ink`; the browser's autofill tint is not shown |

Any checkbox or radio the shell meets on other pages: 20px, `conifer` when checked, 44px hit area with its label.

#### 21.6.3 Buttons, links, and the show/hide control

| Control | Geometry | Default | Hover | Active | Focus-visible | Disabled |
|---|---|---|---|---|---|---|
| Primary action (one per page) | Full column width, 48px tall, radius 12px, 16/24 weight 600 | `conifer` `#1F5A46` fill, `snow` text (8.05:1) | `conifer-deep` | `conifer-press` | V2 §18 ring + transparent outline | `stone` fill, `snow` text (6.45:1), cursor `not-allowed` |
| Text link (secondary actions) | Inline; hit box at least 44px tall below 1024px and on coarse pointers, 24px otherwise | `conifer` (7.38:1 on `paper`), weight 600, underline 1px at a 3px offset, always shown | `conifer-deep`, underline 2px | `conifer-press` | Ring on a box padded 4px with a 6px radius | n/a |
| Show/hide password | A button inside the field's end: 44×44px hit area, inset 2px, radius 10px, 20px icon | Icon `stone`, no fill | Icon `ink` | Icon `ink`, fill `paper` | Ring | n/a |

The show/hide control's accessible name is "Show password" when the password is hidden and "Hide password" when it is visible. The field's text never runs under it (end padding 52px). Adjacent targets are at least 8px apart at every width. Cursor `pointer` on buttons and links.

#### 21.6.4 Errors and page messages

| Kind | Presentation |
|---|---|
| Field error | Directly below its field, 6px gap: a 16px alert icon in `ember`, 8px, then text `#A8361F`, 14/20 weight 500. The field takes its Invalid state. Text and field are programmatically associated |
| Page message, error | A block between the heading and the first field, 24px below it: a 3px `ember` rule on the start edge, 12px 16px padding, no fill, no radius; a 20px alert icon in `ember`, 12px, then text `#A8361F`, 14/20 weight 500. Exposed as an alert |
| Page message, information or success | Same block; rule and icon `conifer`; text `ink` |
| Page message, warning | Same block; rule, icon, and text `ink` |

Three cues carry every error: the words, the icon, and the outline or rule. Color is a fourth, never the only one. After a failed submit, focus is on the first invalid field (section 13).

**Contrast, computed with the WCAG 2.x formula.** QA measures the rendered pages (AC-31).

| Foreground | Background | Ratio | Bar |
|---|---|---:|---:|
| Error text `#A8361F` | `paper` `#F7F5EF` (where it is rendered) | 6.00 | 4.5 |
| Error text `#A8361F` | `snow` `#FFFFFF` (not used; for reference) | 6.54 | 4.5 |
| `ink` `#0B1C20` | `paper` | 16.04 | 4.5 |
| `ink` | `snow` (text in fields) | 17.48 | 4.5 |
| `stone` `#55615D` | `paper` (help text, field boundary) | 5.92 | 4.5 / 3 |
| `conifer` `#1F5A46` | `paper` (links, primary action boundary) | 7.38 | 4.5 / 3 |
| `snow` | `conifer` (primary action label) | 8.05 | 4.5 |
| `snow` | `ink` (wordmark, product line) | 17.48 | 4.5 |
| `ember` `#C8452D` | `paper` / `snow` (invalid outline, icons) | 4.43 / 4.83 | 3 |

`#A8361F` is chosen over `ink` because on these pages `ink` is already the color of labels, values, and body text: an error in `ink` would differ from a label only by its icon. The darker red keeps the conventional signal and clears 4.5:1 with margin. Its relative luminance is 0.1106 and `paper`'s is 0.9131: (0.9131 + 0.05) / (0.1106 + 0.05) = 6.00.

### 21.7 Keycloak pages: content and final copy

Field sets come from the realm (sections 10, 15). "Keycloak default" means the parent's English message is kept. No string contains the realm id, "Keycloak", "realm", "client", or a code.

**Every page.** Wordmark "Outdoor Trip Companion". Document title "{page heading} · Outdoor Trip Companion"; if the parent uses one title for all pages, the title is "Outdoor Trip Companion" on every page.

| Page | Element | Final copy |
|---|---|---|
| Login | Heading | "Sign in" |
| | Labels | "Username or email", "Password" |
| | Show/hide | "Show password" / "Hide password" |
| | Forgot password link (only under section 10's rule) | "Forgot password?", end-aligned in a row 8px below the password field |
| | Primary action | "Sign in" |
| | Secondary line | "New here? " followed by the link "Create account" |
| | Wrong credentials | "Incorrect username or password. Check both and try again." Shown once, wherever the parent places it (field error or page message) |
| Registration | Heading | "Create your account" |
| | Required note, directly under the heading | "Fields marked * are required." Each label carries the asterisk |
| | Labels, in the realm's order | "Username", "Email", "First name", "Last name", "Password", "Confirm password" |
| | Password rules (only if K14 finds a policy) | Help text under Password stating the policy in one sentence, for example "At least 8 characters." |
| | Primary action | "Create account" |
| | Secondary line | The link "Back to sign in", with no arrow glyph |
| | Username taken | "This username is already taken." (field error on Username) |
| | Email registered | "This email is already registered." (field error on Email) |
| | Passwords differ | "The two passwords don't match." (field error on Confirm password) |
| | Empty required field, invalid email, policy violation | Keycloak default, as a field error |
| Error | Heading | "We couldn't sign you in" |
| | Body | Keycloak's message when it is non-technical; otherwise "Sign-in couldn't be completed. Go back and try again." |
| | Action | The link "Back to Outdoor Trip Companion" |
| Page expired | Heading | "This page has expired" |
| | Body | "Your sign-in attempt timed out." |
| | Action, one only | The link "Start again" (restarts the attempt; the parent's second "continue" option is not shown) |
| Logout confirmation (if reachable) | Heading | "Sign out?" |
| | Body | "You'll be signed out of Outdoor Trip Companion in this browser." |
| | Primary action / link | "Sign out" / "Back to Outdoor Trip Companion" |
| Forgot password (only under section 10's rule) | Heading / body / primary action / link | "Reset your password" / "Enter your username or email and we'll send you a link to choose a new password." / "Send reset link" / "Back to sign in" |

**Per-page checks.** Login and registration: the first field has focus on load; `autocomplete` values as in section 13; exactly one primary action; the registration link on login is visible without scrolling at the four desktop viewports (it ends at about y 736 of 1080 and y 580 of 768). Error, page-expired, and logout-confirmation pages have no fields; their heading, body (16/24 `ink`, 16px below the heading), and action (24px below the body) sit in the same form column at the same position as on login.

### 21.8 Acceptance-criteria map

| Criterion | Design |
|---|---|
| AC-01 | 21.2.3 (navigation Sign in, Working state). The application renders no credential field anywhere in 21.2–21.4. |
| AC-02 | 21.4.1, 21.4.2 (identity and Sign out visible on `/home`); 21.3 W2. |
| AC-03 | No design surface. |
| AC-04 | 21.2.1 (Create account at the gate); 21.7 (login's "Create account" link). |
| AC-05 | 21.7 (the six labels, unchanged order); 21.6.2. |
| AC-06 | 21.6.4 (field errors and page messages); 21.7 (error copy). |
| AC-07 | 21.5.1 (font, colors, one appearance); 21.5.2–21.5.3 (wordmark); 21.6.3 (`conifer` primary action, `snow` text); 21.7 (titles). |
| AC-08 | 21.5.1 ("Other pages" rule); 21.7 (error, page-expired, logout-confirmation, conditional forgot password). |
| AC-09 | 21.5.1 (media, resources); 21.5.5 (fallback order before any template override). |
| AC-10 | 21.5.2–21.5.4 (regions, 400px column, geometry at the seven viewports); 21.6.1–21.6.3 (16px inputs, 14px minimum, 44px targets). |
| AC-11 | 21.2.2 (F1, F2 with both actions); 21.2.6. |
| AC-12 | 21.3 (W1 replaces the whole route). |
| AC-13 | No design surface (renewal is silent). |
| AC-14 | 21.2.2 (X1); 21.2.5 (focus on arrival). |
| AC-15 | 21.2.6 (`initializing` shows the landing with no indicator); 21.2.2 (F3); 21.3 (10-second ceiling). |
| AC-16 | 21.4.2 (Sign out on every protected route); 21.3 (W3); 21.2.2 (O1). |
| AC-17 | 21.2.2 (G3 after sign-out). Storage: no design surface. |
| AC-18 | 21.3 (W1); 21.2.2 (G3). |
| AC-19 | 21.2.2 (the G3 gate's two actions). Destination logic: no design surface. |
| AC-20 | No design surface. |
| AC-21 | 21.2.3 (Working ends when the page is shown again after Back). Otherwise no design surface. |
| AC-22 | 21.2.1–21.2.2 (G1, G2, two actions). |
| AC-23 | 21.4.3. |
| AC-24 | No design surface. |
| AC-25 | No design surface (21.2–21.4 add no credential input). |
| AC-26 | No design surface. |
| AC-27 | 21.2.2 (notice copy, O2); 21.3 (W1–W3); 21.4 (identity, note). |
| AC-28 | No design surface (the design adds no canvas, media, or API-backed element). |
| AC-29 | 21.2.5 (tab order, no trap); 21.2.3, 21.4.2, 21.6.2–21.6.3 (focus ring). |
| AC-30 | 21.6.1–21.6.4 (labels, show/hide name, error association and cues); 21.7 (per-page checks). |
| AC-31 | 21.6.4 (contrast table). |
| AC-32 | 21.2.5 (live region); 21.2.3, 21.2.5, 21.3, 21.5.1 (reduced motion); 21.2.4 (001 AC-07 and AC-28 with the gate shown). |
| AC-33 | No design surface. |
| AC-34 | 21.2 "What does not change". Otherwise no design surface. |
| AC-35 | No design surface. |
| AC-36 | No design surface. |
| AC-37 | No design surface; 21.10 item 6 suggests one checklist addition. |

### 21.9 Proposed design-system additions (for Lead approval; not applied)

Nothing here has been written to `docs/DESIGN_SYSTEM.md`. Until approved, each is a feature-level value of this section.

| # | Proposal | Reason |
|---|---|---|
| P1 | A color token for error text on light surfaces, `#A8361F` (suggested name `ember-deep`), with the rule "`ember` for outlines and icons, `ember-deep` for error text on `paper` or `snow`". | The Gear forms will need error text on a light surface and will meet the same 4.43:1 problem. |
| P2 | A "light-surface form controls" section: text field (48px, radius 12px, `snow` fill, `stone` boundary and the states of 21.6.2), full-width primary button (21.6.3), text link, field error, page message. | Section 11 already expects reuse by the Gear inventory forms. Defer if the Lead prefers to wait for that feature. |
| P3 | Extend `paper`'s role from "planner surface" to "light page surface" and record the pairs `conifer` on `paper` 7.38 and `stone` on `snow` 6.45 in V2 §9. | Both are used here and are not in the approved contrast table. |

### 21.10 Reported to Lead

No contradiction was found between sections 1–20 and the design system. The items below are interpretations, gaps, and things that cannot be confirmed without the rendered Keycloak pages.

1. **Mobile gate moves the block above it (Q4, below 768px).** With 44px targets the gate cannot fit in the 60px allowance. The design leaves R alone and uses 001's growth rule: at 390×844 the field shifts up 16, 36, or 56px once, when the gate appears; nothing scrolls. The alternative is to raise the mobile reserve from 188px to 224px, which removes the shift for G1 but takes 36px from the scene window in the default state and changes 001's mobile positions. Not done without approval.
2. **New notice O2.** Section 9 asks for "F3's wording adapted" but assigns no id or text. O2 and its text (21.2.2) are proposed here and need approval.
3. **"Under the product name" (section 10).** From 1024px the wordmark is in the identity region beside the form, not above the heading. It precedes the heading in reading order, and sits above it below 1024px. Read as satisfying section 10; confirm.
4. **Identity fallback.** Section 8 defines display name, then email. If both are absent the design shows no identity text and Sign out alone. Whether `preferred_username` should be a third fallback is a Lead decision.
5. **Return destination after the G3 gate is dismissed.** Typing dismisses any notice (001's rule). Section 7 speaks of sign-in "started from that gate"; it does not say whether the destination survives when the visitor then signs in from a later G1 gate or from the navigation. The design is the same either way.
6. **Way back on the error page.** Keycloak is understood to show a back-to-application link only when the client has a home or base URL configured. That setting is not among K1–K20; suggest adding it to the section 15 checklist.
7. **Browser-tab icon.** The parent theme's icon is Keycloak's logo, which AC-07 excludes from the page. The theme must ship a replacement. No product icon exists and none is invented here; the proposal is to reuse whatever icon the web application serves. Needs a decision if that is still the Vite default.
8. **Not verifiable without the parent theme's markup** (each is specified as an outcome; the `frontend` agent confirms or reports): the header and form area being siblings (21.5.5); whether the product line can be added as real text through a message override, or only as generated content; whether the document title can differ per page; whether a slot exists for the required-fields note and for a password-rules hint without a template override; whether the page-expired page's second option can be hidden with styles; how the dark variant is switched off; whether the registration page focuses its first field on load; where the parent places the wrong-credentials message.
9. **F3 and the W3 ceiling.** How the application learns that Keycloak is unreachable before a top-level navigation is an implementation matter the design depends on. The 10-second ceiling on W3 is a design addition; section 5 bounds only `initializing` and `callback-processing`.
10. **Message-slot structure.** The gate's actions must sit outside the element the input's `aria-describedby` names (21.2.5), which is a small structural change inside 001's `PlannerMessage`. 001 §11.11 anticipated "one inline text action"; section 6 of this specification requires two, and the design follows section 6.
11. **`/home` placeholder button.** The existing "Frontend ready" button sits directly above the saved request and could be read as acting on it. The request is placed after it, 32px away; removing the button is outside this feature and is suggested for FEATURE-003.
12. **Optional, not included.** A static, locally served, low-contrast contour-line drawing in the identity region would add outdoor character while staying still. Section 11 allows a proposal; the baseline above ships without it.
