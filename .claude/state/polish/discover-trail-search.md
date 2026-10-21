# Post-freeze polish: Discover trail name search

Status: PASS (Targeted QA, 2026-10-19). Not a feature; no FEATURE-011. Not committed.

Scope: frontend only, `Project/Frontend/src/features/discover/**`. No backend, seed, planner, Community Memories, My Memories, gear or 3D change.

Files: new `search/matchTrails.ts`, `search/useTrailSearch.ts`, `search/CatalogRequest.ts`, `components/TrailSearchField.tsx`, `components/TrailSearchResults.tsx`; edited `components/DiscoverSection.tsx`, `map/mapTypes.ts`, `map/runtime/trailMapRuntime.ts` (`focusOn`, zoom getter), `map/TrailMap.tsx`, `content.ts`, `discover.css`. Docs: `docs/FRONTEND_CONTEXT.md` section 4 mapping table, section 8 (search paragraph), section 12 limitation B.

Design: pool = curated `GET /api/trails` (first focus only, cached) ∪ whole loaded `/nearby` set, merged by id; exact > prefix > contains; cap 12; ARIA 1.2 combobox; pick → `trail` param, `focusOn` zoom ≥ 12, existing settle → `/nearby`, popup, focus to row. Deep-link locate stage generalised: resolves on the first settled view after the move.

Targeted QA (Playwright fallback, 1440×900 + 390×844, reduced motion): 13/13 PASS. Hero-only visit 0 API requests; 1 `GET /api/trails` per session; 0 requests per keystroke; 1 `/nearby` per settled pick. Quarry Rock found while absent from the 50 rows; synthetic Juniper Bluff Loop found; no-match state; keyboard; cluster/marker/popup/deep-link regressions clean; build 0, lint 0. Evidence: session scratchpad `qa-search/`.

Defect found (LOW, pre-existing, polish backlog): drag released over the trail popup does not end MapLibre's pan, so no settled update/`/nearby` until the next mouse move (cause of FRONTEND_CONTEXT limitation B). CDP-simulated input only.

Not run: real screen reader, Safari, physical phones, failed `GET /api/trails` note.
