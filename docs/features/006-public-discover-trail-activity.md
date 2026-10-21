# FEATURE-006 — Public Discover & Trail Activity

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (revision 2, 2026-10-15).** Lean QA PASS after one repair (Targeted QA PASS); product gate accepted by the user; B1/B2 live smoke check PASS; PRD amended (section 3.3). The record is `.claude/state/features/006-public-discover-trail-activity.md`. History: approved for implementation 2026-10-15. Revision 2 is a user-approved change of interaction model: the cinematic Hero returns as the first section of `/`, Discover becomes the second section, and trail detail for signed-out visitors is a map-anchored popup (section 3.1). Product decisions D1–D16 are final (section 18.1). B1 and B2 are implemented (section 6). The interrupted first implementation is partly obsolete; section 5.5 lists what is kept and what is reworked |
| Date | 2026-10-14; revision 2 2026-10-15 |
| Routes | `/` (signed-out public homepage: Hero, then Discover). `/trails/:trailId` stays the authenticated FEATURE-004 page |
| Depends on | FEATURE-001 (hero media, reused), FEATURE-002 (Authentication), FEATURE-004 (authenticated Trail Detail, unchanged), `GET /api/trails`, `GET /api/trails/activity` (B1, B2) |
| Followed by | FEATURE-007 (Gear Inventory), FEATURE-008 (Memories & Sharing) |
| Feature cycle | `3D pipeline: SKIP`, `Blender production: NOT REQUIRED`. Targeted frontend cycle: Recover → Scope → `frontend` (audit-first rework, section 5.5) → lead diff review → `qa` → targeted repair → PASS. `backend-api` only if QA finds a real contract failure (section 18.6) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (narrow follow-up required, section 3.3) → `docs/FRONTEND_CONTEXT.md` → `docs/DESIGN_SYSTEM.md` → FEATURE-001 (hero media and its accessibility rules) → FEATURE-002 → FEATURE-004 |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–4, 18 |
| `frontend` | 5.5, 7–17 |
| `ui-ux` / design review | 7.4, 8, 10, 11, 12, 16 |
| `qa` | 17, with the sections each criterion names |
| `backend-api` | 6 (implemented; only on a QA contract failure) |

Notation. "001 §x" is section x of `docs/features/001-public-landing.md`; "002 §x", "004 §x" likewise; "DS §x" is `docs/DESIGN_SYSTEM.md`; "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; a bare "§x" is this document. Copy ids defined in section 16.17 are written `HR…` (Hero), `DV…` (Discover), `TP…` (Trail popup), and `TA…` (Trail Activity). Ids of earlier features keep their prefixes (SH, TD, G, F, X, O).

Authorship. Section 16 was designed by `ui-ux` (first version 2026-10-14; narrow revision for revision 2 on 2026-10-15). The lead wrote and reconciled the rest.

---

## 1. Feature Summary

FEATURE-006 changes the signed-out homepage at `/` into a **two-stage page**: brand first, discovery second.

1. **Hero.** A full-screen cinematic section that reuses the FEATURE-001 three-scene video (Sunny Alpine Lake, Rainy Pacific Northwest Forest, Cold Mountain Ridge) with a slogan, one line of supporting copy, and an **Explore trails** control that scrolls to Discover. There is no planner input.
2. **Discover.** A second full-screen section: a compact, synchronized trail list on the left and a MapLibre map of real trails on the right, with **Daily Trail Activity** per trail. Selecting a trail, from the list or from its marker, opens a **map-anchored Trail Detail popup** beside the marker. The popup's main action is **Sign in to plan this trip**.

A fixed public header (brand, Discover, Sign in) stays visible over both sections. After a trail-specific sign-in the visitor lands on the authenticated FEATURE-004 Trail Detail for that trail and continues into Trip Preparation. Signed-in users never see this page: `/` sends them to `/home`.

## 2. Goals and Success State

The visitor's sentence: *"I feel what this product is about, I can see interesting trails around me, understand basic trail information, and see how much planning surrounds them today."*

FEATURE-006 is complete when an unauthenticated visitor can:

1. open the site and meet the cinematic Hero and the product promise first;
2. move to Discover by scrolling, by Explore trails, or by the header's Discover item;
3. browse real trails on the map or in the equivalent list;
4. see an honest aggregate activity figure for today, clearly distinguished from "unavailable";
5. select a trail from the list or from its marker and read its detail in a popup beside the marker;
6. choose **Sign in to plan this trip** and land, signed in, on that trail's authenticated Trail Detail, then Choose this trail and reach Trip Preparation.

The authenticated planning, preparation, and gear flows remain intact, and the authenticated Trail Detail behaves as FEATURE-004 defines it.

## 3. Product Direction and Source-of-Truth Status

### 3.1 Direction

**2026-10-14 (user decision).** The product prepares people for real trips and is not a hiking simulation. The journey is Discover → Plan → Prepare → Go in real life → Remember. FEATURE-006 owns Discover. There is no public planner composer; AI planning is authenticated (`/home`). The FEATURE-005 Gear Studio is the only real-time 3D experience.

**2026-10-15 (user decision, revision 2).** The map does not replace the Hero. The signed-out homepage is two-stage: the cinematic Hero first, Discover second. Trail detail for signed-out visitors is a map-anchored popup reached from the list or the marker; the public "View trail" navigation and the public full Trail Detail page are dropped. The emotional hierarchy is:

1. outdoor atmosphere;
2. product promise;
3. discover trails;
4. inspect one trail;
5. sign in when intent becomes personal.

The page must feel brand first, discovery second: not a map dashboard first, and not an AI chatbot first.

### 3.2 PRD reconciliation of 2026-10-14

On 2026-10-14 the PRD was rewritten for the final product direction (Discover → … → Remember, no Start Adventure or 3D Explore, Daily Trail Activity semantics, roadmap to FEATURE-008 and freeze). Those parts remain valid for revision 2.

### 3.3 PRD follow-up (narrow) — APPLIED 2026-10-15 at closeout

**Applied at closeout on 2026-10-15** (PRD decision record §1.1, row 2026-10-15). The table below is kept as the record of what changed. When this revision was written, the PRD conflicted with it in these places. The lead updates them, with the user's approval, before or alongside the targeted implementation. This does not block the specification.

| PRD section | Says now | Revision 2 |
|---|---|---|
| §1.1 (2026-10-14 row), §2, §4.7 | `/` is map-first Public Discover; the cinematic hero is retired from `/` | `/` is Hero first, then Discover |
| §7.2 | Public Discover "does not contain … a cinematic hero, or hero video"; map is the dominant visual on entry | The Hero section reuses the hero video; Discover is the second section |
| §7.3 | Trail Preview with **View trail**, browse-only, no sign-in control | Map-anchored Trail Detail popup with Sign in to plan this trip and Create account; no View trail |
| §7.5, §5, §36, §38 | Conversion from the public Trail Detail | Conversion from the popup; return to the authenticated `/trails/:trailId` |
| §7.6 | Hero retired (historical) | Hero media active on `/` (planner input still retired) |
| §11.3, §34 | One Trail Detail with a public read-only variant | Authenticated Trail Detail only; signed-out detail is the map popup. FEATURE-008's Community Memories would later appear in the popup rather than on a public Trail Detail |
| §40 table, §40.1, §44, §45.1 | Public Discover has no CG/video; "loads no hero video" | Hero CG/video on `/`; map runtime loaded lazily so that it does not compete with the hero media (§14) |
| §57 Visual Architecture Guard | Must not "reintroduce the cinematic hero … at `/`" | The Hero is reintroduced without the planner prompt; the guard should forbid only the public planner prompt |

## 4. Scope

### 4.1 In scope

- A fixed public header across the homepage: brand, Discover (in-page), Sign in.
- The Hero: FEATURE-001 media reused (rotation, posters, reduced-motion poster, Pause / Play, loading and fallback), slogan, support copy, Explore trails control, and the FEATURE-002 notices and gate the homepage hosts.
- The Discover section: heading, compact synchronized trail list, MapLibre map with markers, one shared `selectedTrailId`, the map-anchored Trail Detail popup, Daily Trail Activity.
- Public trail API consumption without a token (B1, B2).
- Trail-specific authentication conversion from the popup, returning to the authenticated `/trails/:trailId`.
- Lazy map loading and a page-scroll model; accessibility; desktop layout at the acceptance viewports.

### 4.2 Non-goals

FEATURE-006 does not include: a public AI planner, planner input, conversation box, suggestion prompts, or pending public planning prompt; a public full Trail Detail page; a public "View trail" navigation; filters; geolocation or "Use my location"; GPS, presence, WebSockets, polling; Memories (no placeholder); Gear, Gear Studio, avatar, or loadout changes; Blender or 3D; new hero media; changes to the authenticated planner, the authenticated Trail Detail, Trip Preparation, or the Studio; a mobile-first redesign (below 768px is best effort).

## 5. Current State

### 5.1 Frontend before FEATURE-006 (inspected 2026-10-14)

- No map library existed. 3D dependencies exist only for the Studio avatar.
- `/` rendered the FEATURE-001 Public Landing (`LandingHero` with `HeroMedia`, `SceneControl`, `SceneRotationProvider`, `LandingNav`, `HeroIntro`, `PlannerPrompt`, suggestions) inside `PublicLandingRoute` (authenticated and signing-out → `/home`; `callback-processing` → waiting screen). The landing's message slot hosted the FEATURE-002 notices and gate.
- `/trails/:trailId` and the preparation and Studio routes were children of `ProtectedRoute`; a signed-out visitor on them is sent to `/` with notice G3 and the path saved as the return destination (`returnDestination.ts`, which already accepts `/trails/<segment>`).
- Trail reads used `authenticatedApiRequest()` through `tripRequest`.

### 5.2 Trail-service contract

`GET /api/trails` with no parameters returns every non-deleted trail ordered by name as `TrailSummaryResponse[]`: `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `latitude`, `longitude`, `source`, `scenery[]`, nullable `coverImageUrl`, `baselineGearRequirements[]`. **Every field the popup needs is in the list response**, so the popup makes no detail request. Data: eight `DEMO_SEED` trails around Vancouver and the Lower Mainland (latitude ~49.03–50.37, longitude ~−123.19 to −121.46), no cover images, no routes.

### 5.3 Security (after B1)

Public without a token: `GET /api/trails`, `GET /api/trails/{uuid}`, `GET /api/trails/activity`. Still authenticated: `GET /api/trails/nearby` and every other method or path. An invalid or expired bearer token is refused even on a public path, so public reads send none.

### 5.4 Activity capability

No trip or activity record exists anywhere; `activity-service` is an empty shell and is not used. Daily Trail Activity is served by B2 in `trail-service` with deterministic `SIMULATED` values (section 6.2).

### 5.5 Implementation state at revision 2 (interrupted cycle of 2026-10-14/15)

A first cycle implemented revision 1 and was interrupted before QA (checkpoint `.claude/state/features/006-public-discover-trail-activity.md`). Build and lint passed; nothing was committed. Against revision 2:

| Area | Keep | Rework or remove |
|---|---|---|
| Backend B1, B2 (`trail-service`) | Keep as implemented | — |
| `maplibre-gl` dependency, `features/discover/map/runtime/` (style, markers, camera, zoom, attribution, failure states) | Keep | Wheel behaviour on a scrolling page (§13, §16); lazy trigger (§14); popup anchoring (§16) |
| Public requests without a token (`publicRequest`, trail list, activity, detail key) and activity model | Keep | — |
| `features/trails` activity line, `PlanThisTrip`, public Trail Detail variant, `PublicReadableRoute`, `/trails/:trailId` outside `ProtectedRoute`, activity line and trail-response scenery on the authenticated Trail Detail | — | Remove: `/trails/:trailId` returns under `ProtectedRoute`, and the authenticated Trail Detail is FEATURE-004's again (§8, §10) |
| Discover screen (docked non-scrolling rail, expanding row preview, View trail, Close) | Data, selection in `?trail=`, list states, notices logic | Re-layout as the second section; rows never expand; popup replaces the preview (§16) |
| Lazy pages (`HomePage`, `TrailDetailPage`, `TripPreparationPage`, Studio) | Keep | — |
| FEATURE-001 landing modules deleted by that cycle (`LandingHero`, `LandingNav`, `HeroIntro`, `hero-media/**`, `content.ts`, …) | — | **Restore the hero media modules from git `HEAD`** (commit `fbb8f75`), read-only (for example `git show HEAD:<path>`), and reuse them; do not reimplement the media system. The planner prompt, suggestions, `PlannerMessage`, and `usePlannerPrompt` stay removed |
| `startTrailPlanning` in `authBoundary.ts` | Keep (saves `/trails/<id>`, then sign-in or registration) | Called from the popup |

## 6. Backend Contracts (B1, B2 — implemented)

Both were implemented in `trail-service` by `backend-api` during the interrupted cycle (2026-10-14) and pass their unit and slice tests. **Status of each: IMPLEMENTED; live smoke check PASS (2026-10-15, trail-service restarted from current source).** They are not reimplemented in the FEATURE-006 cycle unless QA finds a real contract failure. The frontend may rely on them without a bearer token.

### 6.1 B1 — Public trail reads

| | |
|---|---|
| Status | **Implemented; live PASS 2026-10-15** (list 200, UUID detail 200, `/nearby` without a token 401) |
| Public (GET, no token) | `/api/trails` (with or without its filters), `/api/trails/{uuid}` (query string tolerated), `/api/trails/activity` |
| Still authenticated | `/api/trails/nearby`, a non-UUID `/api/trails/<x>`, every POST/PUT/DELETE, a direct `/error` |
| Error forward | `DispatcherType.ERROR` is permitted so that an anonymous caller receives the real status (for example `400`) instead of `401` |
| Revision 2 note | The public detail read stays: it is harmless public trail data, and the authenticated Trail Detail also reads it without a token. There is no security reason to revert it |

### 6.2 B2 — Daily Trail Activity (batch)

Status: **implemented; live PASS 2026-10-15** (`200`, `source` `SIMULATED`, eight entries; an out-of-range date returns `400`).

```
GET /api/trails/activity?date=YYYY-MM-DD        (public)

200
{
  "date": "2026-10-15",
  "source": "SIMULATED",            // "SIMULATED" | "RECORDED"
  "trails": [ { "trailId": "<uuid>", "activityCount": 7 }, ... ]
}

400  date missing, malformed, or more than one day from the server's local date
```

- One entry per non-deleted trail, ordered by name, zeros included. A trail **absent** from `trails` is "activity unknown", never zero.
- `activityCount` is a non-negative integer. No user id, name, timestamp other than `date`, location, or participant list, in any source.
- `SIMULATED`: deterministic per (trail id, date) and balanced across 0, 1–9, and 10–20 by a daily level rotation (documented in `TrailActivityService`). Nothing stored, no migration.
- `RECORDED` (future): the number of planned trips on the trail for `date`, at most one per user per trail per date. Switching sources changes no field.
- Placement (MVP architecture decision): `activity-service` is not used; activity is keyed entirely by trail and `trail-service` owns the public trail contract. This is not a decision that `activity-service` should never exist.
- A `400` has Spring Boot's default error body. The frontend treats any non-`200` as "unavailable".

## 7. Daily Trail Activity

### 7.1 Definition

Daily Trail Activity for trail *T* on date *D* is the number of trips planned on *T* for *D*: one aggregate integer per trail per local calendar day. It is never a statement about who is physically on a trail. While the source is `SIMULATED`, the number is a sample stand-in for that definition, and the UI says so.

### 7.2 States

| State | Condition | Shown |
|---|---|---|
| Count | Entry present, `activityCount ≥ 1` | TA1 / TA2 |
| Zero | Entry present, `activityCount = 0` | TA3, a confirmed zero |
| Unavailable | Request failed, timed out, unreadable, non-`200`, response `date` differs from the requested date, or this trail absent or invalid in the response | List rows and markers: nothing (no line, base marker). Popup: TA4 |
| Loading | Request in flight | No number and no zero; a neutral placeholder (section 16) |

"Unavailable" is never rendered as `0` or with TA3. The Hero, list, markers, and popup all work without activity.

### 7.3 Copy (final)

"**N trips planned for today**", "**1 trip planned for today**", "**No trips planned for today yet**". When `source` is anything other than `RECORDED` (including an unknown value), a visible "**Sample activity**" disclosure is present on every surface that shows a number: once for the list (its caption) and inline in the popup after the figure. Never used: "now", "right now", "live", "currently", "on the trail", "people here", "hikers nearby", "exploring", "busy", "crowded", "real-time", "active users".

### 7.4 Visual encoding

Markers encode activity as one of three coarse levels, base / some / many, with fixed thresholds (base: 0, unknown, or loading; some: 1–9; many: 10 or more). No count is drawn on the map; exact figures are read in the list and the popup. No people icons, heat, density shading, pulsing, or moving dots.

## 8. Routing and Access

### 8.1 Routes

| Route | Signed out (`initializing`, `unauthenticated`, `redirecting`, `callback-failed`, `session-expired`, `signed-out`) | `callback-processing` | `authenticated`, `signing-out` |
|---|---|---|---|
| `/` | **Public homepage: Hero, then Discover** | FEATURE-002 waiting screen (unchanged) | Replaced by `/home` (unchanged) |
| `/#discover` | Same page, scrolled to Discover | as above | `/home` |
| `/?trail=<uuid>` | Same page, scrolled to Discover with that trail selected and its popup open (I5) | as above | `/home` |
| `/trails/:trailId` | **Closed, as FEATURE-004 defines it:** replaced by `/` with notice G3, path kept as the return destination | waiting screen | FEATURE-004 Trail Detail, unchanged |
| `/home`, `/gear`, `/trails/:id/prepare/…`, Studio | Closed (unchanged) | waiting screen | unchanged |
| `/auth/callback`, `*` | unchanged | unchanged | unchanged |

- There is no public full Trail Detail page and no new route. `/trails/:trailId` returns under `ProtectedRoute`.
- A signed-in user never sees the public homepage. Session restore is unchanged: a reload of `/` with a live session may show the homepage briefly while `initializing`, then replaces itself with `/home`.

### 8.2 What a signed-out visitor may and may not do

May: watch the Hero; scroll to Discover; pan and zoom the map; select trails by list or marker; read the popup and activity; sign in or create an account.

May not (unchanged guards and backend checks): the conversational planner, choosing a trip date or a trail for a trip, Trip Preparation, packing, the Gear Studio, gear management, a full Trail Detail page, and anything of FEATURE-008.

## 9. Data, Requests, and State

### 9.1 Requests

| Request | Auth | When |
|---|---|---|
| `GET /api/trails` | none | When the homepage mounts (small JSON; it does not compete with the hero video) |
| `GET /api/trails/activity?date=<viewer's local date>` | none | When the homepage mounts |
| `GET /api/trails/{id}` | none, for every visitor (I1) | Authenticated Trail Detail, Trip Preparation, Studio, as today. The homepage makes none |

- One unauthenticated timed request helper (20 s) serves all three; `tripRequest` stays authenticated for the pack request.
- Response checking follows 004 §5.4: untrusted body, each field checked; a trail without a usable `id` is dropped; a trail without finite in-range coordinates is listed but has no marker.
- No request per marker or per selection, no polling, no refetch on window focus or reconnect, no WebSocket.

### 9.2 Queries

| Query key | Fresh for | Notes |
|---|---|---|
| `["trails", "list"]` | 5 min | The list, markers, and popup all read it |
| `["trails", "activity", <YYYY-MM-DD>]` | 5 min | Viewer's local date (`todayIso()`). One request serves list, markers, and popup |
| `["trails", "detail", <id>]` | unchanged (FEATURE-004) | Not used by the homepage |

### 9.3 Client state

- **`selectedTrailId`** is the single selection state of Discover, shared by the list, the markers, and the popup. Selecting from the list or from a marker sets it; closing the popup clears it. There is never more than one selected trail, and there is no second detail UI.
- It is mirrored in the `trail` search parameter of `/`, written with `replace` (no history entries), read on load, and ignored when it is not a UUID or not in the list (I5).
- FEATURE-006 writes nothing to `localStorage`, writes no cookie, and adds no session-storage key. It uses the existing return-destination key only (section 11). It writes no pending planning prompt.

## 10. Trail Detail: Map Popup and Authenticated Page

| | Signed out | Signed in |
|---|---|---|
| Where | **Map-anchored Trail Detail popup** on Discover | **FEATURE-004 Trail Detail** at `/trails/:trailId` |
| Purpose | Discovery: read about a trail, sign in when ready to plan | Planning: trip date, Choose this trail → Trip Preparation |
| Data | The list item (`GET /api/trails`) plus activity | `GET /api/trails/{id}` and the planner context, as FEATURE-004 |

**Popup content** (section 16 owns layout and copy): trail name; difficulty; distance; elevation gain; estimated duration; scenery; the trail's description, kept short; Daily Trail Activity with the sample disclosure; the sample-data line TD6 when `source` is `DEMO_SEED` (as on FEATURE-004's Trail Detail; decision L5); **Sign in to plan this trip** (primary); **Create account** (secondary); a Close control; a real cover image only when `coverImageUrl` is non-null. A null value is omitted without a placeholder.

**Not in the popup:** Why this trail, a recommendation score, a trip-date picker, Choose this trail, packing data, Gear Studio controls, the route line, long-form content, a link to a full Trail Detail page.

**Authenticated Trail Detail** is FEATURE-004's, unchanged in behaviour and appearance. Revision 1's additions to it (activity line, scenery from the trail response, public variant, public header) are removed. Its trail read stays tokenless (I1), which changes nothing visible.

**FEATURE-008.** Community Memories may later appear in the popup (for example a small recent-memories preview or count with a link to an expanded memory experience). FEATURE-006 renders nothing for them: no placeholder, no "coming soon". The popup has no fixed height, so a later section can be appended.

## 11. Authentication Conversion

- **Popup — Sign in to plan this trip / Create account:** activating either saves `/trails/<selectedTrailId>` as the return destination (`startTrailPlanning`) and begins sign-in or registration through the auth boundary, with FEATURE-002's Working and Unavailable control states. After success the user lands on the authenticated `/trails/:trailId` (FEATURE-004), where trip date and Choose this trail lead to Trip Preparation. The public popup is not restored after sign-in.
- **Header Sign in:** a general entry, `beginAuthentication("navigation")`, no destination saved; a completed sign-in lands on `/home`.
- **Notices.** The FEATURE-002 notices the homepage hosts (G3 after a closed protected route, F1/F2 after a failed callback, X1 after a session ends, O1/O2 after sign-out, F3 when the identity provider is unreachable) and the gate (Sign in, Create account) appear in the Hero's notice slot, in the position the FEATURE-001 planner's message slot had; F3 caused by a popup action appears in the popup. In-app arrival focus goes to the Hero `h1`, except an arrival at `/?trail=<id>` (section 16). G1 and G2 no longer arise.
- **Failure:** a failed callback follows FEATURE-002 unchanged: the return destination is cleared and the visitor lands on `/` with F1 or F2 (limitation L2). Cancelling on the Keycloak page with Back returns to the homepage.
- Discover and the popup never touch the OIDC adapter; everything goes through `features/auth/authBoundary.ts`.

## 12. Hero and FEATURE-001 Media

Decision D1: **the cinematic Hero is retained** as the first section of `/`.

- Reuse the FEATURE-001 media system as it is: the three scenes declared in `features/landing/hero-media/scenes.ts` with `public/media/hero/scene1–3.mp4` and their posters; rotation and soft transitions; poster first; the looping video from 768px wide only when motion is allowed; the stable poster under `prefers-reduced-motion`; the Pause / Play control; loading and failure fallbacks; the local scrims for text contrast (001 §§ on media and accessibility). No new media and no reimplementation: the modules deleted by the interrupted cycle are restored from git `HEAD` (section 5.5).
- Removed from the Hero (decision D2): the planner text input, the AI conversation box, suggestion prompts, the planner's primary action, and any pending public planning prompt UI. Discover writes no pending prompt; `features/planning/pendingPrompt.ts` stays because FEATURE-003 and sign-out cleanup use it.
- Hero copy (decision D4; final strings in 16.17): slogan "**Discover the trail. Prepare for the journey.**"; support "**Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories.**" (changed by the user on 2026-10-15; L4); and the **Explore trails** control with a downward arrow, at the bottom centre, which scrolls to Discover (smooth unless reduced motion is requested, then an immediate jump; never a route change).

## 13. Map Stack

Decision D12 (unchanged): **MapLibre GL JS** (`maplibre-gl`, already installed at `^6.14.0`) used directly through the feature-local runtime module `features/discover/map/runtime/`, loaded by dynamic `import()`, with **OpenFreeMap** vector tiles and a local recoloured style. No Mapbox token, no Google Maps, no Leaflet, no React map wrapper, no second map library.

Because the page now scrolls, the map must not trap the page's scroll: scroll-wheel zoom over the map requires a modifier (MapLibre cooperative gestures, or an equivalent rule defined in section 16), and two-finger touch pans the map while one finger scrolls the page.

## 14. Performance

- **Hero first.** The Hero renders and its media loads using the existing FEATURE-001 behaviour (poster, then one scene's video). Nothing on the page delays the first poster.
- **Map later (I3).** The MapLibre chunk, its CSS, its worker, the style, glyphs, and tiles are requested only when Discover is about to be seen: when the first pixel of the Discover section enters the viewport (an `IntersectionObserver` with a non-zero intersection; lead correction 2026-10-15, because the Hero is exactly one viewport tall and "within one viewport height" would have loaded the map at once), when Explore trails or the header's Discover item is activated, or immediately on a load of `/#discover` or `/?trail=<id>`. A visitor who stays on the Hero downloads no map code or tiles.
- **Trail data early.** The trail list and activity requests (a few kilobytes) start on mount, so the list is ready when the visitor arrives at Discover.
- **No authenticated bundles.** The signed-out `/` downloads no chunk for `HomePage`, `TrailDetailPage`, `TripPreparationPage`, the Studio, the avatar, `three`, R3F, or a GLB. (Accepted residual from the first cycle: the planner and loadout session-storage cleanup boundaries mounted in `AppProviders` remain in the entry chunk; they must run on a signed-out startup.)
- **Markers:** one DOM marker per trail with valid coordinates; up to 200 without clustering is acceptable.

## 15. Privacy and Security

- Public data is trail records and one aggregate count per trail per day. No user identity, location, timestamp, participant list, or planning content is exposed.
- No geolocation is requested, on load or later; there is no "Use my location". The map opens on a fixed default region.
- Tile requests go to OpenFreeMap and reveal the viewer's IP address and viewed area to that provider; no token, cookie, or identifier is sent. Hero media is same-origin.
- Trail reads send no `Authorization` header and no credentials.

## 16. UI/UX Design

Reading guide: 16.1 lists the decisions and 16.2 the hierarchy. 16.3 is the page structure and the scroll model, 16.4 the header, 16.5 the Hero, 16.6 the Hero → Discover transition, 16.7 the Discover composition and the trail list, 16.8 the map and markers, 16.9 the Trail Detail popup, 16.10 its placement, and 16.11 selection, synchronization, and the popup's accessibility model. 16.12–16.15 cover states, interaction, motion, and accessibility; 16.16 responsive behavior; 16.17 the copy deck; 16.18 design-system additions; 16.19 the trace; 16.20 the items for the lead.

Conventions. Sizes are CSS px; colors are DS §8 tokens; motion tokens are DS §20. Discover tiers are FEATURE-004's (004 §21): **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279. Hero typography follows 001's breakpoints (≥1440, 1024–1439, 768–1023, <768) and 001's "short desktop" (≥1024 wide and ≤839 tall). Acceptance viewports: 1920×1080 (XL), 1440×900 (L), 1366×768 (M, short), 1024×768 (S, short). **H** is the header height of the tier. Hero positions are viewport y with the page at the top; Discover positions are viewport y with Discover **aligned** (its top at H). Values marked **est.** are arithmetic from these rules with system-font estimates, not browser measurements: the rules are binding, and QA should expect the estimates within a few px. Copy ids are in 16.17; the page shows no other text. "Right" and "left" are used literally: the product is left-to-right only.

### 16.1 Decisions at a glance

| Topic | Decision |
|---|---|
| Page | One scrolling document with two sections: the Hero (`100dvh`), then Discover (`100dvh − H`). A fixed header over both. No footer (16.3.4). No scroll-snap, scroll hijacking, or scroll-linked effects |
| Header | One stable treatment: solid `ink`, full width, fixed, constant height. Brand, **Discover** (an in-page link), Sign in. It never changes while scrolling and has no current-section indicator (16.4) |
| Hero | FEATURE-001 media, scrim, and scene control reused. A centred text block in the lower-middle: `h1` HR1 (two sentences on two lines), HR2, and the FEATURE-002 notice slot. **Explore trails** at bottom centre; Pause / Play at bottom right on the same row (16.5) |
| Hero → Discover | Explore trails and the header's Discover are both links to `#discover`: scroll (smooth, or instant under reduced motion), then focus on the Discover `h2`. No route, history, or URL change (16.6) |
| Discover | Revision 1's geometry kept: a docked `paper` rail on the left (heading, list heading, sample caption, list) and the map filling the rest. Only the list scrolls inside the rail (16.7) |
| Rows | Never expand. Each is a `button` with `aria-expanded` and `aria-controls` pointing at the popup. Selected: fill, a 3px start bar, and the meta line in `ink` (16.7.3) |
| Detail | One **map-anchored Trail Detail popup**, 300–360 wide: `paper`, 1px border, radius 12, one restrained shadow, and a tip pointing at the marker (16.9) |
| Popup in the DOM | Rendered as the **next sibling of the selected row's button, inside its `li`**, and absolutely positioned over the map. Reading and tab order is row → popup → next row. `role="group"`, labelled by the trail name. Focus is not moved on list selection (16.11) |
| Placement | Computed and collision-aware: right of the marker, else left, with a vertical clamp inside the map's safe area, clear of the zoom controls and the attribution. The camera pans (never zooms) only when neither side fits. While the visitor pans, the popup follows its marker and stays clamped inside the map if the marker leaves (16.10) |
| Closing | Close (×), Escape, or activating the selected row again. A click on empty map does not close. A click on the already selected marker changes nothing |
| Wheel and touch | MapLibre cooperative gestures at every width. A plain wheel scrolls the page; Ctrl or ⌘ + wheel and trackpad pinch zoom the map; one finger scrolls the page; two fingers move the map. The hint is restyled, with no full-map dimming (16.8.3) |
| Conifer | The page's only `conifer` element is the popup's **Sign in to plan this trip**. The Hero has none |
| Unchanged from revision 1 | Map style and palette, default region, zoom range, zoom controls, attribution, marker levels and encoding, markers not being tab stops, no filters, no geolocation, activity copy TA1–TA7 |

### 16.2 Information hierarchy

| Order | Hero (first screen) | Discover | Popup |
|---|---|---|---|
| 1 | The scene | The map of the region with its trail markers | The trail's name |
| 2 | The slogan HR1 | The heading DV1 and the list beside it | Scenery, then the facts (difficulty, distance, elevation, estimated time) |
| 3 | HR2, the promise | That a trail can be chosen: rows, markers, and the hover link between them | Today's activity |
| 4 | Explore trails | For a selected trail, its popup | **Sign in to plan this trip**, the single conifer action |
| Optional | Header, scene caption, Pause / Play, notices | Marker levels, sample caption, zoom, attribution, gesture hint | Description, image, Create account, Close |

At the page level, the brand comes first and discovery second (§3.1). The Hero's interactive element is Explore trails. In Discover it is choosing a trail, and in the popup it is Sign in to plan this trip. Nothing in the Hero competes with the scene: the text block has no surface, and Explore trails and Pause / Play are small quiet controls.

### 16.3 Page structure and scroll model

#### 16.3.1 Layers and sections

| Element | Specification |
|---|---|
| Document | Scrolls normally. The root has `scroll-padding-top: H`, so a hash target or a focused element is never placed under the header. No scroll-snap, root `scroll-behavior: smooth`, parallax, or scroll-driven animation |
| Header | `position: fixed`, at the top, full width, height H, above everything else (16.4) |
| Hero | `min-height: 100dvh` (fallback `100vh`), starting at y 0. The header covers its top H px, which is 001's navigation safe zone. It contains 001's layers: the `ink` base, the media layer, the content scrim, and the foreground (16.5) |
| Discover | `section#discover`, directly after the Hero. Height `max(560px, 100dvh − H)` (fallback `100vh − H`). Once aligned, it fills the viewport below the header exactly. `position: relative`: it is the popup's containing block (16.11.2). Two regions, the rail and the map (16.7) |
| Footer | None (16.3.4). The document ends at Discover's bottom edge |
| Stacking, back to front | Hero media → Hero scrim → Hero foreground. Map canvas → markers → gesture hint → zoom controls and attribution → popup. The header is above everything |

The document ends at Discover's bottom edge and Discover is `100dvh − H` tall, so the maximum scroll position is exactly "Discover aligned". Scrolling to the end lands on the full Discover view without any snapping. Document height (est.): 2088 at 1920×1080, 1728 at 1440×900, and 1472 at 1366×768 and 1024×768.

#### 16.3.2 Geometry per tier

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Header height H | 72 | 72 | 64 | 64 |
| Gutter (header sides; rail start padding; ends of the Hero's bottom row) | 64 | 56 | 40 | 32 |
| Discover height at the acceptance viewport | 1008 | 828 | 704 | 704 |
| Rail width, including its 1px end rule | 480 | 440 | 400 | 360 |
| Rail end padding / content width | 32 / 384 | 32 / 352 | 24 / 336 | 24 / 304 |
| Rail top / bottom padding | 40 / 40 | 40 / 40 | 32 / 32 | 32 / 32 |
| Discover `h2` (DV1) | 40/46 | 40/46 | 36/42 | 32/38 |
| Map camera padding | 48 | 48 | 32 | 32 |
| Map inset P (controls; popup safe area) | 24 | 24 | 16 | 16 |
| Popup width | 360 | 340 | 320 | 300 |

Above 1920px wide, the header gutter and the rail keep their XL values, the map takes the extra width, and the Hero text stays centred at its maximum widths (DS §6.3).

#### 16.3.3 Wheel, trackpad, touch, and keyboard

The page always scrolls, and nothing on it traps the scroll.

| Input | Over the Hero | Over the rail heading | Over the list | Over the map | Over the popup |
|---|---|---|---|---|---|
| Wheel, or two-finger trackpad scroll | Page | Page | The list, then the page once the list reaches its end (`overscroll-behavior: auto`, never `contain`) | **The page.** The map does not zoom. Hint DV21 or DV22 (16.8.3) | The page. If the popup itself overflows (16.9.4), it scrolls first. The popup is not in the map's DOM, so the map never receives the event |
| Ctrl + wheel, ⌘ + wheel, or trackpad pinch | Browser zoom | Browser zoom | Browser zoom | **Zooms the map** (the page does not zoom) | Browser zoom |
| Mouse drag | — | — | — | Pans the map | Text selection only |
| Double-click | — | — | — | Zooms in one step | — |
| One finger (touch) | Page | Page | List, then page | **The page.** Hint DV23 | Popup, then page |
| Two fingers (touch) | Browser pinch | — | — | Pans and zooms the map | — |
| Keyboard (Space, Page Up/Down, arrows on the document) | Page | Page | Page or list | Page, unless the map canvas has focus. Then the arrows pan and + / − zoom (MapLibre's keyboard handler) | Page |

`cooperativeGestures` is on at every width from map creation. This replaces revision 1's "below 768 only".

#### 16.3.4 Footer: none

A footer was considered and rejected. The map attribution (16.8.5) is the only required credit, and a footer would offer no action. It would also break the property that the end of the document is exactly the aligned Discover view (16.3.1). If a legal or copyright line is ever required, it goes in the rail below the list, not in a page footer (16.20 item 6).

### 16.4 Public header

```text
|gutter| Outdoor Trip Companion                                   Discover  24  ( Sign in ) |gutter|
```

| Item | Specification |
|---|---|
| Surface | Solid `ink` at opacity 1, full width, height H. No border, band, shadow, blur, or translucency. It is fixed and identical over the Hero and over Discover at every scroll position, and never changes height, color, items, or content while scrolling. Its readability does not depend on what is behind it |
| Landmark | `header` (banner) containing a `nav` labelled "Primary" |
| Brand | "Outdoor Trip Companion", `snow`, 16/24, weight 700, letter-spacing 0.01em, `nowrap`. A link to `/` with a 44px-tall hit box (8px horizontal padding, offset by a negative margin). Hover: underline, 2px, 4px offset. On the homepage it works as "back to top": the URL is replaced with `/` (this removes `trail`, which closes any popup), the page scrolls to the top (smooth; instant under reduced motion), and focus moves to the Hero `h1` (002's in-app arrival rule) |
| Discover | DV20. An `a href="#discover"`. `snow` 14/20, weight 600, 44px-tall hit box, 12px horizontal padding. Hover: underline, 2px, 4px offset. Activation per 16.6 |
| Sign in | A `button`, labelled "Sign in" (002). A pill, 44 tall, 20px horizontal padding, `snow` 14/20 weight 600, no fill, 1px `snow` border (the on-ink quiet control). Calls `beginAuthentication("navigation")`: no destination is saved, and a completed sign-in lands on `/home` (§11). States in 16.13; Working and Unavailable per 002 §21.2.3 |
| Spacing | 24px between Discover and Sign in (16 below 768) |
| Current section | Not indicated. With two sections the content shows where the visitor is, and a change driven by scrolling would contradict "no navigation change while scrolling". `aria-current` is not used |
| Not present | Create account (002 D16), Gear, account controls, planner links, any authenticated destination, a menu button |
| Below 768px | Height 56, gutter 16 (12 below 360). Brand at 14/20 below 360. The Discover item is not rendered below 400px wide; Explore trails and scrolling remain (16.16.3) |

Why solid: DS §13 prefers a navigation that floats over media, but this header has to stay identical over a moving video and over the light rail and map. A transparent bar would need a scrim over the Hero, and a translucent one turns a muddy grey over `paper`. The solid bar hides only y 0–72 of the master frame, which is inside the navigation safe zone (DS §5.1, y 0–120). It matches the authenticated `TripHeader`'s heights and brand typography, so signing in changes only the right-hand items. This is recorded as a DS amendment in 16.18.

### 16.5 Hero

#### 16.5.1 Composition

001's grid with the planner rows removed. Everything is centred on the viewport's vertical axis except the bottom row.

| Row | Content | Height |
|---|---|---|
| 0 | The header overlap (the Hero's top padding) | H |
| 1 | Scene window (empty) | Flexible: `minmax(48px, 3fr)` from 768px |
| 2 | `h1` HR1, then HR2 | Content |
| 3 | Notice reserve R: a 24px gap plus the notice slot | `min-height` R = 84 from 768px (24 + the 60px three-line gate allowance of 002 §21.2.4) |
| 4 | Spacer | `minmax(24px, 1fr)` from 768px |
| 5 | Bottom row: Explore trails centred on the viewport axis, and the scene control with its right edge on the gutter. Bottom edges aligned | 48 |
| 6 | Bottom padding | 40 at ≥1440; 32 at 1024–1439; 24 on short desktop; 32 at 768–1023 |

Rows 1 and 4 share the spare height 3 : 1. 001 used 5 : 1 for a taller block; 3 : 1 keeps this shorter block's midpoint at 55–60% of the viewport height (DS §4.3). A notice appears inside R, so nothing above it moves. If a notice ever needs more than R, row 3 grows and takes the height from rows 1 and 4 first (001's rule).

| Property | ≥1440 | 1024–1439 | 768–1023 | <768 |
|---|---|---|---|---|
| `h1` HR1 | 64/68, weight 600, letter-spacing −0.025em | 54/60, 600 | 42/48, 600 | 32/38, 600 (30/36 below 360) |
| `h1` max-width | 840 | 720 | 600 | 100% |
| `h1` lines | From 768px each sentence is its own line (two `display: block` spans): "Discover the trail." / "Prepare for the journey." The longer line is about 770 at 64px, 650 at 54px, and 510 at 42px (est.). Below 768 a sentence may wrap (`text-wrap: balance`) | | | |
| `h1` → HR2 | 16 (12 on short desktop) | 16 (12 on short desktop) | 16 | 12 |
| HR2 | 18/28, weight 400, `text-wrap: balance`, max-width 620, 2 lines (est.) | max-width 580, 2 lines | max-width 540, 2 lines | 16/24, full width, 3 lines at 390 (est.) |
| Notice slot max-width | 720 | 660 | 640 | 100% |
| Explore trails height | 48 | 48 | 48 | 44 |

All Hero text is `snow` and centred. The `h1` has `tabindex="-1"` and no focus ring (it is an arrival target).

#### 16.5.2 Expected positions (est., y, page at the top)

| Viewport | Header | `h1` | HR2 | Notice, tallest | Bottom row | Block midpoint |
|---|---|---|---|---|---|---|
| 1920×1080 | 0–72 | 543–679 | 695–751 | 775–835 | 992–1040 | 59.9% |
| 1440×900 | 0–72 | 408–544 | 560–616 | 640–700 | 812–860 | 56.9% |
| 1366×768 | 0–64 | 334–454 | 466–522 | 546–606 | 696–744 | 55.7% |
| 1280×800 | 0–64 | 358–478 | 490–546 | 570–630 | 728–776 | 56.5% |
| 1024×768 | 0–64 | 334–454 | 466–522 | 546–606 | 696–744 | 55.7% |

Arithmetic: fixed height = H + the block (136 + 16 + 56 = 208 at ≥1440; 120 + 12 + 56 = 188 on short laptops) + R (84) + the bottom row (48) + bottom padding. The spare height splits 3 : 1. At 1920×1080: 72 + 208 + 84 + 48 + 40 = 452, spare 628, giving 471 / 157. At 1440×900: spare 448, giving 336 / 112. At 1366×768: 64 + 188 + 84 + 48 + 24 = 408, spare 360, giving 270 / 90. At 1280×800: spare 392, giving 294 / 98.

Bottom row x (est.). Explore trails is about 186 wide and centred: x 867–1053 at 1920, 627–813 at 1440, 590–776 at 1366, and 419–605 at 1024. The scene control (001 §11.10, about 266 wide) ends on the gutter: x 1590–1856 at 1920, 1118–1384 at 1440, 1060–1326 at 1366, and 726–992 at 1024. They are at least 120px apart at every acceptance viewport (121 at 1024). They never overlap at ≥1024. Below 1024 the row stacks (16.5.6).

#### 16.5.3 Readability

001 §11.8's scrim plateau, with unchanged values (`ink` at 0.72, 001's feather profile):

- **Content scrim.** The solid region's x extent is the content block's box ± 32 at ≥1440 (± 24 at 1024–1439). The content block is a wrapper around the `h1`, HR2, and the notice slot with `width: fit-content`, capped at the `h1` max-width, so the scrim follows the longest line rather than the max-width. Its y extent runs from the `h1` top − 16 to the content bottom + 16. The content bottom is HR2's bottom, or the gate's bottom while a notice is shown; the region grows without a transition. Feather: 120 horizontally at ≥1440 (72 at 1024–1439) and 48 vertically. Below 1024 the band is full width (001).
- **Brand scrim.** Removed, because the brand sits on the solid header.
- Explore trails and the scene control carry their own `ink` 0.72 surfaces and sit outside the scrim.

Contrast is 001's: `snow` on the plateau is at least 6.97:1 over a white frame. Expected scrim (est.): at 1920×1080 the solid region is x 543–1377, y 527–767 (851 with the tallest notice), and the feather reaches x 423–1497, y 479–815 (899). At 1440×900 the solid region is x 303–1137, y 392–632, and the feather reaches x 183–1257, y 344–680.

#### 16.5.4 Safe zones and notes for CG

The rule is unchanged: the UI does not move between scenes, and the scenes are composed around it (DS §5).

| Region on the 1920×1080 master | Holds | For CG production |
|---|---|---|
| y 0–72 | The solid header | Hidden: nothing of the frame shows here |
| About x 423–1497, y 479–899 | Text block and scrim, tallest notice included | No faces or narrative focal points. Inside DS §5.2 (X 430–1490, Y 390–920) except about 7px of feather on each side |
| About x 860–1060, y 980–1050 | Explore trails | Keep the bottom centre free of essential detail |
| About x 1580–1866, y 990–1050 | Scene control | As in 001, now ending on the 64px gutter |
| Left and right thirds, y 72–480 | Unobstructed picture | Preferred subject placement (DS §5.3) |

The delivered art against these zones (001 §11.7): scene A's hiker at (538, 670) now sits at the start edge of the solid region at 1920 (under 001 it sat in the feather) and under the solid region at 1440×900. Scene C's hiker at (1478, 648) is in the outer feather. Scene B is unchanged. This is recorded for art production; the UI is not moved (16.20 item 5).

#### 16.5.5 Notice slot

The FEATURE-002 gate and notices sit where 001's message slot was, relative to the text block: 24px below HR2, centred, with the maximum width of 16.5.1. Content, anatomy, icons, styles, and fit follow 002 §21.2.1–21.2.5 exactly as on the old landing. The message is `snow` 14/20 weight 500 with a 16px icon. The actions are **Sign in** (gate: `paper` fill, `ink` text) and **Create account** (quiet), in a `role="group"` labelled "Account". They form one row from 768px (36 tall with a fine pointer at ≥1024, 44 otherwise) and stack below 768.

Notices hosted here: G3, F1, F2, X1, O1, O2, and F3 caused by the header Sign in (text only). F3 caused by a popup action appears in the popup (16.9.5).

Lifetime, now that there is no input: a notice stays until another notice replaces it, a gate action starts authentication, or the page is left. Scrolling and selecting trails do not clear it. There is no close button and no timeout, and a notice is not restored after a reload.

#### 16.5.6 Explore trails and the scene control

| | Explore trails | Scene control |
|---|---|---|
| Content | HR3, then a 20px lucide `ArrowDown` (`aria-hidden`) after an 8px gap | 001 §11.10, unchanged: caption pill and Pause / Play button |
| Element | `a href="#discover"`: in-page navigation, not a route | A `button` inside a non-interactive pill |
| Geometry | A pill, 48 tall (44 below 768), 24px horizontal padding (20 below 768), 16/24 weight 600 `snow`, fill `ink` at 0.72, 1px `snow` border (001's quiet control). Not `conifer`: the Hero's one action stays quiet so the scene leads, and the page keeps a single conifer action (the popup's) | 44-tall pill, `ink` at 0.72 |
| Placement | Bottom row, centred on the viewport axis | Bottom row, right edge on the gutter, bottom edge aligned with Explore trails |
| Behavior | 16.6 | 001: Pause and Play. Starts paused under reduced motion |

Below 1024 the bottom row stacks: Explore trails centred, then 16px, then the scene control aligned right.

#### 16.5.7 Sketch, 1440×900

```text
x 0    56    183  303 335                                   1105 1137 1257          1384 1440
y   0 ┌──────────────────────────────────────────────────────────────────────────────────┐
      │ Outdoor Trip Companion                                Discover    ( Sign in )    │ ink, fixed, 72
   72 ├──────────────────────────────────────────────────────────────────────────────────┤
      │                                                                                  │
      │                 scene as delivered: sky, summits, cloud (y 72–344)               │
  344 │          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │ feather
  408 │          ░░░░▒▒▒▒▒▒▒▒▒▒▒▒    Discover the trail.     ▒▒▒▒▒▒▒▒▒▒▒░░░░             │ h1 64/68
      │  scene   ░░░░▒▒▒▒▒▒▒▒▒   Prepare for the journey.    ▒▒▒▒▒▒▒▒░░░░    scene       │
  560 │          ░░░░▒  Explore trails around Vancouver, plan with AI, ▒░░░░            │ HR2 18/28
      │          ░░░░▒▒▒▒▒▒   your gear, and keep the memories.   ▒▒▒▒░░░░             │
  640 │          ░░░ [ ⓘ notice text      ( Sign in ) ( Create account ) ] ░░░          │ only when a notice applies
      │                                                                                  │
      │                              scene as delivered                                  │
  812 │                          ( Explore trails ↓ )           ( Discover somewh… ⏸ )   │ bottom row
  900 └──────────────────────────────────────────────────────────────────────────────────┘
```

▒ is the scrim's solid region (x 303–1137, y 392–632 without a notice) and ░ its feather. The picture shows as delivered everywhere else.

### 16.6 Hero → Discover transition

| Trigger | Behavior |
|---|---|
| Explore trails or the header's Discover (click, Enter) | `preventDefault`, then: (1) start loading the map runtime if it has not started (§14); (2) scroll the document so that Discover's top meets the header's bottom, with `behavior: "smooth"`, or `"instant"` under `prefers-reduced-motion: reduce`; (3) move focus at once to the Discover `h2` (DV1, `tabindex="-1"`, no focus ring) with `preventScroll: true`; (4) make no route change, add no history entry, write no hash, and leave `trail` unchanged |
| Middle-click, "open in new tab", copy link | The `href` resolves to `/#discover`, which loads scrolled to Discover |
| Activation while Discover is already aligned | No scroll; focus moves to the `h2` |
| Manual scrolling (wheel, keys, scrollbar, touch) | Native. Nothing snaps, eases, or is intercepted, and focus does not move |
| Load of `/#discover` | Discover aligned instantly after the first render, without smooth scrolling. Focus per 16.15.2 |
| Load of `/?trail=<id>` with a well-formed UUID | Discover aligned instantly. When the list has loaded and contains the trail, its row is selected and scrolled into view in the list, and its popup opens: docked until the map is ready, then anchored without animation (16.10). Otherwise D11 |
| Load of `/` | The top of the page |

The focus target is the `h2`, not the first row, so a screen reader announces where the visitor arrived ("Discover trails around Vancouver, heading level 2") and the next Tab reaches the first row.

Hero media while the Hero is scrolled out of view: 001's behavior is unchanged (rotation pauses only while the document is hidden). Suspending it while the Hero is out of view is recommended but not required (16.20 item 2).

### 16.7 Discover composition and the trail list

#### 16.7.1 Regions

| Region | Specification |
|---|---|
| Rail | Left side, full Discover height, `paper`, with a 1px `ink` at 0.12 rule on its right edge (included in its width). No radius, no shadow. A flex column: the heading block and the list's header stay in place, and **only the `ul` scrolls** (`overflow-y: auto`, `overscroll-behavior: auto`) |
| Map region | Everything to the right of the rail, full Discover height, filled by the map canvas. Over the map: zoom controls, attribution, marker labels, the gesture hint, the popup, and the map's loading and failure states. Nothing else |

The popup is positioned over the map region but is not a DOM descendant of it (16.11.2).

#### 16.7.2 Rail content

| Part | Specification |
|---|---|
| `h2` | DV1, `ink`, size per 16.3.2, weight 600, letter-spacing −0.02em, `text-wrap: balance`. Two lines at every acceptance size (est.). `tabindex="-1"`, no focus ring |
| List section | A `section` labelled by its `h3`, 24px below the `h2` (20 at M and S) |
| `h3` | DV3: "{n} trails" or "1 trail"; "Trails" while loading, after a failure, or when empty. `ink` 16/24, weight 600. `tabindex="-1"` (focus target after Retry) |
| Caption | 4px below, `stone` 14/20. TA7 when activity has loaded and `source` is not `RECORDED`; TA4 when the activity request failed; nothing while it is loading or when the source is `RECORDED` |
| List | 12px below. A `ul` with one `li` per trail in API order. It extends 20px beyond the rail content box on each side, with 8px padding on all four sides, so row text still lines up with the `h2` and a row's 6px focus ring is never clipped by the scroller. Rows are separated by a 1px `ink` at 0.12 rule, hidden above and below the selected row. No cards, shadows, or zebra striping |

DV2, revision 1's intro, is removed: the Hero carries the promise and the popup carries the invitation to sign in.

#### 16.7.3 Row

Each `li` holds one `button type="button"` and, only while its trail is selected, the popup element (16.11.2).

| Part | Specification |
|---|---|
| Box | Fills the `ul`'s content box (rail content width + 24). Padding 10 × 12 (14 vertical on a coarse pointer). Radius 12. About 90 tall with three lines (est.). Text aligned left |
| Name | `ink` 16/24, weight 600. Wraps and is never truncated (`overflow-wrap: anywhere`). A null name shows TD1 |
| Meta | 2px below. `stone` 14/20: "{Difficulty} · {distance} · {duration}" from `difficultyLabel`, `formatDistance`, and `formatDuration`. Null parts are dropped; with none left, the line is not rendered. No elevation |
| Activity | 4px below: the 12px level glyph (`aria-hidden`), 8px, then TA1, TA2, or TA3 in `ink` 14/20 weight 500. Loading: a static 140 × 12 bar, `ink` at 0.08, radius 6, `aria-hidden`. Unknown: no line |
| No-map note | Only for a trail without valid coordinates: 4px below, a 16px `MapPinOff` in `stone`, 8px, then DV7 in `stone` 14/20 |
| Semantics | `aria-expanded` is "true" while this trail is selected (its popup is open) and "false" otherwise. `aria-controls` holds the popup's id **only while expanded**. The name comes from `aria-labelledby` (the name element), and `aria-describedby` points at the meta line, the activity line, and the note. A screen reader hears "Dog Mountain, button, collapsed, Moderate · 5 km · 2 h, 12 trips planned for today" |
| Selected | Fill `ink` at 0.06, a 3px `ink` bar on the left edge (a real border, so it survives forced colors), and the meta line in `ink`. The name's weight does not change, so nothing reflows. The row **never expands**: it is as tall as when unselected |
| Never in a row | Elevation, scenery, description, image, View trail, Close, sign-in controls, any expanding area |

The rows are disclosure buttons, not `aria-pressed` toggles. What a row controls is whether a detail element is shown, and `aria-expanded` with `aria-controls` names that element.

#### 16.7.4 Reference boxes (est., Discover aligned)

| Viewport | Discover (y, height) | Rail | Map region (x, w × h) | List starts (y) | Rows visible | Popup safe area (map-region px) |
|---|---|---:|---|---:|---:|---|
| 1920×1080 | 72, 1008 | 480 | 480, 1440 × 1008 | 308 | about 8 (every seed trail) | 24–1416 × 24–984 |
| 1440×900 | 72, 828 | 440 | 440, 1000 × 828 | 308 | about 6 | 24–976 × 24–804 |
| 1366×768 | 64, 704 | 400 | 400, 966 × 704 | 280 | about 5 | 16–950 × 16–688 |
| 1024×768 | 64, 704 | 360 | 360, 664 × 704 | 292 | about 4.9 | 16–648 × 16–688 |

The figures assume a 2-line `h2`, a TA7 caption on 2 lines (3 at S), and 90px rows. Rows visible = (Discover bottom − bottom padding − list start) ÷ 90. Without a caption, about half a row more is visible.

#### 16.7.5 Sketch, 1440×900, Discover aligned, Dog Mountain selected from the list

Markers are at their approximate default-view positions. ◯ is base, ◉ is 1–9, ● is 10 or more, ◎ is selected, and ◀ is the popup's tip.

```text
x 0                         440                     730 761                         1101         1440
y   0 ┌────────────────────────────────────────────────────────────────────────────────────────────┐
      │ Outdoor Trip Companion                                       Discover    ( Sign in )      │ ink 72, fixed
   72 ├───────────────────────────┬────────────────────────────────────────────────────────────────┤
      │ RAIL paper 440            │ MAP 1000 × 828                                         ┌──┐    │
  112 │ Discover trails           │                                  ◉                     │+ │    │
      │ around Vancouver    (h2)  │                                                        │− │    │
      │                           │                                                        └──┘    │
  228 │ 8 trails            (h3)  │      ●                                                         │
      │ Sample activity: these    │                                                                │
      │ daily figures are …       │      ◯                                                         │
  308 │ ───────────────────────── │                             ┌───────────────────────────┐      │ 437
      │ Bowen Lookout             │                             │ Dog Mountain          (×) │      │
      │ Easy · 4 km · 1 h 30 min  │                             │ Forest · Viewpoint        │      │
      │ ◉ 4 trips planned for…    │                             │ Difficulty    Distance    │      │
      │┃Dog Mountain              │                             │ Moderate      5 km        │      │
      │┃Moderate · 5 km · 2 h     │                ◉   ●    ◎ ◀ Elevation     Estimated time │      │ 647 marker
      │┃● 12 trips planned for…   │                             │ 650 m         2 h         │      │
      │ Garibaldi Lake            │                   ◉         │ ● 12 trips planned for    │      │
      │ Hard · 18 km · 6 h        │                             │   today · Sample activity │      │
      │ ◯ No trips planned for …  │                             │ A short description …     │      │
      │ Grouse Grind              │                             │[Sign in to plan this trip]│      │ conifer
      │ …          (list scrolls) │                             │[      Create account     ]│      │
      │                           │                             └───────────────────────────┘ ◉    │ ~857
      │                           │                      OpenFreeMap © OpenMapTiles © OpenStreetMap …│
  900 └───────────────────────────┴────────────────────────────────────────────────────────────────┘
```

Popup at x 761–1101, y about 437–857 (est., height about 420). The marker was already inside the safe area with room on its right, so the camera did not move. The list shows no detail: the selected row looks selected and nothing more.

#### 16.7.6 Q3: filters

None in the MVP. Eight trails fit in one screen of list and one view of map. A filter row would add the "control panel" density DS §3.4 warns against, and the planner already exists for preference-driven search after sign-in. Revisit when the region holds about 30 or more trails. The first filter should then be difficulty, as three pill chips at the top of the list, synchronized with the markers. That is future work and is not specified here.

### 16.8 Map and markers

#### 16.8.1 Style ("paper trail map")

Unchanged from revision 1. A local style JSON pointing at OpenFreeMap vector tiles (§13), derived from OpenFreeMap's light "Positron" layer set and recoloured with the 16.18 map palette.

| Layer group | Treatment |
|---|---|
| Background, land | `map-land` |
| Landcover wood/forest; park and protected areas | `map-wood`; `map-park` |
| Grass, scrub | `map-grass` |
| Glacier / ice | `map-ice` |
| Water polygons; waterways | `map-water`; `map-waterway` lines |
| Roads | `map-road` fill with `map-road-casing`. Only motorway, trunk, and primary at zoom below 10; secondary and below from zoom 10. No road shields |
| Boundaries | `map-boundary`, 1px dashed, administrative level 4 and below only |
| Buildings | `map-building`, from zoom 15 only |
| Labels | Places (city, town, village) in `map-label` with a 1.5px `map-label-halo`; water names in `map-label-water`; park names from zoom 10; mountain peaks from zoom 11. The provider's glyphs are used as they come |
| Removed | Every POI and icon layer, transit, house numbers, shields, and housenumber or aerialway labels |
| Not available | Hillshade or terrain, since there is no DEM in scope. No 3D buildings, pitch, or rotation |

Tiles are decorative: they carry no information the product relies on.

#### 16.8.2 Camera

| Property | Value |
|---|---|
| Default view | `fitBounds` of the fixed default region **SW (−123.40, 48.95), NE (−121.30, 50.45)**, with the camera padding of 16.3.2. It holds all eight seed trailheads with margin. Estimated zoom: XL 8.2, L 7.8, M 7.65, S 7.65 |
| Not derived from | The visitor's location (none is requested, §15) or the trail data |
| Zoom range | 6–16 |
| Interaction | Drag to pan, double-click to zoom, Ctrl or ⌘ + wheel and pinch to zoom, two-finger touch to pan and zoom (cooperative gestures, 16.3.3), and keyboard pan and zoom while the canvas has focus. Drag-rotate, touch-rotate, and pitch are off |
| Camera moves made by the product | Only 16.10 Rule 2: a pan at the current zoom, on opening a popup that cannot be placed. The camera never zooms by itself |
| `?trail=` on load | The default view, then 16.10 with `jumpTo` (no animation) |
| Viewport memory | None (§9.3) |

#### 16.8.3 Cooperative-gesture hint

| Item | Specification |
|---|---|
| Mechanism | MapLibre `cooperativeGestures: true` at every width. The library's messages are replaced through the map's `locale`: DV21 (Windows and Linux), DV22 (macOS), DV23 (touch) |
| Appearance | No dimming: the library's full-map overlay is given a transparent background. The message is a box centred in the map region: opaque `ink` fill, radius 12, padding 8 × 16, `snow` 14/20 weight 500, centred text, max-width 320 |
| Timing | Fades in over 150ms on a wheel without a modifier (or a one-finger drag on touch) over the map, stays while that input continues and for 1200ms after it stops, then fades out over 240ms. Under reduced motion it appears and disappears without fading, with the same hold |
| When | The wheel hint is shown only while Discover is aligned (its top within 1px of H). While the page is scrolling between the sections, a wheel passing over the map shows nothing, so ordinary page scrolling does not flash a message. The touch hint is shown regardless |
| Semantics | `aria-hidden="true"`, not focusable, not announced. Keyboard instructions are part of the canvas name, DV12 |

#### 16.8.4 Zoom controls

Unchanged. The top right of the map region, inset P. Two `button`s stacked in one group, each 40 × 40 (44 × 44 on a coarse pointer). `paper` fill, a 1px `stone` border around the group, and a 1px `ink` at 0.12 divider between the buttons. The group has radius 12. Icons are 16px lucide `Plus` and `Minus` in `ink`. Accessible names DV13 and DV14. No compass, reset, fullscreen, or geolocate control.

#### 16.8.5 Attribution

Unchanged. The bottom right of the map region, inset 0. A solid `paper` box with radius 8 on its top-left corner only and padding 4 × 8. Text DV15 in `stone` 14/20 with `ink` underlined links. Always expanded at ≥768px, wrapping if it does not fit; never collapsed into an "i" button. The links are ordinary tab stops after the zoom controls.

#### 16.8.6 Markers

Activity levels, unchanged:

| Level | Condition | Marker (20px disc; pointer hit area 32px, 44px on a coarse pointer) | 12px list glyph |
|---|---|---|---|
| **Base** | `activityCount = 0`, or activity unknown, loading, or failed | `paper` fill, 2px `ink` ring: hollow | The same at 12px (shown only for a confirmed zero) |
| **Some** | 1–9 | Hollow, with an 8px `ink` centre dot | The same, with a 4px dot |
| **Many** | 10 or more | Solid `ink` disc with a 2px `paper` outer halo (24px overall) | Solid `ink` 12px disc |

- The thresholds (1–9, 10 or more) are absolute, fixed, and one constant in code. They do not depend on other trails, so a level means the same thing every day.
- Base deliberately covers zero, unknown, and loading. The map makes no claim about a trail at base; the exact state is read only in text (16.9.6), where unknown is never shown as zero (§7.2).
- The encoding is fill amount (empty, dot, full), so it survives grayscale. Markers use `forced-color-adjust: none` so it survives forced colors too. The list carries the same meaning as text.
- There is no separate legend: each row's activity line starts with the same glyph as its marker.
- Never shown: a number on the map, people or figure icons, heat, density shading, pulsing, moving dots, or anything placed anywhere but the trailhead.

States:

| State | Appearance |
|---|---|
| Default | As above |
| Hover (fine pointer), or its list row hovered or focused | Ring 2 → 3px, plus a **name label**: `paper` fill, 1px `ink` at 0.16 border, radius 8, padding 4 × 8, `ink` 14/20 weight 600, max-width 240 (wraps), 8px right of the marker and vertically centred. It moves to the marker's left when it would come within 16px of the map's right edge. Cursor `pointer`. The popup is drawn above labels |
| Selected | A 28px disc that keeps its level (centre dot 10px), a 3px `paper` gap, and a 2px `ink` outer ring (38px overall), raised above all other markers. **No name label while selected**: the popup names the trail (this replaces revision 1's selected label) |
| Focus | Not focusable |

A label is `aria-hidden`, never interactive, and carries the name only, with no count or activity. At most one label exists: the hovered marker's.

Overlap: at the default views, Dog Mountain and Quarry Rock are about 18–21px apart, so their discs may touch or overlap by 2px at 1366×768 and 1024×768. There is no clustering (§14 allows up to 200 markers). The hovered or selected marker is raised, the later marker in DOM order wins the hit test, and the list is always available. Zooming in separates them.

Why markers are not tab stops (unchanged): every marker has a list row with the same selection behavior, and the list also holds trails without a marker (WCAG 2.1.1 parity). Markers have no meaningful sequential order. Up to 200 extra tab stops would duplicate the list and conflict with the canvas's own arrow-key panning. Markers get `aria-hidden="true"` and no `tabindex`, and are pointer targets only. The canvas is one tab stop for panning and zooming. A keyboard user who focuses a row sees its marker highlighted.

### 16.9 Trail Detail popup

#### 16.9.1 Anatomy

```text
┌──────────────────────────────────────┐   width per tier: 360 / 340 / 320 / 300
│ [cover image 5:2, only when real]    │   full width inside the border, top corners radius 11
│                                      │
│ Dog Mountain                    (×)  │   h4 18/24 600 · Close, 36 circle
│ Forest · Viewpoint                   │   scenery, stone 14/20
│                                      │   12
│ Difficulty        Distance           │   dl, 2 × 2
│ Moderate          5 km               │
│ Elevation         Estimated time     │
│ 650 m             2 h                │
│                                      │   12
│ ● 12 trips planned for today ·       │   activity
│   Sample activity                    │
│                                      │   12
│ A short description of the trail,    │   at most 160 characters (16.9.3)
│ cut at a sentence or a word…         │
│                                      │   16
│ [     Sign in to plan this trip    ] │   conifer, 44
│ [          Create account          ] │   secondary on paper, 44
│ (F3 only when a start fails)         │   8 above
└──────────────────────────────────────┘   padding 20 on every side
```

#### 16.9.2 Parts

| Part | Content | Specification |
|---|---|---|
| Surface | — | `paper`, 1px `ink` at 0.24 border, radius 12, one shadow `0 4px 16px rgb(11 28 32 / 0.16)`. No stacked shadows, blur, or translucency. Padding 20. Width per tier. No fixed height; `max-height` is the safe-area height (16.10), with `overflow-y: auto` only when that limit is reached. The 20px padding is wider than the 6px focus ring, so rings inside are never clipped |
| Tip | — | A 12 × 12 square rotated 45°, `paper`, bordered on its two outer edges, protruding 6px from the side facing the marker and centred on the marker's y. `aria-hidden`. Shown only when anchored (16.10) |
| Image | Only when `coverImageUrl` is non-null | An `img` the full inner width of the popup, `aspect-ratio: 5 / 2`, `object-fit: cover`, top corners radius 11, `alt=""` (the name follows it), loaded eagerly. Opacity 0 → 1 on load. On error it is removed with no replacement (no plate, caption, or icon) and placement runs again. No trail has one today |
| Name row | The trail name (TD1 when null) and Close | An `h4`, `ink` 18/24 weight 600, wrapping and never truncated (`overflow-wrap: anywhere`), with 44px right padding to clear Close. Close is a `button`, a 36 × 36 circle (44 on a coarse pointer), at the top-right corner of the text area (12 from the top and right, below the image when there is one), with an 18px lucide `X` in `ink` and the accessible name TP3. It is **last in the popup's DOM** (16.11.3) and never placed over the image |
| Scenery | The known values of `scenery[]` as labels, in `SceneryType` order, joined with " · " | 4px below the name, `stone` 14/20. Plain text, not chips. Omitted when there are none |
| Facts | TD3's labels: "Difficulty", "Distance", "Elevation", "Estimated time" | 12px below. A `dl` in a 2 × 2 grid (two equal columns, 12px column gap, 8px row gap). Labels `stone` 14/20; values `ink` 14/20 weight 600 from the shared formatters (elevation as "{n} m"). A null value removes its cell and the grid closes up. All null: not rendered |
| Activity | 16.9.6 | 12px below. A `p`: the 12px level glyph, 8px, the figure in `ink` 14/20 weight 500, then " · " and TA6 in `stone` when `source` is not `RECORDED`. Wrapped lines align with the text, not the glyph |
| No-map note | Only for a trail without coordinates | 8px below the activity: a 16px `MapPinOff` and DV7, `stone` 14/20. The popup is docked (16.10 Rule 4) |
| Description | `description` | 12px below. `ink` 14/20, weight 400. Shortened per 16.9.3. Omitted when null or blank |
| Sample-data line | TD6 | Lead amendment (18.2, L5). Only when `source` is `DEMO_SEED`: 8px below the description (12px below the activity or no-map note when there is no description), `stone` 14/20. A `p`. Same condition and text as 004 |
| Primary | TP1 | 16px below. A `button`, full content width, 44 tall, radius 12, `conifer`, label `snow` 16/24 weight 600. If a system font forces two lines it grows (min-height 44) |
| Secondary | TP2 | 8px below. A `button`, full content width, 44 tall, radius 12, no fill, 1px `stone` border, `ink` 14/20 weight 600 |
| Message slot | F3 | 8px below, min-height 0, a `role="status"` region that exists, empty, while the popup is open. Content: 16px `CircleAlert` in `ember`, 8px, F3 in `ink` 14/20 weight 500 (two lines, est.) |
| Not present | — | Why this trail, a score, a trip date, Choose this trail, packing data, Gear, a route line, a link to a full Trail Detail, placeholders for missing data, anything of FEATURE-008 |

FEATURE-008: a later section is appended after the message slot. The popup grows (it has no fixed height), and placement uses its measured height.

#### 16.9.3 Content rules

- **Description:** if the trimmed text is 160 characters or fewer, it is shown whole. Otherwise it is cut after the last sentence end (". ", "! ", "? ") at or before character 160. If no sentence ends after character 60, it is cut at the last word boundary before character 160 and "…" is added. The text node itself is shortened, so sighted and screen-reader users get the same text. There is no "more" control, because long-form content is out of scope (§10). The seed descriptions are one sentence each and are expected to show whole.
- **Scenery:** unknown wire values are dropped.
- **Numbers:** the shared formatters, as on the row; elevation is an integer with locale grouping.
- Nothing is invented for a null field: its part is omitted and the spacing closes up.

#### 16.9.4 Size (est.)

| Case | Height at L (340 wide) |
|---|---|
| Seed trail: 1-line name and scenery, 1–2 line description, 2-line activity | About 400–420 |
| Longest text: 2-line name, 160-character description (4 lines), 2-line activity, F3 shown | About 520 |
| Longest text with an image (5:2, 136 tall) | About 656 |

The safe-area heights are 960 (XL), 780 (L), 672 (M), and 672 (S). Only the image case comes close at M and S; `max-height` with internal scrolling is the last resort.

#### 16.9.5 Authentication controls

| | Behavior |
|---|---|
| Activation | TP1 calls `startTrailPlanning`, which saves `/trails/<selectedTrailId>` and begins sign-in. TP2 saves the same destination and begins registration (§11). Only through `authBoundary.ts` |
| Working | 002 §21.2.3. The activated control keeps its width; its label is hidden visually but kept as its accessible name; a centred 16px `LoaderCircle` (`snow` on TP1, `ink` on TP2); `aria-disabled="true"`; cursor `progress`; further activations ignored. Under reduced motion there is no spinner: the label stays and the control takes its Active fill |
| Unavailable | The other popup control, the header Sign in, and any gate actions in the Hero: `aria-disabled="true"`, opacity 0.56, still focusable |
| F3 | In the popup's message slot. Every control returns to Default and focus stays on the activated control. Cleared when the popup closes or another start is attempted |
| Returning with Back | Working ends when the page is shown again, including from the back/forward cache. The popup is as it was; a reload restores it from `?trail=` |
| After success | The visitor lands on the authenticated `/trails/:trailId` (FEATURE-004). The popup is not restored |

#### 16.9.6 Daily Trail Activity presentation

| State (§7.2) | List row | Popup | Marker |
|---|---|---|---|
| Count of 2 or more | Glyph + TA1 | Glyph + TA1 · TA6* | Some or Many |
| Count of 1 | Glyph + TA2 | Glyph + TA2 · TA6* | Some |
| Zero | Base glyph + TA3 | Base glyph + TA3 · TA6* | Base |
| Loading | Static 140 × 12 bar | TA5 in `stone`, no glyph | Base |
| Whole request failed | No line; the list caption shows TA4 | TA4 in `stone`, no glyph | Base |
| This trail absent or invalid (request succeeded) | No line | TA4 in `stone`, no glyph | Base |

\*TA6 is shown when `source` is anything other than `RECORDED`, including an unknown value. On the list the disclosure is the caption TA7, shown once.

- **Number format:** an integer with locale grouping. A negative, non-integer, or non-numeric `activityCount` makes that entry unknown.
- **"Today"** is the viewer's local calendar date, the date the request uses.
- **Words never used about activity:** §7.3's list. A trail's name and description are the backend's text and are shown as returned.
- Activity is never announced when it loads.

### 16.10 Popup placement

Coordinates are map-region px: (0, 0) is the map region's top-left corner. The popup is not in the map's DOM (16.11.2), so the shell converts its position into Discover-section coordinates: `left` = rail width + x, `top` = y.

**Inputs.**

- m: the selected marker's centre, from the map runtime's projection, updated on every map `move`.
- w × h: the popup's measured size.
- W × H: the map region's size.
- P: the inset of 16.3.2.
- Z: the zoom group's box grown by 8px. A: the attribution box grown by 8px.
- G = 31: the selected marker's 19px radius + a 6px gap + the 6px tip.

**Safe area S** = [P, W − P] × [P, H − P], with two exclusions. For a popup whose horizontal span overlaps Z's, the top limit is Z's bottom. For one that overlaps A's, the bottom limit is A's top. "lo" and "hi" below are the resulting top and bottom limits.

**Rule 1: anchored placement.** Used on opening, at the end of any camera movement, and whenever the popup's size or the map's size changes.

1. The marker must be *placeable*: inside [P + 19, W − P − 19] × [P + 19, H − P − 19] and not inside Z or A.
2. Try **right**: x = m.x + G. It fits horizontally if x + w ≤ W − P, and vertically if hi − lo ≥ h; then y = clamp(m.y − h/2, lo, hi − h).
3. Otherwise try **left**: x = m.x − G − w. It fits horizontally if x ≥ P, and vertically as above.
4. The first side that fits wins. The tip is on the side facing the marker, at the marker's y, and is hidden if that would fall within 16px of the popup's top or bottom edge.

**Rule 2: making room.** Only when a popup opens, from the list, a marker, or the URL. If the marker is not placeable, or neither side fits, the camera pans at the current zoom so that the marker lands on a target t, and Rule 1 then places the popup on the right of t.

- t.x = P + (W − 2P − (G + w)) / 2: the marker and the popup are centred as a pair.
- t.y = m.y if that is placeable vertically, otherwise H / 2.
- Animation: `easeTo`, 500ms, `--ease-ui`. `jumpTo` under reduced motion and on load.
- The popup appears at the start of the pan, already **at its final position** (computed for t), and the marker travels into place beside it. If the visitor interrupts the pan, Rule 3 takes over from where the marker is.
- The camera never zooms. If the popup cannot fit even at t (a map narrower than w + G + 2P + 19, which happens only below 1024), it is docked (Rule 4).

**Rule 3: following.** While the visitor pans or zooms, including with the zoom buttons, the popup keeps its side and is placed from m on every `move`: x from that side's formula, y = clamp(m.y − h/2, lo, hi − h), and then x and y are clamped into S. It never leaves the map region and never covers the rail or the header. If the marker leaves the placeable area, the popup stays clamped at the nearest edge with its tip hidden, and the trail stays selected. The camera never moves in response. At `moveend`, Rule 1 runs again without moving the camera: the side may flip (instantly), and if neither side fits, the clamped position stays.

**Rule 4: docked.** For a trail without coordinates, and while the map is loading, has failed, or is unsupported (D6–D8), the popup sits in the top-right corner of S: right edge at W − P, top at P, or below Z when the zoom controls are shown. No tip. The D6–D8 status block centres itself in the part of the map region to the left of the docked popup. When the map becomes ready and the marker is placeable, the popup moves once to its Rule 1 or Rule 2 position, without animation.

An anchored popup is never put at a fixed position: its position always comes from Rules 1–3.

**Page alignment.** When a selection is made (row, marker, or URL) and Discover is not aligned (its top differs from H by more than 1px), the page first scrolls to align it: smooth, or instant under reduced motion and on load. The popup is positioned in Discover's coordinates, so later page scrolling does not affect it: if the visitor scrolls back up, the popup moves away with the map and passes under the fixed header.

**Why not MapLibre `Popup`.** It appends its element inside the map container, which would separate the popup from its row in the DOM and in tab order (16.11), and its automatic anchors do not provide the vertical clamp or the exclusions. The runtime reports m and the map's size, and the shell positions a React-rendered node.

**At the default views (est.).** Every seed trailhead is placeable. At L the right side fits for m.x ≤ 605 and the left side for m.x ≥ 395; at M the values are 599 and 367; XL is wider still. So **selecting from the list or a marker at the default view never moves the camera at XL, L, or M.** At S (664 wide) a marker with m.x between 318 and 346 fits neither side and causes a pan of about 165px.

### 16.11 Selection, synchronization, and the popup's accessibility model

#### 16.11.1 One selection

`selectedTrailId` (§9.3), mirrored in `?trail=` (with replace), drives the row's selected look and `aria-expanded`, the selected marker, and the single popup. There is never a second detail surface.

| Trigger | Selection | Map | List | Focus |
|---|---|---|---|---|
| Activate an unselected row (click, Enter, Space) | Set; replaces any other | Page alignment, then 16.10 Rules 1–2. The marker turns selected at once | Row selected; the `ul` scrolls only if the row is not fully visible | Stays on the row |
| Activate the selected row | Cleared | The marker returns to its level | Row unselected | Stays on the row |
| Click or tap an unselected marker | Set | Page alignment, then Rules 1–2 (the camera moves only if needed) | Row selected and scrolled into view **within the `ul`** (nearest edge, 8px margin; smooth, or instant under reduced motion) | Moves to that row's button with `preventScroll: true`. After a pointer click, no focus ring shows (`:focus-visible`) |
| Click the selected marker | No change | — | — | Moves to its row, as above |
| Close (×) | Cleared | — | — | The row's button |
| Escape, with focus in the popup or on the selected row | Cleared | — | — | The row's button |
| Escape, with focus on the map canvas | Cleared | — | — | Stays on the canvas |
| Click on empty map | No change | Pans if dragged | — | MapLibre default (the canvas) |
| Row hovered or focused | — | That marker's hover state and label; no camera movement | — | — |
| Marker hovered | — | — | That row's hover fill; no scrolling | — |
| `?trail=<valid>` on load | Set | Rule 4 until the map is ready, then Rules 1–2 with `jumpTo` | Row scrolled into view instantly | Per 16.15.2 |
| Header brand on the homepage | Cleared (URL becomes `/`) | — | — | Hero `h1` |

The `ul` is scrolled with its own computed `scrollTo`. `scrollIntoView` is not used, because it would also scroll the document. Every programmatic focus call uses `preventScroll: true`.

#### 16.11.2 DOM placement

The popup element is rendered **inside the selected trail's `li`, immediately after its row button**, and is `position: absolute` against the Discover section (16.3.1), at the coordinates from 16.10.

Binding requirements:

- Between the popup and the Discover section, no element may become its containing block or clip it. The rail, the list section, the `ul`, and the `li` stay `position: static` and have no `transform`, `filter`, `perspective`, `contain` (layout, paint, strict, or content), `container-type`, or `will-change` naming any of those. The `ul`'s `overflow-y: auto` then does not clip the popup, because an absolutely positioned element whose containing block lies outside a scroller is not clipped by that scroller.
- The popup is positioned in Discover-section coordinates. Scrolling the `ul` does not move it, and scrolling the page moves it together with the map.
- If the implementation cannot meet these requirements (for example, a dependency forces a containing block), `frontend` must stop and report to the lead. It must not move the popup elsewhere in the DOM, because 16.11.3 and 16.15 depend on this order.

Why: this gives keyboard and screen-reader users the order they expect, the row, then its detail, then the next row, with no focus movement, no focus trap, and no repeat of the row's announcement. Visually the list shows nothing extra: rows never expand.

#### 16.11.3 Semantics and focus

| | Specification |
|---|---|
| Popup root | A `div` whose `id` the row's `aria-controls` points at, with `role="group"` and `aria-labelledby` its `h4` name. Not a live region. No `aria-describedby` |
| Why `group` and not `dialog` | Focus is not moved into it and it blocks nothing, so it is not a dialog. A `dialog` role would also put some screen readers into focus mode, which makes the facts and the description harder to read. The group's name tells a user who tabs in which trail the controls belong to: "Dog Mountain, grouping, Sign in to plan this trip, button" |
| Order inside | Image (`alt=""`), `h4`, scenery `p`, facts `dl`, activity `p`, no-map note, description `p`, sample-data `p` (TD6, when shown), TP1, TP2, the message slot (`role="status"`), Close (TP3). Close is placed visually top right but comes last in the DOM: it is the least important action, and the primary action should come first after the row |
| Tab order | … → selected row → TP1 → TP2 → Close → next row → … Shift+Tab reverses it. No trap, no loop |
| Opened from a row | Focus stays on the row. `aria-expanded` conveys the change, and the popup is the next Tab stop |
| Opened from a marker | Focus moves to the row (16.11.1), so the next Tab enters the popup, exactly as from the list |
| Closed | Focus goes to the row's button (Close, Escape). It is never left on a removed element. If the selection switches while focus is inside the old popup, focus moves to the new row |
| Duplicate announcements | None by design. The row announces the name, meta, and activity. The popup is described by nothing and announces nothing when it opens; its content is read only when the user moves into it |
| Markers | `aria-hidden="true"`, no `tabindex` (16.8.6) |

### 16.12 Screen states

Hero:

| # | State | Shown | Focus / announcement |
|---|---|---|---|
| H1 | `initializing`, `unauthenticated` | The Hero as in 16.5. The header's Sign in is shown (002 §21.2.6) | — |
| H2 | Media loading, failed, or reduced motion | 001 §11.9 and §11.12: poster, `ink` base, the control starting paused. Text and controls are unaffected | — |
| H3 | Arrival notice (G3, F1, F2, X1, O1, O2) | The notice slot with the gate | In-app arrival: the Hero `h1`. Fresh load: the document start. Polite, inserted after the first render (002 §21.2.5) |
| H4 | F3 from the header Sign in | The notice slot, text only | Stays on Sign in; polite. While Discover is in view the slot is off-screen (16.20 item 1) |
| H5 | `redirecting` | The activated control is Working; the header, gate, and popup controls are Unavailable | 002 |
| H6 | `callback-processing`; authenticated | The 002 waiting screen; replaced by `/home` (§8.1) | — |

Discover ("stays" means focus is not moved):

| # | State | Rail | Map | Focus / announcement |
|---|---|---|---|---|
| D1 | Trails loading | `h3` "Trails". Four static skeleton rows (60% × 16 name bar and 40% × 12 meta bar, gap 8, `ink` at 0.08, radius 6, `aria-hidden`), plus a line with a 16px `LoaderCircle` in `stone` (static under reduced motion), 8px, and DV4 in `stone` 14/20. After 10s the text becomes SH7 | Loads independently; no markers | Stays; nothing announced |
| D2 | Trails loaded | The list | Markers for trails with valid coordinates | DV17, status |
| D3 | Trails failed or timed out | `h3` "Trails". A 16px `CircleAlert` in `ember`, 8px, then DV5 (TD16 on timeout) in `ink` 14/20. 16px below, Retry (secondary on paper, `RotateCcw`, SH3; working SH4) | No markers, no message | DV5 or TD16, alert. Stays. After a successful Retry, focus moves to the `h3` |
| D4 | Empty (no trails) | `h3` "Trails", then DV6 in `stone` 16/24. No list | Default view, no markers | DV6, status |
| D5 | Trail without valid coordinates | Its row shows the DV7 note. Selecting it opens a docked popup (16.10 Rule 4) | No marker; the camera does not move | As for any selection |
| D6 | Map loading | — | The region filled with `map-land`. Centred: a 16px `LoaderCircle` in `ink` (static under reduced motion), 8px, DV8 in `ink` 14/20 weight 500. After 10s, SH7. With an open popup, the block centres in the space to the left of the docked popup | Not announced |
| D7 | Map failed (chunk, style, or not ready within 20s) | Unaffected | `map-land` fill. A centred block, max-width 320: a 16px `CircleAlert` in `ink`, 8px, DV9 in `ink` 14/20 weight 500; 16px below, Retry (secondary on paper). No zoom controls or attribution | Not announced; the list is the equivalent. Retry keeps focus while working |
| D8 | WebGL unavailable | Unaffected | As D7 with DV10 and **no Retry** | Not announced |
| D9 | Activity loading, failed, or partial | 16.9.6 | Base levels | Not announced |
| D10 | Tiles partly missing (network) | — | MapLibre shows `map-land` where tiles are missing. No message, because this cannot be detected reliably | — |
| D11 | `?trail=` not a UUID, or not in the list | Nothing selected, no message. The parameter is removed (with replace). A malformed value loads as `/`, at the top of the page. A well-formed UUID that is not in the list stays at the aligned Discover | Default view | — |
| D12 | Popup open and anchored | 16.9, 16.10 | | 16.11.3 |
| D13 | Popup docked | 16.10 Rule 4 | | As D12 |
| D14 | Popup start failed (F3) | 16.9.5 | | Stays; polite |
| D15 | Popup image failed | The image is removed silently and placement runs again | | — |

Rules: no state covers the screen with a spinner; the header's Sign in stays usable in every state; and no state disables a control that is not itself working.

### 16.13 Interaction states

Color and fill transitions use `--duration-fast`. The focus ring is DS §18, on `:focus-visible`, with no transition, together with `outline: 2px solid transparent; outline-offset: 2px`. Hover styles apply only under `(hover: hover)`. Links, buttons, and markers use the `pointer` cursor, Working controls use `progress`, and the map canvas keeps MapLibre's `grab` and `grabbing`. The popup surface has no hover state; its text is selectable.

| Element | Default | Hover (fine pointer) | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| Brand | `snow` text | Underline, 2px, offset 4 | Ring on the padded box, radius 8 | — | Never | — |
| Header Discover | `snow` text | Underline, 2px, offset 4 | Ring on the padded box, radius 8 | Fill `snow` at 0.12 on the padded box | Never | — |
| Header Sign in | No fill, 1px `snow` border | Fill `snow` at 0.12 | Ring | Fill `snow` at 0.20 | Never; Unavailable per 002 | Working per 002, spinner `snow` |
| Explore trails | Fill `ink` at 0.72, 1px `snow` border | Fill `ink` at 0.88 with a 2px `snow` edge (the border plus a 1px inset ring, so nothing shifts) | Ring around the pill | Solid `ink`, 2px edge kept | Never | — |
| Scene control button | 001 §11.10 | 001 | 001 | 001 | Never | — |
| Gate Sign in and Create account (Hero) | 002 §21.2.3 | 002 | 002 | 002 | Unavailable per 002 | Working per 002 |
| Row button | No fill | Fill `ink` at 0.04 (the selected row is unchanged) | Ring on the row box, radius 12 | Fill `ink` at 0.08 | Never | — |
| Selected row | Fill `ink` at 0.06, 3px `ink` left bar, meta in `ink` | — | As above | — | — | — |
| TP1 | `conifer`, `snow` label | `conifer-deep` | Ring | `conifer-press` | Never; Unavailable per 002 | Working, spinner `snow` |
| TP2 | No fill, 1px `stone` border, `ink` label | Fill `ink` at 0.06 | Ring | Fill `ink` at 0.10 | Never; Unavailable per 002 | Working, spinner `ink` |
| Close (TP3) | No fill, `ink` icon | 36px circle fill `ink` at 0.06 | Ring around the circle | Fill `ink` at 0.10 | Never | — |
| Retry (D3, D7) | Secondary on paper | Fill `ink` at 0.06 | Ring | Fill `ink` at 0.10 | Never | SH4 (004) |
| Marker | 16.8.6 | 16.8.6 | Not focusable | — | — | — |
| Zoom buttons | `paper`, `ink` icon | Fill `ink` at 0.06 | Ring | Fill `ink` at 0.10 | At minimum or maximum zoom: icon `stone`, `aria-disabled="true"`, still focusable | — |
| Map canvas | — | — | **Inset** ring on the map region (`inset 0 0 0 2px ink, inset 0 0 0 4px sun, inset 0 0 0 6px ink`), because an outward ring would be clipped | — | — | — |
| Attribution links | `ink`, underlined | Underline 2px | Ring | — | — | — |

Filled buttons (TP1, the gate's Sign in) also carry `border: 1px solid transparent`, so their edge appears in forced colors. Hover is never needed to find an action: rows, the popup's controls, Explore trails, and Discover are all visible and labelled at rest, and touch selects with a tap.

### 16.14 Motion

| Element | Default | Reduced motion |
|---|---|---|
| Page scroll to Discover (Explore trails, header Discover, alignment on selection) and to the top (brand) | The browser's smooth scroll | Instant |
| Hero media, scene caption, Pause / Play | 001 | 001 (paused poster) |
| Notice entrance | 002: opacity and a 4px rise, 240ms | Instant |
| Popup opening | Opacity 0 → 1 and a 4px slide from the marker's side, 240ms, `--ease-ui` | Instant |
| Popup closing | Instant | Instant |
| Popup switching trails | The old one is removed instantly; the new one opens as above | Instant |
| Popup following its marker | Tracks the map every frame, with no easing of its own | Same |
| Popup side flip or re-placement at `moveend` | Instant | Instant |
| Camera (16.10 Rule 2) | `easeTo`, 500ms, `--ease-ui`, pan only | `jumpTo` |
| `ul` scrolling to a row | Smooth | Instant |
| Marker state | Color and ring 150ms; size change instant | Instant |
| Marker label | Opacity 150ms | Instant |
| Gesture hint | In 150ms, held 1200ms, out 240ms | No fade, same hold |
| Popup image | Opacity 240ms | Instant |
| Hover and press colors | 150ms | Kept (color only) |
| `LoaderCircle` | Spins | Static; the text still shows |
| Skeletons | Static | Static |

The only autonomous motion longer than 5 seconds is the Hero media, which has Pause / Play (DS §23). Never used: scroll-snap, scroll-linked animation, parallax, automatic camera tours, pulsing markers, bounce, scale, count-ups, or looping UI decoration.

### 16.15 Accessibility

#### 16.15.1 Structure

```text
header (banner, fixed)
└─ nav "Primary": a brand → /, a Discover → #discover (DV20), button Sign in
main
├─ div.hero
│  ├─ media layer                          aria-hidden, inert (001)
│  ├─ h1 HR1                               tabindex="-1"
│  ├─ p HR2
│  ├─ notice slot                          002: status region, then group "Account"
│  ├─ a Explore trails → #discover         HR3
│  └─ scene control                        caption; button Pause / Play (001)
└─ section#discover                        labelled by its h2
   ├─ div.rail                             not a landmark
   │  ├─ h2 DV1                            tabindex="-1"
   │  └─ section                           labelled by its h3
   │     ├─ h3 DV3                         tabindex="-1"
   │     ├─ p caption (TA7 or TA4)
   │     └─ ul                             the rail's only scroller
   │        └─ li
   │           ├─ button                   aria-expanded; aria-controls while expanded; describedby meta, activity, note
   │           └─ div role="group"         only for the selected trail; labelled by its h4; positioned over the map
   │              ├─ img alt="" (optional) · h4 name · p scenery · dl facts · p activity · p note · p description
   │              ├─ button TP1 · button TP2
   │              ├─ div role="status"     F3
   │              └─ button Close          TP3
   └─ div role="region" aria-label DV11
      ├─ map canvas                        tabindex="0", aria-label DV12
      ├─ markers                           aria-hidden, no tabindex
      ├─ gesture hint                      aria-hidden
      ├─ zoom group                        buttons DV13, DV14
      └─ attribution                       links
announcer                                  visually hidden: role="status", role="alert"
```

- Headings: one `h1` (the Hero), then `h2` (Discover), `h3` (the list), and `h4` (the popup's trail name). No level is skipped.
- Reading order follows the DOM: the Hero, then Discover; the rail before the map; the popup directly after its row.
- Document title: DV16.

#### 16.15.2 Focus

| Event | Focus |
|---|---|
| Fresh load of `/`, `/#discover`, or `/?trail=` | Left at the document start (002 §21.2.5) |
| In-app arrival at `/` (closed protected route, sign-out, session end) | The Hero `h1` |
| In-app arrival at `/?trail=<valid>` | That trail's row button, with Discover aligned |
| Explore trails, header Discover | The Discover `h2` |
| Brand on the homepage | The Hero `h1` |
| A row activated (open, switch, or close) | Stays on the row |
| A marker clicked | Its row |
| Close, or Escape in the popup or on the row | The row (Escape on the canvas: stays on the canvas) |
| TP1 or TP2 Working, or F3 in the popup | Stays on the activated control |
| F3 from the header Sign in | Stays on Sign in |
| Retry succeeded (D3) | The list `h3` |

Tab order with 8 trails, Dog Mountain selected, and no notice: brand → Discover → Sign in → Explore trails → Pause / Play → row 1 → … → Dog Mountain → TP1 → TP2 → Close → next row → … → row 8 → map canvas → Zoom in → Zoom out → the 3 attribution links. That is about 22 stops. While a Hero notice is shown, the gate's Sign in and Create account come between the header's Sign in and Explore trails. Rows are ordinary tab stops, with no roving focus or composite keys to learn.

The root's `scroll-padding-top: H` keeps a focused element from being hidden under the fixed header (WCAG 2.4.11).

#### 16.15.3 Announcements

| Event | Region | Text |
|---|---|---|
| Trails loaded after D1 | status | DV17 |
| Empty | status | DV6 |
| List failed | alert | DV5 or TD16 |
| Selecting, switching, closing | — | Not announced. Focus and `aria-expanded` convey them (revision 1's DV18 and DV19 are removed) |
| Hero notices | 002's slot regions | 002 copy |
| F3 in the popup | The popup's status region | F3 |
| Activity, map loading and failure, gesture hint, scene changes | — | Not announced |

#### 16.15.4 Contrast pairs in use

Ratios marked † come from DS §9, 001 §11.8, or 004 §23.6. The others were computed for this section, not measured.

| Foreground | Background | Ratio | Needed |
|---|---|---:|---:|
| `snow`: brand, Discover, header Sign in | `ink` | 17.48 † | 4.5 |
| `snow`: HR1, HR2, notice text | Scrim plateau over a white frame | 6.97 † | 3 (HR1), 4.5 |
| `snow`: Explore trails, scene caption, Create account (gate) | `ink` at 0.72 over white | 6.97 † | 4.5 |
| `ink`: gate Sign in | `paper` | 16.04 † | 4.5 |
| `snow`: gesture hint | `ink` | 17.48 † | 4.5 |
| `ink`: `h2`, `h3`, names, activity, popup name, values, description, F3 | `paper` | 16.04 † | 4.5 |
| `stone`: meta, caption, scenery, fact labels, TA4, TA5, TA6, notes | `paper` | 5.92 † | 4.5 |
| `ink`: selected row's meta | `ink` 0.06 on `paper` | 14.2 | 4.5 |
| `snow`: TP1 label | `conifer` / `-deep` / `-press` | 8.05 / 10.23 / 12.57 † | 4.5 |
| TP1 edge; TP2 `stone` border | `paper` | 7.38 †; 5.92 † | 3 |
| Close icon `ink` | `paper` | 16.04 † | 3 |
| F3 icon `ember` | `paper` | 4.43 † | 3 |
| Marker `ink` ring | `map-land` / `map-wood` / `map-water` | 14.3 / 13.3 / 10.5 | 3 |
| `ink` text: map loading and failure | `map-land` | 14.3 | 4.5 |
| Zoom group `stone` border; `ink` icon | `map-land`; `paper` | 5.27; 16.04 † | 3 |
| Marker label `ink` text | `paper` | 16.04 † | 4.5 |
| Attribution `stone` text, `ink` links | `paper` | 5.92 † / 16.04 † | 4.5 |
| Focus ring, `sun` band | `ink` | 12.28 † | 3 |

The popup's 1px `ink` at 0.24 border marks a container, not a control, so WCAG 1.4.11 does not apply to it; the controls inside meet 3:1 on their own. No product text sits directly on video or on map tiles: Hero text is on the scrim plateau or on its own surface, and text over the map is on `paper`, `ink`, or `map-land` (D6–D8).

#### 16.15.5 Forced colors, zoom, touch

- **Forced colors:** the rail rule, the row's left bar, the popup's border and tip, the zoom group, labels, the attribution box, and every button (including the transparent border on filled buttons) carry real borders. Markers use `forced-color-adjust: none`. Selection is still conveyed by `aria-expanded` and the left bar.
- **Zoom at 200%:** 1920×1080 behaves as 960×540 and 1440×900 as 720×450, which fall under 16.16.2 and 16.16.3. Nothing is clipped, and no text box has a fixed height.
- **Touch:** on a coarse pointer every control is at least 44 × 44, markers have a 44px hit area, and adjacent targets are at least 8px apart.
- No text is smaller than 14px, including the attribution and the hint.

### 16.16 Responsive behavior

#### 16.16.1 Acceptance viewports

| | 1920×1080 | 1440×900 | 1366×768 | 1024×768 |
|---|---|---|---|---|
| Tier | XL | L | M, short | S, short |
| Header H | 72 | 72 | 64 | 64 |
| Hero `h1` (size, y) | 64/68, 543 | 64/68, 408 | 54/60, 334 | 54/60, 334 |
| Hero bottom row (y) | 992–1040 | 812–860 | 696–744 | 696–744 |
| Discover height | 1008 | 828 | 704 | 704 |
| Rail / map width | 480 / 1440 | 440 / 1000 | 400 / 966 | 360 / 664 |
| Discover `h2` | 40/46 | 40/46 | 36/42 | 32/38 |
| Rows visible (est.) | About 8 | About 6 | About 5 | About 4.9 |
| Popup width | 360 | 340 | 320 | 300 |
| Default zoom (est.) | 8.2 | 7.8 | 7.65 | 7.65 |
| Camera move on selection at the default view | Never | Never | Never | Only for m.x 318–346 |
| Document height (est.) | 2088 | 1728 | 1472 | 1472 |

Step changes: from XL to L the rail narrows by 40, the map by 440, and the popup by 20. From L to M the header drops to 64, the Hero switches to laptop type with short spacing, the Discover `h2` steps down, and the inset drops to 16. From M to S the rail narrows to 360, the `h2` drops to 32/38, and the popup to 300. The structure never changes at ≥1024.

#### 16.16.2 768–1023px (functional, not composed)

- Header 64, gutter 32.
- Hero: 001's tablet values without the planner (`h1` 42/48, HR2 18/28 at max-width 540, a full-width scrim band). The bottom row stacks: Explore trails centred, then 16px, then the scene control aligned right.
- Discover: the S layout with a 320px rail (left padding 32, right 20, content 268) and an `h2` of 28/34. The map is at least 448 wide. Popup 300, P = 16; 16.10 applies, and Rule 2 pans more often. Controls are 44 on a coarse pointer.

#### 16.16.3 Below 768px (best effort)

No phone-specific composition was designed. Required: no horizontal scroll down to 320px; every trail, TP1, TP2, Close, and Sign in reachable; long names wrap.

- **Header:** 56 tall. The Discover item is hidden below 400px wide.
- **Hero:** 001's mobile geometry without the planner. All spare height goes to the scene window. `h1` 32/38 (30/36 below 360), HR2 16/24, the gate stacked (002). Then Explore trails (44 tall, centred), 16px, the scene control row (aligned right), and bottom padding of 16 plus the safe-area inset. R = 0: a notice takes its height from the scene window. Scrim: a full-width band.
- **Discover:** not tied to the viewport height. A single column: the `h2` (28/34), then the map at full width with height `clamp(320px, 56dvh, 480px)`, then the list's heading and caption, then the list. The list does not scroll on its own; the page scrolls.
- **Popup:** not anchored. It is rendered in the normal flow directly under its row (its DOM position), at the row's full width, with no tip and no shadow, and with the same content and order. 16.10 and camera movements are off.
- **Marker tap:** selects the trail and scrolls the page so the row sits just below the header (instant under reduced motion).
- **Map:** cooperative gestures, 44px zoom controls, and the attribution wraps.

### 16.17 Copy deck

Every new user-facing string. `{…}` is a value. Ids from earlier features are referenced, not repeated.

| Id | Where | Text |
|---|---|---|
| — | Brand; nav label; header Sign in | "Outdoor Trip Companion"; "Primary"; "Sign in" (002) |
| DV20 | Header, in-page item | "Discover" |
| HR1 | Hero `h1` | "Discover the trail. Prepare for the journey." (from 768px, one sentence per line) |
| HR2 | Hero supporting text | "Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories." (user, 2026-10-15) |
| HR3 | Hero action | "Explore trails" (followed by `ArrowDown`; accessible name "Explore trails") |
| — | Scene captions; Pause / Play names | 001 §11.7 and §11.10, unchanged |
| — | Hero notices and gate | 002's G3, F1, F2, F3, X1, O1, O2; actions "Sign in" and "Create account"; group "Account" |
| DV1 | Discover `h2` | "Discover trails around Vancouver" |
| DV2 | — | **Removed** (revision 1's intro) |
| DV3 | List `h3` | "{n} trails" · "1 trail" · while loading, failed, or empty: "Trails" |
| DV4 | D1 | "Loading trails…" |
| DV5 | D3 | "The trails couldn't be loaded. Try again in a moment." (timeout: TD16) |
| DV6 | D4 | "There are no trails to show yet." |
| DV7 | Row note and popup note, no coordinates | "Not shown on the map" |
| DV8 | D6 | "Loading map…" |
| DV9 | D7 | "The map couldn't be shown. Every trail is in the list." |
| DV10 | D8 | "This browser can't show the map. Every trail is in the list." |
| DV11 | Map region name | "Map of trails" |
| DV12 | Canvas name | "Map. Arrow keys move it, plus and minus zoom. Every trail is also in the list." |
| DV13 / DV14 | Zoom buttons | "Zoom in" / "Zoom out" |
| DV15 | Attribution | The provider-required text with links, including the OpenStreetMap credit. Expected: "OpenFreeMap © OpenMapTiles © OpenStreetMap contributors". `frontend` confirms the exact wording against OpenFreeMap's terms |
| DV16 | Document title | "Discover trails · Outdoor Trip Companion" |
| DV17 | Announcement | "{n} trails listed." · "1 trail listed." |
| DV18, DV19 | — | **Removed** (selection is not announced, 16.15.3) |
| DV21 | Gesture hint, Windows and Linux | "Use Ctrl + scroll to zoom the map" |
| DV22 | Gesture hint, macOS | "Use ⌘ + scroll to zoom the map" |
| DV23 | Gesture hint, touch | "Use two fingers to move the map" |
| TP1 | Popup primary | "Sign in to plan this trip" |
| TP2 | Popup secondary | "Create account" (002) |
| TP3 | Popup Close, accessible name (the button shows only an icon) | "Close trail details" |
| — | Popup facts labels; null name | TD3 "Difficulty" · "Distance" · "Elevation" · "Estimated time"; TD1 "Trail" |
| — | Popup sample-data line (`DEMO_SEED`) | TD6 "This is sample trail data." (004; lead amendment L5) |
| — | Popup F3 | 002's F3 |
| TA1 | Count of 2 or more | "{n} trips planned for today" |
| TA2 | Count of 1 | "1 trip planned for today" |
| TA3 | Zero | "No trips planned for today yet" |
| TA4 | Unavailable (list caption; popup) | "Today's activity isn't available." |
| TA5 | Loading (popup) | "Loading today's activity…" |
| TA6 | Sample suffix (popup) | "Sample activity" |
| TA7 | List caption, sample source | "Sample activity: these daily figures are examples, not real trip plans." |
| PV1–PV3, PT1–PT5 | — | **Removed** (revision 1's expanding preview and public Trail Detail) |
| — | Shared | SH3, SH4, SH7, TD16 (D1, D3, D7) |

No string names a service, a status code, the identity provider, or the simulation mechanism. The word "simulated" is not shown to visitors: "Sample activity" with TA7 is the disclosure.

### 16.18 Design-system additions (to fold into `DESIGN_SYSTEM.md` at implementation; not applied here)

| Addition | Value |
|---|---|
| Map palette | Unchanged: `map-land` #ECE8DD · `map-wood` #D3DDCB · `map-park` #DDE3D2 · `map-grass` #E3E6D6 · `map-ice` #F6F7F4 · `map-water` #B9CBD3 · `map-waterway` #9FB6C0 · `map-road` #FBFAF6 · `map-road-casing` #D2CCBF · `map-boundary` #A9A396 · `map-building` #E2DDD1 · `map-label` = `stone` · `map-label-water` #4A6670 · `map-label-halo` = `paper` |
| Trail marker | 16.8.6: base, some, and many levels; selected; hover name label. Markers are never tab stops. The selected marker has no label while its popup is open |
| On-ink quiet control | Unchanged: no fill, 1px `snow` border, hover `snow` at 0.12, active 0.20 |
| Fixed public header | Solid `ink`, fixed, full width with the tier gutters (64 / 56 / 40 / 32; 16 below 768); H 72 / 72 / 64 / 64 / 56. Amends DS §13 ("floats over the environment", "maximum width 1280") for a header that spans both media and light surfaces |
| Anchored map popup | 16.9.2's surface (`paper`, 1px `ink` at 0.24, radius 12, one shadow `0 4px 16px` `ink` at 0.16, a 12px tip), widths 360 / 340 / 320 / 300, placement Rules 1–4 (16.10), and the DOM rule of 16.11.2 (in the DOM after its trigger, `role="group"`, focus not moved) |
| Map on a scrolling page | Cooperative gestures at every width. Hint: an opaque `ink` box, no dimming, shown only while the map's section is aligned. Lists beside the map chain their overscroll to the page |
| In-page section navigation | Links to `#section`; scroll smoothly (instantly under reduced motion); focus the target section's heading (`tabindex="-1"`, no ring) with `preventScroll`; the root has `scroll-padding-top: H` |
| Hero without a planner | 001's grid with spare height split 3 : 1. The Hero's single action is a quiet pill CTA, 48 tall (44 below 768), at bottom centre beside the scene control |
| Inset focus ring | Unchanged: DS §18's bands drawn inset, for edge-to-edge regions such as the map |
| Map–rail layout | Interactive maps use a docked rail. Over the map: its controls, attribution, marker labels, the gesture hint, and at most one anchored popup |
| Activity copy rule | Unchanged: aggregate daily counts only, with §7.3's list of forbidden words |
| DS §3.2 rewording | For the public homepage: the Hero's single action is Explore trails (quiet); in Discover the dominant interaction is choosing a trail; the popup's Sign in to plan this trip is the page's only `conifer` action. DS §13's optional "Explore" item becomes "Discover" (in-page) |

Removed from revision 1's list: "Filled button on paper" (the gate now sits in the Hero and uses 002's styles).

### 16.19 Requirement-to-design trace

| Requirement | Design |
|---|---|
| §2.1 The Hero and the product promise come first | 16.2, 16.5 |
| §2.2 Reach Discover by scrolling, Explore trails, or the header's Discover | 16.3.3, 16.4, 16.6 |
| §2.3 Browse on the map or the equivalent list | 16.7, 16.8, 16.8.6 (parity), 16.15 |
| §2.4 Honest aggregate activity, distinct from unavailable | 16.8.6, 16.9.6, TA1–TA7 |
| §2.5 Select from the list or a marker; the popup appears beside the marker | 16.9, 16.10, 16.11 |
| §2.6 Sign in to plan this trip, then land on the authenticated trail | 16.9.5 |
| §4.1 Fixed header: brand, Discover, Sign in | 16.4 |
| §7.3 Where the sample disclosure appears | 16.7.2 (TA7), 16.9.6 (TA6) |
| §7.4 Marker encoding; no counts, people, or heat | 16.8.6 |
| §8.1 `/#discover` and `/?trail=` | 16.6, 16.12 D11 |
| §9.3 One `selectedTrailId`; closing clears it | 16.11.1 |
| §10 What the popup contains and omits; FEATURE-008 growth | 16.9.2, 16.9.3 |
| §11 Header Sign in; notices in the Hero; F3 in the popup; arrival focus | 16.4, 16.5.5, 16.9.5, 16.15.2 |
| §12 Hero media reused, no planner, Hero copy, Explore trails | 16.5, 16.6, 16.17 |
| §13 The map does not trap page scrolling; touch behavior | 16.3.3, 16.8.3 |
| §14 Hero first; map loaded lazily; list usable before and without the map | 16.6, 16.12 D6–D8 |
| §15 No geolocation | 16.8.2 |
| Acceptance viewports | 16.3.2, 16.5.2, 16.7.4, 16.16.1 |

### 16.20 Items for the lead

1. **F3 from the header Sign in while Discover is in view.** §11 places it in the Hero's slot, which is off-screen at that moment; the notice is announced, but a sighted visitor sees nothing happen. Options: (a) accept it, since F3 is an outage or configuration case; (b) when a popup is open, show it in the popup's slot instead; (c) add a header-attached message (a new component). Recommendation: (a) for the MVP.
2. **Hero media while scrolled out of view.** Recommended: pause the rotation and the video while less than 1% of the Hero is visible, and resume as 001 does after the document becomes visible again. This touches the restored 001 modules, against §12's "reuse as is", so it is not part of the specification unless the lead approves it.
3. **"Nearby" in HR2.** The app requests no location (§15); next to DV1, "nearby" reads as "near Vancouver". Alternative if the lead prefers: "Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories." **Resolved by the user (L4): the alternative is adopted.**
4. **Popup DOM inside the row (16.11.2)** is a binding engineering constraint. If the lead rejects it, the alternative is a popup in the map's DOM with `role="dialog"` (non-modal), focus moved into it on list activation, and focus returned to the row on close. That would need new tab-order and announcement rules.
5. **CG note.** Scene A's hiker sits at the edge of the solid scrim at 1920×1080 and under it at 1440×900 (16.5.4). The UI is not moved.
6. **No footer.** Please confirm that no legal or copyright footer is required (the map attribution is present).
7. **Selection aligns Discover.** When a selection is made while Discover is partly scrolled, the page scrolls to align it (16.10). Please confirm.
8. **Sample trail data.** §10's content list leaves out TD6 ("This is sample trail data."), although the trails are `DEMO_SEED`. Design follows §10. Adding one `stone` line after the description is possible if the lead wants it.
9. **DESIGN_SYSTEM conflicts** (proposed in 16.18, not applied): DS §3.2 (the planner as the Public Landing's dominant interaction), DS §4.2 and §10–§12 (the planner), and DS §13 (floating navigation, 1280 maximum width) no longer describe `/`.
10. **Revision 1's items.** Items 1, 3, 4, 5, and 9 are obsolete under revision 2 (no public Trail Detail, no expanding preview, no selected label, arrival focus defined in 16.15.2, FEATURE-004 unchanged). Item 2 remains limitation L2. Items 6, 7, 8, and 10 are settled by §6.2 and §7.3. Item 11, the fixed default region, remains a note for when the data grows.

## 17. Acceptance Criteria

*Written by the lead for revision 2, 2026-10-15, after approving section 16. They replace revision 1's 49 criteria.*

### 17.1 How these are validated

- **Where.** In a browser against `npm run dev` on `http://localhost:5173`, signed out unless a criterion says otherwise. `npm run build` and `npm run lint` are run as well. There is no test runner.
- **Viewports.** Primary 1440×900; sweep 1920×1080, 1366×768, 1024×768 (16.16.1). 768–1023 is functional only; below 768 is judged only by AC-40.
- **Live.** Criteria marked **Live** must pass at least once against the real stack (`trail-service` with B1 and B2, Keycloak, PostgreSQL). If the stack cannot run for an environment reason they are BLOCKED, not passed by interception.
- **Interception.** Other states (failures, timeouts, an empty list, a trail without coordinates, a `RECORDED` or unknown source, a cover image, a long description, a blocked map chunk or style) may be produced by intercepting requests in the browser. No mock or fixture ships in production code.
- **Estimates.** Positions marked "est." in section 16 are expected within ±8px; rules (order, containment, no overlap, clamping) are exact.
- **Priority.** P0 is the Lean QA bar (critical journey, honesty, access, boundaries). P1 is checked in Lean QA where it matters to the journey. P2 is Full QA only.
- **Baseline.** The working tree holds unrelated uncommitted changes. `qa` records a baseline first and judges boundary criteria against it.

### 17.2 Entry, routing, and header

| # | P | Criterion |
|---|---|---|
| AC-01 | P0 | **Live.** Signed out, `/` shows the fixed header, then the Hero filling the viewport, then Discover below it. There is no planner input, conversation box, suggestion prompt, or public "View trail" anywhere on the page (§§4.2, 12; 16.3, 16.5). |
| AC-02 | P0 | **Live.** Signed in, `/`, `/#discover`, and `/?trail=<id>` are replaced by `/home`. `/home`, `/trails/:trailId`, and the preparation and Studio routes behave as before this feature (§8.1). |
| AC-03 | P0 | **Live.** Signed out, `/trails/<valid id>` is replaced by `/` with notice G3 in the Hero's notice slot; after Sign in from that gate the user lands on the authenticated `/trails/<id>` (FEATURE-004). No public Trail Detail page exists at any address (§§8.1, 10). |
| AC-04 | P1 | The header is solid `ink`, fixed, the tier's height H (16.3.2), and identical at every scroll position over the Hero and over Discover. It holds the brand, Discover, and Sign in only; no Create account, no account controls, no current-section indicator (16.4). |
| AC-05 | P1 | The header's Sign in starts sign-in with no return destination saved; after success the user lands on `/home` (§11). The brand on the homepage scrolls to the top, removes `trail` from the URL (closing any popup), and focuses the Hero `h1` (16.4). |

### 17.3 Hero

| # | P | Criterion |
|---|---|---|
| AC-06 | P0 | The Hero plays the FEATURE-001 scenes with their existing behavior: poster first, rotation, the looping video only from 768px with motion allowed, the stable poster under reduced motion, Pause / Play, and the loading and failure fallbacks. The hero-media modules are FEATURE-001's code restored from `HEAD`, not a reimplementation (§§5.5, 12; 16.12 H2). |
| AC-07 | P0 | The `h1` reads HR1 with one sentence per line from 768px, followed by HR2, exactly as in 16.17. Explore trails (HR3 with a down arrow) is a quiet pill at bottom centre and Pause / Play is at bottom right, not overlapping at any acceptance viewport. The Hero contains no `conifer` element (16.5). |
| AC-08 | P1 | Hero text sits on the scrim and meets 16.15.4's ratios on every scene, including scene A at 1920×1080 and 1440×900. The text block's positions match 16.5.2 (est.) (16.5.2–16.5.4). |
| AC-09 | P1 | Notices G3, F1, F2, X1, O1, and O2 (and F3 from the header Sign in) appear in the Hero's notice slot with FEATURE-002's styles and gate actions. Showing one moves nothing above it. A notice persists while the visitor scrolls and selects trails (16.5.5). |

### 17.4 Hero → Discover and the scroll model

| # | P | Criterion |
|---|---|---|
| AC-10 | P0 | Explore trails and the header's Discover each scroll the page until Discover's top meets the header's bottom (smooth, or instant under reduced motion) and focus the Discover `h2`. The URL, history length, and hash are unchanged (16.6). |
| AC-11 | P0 | Scrolling to the end of the document shows the whole of Discover aligned under the header. There is no footer, no scroll-snap, and no scroll interception (16.3). |
| AC-12 | P0 | A plain wheel over the map scrolls the page and does not zoom the map. Ctrl + wheel (⌘ + wheel on macOS) and trackpad pinch zoom the map. Mouse drag pans the map. The wheel over the list scrolls the list, then the page (16.3.3). |
| AC-13 | P1 | The gesture hint (DV21 or DV22) shows as an opaque `ink` box with no dimming of the map, only while Discover is aligned; a wheel passing over the map mid-scroll shows nothing (16.8.3). |
| AC-14 | P1 | Loading `/#discover` lands with Discover aligned and no smooth scroll. Loading `/?trail=<id in the list>` lands aligned with that row selected and its popup open. A malformed `trail` is removed and loads `/` at the top; a well-formed UUID not in the list is removed and leaves Discover aligned with nothing selected (16.6, 16.12 D11). |

### 17.5 Trail list and Daily Trail Activity

| # | P | Criterion |
|---|---|---|
| AC-15 | P0 | **Live.** Signed out, the page sends exactly one `GET /api/trails` and one `GET /api/trails/activity?date=<viewer's local date>`, with no `Authorization` header and no credentials, and no other `/api/` request. Selecting, closing, panning, and zooming send no `/api/` request (§9). |
| AC-16 | P0 | **Live.** The list shows every trail in API order, including any without coordinates (with DV7). Each row shows the name, "{Difficulty} · {distance} · {duration}", and the activity line; never elevation, scenery, description, sign-in controls, or an expanding area. Selecting a row never changes its height (16.7.3). |
| AC-17 | P0 | **Live.** Activity copy is exactly TA1, TA2, or TA3 per count. While the source is not `RECORDED`, the list caption TA7 and the popup's TA6 are shown. With the activity request failed or intercepted to a non-`200`, no row shows a number or TA3, the caption is TA4, and the popup shows TA4. A trail missing from a successful response shows no line and TA4 in its popup. With an intercepted `RECORDED` source, no sample disclosure is shown (§7; 16.9.6). |
| AC-18 | P0 | No text on the page uses §7.3's forbidden words about activity, and the map draws no count, people icon, heat, pulse, or moving dot (§§7.3, 7.4). |
| AC-19 | P1 | Loading, failure (with Retry and focus to the `h3` after a successful Retry), timeout (TD16), and empty states of the list match 16.12 D1–D4. The Hero and the map work while the list is loading or failed. |

### 17.6 Map

| # | P | Criterion |
|---|---|---|
| AC-20 | P0 | **Live.** The map opens on the fixed default region with every seed trailhead inside it, shows one marker per trail with valid coordinates at its trailhead, and never requests geolocation. Tiles come from OpenFreeMap with the local recoloured style; no Mapbox, Google, or Leaflet request is made (§§13, 15; 16.8.1–16.8.2). |
| AC-21 | P1 | Markers show base, some, and many levels per 16.8.6 with the absolute thresholds (base for 0, unknown, and loading). Hovering a marker shows its name label and the row's hover fill; hovering or focusing a row highlights its marker. Markers are not tab stops. |
| AC-22 | P1 | Zoom controls, attribution (DV15, always expanded at ≥768), and the canvas's keyboard pan and zoom with the inset focus ring match 16.8.4, 16.8.5, and 16.13. |
| AC-23 | P1 | With the map chunk or style blocked, D7 is shown with Retry; with WebGL unavailable, D8 is shown with no Retry. In both, the list, selection, and a docked popup still work (16.12 D6–D8; 16.10 Rule 4). |

### 17.7 Selection and the popup

| # | P | Criterion |
|---|---|---|
| AC-24 | P0 | **Live.** Activating a row selects its trail: the row shows the selected style, `aria-expanded="true"`, the marker turns selected, and one popup opens beside the marker with the tip pointing at it. Activating a different row switches the popup; activating the selected row again closes it. There is never more than one popup, and `?trail=` follows the selection with no history entries (§9.3; 16.11.1). |
| AC-25 | P0 | **Live.** Clicking a marker selects the same trail as its row, opens the same popup, scrolls the row into view within the list without scrolling the page, and moves focus to the row. Clicking the selected marker changes nothing; clicking empty map does not close the popup (16.11.1). |
| AC-26 | P0 | **Live.** The popup shows, in order: image (only for a non-null `coverImageUrl`), name, scenery, the facts `dl`, activity, the no-map note when relevant, the description (at most 160 characters, cut per 16.9.3), TD6 when `source` is `DEMO_SEED`, Sign in to plan this trip (`conifer`), Create account, and Close. A null field removes its part with no placeholder. It never shows Why this trail, a score, a date, Choose this trail, packing or gear data, a route line, a link to a full Trail Detail, or anything of FEATURE-008 (§10; 16.9). |
| AC-27 | P0 | Close, Escape (focus in the popup or on the selected row), and re-activating the selected row each close the popup, clear `trail`, and return focus to the row. Escape on the map canvas closes it and leaves focus on the canvas (16.11.1). |
| AC-28 | P1 | The popup's surface, widths per tier, tip, motion, and the description cut match 16.9.1–16.9.4 and 16.14. A long description is cut in the DOM text itself, not by CSS. |

### 17.8 Popup placement

| # | P | Criterion |
|---|---|---|
| AC-29 | P0 | At the default view at 1920×1080, 1440×900, and 1366×768, selecting any seed trail from the list or its marker opens the popup fully inside the map's safe area, clear of the zoom controls and attribution, never over the rail or the header, and without moving the camera (16.10). |
| AC-30 | P0 | When a popup cannot be placed on either side, or its marker is off-view, opening it pans the camera at the current zoom (never zooms) so that the marker and popup sit centred as a pair. At 1024×768 this happens only for trailheads in 16.10's band (est.) (16.10 Rule 2). |
| AC-31 | P1 | While the visitor pans or zooms, the popup follows its marker every frame and stays inside the safe area. With the marker dragged out of view, the popup holds at the nearest edge with no tip and the trail stays selected. After the movement ends, the side may flip, but the camera does not move (16.10 Rule 3). |
| AC-32 | P1 | A trail without coordinates, and any selection while the map is loading or failed, gets a docked popup at the top right of the safe area with no tip. Once the map is ready it moves to its anchored position without animation (16.10 Rule 4). |
| AC-33 | P1 | Selecting while Discover is only partly in view first aligns Discover. A wheel over the popup scrolls the page, never zooms the map (16.10; 16.3.3). |

### 17.9 Authentication conversion

| # | P | Criterion |
|---|---|---|
| AC-34 | P0 | **Live.** From a popup, Sign in to plan this trip saves `/trails/<that id>` as the return destination and goes to Keycloak sign-in; after success the user lands on the authenticated `/trails/<id>` (FEATURE-004, unchanged in behavior and appearance), can choose a date and Choose this trail, and reaches Trip Preparation. Create account does the same through registration (§11; 16.9.5). |
| AC-35 | P1 | While a popup control is Working, it follows 002's Working state, and the other popup control, the header Sign in, and any Hero gate actions are Unavailable. With Keycloak unreachable, F3 appears in the popup's message slot, every control returns to Default, and focus stays on the activated control. Back from the Keycloak page restores the controls to Default (16.9.5). |
| AC-36 | P1 | A failed callback lands on `/` with F1 or F2 in the Hero, and the return destination is cleared (limitation L2). Signing out lands on `/` with O1 or O2 (§11). |

### 17.10 Accessibility

| # | P | Criterion |
|---|---|---|
| AC-37 | P0 | The DOM matches 16.15.1: one `h1`, then `h2`, `h3`, and the popup's `h4`; each row is a `button` with `aria-expanded`, plus `aria-controls` while expanded; the popup is a `role="group"` labelled by its `h4`, rendered inside the selected `li` directly after the row's button, and positioned over the map. Tab order is row → TP1 → TP2 → Close → next row, with no trap (16.11.2–16.11.3). |
| AC-38 | P0 | Every trail, its facts, its activity text, and its popup with both sign-in actions are reachable and usable by keyboard alone without touching the map. Selection is not announced in a live region; trail-list load, empty, and failure are announced per 16.15.3. Focus is never lost on close, switch, or Retry, and is never hidden under the fixed header (16.15.2). |
| AC-39 | P1 | Contrast pairs of 16.15.4 hold; focus rings follow DS §18 (inset on the map canvas); under `prefers-reduced-motion` every smooth scroll, the camera pan, and popup motion are instant; forced colors keep the selected row's bar, the popup border, and marker levels visible (16.13–16.15). |
| AC-40 | P2 | Below 768 (390×844 and 320×640): no horizontal scroll, the header hides Discover below 400px, Discover is a single column, and the popup renders in flow under its row. Every trail, TP1, TP2, Close, and Sign in are reachable (16.16.3). |

### 17.11 Performance, privacy, and boundaries

| # | P | Criterion |
|---|---|---|
| AC-41 | P0 | Loading `/` and staying on the Hero requests no MapLibre chunk, map CSS, worker, style, glyph, or tile. They are requested when Discover comes within one viewport height, on Explore trails or header Discover, or at once on `/#discover` or `/?trail=` (§14). |
| AC-42 | P0 | The signed-out `/` requests no chunk for `HomePage`, `TrailDetailPage`, `TripPreparationPage`, the Studio, the avatar, `three`, R3F, or any GLB. Residual D-PF1 (planner and loadout cleanup boundaries in the entry chunk) is accepted (§14). |
| AC-43 | P0 | FEATURE-006 writes nothing to `localStorage`, writes no cookie, adds no session-storage key, writes no pending planning prompt, and uses only the existing return-destination key. Tile requests carry no token, cookie, or identifier (§§9.3, 15). |
| AC-44 | P0 | **Live.** Regression: signed in, the planner at `/home`, the authenticated Trail Detail, Trip Preparation, and the Gear Studio work as before. The authenticated Trail Detail shows no activity line, public header, or other revision 1 addition (§10). |
| AC-45 | P0 | `npm run build` and `npm run lint` pass. Changes are within the write scope of 18.5; `maplibre-gl` is the only new dependency; MapLibre is imported only under `features/discover/map/runtime/`; no geolocation, WebSocket, polling, Leaflet, Mapbox, or Memory code exists (§§13, 18.5). |

## 18. Decisions and Implementation Prerequisites

### 18.1 Product decisions (final)

Made by the user on 2026-10-14 (revision 1) and 2026-10-15 (revision 2). None is open. Their original text was lost when this section became a stub in revision 2; the lead reconstructed it from sections 1–15, keeping the four numbers the body cites (D1, D2, D4, D12), and **the user confirmed this list as canonical on 2026-10-15**.

| # | Decision | Where |
|---|---|---|
| D1 | The cinematic Hero is retained as the first section of `/`, reusing FEATURE-001's media | §12 |
| D2 | No public planner input, conversation, suggestions, or pending public prompt | §12 |
| D3 | Signed-out trail detail is a map-anchored popup; no public Trail Detail page and no public "View trail" | §§3.1, 10 |
| D4 | Hero copy: HR1, HR2, Explore trails | §12; 16.17 |
| D5 | Trail-specific sign-in from the popup returns to the authenticated `/trails/:trailId`; the header Sign in returns to `/home` | §11 |
| D6 | `/trails/:trailId` stays protected; FEATURE-004's Trail Detail is unchanged | §§8, 10 |
| D7 | Discover: a list on the left, a map on the right, one `selectedTrailId` mirrored in `?trail=` | §9.3 |
| D8 | Daily Trail Activity is an aggregate count of trips planned per trail per day, `SIMULATED` and disclosed as Sample activity until a trip record exists | §7 |
| D9 | Activity is served by `trail-service` (B2); `activity-service` is not used | §6.2 |
| D10 | No filters in the MVP | 16.7.6 |
| D11 | No geolocation; a fixed default region | §15 |
| D12 | MapLibre GL JS with OpenFreeMap tiles and a local style; no token, no other map library | §13 |
| D13 | The map never traps page scrolling (cooperative gestures) | §13 |
| D14 | The map runtime loads lazily; the Hero comes first | §14 |
| D15 | Public header: brand, Discover, Sign in | §4.1 |
| D16 | FEATURE-008 Community Memories may later appear in the popup; nothing is rendered for them now | §10 |

### 18.2 Lead decisions on section 16 (2026-10-15)

Section 16 (revision 2) is **approved**. Items of 16.20:

| # | Item | Decision |
|---|---|---|
| L1 | F3 from the header Sign in while Discover is in view (item 1) | Accept option (a): it stays in the Hero slot and is announced. It occurs only during an identity-provider outage |
| L3 | Pausing Hero media while it is scrolled away (item 2) | Not in scope. §12's "reuse as is" stands; candidate for post-freeze performance polish |
| L4 | "nearby" in HR2 (item 3) | **User decision, 2026-10-15:** HR2 becomes "Explore trails around Vancouver, plan with AI, prepare your gear, and keep the memories." (amends D4) |
| L5 | Sample trail data (item 8) | **Amended:** the popup shows TD6 when `source` is `DEMO_SEED`, as FEATURE-004 does (PRD §4.8, honest data). Applied in §10, 16.9.2, 16.11.3, and 16.17 |
| L6 | Popup DOM inside the row (item 4) | Accepted as binding. If `frontend` cannot meet 16.11.2 it stops and reports; no fallback without a lead decision |
| L7 | No footer (item 6); selection aligns Discover (item 7) | Both accepted |
| L8 | Scene A's hiker under the scrim (item 5) | Recorded for art; the UI does not move and no media changes in this feature |
| L9 | DESIGN_SYSTEM conflicts (item 9) | 16.18 is folded into `DESIGN_SYSTEM.md` by `ui-ux` at feature close, as in revision 1 (BD6) |

### 18.3 Known limitations

| # | Limitation |
|---|---|
| L2 | A failed callback clears the return destination (FEATURE-002); the visitor lands on `/` with F1 or F2, not on the trail |
| L10 | Activity is `SIMULATED` sample data until a planned-trip record exists |
| L11 | Trail data is eight `DEMO_SEED` trails, with no routes or cover images; the image path of the popup is reachable only by interception |
| L12 | The production build has no route to `trail-service` (no gateway); public reads work through the development proxy only, as for every other endpoint |

### 18.4 Prerequisites

All three are met (closeout, 2026-10-15).

1. **PRD follow-up (§3.3).** A narrow closeout task after PASS (user, 2026-10-15). Done: applied at closeout once the user accepted the feature and approved closeout.
2. **Restore FEATURE-001's hero-media modules** from `HEAD` (§5.5) before any Hero work. Done. The planner prompt, suggestions, `PlannerMessage`, and `usePlannerPrompt` are not restored.
3. **`trail-service` running the current B1/B2 build** for Live criteria. Done: restarted from current source and smoke-checked at closeout on 2026-10-15.

### 18.5 Write scope

| Agent | May write |
|---|---|
| `frontend` | `Project/Frontend/**`. `maplibre-gl` is already installed; no new dependency. `vite.config.ts` only if its existing `/api/trails/**` proxy proves insufficient, reported first |
| `backend-api` | `Project/Backend/trail-service/**`, only for a real B1/B2 contract failure found by QA, after lead approval |
| `ui-ux` | `docs/DESIGN_SYSTEM.md` (16.18) at close |
| Lead | This document, `docs/FRONTEND_CONTEXT.md` at close, and the PRD amendment after user approval |

### 18.6 Cycle

`3D pipeline: SKIP` (no realtime 3D, no assets). `Blender production: NOT_REQUIRED`. `backend-api` is skipped unless QA finds a contract failure. Order: `frontend` audit-first rework (§5.5) → lead diff review → `qa` Lean (P0 plus journey-relevant P1, 1440×900 with a 1920 and 1024 sweep) → targeted repair, at most 2 cycles → PASS → user gate.

### 18.7 For the user

Resolved 2026-10-15: D1–D16 confirmed; HR2 changed (L4); the PRD amendment (§3.3) is a narrow closeout task after FEATURE-006 reaches PASS, and does not block implementation or QA.

Closed 2026-10-15: the user accepted revision 2 at the product gate, and FEATURE-006 is frozen. Deferred, non-blocking checks are listed in the checkpoint.

## Post-freeze evolution (2026-10-17): viewport-driven Discover

Accepted at the product gate on 2026-10-17 (Targeted QA PASS) as an evolution of this frozen feature. Where they differ, it supersedes this specification's trail-list data source (`GET /api/trails`, every trail listed) and its one-HTML-marker-per-trail map: Discover now lists the trails in the current map area from the public `GET /api/trails/nearby` (at most 50 rows) and draws them with MapLibre clustering. Everything else here, including the popup, its actions, activity wording, lazy loading, and gestures, stands. The current behavior is recorded in `docs/FRONTEND_CONTEXT.md` (sections 3, 4, 8, 12), the PRD decision record of 2026-10-17, and `.claude/state/features/006-public-discover-trail-activity.md`.
