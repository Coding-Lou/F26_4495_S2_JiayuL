Feature: 008-memory-foundation
Spec: docs/features/008-memory-foundation.md (IMPLEMENTED — PASS / FROZEN; implementation record §27)
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (user, 2026-10-16)
Updated: 2026-10-16
Cycle started: 2026-10-16 22:21:37

Primary agent: backend-api (feature-local authorization U4 / D25)
Design: N/A (backend only)
Implementation: COMPLETE (backend-api)
Tests: 95 PASS / 0 FAILED / 0 ERRORS / 0 SKIPPED (backend-api run + lead re-run; mvn -pl memory-service test, exit 0)
Live API: PASS (lead, 2026-10-16 22:53, local storage mode, real memory_db + trail-service)
Lead diff review: PASS (only memory-service/**, the parent pom module line, and the init-databases.sql line changed in production paths)
Security review: lead read of SecurityConfig, SubjectRequiredFilter, repositories, PublicMemoryService, LocalMemoryPhotoStorage, PhotoSanitizer, MemoryPhotoService. No findings
QA: browser QA not run (not required); optional authenticated smoke AC-33 (P2) not run by user decision
Repair cycles: 0/2
3D pipeline: SKIP (spec requires no realtime 3D and no 3D assets)

Frontend: SKIPPED
ui-ux: SKIPPED
three-d: SKIPPED
Blender: NOT REQUIRED
FEATURE-009: NOT STARTED (next)
FEATURE-010: NOT STARTED

Accepted architecture:
- memory-service, port 8085; dedicated memory_db (memories, memory_photos); no cross-database foreign keys
- Owner = Keycloak sub stored as owner_subject; never accepted from a client or returned
- PRIVATE default, PUBLIC explicit; owner API authenticated; public API signed-out readable for PUBLIC, non-deleted Memories on existing trails only; separate owner/public DTOs, no author identity
- Photos 0–5, JPEG/PNG/WebP input, uploaded through memory-service, cover = lowest position
- Sanitization: byte/type recognition -> dimension check -> decode pixels -> encode new image -> store only the new file (JPEG->JPEG, PNG->PNG, WebP->JPEG opaque / PNG alpha; animated WebP refused). TwelveMonkeys imageio-webp approved. No custom metadata parsing
- Storage: local filesystem adapter (development) / S3 adapter (production); 15-minute signed presentation URLs; only object keys stored, never returned
- Soft delete: Memory rows (and their photo rows and objects) retained; normal APIs exclude them; no restore
- Dependencies: awssdk bom 2.56.0 + s3; imageio-webp 3.15.3 (pulls only TwelveMonkeys' own modules, incl. imageio-metadata)
- Accepted details: extra framework error codes NOT_FOUND / METHOD_NOT_ALLOWED / REQUEST_ERROR; non-UUID public detail without token -> 401 (as trail-service); title length checked after trim; 10 MB also checked in the service

Live API evidence (2026-10-16):
- Flyway V1 applied to memory_db; Hibernate validate OK; Tomcat on 8085
- GET/POST /api/memories without token -> 401 AUTHENTICATION_REQUIRED
- GET /api/memories/public?trailId=<real> -> 200 {items:[], totalItems:0}
- GET /api/memories/public?trailId=<random> -> 404 TRAIL_NOT_FOUND (live trail-service call)
- GET /api/memories/public/<random> -> 404 MEMORY_NOT_FOUND
- missing trailId -> 400; size=51 -> 400; invalid bearer on public path -> 401; tampered local photo link -> 404
- live schema: only FK memory_photos->memories; uk_memory_photos_position deferrable; both partial indexes present

Database setup:
- Fresh volume: init-databases.sql creates memory_db
- Pre-FEATURE-008 volume: one-time CREATE DATABASE memory_db; (done on the local outdoor-postgres volume 2026-10-16). Never delete the volume or recreate databases

Known limitations (accepted, non-blocking):
- L-A signed image URL issued before PUBLIC->PRIVATE or deletion works until its 15-minute expiry; no revocation
- L-B photos of a soft-deleted Memory remain in storage; retention/cleanup is possible future work
- L-C re-encoding drops colour profiles and slightly lowers JPEG quality
- L-D S3 adapter tested offline only; no bucket exists
- L-E no signed-in live E2E with a browser token; automated cross-user/auth coverage accepted
- L-F no production routing or dev proxy to memory-service; FEATURE-009 adds the proxy entry

Tooling note: mvn is not on PATH; /Users/jay/.m2/wrapper/dists/apache-maven-3.9.16/56ba1f9f/bin/mvn works from Project/Backend/

Agents completed:
- backend-api (implementation + tests)

Agents skipped:
- ui-ux (no UI; spec approved)
- frontend (no frontend change in 008; proxy entry belongs to FEATURE-009)
- three-d (no 3D)
- qa (browser QA not required; lead ran the API smoke)

Files changed (implementation):
- Project/Backend/memory-service/** (new module)
- Project/Backend/pom.xml (+ <module>memory-service</module>)
- Project/docker/postgres/init-databases.sql (+ CREATE DATABASE memory_db;)

Files changed (docs, lead):
- docs/PRODUCT_REQUIREMENTS.md (pre-cycle F1 roadmap split; closeout decision row + §47 status)
- docs/features/008-memory-foundation.md (spec; frozen; §27 implementation record)
- docs/FRONTEND_CONTEXT.md (closeout F2–F5)
- CLAUDE.md (closeout: memory-service / memory_db setup, roadmap status)

Next:
- None for FEATURE-008 (frozen). FEATURE-009 starts only when the user asks.
