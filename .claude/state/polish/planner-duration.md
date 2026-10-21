# Post-freeze polish: planner duration semantics

Status: PASS (Targeted QA 2026-10-19). Not a feature; no FEATURE-011; freeze active; not committed.
Follows `.claude/state/polish/planner-readiness.md`.

## Previous problem (found in code)
The extraction schema had only `maxDurationMin`, so every duration phrase became an upper bound; `TrailScoringService.scoreDuration` gave full points at or under the value (≈ value/trail above it); eligibility filtered only difficulty and scenery. "around four hours" → a 60-min trail got 10/10 duration points (≈ 99 total); "up to six hours" (360) still scored a 405-min trail ≈ 9/10 and could return it.

## Change (backend, recommendation-service; user-approved)
- Context: `maxDurationMin` kept as the minutes value (wire/storage compatibility) + new `durationMode: APPROXIMATE | MAXIMUM | MINIMUM | null` (null only without a duration; a mode without a value is dropped; unknown mode → 400; optional on requests; old contexts with a value and no mode → MAXIMUM, their old meaning; always in responses). New enum `dto/DurationMode.java`; `RecommendationIntent` carries the mode (missing → MAXIMUM); `PlanningContextDelta` mode (missing with a value → APPROXIMATE).
- Extraction: internal structured output `durationMin` + `durationMode` (no "max" bias); prompt "Duration rules": around/about/roughly/approximately N h, a bare "N hours", "a four-hour hike" → APPROXIMATE; half-day 240, couple of hours 120, a few hours 180, full-day/all day 450, a range → midpoint, all APPROXIMATE; up to / no more than / at most / maximum / under / less than / no longer than → MAXIMUM; at least / N h or longer / or more / more than / over → MINIMUM; explicit number + qualifier wins over a day term. Planner and one-shot `/query` share the mapping.
- Scoring/filtering (duration only): `TrailScoringService.isEligible` adds `matchesDuration` (MAXIMUM excludes longer, MINIMUM excludes shorter) next to difficulty/scenery, used by both `shortlistForWeather` (before any weather call) and `scoreTopTrails`. APPROXIMATE: d = |trail − target| / target; full 10 points at d ≤ 0.15, linear to 0 at d = 0.75 (240 target: 204–276 → 10, 180/300 → 8, 120/360 → 4, 405 → 1, ≤ 60 or ≥ 420 → 0). Within MAXIMUM/MINIMUM: full points. Null trail duration: never excluded, 0 duration points (no duration preference → full 10 as before). Nothing else changed (difficulty/scenery filters, distance, elevation, weather, gear, weights, shortlist 15, weather limit, synthetic data).
- Multi-turn: a later duration replaces value and mode; unmentioned keeps both; named open `TRIP_LENGTH` clears value(s) and mode.
- Wording: ask-once fallback → "I'll leave the difficulty open for now." (or trip length / scenery); explicit no-preference keeps "Got it — I'll keep the difficulty open."; both in one turn → explicit sentence first.
- Files: `dto/DurationMode.java` (new), `dto/PlanningContext.java`, `dto/RecommendationIntent.java`, `dto/PlanningContextDelta.java`, `ai/IntentExtractionOutput.java`, `ai/OpenAiIntentExtractor.java`, `ai/IntentPromptBuilder.java`, `service/ConversationPlannerService.java`, `service/TrailScoringService.java`; tests `dto/PlanningContextTest.java` (new, 6), ConversationPlannerServiceTest 28, TrailScoringServiceTest 14, OpenAiIntentExtractorTest 18, PlannerControllerTest 9, IntentPromptBuilderTest 7, RecommendationServiceTest 9. recommendation-service **114/114 PASS** (was 80). Devtools hot-reloaded the IntelliJ service.

## Change (frontend, planning only)
- `planning/types/planner.ts` (`DurationMode`, optional `durationMode`), `planning/content.ts` (`durationApproximate` "Around {duration}", `durationMaximum` "Up to {duration}", `durationMinimum` "At least {duration}"), `planning/presentation.ts` (`durationSummary()`; missing/unknown mode → "Up to"). `{duration}` uses the existing `formatDuration` ("4 h", "4 h 30 min"). Live: "So far: Around 4 h", "Easy · Up to 6 h", "Moderate · At least 4 h"; context round-trips unchanged (storage version 2). 0 and 1 results render with the existing no-match message / one card.
- Noted, not changed (copy freeze): distance/elevation summary items stay lowercase ("up to 8 km"); backend single-result grammar "I found 1 trail that fit…" (pre-existing).

## Docs
`docs/FRONTEND_CONTEXT.md` §4 conversational planner contract (`durationMode`, duration phrase rules, fallback wording), §6 steps 8 and 10 (duration hard filter before the shortlist, APPROXIMATE curve), §12 stale `DEFAULT_RADIUS_KM` note removed.

## Targeted QA (Playwright fallback, real planner UI, QA-2 account A): PASS
9 AI scenario variants × 3 runs = 27 conversations, identical every run (100 %); ~70 turns, all 200, `durationMode` in every response; 0 console errors, 0 API 4xx/5xx.
- "A half-day hike, around four hours." → APPROXIMATE 240, "Around 4 h"; after "any": Hemlock Tarn Circuit 255 min (97), Spruce Lookout Path 240 (96), Stawamus Chief 240 (96) — no short walks; curve confirmed live (315 min vs 240 → 7 points) and by unit tests (60 min → 0).
- "up to six hours" (+ "any") and "an easy hike, up to six hours" → MAXIMUM 360, nothing over 360.
- "at least four hours" (+ "any") and "a moderate hike, at least four hours" → MINIMUM 240, nothing under 240.
- "A moderate forest hike with a viewpoint, around two hours." → one turn: Quarry Rock 120 min (99), Dog Mountain 120 (98), Bowen Lookout 100 (94).
- "around two hours" → "any" → "actually make it a full-day hike" → APPROXIMATE 450, "Around 7 h 30 min" (405/460/440 min) → "any trip length" → cleared, TRIP_LENGTH open, "Any trip length", results, no repeat question.
- "hmm" → "I'll leave the difficulty open for now."; "any" → "Got it — I'll keep the difficulty open.".
- Regression: EASY/MODERATE/HARD and scenery filters held in every set; "I'm flexible"; reload keeps context incl. durationMode; old context without durationMode → summary "Up to 4 h", backend MAXIMUM, results ≤ 240; sample disclosure; Trail Detail → Preparation "Gear Readiness" unchanged. build 0, lint 0, recommendation-service 114/114 (scratch copy).
- LOW backlog: MAXIMUM gives full duration points to any trail within the bound, so "up to six hours" returns ~1 h trails at 99 (correct per the stated rules; product decision); summary distance/elevation items lowercase; backend "I found 1 trail that fit…" grammar. Weather calls per turn not observed live (covered by unit tests).
