# FEATURE-002 — Authentication + Keycloak

| | |
|---|---|
| Status | Scope approved by the user on 2026-10-11. Acceptance criteria consolidated to 37 and ownership questions resolved the same day. Section 21 (design) is not written yet. Implementation has not started. |
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

Not in this feature: the 3D Home, the planner input on `/home`, recommendations, any restyling of the placeholder pages beyond what these three additions need, and any redesign of the application layout. `ui-ux` specifies the three additions only and does not design FEATURE-003.

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
| K14 | Password policy | As configured; not changed by this feature | Not observed | Record it; the registration page states it |
| K15 | Login with email, Remember me, internationalization | As configured; the pages show no Remember me and no language switcher | "Username or email" label; no Remember me; no language switcher | Verify |
| K16 | Realm display name | The product name appears in page titles, never the realm id | Page title reads "Sign in to outdoor-trip" | Set a display name, or override the message in the theme |
| K17 | Login theme | The custom theme of section 11 is selected for the realm | `keycloak.v2` | The user selects it after the theme is loaded |
| K18 | Token and session lifetimes | As configured | Not observed | Record (V4) |
| K19 | Claims | Access tokens carry `sub`, `email`, and `name` or `preferred_username`, which `user-service` needs to create a profile | Not observed | Verify with a self-registered user (AC-33) |
| K20 | Social providers, MFA | None added. MFA only if the realm already requires it. | No provider buttons on the login page. MFA: not observed. | Verify |

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
| `Project/docker/keycloak/themes/outdoor-trip-companion/login/**` (new) | The Keycloak login theme only: `theme.properties`, stylesheets, static images, and message overrides. Template files only as section 11 allows. |
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

### Open questions

None of these blocks the cycle from starting; each has a working assumption.

| # | Question | Working assumption | Who decides |
|---|---|---|---|
| Q1 | "Registration not allowed" was not reproduced on 2026-10-11: the registration page loads. Was it seen on a path this probe did not take, or has the setting already been changed? | Treated as a configuration requirement regardless (K9, AC-04). | User, to confirm where it was seen |
| Q2 | Does the landing navigation gain a "Create account" entry next to Sign in? | No. Registration is reached from the gate and from the login page. `ui-ux` may propose otherwise. | Lead, on `ui-ux`'s proposal |
| Q3 | The redirect URIs appear to use a wildcard path on `localhost:5173`. Narrow them to the exact addresses the application uses? | Decided in the security review once V6 is known; the user applies the change. | Lead, with the security review |
| Q4 | The gate (message plus two actions) is taller than the three-line message FEATURE-001's layout reserves on desktop. How does it fit without moving the field? | A design task for section 21; FEATURE-001's AC-07 must still hold (AC-32). | `ui-ux` |

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

Owned by `ui-ux`. Not written yet.

When the cycle starts, `ui-ux` adds here, within sections 1–20:

- the gate and notices on the Public Landing (section 6): layout inside the existing message slot, the two actions, states, focus behavior, and how AC-32 is met;
- the waiting states (section 5);
- the three additions to the authenticated destination (section 8);
- the Keycloak theme (sections 10–13): composition per viewport, sizes, spacing, radii, control states, error presentation, and final copy, including the error text color chosen under section 11 with its measured contrast;
- a mapping from each acceptance criterion in section 17 to the part of the design that satisfies it;
- any proposed design-system addition (section 11), for Lead approval.
