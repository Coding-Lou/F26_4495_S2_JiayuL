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
- A packing endpoint that compares required gear categories with the authenticated user's inventory and returns readiness percentage.
- A basic prompt-injection phrase guard before OpenAI intent extraction.

Important qualification:

- The pack flow has a real inter-service contract mismatch described in sections 4 and 12. Weather-derived packing requirements work, but baseline trail requirements may be lost in live integration.
- Recommendation tests mock service boundaries; there is no repository-level end-to-end test spanning recommendation, trail, user, OpenAI, and Open-Meteo.

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
| GET | `/api/trails/{id}` | Path UUID `id` | `TrailDetailResponse`; HTTP 404 with empty body when absent | Required | `trail-service` / `TrailController` | incomplete for packing integration; seeded route data is null |

`difficulty` is normalized case-insensitively and must resolve to `EASY`, `MODERATE`, or `HARD`. Invalid values produce HTTP 400. Trail lists are not paginated.

### Recommendation service (`http://localhost:8083`)

| Method | Path | Request / parameters | Response | Auth | Owner | Status |
|---|---|---|---|---|---|---|
| POST | `/api/recommendations/trails` | JSON `RecommendationRequest` | `List<com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse>` | Required | `recommendation-service` / `RecommendationController` | temporary: nearby lookup plus deterministic filters only; no AI, weather, gear, or scoring |
| POST | `/api/recommendations/query` | JSON `RecommendationQueryRequest` | `RecommendationResponse` containing at most three `ScoredTrailRecommendation` items | Required | `recommendation-service` / `RecommendationController` | stable prototype flow; external-service and error-shape risks remain |
| POST | `/api/recommendations/pack` | JSON `PackRecommendationRequest` | `PackRecommendationResponse` | Required | `recommendation-service` / `RecommendationController` | incomplete: live trail-detail contract omits baseline gear requirements |

There are no routes in the API gateway configuration. The frontend cannot currently use port 8080 as a unified backend base URL.

### API-to-frontend mapping

| Frontend feature/page | API consumption |
|---|---|
| Authenticated app bootstrap / account display | `GET /api/users/me` |
| Home / Planning | Primary: `POST /api/recommendations/query`; do not build the main experience around the temporary `/trails` recommendation endpoint |
| Recommendation result cards | Data returned by `POST /api/recommendations/query` |
| Trail discovery/list | `GET /api/trails` |
| Nearby trail view | `GET /api/trails/nearby` |
| Trail detail | `GET /api/trails/{id}` |
| Gear inventory | GET/POST/PUT/DELETE `/api/users/me/gear` |
| Pack for selected trail | `POST /api/recommendations/pack`, plus `GET /api/users/me/gear` when actual owned item names/IDs are needed for customization |
| Explore, Memory, avatar, and scene pages | No supporting endpoint exists |

## 5. Important Backend Classes

### Controllers

- `UserController` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/controller/UserController.java`
- `GearController` - `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/controller/GearController.java`
- `TrailController` - `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/controller/TrailController.java`
- `RecommendationController` - `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/controller/RecommendationController.java`

### Services and clients

- `UserService` - creates/reads the local profile from JWT claims: `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/service/UserService.java`
- `GearService` - authenticated owned-gear CRUD: `Project/Backend/user-service/src/main/java/com/jay/outdoor/user/service/GearService.java`
- `TrailService` - search, nearby/detail mapping, scenery, and gear enrichment: `Project/Backend/trail-service/src/main/java/com/jay/outdoor/trail/service/TrailService.java`
- `RecommendationService` - recommendation orchestration: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/RecommendationService.java`
- `RecommendationIntentService` - prompt guard plus intent extraction: `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/service/RecommendationIntentService.java`
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
| `TrailDetailResponse` - `.../trail/dto/TrailDetailResponse.java` | Detail/map route | summary-like scalar fields plus `route` GeoJSON object or null; it does not contain scenery or baseline gear |
| `RecommendationRequest` - `Project/Backend/recommendation-service/src/main/java/com/jay/outdoor/recommendation/dto/RecommendationRequest.java` | Temporary structured recommendation filter | `latitude`, `longitude`, `radiusKm`, optional `difficulty`, `maxDistanceKm`, `maxElevationGainM` |
| `RecommendationQueryRequest` - `.../recommendation/dto/RecommendationQueryRequest.java` | Primary natural-language planner request | `message`, `latitude`, `longitude`, `tripDate`, optional `radiusKm`; `message` max 2000 |
| `RecommendationResponse` - `.../recommendation/dto/RecommendationResponse.java` | Planner result envelope | `recommendations[]` |
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
10. `TrailScoringService` scores every candidate: intent 55 points (difficulty 20, distance 15, elevation 10, duration 10), weather 15, gear readiness 15, scenery 10, and proximity 5. It sorts descending and returns at most three.
11. The controller returns `RecommendationResponse { recommendations }`. Each result currently contains `trail`, total `score`, and `breakdown`; it does not return the fetched weather, `distanceFromUserKm`, derived required gear, or extracted intent.

The older `POST /api/recommendations/trails` flow only fetches nearby trails and filters them by difficulty, distance, and elevation. Treat it as temporary, not the AI planning contract.

## 7. Authentication

CURRENT architecture:

- Keycloak runs locally at `http://localhost:8180`; the realm is `outdoor-trip`.
- The frontend application now exists at `Project/Frontend/`, but authentication and Keycloak integration are intentionally not part of the initial infrastructure skeleton.
- The root work log states that a previous React client used the Keycloak public client `outdoor-web` with Authorization Code + PKCE. That integration is not present in the current skeleton and must be implemented as a future feature.
- User, trail, and recommendation services are stateless OAuth2 resource servers and validate JWTs against the same issuer URI.
- Every current endpoint requires authentication. The frontend must attach the current access token as a bearer token to every API request and refresh it before expiry through the Keycloak client library.
- The recommendation service forwards that same access token to the trail and user services. It does not use a service account.
- `GET /api/users/me` is the explicit profile bootstrap. Gear operations also call `getOrCreateUser`, so they bootstrap the local profile implicitly.
- User creation assumes JWT `sub` and `email`, and uses `name` with `preferred_username` as fallback for `displayName`.

Do not add application passwords or a parallel registration system. Login, logout, session refresh, and account management should stay with Keycloak unless the backend architecture changes.

Repository gaps relevant to frontend setup:

- No Keycloak realm/client export is checked in, so realm/client setup is external/manual.
- Only trail-service defines CORS, limited to `http://localhost:5173`. User-service and recommendation-service do not define CORS.
- The API gateway has no routes. The frontend skeleton centralizes its future backend origin in `VITE_API_BASE_URL`, but a working unified browser path still requires gateway/CORS work or later Vite proxy configuration.

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
| `/` | Public Landing (FEATURE-001), rendered outside the application layout |
| `/home` | Home placeholder (future Authenticated Home) |
| `/trails/:trailId` | Trail Detail placeholder |
| `/gear` | Gear placeholder |
| `*` | Not Found placeholder |

The Public Landing calls no API. Its authentication entry points (primary planning action and Sign in) go through one placeholder module, `Project/Frontend/src/features/auth/authBoundary.ts`, which real authentication will replace. A valid planning prompt is saved in session storage under the single key defined in `Project/Frontend/src/features/planning/pendingPrompt.ts`, for the Authenticated Home planner to read after sign-in. Hero scenes are declared only in `Project/Frontend/src/features/landing/hero-media/scenes.ts`; media files are in `Project/Frontend/public/media/hero/`. Nothing redirects a signed-in user away from `/` yet; that belongs to the authentication feature.

The central API client is `Project/Frontend/src/services/apiClient.ts`. It reads `VITE_API_BASE_URL`, trims a trailing slash, and uses the native `fetch` API without authentication or endpoint-specific behavior. `Project/Frontend/.env.example` documents `VITE_API_BASE_URL=`; an empty value uses the frontend's current origin.

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
| Gear Recommendation | Required categories, weather, ownership, readiness | PARTIAL: pack endpoint exists; baseline gear integration mismatch must be fixed |
| Customize Gear | Choose owned items to wear/bring | PARTIAL frontend composition is possible from gear inventory, but no saved selection/trip API exists |
| Avatar Update | Reflect equipped items visually | FUTURE: no data/model/API support |
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
      layout/          # Minimal shared application layout
      ui/              # shadcn/ui components (Button only)
    features/
      auth/            # authBoundary placeholder (no Keycloak yet)
      landing/         # Public Landing foreground and hero-media layer
      planning/        # pending planning prompt (session storage)
    lib/                # Shared class-name helper
    pages/              # Thin route compositions and placeholders
    services/           # Shared fetch/API base
    App.tsx
    index.css
    main.tsx
```

Feature folders and frontend contract types are added only when the corresponding vertical slice begins; `auth`, `landing`, and `planning` exist from FEATURE-001 and no empty placeholder directories exist.

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

- **Home / Plan**: a cinematic entry page containing the planning request rather than a dashboard.
- **Trail detail**: selected trail facts and a route area that handles null GeoJSON gracefully.
- **Pack**: selected trail/date, weather availability, required categories, readiness, and matching owned items.
- **Gear inventory**: create, edit, list, and delete owned gear.
- **Profile/account**: optional lightweight account page or menu surface backed by `/api/users/me`.

Deferred pages:

- **Explore** and **Memory** are proposal-backed but should wait for APIs.
- **Avatar/equipment studio** and **Adventure scene** should wait for explicit 3D contracts and assets.

## 11. Known Missing Backend Capabilities

### Required soon

- Fix or replace the pack flow's trail-detail contract so the live call returns `baselineGearRequirements` (and preferably scenery) to `PackRecommendationService`.
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

- Avatar profile/model selection and persistent avatar state.
- Gear-to-visual-asset mapping, wearable slots, compatibility rules, transforms, and equipped-state persistence.
- Render-ready trail/environment descriptors, terrain/route assets, weather/time-of-day scene state, and animation cues.
- Asset manifests/versioning and delivery URLs for avatar, gear, and environment models/textures.
- A stable handoff contract from packing selection to avatar equipment and from selected trail/weather to the adventure scene.

## 12. Known Technical Risks

- **Pack contract mismatch:** `TrailServiceClient.getTrailById()` deserializes `GET /api/trails/{id}` as recommendation-client `TrailSummaryResponse`, but the endpoint emits trail-service `TrailDetailResponse`. The emitted JSON omits `scenery` and `baselineGearRequirements`; both become null. `GearRequirementService` then has no baseline categories. Unit tests mock the client and do not catch this integration failure.
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
- **Keycloak setup is not reproducible from source:** no realm export exists. The documented `outdoor-trip` realm and `outdoor-web` client must already be configured.
- **No API versioning:** all paths are under `/api/...` with no version segment.
- **Temporary endpoint overlap:** `/api/recommendations/trails` and `/api/recommendations/query` can confuse frontend ownership. Use `/query` for the primary planner.
- **Stale/unused artifacts:** `CreateUserRequest` is unused; `OpenMeteoDaily`/`OpenMeteoResponse` are defined but the client parses `JsonNode`; `RecommendationService.DEFAULT_RADIUS_KM` is unused; the root README title still refers to an invoice platform.
- **Working tree state:** the inspected repository contains substantial pre-existing uncommitted backend changes and deleted legacy frontend files. Treat this document as a snapshot of the current working tree, not necessarily the last commit.

## 13. First Frontend Vertical Slice

Implement one authenticated **Plan -> Select Trail -> Pack** path before building broad infrastructure:

1. Extend the existing React/Vite application shell with Keycloak Authorization Code + PKCE integration, an authenticated route boundary, and bearer-token support in the shared HTTP function.
2. Bootstrap the account with `GET /api/users/me`.
3. Build the Home / Plan experience with message, trip date, origin coordinates (browser geolocation with an explicit fallback/input), and optional radius.
4. Submit `POST /api/recommendations/query` through TanStack Query and render up to three trail cards with core facts, total score, and score breakdown. Handle empty results and dependency errors explicitly.
5. Let the user select a result and open trail detail using `GET /api/trails/{id}`; render a graceful placeholder when route/image data is null.
6. Continue to Pack using the selected trail ID and trip date. Call `POST /api/recommendations/pack` and `GET /api/users/me/gear`; display weather availability, required categories, owned/missing state, and readiness.
7. Include the smallest useful gear action, such as adding a missing owned item, then invalidate gear and pack queries so readiness updates.

This slice validates authentication, all three implemented services, the primary AI recommendation path, selection continuity, and the core Plan-to-Pack product promise. Before relying on baseline packing data, fix the trail-detail/summary mismatch described above. Do not block this slice on Explore, Memory, dashboards, 3D avatars, or scene rendering.

## 14. Agent Instructions

Future AI agents should read this file before performing frontend-related work.

Do not re-scan the entire repository unless:
1. this document does not contain the information required for the task;
2. the relevant backend code has changed;
3. the documented API contract appears inconsistent with the current source code.

When modifying an API contract, backend architecture, authentication flow, or frontend architectural decision, update this document as part of the same change.
