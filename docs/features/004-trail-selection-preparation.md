# FEATURE-004 — Trail Selection & Trip Preparation

| | |
|---|---|
| Status | Specification and design only. Frontend not implemented. Backend blocker B1 is resolved; frontend implementation still awaits user approval |
| Date | 2026-10-12 |
| Routes | `/trails/:trailId` (Trail Detail) and `/trails/:trailId/prepare/:tripDate` (Trip Preparation), both protected |
| Depends on | FEATURE-002 (Authentication), FEATURE-003 (Conversational Planner), `GET /api/trails/{id}`, `POST /api/recommendations/pack` |
| Followed by | FEATURE-005 (gear customization, Equipped state, real-time avatar) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` → `docs/FRONTEND_CONTEXT.md` → `docs/DESIGN_SYSTEM.md` → FEATURE-002 → FEATURE-003 |

How to read this document: sections 4–6, 11–12, 15–20, and 24–26 are what `frontend` needs for data, state, and routing; sections 13–14 and 21–23 are the design, with section 21.16 holding every user-facing string; sections 5 and 6 are what `backend-api` needs; section 30 is what `qa` validates; section 31 lists decisions, blockers, and open questions. Each section stands on its own.

---

## 1. Feature Summary

FEATURE-003 ends with up to three recommended trails inside the conversation. FEATURE-004 takes the user from "I have several recommended trails" to "I selected the trail I want, and I understand what I need to prepare."

It adds two connected screens:

1. **Trail Detail** (`/trails/:trailId`): a focused briefing on one trail, with the planner's reasons for recommending it when the user arrived from a recommendation, and one decision: **Choose this trail**.
2. **Trip Preparation** (`/trails/:trailId/prepare/:tripDate`): the chosen trail and date, the expected weather when available, the gear the backend recommends, which of those categories the user owns or is missing, and packing readiness. It is presented over the existing pre-rendered preparation scene image.

The feature delivers PRD development steps 10 (Trail detail) and 11 (Packing). It stops before gear customization, the Equipped state, the avatar, and any real-time 3D, which are FEATURE-005.

## 2. Goals

1. A user can open a recommended trail from the planner and see real, factual trail information.
2. The reasons the planner recommended the trail (score and breakdown) carry over from FEATURE-003 without being recomputed or re-requested.
3. Trail Detail also works from a direct URL, without recommendation context, and never fabricates one.
4. Returning to the planner restores the conversation exactly as FEATURE-003 keeps it.
5. One action, Choose this trail, moves the user from deciding to preparing, with the trail and trip date carried forward and never retyped.
6. Trip Preparation shows only what the backend returned: recommended gear categories, Owned or Missing for each, the forecast when available, and the backend's readiness percentage.
7. The preparation scene image is part of the experience, and the screen works without it.
8. The boundary to FEATURE-005 is explicit: nothing here introduces Equipped, customization, or 3D.

Product positioning: Trail Detail is a decision screen and Trip Preparation is a gear briefing. Neither is a second chat, a dashboard, a database table, or a shop.

## 3. User Journey

```text
FEATURE-003  /home
  Conversation → recommended trail cards
        │  "View trail" on a card                       (section 4)
        ▼
FEATURE-004  /trails/:trailId?rec=<results id>          STATE A — Trail Detail
  Back to planning
  Trail name · difficulty · distance · elevation gain · duration
  Trail visual / route region
  Description
  Why this trail            (only with recommendation context)
  Trip date                 (prefilled, section 11)
  Choose this trail
        │
        ▼
FEATURE-004  /trails/:trailId/prepare/:tripDate         STATE B — Trip Preparation
  Preparation scene (existing image)
  Selected trail · trip date
  Weather summary           (or "unavailable")
  Packing readiness         (backend value)
  Recommended gear          Owned / Missing
        │
        ▼
FEATURE-005 (not built here): customize the pack, Equipped, avatar
```

Other ways in, all supported:

| Entry | Result |
|---|---|
| Direct URL `/trails/:trailId` | Trail Detail with factual content, no Why this trail (section 9) |
| Direct URL `/trails/:trailId/prepare/:tripDate` | Trip Preparation, when the trail exists and the date is valid (section 12) |
| Reload on either screen | The same screen, rebuilt from the URL and, for Why this trail, from the planner session (section 25) |
| Signed out on either URL | FEATURE-002's sign-in gate; after sign-in the user returns to the same screen (section 25) |

## 4. Entry from FEATURE-003

### 4.1 What FEATURE-003 already holds

Verified in `Project/Frontend/src/features/planning/` (`types/planner.ts`, `readRecommendation.ts`, `storage/plannerSession.ts`, `state/plannerStore.ts`).

Each assistant reply with results is an `AssistantChatMessage`:

| Field | Meaning |
|---|---|
| `id` | Opaque message id (`crypto.randomUUID()`), unique within the conversation |
| `recommendations[]` | Up to three `TrailRecommendation` values, in the backend's order |
| `usedTripDate` | The trip date (`YYYY-MM-DD`) that turn was sent with: the date the trails were scored for |
| `usedStartingPoint` | `"device"` or `"vancouver"` |

Each `TrailRecommendation` holds only checked values: `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `scenery[]`, `score`, and `breakdown { intent, weather, gear, scenery, proximity }`, each possibly `null`. The recommendation response carries no forecast, no distance from the user, no required gear, and no explanation text (FEATURE-003 section 25.3).

This state lives in the planner store and in one `sessionStorage` key owned by the signed-in user's subject, validated on read (FEATURE-003 section 16, D14, D28).

### 4.2 The handoff

| Rule | Behavior |
|---|---|
| Entry action | Each recommendation card whose `id` is not `null` gains one link, **View trail**, to `/trails/{id}?rec={assistant message id}`. This amends FEATURE-003 D11 ("cards have no action and are not links") for this one link only; nothing else on the card changes. A card whose `id` is `null` gets no link. Cards in a collapsed "Earlier results" group get the same link once expanded, carrying their own group's id |
| What travels in the URL | The trail id (path) and the results-group reference `rec` (query). Both are opaque identifiers. No score, breakdown, date, name, or coordinate is put in the URL |
| Where the context comes from | Trail Detail looks the recommendation up **in the existing planner session**: the assistant message whose `id` equals `rec`, then the recommendation in it whose `id` equals `:trailId` (UUIDs compared case-insensitively). Planning exposes this as one read-only selector from `features/planning`. The lookup goes through the planner store, so FEATURE-003's owner check applies unchanged |
| What the lookup yields | `score`, `breakdown`, `scenery`, `usedTripDate`, `usedStartingPoint`. These are used for Why this trail (section 8), the scenery line (section 7.1), and the prefilled trip date (section 11) |
| When the lookup finds nothing | `rec` absent, unknown, malformed, pointing at a message without that trail, or the planner session empty, cleared by New Plan, discarded, or owned by someone else: the screen behaves exactly as direct navigation (section 9). It is not an error and shows no warning |
| Read-only | FEATURE-004 never writes to the planner store or its storage key: not the trip date, not a "selected trail" marker, nothing |
| No second copy | The recommendation is not copied into route state (`location.state`), another storage key, another store, or the query cache. Browser history state is not owner-checked and would survive a change of user in the same tab |
| No re-request | Trail Detail never calls `POST /api/planner/turn` or `POST /api/recommendations/query`, and never recomputes a score |

Responsibility boundaries:

| Source | Answers |
|---|---|
| FEATURE-003 recommendation context | Why this trail was recommended |
| Trail API | What the trail is |
| Pack API | What to prepare for this trail on this date |
| Gear API | The durable owned inventory. Not called by this feature (section 5.3) |

## 5. Current Backend Contracts

Inspected in the working tree on 2026-10-12. All three services are stateless OAuth2 resource servers; every endpoint requires `Authorization: Bearer <access token>`. Java UUIDs and dates serialize as strings; every Java wrapper type can be `null` on the wire and the frontend treats it so.

### 5.1 Trail Detail — `GET /api/trails/{id}` (`trail-service`, port 8082)

`TrailController.getTrailById` → `TrailService.getTrailDetail` → `TrailDetailResponse`.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `name` | string | |
| `description` | string or `null` | |
| `difficulty` | string | Wire values `EASY`, `MODERATE`, `HARD` |
| `distanceKm` | number or `null` | |
| `elevationGainM` | integer or `null` | |
| `estimatedDurationMin` | integer or `null` | |
| `latitude` | number or `null` | Trailhead |
| `longitude` | number or `null` | Trailhead |
| `route` | GeoJSON object or `null` | Parsed from the stored geometry when present |
| `source` | string or `null` | `DEMO_SEED` for every current row |
| `coverImageUrl` | string or `null` | |
| `scenery` | string[] | Same stored values and semantics as `TrailSummaryResponse` |
| `baselineGearRequirements` | `GearCategory[]` | Same stored values and enum wire semantics as `TrailSummaryResponse` |

Responses: `200` with the body above; `404` with an **empty body** when no such trail exists; `400` when `{id}` is not a UUID (default Spring error body); `401` without a valid token. Errors are not `ProblemDetail`.

Seeded data (`V2__seed_demo_trails.sql`, `V4__add_trail_cover_image.sql`): eight `DEMO_SEED` trails near Vancouver. **Every `route` is `NULL`. No migration populates `cover_image_url`, so every `coverImageUrl` is `null`.**

### 5.2 Pack — `POST /api/recommendations/pack` (`recommendation-service`, port 8083)

`RecommendationController.getPackRecommendation` → `PackRecommendationService`.

Request, `PackRecommendationRequest`:

| Field | Type | Validation |
|---|---|---|
| `trailId` | UUID string | Required (`@NotNull`) |
| `tripDate` | ISO local date `YYYY-MM-DD` | Required, today or later by the server's clock (`@NotNull`, `@FutureOrPresent`). No upper limit |

Response, `PackRecommendationResponse`:

| Field | Type | Notes |
|---|---|---|
| `trailId` | UUID string | |
| `trailName` | string | |
| `weather` | `TrailWeather` or `null` | `null` when the forecast could not be obtained |
| `weatherAvailable` | boolean | `false` when any error occurred while fetching the forecast |
| `requiredGear` | `PackItemStatus[]` | May be empty |
| `readinessPercentage` | integer 0–100 | Computed by the backend |

`PackItemStatus`: `category` (`GearCategory`), `owned` (boolean).

`TrailWeather`: `temperatureC` (number: **the mean of the day's minimum and maximum**, not a high or a low), `precipitationProbability` (number, percent: the day's **maximum** precipitation probability), `windSpeedKmh` (number: the day's **maximum** wind speed at 10 m). The response has no condition word or code (nothing like "sunny" or "rain"), no hourly data, and no sunrise or sunset.

`GearCategory` wire values, identical in `user-service` and `recommendation-service`: `FOOTWEAR`, `RAIN_GEAR`, `WARM_LAYER`, `WIND_LAYER`, `TREKKING_POLES`, `TRACTION`, `HEADLAMP`, `BACKPACK`, `WATER`, `FOOD`, `SUN_PROTECTION`.

How the backend builds the response (`PackRecommendationService`, `GearRequirementService`):

| Step | Behavior |
|---|---|
| Trail | Fetched from `trail-service` by id with the user's token |
| Weather | Open-Meteo daily forecast at the trailhead for `tripDate`. Any exception sets `weatherAvailable = false`, `weather = null`, and the request continues. A date beyond the provider's forecast range ends this way |
| Required gear | The trail's baseline requirements, then weather-derived additions: `RAIN_GEAR` at precipitation ≥ 40%, `WARM_LAYER` at ≤ 5 °C, `WIND_LAYER` at wind ≥ 30 km/h, `SUN_PROTECTION` at ≥ 25 °C with precipitation < 20%. Duplicates are removed. With no forecast, weather-derived additions are skipped |
| Ownership | `owned` is `true` when the user has at least one non-deleted gear item whose `category` equals the required category. It is **category-level**: no item id, no item name, no count. Items with a `null` category never count |
| Readiness | `round(owned ÷ required × 100)`. **An empty `requiredGear` returns `100`** |
| Order | Baseline categories first, in no guaranteed order, then weather-derived ones |
| Not returned | Why each category is required, which source (trail or weather) required it, quantities, products, or which owned item matched |

Errors as produced today:

| Situation | Response |
|---|---|
| `trailId` or `tripDate` missing, `tripDate` in the past, malformed body | `400`, default Spring error body |
| Unknown trail | `500`. `TrailNotFoundException` is thrown but not mapped by `GlobalExceptionHandler` |
| `user-service` unreachable or failing | `503` `ProblemDetail`, title "User Service Unavailable" |
| `trail-service` unreachable or failing | `500`, unmapped |
| Forecast unavailable | `200` with `weatherAvailable: false` |
| No valid token | `401` |

### 5.3 Gear — `GET /api/users/me/gear` (`user-service`, port 8081)

`GearController.getCurrentUserGear` → `List<GearItemResponse>`, newest first, soft-deleted rows excluded, only the authenticated user's items.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `name` | string | Required on create, max 100 |
| `category` | `GearCategory` or `null` | Nullable in the DTO and in persistence |
| `description` | string or `null` | Max 255 |
| `createdAt` | ISO offset date-time string | |

An item is "owned" simply by existing in this list. It says nothing about any trip.

**FEATURE-004 does not call this endpoint (D6).** The pack response already carries the ownership state this feature shows, computed by the backend from this same inventory. Calling it here would only add item names beside "Owned", at the cost of a second request, a second failure mode, and an ownership join duplicated in React. FEATURE-005 needs the inventory to choose actual items and will call it then.

### 5.4 TypeScript shape (guidance)

Contract types live with the feature that owns the endpoint (section 24). Wire enum values stay canonical and are mapped to labels only where displayed.

```ts
// features/trails
type TrailDetailResponse = {
  id: string | null
  name: string | null
  description: string | null
  difficulty: string | null
  distanceKm: number | null
  elevationGainM: number | null
  estimatedDurationMin: number | null
  latitude: number | null
  longitude: number | null
  route: unknown | null
  source: string | null
  coverImageUrl: string | null
  scenery: string[]
  baselineGearRequirements: string[]
}

// features/packing
type PackRecommendationRequest = { trailId: string; tripDate: string }

type TrailWeather = {
  temperatureC: number
  precipitationProbability: number
  windSpeedKmh: number
}

type PackItemStatus = { category: string; owned: boolean }

type PackRecommendationResponse = {
  trailId: string
  trailName: string
  weather: TrailWeather | null
  weatherAvailable: boolean
  requiredGear: PackItemStatus[]
  readinessPercentage: number
}
```

Both responses are untrusted when read: each field is checked and reduced to a value or `null`, as `readTrailRecommendation` does in FEATURE-003. Section 16 says what makes a pack response unusable.

## 6. Known Backend and Data Gaps

Only confirmed items. Classes: **A** non-blocking, handled by a fallback in this feature; **B** FEATURE-004 blocker; **C** future enhancement. Resolved items are marked below, and the frontend does not invent data to cover remaining gaps.

| # | Gap | Evidence | Class | Handling |
|---|---|---|---|---|
| B1 | Baseline gear requirements were lost in the live pack flow | Section 6.1 | **Resolved** | Trail Detail now returns the existing scenery and baseline gear values |
| G2 | `route` is `null` for every seeded trail | `V2__seed_demo_trails.sql` inserts `NULL` | A | Route fallback (section 7.1). Route drawing is C |
| G3 | `coverImageUrl` is `null` for every seeded trail | `V4` adds the column; nothing fills it | A | Designed cover fallback (section 7.1) |
| G4 | Trail Detail had no `scenery` | `TrailDetailResponse` now includes the field | Resolved | Closed by the B1 contract fix |
| G5 | An unknown trail makes the pack endpoint answer `500`, not `404` | `TrailNotFoundException` is unmapped | A | Preparation also loads Trail Detail, whose `404` identifies a missing trail (section 15) |
| G6 | Pack failures are not distinguishable from the browser, apart from `400` and `401` | Section 5.2 errors | A | One general failure with Retry (section 20). A gear-service failure is shown the same way |
| G7 | The pack response gives no reason or source for a required category | `PackItemStatus` is `category` + `owned` | C | No per-item reasons are shown. The frontend does not re-derive the weather rules |
| G8 | Ownership is category-level; no matching item id or name | `PackItemStatus` | C | "Owned" is stated at category level. Item names are FEATURE-005 |
| G9 | Empty `requiredGear` yields `readinessPercentage: 100` | `calculateReadinessPercentage` | A | The percentage is not presented as an achievement when nothing is recommended (section 19) |
| G10 | The forecast has no condition word, only three numbers; temperature is a daily mean | `WeatherServiceClient` | A | Honest labels (section 17). No invented condition |
| G11 | A date beyond the forecast range returns no weather | Provider error → `weatherAvailable: false` | A | Weather-unavailable state (section 17) |
| G12 | No browser path to `trail-service` or to the pack endpoint through one origin | No gateway routes; proxy covers `/api/planner` only | A | Two development proxy entries (section 26). Production routing is future infrastructure work |
| G13 | The dataset is eight demo trails | `DEMO_SEED` | A | `source` is shown honestly as sample data (section 7.1) |
| G14 | No saved-trip resource | No such endpoint or entity | A | The selection lives in the URL (section 12). A saved trip is C |
| G15 | Missing gear cannot be added from the product yet | `/gear` is a placeholder; gear CRUD is a later feature | A | Missing rows have no action (section 18). See Q3 |

### 6.1 RESOLVED — BACKEND CONTRACT GAP (B1)

`GET /api/trails/{id}` now includes `scenery` and `baselineGearRequirements` in `TrailDetailResponse`. `TrailService.getTrailDetail` populates both fields with the same repository lookups used by Trail Summary and nearby results, so the shared fields remain consistent.

`recommendation-service` already deserializes the detail response into its client `TrailSummaryResponse`. The added JSON fields therefore reach `GearRequirementService` through the existing Pack path with no recommendation production change. Existing logic combines baseline and weather requirements, removes duplicate categories, applies category-level ownership, and calculates readiness from the corrected set. Weather failure still returns baseline categories with `weatherAvailable: false`.

Focused tests cover Trail Detail mapping, multiple baseline categories, nullable route and cover image, missing trails, client deserialization, mild weather, weather failure, weather additions, duplicate removal, ownership, and readiness. The Pack request and response contracts are unchanged.

## 7. Trail Detail

### 7.1 Data rules

Trail Detail answers four questions, in this order: what is this trail, how demanding is it, why did the planner recommend it, do I want to choose it.

Factual content comes from `GET /api/trails/{id}` only. The recommendation context supplies the scenery line, Why this trail, and the prefilled date, and nothing else: the name, description, and numbers are never taken from the planner session, even while the trail request is loading or after it fails.

| Content | Source | Presentation rule |
|---|---|---|
| Trail name | `name` | The page's `h1`. When `null`, the heading reads "Trail" |
| Difficulty | `difficulty` | Label through the existing mapping (`EASY` → Easy, `MODERATE` → Moderate, `HARD` → Hard). An unknown value is left out |
| Distance | `distanceKm` | Existing format: "5.8 km" |
| Elevation gain | `elevationGainM` | Existing format: "220 m gain" |
| Estimated duration | `estimatedDurationMin` | Existing format: "2 h", "3 h 15 min" |
| Description | `description` | Full text, as text. Left out when `null` |
| Scenery | Recommendation context `scenery[]` | Shown only with recommendation context, through the existing label mapping. Omitted otherwise, with no placeholder |
| Source | `source` | `DEMO_SEED` is shown as one quiet line stating that this is sample trail data. Any other value, or `null`, shows nothing. The wire value is never displayed |
| Cover image | `coverImageUrl` | When non-null, the image is shown, decorative unless the design gives it a role. When `null`, or when the image fails to load, the designed cover fallback of section 7.2 is shown. No photograph is downloaded, generated, or borrowed, and the preparation scene image is not presented as a picture of the trail |
| Route | `route` | FEATURE-004 does not draw routes (D10). The route region shows a route-unavailable message. No GPX or GeoJSON is fabricated, and `latitude` / `longitude` are not displayed as raw numbers |
| Trailhead coordinates | `latitude`, `longitude` | Not displayed |

A value that is `null` is left out with no placeholder such as "—" or "N/A", following FEATURE-003 section 12.1. Formatting and label functions are the existing ones in `features/planning/presentation.ts`, shared rather than copied (section 24).

### 7.2 Design

Trail Detail (State A) is a quiet reading page: one `paper` sheet centred on the `ink` shell, with no scene behind it (section 13). The sheet has two columns. The main column answers "what is this trail" and "how demanding is it": the trail name, the scenery line, a labelled facts row, the trail visual with the route line under it, the description, and the sample-data line. The rail answers "why did the planner recommend it" and "do I want to choose it": Why this trail, then the trip-date control beside Choose this trail. DOM order equals the order of section 7.1's four questions.

| Part | Specified in |
|---|---|
| Shell, header, Back to planning | 21.1, 21.2, 21.4 |
| Sheet geometry and columns per viewport tier | 21.3, 22.1 |
| Name, scenery line, facts row, description, sample-data line | 21.4 |
| Trail visual, cover fallback, route line | 21.5 |
| Trip-date control and Choose this trail | 21.7, 21.8 |
| States S1–S7 | 21.15 |

## 8. Why This Trail

### 8.1 Rules

| Rule | Behavior |
|---|---|
| Shown when | The recommendation lookup of section 4.2 succeeds **and** `score` is not `null` |
| Total | `score`, rounded, out of 100, as FEATURE-003 shows it |
| Parts | The five real breakdown fields, in this order, with the labels and maxima FEATURE-003 already uses (`plannerContent.results.breakdown`): `intent` "Your preferences" / 55, `weather` "Weather" / 15, `gear` "Your gear" / 15, `scenery` "Scenery" / 10, `proximity` "Distance from you" / 5. Each is shown as its rounded value over its maximum. A part that is `null` is left out. When `breakdown` is `null` only the total is shown |
| No qualitative labels | No "Excellent", "Good", "Fair", stars, or grades. A proportional bar is allowed because it is the same number drawn (value ÷ maximum); it must never be the only carrier of the value |
| No invented prose | The recommendation has no explanation text, so none is written. The only words are the heading, FEATURE-003's existing "Match score" and part labels, the scored-for caption, and one fixed caption (21.16) |
| Scored-for caption | The section states the date and starting point the trail was scored for, from `usedTripDate` and `usedStartingPoint` ("Scored for Sat, Oct 17 · from Vancouver"). This keeps it honest if the user then picks a different trip date |
| What the numbers are not | The section does not show a forecast, required gear, or distance from the user. Those were not returned with the recommendation |
| Not recomputed | No part is recalculated, rescaled, or re-fetched |
| Open by default | On Trail Detail the breakdown is visible without an extra click; this is the screen where the reasoning is the point |
| On Trip Preparation | The breakdown is not repeated. The way back to Trail Detail keeps `rec`, so the reasoning is one step away |

### 8.2 Design

Why this trail is the first block of the Trail Detail rail, open by default, on the sheet's `paper`. It shows the total as a number out of 100, then one row per non-null part with its label, its value over its maximum as text, and a thin proportional bar drawn from the same two numbers. Every value is text; the bars are decorative and hidden from assistive technology; nothing is colored by value. The scored-for caption and one fixed caption close the block. The full specification is 21.6; how it reads without color is 23.5.

## 9. Direct Navigation

`/trails/:trailId` opened without usable recommendation context (typed URL, bookmark, another tab, after New Plan, after sign-in as a different user):

| Aspect | Behavior |
|---|---|
| Factual content | Exactly as section 7.1 |
| Why this trail | Not rendered at all: no empty frame, no "no recommendation" notice, no zero scores |
| Scenery | Omitted (G4) |
| Trip date | Prefilled from the planner session's current trip date when one exists and is today or later; otherwise empty (section 11) |
| Choose this trail | Available, and needs a trip date (section 11) |
| Back to planning | Present and leads to `/home` |
| `trailId` not a UUID | The trail-not-found state, with **no request made** |
| Trail does not exist (`404`) | The trail-not-found state, with a way back to planning |

## 10. Back to Planning

| Rule | Behavior |
|---|---|
| Control | A link to `/home`, labelled Back to planning, present on Trail Detail in every state including loading, not-found, and error |
| What the user finds | The conversation, the `PlanningContext`, every recommendation group, the trip date, the starting point, and the draft, exactly as FEATURE-003 restores them on returning to `/home` in the same tab (FEATURE-003 section 16). Nothing is re-sent |
| How | FEATURE-003's existing store and session key. FEATURE-004 creates no planner store, no copy of the conversation, and never writes to the planner's state |
| Browser Back | Has the same result as the link when the user came from the planner |
| From Trip Preparation | A way back to Trail Detail (keeping `rec` when present) and a way to `/home` are both available |
| After New Plan or a session end | The planner is empty, as FEATURE-003 defines. Trail Detail then behaves as direct navigation |

## 11. Trail Selection

### 11.1 Choose this trail

Choose this trail is the feature's one decision. Activating it navigates to `/trails/{trailId}/prepare/{tripDate}`, carrying `rec` when present. It makes no API request itself and stores nothing: there is no saved-trip resource (G14), and none is created.

| Rule | Behavior |
|---|---|
| Needs | A loaded trail and a valid trip date |
| Available when | The trail has loaded. It is not shown in the loading, not-found, or error states |
| Without a valid date | The control stays enabled. Activating it shows visible guidance at the trip-date control and moves focus there; nothing is navigated and no date is invented (same rule as FEATURE-003 D7) |
| Navigation | A normal history entry, so browser Back returns to Trail Detail |
| Naming | "Choose this trail" is the user's wording for this action. PRD section 11.3 calls the action "Plan This Trip" (Q5) |

### 11.2 Trip date

The pack request needs a date, and a recommendation was scored for one. The user is never asked to retype a date the product already has, and is never sent forward with one that cannot work.

| Rule | Behavior |
|---|---|
| Control | One compact trip-date control beside Choose this trail. It reuses FEATURE-003's date rules and control behavior: native date input, today or later, no maximum (FEATURE-003 D4, D19, section 11.5) |
| Prefill order | 1. `usedTripDate` from the recommendation context. 2. Otherwise the planner session's current `tripDate`. 3. Otherwise empty. A candidate before today (device-local calendar) is skipped |
| Past recommendation date | When `usedTripDate` is before today, Why this trail still shows with its scored-for caption, and the date falls through to the next candidate |
| Changing it | Allowed. The change is local to this screen: it is not written to the planner session, and it does not re-score anything |
| Validity | A real calendar date, `YYYY-MM-DD`, today or later by the device's calendar |

The same control appears on Trip Preparation to show and change the date (section 12).

## 12. Selected-Trip State

**The selection is the Preparation URL** (D2). `/trails/:trailId/prepare/:tripDate` holds the whole minimum preparation context: which trail and which day. Nothing else records that a trail was chosen.

| Question | Answer |
|---|---|
| Where it lives | The path. `rec` may ride along as a query parameter for the way back to Trail Detail |
| Why the path, not a query parameter | FEATURE-002's return destination keeps the pathname only. With the date in the path, the screen survives a sign-in round trip with no change to how destinations are stored (section 25) |
| Why not session storage or a store | It would be a second source of truth for two values the URL already holds, and would need its own owner rule. A trail id and a date are not user data |
| Reload | The URL is unchanged, so the screen rebuilds: the trail and pack requests run again |
| Direct navigation | Works. A valid URL is a valid selection; having pressed Choose this trail in this tab is not required |
| `trailId` not a UUID | Trail-not-found state. No request |
| Trail does not exist | Trail-not-found state |
| `tripDate` missing (`/trails/:trailId/prepare`), not a real date, or before today | The choose-a-date state: the trail is shown, the trip-date control asks for a date, **no pack request is made**, and no date is assumed. Choosing a date replaces the URL (history replace) and loads the pack |
| Changing the date | The trip-date control on Preparation replaces the URL with the new date (history replace) and loads the pack for it |
| Changing the trail | Back to Trail Detail or to planning, then Choose this trail on another trail |
| What the planner shows | Nothing. `/home` does not display or remember a chosen trail |
| Cross-user | The URL contains no user data. Pack results are cached per user and cleared when the session ends (section 25) |

## 13. Preparation Visual Environment

### 13.1 What the scene means

The Home media (FEATURE-003 section 8) shows a room in which someone plans at a desk. The preparation scene shows the same kind of room, in the same light, with the same mountains in the window, but the activity has changed: gear is laid out on the floor and a pack is being filled. The picture says one thing: a trip has been chosen and getting ready has begun.

For that reason the scene belongs to Trip Preparation only. It is the visible consequence of Choose this trail. It is not shown while the user is still deciding, because a room full of gear being packed would say "chosen" before the user has chosen, and because a large picture beside a trail's name is read as a picture of that trail.

| Journey step | Visual environment | What it tells the user |
|---|---|---|
| `/home` (FEATURE-003) | Planning room, looping video, planner panel at the left | I am describing the trip I want |
| Trail Detail, State A | No scene. A `paper` sheet on the `ink` shell | I am reading about one trail and deciding |
| Trip Preparation, State B | Preparation scene, static, briefing panel at the left | I chose this trail; now I am preparing for it |

### 13.2 How State A and State B relate

The two states do not share a composition. They share the shell and nothing else, so the difference between deciding and preparing is visible at a glance and does not rest on a label.

| | State A — Trail Detail | State B — Trip Preparation |
|---|---|---|
| Background | Solid `ink`. The scene image is neither shown nor requested | The preparation scene, full viewport (section 14.3) |
| Content surface | One opaque `paper` sheet, centred, `ink` text | One translucent `ink` panel at the left, `snow` text |
| Share of the viewport | The sheet is the page | With a typical list the panel takes about 18–36% of the viewport at the four desktop reference sizes; the scene has the rest (21.10) |
| `h1` | The trail name | "Preparing for" and the trail name |
| Primary action | Choose this trail, the only `conifer` element | None in FEATURE-004 (21.18) |
| Document scroll | The page may scroll on short viewports | The page does not scroll at 1024px wide or more; the panel's body scrolls |
| Shared with the other state | The shell's `ink` base; the header's items, position, and height (21.2); the type scale; the focus ring; the trip-date control's behavior | The same |

Continuity with `/home`: the Preparation panel uses the planner panel's left edge, top edge, radius, and surface (FEATURE-003 sections 9.2 and 9.4), so the user who planned in a panel at the left of a room finds the briefing in a panel at the left of a room. It is narrower than the planner panel, because a briefing needs less width than a conversation and State B is where the scene should be most visible.

How the design keeps the lead constraints below:

| Constraint | Design measure |
|---|---|
| The scene is never a picture of the trail | It never appears on Trail Detail. On Preparation no caption, label, or heading refers to the picture |
| The figure is not the user | No text names the figure, addresses it, or sits on it. The heading says "Preparing for {trail}", which describes the trip, not the person in the picture |
| Gear in the picture is not the user's or the recommended gear | Gear rows carry no thumbnail, no per-category icon, no pointer, line, or marker toward the picture, and no hover effect that could seem to select an object. The scene takes no pointer events and the cursor over it is the default arrow |
| No full-viewport opaque block, no full-frame overlay | One bounded panel and two local header scrims (14.3). Everything else is the image exactly as delivered |

### 13.3 The transition

The transition is an ordinary route change. There is no shared element, no exit animation, no animation library, and no View Transitions dependency.

| Step | What happens |
|---|---|
| 1 | Choose this trail navigates. State A is removed at once |
| 2 | State B renders on the same `ink` base with the header in the same place, so the header does not appear to move |
| 3 | The panel appears: opacity 0 → 1 with a 4px rise over `--duration-base` (240ms). Focus is on its `h1`, which reads "Preparing for {trail name}" |
| 4 | The scene fades in from the base over `--duration-scene-fade` (1200ms, `--ease-scene`) once the image has decoded. On a first visit this follows the panel; on a later visit the image is cached and the fade starts at once |

The room coming up around a panel that already names the chosen trail is the whole gesture. What the user is told, in order: the words ("Preparing for …"), the trip date in the date control, then the room. The words do not depend on the image.

Browser Back returns to Trail Detail with no animation. Under `prefers-reduced-motion: reduce` steps 3 and 4 have no fade and no rise: the panel and the scene appear at once (21.19).

Lead constraints:

- The existing image is the primary visual environment of Trip Preparation. No new image, no downloaded image, no generic gradient in its place, no reuse of the Home loop video, no new video.
- It is a static pre-rendered image: no 3D, no parallax library, no canvas, no motion that needs a Pause control.
- The scene must stay part of the experience. A full-viewport opaque content block over it is not acceptable, and neither is a broad full-frame dark overlay (DESIGN_SYSTEM section 16).
- The figure in the image is atmosphere. It is not the persistent avatar (PRD sections 16 and 17) and must never be labelled or treated as the user.
- The gear visible in the image is not the user's gear and not the recommended gear. The interface must not imply a link between an object in the picture and a row in the list, and no object in the picture is interactive.
- Whether Trail Detail also uses the image, and how prominently, is a design decision; the user must be able to tell "I am deciding" from "I chose, now I am preparing".

## 14. Preparation Background Asset

### 14.1 The actual asset

| Property | Value |
|---|---|
| File | `Project/Frontend/public/media/img/preparation bg.png` |
| Name on disk | `preparation bg.png`, **with a space** |
| Public URL | `/media/img/preparation%20bg.png` (the space is percent-encoded in the URL; a CSS `url()` must quote or encode it) |
| Dimensions | 1672 × 941 px (ratio 1.777, effectively 16:9) |
| Size | 2,478,219 bytes (about 2.4 MB), PNG |
| Status in git | Untracked on 2026-10-12 |
| Siblings | The only file in `public/media/img/`. The Home media (`public/media/home/background.png`, same 1672 × 941) is a different image |

Rules:

- The file is used as delivered. It is not renamed, re-encoded, resized, duplicated, or imported into `src/` by this feature (same handling as FEATURE-003 D17). Its path is declared once, in one configuration module, so a later replacement is a one-line change.
- At 1672 px wide it is upscaled on a 1920 px viewport (about 1.15×). That is accepted; no higher-resolution asset is produced here.

### 14.2 Composition analysis

Read from the delivered file on 2026-10-12. "Scene x / y" is a fraction of the frame from the left / top. All coordinates in this section are estimates taken by eye from the image, to about ±2 points; they are art-direction guidance, not CSS coordinates.

The picture is a warm, bright, golden-hour interior of a wooden cabin, in sharp focus from the middle distance back, with three blurred foreground objects.

| Region (scene x, y) | Content | Role in the composition |
|---|---|---|
| x 61–88%, y 12–72% | A figure seen from behind, kneeling, reaching into a pack. Head at x 66–75%, y 12–25% | Primary subject |
| x 51–70%, y 27–66% | Large olive backpack, open, a blue and a cream layer inside | Primary subject |
| x 43–79%, y 0–23% | Window: sky, snow-capped range (x 56–78%, y 4–14%, highest summit near x 67%, y 4%), conifers | The destination. Second focal point |
| x 36–47%, y 52–65% | Pair of hiking boots | Laid-out gear |
| x 47–50%, y 48–62% | Green bottle | Laid-out gear |
| x 18–39%, y 59–76% | Green rain jacket, folded flat | Laid-out gear |
| x 35–52%, y 65–79% | Folded cream fleece | Laid-out gear |
| x 46–57%, y 62–72% | Olive pouch | Laid-out gear |
| x 57–70%, y 65–75% | Navy cap | Laid-out gear |
| x 49–60%, y 73–82% | Dark gloves | Laid-out gear |
| x 61–70%, y 77–83% | Headlamp | Laid-out gear |
| x 67–88%, y 72–85% | Open map | Laid-out gear |
| x 12–90%, y 62–100% | Patterned rug under the gear | Ground |
| x 85–89%, y 17–48% and x 88–95%, y 0–37% | Trekking poles and an orange jacket hanging by the door | Right-hand frame of the composition |
| x 0–13%, y 0–46% | Stone wall, stove pipe, kettles, wood stove with a lit fire (glow at x 4–11%, y 26–38%) | Warmth. Secondary |
| x 12–52%, y 0–50% | Hanging ivy, shelves, plants, a lantern (x 32–35%, y 17–24%), framed prints, bench with baskets, a plaid blanket, a cushion | Room detail. Secondary |
| x 0–15%, y 36–75% | Blurred plant, foreground | Expendable |
| x 7–27%, y 80–100% | Blurred green mug, foreground | Expendable |
| x 82–100%, y 46–100% | Blurred table edge, foreground | Expendable |
| x 95–100%, y 0–46% | Door edge | Expendable |

Luminance:

| Kind | Regions |
|---|---|
| Brightest | The fire; the window's sky and snow; the lantern; the sunlit floor at x 14–45%, y 47–58%; the rim light on the figure's hair and shoulder |
| Mid, warm, and busy | Walls, shelves, rug, the figure's fleece. This is most of the frame |
| Darkest | The stove body (x 0–13%, y 20–45%), the foreground mug, the figure's trousers. All small |

No region is dark, quiet, or large enough to carry text unaided. Every piece of text over this image needs its own surface or a scrim plateau; nothing can rely on the picture.

What must remain visible, in priority order. The crop and the panel placement of 14.3 and 21.10 are derived from this list:

1. The figure and the backpack, whole (x 51–88%, y 12–72%).
2. The laid-out gear to the right of the bottle (x 47–88%, y 48–85%).
3. The window's view, at least its left pane and the first summits (x 43–60%, y 0–23%).
4. The boots and the fleece (x 35–52%).
5. The hanging poles and jacket (x 85–95%).
6. The stove and fire. Given up: they are under the panel at every desktop size.

Safe zones. The same contract applies to any later replacement of this image (art-direction guidance, as in DESIGN_SYSTEM section 5):

| Zone | Scene region | Use |
|---|---|---|
| Interface zone | x 0–39% at 16:9, to 41% at 16:10, to 48% at 4:3; full height | The Preparation panel. The only place a large surface may sit: it costs the stove, the shelves, the rain jacket, and blurred foreground |
| Header zones | x 0 to the interface zone's right edge, and, on the right, from between x 61% and x 78% (it depends on the viewport and on the length of the signed-in identity, 14.3.3) to 100%; both y 0–13% | Header text, on two local scrims (14.3.3) |
| Clear window | Between the two header zones: at least x 43–60%, y 0–23%, at 1280px wide and more | Nothing is placed here, and no scrim crosses it |
| Subject zone | x 48–88%, y 12–86% | Never under interface at any of the four desktop reference viewports |
| Not suitable for any overlay | The centre, the bottom band (it would cover the gear), and the right third (it would cover the figure) | — |

### 14.3 Background behavior

The scene is used on Trip Preparation only (section 13). Trail Detail neither shows nor requests it.

#### 14.3.1 Layers, back to front

| # | Layer | Specification |
|---|---|---|
| 0 | Base | `ink` on the Preparation shell, with the fallback wash of 14.4 on top of it. Always painted, before any request |
| 1 | Scene image | One `img` whose `src` is the public URL of 14.1. `position: fixed`, all four edges on the viewport, `width: 100%`, `height: 100%`, `object-fit: cover`, `object-position` from 14.3.2. Opacity 0 until it has decoded, then 0 → 1 over `--duration-scene-fade` (1200ms, `--ease-scene`) |
| 2 | Header scrims | Two local blocks, 14.3.3 |
| 3 | Interface | Header and panel (section 21) |

Rules:

- Layers 0–2 are decorative: `aria-hidden="true"`, `pointer-events: none`. The image has `alt=""`, is not focusable, and is not draggable.
- The image keeps its aspect ratio at every size. It is never stretched, letterboxed, tiled, or repeated. Nothing but `object-fit: cover` and `object-position` changes how it is framed.
- There is no full-frame tint, no `backdrop-filter`, no text shadow, and no filter on the image anywhere on the screen.
- The image is static. It has no transform, no parallax, no slow zoom, and no animation after its one fade-in, so no Pause control exists or is needed.
- The image is requested once per visit and is not lazy-loaded. A date change, a pack request, a failure, or Retry does not remount, reload, or re-fade it.
- Being fixed to the viewport, it does not move when the page scrolls (which happens only below 1024px wide and in the short-viewport case of 22.2).
- The image is drawn larger than its 1672px width on any viewport wider than that: about 1.15× at 1920px, about 1.53× at 2560px. This softness is accepted (14.1).

#### 14.3.2 Crop

Two values, chosen from the priority list of 14.2. The horizontal value matters only when the viewport is narrower in shape than 16:9; the vertical value only when it is wider.

| Viewport width | `object-position` | Why |
|---|---|---|
| ≥1280px | `50% 30%` | Horizontal: the frame's two edges are equally cheap once the panel is on the left, so the crop is shared, which keeps the hanging jacket in frame on the right. Vertical: on a wide viewport most of the crop comes off the blurred foreground at the bottom, and the rest off the sky |
| 1024–1279px | `55% 30%` | At 4:3 a quarter of the frame's width is lost. The value keeps the visible right edge at scene x 89%, so the figure and the map stay whole; the hanging jacket is given up |
| <1024px | `84% 50%` | Section 22.3 |

What each reference shape shows. Sizes in px; scene fractions as in 14.2.

| Viewport | Shape | Image drawn at | Cropped | Visible scene |
|---|---|---|---|---|
| 1920×1080 | 16:9 | 1920 × 1081 | Nothing (under 1px) | The whole frame |
| 1366×768 | 16:9 | 1366 × 769 | Nothing (under 1px) | The whole frame |
| 1440×900 | 16:10 | 1599 × 900 | 80px off each side | x 5–95%: the blurred plant's edge and the door edge are lost; the orange jacket ends exactly on the right edge |
| 1280×800 | 16:10 | 1422 × 800 | 71px off each side | x 5–95% |
| 1024×768 | 4:3 | 1365 × 768 | 187px off the left, 153px off the right | x 13.7–88.8%: the stove and the orange jacket are lost; the poles touch the right edge; the figure and the map are whole |
| 2560×1080 | 21:9 | 2560 × 1441 | 108px off the top, 253px off the bottom | y 7.5–82.5%: the sky and the summit tips are lost at the top; the mug, the table edge, the rug's lower band, and the lower edges of the map and headlamp at the bottom |
| 3440×1440 | 21:9 | 3440 × 1936 | 149px off the top, 347px off the bottom | y 7.7–82.1%: as above |

On ultrawide viewports the image is not stretched: it is scaled until it covers and then cropped vertically as above. The panel stays on its 64px gutter at its 520px width (21.10), so it covers a smaller share of the frame (scene x 2.5–23% at 2560px) and more of the room is shown: the experience is a larger room with the same interface.

What the panel covers and what stays clear at each desktop reference size is in 21.10.

#### 14.3.3 Scrims and readability

Every piece of text on Trip Preparation uses exactly one of these mechanisms, so no text depends on the picture. Ratios are worst case, with a pure white image behind; the arithmetic is in 23.6.

| Mechanism | Used by | Value |
|---|---|---|
| Own surface, translucent | The panel. Text set on it is `snow` | `ink` at **0.88**. `snow` on it: at least 12.32:1 |
| Own surface, opaque | The date popover: `paper` with `ink` text | 16.04:1 |
| Scrim plateau | Header text (`snow`) | `ink` at **0.72**. At least 6.97:1 |
| Quiet control | Sign out, Menu | FEATURE-003's recipe: fill `ink` at 0.72, 1px solid `snow` border. At least 6.97:1 |

The header scrim is **two local blocks, not a band across the frame**. FEATURE-003's Home uses a full-width band because the top of that picture is ceiling rafters. In this picture the top-centre is the window and the mountains, the second focal point (14.2), and a full-width band at 0.72 would darken the summits at every viewport size. The header has content only at its two ends, so only the two ends are scrimmed. This applies from 1024px wide; below that the full-width band of FEATURE-003 section 8.3.3 is used (22.3).

| Block | Horizontal extent | Vertical extent | Feather |
|---|---|---|---|
| Left | From the viewport's left edge to the panel's right edge (gutter + panel width: 584 / 536 / 500 / 452px at the four reference widths) | From the top edge to the header's bottom edge, plus 40px | The lowest 40px fade to 0. The last 48px before the right end fade to 0, so the block ends exactly on the panel's edge line |
| Right | From 72px before the start edge of the header's right group (Gear, identity, Sign out) to the viewport's right edge | The same | The lowest 40px fade to 0. The first 48px fade in from 0; the next 24px are plateau before the first item |

- Inside each block, outside its feathers, the fill is exactly `ink` at 0.72. No text or control sits in a feather.
- Where a horizontal and a vertical feather meet, their opacities multiply.
- The right block is attached to the right group, so it is as wide as that group needs and no wider. The group's width depends on the identity's length (FEATURE-003 section 9.5 keeps its max-width: 240 / 240 / 200 / 160px by tier).
- Between the two blocks the image is shown exactly as delivered, from the top edge down.

How much of the window stays clear of the right block (estimated; the right group is about 182px plus the identity):

| Viewport | Right block begins at, with the longest identity | With a 100px identity | Snow-capped range (viewport x) | Share of the range left clear: longest / 100px identity |
|---|---:|---:|---|---:|
| 1920×1080 | 1362 | 1502 | 1075–1498 | 68% / 100% |
| 1440×900 | 890 | 1030 | 816–1168 | 21% / 61% |
| 1366×768 | 872 | 972 | 765–1065 | 36% / 69% |
| 1024×768 | 578 | 638 | 577–877 | 0% / 20% |

The window's left pane and the sky above it (scene x 43–60%) are clear at every viewport from 1280px wide, whatever the identity. At 1024×768 the clear part is scene x 47–56%.

#### 14.3.4 Loading

| Moment | What is visible |
|---|---|
| First paint | The base and wash (14.4), the header on its scrim blocks, and the panel with whatever state it is in. Every control works |
| Image decoded | The image fades in over 1200ms. Nothing in the interface moves, resizes, or re-renders |
| Image slow | The same as first paint, for as long as it takes. There is no spinner, no progress, and no message about the picture |
| Image failed | 14.4 |

No part of the layout reads the image's size, load state, or pixels. The panel's position, the header, the scrim blocks, and every request are identical with and without the image.

### 14.4 Failure fallback

The fallback is not a separate state that gets swapped in. It is layer 0 of 14.3.1, painted from the first frame under the image, so "not loaded yet" and "failed" look the same and neither can flash.

| Property | Value |
|---|---|
| Surface | `ink` across the viewport, with one wash over it: a radial gradient centred at 70% from the left and 35% from the top, 120% of the viewport's width by 90% of its height, from `conifer-press` at its centre to `ink` at 70% of its radius and beyond. Tokens and CSS only: no image, no pattern file |
| Meaning | A dark, slightly green room with a faint lift where the scene's subject would be. It is deliberately quiet: it stands in for the scene without pretending to be one |
| On failure | The `img` is removed from rendering (not left in place), so no broken-image icon, no alternative text, and no outline can be drawn. The request is not repeated automatically. Nothing is shown or announced to the user about the picture: it is decorative, and its absence is not an error the user can act on |
| Interface | The header, the two scrim blocks, the panel, and every control are in the same positions, at the same sizes, with the same behavior. The scrim blocks are still drawn; over the dark surface they are barely visible, which is harmless |
| Contrast | Every ratio of 23.6 is computed against white behind the translucent surfaces. Over this surface each of them is higher |
| Reduced motion | The same surface. Nothing in it moves in either mode |

The lead constraint "no generic gradient in its place" (section 13) concerns what the screen's visual environment is: that remains the delivered image. This surface is shown only while the image is absent.

## 15. Trip Preparation

Trip Preparation loads as soon as the route has a valid trail id and a valid trip date. It makes two independent requests:

| Request | Purpose | Failure |
|---|---|---|
| `GET /api/trails/{trailId}` | The trail's name and facts for the selected-trail summary, and a reliable not-found answer (G5). Shares its query with Trail Detail, so arriving from Trail Detail reuses the cached result | `404` → trail-not-found state for the whole screen. Any other failure → the summary falls back to the pack response's `trailName` alone; the pack section is unaffected |
| `POST /api/recommendations/pack` with `{ trailId, tripDate }` | Weather, recommended gear, ownership, readiness | Section 20. The trail summary still shows |

What the screen states, in order of importance:

1. Which trail is selected, and for which day.
2. Packing readiness (section 19).
3. Recommended gear, each Owned or Missing (section 18).
4. The weather the list was built for, or that it is unavailable (section 17).

It does not ask for the date again when the URL has a valid one, does not call the planner, does not call a weather provider, and does not call `GET /api/users/me/gear`.

## 16. Pack Behavior

| Rule | Behavior |
|---|---|
| Request | Exactly `{ "trailId": "<uuid>", "tripDate": "YYYY-MM-DD" }`, from the URL. Sent through `authenticatedApiRequest` |
| Server state | A TanStack Query **query** keyed by the signed-in subject, the trail id, and the trip date. It is a read, although it is a `POST` |
| When it runs | On entering Preparation with valid parameters, on reload, on a date change, and on Retry. Not on Trail Detail, not on hover, not on a timer |
| Freshness | Refetched when Preparation mounts, so a change to the user's gear made elsewhere is reflected on return. No polling |
| Timeout | One client timeout of 20 seconds per request, reported as a timeout failure |
| Automatic retry | At most the query client's existing single retry, and never for `400`, `401`, or `404` |
| Usable response | `requiredGear` is an array whose entries each have a string `category` and a boolean `owned`; `readinessPercentage` is a finite number from 0 to 100; `weatherAvailable` is a boolean. Otherwise the response is treated as a failure (general failure, Retry) and nothing from it is shown |
| Weather part | Usable only when `weatherAvailable` is `true` and `weather` has three finite numbers. Otherwise the weather is unavailable (section 17) and the rest of the response is still shown |
| Only real data | Nothing is added to the response: no SKUs, brands, models, prices, shops, quantities, links, or Equipped state. No category is added or removed, and no `owned` value is changed |
| Trail name | `trailName` is used only when the trail request did not supply a name |
| Mismatch | A response whose `trailId` differs from the route's is discarded and treated as a failure |

## 17. Weather

| Rule | Behavior |
|---|---|
| Available | `weatherAvailable: true` with a usable `weather`: three values are shown as preparation context for the trip date and trailhead |
| `temperatureC` | Rounded to a whole degree, labelled as the day's **average** temperature. Never "High", "Low", or "Feels like" |
| `precipitationProbability` | Rounded to a whole percent, labelled as the **chance of precipitation**. Not "rain": the value does not say which kind |
| `windSpeedKmh` | Rounded to a whole km/h, labelled as wind **up to** that speed (it is the day's maximum) |
| No invented condition | No "Sunny", "Rainy", "Cold", weather icon chosen from the numbers, or advice sentence. The backend returns none, and deriving one would duplicate its rules |
| Not a guarantee | The forecast is context for the list. No wording suggests the day is safe, suitable, or approved for hiking |
| Unavailable | `weatherAvailable: false`, or an unusable `weather`: an honest weather-unavailable statement replaces the three values. The rest of Preparation stays fully usable, and the gear list is shown as returned, with one plain line saying it does not account for the forecast |
| No client weather | React never calls a weather provider and never re-implements the gear thresholds of section 5.2 |
| No per-item reason | The interface does not say "because rain is likely" beside a category (G7) |

## 18. Recommended / Owned / Missing

Product semantics (PRD section 13.2): **Owned ≠ Recommended ≠ Equipped.** FEATURE-004 presents three of the four states and does not introduce the fourth.

| State | Meaning here | Source |
|---|---|---|
| Recommended | The backend recommends bringing or wearing gear of this category for this trail on this date | Every entry of `requiredGear` |
| Owned | The user's gear list has at least one item in that category | `owned: true` |
| Missing | Recommended, and the user's gear list has no item in that category | `owned: false` |
| Equipped | **Not in FEATURE-004.** Nothing is marked worn, carried, packed, selected, or checked off | — |

Rules:

| Rule | Behavior |
|---|---|
| One row per entry | Each `requiredGear` entry is one row: a category label and its state. No row is added, merged, or dropped |
| Labels | Wire values map to these labels and are never displayed raw: `FOOTWEAR` Hiking footwear · `RAIN_GEAR` Rain gear · `WARM_LAYER` Warm layer · `WIND_LAYER` Wind layer · `TREKKING_POLES` Trekking poles · `TRACTION` Traction · `HEADLAMP` Headlamp · `BACKPACK` Backpack · `WATER` Water · `FOOD` Food · `SUN_PROTECTION` Sun protection |
| Unknown category | A value outside the list above is still shown, as "Other gear", with its real state. Hiding it would make the list disagree with the backend's readiness |
| Order | Missing rows first, then Owned. Within each group, the enum order of section 5.2. The backend's baseline order is not stable, so the interface does not depend on it |
| State is never color alone | Each row carries its state as a word (Owned, Missing) and a distinct icon shape, in addition to any color |
| Not a checklist | Rows are not checkboxes, toggles, or buttons, and have no pressed or selected state. Ticking things off is Equipped, which is FEATURE-005 |
| Category-level | "Owned" is not followed by an item name, brand, or count (G8) |
| Missing has no action | No "Add", "Buy", shop link, product suggestion, or link to `/gear`, which is still a placeholder (G15, Q3) |
| Ownership is the backend's | React does not compute ownership and does not call the gear endpoint to do so |
| Counts | "3 of 4" style counts may be shown. They are counted from the rows displayed, and are not a second readiness calculation |

## 19. Readiness

| Rule | Behavior |
|---|---|
| Value | `readinessPercentage` exactly as returned, shown as a whole percent. It is never recalculated, rounded differently, weighted, or adjusted by the frontend |
| Label | "Packing readiness". It measures one thing: how many of the recommended gear categories the user owns |
| What it must not say | Not a trail-safety score, a fitness score, a weather-safety guarantee, or permission to hike. No "You're ready to go", "Safe to hike", "Trip readiness", "You are 75% prepared for this trail", and no celebratory treatment at 100% |
| Explanation | One plain supporting line states what the number counts |
| Visual | A meter may accompany the number. The number is always present as text, and the meter is labelled for assistive technology (section 23) |
| No color verdict | The meter does not turn red, amber, or green by threshold. A threshold would be an invented judgment |
| Empty `requiredGear` | The percentage and meter are **not shown**. The screen says that no specific gear is recommended for this trip, in neutral words. The backend returns `100` for an empty list (G9), and "100% ready" with nothing listed would overstate. This is suppression, not recalculation |
| Weather unavailable | The readiness value is still the backend's and is still shown, beside the line of section 17 |

## 20. Loading, Error, Empty, and Fallback States

Behavior is fixed here. Layout, wording, and focus for each state are in section 21.

General rules: no state shows a service name, an HTTP status, a class name, or backend error text. No state fabricates data. Every waiting state is announced to assistive technology and is bounded by the request timeout. Retry repeats only the failed request.

| # | State | Trigger | Behavior |
|---|---|---|---|
| S1 | Trail loading | Trail request in flight | Loading feedback in place of the trail content. Back to planning is usable. No Choose this trail |
| S2 | Trail not found | `trailId` is not a UUID (no request), or `404` | A not-found statement and Back to planning. No Retry: repeating cannot help |
| S3 | Trail unavailable | Network error, `5xx`, timeout, unusable body | A general failure statement, **Retry**, and Back to planning. Nothing is rendered from the planner session in its place |
| S4 | Cover image unavailable | `coverImageUrl` is `null`, or the image fails to load | The designed cover fallback. Not an error message |
| S5 | Route unavailable | Always in FEATURE-004 (D10) | A quiet route-unavailable message in the route region |
| S6 | No recommendation context | Lookup of section 4.2 finds nothing | Why this trail and the scenery line are absent. No message |
| S7 | Trip date needed, on Trail Detail | Choose this trail activated with no valid date | Guidance at the date control; focus moves to it |
| S8 | Choose a date, on Preparation | Date segment missing, not a real date, or before today | Trail summary and the date control. No pack request. No readiness, weather, or gear content |
| S9 | Pack loading | Pack request in flight | Loading feedback in the preparation content area. The trail summary and the scene are already visible |
| S10 | Pack unavailable | Network error, `5xx` (including a gear-service or trail-service failure, G6), unusable or mismatched response | A general failure statement and **Retry**. The trail summary stays. No stale or partial pack content |
| S11 | Pack timeout | No response within 20 s | As S10, worded as taking too long, with **Retry** |
| S12 | Date not accepted | Pack answers `400` | As S8, with a statement that the date cannot be used. No Retry with the same date |
| S13 | Weather unavailable | Section 17 | Weather-unavailable statement; everything else shown |
| S14 | No gear recommended | `requiredGear` is empty | Section 19: neutral statement, no percentage |
| S15 | All missing | Every row `owned: false` | The ordinary list. Readiness reads 0%, with no alarm treatment and no claim that the gear list is empty: the response does not say so |
| S16 | Session ended | `getAccessToken()` rejects with `NotAuthenticatedError`, or a request answers `401` | FEATURE-002's session-expired handling takes over; no feature-specific error is drawn. After sign-in the user returns to the same screen (section 25) |
| S17 | Preparation image failed or not yet loaded | Image error, or not loaded yet | The fallback surface of section 14.4. All content and controls identical |

## 21. UI/UX Design

Reading guide: 21.1–21.2 apply to both screens. 21.3–21.8 are Trail Detail (State A). 21.9 is the transition. 21.10–21.14 are Trip Preparation (State B). 21.15 gives every state of section 20. 21.16 is the copy deck. 21.17 lists interaction states. 21.18 is the position reserved for FEATURE-005. 21.19 is motion.

Values are feature-level values in the manner of FEATURE-003 D27: colors are Design System tokens, and geometry that FEATURE-003 already fixed for the Home (tiers, gutters, header, panel surface, focus ring, date control) is reused, not redefined. All sizes are px. Tiers by viewport width, as in FEATURE-003 section 9.2: **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279. Below 1024px is section 22.3.

### 21.1 Shell and layers

Both routes render in a full-viewport shell inside `ProtectedRoute`, outside `AppLayout` (section 24).

| Property | Trail Detail | Trip Preparation |
|---|---|---|
| Base | `ink`, `min-height: 100dvh` | `ink`, `min-height: 100dvh` |
| Background | None | The scene and its layers (14.3.1) |
| Header | 21.2, on the solid base | 21.2, on the two scrim blocks (14.3.3) |
| `main` | Back to planning, then the sheet (21.3) | The panel (21.10) |
| Document scroll | Vertical, when the sheet is taller than the viewport (22.1) | None from 1024px wide, except the short-viewport case (22.2) |
| Horizontal scroll | Never | Never |

Shared tier values:

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Gutter (left and right) | 64 | 56 | 40 | 32 |
| Header height | 72 | 72 | 64 | 64 |

### 21.2 Header

The header is the Home header of FEATURE-003 section 9.5 with one item removed. Its items, their order, their type, their states, and FEATURE-002's account behavior are unchanged.

```text
|gutter| Brand                                              Gear   identity   Sign out |gutter|
```

| Item | Specification |
|---|---|
| Brand | As FEATURE-003 9.5: "Outdoor Trip Companion", `snow`, 16/24, weight 700; a link to `/home` |
| New Plan | **Not rendered.** It clears the planner's conversation and belongs to `/home` only. Nothing takes its place and no gap is kept for it |
| Gear, identity, Sign out | As FEATURE-003 9.5, including the identity's max-width per tier and the `signing-out` state (`main` inert, `aria-busy="true"`, opacity 0.4) |
| Background control | None. Nothing on either screen moves |
| Surface, Trail Detail | None needed: the header sits on solid `ink` (`snow` on `ink`, 17.48:1). No band, border, or shadow |
| Surface, Trip Preparation | The two scrim blocks of 14.3.3. No band across the frame, no border, no shadow |
| Position | One row at the top, full width, horizontal padding equal to the gutter. In normal flow, not sticky: on Trail Detail it scrolls away with the page |
| DOM order | Brand, Gear, identity, Sign out |

No entry is added for Trail Detail or Trip Preparation themselves, and none for pages that do not exist.

### 21.3 Trail Detail: composition

What the user should perceive, in order: 1. the trail's name; 2. how demanding it is (the facts row); 3. that there is one decision to make (Choose this trail, the only `conifer` element on the screen); 4. why it was recommended; 5. the description and the visual; 6. the quiet lines (route, sample data, scored-for).

```text
header
← Back to planning
┌───────────────────────────────────── sheet (paper) ─────────────────────────────────────┐
│  MAIN COLUMN                                    │  RAIL (sticky)                         │
│  Trail name (h1)                                │  Why this trail (h2)                   │
│  Scenery line                                   │  86 /100  Match score                  │
│  Difficulty  Distance  Elevation  Est. time     │  five parts, value / maximum, bar      │
│  ┌────────── trail visual, 5:2 ──────────┐      │  Scored for …  ·  fixed caption        │
│  └───────────────────────────────────────┘      │  ────────────────────────────────────  │
│  Route line                                     │  [ Trip date ]  [ Choose this trail → ]│
│  Description                                    │  message slot                          │
│  Sample-data line                               │                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

Geometry:

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Back to planning row | 44 tall, 8 below the header | same | 44 tall, directly below the header | same |
| Gap from that row to the sheet | 12 | 12 | 8 | 8 |
| Sheet top (from the viewport top, unscrolled) | 136 | 136 | 116 | 116 |
| Sheet width | 1120 | 1120 | 1120 | 960 |
| Sheet padding | 48 | 48 | 48 | 32 |
| Rail width | 400 | 400 | 400 | 340 |
| Column gap | 56 | 56 | 56 | 40 |
| Main column width | 568 | 568 | 568 | 516 |
| Page padding under the sheet | 40 | 40 | 24 | 24 |

- The sheet is centred in the viewport. Above 1920px wide it stays 1120px and centred. (The Home and Preparation panels are edge-anchored because they stand beside a scene; this page has no scene, so DESIGN_SYSTEM section 4.1's centred foreground applies.)
- Sheet surface: `paper`, radius 24px, no shadow, a 1px transparent border (an edge in forced-colors mode), no `overflow: hidden`. Its height is its content's, with a minimum of 320px.
- Two columns: the main column is flexible, the rail is fixed-width and `position: sticky` 24px from the viewport top, aligned to the top of the sheet's content. When the page scrolls, the decision row stays in view.
- Without recommendation context the rail holds only the decision row (21.8), at the top of the rail. The columns do not change width.
- The sheet's position and width depend on the viewport only. Its height follows its content.

Reference boxes (sheet x-extent, top): 1920×1080: 400–1520, 136. 1440×900: 160–1280, 136. 1366×768: 123–1243, 116. 1024×768: 32–992, 116.

### 21.4 Trail Detail: content components

| Component | Specification |
|---|---|
| Back to planning | A link to `/home` (section 10), on the `ink` base above the sheet. 16px lucide `ArrowLeft`, 8px, label SH1; `snow`, 14/20, weight 600. Hit box 44px tall with 12px horizontal padding, offset so the icon's left edge is on the sheet's left edge. Present in every state |
| Trail name | The `h1`. `ink`; 40/46 (XL, L), 36/42 (M), 32/38 (S); weight 600; letter-spacing −0.02em. Wraps; `overflow-wrap: anywhere`; never truncated. `tabindex="-1"` (it receives focus on arrival, 23.2). `null` name: TD1 |
| Scenery line | 8px below the name. `stone`, 16/24. The context's scenery labels joined by " · " ("Lake · Forest"), after visually hidden text "Scenery: ". Plain text, not chips. Rendered only with recommendation context and at least one recognized label |
| Facts row | 20px below. A `dl` between two 1px rules in `ink` at 0.12, padding 16px 0. One pair per non-null fact, in equal columns, 16px apart, in this order: Difficulty, Distance, Elevation, Estimated time (labels TD3). `dt`: `stone`, 14/20. `dd`: `ink`, 20/28, weight 600, 2px below, in the existing formats ("Moderate", "5.8 km", "220 m gain", "2 h"). A `null` fact removes its pair and the remaining pairs share the width; with no facts the row is not rendered |
| Trail visual | 24px below the facts row. 21.5 |
| Description | 24px below the route line. `ink`, 16/26, full text, never clamped, `white-space: pre-line`, `overflow-wrap: anywhere`, rendered as a text node. Not rendered when `null` |
| Sample-data line | 16px below. `stone`, 14/20, text TD6. Rendered only when `source` is `DEMO_SEED` |

The facts row replaces the dotted one-line form used on the planner's card: on this screen "how demanding is it" is the second question, so each fact gets a label and a larger value. The value formats are the shared ones (section 7.1); nothing is reformatted.

### 21.5 Trail visual, cover fallback, route line

The visual region is one box and one line. Its size never depends on what is in it.

| Part | Specification |
|---|---|
| Box | The main column's width, `aspect-ratio: 5 / 2` (568 × 227; 516 × 206 in tier S). Radius 16px. It clips its content; it contains nothing focusable |
| Plate (the cover fallback) | Always painted as the box's own background, under any image. Three layers, tokens and CSS gradients only. **Sky:** a vertical gradient from `ink` at the top toward `conifer-press`, reaching the midpoint of the two at the bottom edge. **Far hill:** an ellipse of `conifer-press` with a hard edge, radii 60% of the box's width by 60% of its height, centred 78% from the left and 110% from the top. **Near hill:** an ellipse of `conifer-deep` with a hard edge, radii 70% by 70%, centred 22% from the left and 125% from the top, over the far hill |
| Plate caption | TD4, `snow`, 14/20, at the box's bottom-left, 16px from both edges (it sits on the near hill: `snow` on `conifer-deep`, 10.23:1). No icon. Rendered when `coverImageUrl` is `null` and when the image has failed; not rendered while an image is loading or shown |
| Image | Only when `coverImageUrl` is non-null: an `img` filling the box, `object-fit: cover`, `object-position: 50% 50%`, `alt=""`. Opacity 0 until loaded, then 0 → 1 over `--duration-base`. On error it is removed from rendering and the caption appears. No broken-image icon and no alternative text can be drawn |
| Route line | 10px below the box, a `p`: 16px lucide `Map` in `stone`, 8px, text TD5 in `stone`, 14/20. Always rendered once the trail has loaded (D10), whatever `route` holds. No frame, no map area, no line, no coordinates |

Why the plate looks as it does: it is an abstract, flat, three-tone landscape that is the same for every trail, with a caption saying there is no photo. It cannot be mistaken for a photograph or for a map of this trail, and it is not an error message. `conifer` itself is not used in it, so Choose this trail remains the only `conifer` element. The preparation scene is not used here (section 13).

### 21.6 Why this trail

Rendered only under the rule of section 8.1. A `section` labelled by its heading, the first block of the rail, directly on the sheet's `paper`: no card, no border, no fill of its own.

| Part | Specification | When the data is null |
|---|---|---|
| Heading | `h2`, text TD7, `ink`, 20/28, weight 600 | — |
| Total | 12px below. The rounded `score` in `ink`, 40/44, weight 700, tabular numerals; then "/100" in `stone`, 16/24, 4px after it on the same baseline. Under it, 2px: TD8 in `stone`, 14/20 | `score` null: the whole section is absent (8.1) |
| Parts | 20px below: a `dl`, one part per non-null breakdown field, in the order and with the labels and maxima of 8.1 (TD9), 14px apart. Line 1: the label (`dt`, `ink`, 14/20) at the start and the value (`dd`, `ink`, 14/20, weight 600, tabular) at the end, written "48 / 55". Line 2, 6px below: the bar | A null part's row is dropped. `breakdown` null: no `dl` |
| Bar | 6px tall, the row's full width, radius 3px, 1px solid `stone` outline, no fill in the empty part. The filled part is solid `ink` from the start edge, its width the rounded value ÷ the maximum, limited to 0–100%. `aria-hidden="true"` | — |
| Scored-for caption | 20px below the parts (or the total): TD10 in `stone`, 14/20, built from `usedTripDate` in the date wording of FEATURE-003 section 11.5.1 and from `usedStartingPoint` | — |
| Fixed caption | 4px below: TD11 in `stone`, 14/20 | — |

- Every bar uses the same two colors whatever its value. There is no color scale, no threshold, no grade, no star, and no icon.
- Each bar is scaled to its own maximum, so the five bars show how fully each criterion was met; the numbers beside them show that the criteria carry different weights. Both are the same two real numbers.
- The section has no control: nothing expands, collapses, or links. It is not a tab stop.
- If the user changes the trip date, this section does not change. The scored-for caption keeps the date the scores were made for.

### 21.7 Trip-date control

One component on both screens: FEATURE-003's date control (section 11.5), with its behavior unchanged: a `button` that shows the chosen date and opens a non-modal popover holding the title, the quick picks, and a native `<input type="date">` with `min` today and no `max`; message D1 for a past date; the date wording "Sat, Oct 17"; the accessible name "Trip date: {long date}" or "Trip date: not set". The popover's surface, contents, opening, closing, and focus behavior are exactly FEATURE-003 section 11.5.2.

What differs in FEATURE-004:

| Property | Value |
|---|---|
| Height | 44px with any pointer, so it matches the action beside it. Radius 10px, 12px horizontal padding, 16px icon, 6px, label in 14/20 |
| Tone | **On paper** (Trail Detail): FEATURE-003's styles unchanged. **On panel** (Trip Preparation): the table below |
| Popover placement, Trail Detail | Start-aligned with the control, 8px gap. **Above** the control when Why this trail is rendered (it opens over that section, inside the rail). **Below** the control when it is not |
| Popover placement, Trip Preparation | Below the control, start-aligned, 8px gap, drawn over the briefing. It may extend past the panel's bottom edge when the panel is short; the panel does not clip it |
| Effect of a choice, Trail Detail | Sets the date this screen will use. Nothing is requested and nothing is written anywhere (section 11.2) |
| Effect of a choice, Trip Preparation | Replaces the URL and loads the pack for the new date (section 12). The briefing shows S9 at once; content for the previous date is not left on screen |

States by tone:

| State | On paper | On panel |
|---|---|---|
| Unset | Icon `CalendarDays` in `stone`; label "Trip date", `ink`, weight 500; 1px dashed `stone` border; no fill | Icon and label `snow`, weight 500; 1px dashed `snow` border; no fill |
| Set | Label is the date, weight 600; 1px solid `stone` border; fill `ink` at 0.06 | Label is the date, `snow`, weight 600; 1px solid `snow` border; no fill |
| Hover, or popover open | Fill `ink` at 0.10 | Fill `snow` at 0.12 |
| Active | Fill `ink` at 0.10 | Fill `snow` at 0.20 |
| Focus-visible | Focus ring | Focus ring |
| Needs attention (S7, S12, and S8 for a past date) | 2px solid `ember` border; icon replaced by `CircleAlert` in `ember` | 2px solid `snow` border; icon replaced by `CircleAlert` in `snow`. `ember` is not used on the panel (about 2.5:1 there) |
| Disabled | None. The control is never disabled | None |

The message that goes with the control appears in a slot directly under its row, 8px below, and is referenced by the control's `aria-describedby`: a 16px icon, 8px, text in 14/20, weight 500. On paper the icon is `ember` and the text `ink`; on the panel both are `snow`. On Trail Detail the slot keeps a minimum height of 20px so that S7 moves nothing. On Trip Preparation it takes no height while empty: it is used only in S8 and S12, where no briefing is below it.

### 21.8 Choose this trail

The decision row is the last block of the rail: the trip-date control at the start, 12px, then the action filling the rest of the row. When Why this trail is rendered, a 1px rule in `ink` at 0.12 separates them, with 24px above and below it.

| Property | Value |
|---|---|
| Element | A `button` (its result depends on the date, so it is not a plain link). Label TD12, then 8px, then an 18px lucide `ArrowRight` |
| Geometry | 44px tall, radius 12px, 20px horizontal padding, label centred. Compact rounded, not a pill |
| Color | Fill `conifer`, label and icon `snow`, 16/24, weight 600 (8.05:1). The only `conifer` element on Trail Detail |
| Hover / active | `conifer-deep` / `conifer-press`, over `--duration-fast` |
| Focus-visible | Focus ring |
| Disabled | None. It is never disabled and never `aria-disabled` (section 11.1) |
| Loading | None. It makes no request; navigation is immediate |
| With a valid date | Navigates to Trip Preparation (section 11.1). Focus then follows 23.2 |
| Without a valid date | Does not navigate. The date control takes its needs-attention state, message TD13 appears in the slot as an alert, and focus moves to the date control. Its popover is not opened for the user. The state clears when a valid date is chosen |
| Rendered | Only when the trail has loaded. Not in S1, S2, or S3 |

The date sits beside the action so the pair reads as one sentence: this trail, on this day.

### 21.9 Transition from Trail Detail to Trip Preparation

Defined in section 13.3. In component terms:

- Choose this trail performs one client-side navigation. Nothing on Trail Detail animates out.
- Trip Preparation mounts its shell, header, panel, and scene together. The scene image is requested at that moment and not before.
- The panel's entrance (opacity and a 4px rise, 240ms) and the scene's fade (1200ms) are the only motion. Neither delays focus, the pack request, or any control.
- Returning with browser Back, or with the Trail details link, shows Trail Detail at once with focus on its `h1`.

### 21.10 Preparation panel: placement, geometry, surface

The briefing is one panel in the **left third** of the frame, under the header, with the scene open to its right.

Reason, from the image (14.2): the figure and the pack (scene x 51–88%), the laid-out gear (x 36–88%, along the bottom), and the window (x 43–79%, along the top) form an L that fills the centre, the right, the top, and the bottom of the frame. The only large area that holds none of them is the left third: the stove, the shelves, the hanging ivy, and blurred foreground. A panel there costs the fire and the rain jacket and nothing else of meaning. It is also where the planner panel stands on `/home`, so the step from planning to preparing keeps the interface in place and changes the room.

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Panel width | 520 | 480 | 460 | 420 |
| Panel left | gutter (64) | gutter (56) | gutter (40) | gutter (32) |
| Panel top | header + 32 (104) | header + 32 (104) | header + 16 (80) | header + 16 (80) |
| Bottom margin | 40 | 40 | 24 | 24 |

- The left edge, top edge, bottom margin, radius, and surface are the planner panel's (FEATURE-003 sections 9.2 and 9.4). The width is 140–160px less than the planner panel's: the briefing's longest line is a gear label and a state word, and the width given up goes to the scene.
- **Height follows content**, up to `100dvh − top − bottom margin`. The panel is anchored at its top edge and grows downward; nothing else on the screen is positioned relative to its height, so a change of state moves no other element. When the content is taller than the limit, only the briefing zone scrolls (21.11).
- Above 1920px wide the panel stays on the 64px gutter at 520px; the room grows.
- Surface: `ink` at 0.88, radius 24px, no shadow, no blur, a 1px transparent border, no `overflow: hidden`. Text set on it is `snow`. No `paper` card is placed inside it: the briefing is text and rules on one surface, not a stack of cards. The date popover is the only `paper` surface on the screen.
- `conifer` does not appear on Trip Preparation in FEATURE-004.

| Reference viewport | Panel box (x, y, width) | Height limit | Height with a 4-row list (estimated) | Share of the viewport |
|---|---|---:|---:|---:|
| 1920×1080 | 64, 104, 520 | 936 | About 730: no scrolling | 18% |
| 1440×900 | 56, 104, 480 | 756 | About 726: no scrolling | 27% |
| 1366×768 | 40, 80, 460 | 664 | 664: the briefing scrolls about 80px | 29% |
| 1024×768 | 32, 80, 420 | 664 | 664: the briefing scrolls about 80px | 35% |

Estimated capacity without scrolling: about nine rows at 1920×1080, four at 1440×900, and two at the two 768px-high sizes. A longer list scrolls inside the briefing; the strip and the trip block stay in place.

What stays clear of the panel. Horizontal extents in viewport px, with the crop of 14.3.2; estimated from the scene coordinates of 14.2.

| Scene content | 1920×1080 | 1440×900 | 1366×768 | 1024×768 |
|---|---|---|---|---|
| Panel right edge | 584 | 536 | 500 | 452 |
| Figure | 1171–1690 | 896–1328 | 833–1202 | 645–1014 |
| Backpack | 979–1344 | 736–1040 | 697–956 | 509–768 |
| Bottle, cap, gloves, headlamp, map | 902–1690 | 672–1328 | 642–1202 | 454–1014 |
| Window frame | 826–1517 | 608–1184 | 587–1079 | 400–891: its first 52px are behind the panel |
| Boots | 691–902 | 496–672: the first 40px are behind the panel | 492–642: the first 8px are behind the panel | Behind the panel |
| Folded fleece | 672–998 | 480–752: the first 56px behind | 478–710: the first 22px behind | 290–522: its last 70px are visible |
| Rain jacket | 346–749: its last 165px are visible | Behind the panel | Behind the panel | Behind the panel |
| Poles and hanging jacket | 1632–1824 | 1280–1440 | 1161–1298 | Poles at the right edge; jacket cropped |
| Stove and fire | Behind the panel | Behind the panel or cropped | Behind the panel | Cropped |

Guaranteed at all four reference viewports: the figure, the backpack, the bottle, the cap, the gloves, the headlamp, and the map are never under interface.

### 21.11 Preparation panel: anatomy and trip block

Three zones, top to bottom. Only the briefing scrolls.

| Zone | Size | Content |
|---|---|---|
| Strip | Min-height 44px; padding 0 12px; a 1px bottom rule in `snow` at 0.16 | At the start: a link to Trail Detail, keeping `rec` when present: 16px `ArrowLeft`, 8px, label SH2. At the end: a link to `/home`, label SH1, no icon. Both `snow`, 14/20, weight 600, 44px-tall hit boxes with 12px horizontal padding |
| Trip block | Padding 16px 24px; a 1px bottom rule in `snow` at 0.16 | The `h1`, the facts line, the date row, the message slot |
| Briefing | Fills the rest; `min-height: 0`; `overflow-y: auto`; `overscroll-behavior: contain`; padding 16px 24px 24px | Packing readiness (21.12), Recommended gear (21.13), Forecast (21.14), 24px apart; or the loading or failure block (21.15) |

Trip block:

| Part | Specification |
|---|---|
| `h1` | Two lines in one heading. Line 1: "Preparing for", `snow`, 14/20, weight 600. Line 2, 2px below: the trail name, `snow`, 28/34 (XL) or 24/30 (L, M, S), weight 600, letter-spacing −0.01em; wraps; `overflow-wrap: anywhere`; never truncated. Read as one phrase (TP1). `tabindex="-1"` |
| Name source | The trail request's `name`; if that request failed, the pack response's `trailName`; while neither is known, a skeleton bar (`snow` at 0.16, 60% × 28px, radius 8px) with visually hidden text so the heading reads TP2; if neither can be obtained, the visible words of TP2 |
| Facts line | 4px below. One wrapping line, `snow`, 14/20: difficulty (weight 600) · distance · elevation gain · duration, joined by " · ", in the planner card's formats. From the trail request only. A missing part is dropped with its separator; the line is dropped when all are missing or the trail request failed |
| Date row | 12px below. 44px tall. The trip-date control, on-panel tone (21.7), at the start. The end of the row is empty: it is the reserved position of 21.18 |
| Message slot | Under the date row (21.7) |

Briefing details: headings are `h2`, `snow`, 16/24, weight 600. The scrollbar is thin, with a thumb in `snow` at 0.40 and a transparent track. The briefing is a named, focusable scroll region (23.1). In S9, S10, and S11 the briefing has a minimum height of 136px so the panel does not collapse to a strip.

### 21.12 Packing readiness

The first block of the briefing.

```text
Packing readiness                                   60%
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                    ]
Counts how many of the recommended gear categories you own.
```

| Part | Specification |
|---|---|
| Heading | `h2`, text TP9, at the start of the row |
| Value | At the end of the same row: `readinessPercentage` as returned, as a whole number followed by "%" (TP10). `snow`, 32/36, weight 700, tabular numerals. Always present as text |
| Meter | 8px below. The block's full width, 10px tall, radius 5px. Track: a 1px solid `snow` outline with no fill. Filled part: solid `snow` from the start edge, its width the percentage of the track. `role="meter"` (23.4) |
| Explanation | 8px below: TP11, `snow`, 14/20, weight 400 |

- The meter has one appearance at every value. `snow` on the panel at 0%, at 50%, and at 100%: no red, amber, or green, no threshold, no change of weight, no icon, no badge, no animation, and nothing extra at 100%.
- At 0% the track is an empty outline; at 100% it is a solid bar. Both are still labelled by the number beside the heading.
- The filled width is drawn from the same returned number as the text. It is not computed from the rows.
- The explanation is fixed text. It states what is counted and makes no claim about the trip.
- The whole block is absent in S14 (empty `requiredGear`): no heading, no value, no meter, no explanation.

### 21.13 Recommended gear

A gear briefing: a short list read top to bottom, most pressing first. It is not a table (no column headers, no grid lines, no sorting) and not a checklist (nothing can be ticked).

| Part | Specification |
|---|---|
| Heading | `h2`, text TP12 |
| Count line | 2px below: TP13, `snow`, 14/20, weight 400. Counted from the rows displayed (section 18). A part whose count is zero is left out ("4 missing", "5 owned") |
| Forecast caveat | Only in S13: 6px below, a 16px `Info` icon in `snow`, 8px, TP17 in `snow`, 14/20 |
| List | 6px below: one `ul`, one `li` per `requiredGear` entry, in the order of section 18 (Missing first, then Owned; enum order within each) |
| Row | Min-height 40px, padding 8px 0, a 1px top rule in `snow` at 0.16 (the first row included). At the start: the category label of section 18, `snow`, 16/24; weight 600 on a Missing row, weight 400 on an Owned row. At the end: the state |
| State, Missing | 18px lucide `CircleDashed`, 6px, the word "Missing"; `snow`, 14/20, weight 600 |
| State, Owned | 18px lucide `CircleCheck`, 6px, the word "Owned"; `snow`, 14/20, weight 600 |
| Empty list (S14) | In place of the count line and the list: TP16, `snow`, 16/24. In S13 as well, TP18 follows it in the caveat's style |

- A row is static text. It is not a link, button, checkbox, or toggle; it has no hover, pressed, selected, or focus state; the cursor over it is the default arrow; it is not a tab stop.
- The state sits at the **end** of the row as a word with an icon, not at the start as a box. A mark at the start of a row reads as a checkbox; this one cannot be mistaken for a control.
- Owned and Missing differ in three ways, none of them color: the word, the icon's shape (a closed ring with a check against a dashed ring with nothing in it), and the label's weight. Every element is `snow`.
- Missing rows carry no action, link, hint, or price (section 18). All-missing (S15) is the ordinary list: no warning color, no icon beside the heading, no banner.
- There is no per-category icon and no thumbnail. A boot icon or a jacket icon would suggest a particular product, and would invite matching rows to objects in the picture (section 13).
- A long list makes the briefing scroll; rows are never hidden, collapsed, or paged.

### 21.14 Forecast

The last block of the briefing: the conditions the list was built for.

| Part | Specification |
|---|---|
| Heading | `h2`, text TP19 |
| Caption | 2px below: TP20, with the trip date in the "Sat, Oct 17" wording; `snow`, 14/20, weight 400 |
| Values | 6px below: a `dl` of three rows, each min-height 28px. Label (`dt`) at the start, `snow`, 14/20, weight 400. Value (`dd`) at the end, `snow`, 16/24, weight 600, tabular numerals. In this order: "Average temperature" — "12 °C"; "Chance of precipitation" — "40%"; "Wind up to" — "18 km/h" (TP21, TP22). Each number is rounded to a whole number; a negative temperature uses a minus sign ("−3 °C") |
| Unavailable (S13) | The heading stays. In place of the caption and the values: TP23, `snow`, 16/24. No icon, no Retry (the pack request succeeded; repeating it is not offered as a weather fix) |

- Text only. No sun, cloud, rain, snow, wind, or thermometer icon, no condition word, no color by value, and no sentence of advice.
- The three labels are the honest ones of section 17. "Average temperature" is never shortened to "Temp", "High", or "Low"; "Chance of precipitation" never becomes "Rain".
- The block makes no statement about whether the day suits the hike.

### 21.15 Screen states

Copy ids refer to 21.16. "Focus" says where focus is placed when the state is entered; "stays" means it is not moved.

Trail Detail:

| # | Layout | Copy | Focus |
|---|---|---|---|
| S1 Trail loading | The sheet at its normal width. Main column: a skeleton of the content to come, in static shapes filled with `ink` at 0.08, radius 8px: a 60% × 40px bar inside the `h1`; four 96 × 44px blocks in the facts row; the visual box showing the plate's sky layer only; three text lines (100%, 100%, 70% × 16px, 10px apart). Under the `h1`, a visible line: a 16px `LoaderCircle` in `stone`, spinning, 8px, text in `stone`, 14/20. The rail is not rendered. Back to planning is usable | TD2. After 10s the line reads SH7 | The `h1`, which holds visually hidden text TD2 |
| S2 Trail not found | The sheet at its minimum height. In the main column: the `h1` (`ink`, 32/38), text 8px below (`ink`, 16/24, max-width 560px), and 24px below a link to `/home` styled as a secondary button on paper (21.17) with an `ArrowLeft`. No Retry. No rail. The Back to planning link above the sheet is also present | SH5, SH6, SH1 | The `h1` |
| S3 Trail unavailable | As S2, with a Retry button (secondary on paper, `RotateCcw`) in place of the link in the sheet. Back to planning stays above the sheet. Nothing from the planner session is shown | TD14; TD15, or TD16 for a timeout; SH3 | The `h1`. If S3 replaces S1 the `h1` already has focus and stays |
| S3, Retry activated | The button shows its working state and keeps focus; the rest is unchanged. On success the content replaces the block; on failure S3 returns | SH4 | Stays on Retry. On success: the `h1` |
| S4 Cover unavailable | The plate with its caption, in the same box (21.5). Not styled as an error | TD4 | Stays |
| S5 Route unavailable | The route line (21.5). Always | TD5 | Stays |
| S6 No recommendation context | No scenery line, no Why this trail, no rule above the decision row. The rail holds the decision row only. No message | — | — |
| S7 Trip date needed | The date control in its needs-attention state; the message in the slot under the decision row, as an alert | TD13 | The date control |

Trip Preparation:

| # | Layout | Copy | Focus |
|---|---|---|---|
| S2 Trail not found | The panel holds one block and no strip: the `h1` (`snow`, 24/30), text 8px below (`snow`, 16/24), and 20px below a link to `/home` styled as a secondary button on the panel with an `ArrowLeft`. No date row, no briefing. The scene stays | SH5, SH6, SH1 | The `h1` |
| S8 Choose a date | Strip and trip block. The date control is unset (the URL's unusable date is not shown). The message is in the slot: an `Info` icon when the date was missing or not a date; a `CircleAlert` and the needs-attention state when it was before today. No briefing zone: the panel ends under the trip block | TP3, or TP4 for a past date | The `h1`. The message is the control's description |
| S9 Pack loading | Strip and trip block as normal. In the briefing: three 6px `snow` dots, 6px apart, 10px, then text in `snow`, 16/24 (the waiting indicator of FEATURE-003 section 13.3.1). No skeleton rows: the number of rows is not known | TP6. After 10s: SH7 | On arrival: the `h1`. After a date change: stays on the date control |
| S10 Pack unavailable | In the briefing: a 16px `CircleAlert` in `snow`, 8px, text in `snow`, 16/24; 16px below, a Retry button (secondary on the panel, `RotateCcw`). No readiness, gear, or forecast content from any earlier response | TP7, SH3 | Stays |
| S11 Pack timeout | As S10 | TP8, SH3 | Stays |
| S10 / S11, Retry activated | The button shows its working state and keeps focus. On success the briefing replaces the block; on failure the block returns | SH4 | Stays on Retry. On success: the first heading of the briefing (`tabindex="-1"`) |
| S12 Date not accepted | As S8, except that the date control keeps showing the refused date, in its needs-attention state, and the message is an alert. No Retry | TP5 | Stays. The date control is the next tab stop after the `h1` |
| S13 Weather unavailable | Readiness and the gear list as returned; the caveat under the gear heading; the forecast block's unavailable form. Nothing is disabled | TP17, TP23 | Stays |
| S14 No gear recommended | No readiness block. The gear block's empty form. The forecast block as normal, or as S13 | TP16 (and TP18 in S13) | Stays |
| S15 All missing | The ordinary briefing: every row Missing, the count line "{n} missing", the value "0%", the meter an empty outline. No warning treatment | — | Stays |
| S16 Session ended | FEATURE-002's handling. Nothing is drawn by this feature | — | FEATURE-002 |
| S17 Scene not loaded or failed | The fallback surface (14.4) behind the same header and panel | — | Stays |

Preparation with a failed, non-`404` trail request (section 15): the `h1` uses the pack response's `trailName`, the facts line is absent, and no error is shown. The Trail details link stays.

Rules for every state: the header and Sign out stay usable; no state shows a spinner over the whole screen; no state disables a control that is not itself working; and no state shows text that is not in 21.16.

### 21.16 Copy deck

Every user-facing string of the feature. `{…}` is a value. No other text may be shown, and none of these names a service, a status code, or a cause the browser cannot know. Strings from FEATURE-003 that are reused unchanged are referenced, not repeated.

| Id | Where | Text |
|---|---|---|
| SH1 | Back link on Trail Detail; end link in the Preparation strip; the action in S2 | "Back to planning" |
| SH2 | Start link in the Preparation strip | "Trail details" (accessible name: "Back to trail details") |
| SH3 | Retry button | "Retry" |
| SH4 | Retry, working | "Trying again…" |
| SH5 | S2 heading, both screens | "Trail not found" |
| SH6 | S2 text | "We couldn't find this trail. The link may be incomplete or out of date." |
| SH7 | Any wait longer than 10s | "Still loading. This is taking a little longer." |
| SH8 | Trip-date control and its popover | FEATURE-003's strings, unchanged: "Trip date", the date wording, "When are you going?", the quick picks, "Or pick a date", D1 |
| TD1 | `h1` when `name` is `null` | "Trail" |
| TD2 | S1 | "Loading trail…" |
| TD3 | Facts row labels | "Difficulty" · "Distance" · "Elevation" · "Estimated time" |
| TD4 | Cover fallback caption | "No photo of this trail yet." |
| TD5 | Route line | "Route maps aren't available yet." |
| TD6 | Sample-data line | "This is sample trail data." |
| TD7 | Why this trail heading | "Why this trail" |
| TD8 | Label under the total | "Match score" |
| TD9 | Part labels | "Your preferences" · "Weather" · "Your gear" · "Scenery" · "Distance from you" |
| TD10 | Scored-for caption | "Scored for {date} · from Vancouver" or "Scored for {date} · from your location" |
| TD11 | Fixed caption | "Scores from the planner. They aren't a forecast or a gear list." |
| TD12 | The action | "Choose this trail" |
| TD13 | S7 | "Choose a trip date to continue." |
| TD14 | S3 heading | "This trail couldn't be loaded" |
| TD15 | S3 text | "The trail details didn't load. Try again in a moment." |
| TD16 | S3 text, timeout | "Loading took too long, so we stopped waiting. Try again." |
| TP1 | Preparation `h1` | "Preparing for {trail name}" |
| TP2 | Preparation `h1`, name not known | "Preparing for your trip" |
| TP3 | S8, date missing or not a date | "Choose a trip date to see what to bring." |
| TP4 | S8, date before today | "That trip date has passed. Choose a new one." |
| TP5 | S12 | "That date can't be used. Choose another one." |
| TP6 | S9 | "Loading your gear list…" |
| TP7 | S10 | "Your gear list couldn't be loaded just now. Try again in a moment." |
| TP8 | S11 | "That took too long, so we stopped waiting. Try again." |
| TP9 | Readiness heading | "Packing readiness" |
| TP10 | Readiness value | "{n}%" |
| TP11 | Readiness explanation | "Counts how many of the recommended gear categories you own." |
| TP12 | Gear heading | "Recommended gear" |
| TP13 | Count line | "{m} missing · {o} owned" |
| TP14 | Row states | "Missing" · "Owned" |
| TP15 | Row labels | The eleven labels of section 18, and "Other gear" |
| TP16 | S14 | "No specific gear is recommended for this trail on this date." |
| TP17 | S13, under the gear heading | "This list doesn't account for the forecast." |
| TP18 | S13 with S14 | "This doesn't account for the forecast." |
| TP19 | Forecast heading | "Forecast" |
| TP20 | Forecast caption | "For {date}, at the trailhead." |
| TP21 | Forecast labels | "Average temperature" · "Chance of precipitation" · "Wind up to" |
| TP22 | Forecast values | "{n} °C" · "{n}%" · "{n} km/h" |
| TP23 | S13, forecast block | "The forecast isn't available for this date." |
| TP24 | Name of the briefing scroll region | "Gear list and forecast" |
| TP25 | Meter value text | "{n}% of recommended gear categories owned" |
| DT1 | Document title, Trail Detail | "{trail name} · Trail details · Outdoor Trip Companion"; without a name: "Trail details · Outdoor Trip Companion" |
| DT2 | Document title, Trip Preparation | "{trail name} · Trip preparation · Outdoor Trip Companion"; without a name: "Trip preparation · Outdoor Trip Companion" |
| DT3 | Document title, S2 | "Trail not found · Outdoor Trip Companion" |

Strings spoken by assistive technology only are in 23.3.

Words this feature's own copy never uses (a trail's name and description are the backend's text and are shown as returned): "ready to go", "all set", "safe", "good to go", "perfect", "great", "sunny", "rainy", "cold", "packed", "equipped", "buy".

### 21.17 Interaction states

Color and fill changes take `--duration-fast` (150ms). The focus ring is DESIGN_SYSTEM section 18 on `:focus-visible`, with no transition. Links and buttons use the pointer cursor; everything else the default arrow.

| Element | Default | Hover (fine pointer) | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| Brand, Gear, Sign out | FEATURE-003 9.5 | FEATURE-003 9.5 | Focus ring | FEATURE-003 9.5 | Sign out while signing out: FEATURE-003 9.5 | "Signing you out…" |
| Back to planning (on `ink`, Trail Detail) | `snow` text and icon, no fill | Underline, 2px thick, 4px offset | Focus ring | Fill `snow` at 0.12, radius 8px | Never | — |
| Trail details, Back to planning (Preparation strip) | `snow`, no fill | Underline, 2px thick, 4px offset | Focus ring | Fill `snow` at 0.12, radius 8px | Never | — |
| Trip-date control | 21.7 | 21.7 | Focus ring | 21.7 | Never | — |
| Popover quick picks and date input | FEATURE-003 11.5.2 | FEATURE-003 11.5.2 | Focus ring | FEATURE-003 11.5.2 | Never | — |
| Choose this trail | `conifer`, `snow` label | `conifer-deep` | Focus ring | `conifer-press` | Never (21.8) | None: no request |
| Secondary button on paper (Retry in S3; Back to planning in S2) | No fill, 1px solid `stone` border, `ink` 14/20 weight 600, 16px icon before the label, radius 10px, 14px horizontal padding, 40px tall (44px on a coarse pointer) | Fill `ink` at 0.06 | Focus ring | Fill `ink` at 0.10 | Never | Retry only: icon `LoaderCircle` (spinning), label SH4, `aria-disabled="true"`, cursor `progress`; it keeps focus and ignores activation |
| Secondary button on the panel (Retry in S10 / S11; Back to planning in S2) | No fill, 1px solid `snow` border, `snow` 14/20 weight 600, same geometry | Fill `snow` at 0.12 | Focus ring | Fill `snow` at 0.20 | Never | As above |
| Briefing scroll region | — | — | Focus ring | — | — | — |
| Sheet, facts row, trail visual, Why this trail and its bars, panel, readiness and its meter, gear rows, forecast | Static | None | Not focusable | None | — | — |

Hover is never needed to find an action: every control is visible, labelled, and styled as a control at rest. Touch works the same way without hover.

### 21.18 Reserved position for the FEATURE-005 call to action

FEATURE-004 renders no FEATURE-005 control (D11) and keeps no visible placeholder for one.

The reserved position is **the end of the date row in the Preparation panel's trip block** (21.11): the row that already holds the trip-date control at its start. It mirrors the decision row on Trail Detail, where the date sits beside Choose this trail, so on both screens the primary action is found beside the date.

| Property | Value |
|---|---|
| Space | The row is already 44px tall and its end is empty. An action up to 44px tall placed there changes no height and moves no element |
| Visibility | The trip block does not scroll, so the position is on screen at every desktop size, whatever the list's length |
| In FEATURE-004 | Nothing is rendered there: no button, no disabled button, no "coming soon", no outline, no reserved tab stop |
| Rule until then | No FEATURE-004 element may be placed at the end of that row |

Section 27 holds the notes for the feature that will use it.

### 21.19 Motion

Calm, short, and opacity- or color-led. Nothing on either screen moves by itself for longer than a request takes, so no Pause control exists.

| Element | Default | `prefers-reduced-motion: reduce` |
|---|---|---|
| Scene image | Fades in once from the base over 1200ms, then is still | Appears at once |
| Preparation panel, on mount | Opacity 0 → 1 and a 4px rise, 240ms | Appears at once |
| Cover image | Opacity 0 → 1, 240ms | Appears at once |
| Date popover, slot messages | Opacity, 150ms | Appear at once |
| Briefing content replacing S9 | Opacity 0 → 1, 240ms, no movement | Appears at once |
| Waiting indicator (S9) | Three dots pulsing, as FEATURE-003 13.3.1 | Three static dots; the text still shows |
| `LoaderCircle` (S1, Retry working, Sign out working) | Spins | Static; the text beside it still shows |
| Skeleton shapes (S1) | Static | Static |
| Meter and bars | Drawn at their value at once. No fill animation, no count-up | Same |
| Hover, active, and fill changes | 150ms, color only | Kept: color only |
| Route change, State A → State B | No exit animation | Same |

Not used anywhere in this feature: parallax, a slow zoom or pan on the scene, scroll-linked effects, a moving gradient, a bounce, a scale, a celebratory effect, an animated number, or any looping decoration. If the motion preference changes during a visit, the page follows it; layout, content, tab order, and every function are identical in both modes.

## 22. Responsive Behavior

Desktop web is the design baseline (D12). The two screens are composed at 1920×1080 and 1440×900, and validated at 1366×768 and 1024×768. Heights marked "estimated" assume a one-line trail name, a four-line description, all five breakdown parts, and a four-row gear list; they are arithmetic from the values of section 21, not browser measurements.

### 22.1 Trail Detail at the desktop reference viewports

| | 1920×1080 | 1440×900 | 1366×768 | 1024×768 |
|---|---|---|---|---|
| Tier | XL | L | M | S |
| Header | 72, one row | 72, one row | 64, one row | 64, one row |
| Sheet box (x, top, width) | 400, 136, 1120 | 160, 136, 1120 | 123, 116, 1120 | 32, 116, 960 |
| Space either side of the sheet | 400 | 160 | 123 | 32 (the gutter) |
| Columns (main + gap + rail) | 568 + 56 + 400 | 568 + 56 + 400 | 568 + 56 + 400 | 516 + 40 + 340 |
| Sheet padding | 48 | 48 | 48 | 32 |
| Trail name | 40/46 | 40/46 | 36/42 | 32/38 |
| Trail visual | 568 × 227 | 568 × 227 | 568 × 227 | 516 × 206 |
| Sheet height (estimated) | 723 | 723 | 719 | 688 |
| Sheet bottom edge (estimated) | 859 | 859 | 835 | 804 |
| Page scroll (estimated) | None; 180px of base below | None; the sheet ends on the 40px bottom padding | The page scrolls about 90px | The page scrolls about 60px |
| Decision row's bottom edge, unscrolled (estimated) | 703 | 703 | 683 | 667 |

What changes from tier to tier:

| Step | Change |
|---|---|
| XL → L | Only the space beside the sheet: 400px a side becomes 160px. Nothing inside the sheet changes |
| L → M | The header drops to 64px and the Back to planning row moves directly under it; the trail name steps down to 36/42; the page's bottom padding drops to 24px. On a 768px-high screen the sheet is now taller than the viewport, so the page scrolls and the sticky rail matters |
| M → S | The sheet stops being a centred 1120px block and fills the width between the 32px gutters (960px). Its padding drops to 32px, the column gap to 40px, the rail to 340px, the main column to 516px; the trail name steps down to 32/38; the visual becomes 516 × 206; each facts column is about 117px |

What scrolls: the **page**, vertically, and only when the sheet is taller than the viewport. The header and the Back to planning row scroll away; the rail stays 24px from the top, so the trip-date control and Choose this trail remain on screen. Nothing inside the sheet scrolls by itself. At all four sizes the decision row is on screen on arrival, before any scrolling.

In the 340px rail the decision row can hold a date in the current year beside the action. When it cannot hold both (a date with a year, a larger text size), the row wraps: the date control on the first line, the action at full rail width on the second, 8px apart. The action is never truncated or shrunk below its label.

### 22.2 Trip Preparation at the desktop reference viewports

| | 1920×1080 | 1440×900 | 1366×768 | 1024×768 |
|---|---|---|---|---|
| Tier | XL | L | M | S |
| Header | 72, two scrim blocks | 72, two scrim blocks | 64, two scrim blocks | 64, two scrim blocks |
| Panel box (x, y, width) | 64, 104, 520 | 56, 104, 480 | 40, 80, 460 | 32, 80, 420 |
| Panel height limit | 936 | 756 | 664 | 664 |
| Trail name in the panel | 28/34 | 24/30 | 24/30 | 24/30 |
| `object-position` | `50% 30%` | `50% 30%` | `50% 30%` | `55% 30%` |
| Scene crop (14.3.2) | None | 80px off each side | None | 187px off the left, 153px off the right |
| Width of scene with no interface over it, right of the panel | 1336 (70% of the viewport) | 904 (63%) | 866 (63%) | 572 (56%) |
| Space below the panel, four-row list (estimated) | 246: the rug and the mug | 70 | 24 | 24 |
| What scrolls | Nothing, up to about nine rows | Nothing, up to about four rows | The briefing, by about 80px | The briefing, by about 80px |
| What stays clear (21.10) | Everything but the stove and most of the rain jacket | As 1920×1080, less the rain jacket and the left boot's edge | As 1440×900; the boots are almost whole | The figure, the pack, the bottle, cap, gloves, headlamp, map, and most of the window. The boots, the fleece, the stove, and the hanging jacket are covered or cropped |

What changes from tier to tier:

| Step | Change |
|---|---|
| XL → L | The panel narrows by 40px and the trail name steps down to 24/30. On a 16:10 screen the image is cropped at both sides for the first time |
| L → M | The panel moves up to 80px from the top and its bottom margin drops to 24px, so less of the height goes to margins; it narrows to 460px, where the readiness explanation wraps to two lines. On a 768px-high screen the briefing begins to scroll |
| M → S | The panel narrows to 420px. The crop moves from the centre to 55%, giving up the hanging jacket to keep the figure and the map whole |

What scrolls: the **briefing zone inside the panel**, and only when the content is taller than the limit. The strip and the trip block (trail, date, reserved position) never scroll. The page does not scroll and the scene does not move.

Short viewports: when `100dvh − top − bottom margin` is under 480px (a very short window, or 200% zoom on a small screen), the panel's height limit is 480px and the page scrolls vertically, with the scene fixed to the viewport. This is the only case in which the Preparation page scrolls at 1024px wide or more (the same rule as FEATURE-003 section 17.3).

Wider than 1920px: the panel stays 520px wide on the 64px gutter and the right scrim block stays attached to the header's right group; the image scales up and is cropped at the top and bottom (14.3.2). Interface is not stretched.

### 22.3 Below 1024px

768–1023px is functional and tidy, but it is not a composed layout and is not a validation priority. Below 768px is best-effort (D12, Q7). No phone-specific design work was done: no on-screen-keyboard handling, no platform-specific behavior, no phone-only motion, and no attempt to keep the scene's composition.

| | Trail Detail | Trip Preparation |
|---|---|---|
| Header | FEATURE-003 section 17.2, without New Plan: one row at 768–1023px; the brand and a Menu button (identity, Gear, Sign out) below 768px | The same, over FEATURE-003's full-width scrim band (section 8.3.3) in place of the two blocks |
| Layout | One column. The sheet fills the width between the gutters (32px; 16px below 768px; 12px below 360px), padding 32px (20px below 768px). Content follows DOM order: name, scenery, facts, visual, route line, description, sample-data line, Why this trail, decision row. The rail is not sticky | The panel is in normal flow, centred, `min(640px, 100vw − 2 × gutter)` wide, starting `max(120px, 24dvh)` below the header, 24px above the page's end. No height limit and no inner scrolling: the page scrolls |
| Scene | None | Fixed to the viewport behind the page, `object-fit: cover`, `object-position: 84% 50%`. At 768×1024 this shows scene x 48–91%; at 390×844, x 62–88%: the figure and the window's right pane, in the strip above the panel. Everything else of the composition is given up |
| Type | Trail name 32/38 (28/34 below 480px) | Trail name 24/30 |
| Date popover | Opens above the control, no wider than the sheet's content | Opens below the control, no wider than the panel's content |

The minimum that must hold below 768px, down to 320px wide:

- No horizontal scrolling. Long names and descriptions wrap (`overflow-wrap: anywhere`); the facts row wraps to two columns; the decision row wraps as in 22.1.
- Navigation works: the brand link, the Menu, Back to planning, Trail details, Sign out.
- Everything essential is readable in order by scrolling the page: on Trail Detail the name, the facts, the description, Why this trail, the date, and Choose this trail; on Trip Preparation the trail and date, readiness, every gear row with its state, and the forecast or its absence.
- Every control is at least 44 × 44px on a coarse pointer (23.9).
- The scene is a cropped background. If it does not load, 14.4 applies as at any width.

### 22.4 Zoom

At 200% zoom the layouts fall through the tiers above and the short-viewport rule of 22.2: a 1920×1080 screen at 200% is laid out as 960×540, which is the below-1024px layout. Nothing is clipped or lost, and no text-bearing box has a fixed height.

## 23. Accessibility

### 23.1 Structure

Trail Detail:

```text
header                          banner: brand link, Gear, identity, Sign out
main
├─ a  "Back to planning"
└─ article                      the sheet, labelled by the h1
   ├─ h1   trail name           tabindex="-1"
   ├─ p    scenery line         context only; starts with hidden "Scenery: "
   ├─ dl   facts                dt label, dd value
   ├─ div  trail visual         plate (CSS), img alt="" when there is one, caption p
   ├─ p    route line
   ├─ p    description
   ├─ p    sample-data line
   ├─ section                   context only; labelled by its h2
   │  ├─ h2  "Why this trail"
   │  ├─ p   total
   │  ├─ dl  parts              dt label, dd value; bars aria-hidden
   │  └─ p, p  captions
   ├─ button  trip-date control, then its message slot (role="alert")
   └─ button  "Choose this trail"
announcer                       visually hidden: one role="status", one role="alert"
```

Trip Preparation:

```text
(scene layers)                  aria-hidden, no pointer events
header                          banner
main
└─ section                      the panel, labelled by the h1
   ├─ a "Trail details", a "Back to planning"
   ├─ h1   "Preparing for {trail name}"      tabindex="-1"
   ├─ p    facts line
   ├─ button  trip-date control, then its message slot
   └─ div role="region"         aria-label TP24, tabindex="0"; absent in S2, S8, S12
      ├─ section   h2 "Packing readiness", p value, div role="meter", p explanation
      ├─ section   h2 "Recommended gear", p count, p caveat (S13), ul > li
      └─ section   h2 "Forecast", p caption, dl
announcer                       visually hidden: one role="status", one role="alert"
```

- Headings: one `h1` per screen in every state (in S2 it is SH5; in S3, TD14). `h2` for Why this trail and for the three briefing blocks. No heading level is skipped and no heading is used for size alone.
- Landmarks: one `banner`, one `main`. The sheet and the panel are named by their `h1`. The briefing is a named region because it can scroll; it is a tab stop so it can be scrolled from the keyboard.
- DOM order equals visual reading order on both screens at every width. On Trail Detail the main column precedes the rail.
- Document titles: DT1, DT2, DT3 (21.16), updated when the trail name becomes known.
- Every trail name, description, and label is rendered as a text node: no markup, no auto-linking.

### 23.2 Focus

| Event | Focus goes to |
|---|---|
| Arriving at Trail Detail by any route: View trail, a typed URL, a reload, browser Back or Forward, the Trail details link, the return from sign-in | The `h1`. During S1 it holds visually hidden text TD2 |
| S1 ends in content, S2, or S3 | Stays on the `h1`: the same element, with new text. The change is announced (23.3) |
| Choose this trail without a valid date (S7) | The trip-date control |
| A date chosen in the popover; Escape | Back to the trip-date control (FEATURE-003 section 11.5.2) |
| Choose this trail with a valid date; arriving at Trip Preparation by any other route | The Preparation `h1` |
| The date changed on Trip Preparation | Stays on the trip-date control while the pack loads and after |
| A pack response or failure arrives (S9 → content, S10, S11, S12, S13, S14) | Not moved |
| Retry activated | Stays on Retry while it works. On success: the `h1` on Trail Detail; the first heading of the briefing (`tabindex="-1"`) on Trip Preparation. On failure: still on Retry |
| Back to planning | `/home`, as FEATURE-003 places it |
| Session ends (S16) | FEATURE-002 |

Focus is never left on a removed element and never sent to `body`. A heading that receives focus this way draws no ring: it is a reading position, not a control, and it is not in the tab order.

Tab order:

- Trail Detail: brand → Gear → Sign out → Back to planning → (S2: the Back to planning button; S3: Retry) → trip-date control → the popover's controls while it is open → Choose this trail.
- Trip Preparation: brand → Gear → Sign out → Trail details → Back to planning → trip-date control → the popover's controls while it is open → the briefing region → Retry, when shown.

Not tab stops: the sheet, the facts, the trail visual, Why this trail and its bars, the gear rows, the meter, the forecast, and the scene. Enter and Space activate every button; Enter activates every link. With the briefing region focused, the arrow keys, Page Up and Page Down, Home, and End scroll it.

Every stop shows the focus ring of DESIGN_SYSTEM section 18: on `paper` (its `ink` layers show), on the panel and the `ink` base (its `sun` layer shows), and over the scene (the `ink` layers bound the `sun` layer). No ancestor clips it: the sheet and the panel set no `overflow: hidden`, and the briefing's 24px side padding keeps rings inside its scroll clip.

### 23.3 Announcements

One visually hidden announcer per screen, with a `role="status"` region and a `role="alert"` region. It is emptied and refilled for each event so a repeated string is spoken again. Nothing is announced for content that was on screen at first paint.

| Event | Region | String |
|---|---|---|
| Trail Detail loading | — | Carried by the focused `h1` (TD2). SH7 is not announced |
| Trail loaded after S1 | status | "{trail name}. Trail details loaded." |
| S2 after a request | status | "Trail not found." |
| S3 | alert | "{TD14}. {TD15 or TD16}" |
| S7 | The slot's own alert | TD13 |
| Pack request starts and S9 is shown (arrival, date change, Retry) | status | "Loading your gear list." Once per request |
| Pack loaded, with rows | status | "Gear list loaded. Packing readiness {n}%. {m} missing, {o} owned." In S13, followed by TP23 |
| Pack loaded, no rows (S14) | status | "Gear list loaded. {TP16}" In S13, followed by TP23 |
| S10, S11 | alert | TP7, TP8 |
| S12 | The slot's own alert | TP5 |
| S8 on arrival | — | Not a live message. TP3 or TP4 is the trip-date control's description |
| The scene or a cover image loading, loaded, or failing | — | Never announced |

The gear rows are not read out by the announcer; they are read in place. A pack response that is shown at first paint from the query cache is not announced.

### 23.4 Names, roles, and alternatives

| Element | Treatment |
|---|---|
| Scene image | Decorative: `alt=""`, `aria-hidden="true"`, not focusable. It is never described, and the figure in it is never named |
| Cover image | `alt=""`. The trail response carries no description of the photograph, and the `h1` already names the trail |
| Cover fallback plate | CSS background, not exposed. Its caption TD4 is ordinary text and is read in order |
| Route | Text only (TD5). There is no image, no element with a map or image role, and no coordinate |
| Icons | All `aria-hidden`, all drawn in `currentColor`. None is the only carrier of a meaning |
| Trail details link | Accessible name "Back to trail details" (it contains the visible label) |
| Trip-date control | Name "Trip date: {long date}" or "Trip date: not set"; `aria-expanded`, `aria-controls`; `aria-describedby` its message slot |
| Facts | A `dl`: each value is read with its label ("Difficulty, Moderate") |
| Why this trail, total | Read as "Match score: 86 out of 100". The visible "/100" is hidden from assistive technology and the words "out of" are visually hidden |
| Why this trail, parts | A `dl`. Each value is read as "48 out of 55" by the same technique. Bars are `aria-hidden` |
| Readiness meter | `role="meter"`, named by the "Packing readiness" heading (`aria-labelledby`), `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` the returned percentage, `aria-valuetext` TP25. The percentage is also present as text beside the heading, so the value does not depend on the role being supported |
| Gear row | An `li` containing the label and then the state word: read as "Rain gear, Missing". No role, no state attribute, no `aria-checked` |
| Forecast | A `dl`: "Average temperature, 12 °C" |
| Briefing region | `role="region"`, `aria-label` TP24, `tabindex="0"` |
| Skeleton shapes, waiting dots | `aria-hidden`. The text beside them carries the state |
| Retry, working | `aria-disabled="true"`, name SH4 |

### 23.5 Understandable without color

| Content | How it reads with no color at all |
|---|---|
| Why this trail | The total and every part are numbers with their maxima, as text. Each bar is a filled length inside an outlined track of fixed length: a value shown as a proportion, not as a hue. No part is tinted by how high it is |
| Owned and Missing | The word; the icon's shape (closed ring with a check, dashed empty ring); the label's weight (400, 600); and the order (Missing first). All four survive grayscale; the word and the shape survive forced colors |
| Packing readiness | The number as text; the meter as a filled length in an outlined track. One color at every value |
| Difficulty | A word |
| Needs-attention date control | A thicker border, a `CircleAlert` icon in place of the calendar, and a sentence |
| Failed loads | A heading or a sentence, an icon, and a Retry button |
| State A and State B | Different layouts, different headings, and the presence of the scene |

### 23.6 Contrast pairs in use

WCAG 2.x arithmetic and compositing as in FEATURE-003 section 19.5. "Over white" is the worst case for light text on a translucent surface: a pure white image behind it. `ink` at 0.88 over white is rgb(40, 55, 59); `ink` at 0.72 over white is rgb(79, 92, 94). Ratios marked † are taken from DESIGN_SYSTEM section 9 or FEATURE-003 section 19.5; the others were computed for this document. None was measured in a browser.

| Foreground | Background | Ratio | Needed |
|---|---|---:|---:|
| `snow` text: header items, Back to planning (Trail Detail) | `ink` base | 17.48 † | 4.5 |
| `ink` text: trail name, facts values, description, part labels and values, total | `paper` | 16.04 † | 4.5 |
| `stone` text: scenery, facts labels, route line, sample-data line, "/100", "Match score", captions | `paper` | 5.92 † | 4.5 |
| `stone` icon and border; `ink` label: date control on paper, set / hover | `paper` with `ink` at 0.06 / 0.10 | 5.25 / 4.84 † (`stone`) | 3 |
| `snow` label and icon on Choose this trail | `conifer` / `conifer-deep` / `conifer-press` | 8.05 / 10.23 / 12.57 † | 4.5 |
| Choose this trail's edge | `conifer` on `paper` | 7.38 † | 3 |
| `snow` caption on the cover plate | `conifer-deep`, the plate's lightest tone | 10.23 | 4.5 |
| Bar fill; bar outline (Why this trail) | `ink` on `paper`; `stone` on `paper` | 16.04; 5.92 | 3 |
| `ember` border and icon: date control needing attention, D1 | `paper` | 4.43 † | 3 |
| Secondary button on paper: `ink` label; `stone` border | `paper` | 16.04; 5.92 | 4.5; 3 |
| `snow` text on the panel: heading, facts, links, block headings, value, rows, state words, forecast, messages | Panel, `ink` at 0.88 over white | 12.32 † | 4.5 |
| `snow` icons, meter outline and fill, control borders | Panel over white | 12.32 | 3 |
| `snow` label on a hovered / pressed on-panel control | Panel over white with `snow` at 0.12 / 0.20 | 8.49 / 6.60 | 4.5 |
| `snow` text: brand, Gear, identity (Trip Preparation) | Scrim plateau, `ink` at 0.72 over white | 6.97 † | 4.5 |
| `snow` text and border: Sign out, Menu | Their own `ink` at 0.72 fill over white | 6.97 † | 4.5 |
| `ink` text in the date popover | `paper` | 16.04 † | 4.5 |
| Focus ring's `sun` layer | Panel over white; `ink` | 8.68; 12.28 † | 3 |

- `ember` and `stone` are never used on the panel or over the scene, and `conifer` is never used on the panel in this feature (it is about 1.5:1 against it).
- The 1px rules (`ink` at 0.12 on `paper`, `snow` at 0.16 on the panel) and the skeleton shapes are decorative separators and are not relied on: structure is carried by headings, spacing, and order.
- Over the fallback surface of 14.4, and over any real frame of the image, every over-white ratio above is higher.

Check for `qa`: replace the scene image with a plain white fill. A pixel of the panel beside any text must be rgb(40, 55, 59) ± 2, and a pixel of each header scrim block beside the brand and beside Sign out must be rgb(79, 92, 94) ± 2. No text may be found outside the panel, the two scrim plateaus, a control with its own fill, or a `paper` surface.

### 23.7 Forced colors, zoom, and text size

- Forced colors: the focus ring's transparent 2px outline becomes visible (DESIGN_SYSTEM section 18). The sheet, the panel, the trail visual's box, and the popover each carry a 1px border (transparent in the normal design) so they keep an edge. Icons use `currentColor`. The meter's and the bars' outlines are real borders, and their filled parts are painted in the system text color, so both survive the removal of background colors. The cover plate may lose its tones; its caption and its border remain. Translucent fills and the scrim blocks are replaced by system colors; nothing depends on them.
- Zoom: section 22.4.
- No text-bearing box has a fixed height: the strip, rows, buttons, and slots use `min-height`, and labels wrap. Nothing is truncated with an ellipsis except the header identity, as in FEATURE-003.
- No text is smaller than 14px (DESIGN_SYSTEM section 7.5).

### 23.8 Reduced motion

Section 21.19 gives every element's behavior under `prefers-reduced-motion: reduce`. In short: no fade, no rise, no spin, and no pulse; the scene, the panel, and every message appear at once; every waiting state keeps its text, so no state depends on movement. Because the scene is a still image in both modes, there is no reduced-motion alternative asset and no Pause control.

### 23.9 Touch targets

On a coarse pointer every control is at least 44 × 44px: the header items and Menu rows, Back to planning, Trail details, the trip-date control (44px at all times), the popover's quick picks and date input, Choose this trail (44px at all times), Retry, and the Back to planning button of S2. Adjacent targets are at least 8px apart. This matters mainly at the best-effort widths of 22.3; with a fine pointer the heights given in section 21 apply. Gear rows are not targets and have no minimum.

Lead minimums that the design must meet:

- One `h1` per screen. On arrival at either screen, and after Choose this trail, focus moves to that screen's `h1` and the document title names the screen and the trail.
- Every call to action is a real link or button, reachable and operable by keyboard, with a visible focus indicator that meets DESIGN_SYSTEM section 18 on every surface it appears on.
- Text is never placed directly on the scene without a scrim or surface, and legibility never depends on text shadow.
- The scene image is decorative (`alt=""` or a CSS background) and hidden from assistive technology.

## 24. Frontend Architecture Boundaries

Guidance, not a mandated file list. Names may change; boundaries may not.

```text
Project/Frontend/src/
  pages/TrailDetailPage.tsx         thin composition (replaces the placeholder)
  pages/TripPreparationPage.tsx     thin composition
  features/planning/                gains: the View trail link on the card; one read-only
                                    selector that finds a recommendation by (rec, trailId)
  features/trails/                  api (GET /api/trails/{id}), contract type, response
                                    checking, Trail Detail components, Why this trail
  features/packing/                 api (POST /api/recommendations/pack), contract types,
                                    response checking, Preparation components, the gear
                                    category labels, the preparation scene media
  features/gear/                    not created by this feature
  services/apiClient.ts             unchanged; authenticatedApiRequest is reused
```

| Boundary | Rule |
|---|---|
| planning → trails | The only coupling is the read-only selector and the link. `features/trails` imports nothing else from planning's state, and planning imports nothing from trails or packing |
| trails and packing | Packing may reuse the trail query and a small trail-summary component. Trails imports nothing from packing |
| Shared presentation | The difficulty, distance, elevation, duration, scenery, and trip-date formatters now have a second user. They are shared from one place (moved to a shared module or exported from planning), not copied |
| Trip-date control | One component, used on both screens and in the planner. FEATURE-003's control is reused or extracted, and gains what section 21.7 lists: an on-panel tone, a 44px height, and a popover-placement rule. Its behavior in the planner does not change |
| No mega-store | No FEATURE-004 global store. Server state is TanStack Query; the selection is the URL; the date being edited is local component state |
| Scene and content | The preparation scene is a presentation component with a narrow input (asset path). It and the preparation content are siblings that share no state, as `HomeMedia` and the planner are in FEATURE-003. A later FEATURE-005 change of visual replaces the scene component only |
| Auth | Only through `@/features/auth`'s exported API. No import of `authSession.ts` internals or of `keycloak-js`, no token decoding, no new storage of anything from authentication |
| Contract types | In the feature that owns the endpoint (section 5.4) |
| Error parsing | Status-based. A missing, empty, or non-`ProblemDetail` body is expected |
| Dependencies | No new runtime dependency: no map library, no chart library, no date-picker library, no 3D library, no animation library. Icons come from `lucide-react`, already installed |
| Shell | Both routes leave `AppLayout` and get a full-viewport shell inside `ProtectedRoute`, as `/home` does (FEATURE-003 D1). `/gear` and the not-found page keep `AppLayout` |
| No fake data | No mock, fixture, sample pack, or placeholder trail ships in production code |
| Existing behavior | FEATURE-001, FEATURE-002, and FEATURE-003 are not modified except: the View trail link on the recommendation card (section 4.2), the shared formatters and date control (above), and the return-destination pattern (section 25) |

## 25. Session and Reload Behavior

| Situation | Result |
|---|---|
| User opens a trail from a card | `/trails/{id}?rec={id}`. Trail Detail with Why this trail and a prefilled date |
| Reload on Trail Detail | Same URL. The trail is requested again. Why this trail is restored from the planner session by the same lookup, for the same signed-in user. A date changed locally but not yet chosen returns to its prefilled value |
| User chooses the trail | `/trails/{id}/prepare/{date}` (plus `rec`). The pack loads |
| Reload on Preparation | Same URL. The trail and pack requests run again. No stored selection is needed |
| Back to planning, then forward | `/home` shows the planner as FEATURE-003 restores it. Browser Forward returns to the screen left, rebuilt the same way as a reload |
| Direct Trail Detail URL | Section 9 |
| Direct Preparation URL | Works with a valid trail id and date (section 12). Otherwise trail-not-found (S2) or choose-a-date (S8) |
| New Plan in the planner | Clears the planner session. Trail Detail then has no recommendation context. Preparation is unaffected: it does not use that context |
| Sign-out | FEATURE-002's sign-out. The planner session and the query cache are cleared by the existing session cleanup. Nothing of FEATURE-004 remains in storage, because it stores nothing |
| Session expiry on either screen | FEATURE-002's session-expired state. After sign-in the user lands on the same path |
| A different user signs in, same tab | Why this trail cannot appear from the previous user's planner session (FEATURE-003 D28). Pack results cannot appear either: the pack query is keyed by subject and the cache is cleared at session end |

Rules:

- FEATURE-004 writes nothing to `sessionStorage`, `localStorage`, cookies, or `history.state`.
- **Return destination.** `features/auth/returnDestination.ts` accepts `/home`, `/gear`, and `/trails/<one segment>` and stores the pathname only. Implementation extends its pattern, in that one file, to accept `/trails/<segment>/prepare` and `/trails/<segment>/prepare/<YYYY-MM-DD>`, validated on write and on read as today. Query strings stay excluded, so `rec` is dropped by a sign-in round trip and Trail Detail then behaves as direct navigation. This is the only change to FEATURE-002 code.
- **Per-user server state.** The pack query key includes the signed-in subject from `getAuthenticatedSubject()`. With no subject, no pack request is made. The existing `registerSessionCleanup(() => queryClient.clear())` stays as it is.
- The trail query needs no subject: trail facts are the same for every user.

## 26. API and Browser Routing

Current state, verified in `Project/Frontend/vite.config.ts` and `services/apiClient.ts`: `VITE_API_BASE_URL` is empty, so every request goes to the frontend's own origin, and the development server proxies `/api/planner` to `http://localhost:8083` and nothing else. The API gateway has no routes. `trail-service` allows CORS from `http://localhost:5173`, but that does not help while requests are same-origin; `recommendation-service` and `user-service` define no CORS.

FEATURE-004 therefore needs two more development proxy entries, in the same form as the existing one (D7):

| Proxy path | Target | Used for |
|---|---|---|
| `/api/trails` | `http://localhost:8082` (`trail-service`) | `GET /api/trails/{id}` |
| `/api/recommendations/pack` | `http://localhost:8083` (`recommendation-service`) | `POST /api/recommendations/pack` |

| Rule | Detail |
|---|---|
| Not proxied | `/api/users/**`. This feature does not call `user-service` from the browser. A later feature that reads the gear list will need `/api/users` → `http://localhost:8081` |
| Scope | Frontend-only, local development only. No environment variable is added. No CORS configuration, gateway route, Docker file, or backend networking is changed |
| Narrow paths | `/api/recommendations/pack` is proxied, not all of `/api/recommendations`, so the one-shot and temporary recommendation endpoints stay unreachable from the browser |
| Authentication | Every call goes through `authenticatedApiRequest`, which already limits the bearer token to `/api/` paths on the configured origin |
| Production limitation | `npm run preview` and a deployed build cannot reach either endpoint. Production routing (gateway routes or CORS) remains future infrastructure work, as for the planner |
| Check at implementation start | That both proxied requests pass the services unchanged. A refusal is a backend contract gap that `frontend` reports and the lead routes to `backend-api` |
| Documentation | `docs/FRONTEND_CONTEXT.md` sections 7, 8, and 10 are updated in the implementing change |

Not designed by this feature: another Keycloak client, token decoding, service accounts, admin credentials, new token storage, or a new login flow.

## 27. FEATURE-005 Handoff

FEATURE-004 is complete when the user understands which trail is selected, when the trip is, what the system recommends bringing, which recommended categories they own, which are missing, and their current packing readiness.

What FEATURE-005 can rely on:

| Provided by FEATURE-004 | Where |
|---|---|
| The selected trail and trip date | The Preparation URL |
| The pack recommendation for that pair | The pack query (section 16) |
| The trail's facts | The trail query |
| The gear category label mapping | `features/packing` |
| A scene component that can be replaced without touching content | Section 24 |
| A reserved position for the next call to action | Section 21 |

What FEATURE-005 owns and FEATURE-004 does not start:

- Choosing the actual items to wear or carry; Equip, Unequip, Bring, Remove, Replace
- The Equipped state and any persistence of it
- Reading the gear inventory (`GET /api/users/me/gear`) and matching items to categories
- The persistent avatar, the gear-to-visual mapping, equipment slots, and any Three.js, React Three Fiber, GLB, or Blender work
- The relationship between the pre-rendered scene and the real-time avatar (Q4)

**No FEATURE-005 call to action is rendered by FEATURE-004 (D11).** A "Customize my pack" control that leads nowhere would be a dead end. The design reserves its position so that adding it later does not move anything.

Visual handoff notes from `ui-ux`. These are notes for whoever designs FEATURE-005, not a design, and nothing in them is built here.

- **Call to action.** Its reserved position is the end of the date row in the panel's trip block (21.18): beside the trip date, always on screen, in a row that already has the height for it. Adding it there moves nothing.
- **Its color.** `conifer` is about 1.5:1 against the panel, so a `conifer` action placed on the panel needs a 1px `snow` edge or a `paper` surface under it. This has to be decided with that feature; FEATURE-004 uses no `conifer` on the panel.
- **Avatar region.** The frame's open area is to the right of the panel: scene x 48–88%, where the pre-rendered figure and the pack are now. If the real-time avatar is shown on this screen, that is where the eye already goes. The panel's zone (the left 39–48% of the frame, by viewport shape) and the two header blocks are the interface's and should stay so.
- **The pre-rendered figure.** It occupies the place an avatar would take and is not the avatar. Showing both at once would put two characters on screen; which of them remains is Q4 and is a product decision.
- **What can be replaced.** The scene is one component whose only input is its asset (section 24). FEATURE-005 can replace or cover it without touching the panel, and the safe zones of 14.2 are the contract any replacement should be composed to.

## 28. Non-Goals

Not part of FEATURE-004:

- A redesign of the conversational planner, apart from the View trail link
- A new or changed recommendation algorithm, or a new recommendation endpoint
- A saved-trip backend, trip database entity, persistence repository, or trip history
- Gear CRUD, a gear inventory page, or a redesign of `/gear`
- Shopping, product recommendations, external gear links, prices, brands, SKUs, quantities
- The Equipped state, gear customization, toggles, or checklists that record what is packed
- Avatar, Three.js, React Three Fiber, GLB, Blender, real-time 3D, or any 3D asset pipeline; `three-d` is not involved
- New media: no generated or downloaded image, no new video, no re-encoding of the existing image
- Route drawing, maps, turn-by-turn navigation, map-provider routing, offline navigation, route editing, GPX authoring or upload, live location tracking
- Explore, Memory, social sharing, live hikers, voice input
- Direct calls from the browser to a weather provider or to OpenAI
- Backend changes of any kind, including the B1 fix, which is `backend-api`'s
- API gateway, CORS, Docker, Keycloak, or other infrastructure work
- Calling `GET /api/users/me` or `GET /api/users/me/gear`

## 29. Agent and Write-Scope Rules

This document is specification and design only. Nothing here authorizes implementation; that starts only when the user approves and the lead runs the feature cycle.

When the implementation cycle runs:

| Agent | May write |
|---|---|
| `frontend` | `Project/Frontend/**`, including the two proxy entries in `vite.config.ts` (section 26) and the return-destination pattern (section 25) |
| `frontend`, in the same change | `docs/FRONTEND_CONTEXT.md`, limited to what actually changed: the two routes and their shell, the new feature folders, the proxy entries, the return-destination pattern, and the removal of the Trail Detail placeholder |
| `backend-api` | Completed the approved B1 change and its contract documentation. No further backend write is authorized by the frontend cycle |
| `qa` | Nothing in production code. Tests only if the lead says so |
| `ui-ux` | This document and, with lead approval, `docs/DESIGN_SYSTEM.md` |
| `three-d` | Not invoked |

Order when the frontend cycle runs: B1 is already resolved. `frontend` never edits `Project/Backend/**` or reimplements baseline gear behavior in the browser.

Not authorized for any agent in this feature: `Project/docker/**`, `Project/docker-compose.yml`, Keycloak realm or client configuration, the Keycloak theme, the API gateway, any infrastructure.

Other standing rules: no unrelated refactors; unrelated modified files in the working tree are left alone; the media file is used as delivered; no commit or push without the user's instruction.

## 30. Acceptance Criteria

### 30.1 How these are validated

- **Where.** In a browser against `npm run dev` on `http://localhost:5173`, signed in through Keycloak. There is no test runner; `npm run build` and `npm run lint` are run as well.
- **Viewports.** "Desktop" means 1920×1080, 1440×900, 1366×768, and 1024×768. Below 768 px wide is best-effort and is judged only by the one criterion in section 30.6 that says so. 768–1023 px is functional but is not a validation priority (section 22.3).
- **Trip date for testing.** A near-future date, today or within the next few days, which the live forecast can serve.
- **Live.** Criteria marked **Live** must pass at least once against the real stack (PostgreSQL, Keycloak, `user-service`, `trail-service`, `recommendation-service`). If the stack cannot run for an environment reason they are reported as blocked by the environment, not passed by interception.
- **B1.** The backend prerequisite in section 6.1 is resolved; criteria that depended on it can now be validated against the live stack.
- **Interception.** Other states (failures, timeouts, `404`, a non-null `coverImageUrl`, a non-null `route`, empty `requiredGear`, specific readiness values, `weatherAvailable: false`, unknown categories) may be produced by intercepting the two requests in the browser. Interception is a test tool only; no mock, fixture, or fake response ships in production code.
- **Baseline.** The working tree already holds unrelated uncommitted changes. `qa` records a baseline at the start of the cycle and judges the boundary criteria against it.
- A criterion fails if any clause in it fails. Section references say where the exact values are.

### 30.2 Trail Detail

| # | Criterion |
|---|---|
| AC-01 | **Live.** Each recommendation card in the planner whose trail has an id shows a View trail link. Activating it by mouse and by keyboard opens `/trails/{id}?rec={id}` for that trail. Nothing else about the card or the conversation changes (section 4.2). |
| AC-02 | **Live.** Trail Detail shows the trail's name as the page heading and its difficulty, distance, elevation gain, and estimated duration, with values equal to the `GET /api/trails/{id}` response and formatted as section 7.1 says. The description is shown in full. No wire value (`MODERATE`, `DEMO_SEED`) is visible. |
| AC-03 | A field that is `null` in the trail response is left out with no placeholder. With `name: null` the heading reads "Trail" (section 7.1). |
| AC-04 | With `coverImageUrl: null` (every seeded trail), and with a `coverImageUrl` that fails to load, the designed cover fallback is shown with its caption (21.5): no broken-image icon, no browser-drawn alternative text, no external photograph, and no layout shift. With a `coverImageUrl` that loads, that image is shown (section 7.1). |
| AC-05 | The route region shows the route-unavailable message for a `null` route and for a non-null route. No map, line, or coordinate is drawn or invented, and trailhead coordinates are not displayed (section 7.1, D10). |
| AC-06 | **Live.** Entered from a card, Why this trail shows the total score and each non-null breakdown part with the same labels, maxima, and rounded values as that card's breakdown in the planner, plus the scored-for date and starting point. It contains no qualitative grade and no invented sentence (section 8.1). Opening Trail Detail makes no request to `/api/planner/turn` or `/api/recommendations/query`. The only product request is `GET /api/trails/{id}` (section 4.2). |
| AC-07 | **Live.** Opened by typing `/trails/{id}` with no `rec`, with an unknown `rec`, or after New Plan, Trail Detail shows the factual content normally, renders no Why this trail section and no scenery line, and shows no notice about missing context (section 9). |
| AC-08 | A `trailId` that is not a UUID shows the trail-not-found state and makes no request. A UUID with no trail (`404`) shows the same state. Both offer Back to planning and no Retry (S2). A failed trail request (network error, `500`, timeout) shows the general failure state with Retry and Back to planning; Retry repeats the request and a later success shows the trail. No trail content is rendered from the planner session meanwhile (S3). |
| AC-09 | **Live.** After a conversation with at least two recommendation groups, a chosen trip date, a starting point, and an unsent draft, Back to planning from Trail Detail returns to `/home` with the messages, every recommendation group, the plan summary, the trip date, the starting point, and the draft unchanged, and no request sent. Browser Back gives the same result (section 10). |

### 30.3 Selection

| # | Criterion |
|---|---|
| AC-10 | **Live.** Entered from a card, the trip-date control is prefilled with the date that results group was made for. Choose this trail opens `/trails/{id}/prepare/{that date}` without the user entering a date (section 11). |
| AC-11 | With no recommendation context, the date is prefilled from the planner's current trip date when it is today or later; with none, it is empty. Choose this trail with no valid date does not navigate: guidance appears at the date control and focus moves to it. A date before today cannot be chosen (section 11.2, S7). Changing the date on Trail Detail changes only the date used by Choose this trail. After Back to planning, the planner's trip date and results are as they were (section 11.2). |
| AC-12 | Choose this trail makes no API request by itself and writes nothing to web storage. The trail and date are in the path of the resulting URL, and browser Back returns to Trail Detail with Why this trail intact (sections 11.1, 12). |
| AC-13 | **Live.** Reloading Trail Detail opened from a card shows the same trail, the same Why this trail, and the same prefilled date. Reloading Trip Preparation shows the same trail and date and loads the pack again (section 25). |
| AC-14 | Opening `/trails/{id}/prepare/{valid date}` directly in a fresh tab, signed in, shows Trip Preparation for that trail and date. `/trails/{id}/prepare`, `/trails/{id}/prepare/not-a-date`, and a date before today show the choose-a-date state: the trail, the date control, and **no** pack request. Choosing a date there loads the pack and updates the URL (section 12, S8). |

### 30.4 Trip Preparation

| # | Criterion |
|---|---|
| AC-15 | **Live.** Entering Preparation sends exactly one `POST /api/recommendations/pack` whose body is `{ trailId, tripDate }` from the URL and nothing else. No request goes to `/api/users/me/gear`, to a weather provider, or to the planner (sections 15, 16). |
| AC-16 | **Live.** The selected trail's name and the trip date are visible on Preparation, the date in a readable form (for example "Sat, Oct 17") (section 15). |
| AC-17 | **Live.** With `weatherAvailable: true`, the three forecast values are shown rounded, labelled as average temperature, chance of precipitation, and wind up to, with units. No condition word, weather icon chosen from the numbers, or advice sentence appears (section 17). |
| AC-18 | With `weatherAvailable: false`, a weather-unavailable statement replaces the forecast, the gear list and readiness from the same response are still shown, and one line says the list does not account for the forecast. Nothing is disabled (S13). |
| AC-19 | Every `requiredGear` entry appears as exactly one row with a user-friendly label; no wire value is visible; an unknown category appears as "Other gear" with its real state. Rows are ordered Missing first, then Owned, each in the enum order of section 5.2 (section 18). |
| AC-20 | Each row shows Owned or Missing matching its `owned` value, as a word and an icon, and the two remain distinguishable in grayscale and in forced-colors mode. Rows are not checkboxes, toggles, or buttons (section 18). |
| AC-21 | **Live.** For a seeded trail on a mild day, the list includes that trail's baseline categories (for Quarry Rock: Hiking footwear and Water). After adding a gear item in one of those categories through the API, re-entering Preparation shows that row as Owned and a higher readiness (sections 6.1, 16). |
| AC-22 | The readiness shown equals `readinessPercentage` from the response for intercepted values `0`, `33`, `67`, and `100`, including a response whose percentage deliberately disagrees with its rows (for example one of four owned with `90`): the screen shows `90`, while the count line still counts the rows as displayed. It is labelled Packing readiness (section 19). No text on either screen describes readiness as safety, fitness, weather safety, or permission to hike, and 100% has no celebratory or "ready to go" treatment. The meter's color does not change by threshold (section 19). |
| AC-23 | With `requiredGear: []`, no percentage and no meter are shown; a neutral statement says no specific gear is recommended. With every row missing, the list and 0% are shown with no alarm styling and no claim that the user's gear list is empty (S14, S15). |
| AC-24 | While the pack request is in flight, loading feedback is shown and announced, and the trail summary is already visible. A failed request (network error, `500`, `503`, unusable body, mismatched `trailId`) shows the general failure with Retry and no partial pack content; Retry repeats only the pack request. No response within 20 s shows the timeout wording with Retry (S9–S11). |
| AC-25 | A `400` from the pack endpoint shows the choose-a-date state with a statement that the date cannot be used; it does not offer Retry with the same date (S12). On Preparation with a missing trail (`404` from the trail request), the trail-not-found state replaces the screen, whatever the pack request returned (section 15). |
| AC-26 | No interface text or DOM attribute shows a service name, an HTTP status, a Java class name, a stack trace, or backend error text in any state of section 20. |

### 30.5 Architecture, session, and routing

| # | Criterion |
|---|---|
| AC-27 | **Live.** Every product request on both screens is same-origin and carries `Authorization: Bearer`. The token does not appear in a URL, in web storage, or in the console. During a full pass through both screens the browser contacts only the application's origin and the Keycloak origin (section 26). `vite.config.ts` proxies exactly `/api/planner`, `/api/trails`, and `/api/recommendations/pack`. `/api/users` and the rest of `/api/recommendations` are not proxied, and no environment variable was added (section 26). |
| AC-28 | After a full pass through both screens, `sessionStorage` and `localStorage` hold no key that FEATURE-004 added, and `history.state` holds no recommendation, score, or trail data. The planner's storage value is byte-for-byte unchanged by visiting either screen (sections 4.2, 25). |
| AC-29 | Sign out as user A on Preparation, sign in as user B in the same tab, and open the same Preparation URL: a new pack request is made with B's token and B's ownership is shown. Opening A's Trail Detail URL including A's `rec` shows no Why this trail (section 25). |
| AC-30 | **Live.** Signed out, opening a Trail Detail URL or a Preparation URL shows FEATURE-002's sign-in gate; after sign-in the user lands on the same path, with the date intact for Preparation. With the session ended mid-visit, no feature-specific error is drawn: FEATURE-002's session-expired handling applies (S16, section 25). |
| AC-31 | The production source contains no mock, fixture, or hard-coded trail, weather, gear, score, or readiness value; no ownership or readiness calculation; and no weather threshold. There is no saved-trip store, entity, or endpoint (sections 16–19, 28). |

### 30.6 Design, responsive, and accessibility

Geometry is checked to ±2px. Where a criterion names a scene object, its position is the estimate of section 14.2 and is judged by eye against the delivered image.

| # | Criterion |
|---|---|
| AC-32 | On Trip Preparation the background is one image whose request URL is `/media/img/preparation%20bg.png`, and no other media file is requested. It covers the whole viewport at 1920×1080, 1440×900, 1366×768, and 1024×768 with `object-fit: cover`; its drawn width ÷ height equals 1672 ÷ 941 at each size (it is not stretched); there is no letterbox band. It does not move, zoom, or animate after its one fade-in, and there is no Pause control (sections 14.1, 14.3.1). The computed `object-position` is `50% 30%` at 1920, 1440, and 1366px wide and `55% 30%` at 1024px wide. At 1920×1080 and 1366×768 the whole frame is visible; at 1440×900 about 80px is cropped from each side; at 1024×768 about 187px from the left and 153px from the right. At 2560×1080 the image is cropped only at the top and bottom and is not distorted (section 14.3.2). |
| AC-33 | At the four desktop viewports the panel's box is at x 64 / 56 / 40 / 32, y 104 / 104 / 80 / 80, with width 520 / 480 / 460 / 420. At each of them the figure, the backpack, the bottle, the cap, the gloves, the headlamp, and the map are not under the panel, the header's scrims, or any other interface. No interface element other than the header and the panel is drawn over the scene. The header has no scrim across the frame: at each of the four viewports a pixel 20px from the top at the viewport's horizontal centre is the image's own pixel, unchanged, and the left scrim block ends on the panel's right edge line (sections 14.2, 14.3.3, 21.10). |
| AC-34 | The panel's height follows its content and never exceeds the viewport height minus its top offset and bottom margin (936 / 756 / 664 / 664px). With an intercepted eleven-row list at 1366×768, only the briefing scrolls: the strip, the trail name, and the trip-date control stay in place, the page has no vertical scrollbar, the scene does not move, and every row can be reached with the keyboard (sections 21.10, 21.11, 22.2). |
| AC-35 | With the scene request blocked, and separately while it is delayed, Trip Preparation shows the fallback surface: no broken-image icon, no alternative text, no outline, and no message about the picture. The header, the panel, and every control are at the same positions and sizes as with the image, and the date control, the links, Retry, and scrolling all work (sections 14.3.4, 14.4, S17). |
| AC-36 | With the scene replaced by a plain white fill: a pixel of the panel beside any text is rgb(40, 55, 59) ± 2; a pixel of each header scrim block, beside the brand and beside Sign out, is rgb(79, 92, 94) ± 2; no text is found outside the panel, the two scrim plateaus, a control with its own fill, or a `paper` surface; and no element on the screen has a `text-shadow` or a `backdrop-filter`. Every text and control pair of section 23.6 meets the ratio listed as needed (sections 14.3.3, 23.6). |
| AC-37 | The two states are visibly different. Trail Detail shows no scene and does not request the scene image; its content is one `paper` sheet centred on the `ink` base; its `h1` is the trail name; Choose this trail is present and is the only `conifer`-filled element. Trip Preparation shows the scene and one left-anchored panel; its `h1` reads "Preparing for {trail name}"; it has no Choose this trail and no `conifer`-filled element (sections 13.2, 21.3, 21.10). |
| AC-38 | Trail Detail at the four desktop viewports: the sheet is centred, 1120px wide (960px at 1024px wide), in two columns with the rail on the right. With a seeded trail opened from a card, the trip-date control and Choose this trail are fully visible on arrival without scrolling at all four sizes. When the page is scrolled at 1366×768, the rail stays on screen (sections 21.3, 22.1). |
| AC-39 | In grayscale and in forced-colors mode: every Why this trail value is readable as a number with its maximum and no bar or number changes color with its value; the readiness percentage is readable as text and the meter shows a filled length inside a visible outline at 0, 33, 67, and 100; Owned and Missing rows differ by word and by icon shape; the sheet, the panel, and the popover keep a visible edge (sections 21.6, 21.12, 21.13, 23.5, 23.7). |
| AC-40 | With the keyboard alone, both screens are fully operable in the tab orders of section 23.2. Every stop shows the Design System focus ring, fully visible and unclipped, on `paper`, on the panel, and on the header. Gear rows, the meter, the trail visual, and Why this trail are not tab stops and do not react to click or hover. The briefing region can be focused and scrolled with the keyboard (sections 21.17, 23.2). |
| AC-41 | Focus: on arrival at Trail Detail by View trail, by a typed URL, and by browser Back from Trip Preparation, focus is on the `h1` and the document title is DT1. After Choose this trail, focus is on the Preparation `h1` and the title is DT2. Choose this trail without a date moves focus to the trip-date control. Changing the date on Trip Preparation leaves focus on the trip-date control. After a successful Retry, focus is on the `h1` (Trail Detail) or the first briefing heading (Trip Preparation). Focus is never on `body` after any of these (section 23.2). |
| AC-42 | Assistive technology: one `h1` per screen in every state. Pack loading is announced once through a `role="status"` region and a pack failure through a `role="alert"` region, with the strings of section 23.3; the trip-date message of S7 is an alert. The scene and the cover image are never announced. The readiness meter has `role="meter"`, the accessible name "Packing readiness", `aria-valuenow` equal to the returned percentage, `aria-valuemin="0"`, `aria-valuemax="100"`, and the value text of TP25 (sections 23.1, 23.3, 23.4). |
| AC-43 | At 1920×1080, 1440×900, 1366×768, and 1024×768, neither screen scrolls horizontally in any state of section 20, including with an intercepted 60-character unbroken trail name, a 600-character description, and a date in another year. Nothing is truncated except the header identity (sections 21.4, 22.1, 22.2). |
| AC-44 | Best-effort, at 390×844 and 320×568: neither screen scrolls horizontally; the brand link, the Menu, Back to planning, and Trail details work; on Trail Detail the name, facts, description, Why this trail, the date control, and Choose this trail are all reachable in that order by scrolling the page; on Trip Preparation the trail and date, readiness, every gear row with its state, and the forecast are reachable the same way, over a cropped, fixed scene. The scene's composition is not judged at these sizes (section 22.3). |
| AC-45 | Under `prefers-reduced-motion: reduce`, the scene, the panel, and all content appear with no fade and no movement, spinners and waiting dots are static with their text still shown, and layout, content, tab order, and every function are the same as without the preference. Without the preference, nothing on either screen moves for longer than a request is in flight (sections 21.19, 23.8). |

### 30.7 Boundaries and regression

| # | Criterion |
|---|---|
| AC-46 | Neither screen has an Equipped, Packed, Worn, or Carried state, a gear toggle, a checklist, an item picker, a "Customize my pack" control, a shop link, a product, a brand, a price, or a quantity (sections 18, 27). No 3D dependency is installed and no `three`, `@react-three/*`, canvas scene, GLB, or model file is added. `package.json` gains no runtime dependency. The preparation image is the existing file, unmodified and not duplicated, and no other media file is added (sections 14.1, 24, 28). |
| AC-47 | Against the `qa` baseline, the change touches nothing under `Project/Backend/`, `Project/docker/`, or `Project/docker-compose.yml`, apart from a separately approved `backend-api` change for B1. |
| AC-48 | FEATURE-001, FEATURE-002, and FEATURE-003 still behave as specified: the landing, sign-in and sign-out, the conversation, New Plan, and session restore. `/gear` and the not-found page are unchanged. `npm run build` and `npm run lint` pass. |

## 31. Decisions, Blockers, Open Questions, and Known Limitations

### 31.1 Lead decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The recommendation context is looked up in FEATURE-003's existing planner session by a `rec` reference in the URL. It is never copied. | Reuses the one owner-checked store; survives reload; needs no second store and no leak-prone history state. |
| D2 | The selection is the Preparation URL, with the trail id and the trip date in the path. No selected-trip store or storage key. | Smallest state that survives reload, direct navigation, and a sign-in round trip. Matches the standing rule in `FRONTEND_CONTEXT.md` section 8 to keep the selected trail and date in route state. |
| D3 | Trail facts come only from the Trail API; the planner session supplies only scenery, score, breakdown, and the scored-for date. | Keeps the responsibility boundaries clean and avoids two sources for one fact. |
| D4 | The trip date is prefilled, can be changed on both screens, and is never written back to the planner. | The user keeps control of the date (PRD section 4.3) without retyping it, and FEATURE-003's state stays FEATURE-003's. |
| D5 | Preparation requests Trail Detail as well as the pack. | Facts for the selected-trail summary, and a real `404` in place of the pack endpoint's `500` (G5). The query is shared, so it is usually cached. |
| D6 | `GET /api/users/me/gear` is not called. | The pack response already carries ownership. Item names belong to FEATURE-005. |
| D7 | Two more Vite development proxy entries, `/api/trails` and `/api/recommendations/pack`. | Same frontend-only local bridge as FEATURE-003 D2. |
| D8 | Readiness is the backend's number, hidden when no gear is recommended, with no threshold colors. | Section 19. The number must not overstate. |
| D9 | Missing rows have no action. | There is nowhere real to send the user yet (G15). |
| D10 | Routes are not drawn in FEATURE-004, even if a route is present. | Every seeded route is `null`, so a renderer could not be validated with real data, and a map library is not approved. |
| D11 | No FEATURE-005 call to action is rendered; its position is reserved. | A control that leads nowhere is a dead end. |
| D12 | Desktop-web first: 1920×1080, 1440×900, 1366×768, and about 1024 px. Below 768 px is best-effort. | User instruction for this feature; consistent with FEATURE-003 D29. |
| D13 | The preparation image is used as delivered, from its existing path, name included. | User instruction; same handling as FEATURE-003 D17. |
| D14 | The pack query is keyed by subject, and one 20-second client timeout applies to each request. | User isolation without new storage; the pack makes far fewer upstream calls than a planner turn. |
| D15 | Trail Detail does not use the preparation scene. It is one `paper` sheet on the `ink` shell; the scene image is neither shown nor requested there (section 13). | A room of gear being packed says "chosen" before the user has chosen, and a large picture beside a trail name reads as a picture of that trail. Accepted from `ui-ux`. |
| D16 | The Preparation panel stands in the left third of the frame, content-height, 520 / 480 / 460 / 420px wide by tier, on the planner panel's edges and surface (21.10). | From the image: the figure, the pack, the laid-out gear, and the window fill the centre, right, top, and bottom. The left third costs only the stove and shelves, and it is where the planner panel stands on `/home`. Accepted from `ui-ux`. |
| D17 | On Trip Preparation the header sits on two local scrim blocks, not on FEATURE-003's full-width band (14.3.3). | The top centre of this image is the window and the mountains; a band would darken them at every size. This departs from the Home pattern for this screen only (Q8). Accepted from `ui-ux`. |
| D18 | The transition from Trail Detail to Preparation is a plain route change with one panel entrance and one scene fade (13.3). | The user's requirement is clarity without a heavy transition architecture; the heading "Preparing for {trail}" carries the meaning without the image. Accepted from `ui-ux`. |
| D19 | The cover fallback is a CSS-only three-tone plate with the caption "No photo of this trail yet." It uses `conifer-deep` and `conifer-press` as flat decorative fills (21.5). | No image asset, nothing that can be mistaken for a photograph of the trail or for an error. DESIGN_SYSTEM section 8 defines those two tokens as the primary action's hover and pressed colors, so this is a feature-level use, reported here and not written into the Design System. Accepted from `ui-ux`. |
| D20 | Gear rows are static text with the state at the end of the row; there are no per-category icons (21.13). | A mark at the start of a row reads as a checkbox, which would be the Equipped state. A boot or jacket icon would suggest a product and invite matching rows to objects in the picture. Accepted from `ui-ux`. |
| D21 | In the briefing the order is readiness, recommended gear, forecast (21.11). | It follows the priority order of section 15. On 768px-high screens the forecast can be below the briefing's fold (Q9). |
| D22 | The Design System proposals from `ui-ux` are deferred: the dark panel recipe, the `paper` content sheet, the tier names, the authenticated header pattern, the outlined meter and bar, the secondary buttons, the in-app heading scale, the status tag, and the token-only media fallback. They stay feature-level values here and `docs/DESIGN_SYSTEM.md` is not edited by this feature. | Same handling as FEATURE-003 D27. Several are now used by two features and are candidates for promotion in a separate, approved change. |

### 31.2 Blockers

| # | Blocker | Blocks | Owner |
|---|---|---|---|
| B1 | Resolved: Trail Detail carries baseline gear through the existing Pack client flow (section 6.1) | No remaining FEATURE-004 block | `backend-api`, completed |

### 31.3 Open questions

| # | Question | Default taken here | Status |
|---|---|---|---|
| Q1 | Should B1 be fixed before the frontend cycle starts, or in parallel? | Fixed before frontend implementation. | Resolved |
| Q2 | Should Preparation show owned item names beside "Owned"? | No (D6). It would add the gear request and an ownership join in React. | Open, non-blocking |
| Q3 | Missing gear cannot be added from the product until the gear inventory exists (PRD step 12 comes after packing). Should a minimal add-gear action be pulled forward, or the features reordered? | Neither. Missing rows are informational (D9). A new user sees every category Missing and 0%. | Open, product decision |
| Q4 | `docs/PRODUCT_REQUIREMENTS.md` section 40 defines Pack as real-time 3D and does not mention a pre-rendered preparation scene. How does this image relate to the FEATURE-005 avatar: replaced, kept behind it, or kept for the non-3D fallback? | Out of scope here. The scene component is replaceable (section 24). The PRD is not edited by this feature. | Open, product decision; PRD update is the user's |
| Q5 | PRD section 11.3 names the Trail Detail action "Plan This Trip"; this feature uses "Choose this trail" as instructed. | "Choose this trail". | Open, terminology; PRD update is the user's |
| Q6 | Should the unknown-category fallback label be "Other gear", or should unknown categories be reported as a defect instead? | "Other gear" (section 18). | Open, minor |
| Q7 | PRD section 42 says primary flows remain usable on mobile; D12 makes below 768 px best-effort. | Best-effort, as for FEATURE-003 D29. | Open, the user's to settle |
| Q8 | Accept the split header scrim on Preparation (D17)? With a long signed-in identity the right block still covers part of the mountain range (14.3.3). Should the identity's width be capped further on this screen? | Split scrim accepted; the identity keeps FEATURE-003's widths. | Open, non-blocking |
| Q9 | Should the forecast move above the gear list, so it is visible without scrolling on 768px-high screens? | No (D21). | Open, non-blocking |
| Q10 | Should the count line ("{m} missing · {o} owned") be kept beside the backend's percentage? | Kept (section 18). | Open, minor |
| Q11 | A `conifer` action cannot sit directly on the panel (about 1.5:1). How the FEATURE-005 call to action is colored is decided with that feature (section 27). | Not decided here. | Deferred to FEATURE-005 |

### 31.4 Known limitations

| Limitation | Effect in this feature | Handling |
|---|---|---|
| Every seeded trail has no image and no route | Trail Detail always shows the cover fallback and the route-unavailable message | Designed fallbacks; not a blocker |
| Why this trail is numbers only | The recommendation has no explanation text, forecast, or distance | Real breakdown shown; nothing authored |
| No reason is given for a recommended category | The user is not told whether the trail or the weather requires it | G7; a later contract change |
| Ownership is by category | A single item in a category marks it Owned whatever the item is | G8; FEATURE-005 handles items |
| The forecast is a daily mean and two maxima | No hourly detail, no condition | Honest labels (section 17) |
| "Today" is judged by the device for the control and by the server for the request | Around midnight, or across time zones, a date the control accepts can be refused | S12 |
| The selection is not saved | Closing the tab loses nothing but the URL; there is no trip list | G14 |
| No browser path outside the development server | `npm run preview` and a deployed build cannot load either screen's data | Section 26 |
| No automated test runner | Validation is in the browser, plus build and lint | Section 30 |
| Scene coordinates in section 14.2 were read by eye from the image, to about ±2 points; panel and sheet heights, scroll amounts, and the "what stays clear" tables are arithmetic from them | A value may need a small correction once rendered | AC-33, AC-34, and AC-38 check them. A needed correction is reported to the lead, not applied silently |
| Contrast ratios in section 23.6 were computed, not measured in a browser | As above | AC-36 measures them |
| The two-axis feather of the header scrim blocks assumes CSS mask compositing in the target browsers | If unavailable, the feather needs another technique with the same result | Reported at implementation; the plateau values do not change |
