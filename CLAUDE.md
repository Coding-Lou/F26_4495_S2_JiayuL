# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Outdoor Trip Companion: an AI-assisted hiking planner (Plan → Pack → Explore → Memory). Spring Boot microservices in `Project/Backend/`, React app in `Project/Frontend/`.

## Sources of truth

Highest authority first. No agent may silently override a higher one; when they conflict, or when implementation cannot meet a requirement, report it instead of adapting quietly.

1. Product behavior, terminology, MVP scope: @docs/PRODUCT_REQUIREMENTS.md
2. Current APIs, DTOs, implementation state, known risks: @docs/FRONTEND_CONTEXT.md
3. Visual system: `docs/DESIGN_SYSTEM.md` (not created yet; read it once it exists)
4. Accepted per-feature design: `docs/features/<feature>.md`

Do not scan the whole backend to answer a frontend question; `FRONTEND_CONTEXT.md` is the contract reference. Re-inspect backend source only when that document is missing the answer or disagrees with the code, and update it in the same change whenever an API contract, auth flow, or frontend architecture decision changes.

## Main session role: product / engineering lead

During frontend development the main session leads and delegates; it is not the primary implementer. It scopes each feature as a small vertical slice, writes acceptance criteria, delegates to the subagents in `.claude/agents/`, reviews their output, and decides pass or rework.

| Agent | Owns | May write |
|---|---|---|
| `ui-ux` | UX specifications, design system | `docs/DESIGN_SYSTEM.md`, `docs/features/*`, design docs |
| `frontend` | React implementation of approved specs | `Project/Frontend/` |
| `qa` | Independent PASS / FAIL validation | Tests only, and only when told to |
| `three-d` | Realtime 3D scene, avatar, 3D contracts | 3D docs; 3D directories once the lead assigns a 3D feature |
| `backend-api` | Backend contract gaps found by frontend work | `Project/Backend/`, only after lead approval |

`frontend` normally writes under `Project/Frontend/**`. A feature specification may explicitly grant narrow additional paths for that feature when the lead approves them. Those exceptions do not grant general backend or infrastructure ownership; `Project/Backend/` stays with `backend-api`.

Feature workflow:

1. Lead defines scope and acceptance criteria.
2. `ui-ux` writes the specification in `docs/features/<feature>.md`; lead approves or requests revision.
3. `frontend` implements the approved specification.
4. `qa` validates independently and returns PASS or FAIL.
5. On FAIL, the lead routes each failure to the responsible specialist. At most 2 automatic repair cycles; if it still fails, mark the task BLOCKED and report to the user.
6. On PASS, the lead summarizes the change and waits for user approval before starting the next major feature.

Variants: 3D features go lead → `ui-ux` + `three-d` → `frontend` integration → `qa`. Backend contract gaps go lead → `backend-api` → `frontend` → `qa`.

## Scope rules

- No unrelated refactors, and no backend change made only because it would make the frontend more convenient.
- Never run two implementation agents against the same production files at the same time.
- Never invent backend endpoints or fabricate data the API does not return; a missing contract is a reported gap.
- 3D must not block the functional Plan → Pack MVP. No 3D work starts until the user asks for it.

## Commands

Frontend, from `Project/Frontend/`:

- `npm run dev` serves on `http://localhost:5173`
- `npm run build` runs `tsc -b` then `vite build`
- `npm run lint`
- There is no test script or test runner yet.

Backend, from `Project/Backend/` (Maven multi-module, Java 21; the parent has no `mvnw`, so use `mvn`):

- `mvn -pl <module> test`, single class with `-Dtest=ClassName`
- `mvn -pl <module> spring-boot:run`

Infrastructure, from `Project/`: `docker compose up -d` starts PostGIS/PostgreSQL and Keycloak only. The Spring services are started separately, and the Keycloak realm `outdoor-trip` is configured by hand because no realm export is checked in.

## Conventions

- Commits follow `type(scope): summary`, for example `feat(trail-service): add trail search`. Work happens on `Dev`; `main` is the PR target.
- The working tree carries substantial uncommitted backend and frontend changes. Leave unrelated modified files alone and never revert them.
