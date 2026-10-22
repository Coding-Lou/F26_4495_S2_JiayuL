# Frontend Project Context

Current implementation state of the Outdoor Trip Companion: what an agent needs to change the application safely. State as of 2026-10-21: FEATURE-001 to FEATURE-014 PASS / FROZEN (014 is the final product feature; there is no FEATURE-015); Final Full Regression PASS (classification B) and release gate accepted, so functional development is complete; the feature freeze is active; demo and deployment preparation are next (deployment gaps in §11). Paths are relative to the repository root.

- Product intent: `docs/PRODUCT_REQUIREMENTS.md`. Visual rules: `docs/DESIGN_SYSTEM.md`.
- Per-feature detail (acceptance criteria, decisions, QA, repairs): `docs/features/<feature>.md`; checkpoints `.claude/state/features/`; post-freeze polish `.claude/state/polish/`; cross-feature regressions `.claude/state/final-regression.md` (2026-10-19, 001–010) and `.claude/state/final-regression-2026-10-20.md` (final, 001–014; LOW backlog FR4-1, FR4-2).
- Full pre-compaction version: `docs/archive/FRONTEND_CONTEXT-2026-10-19-pre-compaction.md`. Specs written up to 2026-10-19 cite its section numbers ("FC §x"); sections 1–14 here keep the same topics.

## 1. Product and Implementation Status

Journey: **Discover → Plan → Prepare → Finish preparation → saved Plan → Go in real life → Remember → optionally share back to Discover.** In screens: Discover → Planner → Trail selection → Preparation → Gear Studio → Finish preparation → Ready-to-Go → My Plans / Calendar → (real trip) → past Plan → Memory → optional Community sharing.

| Feature | In code | Status |
|---|---|---|
| 001 Public Landing | Hero media system, reused as the first section of `/` | PASS / FROZEN |
| 002 Authentication | Keycloak Authorization Code + PKCE | PASS / FROZEN |
| 003 Conversational Planner | `/home` | PASS / FROZEN |
| 004 Trail Selection & Preparation | Trail Detail, Trip Preparation | PASS / FROZEN |
| 005 Pack Customization & 3D Avatar | Gear Studio, real-time avatar | PASS / FROZEN |
| 006 Public Discover & Trail Activity | `/`: Hero, viewport-driven map + list, popup, activity | PASS / FROZEN |
| 007 Gear Inventory | `/gear` My Gear | PASS / FROZEN |
| 008 Memory Foundation | `memory-service` (no UI) | PASS / FROZEN |
| 009 My Memories | `/memories` | PASS / FROZEN |
| 010 Community Memories | Public Memories in Discover | PASS / FROZEN |
| 011 Plan Foundation & Finish Preparation | `plan-service`; **Finish preparation** in the Studio | PASS / FROZEN |
| 012 Ready-to-Go 3D Completion | `ready_to_go` clip after a confirmed save; "Ready for the trail." completion | PASS / FROZEN |
| 013 My Plans & Calendar | `/plans`: Upcoming / Past, monthly calendar, inline Plan detail, delete; **Plans** header link; Continue → `/plans` | PASS / FROZEN |
| 014 Plan → Memory Bridge | `/plans` selected Past curated Plan: Add memory / View memory, derived from the owner's Memories; `/memories/new?trail=&date=` | PASS / FROZEN; final product feature |

Approved changes without a feature number, all PASS: viewport-driven Discover and the curated/synthetic trail dataset (2026-10-17); planner no-preference semantics, planner duration modes, Discover trail name search, final polish (2026-10-19).

## 2. Architecture

Backend: Java 21 / Spring Boot 4.1.1, Maven multi-module, `Project/Backend/`.

| Module | Port | Responsibility |
|---|---:|---|
| `user-service` | 8081 | Local profile from Keycloak claims; owned gear CRUD |
| `trail-service` | 8082 | Trail search, PostGIS nearby, detail, Daily Trail Activity |
| `recommendation-service` | 8083 | Planner, OpenAI intent extraction, Open-Meteo, scoring, packing |
| `memory-service` | 8085 | Memories: owner CRUD, public reads, photos |
| `plan-service` | 8086 | Plans: idempotent create, list, read, soft delete |
| `api-gateway` | 8080 | Shell only: no routes, security, or CORS |
| `activity-service` | 8084 | Empty shell (activity is served by trail-service) |

Databases (Flyway per module): `user_db`, `trail_db` (PostGIS), `memory_db`, `plan_db`; no cross-database foreign keys; recommendation-service has none. `Project/docker/postgres/init-databases.sql` creates them only on a fresh volume; an older volume needs a one-time `CREATE DATABASE …`; never delete the volume or a database. `Project/docker-compose.yml` starts PostgreSQL/PostGIS and Keycloak 26.7.4 only. External: Keycloak issuer `http://localhost:8180/realms/outdoor-trip`, OpenAI Java SDK (`OpenAIOkHttpClient.fromEnv()`), Open-Meteo.

## 3. Backend Capabilities

**User service.** Validates JWTs; auto-creates the profile from `sub`, `email`, `name` → `preferred_username`; CRUD on the caller's gear only (soft delete). No registration, password, or profile-editing endpoints.

**Trail service.** Name search with optional difficulty / max distance / max elevation; nearby by PostGIS distance, nearest first; detail with a GeoJSON `route` when present (seed routes and cover images are null). Two trail populations:

- **Curated catalog:** 8 `DEMO_SEED` trails (`V2`), `discover_visible = true`.
- **Synthetic planner candidates:** 400 deterministic `SYNTHETIC_DEMO` trails (`V8`), `discover_visible = false`, across Southwest BC, all difficulties and sceneries. Descriptions begin "Generated sample route, not a verified trail." Not real trails.
- `discover_visible` is presentation only. `GET /api/trails` and Daily Trail Activity cover the curated catalog only; `/nearby` and `/{id}` return both, so Discover, the planner, Trail Detail, Trip Preparation, the Studio, and Plans accept synthetic trails.
- Public: `GET /api/trails`, `/api/trails/{uuid}`, `/api/trails/activity`, `/api/trails/nearby`. Validation failures are `400` with Spring's default body.
- Daily Trail Activity is `SIMULATED` (deterministic per trail and date). Nothing derives a `RECORDED` source from Plans yet.

**Recommendation service.** Stateless planner turn, one-shot `/query`, `/pack`, a prompt-injection guard before OpenAI, and a temporary `/trails` filter (not the planner contract). Forwards the user's token to trail- and user-service.

**Memory service** (spec 008).

- A Memory: immutable `trailId`, `tripDate`, `title`, optional plain-text `story`, `visibility` (`PRIVATE` default, `PUBLIC` by the author's choice), 0–5 photos; lowest position is the cover.
- Owner = token `sub` (`owner_subject`), never accepted or returned. Foreign, missing, and deleted Memories are the same `404`.
- Owner API (token) and public API (no token) have separate controllers and DTOs. Public DTOs carry no author identity; `PRIVATE` and deleted rows are filtered in the query. A deleted trail hides its Memories publicly; the owner still sees them.
- Trail validated at create only (`400 TRAIL_NOT_FOUND`, `503` when trail-service is unreachable). The check is existence only: the server accepts synthetic trail ids; "curated only" is enforced by the UI (picker, Trail Detail, Plan bridge).
- Several active Memories may share owner + trail + date (no unique index); the owner list has no trail / date filter.
- Photos: one multipart `file` per request; JPEG/PNG/WebP by bytes; ≤ 10 MB, ≤ 40 MP, ≤ 12,000 px a side. Re-encoded from pixels, so no EXIF/GPS/XMP is stored; originals never stored.
- Storage: local filesystem (`memory-service/.local-storage/`, dev only) or S3 (no bucket yet). Responses carry a signed `url` valid 15 minutes and `urlExpiresAt`; object keys are never returned. Local URLs are root-relative (`/api/memories/local-photos/...`).
- Soft delete keeps rows and objects; no restore.

**Plan service** (spec 011 §6–§12).

- A Plan: `id`, `trailId`, `tripDate`, `status` (`READY`, the only value), `createdAt`, `updatedAt`; internal `owner_subject` (token `sub`, never accepted, returned, or logged) and `deleted`. No trail, weather, or gear snapshot. Upcoming / Past is derived from `tripDate`; there is no `COMPLETED`.
- Create is idempotent per `(owner, trailId, tripDate)` among non-deleted Plans (partial unique index): `201` new, `200` existing unchanged; concurrent creates give one row. A deleted Plan does not block recreation.
- Trail validated at create (`400 TRAIL_NOT_FOUND`; otherwise `503 TRAIL_SERVICE_UNAVAILABLE`); synthetic trails are valid; `tripDate` not before the server's today.
- All queries scoped to owner and `deleted = false`; foreign, deleted, missing → `404 PLAN_NOT_FOUND`. No public endpoint; no update (trail + date are the identity); no range queries.

## 4. API Contracts

Every endpoint needs a bearer token except the four public trail reads, `GET /api/memories/public`, `GET /api/memories/public/{id}`, and local-mode signed photo URLs. An invalid token is refused even on a public path, so the frontend sends none there.

| Method | Path | Request | Response | Auth |
|---|---|---|---|---|
| GET, POST | `/api/users/me/gear` | POST `{ name ≤100, category?, description? ≤255 }` | list newest first / item 201 | Token |
| PUT, DELETE | `/api/users/me/gear/{id}` | PUT full replacement | item / 204 | Token |
| GET | `/api/users/me` | — | `UserResponse` (not called by the frontend) | Token |
| GET | `/api/trails` | `search`, `difficulty`, `maxDistanceKm`, `maxElevationGainM` | `TrailSummaryResponse[]`, curated only | Public |
| GET | `/api/trails/nearby` | `lat`, `lon`, `0 < radiusKm <= 150` | `NearbyTrailResponse[]`, both populations | Public |
| GET | `/api/trails/{uuid}` | — | `TrailDetailResponse`; 404 empty body | Public |
| GET | `/api/trails/activity` | `date` within one day of the server's | `TrailActivityResponse` | Public |
| POST | `/api/planner/turn` | `PlannerTurnRequest` | `PlannerTurnResponse` | Token |
| POST | `/api/recommendations/query` | `{ message, latitude, longitude, tripDate, radiusKm? }` | `{ recommendations[≤3] }` | Token |
| POST | `/api/recommendations/pack` | `{ trailId, tripDate ≥ today }` | `PackRecommendationResponse` | Token |
| GET, POST | `/api/memories` | `page`, `size` / `{ trailId, tripDate, title, story?, visibility? }` | `MemoryPage<OwnerMemorySummary>` / `OwnerMemoryDetail` 201 | Token |
| GET, PUT, DELETE | `/api/memories/{id}` | PUT `tripDate`, `title`, `story`, `visibility` | `OwnerMemoryDetail` / 204 | Token |
| POST | `/api/memories/{id}/photos` | multipart `file` | `MemoryPhotoResponse` 201 | Token |
| PUT | `/api/memories/{id}/photos/order` | `{ photoIds }` = exactly the current photos | photos | Token |
| DELETE | `/api/memories/{id}/photos/{photoId}` | — | 204 | Token |
| GET | `/api/memories/public` | `trailId`, `page`, `size` | `MemoryPage<PublicMemorySummary>`; `totalItems` = public count | Public |
| GET | `/api/memories/public/{id}` | — | `PublicMemoryDetail`; PRIVATE/deleted/missing → 404 | Public |
| POST | `/api/plans` | `{ trailId, tripDate }` | `PlanResponse` 201 / 200 | Token |
| GET | `/api/plans` | `page` (0), `size` (20, max 50) | `PlanPage`, `tripDate ASC, createdAt ASC, id ASC` | Token |
| GET, DELETE | `/api/plans/{id}` | — | `PlanResponse` / 204 | Token |

Pages (memory, plan): `{ items, page, size, totalItems, totalPages }`, `size` max 50. Memory lists order `tripDate DESC, createdAt DESC, id DESC`; the server accepts a Memory date up to its today + 1 (time-zone allowance), and the UI blocks future dates. User, memory, and plan errors are `ProblemDetail` with `code` (`VALIDATION_ERROR` + `errors[]`, `AUTHENTICATION_REQUIRED`, `*_NOT_FOUND`, `PHOTO_LIMIT_REACHED` 409, `PAYLOAD_TOO_LARGE`/`IMAGE_TOO_LARGE` 413, `UNSUPPORTED_MEDIA_TYPE` 415, `TRAIL_SERVICE_UNAVAILABLE`/`STORAGE_UNAVAILABLE` 503); trail and recommendation use Spring defaults.

**DTOs** (Java sources in each service's `dto/`; full Memory field lists in spec 008 §13–§14; frontend types in each feature's `types/`):

- `TrailSummaryResponse`: `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `latitude`, `longitude`, `source` (`DEMO_SEED` | `SYNTHETIC_DEMO`), `scenery[]`, nullable `coverImageUrl`, `baselineGearRequirements[]`. Detail adds nullable `route`. Nearby = `{ trail, distanceFromUserKm }`.
- `TrailActivityResponse`: `{ date, source: SIMULATED | RECORDED, trails: [{ trailId, activityCount }] }`, catalog trails only, zeros included; an absent trail is unknown, never zero.
- `ScoredTrailRecommendation`: `trail`, `score`, `breakdown` (`intent`, `weather`, `gear`, `scenery`, `proximity`); no weather, distance, derived gear, or intent.
- `PackRecommendationResponse`: `trailId`, `trailName`, nullable `weather` (`temperatureC`, `precipitationProbability`, `windSpeedKmh`), `weatherAvailable`, `requiredGear[]` of `{ category, owned }`, `readinessPercentage`.
- `GearItemResponse`: `id`, `name`, nullable `category`, nullable `description`, `createdAt`.
- Memory photos (`MemoryPhotoResponse` / `PublicPhoto`): `id`, `position`, `url`, `urlExpiresAt`. No Memory DTO contains an owner subject, email, user id, display name, object key, or `deleted`.
- `PlanResponse`: `{ id, trailId, tripDate, status: "READY", createdAt, updatedAt }`.
- Enums: difficulty `EASY | MODERATE | HARD`; scenery `LAKE | VIEWPOINT | WATERFALL | FOREST | MOUNTAIN | OCEAN`; `GearCategory` `FOOTWEAR | RAIN_GEAR | WARM_LAYER | WIND_LAYER | TREKKING_POLES | TRACTION | HEADLAMP | BACKPACK | WATER | FOOD | SUN_PROTECTION`; `PRIVATE | PUBLIC`. Keep wire values canonical; map to labels in the UI only.

### Conversational planner contract

`POST /api/planner/turn` is **stateless**: the frontend owns the messages and the `PlanningContext` and sends the latest context back on each turn after the first.

- Request: `message` (non-blank, ≤ 2000), `context` (null first), `latitude`, `longitude`, `tripDate`, optional `radiusKm` (> 0, default 50 km).
- `PlanningContext`: `difficulty`, `maxDistanceKm`, `maxElevationGainM`, `maxDurationMin`, `durationMode` (`APPROXIMATE | MAXIMUM | MINIMUM`; null only without a duration; a duration with no mode reads as `MAXIMUM`), `preferredScenery[]`, `openPreferences[]` (`DIFFICULTY | SCENERY | TRIP_LENGTH`; trip length = duration, distance, elevation), `lastAsked` (null when ready). Responses include every field; the client sends them back unchanged.
- Response: `status` (`NEEDS_CLARIFICATION` | `READY_TO_RECOMMEND`), `assistantMessage`, merged `context`, `recommendations[]`.
- **Merge:** only explicitly mentioned preferences change. A dimension named as open ("any", "no preference") becomes open and loses its value; general flexibility opens only dimensions without a value; receiving a value removes a dimension from `openPreferences`. Null + open = "any"; null + not open = "not answered yet". Each dimension is asked at most once: an unresolved `lastAsked` becomes open.
- **Readiness:** difficulty resolved (value or open) and the trip group resolved (a duration, distance, or elevation value, non-empty scenery, or `TRIP_LENGTH`/`SCENERY` open). Otherwise one question, difficulty first.
- **Duration:** "around/about N hours", bare "N hours", "half-day" (240), "a couple of hours" (120), "a few hours" (180), "full-day" (450), and ranges (midpoint) are `APPROXIMATE`; "up to / at most / under" `MAXIMUM`; "at least / or longer / more than" `MINIMUM`. A later duration replaces value and mode.
- **Hard constraints:** explicit difficulty (exact), non-empty scenery (any-match), `MAXIMUM` / `MINIMUM` (a trail with no duration is kept, scoring 0 duration points). No eligible candidate → ready with an empty list and a no-match message. Open dimensions add no constraint.
- The "So far" line shows "Any difficulty" / "Any trip length" / "Any scenery" and "Around …" / "Up to …" / "At least …".

## 5. Important Backend Classes

Under `Project/Backend/<module>/src/main/java/com/jay/outdoor/<module>/`: controllers in `controller/`, services in `service/`, `config/SecurityConfig` per service (trail-service also holds the only CORS, for `http://localhost:5173`). Recommendation: `ConversationPlannerService` (merge, readiness), `RecommendationService` (orchestration, `WEATHER_SHORTLIST_SIZE`), `TrailScoringService`, `GearRequirementService`, `PackRecommendationService`, `client/{trail,user,weather}/`, `ai/` (OpenAI extraction, `IntentPromptBuilder`). Memory: `PhotoSanitizer` (`image/`), `MemoryPhotoStorage` local/S3 (`storage/`), `TrailCatalogClient`. Plan-service follows the memory-service conventions (spec 011 §8–§12).

## 6. Trail Recommendation Flow

Planner turn: prompt guard → OpenAI extraction into a partial delta → merge → readiness; not ready returns a question without calling other services. Ready runs the `/query` pipeline:

1. Nearby trails (request radius or 50 km) and the user's gear, with the user's token.
2. **Bounded weather shortlist:** drop candidates failing hard rules, rank the rest by weather-free factors (ties nearest first), keep the top 15; only those get an Open-Meteo call (sequential). A failed lookup scores weather 0 for that trail and does not fail the request.
3. Required gear = baseline + weather: rain gear at precipitation ≥ 40 %, warm layer ≤ 5 °C, wind layer ≥ 30 km/h, sun protection ≥ 25 °C with precipitation < 20 %.
4. Score (100): intent 55 (difficulty 20, distance 15, elevation 10, duration 10: `APPROXIMATE` full within ±15 %, falling to 0 at ±75 %; full inside a `MAXIMUM`/`MINIMUM` bound), weather 15, gear readiness 15, scenery 10, proximity 5. Top three.

`/pack`: baseline from trail detail plus weather rules; a weather failure returns baseline-only with `weatherAvailable=false`; `readinessPercentage` = share of required categories owned.

## 7. Authentication and Request Layers

Spec 002. Code in `src/features/auth/`; `authSession.ts` is the only importer of `keycloak-js` (26.2.x).

- Public client `outdoor-web`, standard flow, PKCE S256, nonce, fragment response mode. Config `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` (`.env.example`, local `.env.local`); missing values mean sign-in unavailable.
- Credentials only on Keycloak pages, reached only when the user activates Sign in / Create account. A signed-out visitor on a protected route goes to `/` with a sign-in gate.
- Tokens in adapter memory only; nothing token-shaped in storage, cookies, URLs, or the console (except the adapter's short-lived `kc-callback-<state>`). Restore after reload: hidden-frame `prompt=none` (`public/silent-check-sso.html`; needs same-site cookies, fails closed). Renewal ~30 s before expiry, on protected navigation, on tab visibility, and in `getAccessToken()`; refusal → `session-expired`.
- Exports: `getAccessToken()` (or `NotAuthenticatedError`), `getAuthenticatedSubject()` (the `sub`, to bind per-user state), `useAuth()` (states `initializing`, `unauthenticated`, `redirecting`, `callback-processing`, `authenticated`, `callback-failed`, `session-expired`, `signing-out`, `signed-out`; waits bounded at 9 s, doubt → signed-out).
- **Return destination:** pathname only, in session storage, validated on write and read by `returnDestination.ts` (`/home`, `/gear`, `/plans`, `/trails/<id>[/prepare[/<date>[/pack]]]`, `/memories[/new|/<uuid>[/edit]]`), used once. Discover's **Sign in to plan this trip** / **Create account** call `startTrailPlanning(trailId, action)` (`authBoundary.ts`), saving `/trails/<id>`; the header Sign in lands on `/home`.
- **Sign-out:** `POST` to Keycloak's end-session endpoint, back to `/`; clears the session, the Query cache, the return destination, and per-user session state (`registerSessionCleanup`). Header identity comes from the ID token.

**Request layers** (`src/services/apiClient.ts`, base `VITE_API_BASE_URL`, empty = same origin):

- `authenticatedApiRequest()` obtains a token right before each request and attaches it only to `/api/` paths on the configured origin. Used by planner, pack, gear, owner Memory, and Plan requests.
- `features/trails/api/publicRequest.ts`: tokenless, `credentials: "omit"`. All trail reads (for every visitor) and public Memory reads.
- Feature request layers own time limits (20 s; 60 s for photo uploads), `AbortSignal`, and best-effort `ProblemDetail` parsing: `memories/api/memoryRequest.ts`, `plans/api/planRequest.ts` (optional `cancel` signal for queries), `gear/api/`, `trails/api/tripRequest` (pack).

**Session storage** (tab-scoped, never `localStorage`, never a token):

- `outdoor-trip-companion.planner` (`planning/storage/plannerSession.ts`, v2): `owner`, `messages`, `context`, `tripDate`, `startingPoint`, `draft`, `draftFromLanding`.
- `outdoor-trip-companion.loadout` (`loadout/storage/loadoutStorage.ts`, v1): `owner`, `trips["<trail id>/<date>"] = { equipped: { <GearCategory>: <item id> }, updatedAt }`; past trips dropped, ≤ 20 trips, confirmed against the gear list before counting as Equipped.
- Both are bound to `owner` = `sub`: read only once the subject is known, discarded whole on a bad shape or another owner, never written without an owner, removed on sign-out, expiry, and a sessionless startup (`PlannerSessionBoundary`, `LoadoutSessionBoundary` in `AppProviders`).
- Also: return destination, sign-out notice markers, and the legacy pending prompt (read as a draft, never written).

**Keycloak setup** (manual; no realm export): `outdoor-web` public, standard flow only, PKCE S256; redirect URIs `http://localhost:5173/auth/callback` and `/silent-check-sso.html`; post-logout `http://localhost:5173/`; web origin `http://localhost:5173`. Realm: registration on, access token 300 s, SSO idle 30 min, max 12 h, password ≥ 8. Login theme in `Project/docker/keycloak/themes/outdoor-trip-companion/`. The dev server is pinned to 5173; `npm run preview` cannot sign in.

**Development proxy** (`vite.config.ts`; the only browser path, no gateway): `/api/planner/**`, `/api/recommendations/pack` → 8083; `/api/trails/**` → 8082; `/api/users/me/gear/**` → 8081; `/api/memories/**` → 8085; `/api/plans/**` → 8086. Nothing else.

## 8. Frontend Architecture

**Stack:** React 19.3, TypeScript 6.0, Vite 8.3, Tailwind CSS 4.3, shadcn/ui (New York), React Router 7.18, TanStack Query 5.104. Studio avatar only: `three` ^0.186, `@react-three/fiber` ^9.8 (no drei). Discover map only: `maplibre-gl` ^6.14 with OpenFreeMap tiles/glyphs and a local style (`mapStyle.ts`).

| Route | Screen | Notes |
|---|---|---|
| `/` | Hero, then Discover | Public; signed-in → `/home`. Params `trail`, `memories=1`, `memory`; `/#discover` and `/?trail=` open at Discover |
| `/auth/callback` | Keycloak return | Replaces itself with the destination or `/` |
| `/home` | Planner over Home media | Protected |
| `/trails/:trailId` | Trail Detail | Protected. `?rec=` shows "Why this trail" from the planner session. Date + **Choose this trail**. **Add a memory** link for non-synthetic trails |
| `/trails/:trailId/prepare/:tripDate` | Trip Preparation | Protected. The address is the selection; no date → asks, no request. **Gear up** after a successful pack |
| `/trails/:trailId/prepare/:tripDate/pack` | Gear Studio | Protected. Invalid/past date or pack `400` → Trip Preparation. Ends with **Finish preparation** |
| `/gear` | My Gear | Protected |
| `/memories`, `/new`, `/:memoryId`, `/:memoryId/edit` | My Memories | Protected. `/new?trail=<uuid>&date=<YYYY-MM-DD>` preselects (each optional; `date` only if ISO and ≤ today, else ignored) |
| `/plans` | My Plans | Protected. `?plan=<id>` = the user-selected Plan (written with `replace`; dropped after a successful load without it) |
| `*` | Not Found | Public; only user of `AppLayout` |

`ProtectedRoute` renders nothing protected before a session is confirmed (presentation only; services enforce auth). The trip screens, My Gear, and My Memories use `components/layout/TripShell` + `TripHeader` (current link `aria-current="page"`). Route pages are lazy chunks (`pages/LazyRoutes.tsx`); the map and avatar runtimes are separate dynamic imports; a signed-out `/` loads no planner, Studio, `three`, or GLB code.

**Server state:** TanStack Query. Per-user keys include the subject and send nothing without one; public keys have none; `queryClient.clear()` on sign-out and expiry; mutations are not optimistic; pass `AbortSignal`. Selected trail and date live in the route.

### Discover (`features/discover`; specs 006, 010)

- `PublicHomeScreen`: fixed `PublicHeader` + Hero (`features/landing`: three scenes, posters, rotation, reduced-motion poster, Pause/Play, **Explore trails**; `HeroNotice` hosts auth notices) + `DiscoverSection`. No planner.
- **Viewport reads:** settled view → radius (centre to farthest corner × 1.15, clamped [2, 150] km, `map/viewport.ts`) → tokenless `/nearby`. Reported on `load` and 250 ms after `moveend` with no new movement, never during movement. Before or without the map, `DEFAULT_BOUNDS` (Vancouver / Lower Mainland). The map gets the whole result; the list gets trails inside the visible rectangle.
- **List** (`TrailRow`, the keyboard and assistive path): nearest the centre first, "N trails in this area", ≤ 50 rows plus the selected one ("Showing the 50 nearest of N… Zoom in to see more."), "Zoom in to explore trails in this area." beyond 150 km, quiet "Updating trails…", empty state, alert + Retry on failure (never "0 trails").
- **Map** (`map/TrailMap.tsx`; only `map/runtime/` imports `maplibre-gl`): loaded when Discover's first pixel enters the viewport, on Explore trails / header Discover, or at once on `/#discover` / `/?trail=`. Staying on the Hero loads no map code and makes no nearby request. Native clustering: source `discover-trails`, `clusterRadius` 50, `clusterMaxZoom` 12; cluster labels count **trails** only; points in three activity levels (base, 1–9, ≥ 10); a `discover-trail-focus` source keeps the selected/hovered trail out of clusters; cluster click eases to the expansion zoom; `cooperativeGestures`; no DOM per trail.
- **Selection:** the `trail` search parameter (written with `replace`) drives list, map, and popup. It is removed when the current view's result no longer contains the trail. A deep link outside the result is read by id and the map centres on it.
- **Popup** (`TrailPopup.tsx`, placed beside the trailhead by `map/popupPlacement.ts`): facts → today's activity + "Sample activity" → description, scenery → sample-data line (`isSampleTrailSource()`) → Community Memories (curated only) → **Sign in to plan this trip**, **Create account**, Close. No View trail, no route change.
- **Activity:** one request for the viewer's local date; "N trips planned for today" / "1 trip planned for today" / "No trips planned for today yet"; non-`RECORDED` disclosed as "Sample activity"; unavailable never zero; synthetic trails show "Today's activity isn't available."
- **Trail name search** (`TrailSearchField`, `search/`): combobox over the curated catalog (`GET /api/trails`, requested on first focus, `["trails", "list"]`) merged with the loaded nearby set; synthetic trails outside it are never fetched. Exact → prefix → contains, curated first, ≤ 12. Results replace the list and hide the popup. A pick writes `trail`, clears the query, and eases to the trailhead at zoom ≥ 12 (`TrailMapApi.focusOn`; instant under reduced motion). Typing sends no request.
- **Queries:** `["trails", "nearby", lat 3dp, lon 3dp, radiusKm]` (`keepPreviousData`, current key only drives the screen) and `["trails", "activity", date]`; 5 min fresh, no focus refetch, no polling, no per-marker requests.

### Community Memories (`features/community-memories`; spec 010)

- Popup section (curated trails): public count, ≤ 2 rows, **View all memories**; "No public memories yet."; "Community memories are unavailable." + Retry. Synthetic trail (`isSyntheticTrailSource()`): no section, no request.
- Panel: ≥ 1024 px a docked non-modal `aside` over the map's right side (`--community-panel-width` on `section.discover[data-community-open]`); below, a `<dialog>` bottom sheet. The popup stays mounted but hidden and `inert` while it is open — never both visible. 8 per page, **Show older memories**; read-only Detail; a `404` or other-trail Memory shows "This memory is no longer available."
- URL `?trail=&memories=1[&memory=]`; opening pushes an in-app-marked entry; Back/Close/Escape go back when marked, else `replace`. Invalid combinations are dropped; changing or clearing the trail removes both params in the same write.
- Keys (no subject, separate from `["memories", …]`): `["community-memories", "trail", id, "preview" | "list"]`, `["community-memories", "detail", id]`; 5 min stale, 10 min gc. No author identity, owner controls, social features, or sign-in in the panel; a failure never blocks the popup, map, or list. Focus: heading on open, title on Detail, back to the opener on Close; Escape closes Detail, then the panel, never the popup.

### Planner (`features/planning`, `features/home`; spec 003)

`HomeMedia` (poster; looping video at ≥ 768 px with motion allowed) and the planner are siblings sharing no state. `plannerStore` holds messages, context, date, starting point, draft. Geolocation only on user action. Cards link to Trail Detail with `?rec=`; `trailContext.ts` is the one selector other features may use. **New Plan** resets the planner, not the loadout.

### Trail Detail, Trip Preparation, Gear Studio (specs 004, 005, 011)

- Trail query keyed by id (public read, shared); pack query keyed by subject + trail + date (runs on each Trip Preparation mount); gear list keyed by subject (runs on each Studio mount).
- **Recommended** (pack, per trip) ≠ **Owned** (inventory) ≠ **Equipped** (loadout, per trip). Missing = recommended categories not owned. Nothing auto-equips; one equipped item per category.
- **Gear Readiness** = share of recommended gear categories owned ("All recommended gear covered" / "N recommended items missing"); not the planner's Match score.
- Studio: equip/unequip rows, inline **Add gear** (refetches gear and pack), "Equipped for this trip", avatar Stage. Equipped state is `loadout/state/loadoutStore.ts` (`useSyncExternalStore`), never cache or URL; `reconcileLoadout` drops removed or recategorized items.
- **Avatar** (`features/avatar`): `avatarManifest.ts` names the GLBs (avatar `public/models/avatar/avatar-base-ready-to-go.glb`, the FEATURE-012 versioned copy holding `Idle` and `ready_to_go`; `public/models/gear/gear-backpack.glb`, `gear-trekking-poles.glb`, `gear-headlamp.glb`; fetched as `/models/...?v=<version>`, version 1). The FEATURE-005 `avatar-base.glb` stays on disk, unreferenced, as the rollback baseline: rollback is pointing `avatar.model` back at it (a file without `ready_to_go` gives the static completion). Spec 012 §14.4; the three-free `AvatarViewer` shell does the WebGL 2 check, one dynamic import (20 s), error boundary; `runtime/` (only `three`/R3F code) uses one canvas, on-demand frames, `GLTFLoader` only. Mounted at ≥ 768 px; gear selection works without it.
- **Finish preparation** (`plans/components/FinishPreparation.tsx`): shown only when the Studio is `ready`, whatever the readiness. `createPlan` with the route's trail and `:tripDate` (authoritative; a now-past date sends nothing and links to Trip Preparation). `useCreatePlan`: `retry: false`, `networkMode: "always"`, no cache writes. Phases `idle → saving → celebrating → complete | failed` (`data-finish-phase`). On `201`/`200` it announces "Your plan is saved.", shows **Plan saved** (`aria-disabled`), and calls the optional `celebrate()` from `loadout/hooks/useReadyToGo.ts`, which cues the viewer (`readyCue` in, `readyClip: none | available | playing` out, `data-avatar-ready`) and resolves on the clip's end, no start within 1 s, viewer unavailable, Pause or reduced motion, or a 5 s safety; `FinishPreparation` adds a 6 s ceiling. The clip plays once (`LoopOnce`, 0.25 s crossfades from and back to `Idle`), never replays on remount or Retry, and gear controls stay enabled. Then **Ready for the trail.** + the saved line + **Continue** to `/plans`, or inline failure + Try again (announcer silenced, no clip). Spec 012 §10–§16. Nothing stored on the client; later loadout changes do not touch the Plan. Uses Studio class names, no CSS of its own.

### My Gear (`features/gear`; spec 007)

Grid, detail panel (non-modal ≥ 1024 px, sheet below), one Add/Edit dialog, inline remove, family filter; page state only. `PUT` always sends `name`, `category`, current `description`; `DELETE` 2xx or 404 = removed. `categories.ts` is the single label map; interim lucide art (`art/gearArtManifest`), no 3D. Never touches the loadout.

### My Plans (`features/plans`; specs 013, 014)

- Header: **Plans** before Gear in `TripHeader` (with `aria-current="page"` on `/plans`) and `HomeHeader`, row and Menu. The brand is the Planner entry; there is no Planner link.
- List: `requestPlans` reads `GET /api/plans?page=n&size=50` for every page; more than 10 pages, or paging metadata still changing after one restart from page 0, is `PlanListIncompleteError` (a dedicated incomplete state, never a partial list). Key `["plans","mine",subject]`, disabled without a subject, `refetchOnMount: "always"` (so Continue shows the new Plan), no focus / reconnect refetch. `GET /api/plans/{id}` is not used.
- Delete: `deletePlan` (2xx and `404` = removed), `useDeletePlan` (`retry: false`, `networkMode: "always"`, `setQueryData` filter then invalidate). Two-step inline confirmation.
- Trails: `useQueries` over distinct trail ids with `trailDetailQueryOptions(id)` exported from `trails/hooks/useTrailDetail.ts` (the same key and policy as Trail Detail); `404` = "Trail unavailable", other failures = "Trail details couldn't be loaded." with Try again.
- Upcoming `tripDate >= todayIso()` (server order), Past `<` (date descending); `useTodayIso` re-reads on visibility; calendar months from integers (`model/calendarMonth.ts`, Sunday first, 6 rows); only days with Plans are buttons. No `new Date("YYYY-MM-DD")`.
- Actions: View trail (`trailDetailLocation`), Review gear on Upcoming only (`tripPreparationLocation`). No weather, readiness, or editing.
- **Memory bridge** (spec 014; `components/PlanMemoryBridge.tsx`, `model/planMemory.ts`), in the selected Plan's detail only, after the context lines and before the actions:
  - Status per Plan (`planMemoryStatus`): Upcoming (`tripDate >= today`), trail `loading` / `gone` / `failed`, or `isSyntheticTrailSource(source)` → nothing rendered. Otherwise from the screen-level index state (`memoryIndexState` in `MyPlansScreen.tsx`): a Try-again refetch → unavailable working state; error (even with cached data) → "Memory status is unavailable." + Try again (index `refetch()` only); pending / fetching / disabled / `no-session` → checking (no CTA; placeholder and hidden status after 500 ms); otherwise **View memory** (`memoryDetailLocation(id)`, line "You kept a memory of this trip.") or **How was your trip?** + **Add memory** (`newMemoryLocation(lowercased trailId, tripDate)`).
  - Match: lowercased `trailId` + exact `tripDate` string over the owner index; first in server order (= most recently created) wins. Nothing stored on Plan or Memory.
  - Index `useOwnerMemoryIndex(enabled)` (`memories/hooks/memoryQueries.ts`), enabled when the list is ready and some Past Plan's trail is not known synthetic or gone. Reserved row height; one polite change-only status region; focus moves only when the focused Try again is replaced. Calendar and collapsed rows carry nothing about Memories.

### My Memories (`features/memories`; spec 009)

- Keys `["memories", "mine", subject]` (infinite, 12) and `["memories", "detail", subject, id]`; 5 min stale, 10 min gc.
- Owner index (spec 014): `requestAllMemories` reads `GET /api/memories?page=n&size=50` with a strict page reader (an unreadable item fails the read; the lenient `readMemoryPage` of the list is unchanged); more than 10 pages, or metadata / distinct count still changing after one restart, is `MemoryListIncompleteError` (failure kind `unusable`); never a partial array. Key `["memories","mine",subject,"all"]` (under the `mine` prefix, so every `refreshList` after create / update / delete / photo change invalidates it); own options: `refetchOnMount: "always"`, no focus / reconnect refetch, no polling, one retry on `unavailable`. Trail names via `["trails", "list"]` ("Trail unavailable" if absent); the picker lists curated trails only.
- Create: one `POST` (ref guard), photos uploaded in order, at most one reorder, `replace` to Detail. Failed upload → "Memory saved, N of M photos added" with Retry/Remove. Timed-out `POST` reported as unconfirmed, never retried.
- Edit: one `PUT` (never `trailId`); photo changes persist immediately, serialized. Move earlier / later; first photo is the cover.
- Photo preparation (`photos/preparePhoto.ts`, not a privacy control): JPEG/PNG/WebP, orientation applied (`createImageBitmap` with `imageOrientation: "from-image"`, image fallback), long edge ≤ 2560 px, JPEG 0.88 (PNG only with transparency), ≤ 10 MB, ≤ 5 photos.
- Leave guard (`useBlocker`, `beforeunload`; never on sign-out); its dirty check compares against the preselected trail and date (`initialTrail`, `initialDate`), so an untouched prefilled form is clean. Inline two-step Delete; notices via router state; nothing in web storage. Entry: header **Memories**, Trail Detail **Add a memory** (`newMemoryLocation(trailId)`), absent for synthetic trails, and a past curated Plan's **Add memory** (`newMemoryLocation(trailId, tripDate)`); preselected trail and date stay editable.

**Signed photo URLs** (both Memory features): presentation only — never stored, put in a URL, or used as keys. `usePhotoRecovery`: a failed or already-expired image refetches its query once, only if that result is older than 60 s; otherwise "Photo couldn't be shown". Lists load covers lazily; gallery photos only in an opened Detail.

## 9. Upcoming Feature Boundaries

From spec 011 §4; each feature's spec refines them.

- **FEATURE-012 Ready-to-Go 3D Completion:** PASS / FROZEN (2026-10-20); current behavior in §8. Continue goes to `/plans` since FEATURE-013 (`continueTo` in `GearStudioScreen.tsx`); it never appends `?plan=`.
- **FEATURE-013 My Plans & Calendar:** PASS / FROZEN (2026-10-20); current behavior in §8 My Plans. Range filters, if ever needed, are additive optional params.
- **FEATURE-014 Plan → Memory Bridge:** PASS / FROZEN (2026-10-20), the final product feature; current behavior in §8 My Plans (Memory bridge) and My Memories. Past Plans on synthetic trails have no bridge. There is no FEATURE-015; the Final Full Regression passed (2026-10-21) and the feature freeze is active.

## 10. Frontend Feature Boundaries

```text
src/app/ (providers, router)  components/layout/ (TripShell, TripHeader, announcer, Retry)  components/ui/
src/features/
  auth/  landing/  discover/ (map/, map/runtime/, search/)  community-memories/  home/  planning/
  trails/ (api/publicRequest, tripRoutes.ts, activity.ts, content.ts)  packing/  gear/  loadout/
  avatar/ (runtime/)  memories/  plans/ (api/, components/, hooks/, types/)
src/lib/  src/pages/ (LazyRoutes.tsx)  src/services/apiClient.ts
```

- Organize by feature; request functions and contract types live in the owning feature; no empty placeholder folders.
- One-way dependencies: `planning` imports no business feature; `trails`/`packing` take from `planning` only `trailContext.ts`, `presentation.ts`, `tripDate.ts`, and the date control. `packing` → `trails`, `gear` (labels). `loadout` → `packing`, `trails`, `gear`, `avatar`, `plans`. `gear` imports no `loadout`, `packing`, `avatar`, `discover`. `avatar` is a leaf. `discover` → `trails`, `landing`, `auth/authBoundary`, `community-memories`, `planning/presentation.ts`; nothing imports `discover`. `memories` → `trails`, `planning/tripDate.ts`, `auth`. `community-memories` → `trails/api/publicRequest` and `memories` presentation only (`MemoryImage`, `NoPhotoSurface`, `usePhotoRecovery`, `shortDate`; never owner queries; `memories.css` not imported). `plans` → `services`, `auth`, `trails` (trail detail api/hook/types, `trailId`, `tripRoutes`, `content`), `memories` (only `useOwnerMemoryIndex`, `memoryFailureKindOf`, the `MemorySummary` type), `planning/tripDate.ts`, `planning/presentation.ts`, layout, `lib/useDocumentTitle`; the Studio passes Finish's addresses as props. `memories` never imports `plans`, and `trails` never imports `memories` (Memory routes are built in `trails/tripRoutes.ts`).
- Only `avatar/runtime/` imports `three`/R3F; only `discover/map/runtime/` imports `maplibre-gl`; only `avatarManifest.ts` names model files.

## 11. Known Missing Backend Capabilities

- Production routing: no gateway routes or general CORS, so a deployed build reaches no API; Memories also need an S3 bucket.
- `/query` does not validate `tripDate`; recommendation errors other than unsafe prompts and user-service outage can surface as `500`.
- Recommendations omit weather, distance, derived gear, and intent; pack returns category booleans, not item ids.
- Equipped gear per trip is session-only (Plans store no gear by design).
- Activity stays `SIMULATED`; Plans do not feed it (no decision).
- No real routes, cover images, trail ingestion, or closure data; no backend avatar state.

## 12. Known Technical Risks

- Prototype data; synthetic trails are disclosed as sample data (Trail Detail and popup via `isSampleTrailSource()`, planner cards via the description).
- Keycloak is configured by hand; mismatched URIs break sign-in. Restore needs same-site cookies. Profile creation assumes `email` and a name claim.
- Up to 15 sequential Open-Meteo calls per ready turn, with no timeout, retry, or cache.
- Inconsistent error shapes; duplicated DTOs across services without contract tests; nullable wrapper fields.
- Signed photo URLs outlive a switch to PRIVATE or a delete by up to 15 minutes; deleted Memories' photos are retained; re-encoding drops colour profiles; orientation unverified on Safari and phones; local photo URLs need same origin.
- Not verified: signed-URL expiry in sessions over 15 minutes, real screen readers, Safari, phones; deep-linked Community Detail leaves focus on the body.
- Plan → Memory bridge (accepted, spec 014 §30.1): above 50 Memories, offset paging can miss a change made in another tab during the read until the next visit; above 500 Memories the bridge shows "unavailable"; returning from a Memory to `/plans` re-requests each trail detail once (013 trail queries).
- Discover: at very wide viewports the default view exceeds 150 km ("Zoom in…" on first sight); during a nearby error the map shows no points; an OpenFreeMap outage leaves the list working.
- Local trail-service errors include stack traces (devtools); production must not.
- The working tree carries substantial uncommitted changes; this document describes it, not the last commit.

## 13. Cross-Cutting Do-Not-Break Rules

- Never fabricate data; a missing contract is a reported gap. Unavailable is never shown as zero.
- Owner identity is always the server's view of the token `sub`; per-user state and keys are bound to the subject and cleared on sign-out.
- PRIVATE Memories, author identity, and owner subjects never reach a public surface or a log.
- Synthetic trails: plannable, preparable, and savable as Plans, shown in Discover with disclosure; no activity figure, no Add Memory, no Community Memories.
- Public reads are tokenless; authenticated requests go only through `authenticatedApiRequest()`.
- The avatar, map, and media are enhancements: gear selection, the trail list, and planning work without them.
- Plan completion UI only after a confirmed `201` / `200`.
- Plan → Memory: unknown or incomplete Memory data is never "no Memory" (no Add memory); detection uses owner data only, never `/api/memories/public`; Plans and Memories stay unlinked (no stored relationship, no cascade either way).

## 14. Agent Instructions

Read this file before frontend work; it is the contract reference. Re-inspect backend source only when it lacks the answer or disagrees with the code. When an API contract, auth flow, route, or frontend architecture decision changes, update this file in the same change, as current state. Feature history, acceptance criteria, QA results, and repairs belong in the feature spec and checkpoint.
