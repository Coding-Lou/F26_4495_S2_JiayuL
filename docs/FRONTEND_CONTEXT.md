# Frontend Project Context

This document records the repository state as inspected on 2026-10-10. Paths are relative to the repository root. `CURRENT` means code exists in the working tree; `PLANNED` means it is described by the proposal or product direction but is not implemented.

## 1. Product Overview

The Outdoor Trip Companion is a web application organized around **Plan -> Pack -> Explore -> Memory**. The intended journey is: start from a home/planning experience, describe a hike in natural language, receive trail recommendations based on preferences, trail data, weather, proximity, and owned gear, select a trail, receive a packing recommendation, customize gear, and eventually reflect the equipped gear on a 3D avatar and in an outdoor scene.

CURRENT backend coverage is strongest for Plan and Pack. Explore, Memory, avatar updates, animated scenes, and other 3D behavior are PLANNED only.

The intended visual direction is a modern, clean, cinematic outdoor product. It should not resemble a generic enterprise dashboard or a purple-gradient AI SaaS template. Anime-inspired or stylized 3D elements may be added later but are outside the first frontend slice.

Product source: `DocumentsAndReports/JiayuL_Proposal.md`.

## 2. Current Architecture

The backend is a Java 21 / Spring Boot 4.1.1 Maven multi-module project under `Project/Backend/`.

| Module | Port | Current responsibility | State |
|---|---:|---|---|
| `user-service` | 8081 | Keycloak-backed local user profile and per-user owned gear CRUD in PostgreSQL | CURRENT, usable |
| `trail-service` | 8082 | Trail search, PostGIS nearby search, detail/GeoJSON response, scenery, and baseline gear requirements | CURRENT, usable with prototype data |
| `recommendation-service` | 8083 | OpenAI intent extraction, trail/user service orchestration, Open-Meteo lookup, scoring, and packing recommendations | CURRENT; primary query works, with integration risks below |
| `api-gateway` | 8080 | Intended edge service | INCOMPLETE: application shell only; no routes, security, or CORS configuration |
| `activity-service` | 8084 | Intended live trail activity/WebSocket service | INCOMPLETE: application shell only; no controllers, sockets, models, or persistence |

Infrastructure in `Project/docker-compose.yml` starts PostGIS/PostgreSQL and Keycloak 26.7.4. `Project/docker/postgres/init-databases.sql` creates `user_db` and `trail_db`; Keycloak uses the database named by `POSTGRES_DB`. The compose file does not start the Spring services.

Databases:

- `user_db`: `users` and `gear_items`, managed by Flyway in `Project/Backend/user-service/src/main/resources/db/migration/`.
- `trail_db`: PostGIS `trails`, `trail_scenery`, and `trail_gear_requirements`, managed by Flyway in `Project/Backend/trail-service/src/main/resources/db/migration/`.
- The recommendation service has no database; it orchestrates other services and external APIs.

External integrations:

- Keycloak issuer: `http://localhost:8180/realms/outdoor-trip`.
- OpenAI Java SDK: structured intent extraction; client is created from environment configuration by `OpenAIOkHttpClient.fromEnv()`.
- Open-Meteo: daily forecast by trail coordinates and trip date.

## 3. Backend Capabilities

### User service

CURRENT and usable:

- Validate Keycloak JWTs as a stateless OAuth2 resource server.
- Return the current local profile and automatically create it from JWT claims on first access.
- Create, list, update, and soft-delete only the authenticated user's gear.
- Return structured RFC 9457/Spring `ProblemDetail` responses for user-service authentication, authorization, not-found, and DTO validation errors.

Not implemented:

- Direct registration/password endpoints. `CreateUserRequest` exists but is unused; Keycloak owns identity.
- Profile editing, preferences, favorites, saved plans, or trip history.

### Trail service

CURRENT and usable:

- Search trails by case-insensitive name substring and optional difficulty, maximum trail length, and maximum elevation gain.
- Find trails within a radius using PostGIS geography distance, ordered nearest first.
- Return a trail detail record with a GeoJSON route when route data exists.
- Enrich search and nearby summaries with scenery and baseline gear categories.

Prototype limitations:

- The dataset is eight `DEMO_SEED` trails from `V2__seed_demo_trails.sql`, not a live OpenStreetMap/Overpass import.
- Seeded routes are all `NULL`; `TrailDetailResponse.route` is therefore currently null for demo rows.
- Cover image URLs are not populated by migrations and are currently null unless added manually.
- All endpoints require authentication.

### Recommendation service

CURRENT and usable:

- A temporary structured-filter endpoint for nearby trails.
- A natural-language recommendation endpoint that extracts intent with OpenAI, fetches nearby trails and owned gear, fetches per-trail weather, derives required gear, scores candidates, and returns the top three.
- A stateless conversational planner endpoint that merges the latest natural-language preference delta into a client-owned planning context, asks deterministic clarification questions until the context is ready, and then invokes the same recommendation pipeline.
- A packing endpoint that compares required gear categories with the authenticated user's inventory and returns readiness percentage.
- A basic prompt-injection phrase guard before OpenAI intent extraction.

Important qualification:

- The pack flow receives baseline trail requirements through the Trail Detail contract. Focused client and Pack tests cover detail deserialization, mild weather, weather fallback, category deduplication, ownership, and readiness.
- There is no repository-level end-to-end test spanning recommendation, trail, user, OpenAI, and Open-Meteo.

### API gateway and activity service

No frontend-usable gateway or activity endpoints exist. Direct service URLs or frontend development proxies are required today.

## 4. API Contracts

All current endpoints require `Authorization: Bearer <Keycloak access token>`. There are no public REST endpoints in the three implemented services.

Status meanings:

- `stable`: implemented, covered by relevant source tests, and usable within the prototype constraints.
- `incomplete`: code exists but a known contract or behavior gap affects frontend integration.
- `temporary`: transitional behavior that should not be treated as the primary product contract.
- `mock/test`: test-only; no such public endpoint exists in the current source.

### User service (`http://localhost:8081`)

| Method | Path | Request / parameters | Response | Auth | Owner | Status |
|---|---|---|---|---|---|---|
| GET | `/api/users/me` | None | `UserResponse` | Required | `user-service` / `UserController` | stable |
| POST | `/api/users/me/gear` | JSON `CreateGearItemRequest` | `GearItemResponse`, HTTP 201 | Required | `user-service` / `GearController` | stable |
| GET | `/api/users/me/gear` | None | `List<GearItemResponse>` ordered newest first | Required | `user-service` / `GearController` | stable |
| PUT | `/api/users/me/gear/{gearId}` | Path UUID `gearId`; JSON `UpdateGearItemRequest` | `GearItemResponse` | Required | `user-service` / `GearController` | stable |
| DELETE | `/api/users/me/gear/{gearId}` | Path UUID `gearId` | Empty body, HTTP 204; row is soft-deleted | Required | `user-service` / `GearController` | stable |

### Trail service (`http://localhost:8082`)

| Method | Path | Request / parameters | Response | Auth | Owner | Status |
|---|---|---|---|---|---|---|
| GET | `/api/trails` | Optional query: `search: string`, `difficulty: string`, `maxDistanceKm: positive number`, `maxElevationGainM: non-negative integer` | `List<TrailSummaryResponse>` | Required | `trail-service` / `TrailController` | stable; prototype dataset |
| GET | `/api/trails/nearby` | Required query: `lat [-90,90]`, `lon [-180,180]`, `radiusKm > 0` | `List<NearbyTrailResponse>` | Required | `trail-service` / `TrailController` | stable; prototype dataset |
| GET | `/api/trails/{id}` | Path UUID `id` | `TrailDetailResponse`; HTTP 404 with empty body when absent | Required | `trail-service` / `TrailController` | stable; seeded route data is null |

`difficulty` is normalized case-insensitively and must resolve to `EASY`, `MODERATE`, or `HARD`. Invalid values produce HTTP 400. Trail lists are not paginated.

`TrailDetailResponse` contains `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `latitude`, `longitude`, nullable `route`, `source`, nullable `coverImageUrl`, `scenery`, and `baselineGearRequirements`. The two collection fields use the same stored values and enum wire semantics as `TrailSummaryResponse`.

### Recommendation service (`http://localhost:8083`)

| Method | Path | Request / parameters | Response | Auth | Owner | Status |
|---|---|---|---|---|---|---|
| POST | `/api/recommendations/trails` | JSON `RecommendationRequest` | `List<com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse>` | Required | `recommendation-service` / `RecommendationController` | temporary: nearby lookup plus deterministic filters only; no AI, weather, gear, or scoring |
| POST | `/api/recommendations/query` | JSON `RecommendationQueryRequest` | `RecommendationResponse` containing at most three `ScoredTrailRecommendation` items | Required | `recommendation-service` / `RecommendationController` | stable prototype flow; external-service and error-shape risks remain |
| POST | `/api/planner/turn` | JSON `PlannerTurnRequest` | `PlannerTurnResponse` | Required | `recommendation-service` / `PlannerController` | stable stateless multi-turn planner; delegates to the existing recommendation pipeline when ready |
| POST | `/api/recommendations/pack` | JSON `PackRecommendationRequest` | `PackRecommendationResponse` | Required | `recommendation-service` / `RecommendationController` | stable; Trail Detail supplies baseline gear requirements |

There are no routes in the API gateway configuration. The frontend cannot currently use port 8080 as a unified backend base URL.

### API-to-frontend mapping

| Frontend feature/page | API consumption |
|---|---|
| Authenticated app bootstrap / account display | `GET /api/users/me` |
| Home / Planning | Multi-turn: `POST /api/planner/turn`; one-shot/backward-compatible: `POST /api/recommendations/query`; do not build the main experience around the temporary `/trails` recommendation endpoint |
| Recommendation result cards | Existing `ScoredTrailRecommendation` data returned by ready `POST /api/planner/turn` responses or by `POST /api/recommendations/query` |
| Trail discovery/list | `GET /api/trails` |
| Nearby trail view | `GET /api/trails/nearby` |
| Trail detail | `GET /api/trails/{id}` |
| Gear inventory | GET/POST/PUT/DELETE `/api/users/me/gear` |
| Pack for selected trail | `POST /api/recommendations/pack`, plus `GET /api/users/me/gear` when actual owned item names/IDs are needed for customization |
| Explore, Memory, avatar, and scene pages | No supporting endpoint exists |

#### Conversational planner contract

`POST /api/planner/turn` processes exactly one conversation turn. It is stateless: the frontend owns both displayed messages and the current `PlanningContext`, and sends the context back on every turn after the first. The backend does not persist sessions or message history.

`PlannerTurnRequest` fields:

| Field | Type | Required | Validation / behavior |
|---|---|---:|---|
| `message` | string | yes | Non-blank, maximum 2000 characters |
| `context` | `PlanningContext` or null | no | Null on the first turn; otherwise the latest context returned by the backend |
| `latitude` | number | yes | `[-90, 90]` |
| `longitude` | number | yes | `[-180, 180]` |
| `tripDate` | ISO local date (`YYYY-MM-DD`) | yes | Required |
| `radiusKm` | number or null | no | Must be greater than zero when supplied; omission preserves the existing 50 km recommendation default |

`PlanningContext` fields are `difficulty: EASY | MODERATE | HARD | null`, `maxDistanceKm: positive number | null`, `maxElevationGainM: non-negative integer | null`, `maxDurationMin: positive integer | null`, and `preferredScenery: SceneryType[]`. The backend normalizes a null scenery list to an empty list in its response.

`PlannerTurnResponse` fields are:

- `status`: `NEEDS_CLARIFICATION` or `READY_TO_RECOMMEND`.
- `assistantMessage`: deterministic clarification or result summary text.
- `context`: the final context produced by merging the latest message delta into the supplied context.
- `recommendations`: an array of the existing `ScoredTrailRecommendation` objects; empty while clarification is needed.

Only explicitly mentioned preferences replace prior context values; unmentioned values remain unchanged. An explicit empty scenery preference clears prior scenery choices. The planner is ready when `difficulty` is known and at least one of `maxDurationMin`, `maxDistanceKm`, `maxElevationGainM`, or a non-empty `preferredScenery` is known. If difficulty is missing, the planner asks for difficulty; if difficulty is present but every other useful preference is missing, it asks for hiking duration. It does not require every field.

An explicit difficulty is also a recommendation eligibility constraint: when the final context says `EASY`, only trails whose difficulty is `EASY` can be returned. A non-empty `preferredScenery` list is an eligibility constraint using any-match semantics: a trail must contain at least one requested scenery type. When no candidate satisfies either explicit constraint, the ready response uses the existing empty recommendation list and no-match assistant message rather than returning a contradictory trail. Empty/unset difficulty or scenery preferences preserve the prior unconstrained behavior for that field.

When ready, the endpoint converts `PlanningContext` to the existing internal `RecommendationIntent` and uses the same nearby-trail, user-gear, weather, gear-requirement, scoring, and top-three execution path as `/api/recommendations/query`. The existing endpoint and its request/response contract remain unchanged for one-shot clients.

## 5. Important Backend Classes

### Controllers

- `UserController` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/controller/UserController.java`
- `GearController` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/controller/GearController.java`
- `TrailController` - `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/controller/TrailController.java`
- `RecommendationController` - `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/controller/RecommendationController.java`
- `PlannerController` - stateless turn endpoint: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/controller/PlannerController.java`

### Services and clients

- `UserService` - creates/reads the local profile from JWT claims: `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/service/UserService.java`
- `GearService` - authenticated owned-gear CRUD: `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/service/GearService.java`
- `TrailService` - search, nearby/detail mapping, scenery, and gear enrichment: `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/service/TrailService.java`
- `RecommendationService` - recommendation orchestration: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/RecommendationService.java`
- `RecommendationIntentService` - prompt guard plus intent extraction: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/RecommendationIntentService.java`
- `ConversationPlannerService` - planning-context delta merge, readiness, clarification, and recommendation delegation: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/ConversationPlannerService.java`
- `TrailScoringService` - deterministic 100-point scoring and top-three selection: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/TrailScoringService.java`
- `GearRequirementService` - baseline plus weather-derived gear categories: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/GearRequirementService.java`
- `PackRecommendationService` - selected-trail packing orchestration: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/PackRecommendationService.java`
- `TrailServiceClient` - authenticated calls from recommendation to trail: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/client/trail/TrailServiceClient.java`
- `UserServiceClient` - authenticated calls from recommendation to user gear: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/client/user/UserServiceClient.java`
- `WeatherServiceClient` - Open-Meteo daily forecast: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/client/weather/WeatherServiceClient.java`
- `OpenAiIntentClientImpl` and `OpenAiIntentExtractor` - structured OpenAI intent extraction: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/ai/`

### Repositories and domain models

- `UserRepository`, `GearItemRepository` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/repository/`
- `User`, `Gear`, user-service `GearCategory` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/entity/`
- `TrailRepository` and projection interfaces - `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/repository/`
- `Trail`, `TrailDifficulty`, `TrailScenery`, trail-service `GearCategory` - `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/entity/`

### Configuration

- User resource-server security: `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/config/SecurityConfig.java`
- Trail resource-server security and CORS: `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/config/SecurityConfig.java`
- Recommendation resource-server security: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/config/SecurityConfig.java`
- Service URLs and issuer configuration: each service's `src/main/resources/application.yml` or `.yaml`
- OpenAI client configuration: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/config/OpenAiConfig.java`

### Frontend contract DTOs

The following should become TypeScript types close to the feature that owns them. Java UUIDs and dates serialize as strings; Java `Set` serializes as a JSON array.

| Java type and path | Purpose | Important fields |
|---|---|---|
| `UserResponse` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/dto/UserResponse.java` | Current local profile | `id`, `email`, `displayName`, `createdAt` |
| `CreateGearItemRequest` - `.../user/dto/CreateGearItemRequest.java` | Create owned item | `name` required/max 100, nullable `category`, nullable `description` max 255 |
| `UpdateGearItemRequest` - `.../user/dto/UpdateGearItemRequest.java` | Full update of owned item | same shape as create |
| `GearItemResponse` - `.../user/dto/GearItemResponse.java` | Owned gear item | `id`, `name`, nullable `category`, nullable `description`, `createdAt` |
| `TrailSummaryResponse` - `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/dto/TrailSummaryResponse.java` | Search/nearby/recommendation trail card | `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `latitude`, `longitude`, `source`, `scenery[]`, `coverImageUrl`, `baselineGearRequirements[]` |
| `NearbyTrailResponse` - `.../trail/dto/NearbyTrailResponse.java` | Nearby result wrapper | `trail: TrailSummaryResponse`, `distanceFromUserKm` |
| `TrailDetailResponse` - `.../trail/dto/TrailDetailResponse.java` | Detail/map route and Pack trail input | `id`, `name`, `description`, `difficulty`, `distanceKm`, `elevationGainM`, `estimatedDurationMin`, `latitude`, `longitude`, nullable `route`, `source`, nullable `coverImageUrl`, `scenery[]`, `baselineGearRequirements[]` |
| `RecommendationRequest` - `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/dto/RecommendationRequest.java` | Temporary structured recommendation filter | `latitude`, `longitude`, `radiusKm`, optional `difficulty`, `maxDistanceKm`, `maxElevationGainM` |
| `RecommendationQueryRequest` - `.../recommendation/dto/RecommendationQueryRequest.java` | Primary natural-language planner request | `message`, `latitude`, `longitude`, `tripDate`, optional `radiusKm`; `message` max 2000 |
| `RecommendationResponse` - `.../recommendation/dto/RecommendationResponse.java` | Planner result envelope | `recommendations[]` |
| `PlannerTurnRequest` - `.../recommendation/dto/PlannerTurnRequest.java` | One stateless conversational planning turn | required `message`, `latitude`, `longitude`, `tripDate`; nullable `context`; optional `radiusKm` |
| `PlanningContext` - `.../recommendation/dto/PlanningContext.java` | Client-owned accumulated planning preferences | nullable difficulty/distance/elevation/duration; `preferredScenery[]` |
| `PlannerTurnResponse` - `.../recommendation/dto/PlannerTurnResponse.java` | Turn result | `status`, `assistantMessage`, merged `context`, existing `recommendations[]` |
| `ScoredTrailRecommendation` - `.../recommendation/dto/ScoredTrailRecommendation.java` | Ranked result | `trail`, `score`, `breakdown` |
| `ScoreBreakdown` - `.../recommendation/dto/ScoreBreakdown.java` | Score explanation | `intent`, `weather`, `gear`, `scenery`, `proximity` |
| `PackRecommendationRequest` - `.../recommendation/dto/PackRecommendationRequest.java` | Packing request | required `trailId`, required present/future `tripDate` |
| `PackRecommendationResponse` - `.../recommendation/dto/PackRecommendationResponse.java` | Packing result | `trailId`, `trailName`, nullable `weather`, `weatherAvailable`, `requiredGear[]`, `readinessPercentage` |
| `PackItemStatus` - `.../recommendation/dto/PackItemStatus.java` | Required category ownership status | `category`, `owned` |
| `TrailWeather` - `.../recommendation/dto/TrailWeather.java` | Daily conditions | `temperatureC`, `precipitationProbability`, `windSpeedKmh` |

Shared enum values:

- `TrailDifficulty`: `EASY`, `MODERATE`, `HARD`.
- `SceneryType`: `LAKE`, `VIEWPOINT`, `WATERFALL`, `FOREST`, `MOUNTAIN`, `OCEAN`.
- `GearCategory`: `FOOTWEAR`, `RAIN_GEAR`, `WARM_LAYER`, `WIND_LAYER`, `TREKKING_POLES`, `TRACTION`, `HEADLAMP`, `BACKPACK`, `WATER`, `FOOD`, `SUN_PROTECTION`.

Do not create a frontend contract for `CreateUserRequest`; no controller uses it. `RecommendationIntent`, `TrailCandidateContext`, the recommendation service's client DTO copies, and repository projections are internal backend types rather than direct frontend contracts.

## 6. Trail Recommendation Flow

The conversational flow is `POST /api/planner/turn`:

1. `PlannerController` accepts the authenticated `PlannerTurnRequest` and passes the bearer token to `ConversationPlannerService`.
2. The latest message passes through the same prompt guard and OpenAI extraction integration as the one-shot endpoint, but is represented as a partial `PlanningContextDelta`. Null delta fields mean unmentioned; an explicit empty scenery list can clear scenery preferences.
3. The delta is merged over the client-supplied `PlanningContext`. The merged context is the source of truth; backend chat history does not exist.
4. The deterministic readiness rule requires difficulty plus one useful effort/scenery preference. If it is not met, the service returns `NEEDS_CLARIFICATION`, the merged context, a deterministic question, and an empty recommendation list without calling trail, user, weather, gear, or scoring orchestration.
5. When ready, the service returns `READY_TO_RECOMMEND` and calls the same structured recommendation execution path used by `/api/recommendations/query`.

The primary CURRENT flow is `POST /api/recommendations/query`:

1. The frontend sends `RecommendationQueryRequest` with a bearer token to `RecommendationController.recommendFromQuery()` in `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/controller/RecommendationController.java`.
2. `RecommendationService.recommendFromQuery()` in `.../service/RecommendationService.java` delegates the message to `RecommendationIntentService`.
3. `RecommendationIntentService` calls `PromptGuard` and then `OpenAiIntentExtractor`.
4. `IntentPromptBuilder` creates a hiking-only structured extraction prompt. `OpenAiIntentClientImpl` calls the OpenAI Responses API and maps structured output to `RecommendationIntent`: difficulty, maximum distance/elevation/duration, and preferred scenery.
5. The request radius is used, or defaults to 50 km. `TrailServiceClient.getNearbyTrails()` forwards the user's bearer token to `GET /api/trails/nearby` on the trail service.
6. `TrailController.getNearbyTrails()` calls `TrailService.getNearbyTrails()`, which calls `TrailRepository.findNearbyTrails()`. The native PostGIS query uses `ST_DWithin` and `ST_Distance` on geography values, excludes soft-deleted rows, and orders by user distance. Separate repository queries batch-load scenery and baseline gear requirements.
7. `UserServiceClient.getCurrentUserGear()` forwards the same bearer token to `GET /api/users/me/gear`. `GearController` -> `GearService` -> `UserService.getOrCreateUser()` resolves or creates the profile, then `GearItemRepository` returns non-deleted owned items.
8. For every nearby trail, `WeatherServiceClient.getWeather()` calls Open-Meteo `/v1/forecast` for that trail's coordinates and requested date. It averages the daily minimum and maximum temperatures and reads maximum precipitation probability and wind speed.
9. `GearRequirementService` combines the trail's baseline requirements with weather rules: rain gear at precipitation >= 40%, warm layer at <= 5 C, wind layer at >= 30 km/h, and sun protection at >= 25 C with precipitation < 20%.
10. `TrailScoringService` first removes candidates that contradict an explicit difficulty or non-empty scenery preference. Difficulty is an exact match; multiple scenery values use any-match semantics. It then applies the existing scores to eligible candidates: intent 55 points (difficulty 20, distance 15, elevation 10, duration 10), weather 15, gear readiness 15, scenery 10, and proximity 5. It sorts descending and returns at most three.
11. The controller returns `RecommendationResponse { recommendations }`. Each result currently contains `trail`, total `score`, and `breakdown`; it does not return the fetched weather, `distanceFromUserKm`, derived required gear, or extracted intent.

The older `POST /api/recommendations/trails` flow only fetches nearby trails and filters them by difficulty, distance, and elevation. Treat it as temporary, not the AI planning contract.

## 7. Authentication

CURRENT architecture:

- Keycloak runs locally at `http://localhost:8180`; the realm is `outdoor-trip`.
- The frontend at `Project/Frontend/` signs users in through the Keycloak public client `outdoor-web` with Authorization Code + PKCE (S256), implemented by FEATURE-002. See "Frontend authentication" below.
- User, trail, and recommendation services are stateless OAuth2 resource servers and validate JWTs against the same issuer URI.
- Every current endpoint requires authentication. The frontend must attach the current access token as a bearer token to every API request. FEATURE-003 added the shared function that does this, `authenticatedApiRequest()` in `services/apiClient.ts`: it obtains the token from `getAccessToken()` (below) immediately before each request, never from storage, and attaches it only to a path under `/api/` on the configured API origin; any other path is refused before a token is asked for. Its callers are the conversational planner (`POST /api/planner/turn`) and, from FEATURE-004, Trail Detail (`GET /api/trails/{id}`) and Trip Preparation (`POST /api/recommendations/pack`). `GET /api/users/me` and `GET /api/users/me/gear` are still not called.
- The recommendation service forwards that same access token to the trail and user services. It does not use a service account.
- `GET /api/users/me` is the explicit profile bootstrap. Gear operations also call `getOrCreateUser`, so they bootstrap the local profile implicitly.
- User creation assumes JWT `sub` and `email`, and uses `name` with `preferred_username` as fallback for `displayName`.

Do not add application passwords or a parallel registration system. Login, logout, session refresh, and account management should stay with Keycloak unless the backend architecture changes.

### Frontend authentication (FEATURE-002)

Specification: `docs/features/002-authentication.md`. All authentication code is in `Project/Frontend/src/features/auth/`, and `authSession.ts` is the only file that imports the adapter.

- **Adapter:** `keycloak-js` 26.2.x, the one OIDC dependency. Standard flow, PKCE S256, nonce, `responseMode: fragment`, scope `openid` (the client's defaults add `email` and `profile`).
- **Configuration:** `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`, documented in `.env.example` and set for local work in the git-ignored `.env.local`. None is a secret; the client has no secret. Missing or unusable values leave the application signed out with sign-in reported as unavailable.
- **Credentials:** entered only on Keycloak-hosted pages reached by top-level navigation. The application has no password field.
- **Tokens:** held in the adapter's memory only. Nothing token-shaped is written to web storage, a cookie, a URL, or the console. The adapter keeps short-lived callback state in `localStorage` under `kc-callback-<state>` (state, nonce, PKCE verifier; removed when the response is processed, otherwise expiring after 60 minutes).
- **Session restore after a reload:** a hidden-frame `prompt=none` check that returns to `public/silent-check-sso.html`. It never navigates the window and never shows a Keycloak page. It relies on Keycloak's cookies being sent inside a frame: that works when the application and Keycloak are the same site (as on `localhost`) and fails closed to signed-out where third-party cookies are blocked.
- **Renewal:** the access token (300 s locally) is renewed with the refresh token about 30 s before expiry, on navigation to a protected route, when the tab becomes visible, and inside `getAccessToken()`. A refused renewal ends in the `session-expired` state.
- **Token access for later features:** `getAccessToken()` exported from `@/features/auth` returns a currently valid access token or rejects with `NotAuthenticatedError`. `getAuthenticatedSubject()`, also exported from `@/features/auth`, returns the signed-in user's `sub` claim as a plain string, or `null` when there is no session or no such claim. It exists so that per-user client state is never restored for another user; it is an identifier, not a credential, and no token or other claim is exposed through it.
- **States:** `initializing`, `unauthenticated`, `redirecting`, `callback-processing`, `authenticated`, `callback-failed`, `session-expired`, `signing-out`, `signed-out`; read with `useAuth()`. Every waiting state is bounded (9 s) and every doubt resolves to signed-out.
- **Navigation to Keycloak** happens only when the user activates Sign in or Create account. A signed-out visitor on a protected route is sent to `/` with a sign-in gate, never to Keycloak.
- **Return destination:** the protected route a signed-out visitor asked for, kept in session storage for the tab, validated against the protected routes when written and when read, used once, and never taken from a URL parameter. The accepted paths, checked by one pattern in `features/auth/returnDestination.ts`, are `/home`, `/gear`, `/trails/<segment>`, and, from FEATURE-004, `/trails/<segment>/prepare` and `/trails/<segment>/prepare/<YYYY-MM-DD>`. Only the pathname is kept: a query string is never part of a destination, so Trail Detail's `rec` reference does not survive a sign-in round trip, while a Trip Preparation address does, because its trail and date are both in the path.
- **Sign-out:** a `POST` to Keycloak's end-session endpoint with the ID token hint in the form body, returning to `/`. It clears the in-memory session, the TanStack Query cache, the pending planning prompt, and the return destination.
- **Identity shown in the layout header** comes from the ID token (`name`, then `email`, then `preferred_username`). `GET /api/users/me` is not called by this feature.
- **Tab-scoped session-storage keys** used by the application: the pending planning prompt, the return destination, markers that only choose which notice the landing shows after a sign-out or an ended session, and the planner's state (FEATURE-003): one key, `outdoor-trip-companion.planner`, defined only in `features/planning/storage/plannerSession.ts`, holding one versioned JSON value (`version`: 2, `owner`, `messages`, `context`, `tripDate`, `startingPoint`, `draft`, `draftFromLanding`). `owner` is the signed-in user's Keycloak subject (`sub`), stored for ownership only (user decision, 2026-10-12): it is never displayed or logged, and no token, raw JWT, or other claim is stored. The value is read only once the current subject is known, and is discarded and removed, whole, if it does not parse, has the wrong version or shape, has no owner, or belongs to a different subject; nothing is written without an owner, so a session with no `sub` plans in memory only. It is also removed on sign-out, on session expiry (both through `registerSessionCleanup`), and on any startup that finds no session (`PlannerSessionBoundary`, mounted in `AppProviders`). None holds a token or grants access (the planner value's `owner` is an identifier, not a credential), and nothing of the planner is written to `localStorage`.

Keycloak client configuration the frontend depends on (applied by hand in the admin console; see the feature specification, section 15):

| Setting on client `outdoor-web` | Required value for local development |
|---|---|
| Client authentication | Off (public client) |
| Flows | Standard flow on; implicit flow and direct access grants off |
| PKCE code challenge method | S256 |
| Valid redirect URIs | `http://localhost:5173/auth/callback` and `http://localhost:5173/silent-check-sso.html` |
| Valid post-logout redirect URIs | `http://localhost:5173/` |
| Web origins | `http://localhost:5173` |
| Home URL | `http://localhost:5173/` |

Realm values recorded on 2026-10-12 (they live in the Keycloak database, not in the repository): access token lifetime 300 s, SSO session idle 1800 s, SSO session max 12 hours, password policy minimum length 8. A user is therefore asked to sign in again after 30 minutes without a renewal or 12 hours after signing in, whichever comes first. The registration page does not yet state the password rule; Keycloak reports it only when a shorter password is refused.

The realm needs user registration on, and email verification off unless email delivery is configured. The development server is pinned to port 5173 (`strictPort`), because the client accepts no other origin; `npm run preview` (port 4173) therefore cannot sign in.

Keycloak login theme: `Project/docker/keycloak/themes/outdoor-trip-companion/login/`, inheriting from `keycloak.v2`, mounted read-only into the Keycloak container by `Project/docker-compose.yml`. It takes effect once the container has been recreated and the realm's login theme is set to `outdoor-trip-companion`.

Repository gaps relevant to frontend setup:

- No Keycloak realm/client export is checked in, so realm/client setup is external/manual, including the client settings and the login-theme selection listed above.
- Only trail-service defines CORS, limited to `http://localhost:5173`. User-service and recommendation-service do not define CORS.
- The API gateway has no routes. The frontend centralizes its future backend origin in `VITE_API_BASE_URL`, but a working unified browser path still requires gateway/CORS work. For local development only, the Vite dev server proxies exactly three paths, each one entry in `vite.config.ts` with no new environment variable: `/api/planner/**` to `recommendation-service` at `http://localhost:8083` (FEATURE-003 D2), and, from FEATURE-004 (D7), `/api/trails/**` to `trail-service` at `http://localhost:8082` and `/api/recommendations/pack` to `recommendation-service` at `http://localhost:8083`. Nothing else is proxied: not `/api/users/**`, and not the rest of `/api/recommendations/**`. `npm run preview` and a deployed build cannot reach the planner, a trail, or the pack endpoint until production routing exists.

## 8. Frontend Architecture Decision

Selected stack:

- React 19.3
- TypeScript 6.0 (the newest release supported by the current TypeScript ESLint toolchain)
- Vite 8.3
- Tailwind CSS 4.3 through the Vite plugin
- shadcn/ui configuration with the New York style and neutral CSS variables
- React Router 7.18
- TanStack Query 5.104

The initial frontend application skeleton is CURRENT at `Project/Frontend/`. It includes the Vite application entry point, a shared application layout, browser routing, a root `QueryClientProvider`, one shadcn `Button`, minimal neutral Tailwind styling, and a fetch-based API client foundation.

Current routes:

| Route | Current page |
|---|---|
| `/` | Public Landing (FEATURE-001), rendered outside the application layout. Public; a signed-in user is sent on to `/home` |
| `/auth/callback` | Where Keycloak returns after sign-in or registration. Shows a waiting screen, then replaces itself with the return destination or `/` |
| `/home` | Authenticated Home (FEATURE-003): the conversational trip planner over the Home media. Protected, and rendered in its own full-viewport shell outside `AppLayout` |
| `/trails/:trailId` | Trail Detail (FEATURE-004), replacing the earlier placeholder: one trail from `GET /api/trails/{id}`, "Why this trail" when the optional `?rec=<assistant message id>` finds the recommendation in the planner's session, a trip date, and Choose this trail. Protected, and rendered in its own full-viewport shell outside `AppLayout`: a `paper` sheet on the `ink` base, with no scene |
| `/trails/:trailId/prepare/:tripDate` | Trip Preparation (FEATURE-004): the chosen trail and date with packing readiness, recommended gear (Owned or Missing), and the forecast from `POST /api/recommendations/pack`. Protected, in the same shell, over the pre-rendered still `Project/Frontend/public/media/img/preparation bg.png`. The address is the selection: the trail and the date are in the path and nothing else stores them. The date segment is optional in the route; without a usable date the screen asks for one and makes no pack request |
| `/gear` | Gear placeholder. Protected, in `AppLayout` |
| `*` | Not Found placeholder. Public; shows no account information to a signed-out visitor |

Protected routes sit behind `ProtectedRoute` (`features/auth`), outside the application layout, so nothing protected and no identity renders before a session is confirmed. This is what the browser shows, not the security boundary: the Spring services validate the JWT on every request. `public/silent-check-sso.html` is a static page used only by the hidden-frame session check.

The Public Landing calls no product API. Its authentication entry points go through one module, `Project/Frontend/src/features/auth/authBoundary.ts`: the primary planning action shows a sign-in gate (Sign in, Create account) in the planner's message slot, and the navigation's Sign in goes straight to Keycloak. A valid planning prompt is saved in session storage under the single key defined in `Project/Frontend/src/features/planning/pendingPrompt.ts`. It survives the round trip to Keycloak and is cleared on sign-out. The Authenticated Home planner (FEATURE-003) consumes it: the prompt arrives as the composer's editable draft, is never sent automatically, and its key is cleared once the draft is held in the planner's own state. The read-only "Your trip request" block that `/home` showed before (`SavedTripRequest`) has been removed. Hero scenes are declared only in `Project/Frontend/src/features/landing/hero-media/scenes.ts`; media files are in `Project/Frontend/public/media/hero/`.

The central API client is `Project/Frontend/src/services/apiClient.ts`. It reads `VITE_API_BASE_URL`, trims a trailing slash, and uses the native `fetch` API. `apiRequest()` is unauthenticated; `authenticatedApiRequest()` adds the bearer token as described in section 7. Neither has endpoint-specific behavior: request functions and error classification live in the feature that owns the endpoint (`features/planning/api/plannerTurn.ts` for the planner, `features/trails/api/trailDetail.ts` for a trail, `features/packing/api/packRecommendation.ts` for the pack). `Project/Frontend/.env.example` documents `VITE_API_BASE_URL=`; an empty value uses the frontend's current origin, which is what the three development proxy entries rely on.

The FEATURE-004 shell is `components/layout/TripShell.tsx` with `TripHeader.tsx` and `trip-shell.css`: the `ink` base, the Authenticated Home's header without New Plan, and one `main`. Both screens read server state through TanStack Query: the trail query is shared by the two screens and keyed by trail id; the pack query is keyed by the signed-in subject, the trail id, and the trip date, and runs again whenever Trip Preparation mounts. Each request has a 20-second client limit. FEATURE-004 has no store of its own and writes nothing to web storage, a cookie, or history state.

Visual architecture (product decision of 2026-10-11; defined in `docs/PRODUCT_REQUIREMENTS.md` sections 7.8 and 40):

| Experience | Visual implementation | Frontend consequence |
|---|---|---|
| Public Landing | Pre-rendered cinematic outdoor CG/video | CURRENT: the FEATURE-001 hero-media layer |
| Authenticated Home / Plan | Pre-rendered looping preparation-room CG/video background with the React AI planning UI overlaid | CURRENT: the FEATURE-003 Home shell (`features/home`). `HomeMedia` (poster, plus the looping video from 768px wide with motion allowed) and the planner are siblings that share no state. A media background, not a scene: no Three.js, React Three Fiber, GLB/model asset, or interactive room object. The planner renders and works before the media loads and without it. Media files are in `Project/Frontend/public/media/home/` |
| Pack | Real-time 3D avatar and gear visualization | PLANNED. The first place a 3D library enters the frontend; it needs lead approval and explicit 3D contracts first |
| Adventure / Explore | Later interactive visual environment | PLANNED; implementation undefined |

No 3D dependency is installed in `Project/Frontend/` today, and none is needed before Pack's avatar work begins.

Architectural rules derived from the backend:

- Organize by product feature/domain, not by generic component type.
- Keep request functions and TypeScript contracts within their owning feature, with a small shared authenticated HTTP layer.
- Use TanStack Query for server state, cache invalidation, loading/error states, and gear mutation refreshes.
- Keep selected trail/date in route/search state for the first slice because no saved-trip resource exists.
- Keep backend enum wire values canonical and map them to human-readable labels only in the UI.
- Centralize `ProblemDetail` parsing, while tolerating inconsistent/default error responses from trail and recommendation services.

## 9. Planned User Flow

| Stage | Intended experience | Current backend state |
|---|---|---|
| Home / Planning | Entry experience and natural-language trip request | CURRENT: primary recommendation query exists |
| AI Trail Recommendation | Intent extraction and top-three results | CURRENT: OpenAI + weather + gear + scenery + proximity scoring |
| Select Trail | View chosen trail details/route | PARTIAL: detail endpoint exists; demo routes and cover images are null |
| Gear Recommendation | Required categories, weather, ownership, readiness | CURRENT: Pack combines trail baseline categories with weather requirements and evaluates category ownership/readiness |
| Customize Gear | Choose owned items to wear/bring | PARTIAL frontend composition is possible from gear inventory, but no saved selection/trip API exists |
| Avatar Update | Reflect equipped items on the real-time 3D avatar in Pack | FUTURE: no data/model/API support |
| Adventure Scene | Animated trail/weather environment | FUTURE: no data/model/API support |
| Explore | Map with simulated live hikers | PLANNED: activity-service is empty |
| Memory | GPX/photos/recap/video | PLANNED: no backend module or endpoint exists |

## 10. Frontend Feature Boundaries

The CURRENT skeleton is intentionally smaller than the planned feature structure:

```text
Project/Frontend/
  src/
    app/
      providers/       # Query client and root provider boundary
      router/          # Route objects and browser router
    components/
      layout/          # Minimal shared application layout; the FEATURE-004 shell (TripShell, TripHeader, announcer, Retry)
      ui/              # shadcn/ui components (Button only)
    features/
      auth/            # Keycloak session (keycloak-js), auth states, route guards, landing boundary, account controls
      home/            # Authenticated Home shell: header, layout over media, HomeMedia (poster, video, Pause / Play)
      landing/         # Public Landing foreground, hero-media layer, sign-in gate actions
      packing/         # Trip Preparation (FEATURE-004): gear category labels, the preparation scene's asset path
        api/           #   POST /api/recommendations/pack, response checking, failure classification
        components/    #   TripPreparationScreen, the gear briefing (readiness, gear, forecast), PreparationScene
        hooks/         #   the pack recommendation as a TanStack Query query, keyed by subject
        types/         #   contract types
      planning/        # conversational planner (FEATURE-003) and the pending planning prompt
        api/           #   POST /api/planner/turn, reply checking, failure classification
        components/    #   ConversationalPlanner, conversation, composer, trip-context controls, recommendation cards (with the View trail link), New Plan, TripDateControl (shared with FEATURE-004)
        hooks/         #   the turn as a TanStack Query mutation; geolocation on user action
        state/         #   plannerStore: messages, PlanningContext, trip date, starting point, draft
        storage/       #   planner state in session storage (one versioned key)
        types/         #   contract types and conversation types
        trailContext.ts #  the one read-only selector another feature may use: a recommendation found by (rec, trail id)
      trails/          # Trail Detail (FEATURE-004): the trail id check, the two screens' addresses
        api/           #   GET /api/trails/{id}, response checking, failure classification; the timed request both FEATURE-004 endpoints use
        components/    #   TrailDetailScreen, trail visual, Why this trail, the decision row
        hooks/         #   one trail as a TanStack Query query, shared with Trip Preparation
        types/         #   contract types
    lib/                # Shared class-name helper; media-query, dismissal, document-title, and elapsed-time hooks
    pages/              # Thin route compositions and placeholders
    services/           # Shared fetch/API base
    App.tsx
    index.css
    main.tsx
```

Feature folders and frontend contract types are added only when the corresponding vertical slice begins; `auth`, `landing`, and `planning` exist from FEATURE-001, `home` from FEATURE-003, `trails` and `packing` from FEATURE-004, and no empty placeholder directories exist. Dependencies between them run one way: `packing` may import from `trails`; `trails` and `packing` take from `planning` only the read-only selector (`trailContext.ts`), the shared formatters (`presentation.ts`, `tripDate.ts`), and the trip-date control; `planning` imports nothing from either.

Recommended organization:

```text
src/
  app/                 # router, providers, QueryClient, runtime config
  features/
    auth/              # Keycloak lifecycle, route guard, token access
    profile/           # current-user query and account display
    planning/          # natural-language request and recommendation results
    trails/            # search, nearby, cards, detail, route display
    gear/              # owned inventory CRUD and GearCategory presentation
    packing/           # pack request, readiness, owned-item customization
  pages/               # thin route compositions: home/plan, trail detail, pack, gear, profile
  shared/
    api/               # authenticated HTTP client and ProblemDetail normalization
    ui/                # shadcn/ui-based shared presentation primitives
    lib/               # formatting and feature-independent helpers
```

Keep `planning` separate from `trails`: planning owns the AI request, intent-driven ranking, score breakdown, date, and origin; trails owns reusable trail discovery/detail data. Keep `packing` separate from `gear`: gear is the durable owned inventory, while packing is a trip-specific recommendation derived from trail, weather, and gear.

Recommended pages justified now:

- **Home / Plan**: a cinematic entry page containing the planning request rather than a dashboard. Its background is pre-rendered looping CG/video of a preparation room, not a real-time 3D scene, and the planner must not depend on it.
- **Trail detail**: selected trail facts and a route area that handles null GeoJSON gracefully.
- **Pack**: selected trail/date, weather availability, required categories, readiness, and matching owned items.
- **Gear inventory**: create, edit, list, and delete owned gear.
- **Profile/account**: optional lightweight account page or menu surface backed by `/api/users/me`.

Deferred pages:

- **Explore** and **Memory** are proposal-backed but should wait for APIs.
- **Real-time 3D avatar and gear visualization in Pack** and the **Adventure scene** should wait for explicit 3D contracts and assets. The functional Pack page does not wait for them.

## 11. Known Missing Backend Capabilities

### Required soon

- Provide a usable browser path to recommendation-service: configure gateway routes/CORS or add a Vite recommendation proxy/base URL. There is currently no unified API origin.
- Validate `RecommendationQueryRequest.tripDate` as required and within the available forecast range. The code currently has no `@NotNull` or `@FutureOrPresent` annotation on this field.
- Define consistent error responses for recommendation validation, OpenAI failure, weather failure, trail-service failure, and missing trails. `TrailNotFoundException` and `WeatherServiceUnavailableException` are not mapped by the recommendation exception handler.
- Decide how the results UI obtains the weather and distance used in ranking. `/query` computes both but does not return them. Without a contract change, the frontend can show score breakdown and trail facts but not the actual forecast that influenced the score.

### Can wait

- A saved plan/trip resource that persists selected trail, date, origin, recommendations, and later gear choices. Initial navigation can use route/search state.
- Persisted per-trip selected gear. The first UI can combine pack categories with `GET /api/users/me/gear` locally, but selections will not survive reloads or devices.
- Return actual matching owned gear item IDs/names in the pack response rather than only category-level `owned` booleans.
- User preference editing, favorites, saved trails, recommendation history, and trip history.
- Pagination/sorting for trails and gear if datasets grow.
- Real route geometries, cover image values, broader trail ingestion, freshness/source metadata, and trail closure/safety information.
- Explore endpoints for simulated hikers/activity and WebSocket updates.
- Memory endpoints for GPX parsing, photo upload/storage, recap generation, and optional video.

### Future visualization / 3D

These apply from Pack onward. The Authenticated Home needs none of them: its room background is a pre-rendered media file with no backend, avatar, or 3D asset dependency.

- Avatar profile/model selection and persistent avatar state.
- Gear-to-visual-asset mapping, wearable slots, compatibility rules, transforms, and equipped-state persistence.
- Render-ready trail/environment descriptors, terrain/route assets, weather/time-of-day scene state, and animation cues.
- Asset manifests/versioning and delivery URLs for avatar, gear, and environment models/textures.
- A stable handoff contract from packing selection to avatar equipment and from selected trail/weather to the adventure scene.

## 12. Known Technical Risks

- **Prototype data:** all eight trails are hardcoded `DEMO_SEED` records. Route and cover image values are null in the migrations.
- **No gateway routing:** port 8080 is not an API entry point despite the module name.
- **Browser integration gap:** CORS exists only on trail-service and only for `http://localhost:5173`; the remaining `.env.example` lacks recommendation-service configuration.
- **Query date contract:** `RecommendationQueryRequest.tripDate` is not validated as non-null/present/future. Open-Meteo also supports a limited forecast horizon, which is not checked before the external call.
- **Recommendation fragility and latency:** `/query` performs one Open-Meteo request per nearby trail before selecting the top three, sequentially through the stream. One weather failure aborts the full query, and no timeout/retry/circuit-breaker/caching policy is visible.
- **Inconsistent weather fallback:** `/pack` catches every exception from weather and returns baseline-only results with `weatherAvailable=false`; `/query` does not degrade gracefully.
- **Incomplete exception mapping:** recommendation-service maps only unsafe prompts and user-service unavailability. A missing selected trail can surface as HTTP 500, as can unhandled weather/OpenAI/trail-client failures. Trail-service uses default Spring errors and returns an empty 404 body for detail; user-service uses custom `ProblemDetail` with `code`.
- **Missing ranking context in response:** `/query` returns score/breakdown but omits extracted intent, weather, distance from user, and derived required gear, making explanation-rich UI difficult.
- **DTO duplication:** trail summaries, nearby wrappers, gear responses, `GearCategory`, and difficulty/scenery concepts are duplicated across services. They currently mostly align but can drift without shared contract/integration tests.
- **Loose nullability:** gear category is nullable in create/update DTOs and persistence; several trail scalar DTO fields use nullable wrapper types; frontend types must reflect this.
- **JWT claim assumptions:** automatic profile creation requires a usable email and either `name` or `preferred_username`, while the database requires non-null unique email/display name. Missing claims or identity/email conflicts can fail as server errors.
- **Keycloak setup is not reproducible from source:** no realm export exists. The documented `outdoor-trip` realm and `outdoor-web` client must already be configured, with the client settings in section 7. A redirect URI, post-logout URI, or web origin that does not match exactly breaks sign-in or sign-out.
- **Session restore depends on browser cookie policy:** the hidden-frame check needs Keycloak's cookies inside a frame. A deployment that puts the application and Keycloak on different sites would lose restore-after-reload in browsers that block third-party cookies (users would sign in again; nothing is exposed).
- **No API versioning:** all paths are under `/api/...` with no version segment.
- **Temporary endpoint overlap:** `/api/recommendations/trails` and `/api/recommendations/query` can confuse frontend ownership. Use `/query` for the primary planner.
- **Stale/unused artifacts:** `CreateUserRequest` is unused; `OpenMeteoDaily`/`OpenMeteoResponse` are defined but the client parses `JsonNode`; `RecommendationService.DEFAULT_RADIUS_KM` is unused; the root README title still refers to an invoice platform.
- **Working tree state:** the inspected repository contains substantial pre-existing uncommitted backend changes and deleted legacy frontend files. Treat this document as a snapshot of the current working tree, not necessarily the last commit.

## 13. First Frontend Vertical Slice

Implement one authenticated **Plan -> Select Trail -> Pack** path before building broad infrastructure:

1. Extend the existing React/Vite application shell with Keycloak Authorization Code + PKCE integration, an authenticated route boundary, and bearer-token support in the shared HTTP function. FEATURE-002 delivers the first two; FEATURE-003 delivers bearer-token support in the shared HTTP function (`authenticatedApiRequest()`).
2. Bootstrap the account with `GET /api/users/me`.
3. Build the Home / Plan experience with message, trip date, origin coordinates (browser geolocation with an explicit fallback/input), and optional radius.
4. Submit one turn at a time to `POST /api/planner/turn`, retaining returned `PlanningContext` client-side between turns, and render clarification messages or up to three trail cards with core facts, total score, and score breakdown. `/api/recommendations/query` remains available for a one-shot request. Handle empty results and dependency errors explicitly.
5. Let the user select a result and open trail detail using `GET /api/trails/{id}`; render a graceful placeholder when route/image data is null.
6. Continue to Pack using the selected trail ID and trip date. Call `POST /api/recommendations/pack` and `GET /api/users/me/gear`; display weather availability, required categories, owned/missing state, and readiness.
7. Include the smallest useful gear action, such as adding a missing owned item, then invalidate gear and pack queries so readiness updates.

This slice validates authentication, all three implemented services, the primary AI recommendation path, selection continuity, and the core Plan-to-Pack product promise. The Trail Detail contract now supplies the baseline packing data used by Pack. Do not block this slice on Explore, Memory, dashboards, 3D avatars, or scene rendering.

## 14. Agent Instructions

Future AI agents should read this file before performing frontend-related work.

Do not re-scan the entire repository unless:
1. this document does not contain the information required for the task;
2. the relevant backend code has changed;
3. the documented API contract appears inconsistent with the current source code.

When modifying an API contract, backend architecture, authentication flow, or frontend architectural decision, update this document as part of the same change.
