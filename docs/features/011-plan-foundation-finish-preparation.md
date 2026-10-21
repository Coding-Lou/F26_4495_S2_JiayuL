# FEATURE-011 — Plan Foundation & Finish Preparation

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-19).** Product gate accepted by the user 2026-10-19. Lean QA PASS; backend 43/43 tests PASS; build and lint PASS; repair cycles 0/2. Record in §26. FEATURE-012 is next and not started. Earlier: **APPROVED — FROZEN FOR IMPLEMENTATION (2026-10-19).** The user approved the specification and U1–U6 as recommended (§25). Implementation runs under `/feature-cycle 011-plan-foundation-finish-preparation`; checkpoint `.claude/state/features/011-plan-foundation-finish-preparation.md` |
| Date | 2026-10-19 |
| Roadmap | First of the approved post-freeze extension: FEATURE-011 Plan Foundation & Finish Preparation → FEATURE-012 Ready-to-Go 3D Completion → FEATURE-013 My Plans & Calendar → FEATURE-014 Plan → Memory Bridge (the last product feature). There is no FEATURE-015 |
| Route | No new route. One action and its states inside the existing Gear Customization Studio, `/trails/:trailId/prepare/:tripDate/pack` |
| New backend | `plan-service` (port 8086, database `plan_db`, table `plans`), owning `/api/plans/**` |
| Depends on | FEATURE-002 (Keycloak identity, `getAccessToken()`), FEATURE-004 (Trip Preparation, trip date in the address), FEATURE-005 (Gear Studio), FEATURE-006 (public `GET /api/trails/{uuid}`), FEATURE-008 (owner-subject, soft-delete, trail-validation, and error precedents) |
| Followed by | FEATURE-012 (Ready-to-Go animation after a successful save), FEATURE-013 (`/plans`, My Plans, Calendar), FEATURE-014 (past Plan → Add Memory) |
| Feature cycle (proposed) | Recover → Scope → `backend-api` → focused backend tests → `frontend` → lead diff review → Lean QA → product gate → closeout. `ui-ux: SKIP`, `three-d: SKIP`, Blender: NOT REQUIRED (§22) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (sections 4.3, 10, 13.2, 23, 36, 48) → `docs/FRONTEND_CONTEXT.md` (sections 3, 4, 7, 8, 10) → `docs/DESIGN_SYSTEM.md` → 004, 005, 008 |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–4, 7, 14, 20, 24, 25 |
| `backend-api` | 5.1, 6–12, 18, 19.1, 22.1 |
| `frontend` | 5.2, 13–17, 19.2, 22.2 |
| `qa` | 20, 21 |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; "FC §x" is `docs/FRONTEND_CONTEXT.md`; "DS §x" is `docs/DESIGN_SYSTEM.md`; "004 §x", "005 §x", "008 §x" are those feature specifications; a bare "§x" is this document. Decisions are `D…`, acceptance criteria `AC-…`, approval items `U…`.

---

## 1. Feature Summary

The journey currently stops in the Gear Studio. The user has chosen a trail and a date, reviewed the forecast and recommended gear, and equipped their loadout, but nothing records that they have decided to go. FEATURE-011 adds that record.

- A new backend service, `plan-service`, stores **Plans**: one authenticated user's decision to go on one trail on one date.
- The Gear Studio gains one action, **Finish preparation**. Activating it saves the Plan for the Studio's trail and date and shows a short confirmation. **Continue** returns to the Authenticated Home.
- A Plan stores only the trail id, the trip date, a status, and timestamps. It copies no trail, weather, or gear data.
- Saving is idempotent: one user has at most one active Plan per trail and date, however often Finish is pressed, retried, or repeated.

FEATURE-011 has no page that lists or shows Plans. That is FEATURE-013.

## 2. Product Problem

```text
Today:  Discover → Planner → Trail Detail → Trip Preparation → Gear Studio → (nothing)
After:  Discover → Planner → Trail Detail → Trip Preparation → Gear Studio → Finish preparation → Plan saved
```

Every state that today expresses "I'm going" is transient: the trip is the address (`/trails/<id>/prepare/<date>`), and the equipped loadout lives in session storage for the tab (FC §7). Closing the tab loses the decision. There is no record that later features can list (FEATURE-013), animate (FEATURE-012), or turn into a Memory after the trip (FEATURE-014).

A Plan means: **"I intend to go on this trail on this date, and I have finished reviewing my preparation."** It does not mean "this trail was once recommended to me", "I opened this trail", or "I entered preparation".

## 3. Goal

1. Introduce the Plan domain (§6) with a deliberately small lifecycle (§7).
2. Introduce `plan-service` following the existing service conventions (§8–§12).
3. Persist trail + trip date for the authenticated user, owner taken from the JWT `sub` only (§9).
4. Add **Finish preparation** to the Gear Studio (§13, §14).
5. Prevent duplicate active Plans on the server, not only in the UI (§10).
6. Establish owner isolation that FEATURE-013 and FEATURE-014 inherit unchanged (§9, §18).
7. Ship the list, detail, and delete contract FEATURE-013 needs, so My Plans needs no backend rewrite (§12).

FEATURE-011 is not a calendar, not a 3D or animation feature, and not a Memory bridge.

## 4. 011 / 012 / 013 / 014 Boundary

| Feature | Owns | FEATURE-011 must not |
|---|---|---|
| **011 Plan Foundation & Finish Preparation** | `plan-service`, `plan_db`, the Plan API, the frontend `features/plans` boundary, the Finish preparation action, its saving, success, and failure states | — |
| **012 Ready-to-Go 3D Completion** | The Blender ready-to-go animation, its playback in the Studio, and the save-success → animation transition | add any 3D, animation, model, or `features/avatar` change |
| **013 My Plans & Calendar** | `/plans`, My Plans, the monthly calendar, Upcoming / Past presentation, Plan Detail UI, deleting a Plan from the UI, the **Plans** navigation entry (Planner \| Plans \| Gear \| Memories) | create `/plans`, any list or calendar component, or a navigation entry |
| **014 Plan → Memory Bridge** | A past Plan's **Add memory**, trail and date preselection into the Memory editor, recognising an existing Memory for a Plan | touch `features/memories`, memory-service, or the Memory editor |

**Invariant carried forward (D-INV-1).** FEATURE-012's animation may play only after the Plan save has succeeded (a `201` or `200` from `POST /api/plans`). A failed, unconfirmed, or in-flight save never shows a completion state, in FEATURE-011 or later.

**Invariant carried forward (D-INV-2).** FEATURE-011's post-save destination (**Continue** → `/home`, §14.4) is temporary. FEATURE-012/013 replace it with save → Ready-to-Go → My Plans. Nothing in FEATURE-011 may depend on the destination being `/home`.

---

## 5. Current Implementation Inspection

### 5.1 Backend inspection (owner: `backend-api`)

**Reviewed by `backend-api` (2026-10-19), read-only.** Verified against: `Project/Backend/memory-service/` (`config/SecurityConfig.java`, `config/TrailClientConfig.java`, `config/ClockConfig.java`, `security/*`, `client/TrailCatalogClient.java`, `service/MemoryService.java`, `service/MemoryPaging.java`, `service/MemoryFieldRules.java`, `dto/MemoryPage.java`, `dto/CreateMemoryRequest.java`, `entity/Memory.java`, `repository/MemoryRepository.java`, `exception/GlobalExceptionHandler.java`, `exception/ErrorCode.java`, `db/migration/V1__create_memory_tables.sql`, `application.yaml`, `pom.xml`, `support/AbstractIntegrationTest.java`, `support/TestPostgres.java`, `integration/MemoryOwnerApiIntegrationTest.java`); `user-service/.../config/SecurityConfig.java`; `trail-service/.../config/SecurityConfig.java`, `controller/TrailController.java`, `repository/TrailRepository.java` (`findTrailDetailById`); `recommendation-service/.../dto/PackRecommendationRequest.java`; `Project/Backend/pom.xml`; `Project/docker/postgres/init-databases.sql`; `Project/docker-compose.yml` (container `outdoor-postgres`). The pre-inspection table below is **confirmed**, with two refinements: A–F hold as written, and memory-service manages transactions with `TransactionTemplate`, not the `@Transactional` that 008 §18.1 describes; and memory-service ignores unknown JSON properties through `@JsonIgnoreProperties(ignoreUnknown = true)` on each request record, not through a global Jackson setting (none is configured in any service).

Changes made to §6–§12:

1. §6 D1: `id` and timestamps are set by the entity's `@PrePersist` (micro-truncated), as `Memory`; responses carry timestamps in UTC.
2. §8.2: unique index renamed `uk_…` (the `memory_db` naming convention); noted that `validate` does not check indexes; added the entity mapping rules.
3. §8.3: the one-time `docker exec` command now expands `POSTGRES_USER` / `POSTGRES_DB` inside the container (the original expanded them in the host shell, where they are usually unset); startup-failure wording made exact.
4. §9: matchers spelled out, keeping memory-service's `DispatcherType.ERROR` permit (harmless without public paths, keeps real error statuses); unknown-property ignoring pinned to `@JsonIgnoreProperties`.
5. §10: create is not `@Transactional`; it uses `TransactionTemplate`, `saveAndFlush`, catches `DataIntegrityViolationException` outside the rolled-back transaction, and re-reads in a new one (`open-in-view: false` required). Without this the catch-and-re-read would fail on an aborted PostgreSQL transaction. Added the date rule's location (service plus `Clock`) and a deterministic race-test approach.
6. §11: confirmed tokenless reachability and that synthetic trails validate (source cited); `401`/`403` from trail-service → `503`.
7. §12: UTC normalisation of timestamps (so a `201` body and a later `200` body are identical); exact `errors[]` behaviour, since malformed values produce `400 VALIDATION_ERROR` **without** `errors[]`; paging details; repository queries; `415` / `REQUEST_ERROR` row; full module, pom, and `application.yaml` shape in §12.8.

**Open for lead** (outside the sections `backend-api` may edit):

- **AC-06** says a *malformed* `tripDate` returns `400` "naming `tripDate`". Under the copied handler a malformed date has no `errors[]` (§12.2). Either reword AC-06 to "missing or past → names `tripDate`; malformed → `400 VALIDATION_ERROR`", or approve a small plan-service handler addition that names the field. Recommendation: reword; the frontend never sends a malformed date.
- **§19.1** could add: the latch-forced race (§10), string-equal timestamps between the `201` and a later `200` (§12.1), and a trail-service `401` → `503` case.
- No product-level disagreement.

**Lead resolution (2026-10-19):** AC-06 reworded (no handler addition); the three tests added to §19.1.

Lead pre-inspection (2026-10-19), confirmed by `backend-api` (refinements above):

| Area | Finding | Source |
|---|---|---|
| A. Owner identity | memory-service takes the owner from `Jwt.getSubject()` (`OwnerSubject.of`), rejects a missing or blank `sub` with `401 AUTHENTICATION_REQUIRED` in `SubjectRequiredFilter` before service logic, stores it as `owner_subject VARCHAR(255)`, and never returns it | `memory-service/.../security/OwnerSubject.java`, `SubjectRequiredFilter.java`, 008 §8.4 |
| B. Not-found privacy | Another user's, a missing, and a deleted Memory all give the same `404 MEMORY_NOT_FOUND` | 008 §16.2 rule 3, §17 |
| C. Soft delete | `deleted BOOLEAN NOT NULL DEFAULT FALSE`; normal queries filter `deleted = false`; partial indexes `WHERE deleted = FALSE` | `memory-service/.../db/migration/V1__create_memory_tables.sql` |
| D. Trail validation | `TrailCatalogClient`: one tokenless `GET /api/trails/{id}`, status only; `200` exists, `404` missing → `400 TRAIL_NOT_FOUND`, anything else → `503 TRAIL_SERVICE_UNAVAILABLE`; connect 2 s / read 3 s; never inside a DB transaction; no retry | `memory-service/.../client/TrailCatalogClient.java`, 008 §15 |
| E. Paging | `page` 0-based default 0, `size` default 20 max 50, invalid → `400 VALIDATION_ERROR`; envelope `MemoryPage { items, page, size, totalItems, totalPages }` | `MemoryPaging.java`, `MemoryPage.java` |
| F. Errors | `ProblemDetail` with `code` and `errors[{field, message}]`, user-service style; generic `500` with no internals | 008 §17, `GlobalExceptionHandler.java` |
| G. Clock | An injected `Clock` (`ClockConfig`) for date rules | `MemoryFieldRules.java`, `ClockConfig.java` |
| H. Infrastructure | `Project/docker/postgres/init-databases.sql` creates `user_db`, `trail_db`, `memory_db` on a new volume only; parent `Project/Backend/pom.xml` lists modules; Spring Boot 4.1.1, Java 21, Flyway, `ddl-auto: validate`, Testcontainers PostgreSQL tests | those files |
| I. Pack date rule | `PackRecommendationRequest.tripDate` is `@FutureOrPresent` against the server clock | `recommendation-service/.../dto/PackRecommendationRequest.java` |

### 5.2 Frontend inspection (owner: `frontend`)

Verified by `frontend` against the working tree on 2026-10-19 (paths under `Project/Frontend/src/`). The lead's pre-inspection K–O is confirmed with the corrections marked **Correction**; P–S are new.

| Area | Finding | Source |
|---|---|---|
| K. Trip date in the Studio | Confirmed: the date is the required route segment `:tripDate`, and no store holds it. `GearStudioScreen` checks `isIsoDate(routeDate) && routeDate >= todayIso()` and passes the value to `Studio` as the `tripDate` prop. **Correction:** an invalid or past date is replaced with `tripPreparationLocation(routeId, routeDate, rec)`, which keeps that date and `?rec`, so Trip Preparation shows its own "passed" or "missing" choose-date view. The page is not left date-less. The check runs only at render and does not run again when midnight passes. A `400` from the pack (`date-not-accepted`) also replaces the address with Trip Preparation's. `Studio` is keyed `<trailId lower>/<tripDate>`, so a different trip remounts it with fresh state | `features/loadout/components/GearStudioScreen.tsx:100–111, 129–136, 217–225`; `features/packing/components/TripPreparationScreen.tsx:120–127, 160–161` |
| L. Trail in the Studio | Confirmed: the trail is the route segment `:trailId`, checked by `isTrailId`. A value that is not a trail id is `not-found`, and no request is made. **Correction:** the Studio runs three queries (trail, pack, gear list), and its `ready` screen state needs both the pack **and** the gear list. When the gear list fails, the state is `gear-failed`: a message and Retry, with no gear rows. Once `ready` is reached it is stable. There is no refetch on focus or reconnect, and a failed refresh after Add gear keeps the screen. Trail Detail goes to Trip Preparation by a push to `tripPreparationLocation(trailId, tripDate, rec)`. Trip Preparation goes to the Studio through the **Gear up** link `gearStudioLocation(…)`, which appears only after the pack succeeds | `GearStudioScreen.tsx:169–173, 182–186, 204–259`; `features/trails/components/TrailDecision.tsx:57`; `TripPreparationScreen.tsx:387`; `features/trails/tripRoutes.ts`; `usePackRecommendation.ts:58–63` |
| M. Trip date rule elsewhere | Confirmed: `TripDateControl` has `min={todayIso()}` and no maximum | `features/planning/components/TripDateControl.tsx:102, 237` |
| N. Authenticated requests | Confirmed. `authenticatedApiRequest()` takes the token from `getAccessToken()` for each request. When there is no session it rejects with `NotAuthenticatedError` and sends nothing. Each feature wraps the call with a 20 s limit that also covers reading the body. `gearRequest` never reads an error body. `memoryRequest` reads a best-effort `ProblemDetail` `code` and `errors[].field`, which is what Plans needs (`TRAIL_NOT_FOUND`, field `tripDate`). Mutations use `retry: false` and `networkMode: "always"`, so an offline device fails at once instead of pausing | `services/apiClient.ts:38–56`; `features/gear/api/gearRequest.ts`; `features/memories/api/memoryRequest.ts`; `features/gear/hooks/useGearItemChanges.ts:27–31` |
| O. Dev proxy | Confirmed: five prefixes (`/api/planner`, `/api/trails`, `/api/recommendations/pack`, `/api/users/me/gear`, `/api/memories`). `/api/plans` is absent. It does not collide with `/api/planner` because neither prefix starts the other | `Project/Frontend/vite.config.ts` |
| P. Session end and 401 | `getAccessToken()` expires the session when a renewal is refused. `ProtectedRoute` then sends the user to `/`, which unmounts the Studio. Request layers report `no-session`, and the Studio draws nothing for it. **Correction to §13.2's `unauthenticated`:** no feature passes a server `401` to the FEATURE-002 flow. Each one classifies it locally: pack as `refused`, planner as `sign-in`, gear as `unavailable` | `features/auth/authSession.ts:576–595`; `features/auth/ProtectedRoute.tsx:27–58`; `GearStudioScreen.tsx:240, 252`; `packRecommendation.ts:89`; `plannerTurn.ts:102` |
| Q. Trail name | In `ready` the Studio shows `trail?.name ?? pack.trailName`. `pack.trailName` is a required string in the contract, so a name is always available for the success copy | `GearStudioScreen.tsx:301–302`; `features/packing/types/pack.ts` |
| R. Panel composition | From 768 px the panel has a maximum height, and only `.studio-zone` (the named region "Gear choices", a tab stop) scrolls (005 §16.5). The panel's zones are strip, trip, summary, and gear zone. `GearZone`'s last element is `div.studio-groups`, which ends with the general Add gear entry | `features/loadout/studio.css:192–219, 345–360`; `GearZone.tsx:132` |
| S. Existing patterns for Finish | Announcer: `useTripAnnouncer` in `StudioShell`; `announce("status" \| "alert", text)` is passed to `Studio`, and each announcement replaces the previous one. Async action: `AddGearForm`, with a `savingRef` guard, `aria-disabled` while working, `LoaderCircle.trip-spin` and a working label, and a persistent `<p role="alert" class="studio-form-alert">` filled on failure (hidden by `:empty`). Buttons: `trip-control studio-primary` (primary) and `studio-button` (secondary). Links: `trip-control trip-link`, and `trip-control trip-button data-tone="panel"` as used by "Back to planning". Headings: `h2.studio-group-heading.trip-focus-target tabIndex=-1` with `p.studio-group-description`. Focus after an async change: the post-Retry effect. **Every Finish state maps to an existing pattern, so `ui-ux` is not needed (U4).** Copy constraint: the header of `loadout/content.ts` says nothing may claim that an equipped choice is "saved, kept, or remembered" (005 Q16); see §13.7 note 1 | `GearStudioScreen.tsx:120–137, 406–415`; `AddGearForm.tsx:66–245`; `GearZone.tsx:134–144, 163–166`; `studio.css:560–638, 861–895`; `components/layout/useTripAnnouncer.ts`, `TripRetryButton.tsx`; `features/loadout/content.ts:1–14` |

---

## 6. Plan Domain Model

**D1. A Plan is one user's confirmed intention to go on one trail on one date.**

| Field | Type | Rule | In API response |
|---|---|---|---|
| `id` | UUID | Server-generated: `UUID.randomUUID()` in the entity's `@PrePersist`, as `Memory` (a client `id` is ignored) | Yes |
| `ownerSubject` | string ≤ 255 | Keycloak `sub` of the validated token. Never accepted from a client, never returned, never logged | **No** |
| `trailId` | UUID | An existing trail at creation (§11). Immutable | Yes |
| `tripDate` | `LocalDate` | Required. Today or later at creation (§15). Immutable | Yes |
| `status` | enum `PlanStatus` | `READY` only (§7) | Yes |
| `createdAt` | timestamp with time zone | Set by the entity in `@PrePersist`, truncated to microseconds (as `Memory`); immutable | Yes, in UTC (§12.1) |
| `updatedAt` | timestamp with time zone | Set with `createdAt`; changed only by a soft delete in FEATURE-011 | Yes, in UTC (§12.1) |
| `deleted` | boolean | Soft delete (§8, §12.5) | **No** |

**D2. No other fields.** Each candidate was rejected for want of a FEATURE-011 requirement:

| Rejected field | Why |
|---|---|
| Trail name, difficulty, distance, elevation, scenery, coordinates | Trail snapshot. Consumers read trail-service by `trailId` (D9, PRD §4.8) |
| Temperature, precipitation, forecast, weather score, forecast time | Weather snapshot. Forecasts change; FEATURE-013 may read current data |
| Owned, equipped, recommended, or missing gear; Gear Readiness | Gear snapshot. Gear stays in user-service and the session loadout (PRD §13.2) |
| Notes, participants, start time, reminders | Out of scope (§24) |
| `completedAt`, `cancelledAt` | No lifecycle beyond READY (§7) |
| `recommendationId`, planner context | A Plan is not a recommendation record (§2) |

## 7. Plan Lifecycle

**D3. One status: `READY`.** FEATURE-011 creates only `READY` Plans and never changes a status.

```text
(no Plan) ──Finish preparation──▶ READY ──DELETE──▶ soft-deleted (invisible to every normal API)
```

- **Upcoming / Past are derived, not stored.** `tripDate >= today` is upcoming, `tripDate < today` is past, computed by the consumer in the viewer's local calendar (FEATURE-013). No job ever rewrites a Plan when its date passes.
- **No `COMPLETED`.** "I went" is expressed by FEATURE-014 creating a Memory from a past Plan, not by a Plan state. A stored completion would duplicate a fact the Memory already records.
- **No `DRAFT`, `PLANNING`, `PREPARING`, `CANCELLED`, `IN_PROGRESS`.** Planning and preparing are the existing transient flow; cancelling is a delete; the product does not track a trip in progress (PRD §23).
- **Why keep a one-value status at all.** It costs one column, makes the response self-describing, and lets a later approved state be added by one migration (widening the `CHECK`) without changing the response shape. It carries no behaviour in FEATURE-011.

## 8. Database / Migration

### 8.1 Database

**D4.** A new database `plan_db` on the existing PostGIS/PostgreSQL container (no PostGIS features used), owned only by `plan-service`. No foreign key to any other database.

### 8.2 Migration `V1__create_plan_tables.sql`

```sql
CREATE TABLE plans (
    id             UUID PRIMARY KEY,
    owner_subject  VARCHAR(255) NOT NULL,
    trail_id       UUID NOT NULL,
    trip_date      DATE NOT NULL,
    status         VARCHAR(16) NOT NULL DEFAULT 'READY',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted        BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_plan_status CHECK (status IN ('READY'))
);

-- One active Plan per owner, trail, and date (D6). Soft-deleted rows do not count.
CREATE UNIQUE INDEX uk_plans_owner_trail_date_active
    ON plans (owner_subject, trail_id, trip_date)
    WHERE deleted = FALSE;

-- Owner list: WHERE owner_subject = ? AND deleted = false
--             ORDER BY trip_date ASC, created_at ASC, id ASC
CREATE INDEX idx_plans_owner_active
    ON plans (owner_subject, trip_date, created_at, id)
    WHERE deleted = FALSE;
```

**D5. A partial unique index enforces the duplicate rule in the database.** It matches the project's existing partial-index convention (`memory_db`'s `WHERE deleted = FALSE` indexes) and PostgreSQL supports it natively. A plain unique constraint on the three columns is rejected: it would block recreating a Plan after deleting it (§10).

The unique index also serves the owner-scoped duplicate lookup of §10 step 2; the list index serves §12.3. Index names follow `memory_db` (`uk_` unique, `idx_` other).

Flyway runs at startup with `ddl-auto: validate`, as memory-service (`validate` checks tables and columns, not indexes, so AC-09 is a test). The migration is never edited after it has been applied; later changes are new versions.

**Entity `Plan`** (as `Memory`): `@Id UUID id` assigned in `@PrePersist`; `owner_subject`, `trail_id`, `trip_date`, `created_at` mapped `updatable = false`; `status` as `@Enumerated(EnumType.STRING)`, `length = 16`, field default `READY`; `createdAt` / `updatedAt` set in `@PrePersist` from `OffsetDateTime.now()` truncated to microseconds, so the column `DEFAULT`s are only a fallback for direct SQL; `markDeleted()` sets `deleted = true` and `updatedAt`.

### 8.3 Local database setup (existing volumes)

- Add `CREATE DATABASE plan_db;` to `Project/docker/postgres/init-databases.sql` (narrow infrastructure grant, §22.1). That script runs only when the Postgres volume is first created.
- **A volume created before FEATURE-011 needs a one-time manual step**, exactly as `memory_db` did:
  `docker exec outdoor-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE plan_db;"'`
  (single quotes so the variables expand inside the container, where compose set them; the host shell usually does not have them). `CREATE DATABASE` fails harmlessly with "already exists" if repeated.
- **Never delete or recreate the volume or an existing database to obtain `plan_db`.** Doing so destroys Keycloak's realm, users, gear, trails, and Memories.
- If `plan-service` starts without `plan_db`, it fails at startup (Flyway cannot connect: `database "plan_db" does not exist`); it does not create the database itself.
- plan-service reads `POSTGRES_USER` / `POSTGRES_PASSWORD` from its environment, as memory-service; no new variable.

## 9. Authentication / Ownership

**D7. Every `/api/plans/**` endpoint requires authentication.** There is no public Plan endpoint and no `permitAll` matcher for any Plan path.

- `SecurityConfig` mirrors memory-service without its public permits: stateless, CSRF off, JWT resource server against `http://localhost:8180/realms/outdoor-trip`, the custom `401` / `403` handlers (`RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`), and the `SubjectRequiredFilter` (not a bean, added after `BearerTokenAuthenticationFilter`) that refuses a token with a missing or blank `sub` (`401 AUTHENTICATION_REQUIRED`) before any service logic. Controllers take the owner with `OwnerSubject.of(@AuthenticationPrincipal Jwt)`.
- **Matchers:** `dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()` then `anyRequest().authenticated()`, exactly as memory-service and trail-service. The ERROR permit applies only to the container's internal error forward of a request that was already authorised or refused on its `REQUEST` dispatch, so it widens nothing (a direct `GET /error` is a `REQUEST` dispatch and stays authenticated); it keeps a forwarded error's real status instead of turning it into `401`.
- **The owner is the token's `sub`, and nothing else.** The create request has no owner field. `CreatePlanRequest` carries `@JsonIgnoreProperties(ignoreUnknown = true)` as memory-service's request records do, so `ownerSubject`, `id`, `status`, `deleted`, or timestamps in a body are ignored, never honoured, and never a `400` (§12.2). No service configures `FAIL_ON_UNKNOWN_PROPERTIES` globally, so the annotation, not the mapper default, is the guarantee. The owner is not user-service's `users.id` (008 §8.4).
- **P0 isolation.** Every read, list, delete, and duplicate lookup is scoped `owner_subject = <sub> AND deleted = false` in the query itself, never filtered afterwards. Another user's Plan, a missing Plan, a deleted Plan, and a guessed UUID all give the same `404 PLAN_NOT_FOUND`; a caller cannot tell which (008 convention). `403` is not used for ownership.
- The duplicate lookup is owner-scoped: the same trail and date planned by two users are two independent Plans, and neither user's request reveals the other's.

## 10. Duplicate / Idempotency Rules

**D6. Logical identity: `(owner_subject, trail_id, trip_date)` among non-deleted Plans.**

**D8. `POST /api/plans` is idempotent for that identity.**

| Situation | Result |
|---|---|
| No active Plan for the identity | Insert; `201 Created` with the new Plan |
| An active Plan exists | No insert, no update; `200 OK` with the existing Plan, unchanged (same `id`, `createdAt`, `updatedAt`) |
| Two concurrent first requests (double click, retry racing the original) | One insert wins; the other hits the unique index, the service catches the violation, re-reads the active Plan, and returns `200 OK` with it. Never a `409`, never a `500`, never a second row |
| Only soft-deleted Plans exist for the identity | Insert a new Plan; `201` (deleted rows do not count) |
| Same trail, different date; or same date, different trail | Different identities; each gets its own Plan |

Order of work in create:

1. Validate the body. Bean Validation in the controller (`@Valid`: `@NotNull trailId`, `@NotNull tripDate`), then the date rule in the service against the injected `Clock` (§15; a `PlanFieldRules`-style component as `MemoryFieldRules`, not `@FutureOrPresent`, so tests can fix the clock). Invalid → `400 VALIDATION_ERROR`; nothing else happens. (Consequence: once the date has passed, even a retry of an already saved Plan is `400`, which matches the frontend's `invalid-date` handling.)
2. Look up the caller's active Plan for `(sub, trailId, tripDate)` in a read-only transaction. Found → `200` with it. **No trail call**, so a retry of a saved Plan succeeds even while trail-service is down.
3. Validate the trail (§11), outside any transaction.
4. Insert with `planRepository.saveAndFlush(plan)` inside its own `TransactionTemplate` transaction → `201`.
5. If step 4 throws `DataIntegrityViolationException`, catch it **outside** that transaction (which has already rolled back), re-read the active Plan in a new read-only transaction, and return `200` with it. If the re-read finds nothing (the winner was deleted in between), rethrow → `500`; that is not expected in practice and is not retried.

**Transaction mechanics (required for step 5 to be sound).**

- `create` is **not** `@Transactional`. It uses `TransactionTemplate`s built from the `PlatformTransactionManager`, as `MemoryService` already does (008 §18.1 says `@Transactional`, but the code uses templates). Under one `@Transactional` method the failed insert would mark the transaction rollback-only and PostgreSQL would refuse the re-read ("current transaction is aborted"), ending in `UnexpectedRollbackException` / `500`.
- `saveAndFlush`, not `save`: the INSERT then runs inside the repository call, so the violation surfaces there as Spring's translated `DataIntegrityViolationException` rather than at commit, where JPA may wrap it differently.
- `spring.jpa.open-in-view: false` (as every service here), so each template gets a fresh `EntityManager`; after a failed flush Hibernate's session must be discarded, and the re-read must not run in it. The failed `Plan` instance is not reused.
- PostgreSQL makes the second concurrent INSERT wait for the first transaction and then raise `23505`; under the default READ COMMITTED the re-read sees the winner's committed row.
- The catch is not narrowed to the constraint name: the only other constraints (`NOT NULL`, the status `CHECK`) cannot fail for a validated request, and the re-read guard turns anything unexpected into `500`, not a false `200`.

Testability: in integration tests `TrailCatalogClient` is a `@MockitoBean` (as memory-service); making its answer wait on a `CountDownLatch` until both threads have passed step 2 forces the race deterministically.

Status `201` vs `200` is the only difference between "saved now" and "was already saved"; the body shape is identical. The controller returns `ResponseEntity<PlanResponse>` with the status chosen by the service result (for example a `CreatePlanResult(PlanResponse plan, boolean created)` record). The frontend treats both as success (§16).

## 11. Trail Validation

**D9. Store `trailId` only; validate it once at creation with the existing public trail read.** A `TrailCatalogClient` in plan-service, built exactly like memory-service's (§5.1 D): base URL `services.trail.base-url` (default `http://localhost:8082`, env `TRAIL_SERVICE_BASE_URL`), connect 2 s, read 3 s, no `Authorization` header, status only, no retry, never inside a transaction. No new trail endpoint, no shared library, no read of `trail_db`.

| trail-service answer | plan-service result |
|---|---|
| `200` | Continue to insert |
| `404` (missing or soft-deleted) | `400 TRAIL_NOT_FOUND`; nothing stored (`404` stays reserved for the addressed Plan) |
| Timeout, connection error, `5xx`, any other status (including `401` / `403` should trail-service's public permit ever change) | `503 TRAIL_SERVICE_UNAVAILABLE`; nothing stored (fail closed: never an unverifiable `trailId`) |

The path is tokenless-reachable: trail-service's `SecurityConfig` permits `GET` on a UUID-shaped `/api/trails/{id}` (regex matcher) and the ERROR dispatch. In tests the client itself is covered as memory-service's `TrailCatalogClientTest` (`MockRestServiceServer`), and integration tests mock it.

When calls happen: create only, and only when no active Plan already exists (§10 step 2). List, detail, and delete make **no** trail call.

**Trail deleted after a Plan exists.** The Plan is not modified or deleted. It keeps appearing in the owner's list and detail with its `trailId`; FEATURE-013 shows a "trail unavailable" state, as My Memories does (009).

**D10. Synthetic trails may be planned.** `GET /api/trails/{id}` ignores `discover_visible` (verified: `TrailRepository.findTrailDetailById` filters only `t.deleted = false`), so a `SYNTHETIC_DEMO` trail validates like any other. The planner recommends them and the Studio already prepares them. This does not change the Memory rules: synthetic trails still show no **Add a memory** and no Community Memories, and FEATURE-014 decides how a past Plan on a synthetic trail behaves (§25 U5).

## 12. API Contract

Base path `/api/plans` on `plan-service` (`http://localhost:8086`). All endpoints authenticated (D7). JSON. Dates are ISO `YYYY-MM-DD`; timestamps ISO-8601 in UTC (`…Z`, fractional seconds up to microseconds); UUIDs lower case strings.

**Timestamps are normalised to UTC when the DTO is built** (`withOffsetSameInstant(ZoneOffset.UTC)`). The `201` body comes from the just-persisted entity (JVM-zone offset) while a later `200` comes from a database read (driver offset); without normalisation the same instant could serialise differently and break AC-07's "unchanged timestamps". This is a plan-service presentation rule; memory-service has no such requirement.

### 12.1 Response types

```json
// PlanResponse
{
  "id": "6f1c…",
  "trailId": "0a4e…",
  "tripDate": "2026-10-24",
  "status": "READY",
  "createdAt": "2026-10-19T18:02:11.204Z",
  "updatedAt": "2026-10-19T18:02:11.204Z"
}

// PlanPage
{ "items": [PlanResponse…], "page": 0, "size": 20, "totalItems": 3, "totalPages": 1 }
```

**D11. One DTO for list and detail.** A Plan has nothing a detail view would add. No response contains `ownerSubject`, `deleted`, or any trail, weather, or gear data.

### 12.2 `POST /api/plans` — create or reuse

Request `CreatePlanRequest`:

| Field | Type | Required | Rule |
|---|---|---|---|
| `trailId` | UUID string | yes | Must name an existing trail (§11) |
| `tripDate` | `YYYY-MM-DD` | yes | Not before the server's local today (§15) |

`@JsonIgnoreProperties(ignoreUnknown = true)`: unknown properties (for example `ownerSubject`, `status`, `id`, `deleted`) are ignored (§9). Responses: `201` new Plan; `200` existing active Plan (§10); `400 VALIDATION_ERROR`; `400 TRAIL_NOT_FOUND`; `401 AUTHENTICATION_REQUIRED`; `503 TRAIL_SERVICE_UNAVAILABLE`.

What `400 VALIDATION_ERROR` carries, under memory-service's `GlobalExceptionHandler` (verified):

| Input | `errors[]` |
|---|---|
| `tripDate` missing or `null` | `[{ field: "tripDate", … }]` (Bean Validation) |
| `tripDate` before the server's today | `[{ field: "tripDate", message: "must not be in the past" }]` (service rule) |
| `trailId` missing or `null` | `[{ field: "trailId", … }]` |
| Malformed JSON, a non-ISO date string, a non-UUID `trailId` | **absent**: Jackson fails before binding (`HttpMessageNotReadableException`), and the handler gives only `code` |
| Both fields missing | both entries |

The frontend only ever sends well-formed values, so its `invalid-date` class (`errors[].field == "tripDate"`, §13.2) is reached by the past-date case, which always names the field.

### 12.3 `GET /api/plans` — owner list

- Query `page` (0-based, default 0) and `size` (default 20, 1–50), memory-service rules (`MemoryPaging`: `page < 0`, `size` outside 1–50, or `page × size` beyond `Integer.MAX_VALUE` → `400 VALIDATION_ERROR` naming the field; a non-integer → `400 VALIDATION_ERROR` without `errors[]`).
- Envelope `PlanPage { items, page, size, totalItems, totalPages }`, built from the Spring Data `Page` as `MemoryPage.of`; Spring's own `Page` JSON is never returned.
- Returns `PlanPage` of the caller's non-deleted Plans, **both upcoming and past**.
- **D12. Order: `tripDate ASC, createdAt ASC, id ASC`** (one fixed `Sort`, as `MemoryPaging.ORDER` but ascending; no client sort parameter). Earliest trip first suits upcoming-first presentation and a calendar; `createdAt, id` make it deterministic. Query `findByOwnerSubjectAndDeletedFalse(owner, pageable)`, served by `idx_plans_owner_active`.
- **D13. No calendar or range filter in FEATURE-011.** Expected counts are small (a capstone user has a handful of Plans), so FEATURE-013 can read every Plan in one or two pages and split Upcoming / Past and months on the client. If FEATURE-013 later needs `from` / `to` or a descending sort, those are **additive optional query parameters** on this endpoint, not a new contract.

### 12.4 `GET /api/plans/{id}` — owner detail

`200 PlanResponse`; a missing, deleted, or another user's Plan → `404 PLAN_NOT_FOUND` (one query, `findByIdAndOwnerSubjectAndDeletedFalse`); a non-UUID id → `400 VALIDATION_ERROR` (type mismatch, no `errors[]`). Without a token every path, UUID or not, is `401` first.

### 12.5 `DELETE /api/plans/{id}` — soft delete

Sets `deleted = true` and `updated_at = now` in one `TransactionTemplate` transaction after the owner-scoped lookup, as `MemoryService.delete`; `204` with no body. Missing, already deleted, or another user's → `404 PLAN_NOT_FOUND` (so a sequential second delete is `404`; two exactly simultaneous deletes may both get `204`, which is harmless). No restore. Hard delete never happens through the API. A deleted Plan no longer appears in the list or detail and no longer blocks creating the same trail and date (§10).

### 12.6 Not provided

No `PUT` / `PATCH` (trail and date are the Plan's identity: changing either is delete + create, which FEATURE-013 may offer); no public endpoint; no batch; no search; no calendar endpoint; no restore.

### 12.7 Error codes

`ProblemDetail` with `code`, as memory-service (§5.1 F).

| Situation | Status | `code` |
|---|---|---|
| Body or query invalid, past date, non-UUID path, bad paging | 400 | `VALIDATION_ERROR` (`errors[]` for field rules; absent for unparseable input, §12.2) |
| Create for a missing or deleted trail | 400 | `TRAIL_NOT_FOUND` |
| No or invalid token, or no `sub` | 401 | `AUTHENTICATION_REQUIRED` |
| Authenticated but forbidden (not expected) | 403 | `ACCESS_DENIED` |
| Plan missing, deleted, or another user's | 404 | `PLAN_NOT_FOUND` |
| Unknown path / wrong method (authenticated) | 404 / 405 | `NOT_FOUND` / `METHOD_NOT_ALLOWED` |
| Body not JSON (`Content-Type`) / other framework client error | 415 / 4xx | `UNSUPPORTED_MEDIA_TYPE` / `REQUEST_ERROR` |
| trail-service unreachable or erroring | 503 | `TRAIL_SERVICE_UNAVAILABLE` |
| Unexpected | 500 | `INTERNAL_SERVER_ERROR` (no internals) |

### 12.8 Service architecture

`Project/Backend/plan-service/`, package `com.jay.outdoor.plan`, listed as a `<module>` of the aggregator `Project/Backend/pom.xml`. Like memory-service, its own `pom.xml` has `spring-boot-starter-parent` 4.1.1 as parent (the aggregator is not a parent), Java 21, and memory-service's dependency list minus the AWS SDK BOM / `s3` and TwelveMonkeys `imageio-webp`: `spring-boot-starter-{data-jpa, flyway, security, validation, webmvc, oauth2-resource-server}`, `flyway-database-postgresql`, `postgresql` (runtime); tests `spring-boot-starter-{data-jpa-test, flyway-test, security-test, validation-test, webmvc-test}`, `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter` (`postgres:17-alpine`, `@ServiceConnection`, `@MockitoBean JwtDecoder`, `jwt()` with a chosen subject). No new third-party dependency. Port 8086 (free; 8080–8085 are taken).

`application.yaml`: `server.port: 8086`; datasource `jdbc:postgresql://localhost:5432/plan_db` with `${POSTGRES_USER}` / `${POSTGRES_PASSWORD}`; `jpa.hibernate.ddl-auto: validate`; `jpa.open-in-view: false` (required, §10); `flyway.enabled: true`; the issuer URI; `services.trail.base-url: ${TRAIL_SERVICE_BASE_URL:http://localhost:8082}`. No multipart or storage keys.

Layering as memory-service: `controller` → `service` → `repository`, plus `dto`, `entity`, `client`, `config` (`SecurityConfig`, `TrailClientConfig`, `ClockConfig`), `security` (`OwnerSubject`, `SubjectRequiredFilter`, the two handlers), `exception` (`ApplicationException` subclasses and `GlobalExceptionHandler` copied without the multipart handler; `ErrorCode` = the §12.7 codes only). Classes are copied, not shared. No DDD layers, no events, no messaging, no caching, no shared module. No CORS configuration (the browser reaches it same-origin through the Vite proxy, §13).

Logging: operation, Plan id, trail id, outcome, trail-call failures and durations. Never: tokens, `Authorization` headers, owner subjects, emails.

---

## 13. Frontend Integration

Reviewed and completed by `frontend` (2026-10-19) against the code in §5.2. Paths are under `Project/Frontend/src/`.

### 13.1 Feature boundary

**D14. A new feature folder `features/plans/`** is the Plan domain's frontend home, which FEATURE-013 extends.

```text
features/plans/
  api/planRequest.ts      # one authenticated request: 20 s limit (covers the body), outcome with the HTTP status and a best-effort ProblemDetail { code, fields }
                          #   (memoryRequest's shape, as plans' own copy: plans must not import memories)
  api/plans.ts            # createPlan, readPlan (response check), PlanRequestError, planFailureKindOf
  hooks/useCreatePlan.ts  # the TanStack Query mutation
  types/plan.ts           # Plan, PlanStatus, PlanPage, CreatePlanRequest, CreatePlanResult, PlanFailureKind
  components/FinishPreparation.tsx  # the Finish row and its states; rendered only by the Studio
  content.ts              # the §14 copy (ids FP…)
```

There is no list, calendar, detail, or navigation component, no route, no CSS file, and no `index.ts` barrel. The Studio imports the component by its path.

### 13.2 API layer

| Function | Request | FEATURE-011 |
|---|---|---|
| `createPlan(request: CreatePlanRequest): Promise<CreatePlanResult>` | `POST /api/plans`, body exactly `{ trailId, tripDate }` | **Implemented** (its only caller is Finish preparation) |
| `getPlans({ page, size }, cancel)` | `GET /api/plans` | Not built. Implemented by FEATURE-013, its first consumer |
| `getPlan(id, cancel)` | `GET /api/plans/{id}` | As above |
| `deletePlan(id)` | `DELETE /api/plans/{id}` (`204` or `404` = removed) | As above |

`CreatePlanResult = { saved: "created" | "existing"; plan: Plan | null }`. A `201` is `created`, and any other `2xx` is `existing`. `plan` is `readPlan(body)`. A `2xx` whose body cannot be read still counts as success, with `plan: null`; the status says it was saved (gear precedent). The types `Plan`, `PlanStatus` (`"READY"`), and `PlanPage` follow §12.1 and are defined now. They document the contract and cost nothing.

**D15 (confirmed).** Only `createPlan` is built in FEATURE-011. All requests go through `planRequest` → `authenticatedApiRequest()`. No component calls `fetch` or `plan-service` directly. The time limit is `PLAN_REQUEST_TIMEOUT_MS = 20_000`, which covers reading the body. Nothing about a request or a response is logged.

**Failure classification** (`PlanFailureKind`, read by `planFailureKindOf(error)`, where any non-`PlanRequestError` is `unavailable`):

| Outcome | Kind | Note |
|---|---|---|
| The component's check at activation finds `tripDate < todayIso()` | `invalid-date` | No request is sent (§15, AC-32) |
| `NotAuthenticatedError`: no session, nothing sent | `no-session` | Nothing is drawn. FEATURE-002 ends the session and `ProtectedRoute` leaves the Studio (§5.2 P). This replaces the draft's `unauthenticated` |
| Time limit reached | `unconfirmed` | |
| No response (offline, refused, aborted) | `unavailable` | |
| `400` with `code` `TRAIL_NOT_FOUND` | `trail-gone` | |
| `400` with `code` `VALIDATION_ERROR` and `tripDate` in `errors[].field` | `invalid-date` | |
| Any `5xx`, including `503 TRAIL_SERVICE_UNAVAILABLE` and the dev proxy's `500` when plan-service is down (AC-19) | `unavailable` | |
| Any other status: another `400`, `401`/`403` on a token the client still held, `404`, `405` | `unexpected` | A **Try again** asks `getAccessToken()` again, which renews the token or ends the session (→ `no-session`) |

### 13.3 Query keys

`useCreatePlan()` is `useMutation({ mutationFn: createPlan, retry: false, networkMode: "always" })`. `networkMode: "always"` is required: with the default, an offline device pauses the mutation and leaves **Saving plan…** on screen indefinitely. The hook needs no subject, sets no `mutationKey`, writes nothing to the query cache, and invalidates nothing, because FEATURE-011 has no Plan query. The `["plans", …]` namespace, with the subject in every key, is reserved for FEATURE-013, which also decides the exact shape (the memories precedent is `["plans", "mine", <subject>]`). The sign-out and session-end `queryClient.clear()` already covers both the query cache and the mutation cache.

### 13.4 Integration point

**D16. Finish preparation is the last element of the Studio's gear zone.** `GearStudioScreen.tsx` renders it inside `div.studio-zone`, directly after `<GearZone …/>`, in the same `screen.kind === "ready" && model !== null` branch. TypeScript needs `trailId !== null` in that condition; it is always true in `ready`. It renders in no other screen state: not `loading`, not `pack-failed`, not `not-found`, and not `gear-failed`. In `gear-failed` the pack has succeeded but the user cannot see their gear, so the zone shows the gear failure and Retry, and Finish appears when that Retry succeeds (AC-15). It stays inside the scrolling zone and does not become a fixed footer, so 005 §16.5's panel composition is unchanged (§13.7 note 6).

```tsx
<FinishPreparation
  trailId={trailId}                     // the validated route id
  tripDate={tripDate}                   // the :tripDate segment (D17)
  trailName={trail?.name ?? screen.pack.trailName}
  announce={announce}                   // the Studio's existing announcer
  chooseDateTo={tripPreparationLocation(routeId, tripDate, rec)}
  continueTo="/home"                    // D20; D-INV-2: changed here only
/>
```

Plans receives the Trip Preparation address and the Continue destination as props, so it imports nothing from `trails`. FEATURE-012/013 change the destination in one place. `Studio` is keyed per trip, and `ready` is stable once reached (§5.2 L), so the row's state survives equip, unequip, and Add gear, and resets for another trip. No planner, packing, loadout, or gear state changes.

`FinishPreparation`, built only from existing Studio patterns (§5.2 S):

| State | Markup |
|---|---|
| Container | `<section className="studio-finish" aria-labelledby={headingId}>` |
| Idle, saving, failure | `h2.studio-group-heading` "Ready for the trip?"; `p.studio-group-description`; `div.studio-form-actions` holding one `<button type="button" className="trip-control studio-primary">`. Under it is a persistent `<p id={alertId} role="alert" className="studio-form-alert" tabIndex={-1}>`, empty until a failure. The button keeps its position and element across idle, saving, and failure, so focus stays on it |
| Saving | The button shows `LoaderCircle.trip-spin` and **Saving plan…**, with `aria-disabled="true"`. Activation is ignored |
| Retryable failure (`unavailable`, `unconfirmed`, `unexpected`) | The message fills the alert; the button reads **Try again** with `aria-describedby={alertId}`; focus stays on the button |
| `invalid-date` | The message fills the alert, and the button is replaced by `<Link className="trip-control trip-link" to={chooseDateTo}>` **Choose a new date**. Focus moves to the alert paragraph, and Tab reaches the link |
| `trail-gone` | The message fills the alert, the button is removed, and focus moves to the alert paragraph |
| `no-session` | Nothing changes. The Studio is about to unmount |
| Success | `h2.studio-group-heading.trip-focus-target` with `tabIndex={-1}` "Preparation complete", focused once by an effect when the result arrives; `p.studio-group-description` with the §14.3 body (`formatTripDateShort(tripDate, todayIso())`); `<Link className="trip-control studio-primary" to={continueTo}>` **Continue** |

Activation sequence. (1) If `savingRef.current` is set, return; the ref is set synchronously, so a double click or Enter followed by a click sends one request (D19). (2) If `tripDate < todayIso()`, show `invalid-date` and stop. (3) Set `savingRef`, clear the failure, and call `announce("status", "Saving your plan.")`. (4) `await mutateAsync({ trailId, tripDate })`, then show success. On rejection, show the kind from `planFailureKindOf`. (5) In `finally`, clear `savingRef`. The success state appears only after a `2xx` (D-INV-1). Leaving the Studio during a save is harmless.

CSS. `studio.css` gets only `.studio-finish`: `margin-top: 24px`, `padding-top: 20px`, `border-top: 1px solid var(--trip-snow-16)`, and the gap between lines. Below 768 px, `.studio-finish .studio-primary { width: 100% }` (§17.2). Every other rule is an existing class. `loadout/content.ts` is not changed; the copy lives in `plans/content.ts`.

### 13.5 Dev proxy

`vite.config.ts` gets one entry, `"/api/plans": { target: "http://localhost:8086" }`, after `/api/memories`, plus one line in the existing comment ("FEATURE-011 adds plan-service"). It does not collide with `/api/planner`. There is no new environment variable. `npm run preview` and deployed builds cannot reach it until production routing exists (U6).

### 13.6 Dependencies between features

- One new edge: `loadout → plans`. `GearStudioScreen.tsx` imports `FinishPreparation` and nothing else from plans. No other feature imports `plans` in FEATURE-011.
- `plans` imports from `services/apiClient` (`authenticatedApiRequest`), `auth` (`NotAuthenticatedError` only; no subject is needed), `planning/tripDate.ts` (`todayIso`, `formatTripDateShort`, `isIsoDate` for `readPlan`; a sanctioned shared formatter, as for memories), and `components/layout/useTripAnnouncer` (the `Announce` type only), plus `react-router-dom` (`Link`, `To`) and `lucide-react`.
- `plans` imports nothing from `loadout`, `trails`, `packing`, `gear`, `avatar`, `discover`, `landing`, `home`, `memories`, or `community-memories`. No file in it imports `three`, `@react-three/fiber`, or `maplibre-gl`.
- Presentation coupling: `FinishPreparation` uses the Studio's class names and imports no CSS, because it renders only inside `.studio`, whose stylesheet loads with the Studio chunk. This is accepted under the same precedent as community-memories reusing memories' class names. FEATURE-013 must not reuse this component outside the Studio without its own styles.
- Checked against FC §10: no cycle (`plans` is a leaf below `loadout`), and the existing edges are unchanged. Plans code lands in the lazily loaded `GearStudioPage` chunk and adds nothing to the entry chunk.

### 13.7 Notes for the lead on §14–§16

1. **§14.5 `unavailable` copy conflicts with 005 Q16.** "Your gear choices are kept." claims the loadout is kept, which the Studio's copy rules forbid (`loadout/content.ts:12–13`). Suggested wording: "Your plan couldn't be saved right now. Try again in a moment."
2. **§14.5 `invalid-date` link target.** Use `tripPreparationLocation(trailId, tripDate, rec)`, which keeps the past date, rather than the date-less address. That is what the Studio's own past-date redirect does. Trip Preparation then explains that the date has passed instead of saying it is missing, and `?rec` is kept. Either address works.
3. **`unauthenticated` is replaced by `no-session`** (§13.2). No existing flow passes a server `401` to FEATURE-002. A `401`/`403` is `unexpected`, with Try again. AC-33 is met through `no-session`. §14.5's last row should read `no-session`.
4. **§17.1 focus after failure.** For `invalid-date` and `trail-gone` the button is removed, because there is no retry. Focus moves to the message (`tabIndex=-1`) instead of "staying on the button". AC-24 should say this.
5. **§17.1 Continue as a native button.** I recommend a `Link` styled `studio-primary`. It navigates, and the Studio's other navigations ("Gear up", "Back to planning") are links. No AC changes.
6. **§14.1 placement.** The row is the end of the scrolling gear zone. At 1440×900, a user with many rows scrolls the zone (or Tabs, which scrolls it) to reach Finish. A fixed footer outside the zone would always be visible, but it changes 005 §16.5 and shrinks the gear zone at 1024×768, so it would need `ui-ux`. Please confirm inside-the-zone placement.
7. **§14.3 fallback row** ("Trail name not loaded") cannot occur in `ready`, because `pack.trailName` is required (§5.2 Q). Keep it as a defensive fallback.
8. **§16 D19** also needs `networkMode: "always"` (§13.3). Without it, an offline save stays in "Saving plan…".
9. **§14.2.** The Studio has one announcer, so an equip announcement made while saving replaces "Saving your plan." That is acceptable, and no second announcer is added.
10. **U3 / D15: agree, `createPlan` only.** List, detail, and delete would ship without a consumer or a QA path. FEATURE-013 will choose their query shape (infinite pages or a single read, cache invalidation after delete), so writing them now would fix choices that are FEATURE-013's to make. The types are defined now.
11. **AC-15** should also say Finish is not shown when the gear list failed (`gear-failed`), per §13.4.

**Lead resolution (2026-10-19): all eleven notes accepted.** §14–§17 and §20 are amended accordingly: notes 1–5 in §14.4, §14.5, and §17.1; note 6 confirmed (the row stays inside the scrolling gear zone; no fixed footer, no `ui-ux`); note 7 in §14.3; note 8 in §16; note 9 accepted as is; note 10 is D15 / U3; note 11 in AC-15.

---

## 14. Finish Preparation UX

No new page and no Studio redesign. The visual language reuses the Studio's existing panel, typography, action, and status patterns (DS §14, §18, §27; 005). `ui-ux` is not needed unless the frontend review finds no existing pattern for one of these states (§25 U4).

### 14.1 Placement and idle state

At the end of the Studio's scrolling gear zone, after the gear rows (§13.4). It is not a fixed footer; with many rows the user scrolls the zone, or Tabs, to reach it:

```text
┌ Studio panel ────────────────────────────────┐
│ ← Trip Preparation                            │
│ Gearing up for Quarry Rock                    │
│ Sat, Oct 24                                   │
│ Gear Readiness 75% · 1 recommended item missing│
│ Equipped for this trip 3 of 4                 │
│ [gear rows …]                                 │
│ ───────────────────────────────────────────── │
│ Ready for the trip?                           │
│ Save this trail and date as your plan.        │
│ [ Finish preparation ]                        │
└───────────────────────────────────────────────┘
```

| Element | Copy |
|---|---|
| Lead line | **Ready for the trip?** |
| Support line | Save this trail and date as your plan. |
| Action | **Finish preparation** (a native `<button>`, the Studio's primary action style) |

**D18. Gear Readiness below 100 % does not block.** Finish is enabled whatever the readiness or the equipped count. The existing readiness line ("1 recommended item missing") stays where it is, above; Finish adds no warning, confirmation, or second step. Recommended gear is advice, not authorisation (PRD §4.3, §13.2).

### 14.2 Saving

On activation: the button shows **Saving plan…**, is `aria-disabled` and ignores further activation (keyboard and pointer), and the row announces "Saving your plan." politely once. Gear rows stay usable. Exactly one request is in flight at a time (D19).

### 14.3 Success

The Finish row is replaced, in place, by a confirmation:

```text
Preparation complete
Your plan for Quarry Rock on Sat, Oct 24 has been saved.
[ Continue ]
```

| Case | Heading | Body |
|---|---|---|
| `201` | **Preparation complete** | Your plan for {trail name} on {short date} has been saved. |
| `200` (already saved) | **Preparation complete** | Your plan for {trail name} on {short date} is already saved. |
| Trail name not loaded (defensive only: `ready` always has `pack.trailName`, §13.4) | (same heading) | Your plan for {short date} has been saved. / is already saved. |

The date uses `formatTripDateShort`. No animation, illustration, confetti, or 3D (FEATURE-012). The gear rows remain usable; changing the loadout after saving does not touch the Plan (no snapshot).

### 14.4 Continue

**D20. Continue → `/home`**: a link styled as the Studio's primary action (push navigation, the Authenticated Home / Planner), like the Studio's other navigations. It clears nothing: not the planner session, not the loadout. Rationale: `/plans` does not exist yet, and the Home is the existing authenticated start point. Temporary (D-INV-2).

Leaving the Studio any other way (header, Back) after success is fine; the Plan is already saved. Returning to the same Studio later shows the idle Finish row again (FEATURE-011 does not read Plans); pressing Finish again yields the "already saved" confirmation (§10, `200`).

### 14.5 Failure

The Finish row stays, with an inline message under the button (`role="alert"`) and the button re-enabled as **Try again** where retry makes sense. Gear rows, loadout, and the Studio's other state are untouched. The copy makes no claim about the loadout (005 Q16).

| Class (§13.2) | Message | Action |
|---|---|---|
| `unavailable` | Your plan couldn't be saved right now. Try again in a moment. | **Try again** |
| `unconfirmed` | We couldn't confirm your plan was saved. Trying again won't create a duplicate. | **Try again** |
| `invalid-date` | This trip date has passed. Choose a new date to save your plan. | Link **Choose a new date** → `tripPreparationLocation(trailId, tripDate, rec)`, the same address the Studio's own past-date redirect uses (Trip Preparation then explains the date has passed) |
| `trail-gone` | This trail is no longer available, so the plan can't be saved. | none |
| `unexpected` | Your plan couldn't be saved. | **Try again** (asks for the token again, §13.2) |
| `no-session` | Nothing drawn: the existing FEATURE-002 session-ended flow leaves the Studio | — |

Retry is always safe because create is idempotent (D8): a retry after an unconfirmed save returns `200` with the same Plan.

## 15. tripDate Rules

**D17. The authoritative trip date is the Studio's `:tripDate` route segment** — the same value the Studio's pack request already used. No other store holds the date (§5.2 K), and the Plan is created for exactly the trail and date the user just reviewed.

| Rule | Client | Server |
|---|---|---|
| Required | Always present: the Studio route requires it | `400 VALIDATION_ERROR` when absent or malformed |
| Today allowed | Yes | Yes |
| Past not allowed | The Studio already redirects a past date to Trip Preparation on load. If the date has become past while the page was open (crossing midnight), Finish sends nothing and shows the `invalid-date` failure (§14.5) | `400 VALIDATION_ERROR` on `tripDate` when before the server's local today (same rule as the pack request's `@FutureOrPresent`, injected `Clock`) |
| Maximum | None (as 004 D4) | None |

**D21. No date dialog.** The brief's fallback ("When are you going?") is unnecessary: the Studio cannot render without a valid today-or-later date, so Finish never lacks one. An undated Plan is impossible on both sides.

Time zones. Locally the browser and the services share a clock. Where they differ, a viewer behind the server could have a local "today" that the server sees as yesterday; the pack request would already refuse that date and send the Studio back to Trip Preparation, so the Plan rule is consistent with what the Studio can reach. No time-zone allowance is added.

## 16. Loading / Error / Retry

- **D19. Double submission.** The frontend guards with the mutation's pending state plus a ref set synchronously on activation, so a double click or Enter + click sends one request. The server's idempotency (D8) and unique index (D5) remain the real protection.
- **No optimistic success.** The confirmation appears only after a `201` or `200` (D-INV-1).
- **No automatic retry** of the create in the client (`retry: false`); the user retries. (A retry is safe; an automatic one would hide a slow service.)
- **Offline.** The mutation uses `networkMode: "always"`, so an offline save fails as `unavailable` instead of pausing with **Saving plan…** on screen.
- **Refresh during save.** The request may or may not have reached the server. After reload the Studio shows the idle row; pressing Finish returns `201` or `200` — never a duplicate.
- **Sign-out / session end** during save follows FEATURE-002; nothing is persisted on the client.
- **No new web storage.** FEATURE-011 writes nothing to `localStorage`, `sessionStorage`, cookies, the URL, or history state.

## 17. Accessibility / Responsive

### 17.1 Accessibility

- Finish preparation and Try again are one native button; Continue and Choose a new date are links styled as Studio actions. All have the shared visible focus ring (DS §18) and are at least 44 px tall.
- Keyboard-only completion: Tab to Finish, Enter or Space saves, focus then moves to the confirmation heading (`tabIndex=-1`), Tab reaches Continue.
- Saving is announced once through the Studio's existing polite announcer (one announcer: a later equip announcement may replace it, which is accepted); failure messages use `role="alert"`; success is announced by focusing the heading (and its text is read).
- On a retryable failure focus stays on the button, which keeps its element, and the message is linked with `aria-describedby`. On `invalid-date` and `trail-gone` the button is removed, so focus moves to the message (`tabIndex=-1`); Tab then reaches Choose a new date where present.
- While saving, `aria-disabled="true"` (not `disabled`) so focus is not lost.
- Reduced motion: no motion is introduced.

### 17.2 Responsive

| Viewport | Expectation |
|---|---|
| 1440×900 (primary) | Row at the end of the Studio panel; the Stage unchanged |
| 1920×1080, 1024×768 (quick) | Same, no overlap with the Stage, no horizontal scroll |
| Below 768 (Stage not mounted, 005) | Row at the end of the stacked panel, full-width button, text wraps; basic usable fallback only |

## 18. Security / Privacy

P0 rules (backend):

1. Every Plan endpoint requires a valid token with a usable `sub`.
2. The owner comes only from `sub`; a client-supplied owner is ignored.
3. No user can list, read, delete, or detect another user's Plan; a guessed id is indistinguishable from a missing one (`404`).
4. Soft-deleted Plans never appear in any normal endpoint.
5. No response contains `ownerSubject` or `deleted`.
6. A Plan stores no trail, weather, or gear data, and no location of the user.
7. Logs contain no tokens, subjects, or emails.

Frontend: the token comes from `getAccessToken()` per request (FC §7); Plan data is not written to web storage; nothing Plan-related appears in a public page or public request. A Plan is private by construction: there is no visibility field and no public read.

## 19. Test Strategy

### 19.1 Backend (plan-service, `mvn -pl plan-service test`, Testcontainers PostgreSQL)

| Area | Cases |
|---|---|
| Create | `201` with body; stored `owner_subject` = token `sub`; `ownerSubject` in JSON ignored; today accepted; future accepted; past → `400` field `tripDate`; missing / malformed date → `400`; missing / non-UUID `trailId` → `400` |
| Idempotency | Second identical POST → `200`, same `id`, one row, and `createdAt` / `updatedAt` serialised identically to the `201` body (UTC, §12); concurrent POSTs forced with the latch of §10 → one row, both 2xx, same `id`; different date or trail → new Plan; after soft delete → new `201` with a new `id` |
| Unique index | Direct repository insert of a second active row for the same identity fails; with the first row deleted it succeeds |
| Trail validation | `404` from trail-service → `400 TRAIL_NOT_FOUND`, nothing stored; timeout / `500` / `401` / `403` → `503`, nothing stored; existing active Plan returns `200` with trail-service down (no call made); synthetic trail id (`200`) → `201` |
| List | Owner only; excludes deleted; order `tripDate, createdAt, id` ascending; past and future both present; paging defaults, `size` 50 max, invalid → `400` |
| Detail | Owner `200`; another user's → `404`; deleted → `404`; random UUID → `404`; non-UUID → `400` |
| Delete | Owner `204`, row kept with `deleted = true`; second delete `404`; another user's → `404` and their row unchanged |
| Security | No token → `401` on every endpoint and method; token without `sub` → `401`; response JSON never contains `ownerSubject` or `deleted` |
| Shape | `PlanResponse` fields exactly `id, trailId, tripDate, status, createdAt, updatedAt`; `status` = `READY` |

### 19.2 Frontend

There is no frontend test runner (CLAUDE.md). `npm run build` and `npm run lint` must pass. Behaviour is verified by Lean QA (§21): Finish, saving state, single request on double activation, success copy for `201` and `200`, failure and retry, past-date handling, Gear Readiness < 100 % not blocking, keyboard path, and that no other Studio behaviour changed.

---

## 20. Acceptance Criteria

| AC | Pri | Criterion |
|---|---|---|
| AC-01 | P0 | `POST /api/plans` with a valid token, an existing `trailId`, and today's or a future `tripDate` returns `201` with `{ id, trailId, tripDate, status: "READY", createdAt, updatedAt }`, and the row persists across a plan-service restart. |
| AC-02 | P0 | The stored owner is the token's `sub`. An `ownerSubject` (or `status`, `id`) property in the request body is ignored; no response from any Plan endpoint contains `ownerSubject` or `deleted`. |
| AC-03 | P0 | Every `/api/plans` endpoint and method without a valid token, or with a token lacking `sub`, returns `401 AUTHENTICATION_REQUIRED`; no Plan path is public. |
| AC-04 | P0 | A `trailId` that trail-service answers `404` for returns `400 TRAIL_NOT_FOUND`, and nothing is stored. |
| AC-05 | P0 | With trail-service unreachable or erroring, a new create returns `503 TRAIL_SERVICE_UNAVAILABLE` and nothing is stored. |
| AC-06 | P0 | A missing `tripDate`, or one before the server's today, returns `400 VALIDATION_ERROR` naming `tripDate` in `errors[]`; a malformed one returns `400 VALIDATION_ERROR` (no `errors[]`, §12.2); nothing is stored in any case. Today is accepted. |
| AC-07 | P0 | Repeating the same create (same user, trail, date) returns `200` with the same `id` and unchanged timestamps; the database holds exactly one non-deleted row for that identity. |
| AC-08 | P0 | Two concurrent identical creates produce one row; both responses are 2xx with the same `id`; neither is `409` or `500`. |
| AC-09 | P0 | The partial unique index `(owner_subject, trail_id, trip_date) WHERE deleted = false` exists and rejects a second active row inserted directly. |
| AC-10 | P0 | `GET /api/plans` returns only the caller's non-deleted Plans; User B's list never contains User A's Plan. |
| AC-11 | P0 | `GET /api/plans/{id}` and `DELETE /api/plans/{id}` for another user's Plan, a deleted Plan, or a random UUID return the same `404 PLAN_NOT_FOUND`; the other user's row is unchanged. |
| AC-12 | P0 | `DELETE` by the owner returns `204`, keeps the row with `deleted = true`, removes the Plan from list and detail; a second delete returns `404`. |
| AC-13 | P0 | After a Plan is deleted, the same user, trail, and date can be planned again: `201` with a new `id`. |
| AC-14 | P0 | The `plans` table has no trail, weather, or gear columns, and no Plan response contains trail fields, weather, owned / equipped / recommended / missing gear, or readiness. |
| AC-15 | P0 | **Live.** In the Gear Studio for a trail and today-or-later date, **Finish preparation** appears at the end of the gear zone once the gear rows are shown (`ready`), and is not shown while the pack is loading, when the pack or the gear list failed (`pack-failed`, `gear-failed`), or for a missing trail. |
| AC-16 | P0 | **Live.** With Gear Readiness below 100 % (at least one recommended item missing), Finish preparation is enabled and saves the Plan with no extra step. |
| AC-17 | P0 | **Live.** Finish creates the Plan for exactly the Studio route's trail id and `:tripDate`; `GET /api/plans` then lists it. |
| AC-18 | P0 | **Live.** Double-clicking Finish (or Enter + click) sends one `POST`; while saving the button reads **Saving plan…** and ignores activation. |
| AC-19 | P0 | **Live.** With plan-service stopped, Finish shows the `unavailable` message and **Try again**, never the confirmation; the equipped loadout and gear rows are unchanged; after restarting plan-service, Try again saves, and exactly one active Plan exists. |
| AC-20 | P0 | **Live.** The frozen journeys still work: Discover → sign in → Trail Detail → Trip Preparation → Gear Studio (equip, unequip, add gear, avatar) → Finish; Planner recommendations; My Gear; My Memories; Community Memories in Discover. No existing route, request, or storage key changed. |
| AC-21 | P1 | `GET /api/plans` is paginated (`page` default 0, `size` default 20, max 50, invalid → `400`) and ordered `tripDate ASC, createdAt ASC, id ASC`, with past and upcoming Plans both included. |
| AC-22 | P1 | **Live.** On `201` the confirmation reads "Preparation complete — Your plan for {trail} on {date} has been saved."; on `200` "… is already saved."; **Continue** goes to `/home` without clearing the planner session or the loadout. |
| AC-23 | P1 | **Live.** Each failure class shows its §14.5 message; `trail-gone` offers no retry; `invalid-date` links to Trip Preparation for the trail. |
| AC-24 | P1 | **Live.** Keyboard only: Tab to Finish, Enter saves, focus lands on the confirmation heading, Tab reaches Continue; saving is announced once, a failure is announced as an alert; focus stays on the button after a retryable failure and moves to the message after `invalid-date` or `trail-gone`; visible focus on every control. |
| AC-25 | P1 | **Live.** Reloading the Studio after a save shows the idle Finish row; pressing Finish again shows "already saved" and creates no row. |
| AC-26 | P1 | A `SYNTHETIC_DEMO` trail can be planned (`201`); its Trail Detail still shows no **Add a memory**, and Discover still shows it no Community Memories. |
| AC-27 | P1 | `plan_db` is created by `init-databases.sql` on a new volume; on an existing volume the one-time `CREATE DATABASE plan_db;` of §8.3 is documented and sufficient; no step deletes a volume or database. |
| AC-28 | P1 | An existing active Plan is returned (`200`) by a repeated create even while trail-service is down. |
| AC-29 | P1 | `npm run build`, `npm run lint`, and `mvn -pl plan-service test` pass; no new npm or Maven third-party dependency; no file under `features/plans` imports `three`, `@react-three/fiber`, or `maplibre-gl`; no `/plans` route or navigation entry exists. |
| AC-30 | P1 | FEATURE-011 writes nothing to `localStorage`, `sessionStorage`, cookies, the URL, or history state. |
| AC-31 | P2 | **Live.** At 1920×1080 and 1024×768 the Finish row and confirmation do not overlap the Stage and cause no horizontal scroll; below 768 px they stack full width and remain usable. |
| AC-32 | P2 | **Live.** If the trip date becomes past while the Studio is open (simulated clock or a date that passes midnight), Finish sends no request and shows the `invalid-date` message. |
| AC-33 | P2 | **Live.** With the session ended before or during a save (`no-session`), the FEATURE-002 session-ended flow takes over and no confirmation is shown. |

Counts: **33 criteria — P0 20, P1 10, P2 3.**

## 21. Lean QA Plan

About 5–10 minutes. API checks with `curl` and tokens from two test users (A and B); browser checks with Chrome DevTools MCP. Not a Full Regression.

| # | Step | Expected | ACs |
|---|---|---|---|
| 1 | Sign in as User A; from the Planner or Discover open a trail, choose a future date, Choose this trail | Trip Preparation loads | 20 |
| 2 | Confirm Gear Readiness < 100 % (or remove one owned item first) and open **Gear up** | Studio loads; Finish row at the end of the panel | 15, 16 |
| 3 | Activate Finish with a fast double click; watch the network panel | One `POST /api/plans` → `201`; Saving state; confirmation with trail and date; focus on heading | 17, 18, 22, 24 |
| 4 | Reload the Studio and press Finish again | Idle row after reload; `200`; "already saved" | 7, 25 |
| 5 | `GET /api/plans` as A | Exactly one Plan for that trail and date, fields as §12.1, no `ownerSubject` | 1, 2, 10, 14 |
| 6 | Stop plan-service, press Finish on another trail/date; restart; Try again | Failure message, gear rows intact; then `201`; one Plan | 19 |
| 7 | `POST` with a random `trailId`; with yesterday's date | `400 TRAIL_NOT_FOUND`; `400 VALIDATION_ERROR` (`tripDate`) | 4, 6 |
| 8 | As User B: `GET /api/plans`; `GET` and `DELETE /api/plans/{A's id}` | B's list lacks A's Plan; both `404 PLAN_NOT_FOUND` | 10, 11 |
| 9 | As A: `DELETE` the Plan; `GET` list and detail; `DELETE` again | `204`; gone from list; detail `404`; second delete `404` | 12 |
| 10 | As A: `POST` the same trail and date | `201`, new `id` | 13 |
| 11 | Continue → `/home`; quick pass over Planner, My Gear, My Memories, Discover popup | All behave as before | 20, 22 |

## 22. Implementation Write Scope

### 22.1 `backend-api`

- `Project/Backend/plan-service/**` (new module: code, `application.yaml`, migration, tests).
- `Project/Backend/pom.xml`: add the `plan-service` module line only.
- `Project/docker/postgres/init-databases.sql`: add `CREATE DATABASE plan_db;` only (narrow infrastructure grant for this feature).

Not authorised: any other service, `docker-compose.yml` services (the Spring services are not containerised), trail schema or seed changes, recommendation logic, user-service gear, memory-service, the API gateway, Keycloak configuration.

### 22.2 `frontend`

- `Project/Frontend/src/features/plans/**` (new).
- `Project/Frontend/src/features/loadout/components/GearStudioScreen.tsx` (mount the Finish row) and, if needed, `features/loadout/content.ts` and `studio.css` for the row's placement only.
- `Project/Frontend/vite.config.ts`: the one `/api/plans` proxy entry.

Not authorised: new routes, navigation, `features/avatar`, 3D files, `features/memories`, `features/community-memories`, `features/planning` stores, packing or Trip Preparation screens, the loadout storage format, new dependencies.

### 22.3 Lead (closeout only)

Documentation in §23.

## 23. Documentation Follow-ups (closeout; not done during specification)

| Document | Change |
|---|---|
| `docs/PRODUCT_REQUIREMENTS.md` | Decision record entry for the approved roadmap extension (011–014, 014 last, no 015) and FEATURE-011 completion; sections 1.1, 5 (journey gains Finish preparation → Plan), 23 (ready state now ends in a saved Plan), 34–35 (Plans as a domain; navigation in 013), 47 (roadmap rows), 48 (freeze text), 50 (non-goal "features beyond FEATURE-010" amended), 57. **See U1: the roadmap entry may need to land before implementation starts** |
| `docs/FRONTEND_CONTEXT.md` | Sections 2 (plan-service row), 3, 4 (Plan API table, auth note), 5 (classes, DTOs), 7 (dev proxy now six paths; authenticated callers), 8 (Studio's Finish row, `features/plans`), 9, 10 (folder and dependency rules), 12 (production routing of `/api/plans/**`) |
| `CLAUDE.md` | Agent/roadmap status line; Commands: plan-service on 8086 needs `plan_db`, with the existing-volume one-time step |
| `docs/DESIGN_SYSTEM.md` | Only if the frontend introduces a reusable completion pattern; otherwise unchanged |
| This spec | Implementation record and status |

---

## 24. Final Product Decisions

| Q | Question | Decision |
|---|---|---|
| Q1 | Service name | `plan-service` |
| Q2 | Port | 8086 |
| Q3 | Database | `plan_db` |
| Q4 | Table | `plans` |
| Q5 | When is a Plan created? | Only by **Finish preparation** in the Gear Studio (never by a recommendation, Trail Detail, Choose this trail, or entering preparation) |
| Q6 | Gear Readiness < 100 % saveable? | **Yes**; no extra warning or step (D18) |
| Q7 | tripDate mandatory? | **Yes**, on both sides (D17, D21) |
| Q8 | Past dates newly plannable? | **No** (`400`) |
| Q9 | Today allowed? | **Yes** |
| Q10 | Synthetic trails plannable? | **Yes** (D10); Memory rules unchanged |
| Q11 | Gear snapshot? | **No** |
| Q12 | Weather snapshot? | **No** |
| Q13 | Trail snapshot? | **No**; `trailId` only |
| Q14 | Duplicate identity | `owner_subject + trail_id + trip_date`, non-deleted |
| Q15 | Duplicate behaviour | Idempotent: `200` with the existing Plan; concurrent race resolved to one row (D8) |
| Q16 | Soft delete? | **Yes** |
| Q17 | Public Plan API? | **No** |
| Q18 | ownerSubject from the frontend? | **No**; ignored if sent |
| Q19 | Initial status | `READY`, the only status |
| Q20 | Does 011 create `/plans`? | **No** |
| Q21 | Calendar? | **No** |
| Q22 | Blender animation? | **No** |
| Q23 | Post-save destination | Inline confirmation; **Continue → `/home`** (temporary, D20) |
| Q24 | Touches Memory? | **No** |
| Q25 | New dependencies? | **None** (npm or Maven third-party) |

Out of scope (explicit): Blender; Three.js or animation changes; Ready-to-Go animation; `/plans`; calendar; Upcoming / Past page; Plan Detail page; Plan delete UI; navigation entry; Memory bridge; reminders, notifications, email, push; participants; notes; sharing or public Plans; social Plans; weather, gear, or trail snapshots; GPS, GPX, live tracking; Google Calendar; recurring Plans; AI-generated Plans; Plan recommendation logic; editing a Plan's trail or date.

## 25. Blockers / Approval Items

| Id | Item | Lead recommendation |
|---|---|---|
| **U1** | **Source-of-truth conflict.** The PRD (sections 47, 48, 50, 57) and `CLAUDE.md` currently say FEATURE-010 is the last feature, the freeze is active, and there is no FEATURE-011; PRD §48 requires a product decision that updates the PRD before new features. The user has approved the 011–014 extension in this request, but forbade editing the PRD during specification | Approve that the lead adds the PRD decision-record entry (roadmap 011–014, 014 last) and the matching `CLAUDE.md` roadmap line **at the start of the FEATURE-011 cycle, before implementation**, with the remaining PRD and FC updates at closeout (§23) |
| U2 | Narrow infrastructure grants: `backend-api` edits `Project/Backend/pom.xml` (module line) and `init-databases.sql` (one line); `frontend` edits `vite.config.ts` (one proxy entry) | Approve |
| U3 | Frontend API layer: build only `createPlan` now (D15), or also `getPlans` / `getPlan` / `deletePlan` without a consumer | `createPlan` only; 013 adds the rest against the frozen contract |
| U4 | `ui-ux` skipped: the Finish row, saving, success, and failure states reuse existing Studio patterns. The frontend review confirmed every state maps to an existing Studio pattern (§13.4) and that the row stays inside the gear zone, so no layout change needs `ui-ux` | Approve the skip |
| U5 | Past Plans on synthetic trails in FEATURE-014: Add Memory is not offered for synthetic trails today. FEATURE-014 must decide how such a Plan looks (recorded here, not decided) | Defer to FEATURE-014 |
| U6 | Production routing of `/api/plans/**` (gateway or same-origin), like Memories, is a deployment task, not part of FEATURE-011 | Approve deferral |

No other blocker. With U1–U6 approved, FEATURE-011 is ready for implementation.

## 26. Implementation Record (2026-10-19)

Cycle: Recover → Scope → roadmap truth (U1) → `backend-api` → backend tests → `frontend` → lead diff review → security read → Lean QA → product gate. `ui-ux`, `three-d`, Blender: SKIPPED. Checkpoint: `.claude/state/features/011-plan-foundation-finish-preparation.md`.

- **Backend:** `Project/Backend/plan-service/**` (new), the module line in `Project/Backend/pom.xml`, `CREATE DATABASE plan_db;` in `init-databases.sql`. `mvn -pl plan-service test`: 43 run, 0 failures. `plan_db` created on the existing development volume with the §8.3 one-time command.
- **Frontend:** `features/plans/**` (new; `createPlan` only), the Finish row mounted in `GearStudioScreen.tsx`, `.studio-finish` in `studio.css`, the `/api/plans` proxy in `vite.config.ts`. Build and lint exit 0.
- **Accepted deviations:** D-A1 `logServerErrorDetail: false` (keeps owner subjects out of logs, §18 rule 7); F1 Choose a new date after the alert (Tab order); F2 alert icon; F3 `no-session` returns the row to idle; F4 a timeout reading a 2xx body is `unconfirmed`; F5 the Finish button keeps the existing Studio primary size (40 px at ≥ 768 px with a fine pointer, 44 px otherwise), below §17.1's 44 px.
- **Lean QA PASS** (Playwright over CDP; Chrome DevTools MCP unavailable): double activation → 1 POST; reload + Finish → 200 "already saved", 1 row; 4 parallel POSTs → 1×201 + 3×200, 1 row; past / malformed date and unknown trail rejected; B cannot list, read, or delete A's Plan (404, A's row unchanged); soft delete and recreate; live plan-service outage → failure + Try again → 201, loadout unchanged; synthetic trail plannable with Memory rules unchanged; 1920 and 1024 sweeps clean. Deferred: AC-05 and AC-28 (trail-service outage), AC-03 token without `sub` (covered by backend tests), AC-23 `unconfirmed`/`unexpected`, AC-27 fresh volume, AC-31 below 768 px, AC-32, AC-33. Non-blocking observations: the polite announcer keeps "Saving your plan." after a failure (not re-announced); at 1440×900 the unavailable alert first renders about 4 px below the gear zone's visible edge (zone scrollable; alert announced).

### 26.1 Product gate (2026-10-19)

**Accepted: PASS / FROZEN.** No further repair cycle and no Full QA for FEATURE-011.

- **Final behaviour:** as §6–§17 with the accepted deviations above. `plan-service` on 8086, `plan_db.plans`; Plan fields `id`, `ownerSubject` (server-internal), `trailId`, `tripDate`, `status` (`READY` only), `createdAt`, `updatedAt`, `deleted` (server-internal); no trail, weather, or gear snapshot. Created only by Finish preparation from the Studio route's trail and `:tripDate`; today and future allowed, past rejected; Gear Readiness never blocks; synthetic trails plannable with Memory rules unchanged. The frontend consumes `createPlan` only; list, read, and delete are reserved for FEATURE-013.
- **Idempotency / concurrency:** one active Plan per owner + trail + date (partial unique index); repeat, retry, and reload return `200` with the existing Plan; four concurrent creates produced one row (1×201, 3×200). A deleted Plan stays stored and does not block recreation.
- **Isolation:** owner from the JWT `sub` only; another user's, a deleted, and a guessed id all give `404`; B could not list, read, or delete A's Plan.
- **Deferred / not run (not passed, not defects):** trail-service unavailable during create; `unconfirmed` / `unexpected` copy variants; fresh-volume initialisation; below 768 px; a trip date passing midnight with the page open; session expiry during a save; real screen reader; Safari; physical phone.
- **Accepted limitations (polish backlog, non-blocking):** (A) the Finish button keeps the Studio's primary size, 40 px with a desktop mouse and 44 px on touch or narrow layouts; (B) after a failed save the polite status may still hold "Saving your plan."; (C) at 1440×900 the first failure message can sit about 4 px below the gear zone's initially visible edge; (D) reopening the Studio shows the idle Finish row again, because FEATURE-011 does not read Plans; pressing it resolves to the existing Plan. FEATURE-013 may revisit (D).
- **QA data left in place:** accounts `otc-qa-f011-a-ffacf7` and `otc-qa-f011-b-778b0c` (@example.test), seven `plans` rows (one soft-deleted), one gear item. Not cleaned up by decision.
- **Next:** FEATURE-012 Ready-to-Go 3D Completion. Not started.

