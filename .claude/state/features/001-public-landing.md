Feature: 001-public-landing
Spec: docs/features/001-public-landing.md
Branch: Dev_Frontend
Phase: CLOSED
Status: PASS
Updated: 2026-10-11

Design: APPROVED (Design System V2, spec section 11 synchronized, Lead-approved 2026-10-11)
Frontend: COMPLETE (repair 1 applied: scrim stacking fix in landing.css and hero-media/HeroMedia.tsx)
Build: PASS (frontend, after repair 1, exit 0)
Lint: PASS (frontend, after repair 1, exit 0)
QA: PASS (run 1: 49 of 50 active criteria passed, AC-39 failed at 320x568; rerun after repair 1: AC-39 and all regressed criteria pass)
Lead scope review: PASS (backend untouched, newest backend file dated 2026-10-10; no Keycloak, API call, or 3D import in the landing; no new dependency)

Repair cycle: 1/2

Agents completed:
- ui-ux (design system V2 + spec section 11; earlier session, not invoked this session)
- frontend (implementation; resume audit 2026-10-11)
- qa (run 1, 2026-10-11)
- frontend (repair 1, 2026-10-11)
- qa (rerun, 2026-10-11)

Agents skipped:
- backend-api (no API in this feature)
- three-d (no realtime 3D in this feature)

State found on disk at recovery:
- All 16 modules of spec 11.14 exist under Project/Frontend/src
  (pages/PublicLandingPage, features/landing/*, features/landing/hero-media/*,
  features/auth/authBoundary, features/planning/pendingPrompt).
- Routing: "/" renders PublicLandingPage outside AppLayout; Home placeholder at "/home".
- Three video scenes configured in hero-media/scenes.ts, 5000ms each.
- No Keycloak, no 3D library, no backend call from the landing.
- Last files touched before the interruption: landing.css, hero-media/SceneMedia.tsx.

Files changed (FEATURE-001, all under Project/Frontend/):
- src/app/router/routes.tsx
- src/pages/PublicLandingPage.tsx
- src/features/landing/** (LandingHero, LandingNav, HeroIntro, PlannerPrompt,
  PromptSuggestions, PlannerMessage, usePlannerPrompt, content, landing.css)
- src/features/landing/hero-media/** (scenes, HeroMedia, SceneMedia, SceneControl,
  SceneRotationProvider, sceneRotationContext, useSceneRotation)
- src/features/auth/authBoundary.ts
- src/features/planning/pendingPrompt.ts, planningPrompt.ts
- src/index.css
- public/media/hero/* (delivered media, not edited)

Unresolved failures:
- none

Resolved in repair 1:
- AC-39 at 320x568: scrims painted over the nav controls ("Sign in" min 3.46:1, 2.77 with a
  message). Fix: .landing is the only stacking context; media wrapper z-index -2, both scrims -1,
  header/main/brand/content carry no z-index or isolation. After the fix "Sign in" measures at
  least 7.26:1 in every case tested and all 1,953 layout values match the first QA run.
  Do not add z-index, isolation, transform, filter, or opacity < 1 to the header, main, brand
  wrapper, or content block: it recreates the bug (comment left in landing.css).

Lead decisions on frontend findings (not failures):
- Supporting text renders on 1 line (584px < 620px cap) at 1920x1080 on macOS, so heading sits
  about 24px lower than the expected-positions table in spec 11.2. The layout rules are built as
  written and the spec says rules outrank predicted positions. Accepted; QA judges by section 10 ACs.
- index.html has no viewport-fit=cover, so safe-area insets resolve to 0. Left as is: the file is
  shared by every page and no AC requires it.
- /favicon.ico 404 in the console. Predates this feature (favicon removed with the old frontend).
- docs/FRONTEND_CONTEXT.md route table and folder tree updated by the Lead ("/" is the landing,
  Home placeholder is "/home").

Not verified by QA (Chrome 155 only):
- real screen reader output, iOS Safari / Firefox / real devices, on-screen keyboard,
  true 200% browser zoom (emulated as 720x450 and 960x540), forced-colors mode,
  background-tab suspension

Known limitations carried forward:
- /favicon.ico 404 (no favicon in the project)
- index.html has no viewport-fit=cover (safe-area insets are 0)
- NotFoundPage "Return home" links to "/", which is now the Public Landing
- A video that never answers keeps later videos from loading; posters still rotate (spec 11.9 as written)
- Hero media is used as delivered: 12-20 MB videos, 2.5-3.2 MB PNG posters (spec open question 2)
- Layering z-index values (-2, -1) and a 2px icon offset are not spec-enumerated values (AC-44 note)
- Spec 11.2 / 11.5 predicted positions differ from the build where text wraps differently
  (supporting text 1 line at 1920x1080; tablet chips on 1 row). Rules are built as written.

QA evidence: session scratchpad qa-001/ (shots/, shots2/, *.json). Not persisted in the repo.

Next:
- STOP. Human product gate: user reviews FEATURE-001 before any FEATURE-002 work.
- Nothing is committed; committing is the user's call.
