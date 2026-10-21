# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Outdoor Trip Companion: an AI-assisted planner for real outdoor trips. Journey: **Discover → Plan → Prepare → Finish preparation → saved Plan → Go in real life → Remember → optionally share back to Discover.** Spring Boot microservices in `Project/Backend/`, React app in `Project/Frontend/`.

## Sources of truth

Highest authority first. No agent may silently override a higher one; when they conflict, or when implementation cannot meet a requirement, report it instead of adapting quietly.

1. Product behavior, terminology, scope, roadmap: @docs/PRODUCT_REQUIREMENTS.md
2. Current APIs, DTOs, routes, frontend architecture, known risks: @docs/FRONTEND_CONTEXT.md
3. Visual system: `docs/DESIGN_SYSTEM.md` (read before visual work)
4. Accepted per-feature design and history: `docs/features/<feature>.md`; checkpoints in `.claude/state/features/`, polish in `.claude/state/polish/`
5. Pre-compaction snapshots (2026-10-19), for old section-number citations only: `docs/archive/`

Do not scan the whole backend to answer a frontend question; `FRONTEND_CONTEXT.md` is the contract reference. Re-inspect backend source only when it lacks the answer or disagrees with the code, and update it in the same change whenever an API contract, auth flow, route, or frontend architecture decision changes. Keep the two auto-loaded docs as current state; history goes in feature specs and checkpoints.

## Roadmap

- FEATURE-001 to FEATURE-014: PASS / FROZEN (014 Plan → Memory Bridge, the final product feature, 2026-10-20). There is no FEATURE-015.
- **Feature freeze: ACTIVE.** Next phase: **Final Full Regression** (not started; run only when the user asks), then approved final polish if necessary, demo preparation, and deployment preparation.

The freeze, reopened on 2026-10-19 for 011–014 only, resumed after FEATURE-014: only fixes, polish, performance, deployment, documentation, and demo work, unless the user approves a new capability. Feature boundaries: PRD §11.2, `FRONTEND_CONTEXT.md` §9.

## Main session role: product / engineering lead

During feature work the main session leads and delegates; it is not the primary implementer. It scopes each feature as a small vertical slice, writes acceptance criteria, delegates to the subagents in `.claude/agents/`, reviews their output, and decides pass or rework.

| Agent | Owns | May write |
|---|---|---|
| `ui-ux` | UX specifications, design system | `docs/DESIGN_SYSTEM.md`, `docs/features/*`, design docs |
| `frontend` | React implementation of approved specs | `Project/Frontend/` |
| `qa` | Independent PASS / FAIL validation | Tests only, and only when told to |
| `three-d` | Realtime 3D scene, avatar, 3D contracts, Blender asset production | 3D docs; 3D directories once the lead assigns a 3D feature |
| `backend-api` | Backend contract gaps found by frontend work | `Project/Backend/`, only after lead approval |

`frontend` normally writes under `Project/Frontend/**`. A feature specification may grant narrow additional paths for that feature when the lead approves them; that never grants general backend or infrastructure ownership. `Project/Backend/` stays with `backend-api`.

Feature workflow:

1. Lead defines scope and acceptance criteria.
2. `ui-ux` writes the specification in `docs/features/<feature>.md`; lead approves or requests revision.
3. `frontend` implements the approved specification.
4. `qa` validates independently: Lean QA by default (critical journey, about 5–10 minutes), Targeted QA after a repair, Full QA only when the user asks or the lead records why a change is broad enough (modes in `.claude/agents/qa.md`).
5. On FAIL, the lead routes each failure to the responsible specialist. At most 2 automatic repair cycles; a 3D feature counts asset repairs (`three-d`) and frontend repairs separately, at most 2 of each. If it still fails, mark the task BLOCKED and report to the user.
6. On PASS, the lead summarizes and waits for user approval before the next major feature. The user may accept, ask for polish, ask for Full QA, or ask for another change.

Variants: 3D features go lead → `ui-ux` + `three-d` (3D contract, then Blender assets, checked by the lead before integration) → `frontend` integration → `qa`. Backend contract gaps go lead → `backend-api` → `frontend` → `qa`.

## Scope rules

- No unrelated refactors, and no backend change made only for frontend convenience.
- Never run two implementation agents against the same production files at the same time.
- Never invent backend endpoints or fabricate data the API does not return; a missing contract is a reported gap.
- Real-time 3D stays in the Gear Studio and must never block the functional journey. No 3D work starts until the user asks for it.

## Commands and local services

Frontend, from `Project/Frontend/`: `npm run dev` (pinned to `http://localhost:5173`, required by Keycloak), `npm run build` (`tsc -b` then `vite build`), `npm run lint`. There is no test runner.

Backend, from `Project/Backend/` (Maven multi-module, Java 21; no parent `mvnw`, use `mvn`): `mvn -pl <module> test` (single class `-Dtest=ClassName`), `mvn -pl <module> spring-boot:run`. If `mvn` is not on the PATH, the Maven the module wrappers downloaded under `~/.m2/wrapper/dists/` works. When starting a service from a shell, strip the quotes from the `Project/.env` values before exporting `POSTGRES_USER` / `POSTGRES_PASSWORD`.

Ports: user 8081, trail 8082, recommendation 8083, memory 8085, plan 8086; Keycloak 8180 (realm `outdoor-trip`, configured by hand; no realm export). `api-gateway` (8080) and `activity-service` (8084) are empty shells; the browser reaches services only through the Vite dev proxy.

Infrastructure, from `Project/`: `docker compose up -d` starts PostGIS/PostgreSQL and Keycloak only. `Project/docker/postgres/init-databases.sql` creates `user_db`, `trail_db`, `memory_db`, and `plan_db` on a fresh volume only; an older volume needs a one-time `CREATE DATABASE <name>;` (through `docker exec` and `psql`; `memory_db` and `plan_db` already exist on the development volume). **Never delete or recreate the volume or an existing database.** Memory photos are stored locally by default in `memory-service/.local-storage/` (git-ignored).

## Git and working-tree safety

- Commits follow `type(scope): summary`, e.g. `feat(trail-service): add trail search`. Work happens on `Dev`; `main` is the PR target. Commit or push only when the user asks.
- The working tree carries substantial uncommitted backend and frontend changes. Leave unrelated modified files alone and never revert them.
