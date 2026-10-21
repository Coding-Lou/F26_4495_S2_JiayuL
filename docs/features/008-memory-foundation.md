# FEATURE-008 — Memory Foundation

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-16).** Product gate accepted by the user 2026-10-16. Implementation owner `backend-api` (feature-local authorization U4). Focused tests 95 PASS / 0 FAILED / 0 SKIPPED; live API smoke PASS; repair cycles 0. U1–U4 implemented. `frontend`, `ui-ux`, `three-d`: SKIPPED; Blender: NOT REQUIRED; browser QA: not run (not required). FEATURE-009 and FEATURE-010: NOT STARTED. Implementation record: section 27. History: approved for implementation 2026-10-16 (U2 corrected to decode and re-encode sanitization) |
| Date | 2026-10-16 |
| Route | None. Backend only: a new `memory-service` (port 8085) owning `/api/memories/**` |
| Depends on | FEATURE-002 (Keycloak identity), FEATURE-006 (public `GET /api/trails/{uuid}`), existing PostgreSQL in `Project/docker-compose.yml` |
| Followed by | FEATURE-009 (My Memories, owner UI), FEATURE-010 (Community Memories in Discover) |
| Feature cycle | `ui-ux: SKIP`, `frontend: SKIP`, `three-d: SKIP`, `Blender: NOT REQUIRED`, browser QA: NOT REQUIRED. Recover → Scope → `backend-api` → focused backend tests → live API smoke → lead diff review → product gate → closeout (section 23) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (sections 4.8, 32.4, 33, 45.3) → `docs/FRONTEND_CONTEXT.md` (sections 2–7, 12) → FEATURE-006 (public trail reads) → FEATURE-007 (soft-delete precedent) |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–6, 22, 24–26 |
| `backend-api` | 5–21, 23 |
| Lead (verification) | 20, 21 |
| FEATURE-009 / FEATURE-010 authors | 13, 14, 16, 24, 25 |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; "FC §x" is `docs/FRONTEND_CONTEXT.md`; "006 §x", "007 §x" are those feature specifications; a bare "§x" is this document. Decisions are `D…`, acceptance criteria `AC-…`.

---

## 1. Feature Summary

FEATURE-008 builds the backend foundation for **Remember**: a dedicated `memory-service` that stores, secures, retrieves, and shares **Trail Memories**.

A Memory is one user's account of one real trip on one trail: a date, a title, an optional plain-text story, a visibility (`PRIVATE` or `PUBLIC`), and up to five photos. The service provides:

- **owner APIs** (authenticated) to create, list, read, edit, and soft-delete one's own Memories, and to add, remove, and reorder their photos;
- **public APIs** (no token) to list a trail's `PUBLIC` Memories and read one `PUBLIC` Memory;
- **private photo storage**: photo bytes in object storage (S3 in production, the local filesystem in development) behind a small interface, served only through short-lived signed URLs.

FEATURE-008 ships no user interface. FEATURE-009 and FEATURE-010 build the experiences on top of these contracts.

## 2. Goals

The question FEATURE-008 answers: *"How does the system reliably store, secure, retrieve, and share Trail Memories?"*

1. A signed-in user can keep a Memory of a real trip without any saved-trip record (PRD §33.1).
2. A Memory is private unless its author explicitly shares it, and a private Memory or its photos can never be reached by anyone else (PRD §33.2).
3. Shared Memories can be read publicly per trail, revealing nothing about the author (PRD §4.8, §32.4).
4. FEATURE-009 and FEATURE-010 need no backend work of their own: every contract they need is defined and tested here.

## 3. Roadmap Split: 008 / 009 / 010

The PRD's single "FEATURE-008 Memories & Sharing" (PRD §33.2, §45.3, §47) is split into three features (user decision, 2026-10-16):

| Feature | Owns | Does not own |
|---|---|---|
| **FEATURE-008 Memory Foundation** | `memory-service`, database, photo storage, owner and public APIs, security, privacy rules, tests | Any page, component, route, proxy entry, or copy |
| **FEATURE-009 My Memories** | `/memories` page, Create / Edit / Delete Memory UI, Public/Private control, photo picking, client-side photo normalization (§24.3), the Vite proxy entry for `/api/memories` | Backend contracts (consumes §13) |
| **FEATURE-010 Community Memories** | The Discover trail popup's community preview, a "view all" experience, signed-out reading | Backend contracts (consumes §14); FEATURE-006 redesign |

Product chain: Discover → Plan → Prepare → Go in real life → Remember (009) → optionally Share back to Discover (010). FEATURE-008 is the shared foundation beneath both, and nothing of 009's or 010's presentation is decided here.

The PRD was amended on 2026-10-16 (decision record row "Remember split into three features"; PRD §33, §47, §48): the roadmap now ends at FEATURE-010, followed by the feature freeze (follow-up F1, done).

## 4. Scope and Non-goals

### 4.1 In scope

- A new Maven module `Project/Backend/memory-service` and a new database `memory_db`.
- Tables `memories` and `memory_photos` (Flyway V1).
- Owner CRUD for Memories; photo upload, remove, and reorder; owner list and detail.
- Public trail list and public detail, returning `PUBLIC`, non-deleted Memories only.
- `MemoryPhotoStorage` with an S3 implementation and a local-filesystem implementation.
- Trail validation through trail-service's public detail read.
- Server-side photo checks: type by content, size, dimensions, count, and metadata sanitization by re-encoding.
- Focused automated tests and a live API smoke check.

### 4.2 Non-goals

My Memories UI; Community Memories UI; any Discover or trail-popup change; any frontend file (including `vite.config.ts`); likes, comments, follows, follower counts, reposts, DMs, notifications, feeds, popularity ranking; reporting, moderation queues, approval workflows, admin portals; GPX upload, parsing, or playback; AI recap, story, summary, or title generation; video upload or generation; trip persistence or any link to a planned trip; trail data duplication; author profiles or public display names; account-deletion cascades; restore or trash; realtime presence; 3D; Blender; changes to trail-service, user-service, recommendation-service, activity-service, or api-gateway.

## 5. Current Architecture Inspection

Inspected 2026-10-16, working tree on `Dev_Frontend`.

| Topic | Finding | Source | Consequence |
|---|---|---|---|
| A. Services | Maven multi-module parent `Project/Backend/pom.xml` with modules `api-gateway` (8080), `user-service` (8081), `trail-service` (8082), `activity-service` (8084), `recommendation-service` (8083). Spring Boot 4.1.1, Java 21. Each persistent service has its own database | `pom.xml`, each `application.yaml` | A new module follows the same shape; next free port is **8085** |
| B. Identity | Every service is a stateless OAuth2 resource server validating Keycloak JWTs from `http://localhost:8180/realms/outdoor-trip` | each `SecurityConfig` | memory-service copies this |
| C. Subject mapping | `user-service` looks users up by `jwt.getSubject()` in `users.identity_subject` (unique), creating the row lazily; `users.id` is a user-service-internal UUID. Gear rows reference `users.id` | `UserService`, `V2__use_keycloak_identity.sql` | The Keycloak `sub` is the identity every service shares; `users.id` is not reachable from another database (§8.4) |
| D. user-service patterns | Controller takes `@AuthenticationPrincipal Jwt`; service resolves owner, then `findByIdAndUserIdAndDeletedFalse` → `ResourceNotFoundException` (404) for missing **or** foreign rows; records with Bean Validation (`@NotBlank`, `@Size`); `OffsetDateTime` + `TIMESTAMP WITH TIME ZONE`; `ddl-auto: validate`; `open-in-view: false` | `GearService`, `Gear`, `CreateGearItemRequest` | memory-service mirrors these exactly |
| E. Trail reads | `GET /api/trails/{uuid}` is public (FEATURE-006); returns `200 TrailDetailResponse` or `404` with an empty body; the query has `AND t.deleted = false`, so a soft-deleted trail is `404`. An invalid bearer token is refused even on public paths | trail-service `SecurityConfig`, `TrailController`, `TrailRepository.findTrailDetailById` | Trail validation is one tokenless HTTP GET (§15) |
| F. Soft delete | `deleted BOOLEAN NOT NULL DEFAULT FALSE` on `gear_items` and `trails`; normal queries filter `deleted = false`; DELETE returns `204` | user-service V3, trail-service V1 | Memories follow it |
| G. Flyway | `src/main/resources/db/migration/V<n>__<snake_case>.sql`, Flyway enabled, Hibernate validates | both persistent services | memory-service starts at `V1__create_memory_tables.sql` |
| H. Errors | user-service: RFC 9457 `ProblemDetail` with `title`, `detail`, `instance`, a `code` property (enum `ErrorCode`), and `errors[]` of `{field, message}` for validation; custom `RestAuthenticationEntryPoint` (401) and `RestAccessDeniedHandler` (403). trail-service and recommendation-service use Spring defaults and are inconsistent (FC §12) | user-service `exception/`, `security/` | memory-service uses the **user-service** style (§17) |
| I. Object storage | **None.** No AWS SDK, S3, MinIO, LocalStack, multipart, or upload code in any module, compose file, or env file. `Project/.env` holds only Postgres and Keycloak keys | repository-wide search | Storage is new (§11, §12) |
| J. Local infrastructure | `docker compose up -d` starts PostGIS 17 and Keycloak 26.7.4 only. `init-databases.sql` creates `user_db` and `trail_db` and runs only when the Postgres volume is first created | `docker-compose.yml`, `docker/postgres/init-databases.sql` | `memory_db` needs one line there plus a one-time manual `CREATE DATABASE` on existing volumes (§23.3) |
| K. Uploads | None anywhere | — | — |
| L. activity-service | Application class and `application.yaml` (port 8084) only; dependencies are webmvc, validation, websocket. No controllers, persistence, or security. Daily Trail Activity is served by trail-service | activity-service | Still unused; left unchanged (D3) |
| Gateway | `api-gateway` is a Spring Cloud Gateway (WebFlux) shell with no routes. There is no AWS API Gateway in the repository | api-gateway `pom.xml`, `application.yaml` | Deployment routing is a later concern (§23.5) |
| Dev proxy | Vite proxies `/api/planner`, `/api/trails` (all of it, to trail-service), `/api/recommendations/pack`, `/api/users/me/gear`. Nothing else | `Project/Frontend/vite.config.ts` | A path under `/api/trails/**` would be proxied to trail-service; memory paths therefore live under `/api/memories/**` (D18) |
| CORS | Only trail-service defines CORS (`http://localhost:5173`); user- and recommendation-service define none and are reached through the proxy | each `SecurityConfig` | memory-service defines none (§16.5) |
| HTTP client pattern | recommendation-service builds a `RestClient` from its own `RestClient.Builder` bean with `services.trail.base-url`; tested with `MockRestServiceServer` | `RestClientConfig`, `TrailServiceClient`, `TrailServiceClientTest` | memory-service's trail client copies this |
| Test pattern | `@SpringBootTest` + `MockMvc` + Testcontainers `postgres:17-alpine` with `@ServiceConnection`, `@MockitoBean JwtDecoder`, `jwt()` post-processor with chosen `subject` | `GearIntegrationTest` | memory-service tests copy this (§20) |

## 6. Service Ownership

**D1. A dedicated `memory-service`** (Q1).

| Candidate | Verdict |
|---|---|
| user-service | No. It owns the profile and owned gear. Memories add a public read surface, trail validation, and object storage; putting them here would make the identity service public-facing and storage-aware |
| trail-service | No. It owns trail facts and the public trail catalogue. Memories are user-authored content with private state; a `/api/trails/{id}/memories` controller would mix authorization models and is not justified by the URL alone |
| activity-service | No (D3). Daily Trail Activity is an aggregate planning count (PRD §32); Memories are personal content. The module is empty, but emptiness is not a reason to merge unrelated bounded contexts |
| recommendation-service | No. It has no database and is an orchestrator |
| **New memory-service** | **Yes.** Own domain, own persistence, own authorization rules (owner vs public), own storage, room for later GPX or AI extensions without touching other services |

Placement:

| Property | Value |
|---|---|
| Module | `Project/Backend/memory-service`, package `com.jay.outdoor.memory`, added to the parent `<modules>` |
| Port | **8085** (D2) |
| Database | `memory_db` on the shared local PostgreSQL instance, owned exclusively by memory-service |
| Owns paths | `/api/memories/**` and nothing else |
| Calls | trail-service `GET /api/trails/{id}` (no token); object storage |
| Called by | The browser (through the FEATURE-009/010 proxy entry); no backend service |

## 7. Domain Model

```text
User (Keycloak subject) 1 ──< Memory >── 1 Trail (trail-service id)
                                 │
                                 1
                                 │
                                 ^
                           MemoryPhoto (0..5)
```

Every Memory belongs to exactly one owner and exactly one trail. A Memory without a trail cannot be created.

### 7.1 Memory

| Field | Java type | Rules |
|---|---|---|
| `id` | `UUID` | Server-generated in `@PrePersist` (user-service style) |
| `ownerSubject` | `String` | Keycloak `sub` of the creator (D5). Server-set; never accepted from a client; never returned |
| `trailId` | `UUID` | Required; validated at creation (§15); **immutable** (D9) |
| `tripDate` | `LocalDate` | Required; when the user was on the trail. Future trip Memories are **not supported**; the server accepts at most server-local today + 1 day solely as a time-zone boundary allowance (D10) |
| `title` | `String` | Required; trimmed; 1–120 characters after trimming; whitespace-only rejected (D11) |
| `story` | `String` (nullable) | Optional plain text, ≤ 5000 characters; empty or whitespace-only stored as `null` (D12) |
| `visibility` | `MemoryVisibility` | `PRIVATE` or `PUBLIC`; default `PRIVATE` (D6) |
| `createdAt` | `OffsetDateTime` | Server-set on insert |
| `updatedAt` | `OffsetDateTime` | Server-set on insert and on every change to the Memory or its photos |
| `deleted` | `boolean` | Soft-delete flag (D13); never returned |

`MemoryVisibility` has exactly two values, `PRIVATE` and `PUBLIC` (no `FRIENDS`, `FOLLOWERS`, `UNLISTED`, `GROUP`, `SHARED_WITH_LINK`).

Story is stored and returned verbatim apart from the blank-to-null rule: no HTML, Markdown, or rich text is interpreted. Consumers render it as text.

Length is measured as Java `String.length()` (UTF-16 units). PostgreSQL `VARCHAR(n)` counts code points, which are never more than UTF-16 units, so a value that passes validation always fits the column.

### 7.2 MemoryPhoto

| Field | Java type | Rules |
|---|---|---|
| `id` | `UUID` | Server-generated before the object is written (it is part of the key) |
| `memoryId` | `UUID` | The owning Memory (real foreign key) |
| `objectKey` | `String` | `memories/{memoryId}/{photoId}.{jpg|png}` (§11.4); never returned to any client |
| `mediaType` | `String` | Type of the **stored, sanitized** image: `image/jpeg` or `image/png` (§10.2); used as the stored object's `Content-Type` |
| `position` | `int` | ≥ 0; unique per Memory; lower is earlier |
| `createdAt` | `OffsetDateTime` | Server-set |

No width, height, byte size, EXIF, original filename, or checksum is stored. The server reads dimensions only to guard decoding (§10.2) and does not persist them; nothing in FEATURE-009 or FEATURE-010 needs them.

**Cover rule (D8):** the cover is the photo with the lowest `position`. There is no `coverPhotoId`. Reordering (§13.9) is how a cover is chosen; removing the cover makes the next photo the cover; a Memory with no photos has no cover.

## 8. Database Model

### 8.1 Database

`memory_db`, created by one line added to `Project/docker/postgres/init-databases.sql`. No PostGIS. Flyway history in `flyway_schema_history` (Flyway default). No table of another service is read or shared.

### 8.2 Migration `V1__create_memory_tables.sql`

The single expected migration. `backend-api` writes it during implementation, not in this task.

```sql
CREATE TABLE memories (
    id             UUID PRIMARY KEY,
    owner_subject  VARCHAR(255) NOT NULL,
    trail_id       UUID NOT NULL,
    trip_date      DATE NOT NULL,
    title          VARCHAR(120) NOT NULL,
    story          VARCHAR(5000),
    visibility     VARCHAR(10) NOT NULL DEFAULT 'PRIVATE',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted        BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_memory_visibility
        CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT chk_memory_title_not_blank
        CHECK (char_length(btrim(title)) > 0)
);

-- Owner list: WHERE owner_subject = ? AND deleted = false
--             ORDER BY trip_date DESC, created_at DESC, id DESC
CREATE INDEX idx_memories_owner_active
    ON memories (owner_subject, trip_date DESC, created_at DESC, id DESC)
    WHERE deleted = FALSE;

-- Public trail list: WHERE trail_id = ? AND visibility = 'PUBLIC' AND deleted = false
CREATE INDEX idx_memories_trail_public
    ON memories (trail_id, trip_date DESC, created_at DESC, id DESC)
    WHERE deleted = FALSE AND visibility = 'PUBLIC';

CREATE TABLE memory_photos (
    id          UUID PRIMARY KEY,
    memory_id   UUID NOT NULL,
    object_key  VARCHAR(255) NOT NULL,
    media_type  VARCHAR(20) NOT NULL,
    position    INTEGER NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_memory_photos_memory
        FOREIGN KEY (memory_id) REFERENCES memories (id),
    CONSTRAINT uk_memory_photos_object_key UNIQUE (object_key),
    CONSTRAINT uk_memory_photos_position
        UNIQUE (memory_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_memory_photos_position CHECK (position >= 0),
    CONSTRAINT chk_memory_photos_media_type
        CHECK (media_type IN ('image/jpeg', 'image/png'))
);
```

Notes:

- `visibility` is a `VARCHAR` with a `CHECK`, mapped with `@Enumerated(EnumType.STRING)`, matching trail-service's `difficulty` and user-service's `category`. No PostgreSQL enum type.
- The foreign key has no `ON DELETE CASCADE`: Memory rows are never physically deleted in normal operation (§18.3).
- The position constraint is deferrable so that a reorder can rewrite every position in one transaction (§13.9).
- `memory_photos` has no `deleted` column: a removed photo's row is deleted (D15). Photos of a soft-deleted Memory stay as they are and become unreachable through the Memory.
- The five-photo limit is enforced in the service under a row lock (§18.2), not by a constraint.

### 8.3 Cross-service boundaries (no foreign keys)

| Reference | Stored as | Foreign key? | Integrity |
|---|---|---|---|
| Memory → Trail | `trail_id UUID` (trail-service's `trails.id`) | **No.** Different database and service | Validated by HTTP at creation (§15); later trail deletion handled by §15.3 |
| Memory → User | `owner_subject VARCHAR(255)` (Keycloak `sub`) | **No.** Different database, and Keycloak is the system of record | Taken only from a validated JWT |
| MemoryPhoto → Memory | `memory_id UUID` | **Yes**, same database | Real FK |

No trail fields (name, difficulty, distance, coordinates) are copied into `memory_db` (D19).

### 8.4 Owner identifier (Q2)

**D5. The owner is the Keycloak subject (`sub`), stored as `owner_subject`.**

- user-service's `users.id` is user-service-internal: created lazily by `getOrCreateUser`, living in `user_db`, and resolvable only by calling user-service. Using it would make every Memory request depend on user-service and could create profile rows as a side effect.
- `sub` is the identity user-service itself is keyed on (`users.identity_subject`, unique), the identifier the frontend already uses for per-user ownership checks (FC §7, `getAuthenticatedSubject()`), and is present in every validated access token.
- `sub` is an identifier, not a credential. It is still treated as personal data: never returned by any endpoint, never logged.
- A token without a non-blank `sub` is refused with `401` (§16.1). (Keycloak only adds `sub` to access tokens when the client has the `basic` scope; the existing gear endpoints already depend on it, so the current realm provides it.)

## 9. Ownership and Visibility

### 9.1 Ownership

- The owner is set once, at creation, from `jwt.getSubject()`. No request body field, query parameter, or header can set or change it; unknown JSON properties such as `userId`, `ownerSubject`, `deleted`, `createdAt`, or `id` are ignored (Spring Boot's default `FAIL_ON_UNKNOWN_PROPERTIES = false`), and a test proves they have no effect.
- Every owner query includes `owner_subject = :sub AND deleted = false`, in the style of `findByIdAndUserIdAndDeletedFalse`. There is no "find by id, then compare owner" path that could leak through a different error.
- A Memory that does not exist, is deleted, or belongs to someone else gives the **same** `404 MEMORY_NOT_FOUND` with the same body (D14). Existence of another user's Memory is never revealed.
- Photo operations always go through the Memory: the service loads the Memory by `(memoryId, ownerSubject, deleted = false)` first, then the photo by `(photoId, memoryId)`. There is no endpoint that acts on a photo id or object key alone (§16.3).

### 9.2 Visibility (Q3)

| Visibility | Owner APIs | Public APIs |
|---|---|---|
| `PRIVATE` | Owner reads and edits | Never returned; detail is `404` |
| `PUBLIC` | Owner reads and edits | Returned while not deleted and the trail exists |

**D6. Default `PRIVATE`.** Absent an explicit `visibility` on create, the Memory is `PRIVATE`. Publishing a personal outdoor experience must be a deliberate act; FEATURE-009 may offer `PUBLIC` at creation, but silence never publishes.

**D7. Visibility changes take effect on the next request.** `PRIVATE → PUBLIC` makes the Memory eligible for public responses immediately; `PUBLIC → PRIVATE` removes it immediately. There is no scheduling, publishing workflow, or review. Signed photo URLs already handed out before a change keep working until they expire (≤ 15 minutes, §11.5); this is accepted and documented (§16.4).

There is no moderation, reporting, or approval in FEATURE-008 (future consideration, §26.3).

## 10. Photo Model

| Rule | Decision |
|---|---|
| Count | 0–5 photos per Memory (D16). A Memory with zero photos is valid (Q4) |
| Cover | Lowest `position` (D8) |
| Order | Stable integer `position`; new photos go to `max(position) + 1` (or `0`); gaps after a removal are allowed and harmless |
| Reorder | `PUT /api/memories/{id}/photos/order` rewrites positions to `0..n-1` (§13.9) |
| Accepted input types | `image/jpeg`, `image/png`, `image/webp`, detected from the file's bytes by the image decoder (D17) |
| Stored types | `image/jpeg` or `image/png` only, produced by re-encoding (§10.2) |
| Rejected | GIF, animated (multi-frame) WebP, SVG, HEIC/HEIF, AVIF, TIFF, BMP, RAW, video, CMYK or otherwise undecodable images, anything else. An animated PNG is stored as its default still frame |
| Size | ≤ 10 MB (10 × 1024 × 1024 bytes) per file, after which the request is refused with `413` |
| Dimensions | ≤ 40 megapixels and ≤ 12,000 px on either side, read from the header before decoding; otherwise `413 IMAGE_TOO_LARGE` (decompression-bomb guard) |
| One file per request | Yes; FEATURE-009 uploads several files as several requests |
| Processing | Decode and re-encode once, for sanitization only (§10.2). No resize, crop, rotation, thumbnail, or extra compression |
| Binary in PostgreSQL | Never; only the object key and media type |
| External URLs | Never accepted. There is no endpoint that takes a URL, and the server never downloads anything (no SSRF surface) |

### 10.1 Type detection

The declared multipart `Content-Type` and the client filename are ignored. The service opens the bytes with `javax.imageio` and asks which registered reader recognises them (`ImageIO.getImageReaders`). Only a reader whose format is JPEG, PNG, or WebP is accepted; WebP is recognised by the TwelveMonkeys WebP plugin (D21), JPEG and PNG by the JDK. A GIF (recognised by the JDK's GIF reader) and anything with no reader (SVG, HEIC, AVIF, text) is `415 UNSUPPORTED_MEDIA_TYPE`. A WebP whose reader reports more than one frame is `415`. No hand-written signature or chunk parsing is used.

### 10.2 Sanitization by re-encoding (privacy enforcement)

Phone photos commonly carry GPS coordinates in EXIF. A `PUBLIC` Memory must not reveal an author's location history beyond what they chose to share (PRD §33.2). **The server is the privacy boundary**: it never trusts a client to have removed metadata. Client-side preparation in FEATURE-009 (§24.3) is for display correctness and upload size only.

Strategy (user decision U2, 2026-10-16): **decode to pixels, then write a new file from the pixels alone.** A freshly encoded image carries no EXIF, XMP, IPTC, text chunks, or other metadata, so nothing has to be found and removed, and no binary metadata format is parsed by project code.

1. Read the width and height from the header with the selected `ImageReader` (no pixel decoding). Over the §10 dimension limits → `413 IMAGE_TOO_LARGE`.
2. Decode the first (default) image to a `BufferedImage`, ignoring metadata (`ImageReader.read(0, param)` with metadata reading off). A decoding failure → `415`.
3. Encode a new file:

| Input | Output | Encoder settings |
|---|---|---|
| JPEG | JPEG | JDK JPEG writer, quality 0.90, no metadata written |
| PNG | PNG | JDK PNG writer, no metadata written |
| WebP without alpha | JPEG | as JPEG above |
| WebP with alpha | PNG | as PNG above |

4. The re-encoded bytes are what is stored; the original upload is discarded and never written to storage. `mediaType` and the key extension describe the output.

Operational rules: `ImageIO.setUseCache(false)` (no temporary files); readers and writers are disposed in `finally`; an image's pixel buffer is the only large allocation (≤ 40 MP ≈ 160 MB worst case), which is acceptable at capstone scale.

Consequences, accepted for the MVP:

- The EXIF orientation tag is gone, so a photo that relied on it would display sideways. FEATURE-009 therefore applies orientation before upload (§24.3); the server never rotates.
- Embedded ICC colour profiles are not carried over, so wide-gamut (Display P3) photos may look slightly less saturated.
- JPEG inputs lose a little quality from one re-encode at 0.90.
- WebP is accepted as input but stored as JPEG or PNG, because no small maintained pure-Java WebP encoder exists. A stored PNG may be larger than its input; the 10 MB limit applies to the upload.
- CMYK and other JPEGs the JDK cannot decode are refused with `415`. Adding the TwelveMonkeys JPEG plugin later would accept them; it is not needed now.

## 11. Object Storage

### 11.1 Decision (Q11)

**D20. Private object storage behind `MemoryPhotoStorage`; S3 in production; uploads pass through memory-service; reads use short-lived signed URLs.**

### 11.2 Upload architecture: backend-mediated, not presigned PUT

The task's stated preference was presigned direct-to-S3 upload. After inspection, **backend-mediated upload** (`multipart/form-data` to memory-service, which writes the object) is materially simpler and safer here:

| Concern | Presigned PUT | Backend-mediated (chosen) |
|---|---|---|
| Validate the real bytes (type, animation, size) | Not possible before storage; would need a later `GetObject` to inspect | Done before anything is stored (§10.1) |
| Remove GPS metadata | Needs a download-and-rewrite step after upload | Done in the same request by re-encoding (§10.2) |
| Flow | Intent → upload → confirm (three calls, a pending state, a confirm that must `HEAD` the object) | One call |
| Orphans from abandoned uploads | Expected; needs bucket lifecycle rules and an `uploads/` prefix | Only from a failed compensation, which is rare and logged (§18.4) |
| Browser → storage CORS | Required on the bucket (and on the local substitute) | None: the browser only talks to memory-service through the same proxy as every other API |
| Local development | Needs an S3-compatible server or an emulated signed-PUT endpoint | Files written to disk |
| Cost at capstone scale | — | At most 5 × 10 MB per Memory through one Spring MVC service: negligible |

Presigned upload remains possible later behind the same interface (add `authorizeUpload` / `confirmUpload` methods) if traffic ever justifies it. That is not planned.

### 11.3 `MemoryPhotoStorage`

```java
public interface MemoryPhotoStorage {
    void put(String objectKey, byte[] content, String mediaType);   // throws StorageUnavailableException
    void delete(String objectKey);                                  // idempotent; throws StorageUnavailableException
    SignedPhotoUrl presentationUrl(String objectKey, String mediaType, Duration ttl);
}

public record SignedPhotoUrl(String url, Instant expiresAt) {}
```

Exactly two implementations, selected by `memory.storage.type`:

| Implementation | Used for | Behaviour |
|---|---|---|
| `S3MemoryPhotoStorage` | Production, and any developer who configures a bucket | `S3Client.putObject` with `Content-Type`; `deleteObject`; `S3Presigner.presignGetObject` with the TTL |
| `LocalMemoryPhotoStorage` | Default for local development and for nothing else | Files under a root directory; HMAC-signed URLs served by memory-service (§12) |

Tests use a third, test-only in-memory fake (§20.2). The interface is not a general media platform: three methods, photo-only.

### 11.4 Object key scheme

```text
memories/{memoryId}/{photoId}.{jpg|png}
```

- Both ids are server-generated random UUIDs; the extension comes from the stored (re-encoded) type.
- No user filename, owner subject, title, or date appears in the key. Keys never collide and are not guessable.
- Keys are never returned to clients (owner or public) and never accepted from them.
- The local adapter resolves `root.resolve(key).normalize()` and refuses any path outside the root, as defence in depth (keys are server-built, so this never triggers in practice).

### 11.5 Read access: private objects, signed URLs (Q13)

- The bucket is **private**: S3 Block Public Access on, no public bucket policy, no public ACLs, default SSE-S3 encryption.
- Every response that includes a photo carries `url` and `urlExpiresAt`. `url` is a signed URL created for that response, valid for **15 minutes** (`memory.photos.url-ttl`, D22).
- The database stores only the stable object key, never a URL.
- Owner endpoints sign URLs only for the owner's own non-deleted Memories; public endpoints sign only for `PUBLIC`, non-deleted Memories on existing trails. Signing is how visibility reaches the photo: no response, no URL.
- Signing an S3 GET URL is a local computation (no network call), so a page of 20 covers costs 20 HMAC operations.
- Loading a signed URL in `<img src>` needs no CORS. The bucket needs no CORS configuration (§16.5).

### 11.6 S3 production configuration

| Item | Value |
|---|---|
| SDK | AWS SDK for Java v2, module `software.amazon.awssdk:s3` only, version from `software.amazon.awssdk:bom` (current 2.x at implementation time, recorded at closeout). No Spring Cloud AWS (D21). Approved by the user (U3) |
| Credentials | SDK default credential provider chain (environment, profile, or instance/task role). No key in any file |
| Region, bucket | `MEMORY_S3_REGION`, `MEMORY_S3_BUCKET` |
| IAM | `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/memories/*` only |
| Bucket | Private, Block Public Access on, SSE-S3, versioning optional, no CORS, no lifecycle rule required |
| Startup | With `type: s3`, a blank bucket or region fails startup with a clear message |

No bucket is created by this specification or by the implementation; creating one is a deployment step (§23.5).

## 12. Local Development Storage (Q12)

**D23. A local-filesystem adapter inside memory-service. No new container.**

| Option | Verdict |
|---|---|
| A. LocalStack | Rejected: a heavy extra container for one bucket; its free-tier terms have been changing |
| B. MinIO | Rejected: an extra container plus bucket bootstrap; the community distribution's packaging has been changing, a maintenance risk for a capstone |
| C. Real development S3 bucket | Supported (set `type: s3`), but not the default: every developer would need AWS credentials just to run tests or the app |
| **D. Local filesystem adapter** | **Chosen.** Zero infrastructure, works offline, and keeps the client contract identical because reads still use signed, expiring URLs |

Local adapter behaviour:

- **Root:** `memory.storage.local.root`, default `./.local-storage` relative to the module, git-ignored by `memory-service/.gitignore`.
- **Write:** to a temporary file in the same directory, then an atomic move to the key's path.
- **Signed URL:** root-relative `/api/memories/local-photos/{memoryId}/{photoId}.{ext}?expires={epochSeconds}&signature={base64url}`, where the signature is HMAC-SHA256 over `"{objectKey}\n{expires}"` with `memory.storage.local.signing-secret`. If the secret is blank, a random 32-byte secret is generated at startup (URLs then stop working after a restart, which is acceptable in development).
- **Content endpoint:** `GET /api/memories/local-photos/{memoryId}/{photoId}.{ext}`, registered **only** when `type: local` (`@ConditionalOnProperty`). It needs no token (an `<img>` cannot send one); access is the signature. It checks the expiry, compares signatures in constant time, and returns the file with `Content-Type` from the extension, `Cache-Control: private, max-age=<seconds until expiry>`, and `X-Content-Type-Options: nosniff`. A missing, expired, or invalid signature, or a missing file, returns `404` (no distinction; nothing to probe).
- The root-relative URL works through the Vite proxy that FEATURE-009 adds for `/api/memories`. If a different origin is ever needed, `memory.storage.local.public-base-url` (default empty) prefixes it.
- Local mode is for development only and is documented as such; production configuration sets `type: s3`.

## 13. Owner API

All owner endpoints require `Authorization: Bearer <access token>`, derive the owner from `sub`, and never accept a user id. Request and response bodies are JSON unless stated. Dates are ISO `YYYY-MM-DD`; timestamps are ISO-8601 with offset (as `GearItemResponse.createdAt`).

| # | Method | Path | Body | Success |
|---|---|---|---|---|
| 13.3 | `GET` | `/api/memories?page=&size=` | — | `200 MemoryPage<OwnerMemorySummary>` |
| 13.4 | `POST` | `/api/memories` | `CreateMemoryRequest` | `201 OwnerMemoryDetail` |
| 13.5 | `GET` | `/api/memories/{memoryId}` | — | `200 OwnerMemoryDetail` |
| 13.6 | `PUT` | `/api/memories/{memoryId}` | `UpdateMemoryRequest` | `200 OwnerMemoryDetail` |
| 13.7 | `DELETE` | `/api/memories/{memoryId}` | — | `204` |
| 13.8 | `POST` | `/api/memories/{memoryId}/photos` | `multipart/form-data`, part `file` | `201 MemoryPhotoResponse` |
| 13.9 | `PUT` | `/api/memories/{memoryId}/photos/order` | `ReorderPhotosRequest` | `200 List<MemoryPhotoResponse>` |
| 13.10 | `DELETE` | `/api/memories/{memoryId}/photos/{photoId}` | — | `204` |

### 13.1 Response types

```text
MemoryPhotoResponse {
  id:            UUID
  position:      integer
  url:           string     // signed, absolute (S3) or root-relative (local)
  urlExpiresAt:  timestamp
}

OwnerMemorySummary {
  id, trailId: UUID
  tripDate:    date
  title:       string
  visibility:  "PRIVATE" | "PUBLIC"
  photoCount:  integer      // 0..5
  coverPhoto:  MemoryPhotoResponse | null
  createdAt, updatedAt: timestamp
}

OwnerMemoryDetail {
  id, trailId: UUID
  tripDate:    date
  title:       string
  story:       string | null
  visibility:  "PRIVATE" | "PUBLIC"
  photos:      MemoryPhotoResponse[]   // ascending position; first is the cover
  createdAt, updatedAt: timestamp
}

MemoryPage<T> {
  items:       T[]
  page:        integer      // 0-based
  size:        integer
  totalItems:  integer
  totalPages:  integer
}
```

`MemoryPage` is a project record, not Spring Data's `Page` (whose JSON shape is not a stable contract).

Never present in any owner response: `ownerSubject`, `deleted`, `objectKey`, `mediaType`, an email, or any user id.

### 13.2 Request types

```text
CreateMemoryRequest {
  trailId:     UUID      required
  tripDate:    date      required; not a future date (server accepts ≤ server today + 1 day only as a time-zone allowance, D10)
  title:       string    required, not blank, ≤ 120 (trimmed before storing)
  story:       string    optional, ≤ 5000 (blank → null)
  visibility:  "PRIVATE" | "PUBLIC"   optional, default PRIVATE
}

UpdateMemoryRequest {          // full replacement of the editable fields
  tripDate:    date      required; same rule as create
  title:       string    required, not blank, ≤ 120
  story:       string    optional; null or blank clears it
  visibility:  "PRIVATE" | "PUBLIC"   required (no silent change)
}

ReorderPhotosRequest {
  photoIds:    UUID[]    required; exactly the Memory's current photo ids, each once
}
```

`UpdateMemoryRequest` has no `trailId`; one sent anyway is ignored and the trail never changes (D9). `visibility` is required on update so that an omitted field can never flip a Memory's sharing state.

### 13.3 List own Memories

- The caller's non-deleted Memories, both visibilities.
- Order: `tripDate DESC, createdAt DESC, id DESC` (the `id` makes paging stable).
- `page` default `0`, `size` default `20`, `size` ≤ `50`. `page < 0`, `size < 1`, `size > 50`, or a non-integer → `400 VALIDATION_ERROR` (D24).
- No `userId`, `trailId`, search, or sort parameters. Unknown query parameters are ignored.
- Photos for the whole page are loaded in **one** query (`memory_id IN (:ids)`), from which `photoCount` and `coverPhoto` are computed. No trail-service call.

### 13.4 Create

1. Validate the body (Bean Validation, plus the `tripDate` rule in the service).
2. Validate the trail through trail-service (§15) **before** opening a transaction.
3. In one transaction, insert the Memory with `ownerSubject = sub`, trimmed title, normalized story, visibility or `PRIVATE`.
4. Return `201` with `OwnerMemoryDetail` (`photos: []`).

Photos are added afterwards with §13.8. A Memory never requires photos.

### 13.5 Read one

Own, non-deleted Memory of either visibility → `200`. Otherwise `404 MEMORY_NOT_FOUND`. No trail-service call: a Memory whose trail was later deleted is still returned (§15.3).

### 13.6 Update

Own, non-deleted Memory only. Replaces `tripDate`, `title`, `story`, `visibility`; sets `updatedAt`. `trailId`, owner, `createdAt`, and photos are unchanged. No trail-service call (the trail cannot change). Last write wins; there is no optimistic-locking version in the MVP.

### 13.7 Soft delete

Own, non-deleted Memory only: sets `deleted = true` and `updatedAt`, returns `204`. Afterwards every owner and public endpoint treats it as nonexistent (`404`, absent from lists); a second `DELETE` is `404` (FEATURE-007's frontend already treats `404` on delete as removed). Photo rows and stored objects are kept (§18.3). There is no restore.

### 13.8 Add a photo

`multipart/form-data` with exactly one part named `file`.

1. Spring rejects bodies over the limit (`413`, §17).
2. Detect the type (§10.1) → `415` if not accepted.
3. Check dimensions, decode, and re-encode (§10.2) → `413 IMAGE_TOO_LARGE` or `415` on failure.
4. Pre-check (read only): the Memory is the caller's and not deleted (`404`), and it has fewer than 5 photos (`409 PHOTO_LIMIT_REACHED`).
5. Generate `photoId`, build the key, and `storage.put(...)` **outside** any transaction (`503 STORAGE_UNAVAILABLE` on failure; nothing written to the database).
6. Transaction: lock the Memory row (`PESSIMISTIC_WRITE`), re-check ownership, deletion, and the count, insert the photo at `max(position) + 1` (or `0`), set `updatedAt`.
7. If step 6 fails for any reason (including the re-check), `storage.delete(key)` as compensation, then return the step 6 error.
8. `201` with the new `MemoryPhotoResponse`.

Concurrent uploads to one Memory can therefore never exceed 5 photos.

### 13.9 Reorder photos

Own, non-deleted Memory. `photoIds` must be exactly the current photo ids, each once; otherwise `400 VALIDATION_ERROR` (`field: photoIds`). In one transaction (the unique constraint is deferred), positions become `0..n-1` in the given order and `updatedAt` is set. Returns the photos in their new order. This is how FEATURE-009 can set a cover (by moving a photo first); FEATURE-009 decides whether to offer it.

### 13.10 Remove a photo

Own, non-deleted Memory and a photo of that Memory; otherwise `404` (`MEMORY_NOT_FOUND` or `PHOTO_NOT_FOUND`, the latter only when the Memory is the caller's). In one transaction the photo row is deleted and `updatedAt` set; after commit, `storage.delete(key)`. If the storage delete fails, the response is still `204` and a warning with the object key is logged (orphan; §18.4). Remaining positions are not renumbered.

## 14. Public API

No token is needed or expected. As on trail-service, a request that sends an **invalid** bearer token is refused with `401` by the resource-server filter, so FEATURE-010 sends none (FC §4).

| # | Method | Path | Success |
|---|---|---|---|
| 14.2 | `GET` | `/api/memories/public?trailId={uuid}&page=&size=` | `200 MemoryPage<PublicMemorySummary>` |
| 14.3 | `GET` | `/api/memories/public/{memoryId}` | `200 PublicMemoryDetail` |

The literal `/public` segment is matched before `/{memoryId}` (Spring prefers literal patterns). The routes live in memory-service, not trail-service (D18).

### 14.1 Response types

```text
PublicPhoto {
  id:            UUID
  position:      integer
  url:           string
  urlExpiresAt:  timestamp
}

PublicMemorySummary {
  id, trailId:    UUID
  tripDate:       date
  title:          string
  storyExcerpt:   string | null    // §14.4
  storyTruncated: boolean
  photoCount:     integer
  coverPhoto:     PublicPhoto | null
  createdAt:      timestamp
}

PublicMemoryDetail {
  id, trailId: UUID
  tripDate:    date
  title:       string
  story:       string | null       // full text
  photos:      PublicPhoto[]       // ascending position
  createdAt:   timestamp
}
```

These are separate records from the owner DTOs, so a field added to an owner response can never leak publicly. They contain no `visibility` (always `PUBLIC`), `updatedAt`, `deleted`, owner subject, email, user id, display name, object key, or media type. A test asserts the exact JSON field set of each (AC-19).

### 14.2 Public trail list

- `trailId` required; missing or not a UUID → `400 VALIDATION_ERROR`.
- One trail-service call per request (§15.3): `404` from trail-service → `404 TRAIL_NOT_FOUND`; unreachable → `503 TRAIL_SERVICE_UNAVAILABLE`.
- Returns only rows with `trail_id = :trailId AND visibility = 'PUBLIC' AND deleted = false`, enforced in the repository query.
- Order `tripDate DESC, createdAt DESC, id DESC`; paging as §13.3. No likes, popularity, or ranking.
- `totalItems` is the trail's public Memory count (one `COUNT` query, no counter table), so FEATURE-010 can say "12 community memories" without another request (Q15).
- There is no public list across all trails (no feed).

### 14.3 Public detail

`200` only when the Memory exists, is `PUBLIC`, is not deleted, and its trail still exists (one trail-service call). Every other case, including `PRIVATE`, deleted, or a deleted trail, gives the **same** `404 MEMORY_NOT_FOUND` body. A trail-service outage gives `503`.

### 14.4 Story excerpt

Computed at read time; nothing truncated is stored.

- `story` null → `storyExcerpt: null`, `storyTruncated: false`.
- ≤ 240 characters → the whole story, `storyTruncated: false`.
- Otherwise the first 240 characters cut back to the last whitespace inside them (a hard cut at 240 if there is none), trailing whitespace trimmed, `storyTruncated: true`. No ellipsis is added; presentation is FEATURE-010's choice.
- The cut never splits a UTF-16 surrogate pair.

### 14.5 Public author identity (Q14)

**D4. No author identity in any public response.** No email, Keycloak subject, internal user id, display name, avatar, or profile. user-service's `display_name` is not a safe public name: it comes from the token's `name` (often a full legal name) or `preferred_username` (possibly an email address), and the user never agreed to publish it. FEATURE-010 may use generic copy such as "Shared by a community member"; the backend invents no name. An opt-in public display name is a future product decision.

## 15. Trail Integration

### 15.1 Strategy

**D19. memory-service stores `trailId` only and validates it with one tokenless HTTP call to trail-service's public `GET /api/trails/{id}`.** No database join, no copied trail fields, no shared tables.

| Option | Verdict |
|---|---|
| Trust the UUID without checking | Rejected: allows Memories on nonexistent trails |
| **Validate by HTTP at creation** | **Chosen**: the public detail read exists, already excludes soft-deleted trails, and needs no token or trail-service change |
| Read `trail_db` directly | Rejected: crosses a service boundary |
| Copy trail records | Rejected: duplicates trail-service's data (D19) |

### 15.2 Trail client

`TrailCatalogClient` in memory-service, built like recommendation-service's `TrailServiceClient`: a `RestClient` with base URL `services.trail.base-url` (default `http://localhost:8082`), connect timeout 2 s, read timeout 3 s, **no** `Authorization` header.

| trail-service answer | Meaning | memory-service result |
|---|---|---|
| `200` | Trail exists and is not deleted | Continue |
| `404` | Missing or soft-deleted | Create: `400 TRAIL_NOT_FOUND` (the request body names an invalid trail; `404` stays reserved for the addressed Memory). Public reads: `404` (§14) |
| Timeout, connection error, `5xx`, or any other status | Cannot tell | `503 TRAIL_SERVICE_UNAVAILABLE`; fail closed, nothing created |

Only the status is used; the body is not parsed. No retry.

### 15.3 When calls happen

| Operation | Trail call? |
|---|---|
| Create | Yes, once, before the transaction |
| Update, delete, photo operations | No (`trailId` is immutable) |
| Owner list, owner detail | **No.** A Memory on a later-deleted trail stays visible to its owner with its `trailId`; FEATURE-009 shows a "trail unavailable" state when the trail read returns `404` |
| Public list | Yes, once per request (never per row) |
| Public detail | Yes, once per request |

**Trail deleted later (brief item 56):** the Memory is never cascade-deleted or modified. Its owner keeps full access. Public endpoints stop surfacing it while the trail is missing, and surface it again if the trail is restored. The owner may still change its visibility; that has no public effect while the trail is missing.

## 16. Security and Privacy

### 16.1 Authentication and authorization (P0)

`SecurityConfig` mirrors user-service (stateless, CSRF off, custom 401/403 handlers, JWT resource server) with these permits:

| Matcher | Access |
|---|---|
| `DispatcherType.ERROR` | permitAll (so anonymous public calls see their real error status, as on trail-service) |
| `GET /api/memories/public`, `GET /api/memories/public/{uuid}` | permitAll |
| `GET /api/memories/local-photos/**` (local mode only) | permitAll; the signature is the authorization (§12) |
| everything else | authenticated |

A token whose `sub` is missing or blank is rejected with `401 AUTHENTICATION_REQUIRED` before any service logic.

### 16.2 P0 security rules

1. Every owner read and mutation requires authentication.
2. The owner is derived from `sub` only; no client-supplied owner is honoured.
3. No user can read, update, delete, or change photos of another user's Memory; such attempts are indistinguishable from a nonexistent id.
4. `PRIVATE` Memories are never returned by public endpoints.
5. Deleted Memories are never returned by any normal endpoint.
6. Photo URLs are issued only through a response the caller is allowed to receive, and expire within 15 minutes.
7. Uploads are scoped to a Memory the caller owns; the server chooses the object key, so a client cannot attach an existing or foreign object.
8. Object keys, owner subjects, and the `deleted` flag never appear in any response.
9. Every stored photo is a server re-encoded image carrying no EXIF, GPS, or other metadata; the original upload is never stored.

### 16.3 Photo ownership

There is no endpoint addressed by object key or photo id alone. Add, reorder, and remove are all under `/api/memories/{memoryId}/photos` and start with the owner-scoped Memory lookup (§9.1).

### 16.4 Accepted residual exposure

A signed URL handed out before a `PUBLIC → PRIVATE` change or a delete remains usable by whoever holds it until it expires (≤ 15 minutes). Revoking issued S3 presigned URLs would require rotating credentials, which is disproportionate here. This is documented, not hidden.

### 16.5 CORS

memory-service defines **no** CORS configuration, like user-service: the browser reaches it same-origin through the Vite proxy. The S3 bucket needs no CORS: uploads go through memory-service and `<img>` loads need none. Production origins are decided with deployment routing (§23.5); no wildcard origin is ever configured.

### 16.6 Logging (observability)

Normal SLF4J logging. Log: operation, Memory id, photo id, object key (contains only UUIDs), storage and trail-call outcomes, and durations of failures.

Never log: access tokens or `Authorization` headers; signed URLs or their signatures; the local signing secret; titles or stories; owner subjects or emails; client filenames; S3 credentials. No metrics beyond what Spring provides by default.

## 17. Error Semantics

All errors are `ProblemDetail` (`application/problem+json`) with `title`, `detail`, `instance`, and `code`, plus `errors: [{field, message}]` for validation failures, exactly as user-service (§5 H). No new envelope. Unexpected exceptions get a generic `500 INTERNAL_SERVER_ERROR` with no stack trace or internal message.

| Situation | Status | `code` |
|---|---|---|
| Body field invalid (title, story, tripDate, visibility, photoIds) | 400 | `VALIDATION_ERROR` (with `errors[]`) |
| Malformed JSON, unknown enum value, non-UUID path or query value, bad paging | 400 | `VALIDATION_ERROR` |
| Missing `file` part | 400 | `VALIDATION_ERROR` |
| No or invalid token, or no `sub` | 401 | `AUTHENTICATION_REQUIRED` |
| Authenticated but forbidden (not expected in practice) | 403 | `ACCESS_DENIED` |
| Memory missing, deleted, foreign, or (public) not `PUBLIC` / trail gone | 404 | `MEMORY_NOT_FOUND` |
| Photo not on the caller's Memory | 404 | `PHOTO_NOT_FOUND` |
| Public list for a missing or deleted trail | 404 | `TRAIL_NOT_FOUND` |
| Create for a missing or deleted trail | 400 | `TRAIL_NOT_FOUND` |
| Sixth photo | 409 | `PHOTO_LIMIT_REACHED` |
| File over 10 MB | 413 | `PAYLOAD_TOO_LARGE` |
| Image over 40 MP or 12,000 px on a side | 413 | `IMAGE_TOO_LARGE` |
| Not JPEG / PNG / WebP, multi-frame WebP, or undecodable | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| trail-service unreachable or erroring | 503 | `TRAIL_SERVICE_UNAVAILABLE` |
| Object storage failure on write | 503 | `STORAGE_UNAVAILABLE` |

Multipart limits: `spring.servlet.multipart.max-file-size: 10MB`, `max-request-size: 11MB`, and `server.tomcat.max-swallow-size: 25MB` so that a moderately oversized upload receives the `413` instead of a connection reset. `MaxUploadSizeExceededException` is mapped to the `413` problem.

## 18. State, Transactions, and Lifecycle

### 18.1 Transactions

Ordinary `@Transactional` service methods on `memory_db`. No distributed transaction spans memory_db, trail-service, and storage. Rules:

- No HTTP call to trail-service and no storage `put` happens inside a database transaction.
- Storage `delete` after a photo removal runs after commit.
- Compensation is limited to deleting an object whose database insert failed (§13.8 step 7).

### 18.2 Photo limit under concurrency

The count check is repeated inside the transaction while holding a `PESSIMISTIC_WRITE` lock on the Memory row, so two simultaneous uploads cannot both become photo 5 and 6.

### 18.3 Memory soft delete and its photos (brief item 28)

**D13 / D15.** Deleting a Memory sets `deleted = true` only. Its photo rows and stored objects are **retained** (option A). Rationale: the project's deletion semantics are soft; keeping the objects keeps a soft-deleted row internally consistent and recoverable by an operator; storage pressure at capstone scale is negligible; and the objects stay private and unreachable once already-issued URLs expire. This is intentional MVP behaviour, not a leak. A future purge job, account-deletion workflow, or retention policy may remove them (§26.3).

Removing a single photo is different: the user explicitly removes that image, so its row is deleted and its object deleted after commit.

### 18.4 Orphans

With backend-mediated upload, an object without a row exists only when the compensation delete in §13.8 or the post-commit delete in §13.10 fails. Both log a warning with the object key. No background worker or lifecycle rule is built; an operator can remove logged keys. This is accepted for the MVP.

### 18.5 Data retention and accounts

Soft-deleted Memory rows and their objects are retained indefinitely. There is no account-deletion flow in the project; cascading Memory removal on account deletion is a future system concern (§26.3).

## 19. Performance

- Owner and public lists: one page query, one count query, one batched photo query, plus local URL signing per cover. Public lists add one trail-service call. Never one call per row.
- Owner reads make no trail-service calls. memory-service never resolves trail names; FEATURE-009 and FEATURE-010 already have the trail list (`GET /api/trails`) and join on `trailId` in the client.
- Indexes in §8.2 cover both list orders.
- Uploads hold at most one 10 MB file in memory per request.
- A short in-process cache of trail existence for public reads is a possible later optimization, not part of the MVP.

## 20. Testing

### 20.1 Strategy

FEATURE-008 is validated by **focused automated backend tests plus a live API smoke check**. No browser QA, no Chrome automation.

### 20.2 Test infrastructure

- `@SpringBootTest` + `MockMvc` + Testcontainers PostgreSQL (`postgres:17-alpine`, `@ServiceConnection`), `@MockitoBean JwtDecoder`, `jwt()` with subjects `user-a` and `user-b`, as in `GearIntegrationTest`. Docker must be running; no AWS account or network is needed.
- `InMemoryMemoryPhotoStorage` (test sources only) records puts and deletes and can be told to fail.
- `TrailCatalogClient` is a `@MockitoBean` in integration tests; its own unit test uses `MockRestServiceServer` (as `TrailServiceClientTest`) for `200`, `404`, `500`, and timeout.
- Photo fixtures in `src/test/resources` (small, a few kB each): a JPEG with EXIF GPS, a PNG with `eXIf` and `tEXt`, a WebP with `EXIF` (with and without alpha), an animated WebP, a GIF, an SVG, HEIC header bytes, and a text file named `.jpg`. Oversize bodies and an over-dimension PNG header are generated in the test. Metadata absence is asserted by reading the stored bytes back with `ImageIO` metadata (no EXIF / text nodes) and by a byte search for the `Exif` marker and the GPS test value.
- `S3MemoryPhotoStorage` is unit-tested offline: an `S3Presigner` with static dummy credentials produces a URL for the right bucket, key, and expiry; `put`/`delete` are tested against a mocked `S3Client`. A live S3 smoke is optional and only if a bucket is configured later.

### 20.3 Required test groups (P0)

| Group | Covers |
|---|---|
| Owner CRUD | create (default `PRIVATE`, trimming, ignored client fields), list (own only, both visibilities, order, paging), read own `PRIVATE`, update (trail unchanged), visibility change, soft delete, deleted excluded everywhere |
| Validation | title blank / 120 / 121, story 5000 / 5001 / blank → null, tripDate missing / today / today + 1 / today + 2, bad visibility value, paging bounds |
| Trail | create on missing/deleted trail → `400`, on trail-service failure → `503`, no row in both cases; no token sent |
| **Cross-user (A/B)** | B cannot GET, PUT, DELETE A's Memory, nor add, reorder, or remove A's photos; each answer equals the nonexistent-id answer; A's data and storage unchanged |
| **Public matrix** | `PUBLIC`+active visible; `PRIVATE`+active, `PUBLIC`+deleted, `PRIVATE`+deleted invisible, in both list and detail; ordering; `totalItems`; deleted trail → `404`; exact public JSON field set |
| Photos | accepted types, rejected types (GIF, SVG, HEIC, text-as-jpg, animated WebP), > 10 MB → `413`, over-dimension → `413`, sixth → `409`, concurrent fifth/sixth, cover = lowest position, reorder, remove (row and object), zero-photo Memory |
| Sanitization | the stored object for each fixture is a valid JPEG or PNG of the same dimensions, carries no EXIF / XMP / text metadata and no GPS value, and its `mediaType` matches the §10.2 table |
| Storage failure | put failure → `503`, no row; insert failure after put → object deleted |
| Signed URLs | local: valid URL serves the file; expired, tampered, or wrong-key signature → `404`; endpoint absent in s3 mode |

Command: `mvn -pl memory-service test` from `Project/Backend/`.

### 20.4 Live API smoke (lead, about 5 minutes)

With PostgreSQL (with `memory_db`), Keycloak, and trail-service running, and memory-service on 8085 in local mode:

1. Flyway applies V1; the service starts with `ddl-auto: validate`.
2. `GET /api/memories` without a token → `401` ProblemDetail.
3. `GET /api/memories/public?trailId=<real trail id>` → `200`, empty page, `totalItems: 0`.
4. `GET /api/memories/public?trailId=<random uuid>` → `404 TRAIL_NOT_FOUND` (proves the live trail call).
5. `GET /api/memories/public/<random uuid>` → `404`.

Optional authenticated pass (P2): if the user supplies an access token from a signed-in local browser session (DevTools → Network → the `Authorization` header of any `/api/users/me/gear` request), pass it through an environment variable only, then create a Memory on a real trail, upload one JPEG, fetch its signed URL, make it `PUBLIC`, read it publicly, make it `PRIVATE`, confirm public `404`, delete it. The token is never written to a file, report, or log.

## 21. Acceptance Criteria

36 criteria: **23 P0**, **9 P1**, **4 P2**. "Test" means an automated test in `memory-service`; "Smoke" means §20.4; "Review" means the lead's diff review.

| Id | P | Criterion |
|---|---|---|
| AC-01 | P0 | **Smoke.** `memory-service` is a module of the parent POM, starts on port 8085 against `memory_db`, Flyway applies `V1__create_memory_tables.sql` exactly as §8.2 (tables, checks, indexes, deferrable unique position), and Hibernate `validate` passes. |
| AC-02 | P0 | **Test.** `POST /api/memories` with a valid body returns `201 OwnerMemoryDetail`; the stored owner is the token's `sub`; omitting `visibility` stores `PRIVATE`; the title is stored trimmed; `photos` is `[]` (§13.4, D6). |
| AC-03 | P0 | **Test.** `userId`, `ownerSubject`, `id`, `deleted`, `createdAt`, and `updatedAt` sent in a create or update body have no effect on the stored row (§9.1). |
| AC-04 | P0 | **Test.** Title missing, empty, whitespace-only, or 121 characters → `400 VALIDATION_ERROR` with `errors[].field = "title"`; 120 characters is accepted. Story of 5000 is accepted, 5001 rejected; a blank story is stored as `null`; a Memory with no story is valid (§7.1). |
| AC-05 | P0 | **Test.** `tripDate` missing → `400`; server today + 2 days → `400`; today and a past date are accepted; server today + 1 is accepted only as the time-zone allowance of D10 (not a supported future date). No planned trip is required (D10, Q8). |
| AC-06 | P0 | **Test.** Creating for a trail that trail-service answers `404` (missing or soft-deleted) → `400 TRAIL_NOT_FOUND`; a trail-service timeout or `5xx` → `503 TRAIL_SERVICE_UNAVAILABLE`; in both cases no row is written. The trail call carries no `Authorization` header (§15.2). |
| AC-07 | P0 | **Test.** `GET /api/memories` returns only the caller's non-deleted Memories, both visibilities, ordered `tripDate DESC, createdAt DESC, id DESC`, in the `MemoryPage` envelope with correct `totalItems`; `size > 50`, `size < 1`, or `page < 0` → `400`; it makes no trail-service call (§13.3). |
| AC-08 | P0 | **Test.** The owner reads their own `PRIVATE` Memory with `GET /api/memories/{id}` → `200` with story and photos in position order (§13.5). |
| AC-09 | P0 | **Test.** `PUT /api/memories/{id}` replaces `tripDate`, `title`, `story`, `visibility`, advances `updatedAt`, and leaves `trailId` unchanged even when a different `trailId` is sent; omitting `visibility` → `400` (§13.6, D9). |
| AC-10 | P0 | **Test.** `DELETE /api/memories/{id}` → `204`; the row remains with `deleted = true`; afterwards owner GET, PUT, DELETE, and photo calls → `404`, and the Memory is absent from the owner list and from public list and detail (§13.7, D13). |
| AC-11 | P0 | **Test.** User B's GET, PUT, and DELETE on User A's Memory each return `404 MEMORY_NOT_FOUND` with a body identical (except `instance`) to a request for a random id; A's row is unchanged (§9.1, D14). |
| AC-12 | P0 | **Test.** User B cannot add, reorder, or remove photos on User A's Memory (`404`); no object is written to or deleted from storage, and A's photos are unchanged (§16.3). |
| AC-13 | P0 | **Test.** Every owner endpoint without a token, with an invalid token, or with a token lacking `sub` → `401` ProblemDetail with `code: AUTHENTICATION_REQUIRED` (§16.1). |
| AC-14 | P0 | **Test.** For one trail, the public list returns `PUBLIC`+active and excludes `PRIVATE`+active, `PUBLIC`+deleted, and `PRIVATE`+deleted; order is `tripDate DESC, createdAt DESC, id DESC`; `totalItems` counts only visible rows; `trailId` missing or malformed → `400` (§14.2). |
| AC-15 | P0 | **Test.** Public detail: `PUBLIC`+active → `200`; `PRIVATE`, deleted (either visibility), and random ids → the same `404 MEMORY_NOT_FOUND` body, all without a token (§14.3). |
| AC-16 | P0 | **Test.** After `PRIVATE → PUBLIC` the very next public list and detail include the Memory; after `PUBLIC → PRIVATE` they exclude it (D7). |
| AC-17 | P0 | **Test.** `POST /api/memories/{id}/photos` with a JPEG, PNG, or WebP ≤ 10 MB → `201 MemoryPhotoResponse`; the re-encoded object is stored under `memories/{memoryId}/{photoId}.{jpg|png}` with the output media type of §10.2; the declared part `Content-Type` and filename are ignored (§10, §11.4). |
| AC-18 | P0 | **Test.** GIF, SVG, HEIC, animated WebP, and a text file named `.jpg` → `415`; a file over 10 MB → `413 PAYLOAD_TOO_LARGE`; an image over the dimension limit → `413 IMAGE_TOO_LARGE`; a sixth photo → `409 PHOTO_LIMIT_REACHED`; two concurrent uploads to a Memory with 4 photos end with exactly 5; nothing is left in storage for a refused upload (§10, §13.8, §18.2). |
| AC-19 | P0 | **Test.** The JSON of `PublicMemorySummary`, `PublicMemoryDetail`, and `PublicPhoto` has exactly the fields of §14.1, and owner responses have exactly those of §13.1; no response anywhere contains an owner subject, email, user id, display name, `deleted`, `objectKey`, or `mediaType` (D4). |
| AC-20 | P0 | **Test.** Photo responses carry a signed `url` and `urlExpiresAt` 15 minutes ahead; the database holds no URL. Local mode: a valid URL serves the bytes with `nosniff`; an expired, tampered, or other-key signature → `404`; the endpoint does not exist in s3 mode. `S3MemoryPhotoStorage` produces presigned GET URLs offline for the configured bucket and key (§11.5, §12). |
| AC-21 | P0 | **Test.** For the JPEG, PNG, and WebP fixtures (all carrying GPS EXIF or text metadata), the stored object is a valid image of the same dimensions with no EXIF, XMP, IPTC, or PNG text metadata and no trace of the GPS value; the original bytes are never passed to storage (§10.2). |
| AC-22 | P0 | **Test.** A storage `put` failure → `503 STORAGE_UNAVAILABLE` with no photo row; a database failure after a successful `put` deletes the object (§13.8, §18.1). |
| AC-23 | P0 | **Review.** Changes are within §23.2's write scope only; trail-, user-, recommendation-, activity-service, api-gateway, and `Project/Frontend/**` are untouched; the only new runtime dependencies beyond the user-service set are `software.amazon.awssdk:s3` via its BOM and `com.twelvemonkeys.imageio:imageio-webp` (D21); `mvn -pl memory-service test` passes with no AWS access. |
| AC-24 | P1 | **Test.** A Memory with zero photos is valid everywhere: `photoCount: 0`, `coverPhoto: null`, `photos: []` (Q4). |
| AC-25 | P1 | **Test.** The cover is the lowest-position photo in owner and public summaries; after the cover is removed, the next photo is the cover (D8). |
| AC-26 | P1 | **Test.** `PUT /api/memories/{id}/photos/order` with an exact permutation rewrites positions to `0..n-1` and moves the cover; a missing, extra, duplicated, or foreign id → `400` and no change (§13.9). |
| AC-27 | P1 | **Test.** `DELETE /api/memories/{id}/photos/{photoId}` → `204`, the row is gone, the object is deleted after commit, and `updatedAt` advances; a storage delete failure still returns `204` and logs the key (§13.10, §18.4). |
| AC-28 | P1 | **Test.** The public list and detail for a trail that trail-service answers `404` return `404` (`TRAIL_NOT_FOUND` for the list, `MEMORY_NOT_FOUND` for detail) while the owner still reads the Memory; each public request makes exactly one trail-service call regardless of page size (§15.3). |
| AC-29 | P1 | **Test.** `storyExcerpt` / `storyTruncated` follow §14.4 for a null story, a 240-character story, a longer story with whitespace, and a longer story with none. |
| AC-30 | P1 | **Test.** Malformed JSON, an unknown `visibility` value, a non-UUID path id, and a missing `file` part each return `400 VALIDATION_ERROR` as a ProblemDetail, never `500` (§17). |
| AC-31 | P1 | **Review.** No log statement writes a token, `Authorization` header, signed URL, signature, signing secret, title, story, owner subject, email, or client filename (§16.6). |
| AC-32 | P1 | **Smoke.** Steps 2–5 of §20.4 give the stated results against the running services. |
| AC-33 | P2 | **Smoke.** The optional authenticated pass of §20.4 completes without writing the token anywhere. |
| AC-34 | P2 | **Test.** With `memory.storage.type: s3` and a blank bucket or region, the application fails to start with a clear message (§11.6). |
| AC-35 | P2 | **Test.** Adding, reordering, and removing photos advance the Memory's `updatedAt` (§7.1). |
| AC-36 | P2 | **Review.** The local adapter writes atomically (temp file and move), rejects any path outside its root, and its root is git-ignored (§12). |

## 22. Final Product Decisions

### 22.1 Q1–Q17

| Q | Question | Decision |
|---|---|---|
| Q1 | Dedicated service? | **Yes, `memory-service`**, port 8085, database `memory_db` (D1, D2) |
| Q2 | Owner identifier? | **Keycloak `sub`**, stored as `owner_subject`; not user-service's `users.id` (D5) |
| Q3 | Default visibility? | **`PRIVATE`** (D6) |
| Q4 | Memory without photos? | **Yes** |
| Q5 | Max photos? | **5** (D16) |
| Q6 | Cover rule? | **Lowest `position`**; set by reordering; no `coverPhotoId` (D8) |
| Q7 | Trail changeable? | **No**, immutable after creation (D9) |
| Q8 | Future `tripDate`? | **No.** Future trip Memories are not supported. The server tolerates server-local today + 1 day only as a time-zone boundary allowance; FEATURE-009 prevents selecting a future date (D10) |
| Q9 | Empty story? | **Yes**; blank stored as `null` (D12) |
| Q10 | Soft delete? | **Yes** (D13) |
| Q11 | Image storage? | **Private object storage behind `MemoryPhotoStorage`; S3 in production; backend-mediated upload (U1); server re-encoding sanitization (U2); signed-URL reads** (D20, D21) |
| Q12 | Local storage? | **Filesystem adapter in memory-service with HMAC-signed URLs**; no new container (D23) |
| Q13 | PRIVATE image protection? | **Private bucket/directory; 15-minute signed URLs issued only in responses the caller may receive; keys never exposed** (§11.5) |
| Q14 | Public author identity? | **None** (D4) |
| Q15 | Pagination? | **Yes**, `page`/`size`, default 20, max 50, with `totalItems` (D24) |
| Q16 | Public APIs in 008? | **Yes**, implemented and tested here (§14) |
| Q17 | AI recap / GPX / video? | **No**; future stretch only |

### 22.2 Decision log

| Id | Decision | Section |
|---|---|---|
| D1 | Dedicated `memory-service` | §6 |
| D2 | Port 8085 | §6 |
| D3 | activity-service unchanged and not repurposed | §6 |
| D4 | No public author identity | §14.5 |
| D5 | Owner = Keycloak `sub` (`owner_subject`) | §8.4 |
| D6 | Default `PRIVATE` | §9.2 |
| D7 | Visibility changes apply on the next request; no workflow or moderation | §9.2 |
| D8 | Cover = lowest position | §7.2 |
| D9 | `trailId` immutable | §13.6 |
| D10 | `tripDate` required, `LocalDate`, never a supported future date; server check ≤ server today + 1 as a time-zone allowance only | §7.1 |
| D11 | Title required, trimmed, 1–120 | §7.1 |
| D12 | Story optional plain text ≤ 5000, blank → null | §7.1 |
| D13 | Memory soft delete; no restore | §13.7 |
| D14 | Foreign, missing, and deleted are the same `404` | §9.1 |
| D15 | Photo removal deletes row and object; Memory deletion retains photos and objects | §18.3 |
| D16 | At most 5 photos, ≤ 10 MB each, one per request | §10 |
| D17 | JPEG, PNG, WebP input only, recognised by the image decoder; stored output JPEG or PNG; no animation | §10.1 |
| D18 | All routes under `/api/memories/**` in memory-service (public at `/api/memories/public…`) | §14 |
| D19 | Store `trailId` only; validate via public trail detail HTTP read; no cross-DB FK; no trail copy | §15 |
| D20 | Private storage, backend-mediated upload, signed-URL reads | §11 |
| D21 | New dependencies: AWS SDK v2 `s3` (via BOM) and TwelveMonkeys `imageio-webp` (WebP decoding); sanitization by JDK ImageIO decode and re-encode; no hand-written binary metadata parser | §10.2, §11.6, §23.4 |
| D22 | Signed URL lifetime 15 minutes | §11.5 |
| D23 | Local filesystem adapter; no LocalStack or MinIO | §12 |
| D24 | Simple pagination, max 50, with totals | §13.3 |
| D25 | `backend-api` is authorized to implement FEATURE-008 (feature-local; its general role is unchanged) | §23.1 |

## 23. Implementation Plan and Write Scope

### 23.1 Cycle

| Step | Owner | Output |
|---|---|---|
| Recover | Lead | Working tree state; confirm this spec is approved and §26.1 items are decided |
| Scope | Lead | Brief to `backend-api` naming this spec, §23.2, and the approvals |
| Implement | `backend-api` | memory-service, migration, storage adapters, tests |
| Focused tests | `backend-api`, then lead re-runs | `mvn -pl memory-service test` green |
| Live API smoke | Lead (or `qa` given an explicit API-only brief) | §20.4 |
| Lead diff review | Lead | AC-23, AC-31, AC-36; scope check |
| Product gate | User | Accept, request changes, or ask for more checks |
| Closeout | Lead | Documentation follow-ups F1–F8 (§26.2) |

**Implementation authorization (U4, D25).** For FEATURE-008 only, `backend-api` is authorized to implement this approved backend-first feature within §23.2's write scope, although no frontend work has found a gap. This is a feature-local authorization: it does not change `backend-api`'s general role in `CLAUDE.md` or `.claude/agents/backend-api.md`.

`ui-ux`: SKIP. `frontend`: SKIP (no proxy or type change in 008). `three-d`: SKIP. Blender: NOT REQUIRED. Browser QA: NOT REQUIRED. Repairs follow `CLAUDE.md` (at most two automatic cycles).

### 23.2 Write scope for `backend-api`

| Path | Change |
|---|---|
| `Project/Backend/memory-service/**` | New module: `pom.xml`, `.gitignore` (including `.local-storage/`), application, config, controller, dto, entity, repository, service, storage, client, exception, security, `application.yaml`, `db/migration/V1__create_memory_tables.sql`, tests and fixtures |
| `Project/Backend/pom.xml` | Add `<module>memory-service</module>` |
| `Project/docker/postgres/init-databases.sql` | Add `CREATE DATABASE memory_db;` |

Not authorized: any other service, `Project/docker-compose.yml` (no new container is needed), `Project/.env` (no new required key: every new property has a working local default), `Project/Frontend/**` including `vite.config.ts`, documentation other than what the lead assigns at closeout.

### 23.3 Configuration (`application.yaml`)

```yaml
server:
  port: 8085
  tomcat:
    max-swallow-size: 25MB

spring:
  application:
    name: memory-service
  datasource:
    url: jdbc:postgresql://localhost:5432/memory_db
    username: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 11MB
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8180/realms/outdoor-trip

services:
  trail:
    base-url: ${TRAIL_SERVICE_BASE_URL:http://localhost:8082}

memory:
  photos:
    url-ttl: 15m
  storage:
    type: ${MEMORY_STORAGE_TYPE:local}          # local | s3
    local:
      root: ${MEMORY_STORAGE_LOCAL_ROOT:./.local-storage}
      signing-secret: ${MEMORY_STORAGE_LOCAL_SIGNING_SECRET:}
      public-base-url: ${MEMORY_STORAGE_LOCAL_PUBLIC_BASE_URL:}
    s3:
      bucket: ${MEMORY_S3_BUCKET:}
      region: ${MEMORY_S3_REGION:}
```

No secret has a committed value. The five-photo limit and the 10 MB limit are constants in code (the multipart limit mirrors the constant), not tunable properties.

Database setup (U3):

| Environment | Steps |
|---|---|
| Fresh (no `postgres_data` volume yet) | `docker compose up -d` from `Project/`. The PostgreSQL entrypoint runs `init-databases.sql`, which now creates `user_db`, `trail_db`, and `memory_db`. Starting memory-service applies its Flyway migration |
| Existing volume (the usual developer case) | `init-databases.sql` does **not** run again. Run once: `docker exec -it outdoor-postgres psql -U "$POSTGRES_USER" -d postgres -c 'CREATE DATABASE memory_db;'`. If it reports that the database exists, nothing more is needed. Then start memory-service |

Nothing in the implementation drops, recreates, or resets a database or volume; `docker compose down -v` is never part of the setup. The closeout records both paths in `CLAUDE.md` / FC (F3).

### 23.4 Dependencies

Same starters as user-service (`data-jpa`, `flyway` + `flyway-database-postgresql`, `security`, `oauth2-resource-server`, `validation`, `webmvc`, `postgresql`; test: the matching `-test` starters, `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter`). New, and the only new ones approved:

| Dependency | Why | Notes |
|---|---|---|
| `software.amazon.awssdk:bom` (import) + `software.amazon.awssdk:s3` | Production storage and presigned GET URLs (U3) | `S3Client` and `S3Presigner` both live in `s3`; no Spring Cloud AWS, no other AWS module |
| `com.twelvemonkeys.imageio:imageio-webp` | Decode WebP input for sanitization (U2, D21) | Maintained, BSD-3 licensed, pure Java, registers through `ImageIO`'s service loader; pulls only TwelveMonkeys' own `imageio-core` and `common-*` artifacts. Use the current release from Maven Central and record it at closeout |

JPEG and PNG decoding and all encoding use the JDK's `javax.imageio`. If the WebP plugin proves unusable, `backend-api` stops and reports to the lead rather than writing a decoder or adding a native library (`libwebp` bindings are not approved). If Spring Boot 4's modular auto-configuration does not provide what the trail client needs, `backend-api` builds the `RestClient` itself as recommendation-service does rather than adding a starter; any further dependency needs lead approval.

### 23.5 Later, outside FEATURE-008

- **Dev proxy (FEATURE-009):** one entry `"/api/memories": { target: "http://localhost:8085" }` in `vite.config.ts`. It also carries the local-mode photo URLs. FEATURE-010 reuses it.
- **Deployment:** the api-gateway has no routes (FC §2, §12). A deployment must route `/api/memories/**` to memory-service, provision a private S3 bucket and IAM role (§11.6), set `MEMORY_STORAGE_TYPE=s3`, and decide production CORS together with the other services.

## 24. FEATURE-009 Handoff (My Memories)

### 24.1 FEATURE-009 may assume

- Authenticated create, list, read, update, and soft delete of the user's own Memories work as §13 specifies, with ownership enforced server-side.
- Photo upload, removal, and reorder work, with limits (5, 10 MB, JPEG/PNG/WebP) enforced and reported by status and `code` (§17).
- Owner list returns summaries with `photoCount` and `coverPhoto`; detail returns the story and all photos.
- `PRIVATE`/`PUBLIC` is a field on create and update; omitted on create means `PRIVATE`; required on update.
- Deleted Memories never come back.

### 24.2 FEATURE-009 owns

The `/memories` route and navigation entry, the grid, Create / Edit / Delete flows, the Public/Private control and its wording, photo picking and ordering UI, fallback visuals for Memories without photos, the trail picker (from `GET /api/trails`), trail names via the trail list joined on `trailId`, a "trail unavailable" state for a `trailId` the list no longer contains, the Vite proxy entry (§23.5), and the FC update for its frontend architecture.

### 24.3 FEATURE-009 must also

- **Normalize photos before upload** (UX and compatibility only; the server's re-encoding remains the privacy enforcement): decode with orientation applied (`createImageBitmap(file, { imageOrientation: "from-image" })`), optionally downscale, and re-encode to JPEG or WebP. This keeps orientation correct after the server strips EXIF and keeps uploads well under 10 MB.
- Check type and size client-side for fast feedback; the server remains the authority.
- Treat `url` as opaque and short-lived: render it as given (absolute or root-relative), and request the Memory again rather than reusing a URL past `urlExpiresAt`.
- Prevent selecting a future trip date (the latest selectable date is the user's local today). The server's one-day allowance (D10) exists only for time-zone boundaries and is not a feature to expose.
- Send the full editable body on `PUT` (story `null` clears it).
- Upload photos one request at a time after the Memory is created.

## 25. FEATURE-010 Handoff (Community Memories)

### 25.1 FEATURE-010 may assume

- `GET /api/memories/public?trailId=` lists a trail's `PUBLIC`, non-deleted Memories newest-trip first, paginated, with `totalItems` for a count line, `storyExcerpt` for previews, and a signed `coverPhoto`.
- `GET /api/memories/public/{id}` returns one public Memory with the full story and all photos.
- Only `PUBLIC`, non-deleted Memories on existing trails are ever returned; this is enforced by the server.
- Signed image URLs work in `<img>` without a token or CORS.
- The author privacy rule is fixed: there is no author identity to display.

### 25.2 FEATURE-010 owns

The Discover popup's community section (FEATURE-006's popup has no fixed height, 006 §10), how many items and how much text to preview, a "view all" experience, signed-out reading, empty, loading, and unavailable states (with `503` distinct from an empty list), generic author copy if any, and no token on these calls. It does not redesign FEATURE-006 and needs no backend change.

## 26. Blockers and Documentation Follow-ups

### 26.1 Resolved approvals (user, 2026-10-16)

No open question remains.

| # | Item | Resolution |
|---|---|---|
| U1 | Backend-mediated upload instead of presigned PUT (§11.2) | **Approved** as the MVP architecture. A later production version may move to presigned uploads without changing the Memory domain model |
| U2 | Server-side metadata and GPS sanitization (§10.2) | **Approved with a correction:** P0 and required, but **not** by hand-written JPEG/PNG/WebP parsers. Implemented by decode and re-encode with JDK ImageIO plus the smallest maintained library (TwelveMonkeys `imageio-webp`) (D21). Client preparation in FEATURE-009 is UX and compatibility; server sanitization is privacy enforcement, and the server never trusts the client to remove GPS |
| U3 | New module `memory-service` (8085), dedicated `memory_db`, one line in `init-databases.sql`, AWS SDK v2 `s3`, documented fresh and existing-volume setup (§23.3) | **Approved.** No Memory tables in `user_db` or `trail_db`; activity-service is not repurposed; no automated destructive database recreation |
| U4 | `backend-api` implements a backend-first feature | **Approved**, feature-local only (D25, §23.1) |

### 26.2 Documentation follow-ups

| # | Document | Required change | When |
|---|---|---|---|
| F1 | PRD §1.1, §5, §11.3, §33, §40, §40.6, §45.3, §47, §48, §49, §50, §53, §55, §57 | Record the 2026-10-16 split and move the end of the roadmap and the freeze to after FEATURE-010 | **Done 2026-10-16** (before implementation) |
| F2 | FC §2, §3, §4, §5 | memory-service row (8085, `memory_db`), its capabilities, the endpoint tables of §13–§14, DTOs, classes, and the public paths | **Done 2026-10-16** (closeout) |
| F3 | FC §2, §7, `CLAUDE.md` Infrastructure | `memory_db`; the manual `CREATE DATABASE` for existing volumes; how to run memory-service; local storage directory | **Done 2026-10-16** (closeout) |
| F4 | FC §4 API-to-frontend mapping, §9, §11, §12 | Memory row now has endpoints; drop "photo upload/storage" from missing capabilities (GPX, recap, video remain future); add risks: signed-URL residual window, retained objects after soft delete, no moderation, local-mode-only content endpoint | **Done 2026-10-16** (closeout) |
| F5 | FC header line | "updated through FEATURE-006" → through FEATURE-008 | **Done 2026-10-16** (closeout) |
| F6 | `docs/features/006-public-discover-trail-activity.md` §10, D16 | "FEATURE-008 Community Memories" → FEATURE-010 (historical note only; 006 is frozen) | At the user's discretion |
| F7 | `.claude/agents/backend-api.md`, `.claude/agents/qa.md`, `CLAUDE.md` workflow variants | A backend-first feature variant (lead → `backend-api` → tests → API smoke), and an API-only QA brief option | At the user's discretion |
| F8 | `docs/DESIGN_SYSTEM.md` "Memory" in its future-extension list | Extended by FEATURE-009/010, not by 008 | No change in 008 |

### 26.3 Future considerations (not planned)

Content moderation and reporting; an opt-in public display name; account-deletion cascade and a purge of soft-deleted Memories and their objects; rate limiting of uploads and public reads; presigned direct upload if traffic grows; thumbnails; a trail-existence cache; GPX, AI recap, and video (Q17).

## 27. Implementation Record (closeout, 2026-10-16)

The architecture above is unchanged; this section records what was built and accepted. Checkpoint: `.claude/state/features/008-memory-foundation.md`.

### 27.1 Result

| Item | Result |
|---|---|
| Product gate | **ACCEPTED** by the user, 2026-10-16 |
| Implementation | `backend-api`, within §23.2's write scope: `Project/Backend/memory-service/**` (new), one module line in `Project/Backend/pom.xml`, one line in `Project/docker/postgres/init-databases.sql` |
| Focused tests | `mvn -pl memory-service test`: **95 run, 0 failed, 0 errors, 0 skipped** (backend-api run and lead re-run). Covers every AC marked "Test", including user A / user B cross-access on every owner and photo endpoint, the public visibility matrix, exact response field sets, photo limits, type and size checks, sanitization, storage failure and compensation, and signed-URL expiry and tampering |
| Live API smoke (§20.4) | **PASS** against the real `memory_db` and trail-service, local storage mode: Flyway V1 applied and Hibernate validation passed; owner endpoints without a token `401`; public list for a real trail `200` (empty page); public list for an unknown trail `404 TRAIL_NOT_FOUND` (live trail call); unknown public detail `404`; bad paging and missing `trailId` `400`; invalid token on a public path `401`; tampered local photo link `404`; live schema has only the `memory_photos → memories` foreign key and a deferrable position constraint |
| Optional authenticated smoke (AC-33, P2) | Not run, by user decision; automated cross-user and authentication coverage accepted as sufficient |
| Lead diff review and security read | PASS; no findings |
| Repair cycles | 0 of 2 |

### 27.2 As implemented

| Area | Accepted implementation |
|---|---|
| Service | `memory-service`, port 8085, package `com.jay.outdoor.memory`, dedicated `memory_db` (`memories`, `memory_photos`), no cross-database foreign key |
| Identity | Keycloak `sub` stored as `owner_subject`; a token without `sub` is refused with `401` by `SubjectRequiredFilter` |
| Visibility | `PRIVATE` default, `PUBLIC` only explicitly; owner API authenticated; public API readable signed out for `PUBLIC`, non-deleted Memories on existing trails |
| Photos | 0–5 per Memory; JPEG, PNG, WebP input; uploaded through memory-service; cover = lowest position |
| Sanitization | Bytes recognised by an ImageIO reader → header dimension check (≤ 40 MP, ≤ 12,000 px a side) → decode pixels → encode a new image → store only the new file. JPEG → JPEG (quality 0.90), PNG → PNG, WebP → JPEG when opaque or PNG with alpha; animated WebP refused. No EXIF, GPS, XMP, or text metadata survives, and the original upload is never stored. No custom metadata parsing |
| Storage | `MemoryPhotoStorage`: `LocalMemoryPhotoStorage` (default, development; `.local-storage/`, git-ignored; HMAC-signed root-relative URLs) and `S3MemoryPhotoStorage` (production; presigned GET). Signed URL lifetime 15 minutes; only object keys are stored, and no response contains one |
| Soft delete | Memory rows, their photo rows, and objects are retained; normal APIs exclude them; no restore |
| Dependencies | User-service starter set; `software.amazon.awssdk:bom` 2.56.0 + `s3`; `com.twelvemonkeys.imageio:imageio-webp` 3.15.3 (pulls only TwelveMonkeys' own modules, including `imageio-metadata`) |

Accepted implementation details beyond the spec text: framework errors without a §17 entry use `NOT_FOUND`, `METHOD_NOT_ALLOWED`, or `REQUEST_ERROR`; a non-UUID public detail path without a token gets `401` (the public permit matches UUID paths only, as on trail-service); the title length is checked after trimming; the 10 MB limit is checked in the service as well as by Tomcat; unexpected `500`s log only the exception class.

### 27.3 Database setup

- **Fresh environment:** `docker compose up -d` from `Project/`; `init-databases.sql` creates `memory_db`; memory-service applies its migration on start.
- **Volume created before FEATURE-008:** the init script does not run again. A one-time `CREATE DATABASE memory_db;` is needed (done on the lead's local volume on 2026-10-16). Never delete the volume, recreate an existing database, or automate destructive initialization.

### 27.4 Accepted known limitations (non-blocking)

| Id | Limitation | Decision |
|---|---|---|
| L-A | A signed image URL issued before `PUBLIC → PRIVATE` or before deletion works until its 15-minute expiry | Accepted; no revocation infrastructure |
| L-B | Photos of a soft-deleted Memory remain in storage | Accepted; a retention or cleanup policy is possible future work |
| L-C | Re-encoding drops colour profiles and slightly lowers JPEG quality | Accepted; privacy takes priority |
| L-D | The S3 adapter is tested offline only; no bucket exists | Accepted; no infrastructure was provisioned |
| L-E | No signed-in live E2E check with a browser token | Accepted; automated cross-user and authentication tests suffice |
| L-F | No production routing to memory-service and no development proxy entry | Expected; FEATURE-009 adds the proxy entry, and deployment routing comes with Memory frontend integration |

### 27.5 Boundaries going forward

- **FEATURE-009 My Memories (NEXT, not started)** owns `/memories`, the authenticated Memory collection, Create / Edit / Delete Memory, the Public/Private control, photo preparation (orientation) and upload UI, owner API frontend integration, and the Vite development proxy for `/api/memories`.
- **FEATURE-010 Community Memories (not started)** owns the trail popup's Community Memories, the public Memory preview, View all Community Memories, signed-out reading, and public API frontend integration.
- FEATURE-008 owns neither UI and is frozen; a backend change for 009 or 010 is a reported contract gap.
- **Post-freeze stretch only, not roadmap items:** GPX upload, AI recap, AI story generation, short video generation, comments, likes, followers, social feed, moderation dashboard. Each needs an explicit later product decision.

### 27.6 Documentation updated at closeout

`docs/FRONTEND_CONTEXT.md` (sections 1–5, 7, 9–12: the service, `memory_db`, the endpoint table, DTOs, proxy status, risks), `CLAUDE.md` (memory-service and `memory_db` setup, roadmap status), `docs/PRODUCT_REQUIREMENTS.md` (decision record, section 47 status). F6–F8 of §26.2 are not done, at the user's discretion.

