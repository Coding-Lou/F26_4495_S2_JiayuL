Workflow: FINAL FULL REGRESSION after FEATURE-014 (feature freeze active; not a feature cycle; no FEATURE-015)
Branch: Dev_Frontend
Started: 2026-10-20 23:20
Status: IN_PROGRESS
Mode: FULL (user-requested) — grouped journeys, P0 all, practical P1, representative P2
Previous regression: .claude/state/final-regression.md (2026-10-19, FEATURE-001–010; COMPLETE) and .claude/state/polish/final-polish.md
Commit / push: NONE (user instruction)
Production code changed: none so far

## Environment (pre-flight 2026-10-20 23:20)

- Frontend: Vite dev server :5173 (pid 86555, running, reused)
- user-service :8081, trail-service :8082, recommendation-service :8083, memory-service :8085, plan-service :8086: all listening (reused)
- Keycloak :8180 (docker outdoor-keycloak, up), PostgreSQL/PostGIS :5432 (docker outdoor-postgres, up); volumes and databases untouched
- api-gateway :8080, activity-service :8084: not running, not required (empty shells)
- Browser tooling: Chrome DevTools MCP not available to the qa agent (FEATURE-014 runs) → Playwright fallback (Python, channel chrome)

## Build / static

- Frontend `npm run build`: exit 0 (known >500 kB chunk warning only)
- Frontend `npm run lint`: exit 0
- Backend tests (`mvn -B -fae -pl user-service,trail-service,recommendation-service,memory-service,plan-service test`, wrapper Maven 3.9.16, POSTGRES_* exported from Project/.env without printing): BUILD SUCCESS, exit 0
  - user-service 21/21, trail-service 27/27 (the 5 DB-backed tests NOT RUN on 2026-10-19 now run and pass), recommendation-service 114/114, memory-service 95/95, plan-service 43/43 — 300 run, 0 failures, 0 errors, 0 skipped
  - Services still answering after the run (all five 401 on actuator without a token; public trails 200)

## QA batches (parallel; separate QA accounts and trails)

| Batch | Scope | Result |
|---|---|---|
| FR-1 | Public Landing (001), Discover + search (006), Community public read + PRIVATE not exposed (010 signed-out), Auth (002) incl. Keycloak registration 400 investigation, Safari availability | Part 1 (stopped early at the lead's status ping): A Landing PASS, B Discover PASS (clusters, selection, deep link row 51 + D1 still fixed, search, settled requests, wheel, failure states; O1 still present). O-FR1-1 OBSERVATION: dev StrictMode duplicates preview / default nearby (first aborted). Safari: no WebKit, safaridriver not enabled-checked → NOT RUN. Part 2 resumed: Community PRIVATE, Auth + registration 400, sweeps |
| FR-2 | Golden path: Discover → sign in → Planner (3 phrases, 003) → Trail Detail (004) → Preparation (004) → My Gear (007) → Studio (005) → Finish (011) → Ready-to-Go (012) → /plans → Past → Add memory → PRIVATE → View memory → PUBLIC → signed-out Community | in flight |
| FR-3 | My Plans / Calendar (013), Plan → Memory bridge incl. multiple matches + detection failure + AC-30 (014), LocalDate / boundaries / time zone, two-user isolation, error states | in flight |
| FR-4 | My Memories (008/009) CRUD, photos, ordering, pagination, visibility, delete; Community Memories (010) preview / detail / pagination / PRIVATE hidden / no author identity | in flight |

## Findings

(none yet)

## Repairs

(none)

## Next

- Collect FR-1..FR-4 and backend test results; classify findings; repair only BLOCKER/HIGH (narrowest fix + Targeted QA + affected portion rerun); MEDIUM/LOW recorded for product decision
- Final report; stop at the Release / Product Gate
