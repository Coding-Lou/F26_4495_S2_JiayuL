# FEATURE-001 — Public Landing + Cinematic CG Hero

| | |
|---|---|
| Status | Scope and acceptance criteria defined by Lead. Design (section 11) synchronized to Design System Version 2 (Desktop-First Cinematic Web) and approved by the Lead for implementation on 2026-10-11. |
| Owner | Lead (scope, acceptance), `ui-ux` (section 11), `frontend` (implementation, later step) |
| PRD references | §4.7, §7.1–7.7, §36, §38, §39, §40.1, §41–45.1, §57 |
| Depends on | No authentication and no API. Hero media: the delivered files in `Project/Frontend/public/media/hero/` (section 5). |

Sections 1–10 are the Lead's scope and are the bar the implementation is judged against. Section 11 is the design specification, owned by `ui-ux`. If section 11 needs to depart from sections 1–10, `ui-ux` reports it to the Lead instead of changing them.

## 1. Feature Goal

Deliver the page an unauthenticated visitor sees first. In one screen it must:

- communicate the product identity: an outdoor trip companion that plans around trail, weather, and gear;
- create the desire to explore, by letting a cinematic outdoor scene dominate the screen;
- let the visitor express trip intent immediately, through a single planning input, before any sign-in;
- hand off to authentication at the moment the visitor starts planning, without losing what they typed.

This is the **Public Landing**. It is not the **Authenticated Home**: it shows no personalized state, no avatar, no real-time 3D, no recommendations, and no product navigation into authenticated areas. Its hero is a pre-rendered media layer showing the delivered scene media (section 5).

## 2. User Story

As an unauthenticated visitor, I want to understand at a glance what this product does and describe the outdoor trip I have in mind in my own words, so that I can begin planning straight away and only be asked to sign in once I have something worth signing in for.

Supporting stories:

- As a visitor who does not know what to type, I want a few example requests I can pick, so that I can start from one instead of a blank input.
- As a returning user, I want an obvious Sign In entry point that does not require me to type a prompt first.
- As a visitor using a keyboard, a screen reader, a phone, or reduced-motion settings, I want the same planning input and sign-in path to work for me.

## 3. Primary User Flow

```text
Visitor opens "/"
        ↓
Sees the cinematic scene, heading, supporting line, and planning input
        ↓
Types a request, or picks a suggested prompt (which fills the input)
        ↓
Activates the primary action
        ↓
Prompt is validated and saved
        ↓
Authentication is required  ← auth boundary (placeholder in this feature)
        ↓
[later feature] Login / Register → Authenticated Home with the prompt restored
```

In this feature the flow ends at the auth boundary. Because authentication is not implemented, the visitor stays on the landing page, is told that sign-in is required and not available yet, and keeps their prompt. The Authenticated Home is not designed or built here.

Alternate paths:

- **Sign In directly.** The visitor activates Sign In in the navigation. The same auth boundary is invoked without requiring a prompt.
- **Empty prompt.** The visitor activates the primary action with nothing typed. The auth boundary is not invoked and the visitor is told a request is needed.
- **Return to the page.** A visitor who reached the auth boundary and reloads the landing finds their prompt still in the input.

## 4. Hero Content Requirements

The page is a single full-viewport hero. There are no feature sections, pricing, testimonials, or other marketing blocks below it in this feature.

Information hierarchy, most to least prominent:

| Rank | Element | Requirement |
|---|---|---|
| 1 | Cinematic background layer | Fills the viewport edge to edge behind everything. The largest visual element on the page. Decorative only. |
| 2 | AI planning input + primary action | The primary interaction and the visual focal point of the foreground. One input, one action. |
| 3 | Hero heading | One `h1`. Baseline copy: "Plan your next outdoor adventure". |
| 4 | Supporting text | One short sentence, at most about 20 words, stating that the product plans around trail, weather, and gear. |
| 5 | Suggested prompts | 3 to 5 prompts, visually subordinate to the input. |
| 6 | Navigation | Product name or logo on one side, Sign In on the other. Nothing else is required. |

Fixed content decisions:

- **Input prompt (label):** "Where do you want to go?"
- **Input example (placeholder):** "A moderate lake hike this Saturday"
- **Suggested prompts** are drawn from this list (PRD §7.3): "Easy hike near Vancouver", "Lake view trail", "Rain-friendly short hike", "Fall foliage hike", "Moderate mountain hike this weekend".
- **Navigation** contains no links to authenticated areas (Home, Gear, Explore, Trips, Profile). Those destinations do not exist for a visitor.
- **Not allowed in the hero:** dashboard widgets, feature cards or panels, charts, statistics, carousels of content, badges, or more than one primary action.

`ui-ux` may refine wording, and may add one short per-scene caption reflecting the scene's product meaning (PRD §7.6) if it stays subordinate to rank 5. Any other added element needs Lead approval.

## 5. CG Background Contract

The background is a **replaceable media layer**: a self-contained component driven by an ordered list of scene definitions. The page around it must not know or care whether a scene is a still image or a video.

### Scenes

| Order | Id | Scene | Product meaning |
|---|---|---|---|
| A | `alpine-lake` | Sunny Alpine Lake | Discover somewhere beautiful |
| B | `rain-forest` | Rainy Pacific Northwest Forest | Plan around the weather |
| C | `mountain-ridge` | Cold Mountain Ridge | Prepare for the conditions |

Playback order is A → B → C → A, looping indefinitely.

### What each scene definition carries

- a stable id and a human-readable name;
- a short caption stating the scene's product meaning (the right-hand column of the table above);
- its media, in one of two forms: **still image**, or **video with a poster still**;
- its display duration. The layer must accept any per-scene value in the 5–10 second range (6–8 preferred when the media allows it). A scene's duration is measured from the start of its fade-in to the start of the next scene's fade-in, so it includes the cross-fade;
- a focal point, expressed as an object-position, so that cover-cropping on narrow or short viewports keeps the intended part of the frame in view.

### Behavior the layer must support

- **Dominant and behind.** The layer covers the full hero area at every viewport size with no letterboxing and no stretching, and sits beneath all foreground UI.
- **Soft transitions.** Consecutive scenes cross-fade; there is never a hard cut or an empty frame between scenes, including the C → A loop.
- **Replaceable.** Swapping a scene's media for another file, or for the other kind, is done by changing that scene's definition and adding the asset files. No change to the page layout, the foreground components, or the transition logic is needed.
- **Functional first.** Heading, input, primary action, suggestions, and Sign In are rendered and usable before any media has loaded, and remain usable if media fails to load. A base background is always present beneath the media.
- **Silent and inert.** Media never plays audio (including when a video file contains an audio track), never shows native player controls, is not focusable, and is hidden from assistive technology.
- **Controllable.** Because the background changes automatically, the visitor can pause and resume it (see section 8).
- **Readable foreground.** Foreground legibility is guaranteed by a treatment between the media and the UI that does not depend on what the media contains (see section 8).

### Media for this feature

The delivered files live in `Project/Frontend/public/media/hero/`, are served from the site root, and are used as delivered.

| Id | Media kind | Source | Poster |
|---|---|---|---|
| `alpine-lake` | video | `/media/hero/scene1.mp4` | `/media/hero/scene1.png` |
| `rain-forest` | video | `/media/hero/scene2.mp4` | `/media/hero/scene2.png` |
| `mountain-ridge` | video | `/media/hero/scene3.mp4` | `/media/hero/scene3.png` |

All three videos are 1916×1080, H.264, and 5.04 seconds long. All three posters are 1672×941. The still-image kind remains part of the contract; no scene uses it today. No 3D asset and no 3D library is involved. Playback, loading, and failure behavior are specified in section 11.9.

### Out of this contract

Video-generation prompts, art production, codecs, re-encoding, and delivery or streaming technology are not decided here. Section 11.7 records the composition guidance later CG must respect: which regions of the frame the foreground UI occupies at each reference viewport.

## 6. Interaction Requirements

### Planner input

- A single-purpose text input for a natural-language trip request.
- A valid prompt is non-empty after trimming whitespace and at most 2000 characters, measured on the trimmed value (the limit of the backend `RecommendationQueryRequest.message`, so that a prompt accepted here is accepted later).
- Pressing Enter in the input is equivalent to activating the primary action.
- The input is not focused automatically on page load.

### Suggested prompts

- Selecting a suggestion **populates** the input with that suggestion's text, replacing its current content, and moves focus to the input. It does **not** submit.
- The visitor can then edit the text or activate the primary action. This keeps the visitor in control and avoids an unexpected authentication prompt from a single tap.

### Primary action

- With a valid prompt: the trimmed prompt is saved (see Prompt preservation), then the auth boundary is invoked once with the reason "start planning" and the prompt.
- With an empty or whitespace-only prompt: the auth boundary is not invoked, nothing is saved, and the visitor is told in text that a request is needed. Focus goes to the input.
- With a prompt over the limit: the visitor cannot submit it and is told the limit in text.

### Sign In

- Invokes the same auth boundary with the reason "sign in". No prompt is required.
- If the input currently holds a valid prompt, that prompt is saved first, so that signing in from the navigation does not discard it.

### Unauthenticated planning behavior and the auth boundary

All authentication entry goes through **one** boundary in the frontend (a single function or hook) that receives the reason and the optional prompt. Real authentication will later replace the body of that boundary without changes to the landing components.

In this feature the boundary is a placeholder. When invoked it must:

- leave the visitor on the landing page, with no navigation;
- cause a visible, screen-reader-announced message stating that sign-in is required to plan a trip, that sign-in is not available yet, and (when a prompt was saved) that the request has been kept;
- leave the prompt in the input, still editable.

It must not:

- call any backend API or external service;
- display, simulate, or imply a recommendation, a trail result, a results-loading state, or any wording suggesting that planning has happened;
- pretend the visitor is signed in, or route to the Authenticated Home.

This message state is also the future recovery path for a cancelled or failed authentication (PRD §7.5), so it should be designed as a lasting part of the page, not as throwaway scaffolding.

### Prompt preservation

- A saved prompt is stored client-side for the browser tab's session, under a single named key defined in one place, so that the future Authenticated Home can read it after an authentication redirect.
- On loading the landing page, a saved prompt is restored into the input.
- Storage being unavailable must not break the page; the flow continues without preservation. The auth boundary is told whether the prompt was actually saved, so that its message never claims a save that did not happen.

## 7. Responsive Requirements

The Public Landing is desktop-first. Primary reference viewports: **1920×1080** and **1440×900**. Secondary validation viewports: **1366×768**, **1280×800**, **768×1024** (tablet), and **390×844** (mobile). The layout must also hold at 320px width, the application's minimum (checked at 320×568).

| Concern | Large desktop (≥1440px) | Laptop (1024–1439px) | Tablet (768–1023px) | Mobile (<768px) |
|---|---|---|---|---|
| Hero height | Fills the viewport; no vertical scroll needed to reach any hero element at 1920×1080 and 1440×900 | Fills the viewport; no vertical scroll needed at 1366×768 and 1280×800 | Fills the viewport | Fills at least the visible viewport, accounting for mobile browser chrome; content may scroll if it cannot fit |
| Foreground width | Constrained to 1280px and centered; above 1920px the media keeps filling while the foreground stays that size | Viewport minus gutters | Viewport minus gutters | Viewport minus gutters of at least 16px |
| Hero text | Heading, supporting text, and input each have their own capped width; heading at most 2 lines | Same | Heading at most 2 lines | Heading at most 3 lines; no text smaller than 16px for the input, 14px elsewhere |
| Input width | 720px | 660px | 640px, or the available width if smaller | Full content width |
| Primary action | Integrated inside the input's field | Same | Same | Same; never off-screen |
| Suggestion chips | One or two rows | One or two rows | Wrap to multiple rows | Wrap to multiple rows; no chip truncated or clipped |
| Navigation | Brand left, Sign In right, inside the 1280px foreground | Same two items | Same two items | Same two items; no hamburger menu is needed because there are only two |
| CG area | Full-bleed cover crop positioned by each scene's focal point | Same | Same | Same; substantial crop is expected |
| Touch targets | n/a for a fine pointer | n/a for a fine pointer | At least 44×44 CSS px | At least 44×44 CSS px, with at least 8px between adjacent targets |

At every width from 320px upward there is no horizontal page scroll. When the on-screen keyboard is open on mobile, the input and primary action remain reachable.

## 8. Accessibility Requirements

- **Input label.** The planner input has a programmatically associated label ("Where do you want to go?"). Placeholder text is not the label.
- **Semantics.** One `h1`. Navigation in a `nav` landmark, hero content in `main`. The primary action, Sign In, each suggestion, and the pause control are native buttons (or links where they navigate) with accessible names. An icon-only control has a text name.
- **Keyboard.** Every interactive element is reachable and operable by keyboard alone, in an order that matches the visual order: brand, Sign In, input, primary action, suggestions, background pause control. There are no keyboard traps.
- **Focus.** Every interactive element shows a visible focus indicator that is distinguishable against any of the three scenes.
- **Messages.** Validation and auth-boundary messages are text, are associated with the input or exposed through a live region so they are announced, and never rely on color alone.
- **Motion.** When the visitor's system requests reduced motion, the background starts paused: it shows a single static scene, does not auto-advance, does not cross-fade, and plays no video. The system setting decides the starting state only; the visitor may still start the background deliberately with the pause/play control. All foreground functions remain available.
- **Pause control.** Independently of system settings, a visible control pauses and resumes the background rotation (WCAG 2.2.2, which applies because the background changes automatically for longer than five seconds).
- **Contrast.** Heading, supporting text, labels, chip text, and navigation text meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text and for the boundaries of interactive controls) over every scene and during transitions. This must hold for arbitrary future media, so it is achieved by a scrim, surface, or equivalent treatment between media and UI, and must still pass if the media were a plain white frame.
- **Zoom.** At 200% browser zoom on desktop, all content and functions remain available without horizontal scrolling.

## 9. Explicit Non-Goals

- No real authentication, Keycloak integration, login or registration screens, or route guards.
- No recommendation API integration and no calls to any backend service.
- No trail result cards, no mocked or sample recommendations, no results-loading state.
- No Authenticated Home design or implementation.
- No real-time 3D, no 3D libraries, no 3D assets.
- No avatar.
- No CG production, no editing or re-encoding of the delivered media, no video-generation prompts.
- No backend changes of any kind.
- No redesign of the downstream Plan → Pack flow, Trail Detail, or Gear pages.
- No marketing sections below the hero, no footer content beyond what `ui-ux` shows to be necessary.
- No test framework setup (none exists yet; adding one is a separate decision).

## 10. Acceptance Criteria

Each criterion is checked at the reference viewports in section 7 unless it says otherwise. Pixel positions carry a tolerance of ±8px for system-font metrics.

### Routing and separation

- **AC-01** Visiting `/` renders the Public Landing. It is rendered outside the existing application layout: the application header with "Home" and "Gear" links is not present on it.
- **AC-02** The existing Home placeholder remains reachable at `/home`, and `/gear`, `/trails/:trailId`, and the not-found route behave as they did before this feature.
- **AC-03** The landing contains no link or control that navigates to `/home`, `/gear`, or any other authenticated area.

### Hierarchy and content

- **AC-04** The page contains exactly one `h1`, one planner text input, one primary action, a Sign In control, and between 3 and 5 suggested prompts whose texts come from the list in section 4.
- **AC-05** The background media layer covers 100% of the hero's width and height with no visible gaps or letterboxing, and every foreground element renders above it.
- **AC-06** The hero contains none of: cards or panels describing features, charts, statistics, a second primary action, or content sections below the hero.
- **AC-07** At 1920×1080, 1440×900, 1366×768, and 1280×800 every element in AC-04 is visible without scrolling, both in the default state and with the tallest message of section 11.11 shown.

### Planner input and suggestions

- **AC-08** The input has an associated label reading "Where do you want to go?" and is not focused on page load.
- **AC-09** Selecting a suggestion sets the input's value to exactly that suggestion's text, moves focus to the input, and does not invoke the auth boundary.
- **AC-10** A prompt whose trimmed length exceeds 2000 characters cannot be submitted: the auth boundary is not invoked, nothing is saved, and the visitor is told the limit in text. Pasted text is not silently truncated.

### Auth boundary

- **AC-11** Activating the primary action, by click or by Enter in the input, with a valid prompt invokes the auth boundary exactly once with the reason "start planning" and the trimmed prompt.
- **AC-12** Activating the primary action with an empty or whitespace-only input does not invoke the auth boundary, saves nothing, shows a text message that a request is needed, and moves focus to the input.
- **AC-13** Activating Sign In invokes the auth boundary with the reason "sign in", whether or not the input is empty.
- **AC-14** All invocations go through a single auth-boundary module; the landing components contain no other authentication logic.
- **AC-15** After the boundary is invoked, the URL is unchanged, a visible message states that sign-in is required and not yet available, the message is announced to assistive technology, and the input still contains the prompt and is editable.

### No fake planning

- **AC-16** At no point does the landing issue a network request to a backend service or external API. The only requests are for the application's own static assets.
- **AC-17** No trail, recommendation, score, weather result, results-loading indicator, or text implying that planning has occurred or is in progress is rendered in any state.
- **AC-18** No state of the landing presents the visitor as signed in.

### Prompt preservation

- **AC-19** After AC-11 or after AC-13 with a valid prompt in the input, the trimmed prompt is present in session storage under a single key that is defined in exactly one place in the source.
- **AC-20** Reloading `/` after AC-19 restores the saved prompt into the input.
- **AC-21** With session storage unavailable or throwing, the page renders and AC-11 through AC-15 still hold, and the message does not state that the request was saved.

### CG background

- **AC-22** The media layer is driven by an ordered list of three scene definitions with the ids `alpine-lake`, `rain-forest`, and `mountain-ridge`, each carrying a duration and a media definition.
- **AC-23** With default settings the visible scene advances A → B → C → A continuously, each transition is a cross-fade, and no blank frame or hard cut is visible, including at the loop point.
- **AC-24** `alpine-lake`, `rain-forest`, and `mountain-ridge` each render their video (`/media/hero/scene1.mp4`, `/media/hero/scene2.mp4`, `/media/hero/scene3.mp4`) over their poster (`/media/hero/scene1.png`, `/media/hero/scene2.png`, `/media/hero/scene3.png`). Each video element is muted, plays inline, shows no native controls, and never produces audio. No 3D asset and no 3D library is used.
- **AC-25** Replacing one scene's media with another file, or switching it between still image and video, requires editing only that scene's definition and adding asset files. This is demonstrated by review: no foreground component, layout file, or transition logic references a specific scene's media type.
- **AC-26** Each scene's duration is read from its definition; changing a value between 5 and 10 seconds changes that scene's display time with no other edit.
- **AC-27** With all media blocked or failing to load, the heading, input, primary action, suggestions, and Sign In are visible and operable.
- **AC-45** Retired. It measured a composition that Design System Version 2 §4.3 and §5.2 do not allow; AC-47 protects the same intent.
- **AC-46** At 390×844 in the default state (no message shown), the distance from the bottom of the navigation row to the top of the heading is at least 250px (expected 276px), and at least the upper 180px of that band is covered by nothing except the brand scrim's feather.
- **AC-47** At 1920×1080 in the default state, no scrim and no foreground element other than the brand, the brand scrim, Sign In, and the scene control covers the media outside the rectangle x 428–1492, y 387–863: the left-hand 22% and the right-hand 22% of the hero, and the band from y = 120 to y = 387 across its full width, show the media as delivered. At 1440×900 the same holds for the rectangle x 188–1252, y 237–713 (left and right 13%). The scrim's solid region covers at most 16% of the viewport area at 1920×1080 and at most 25% at 1440×900.
- **AC-49** No foreground element and no scrim changes position or size when the scene changes or during a cross-fade.
- **AC-50** The page's interface is rendered and operable before any hero media has loaded, and no video is requested before the first poster has rendered or failed. With all video files blocked, all three scenes show their posters for their full durations and the rotation continues. With one scene's poster blocked, that scene is skipped and the other two keep rotating.

### Responsive

- **AC-28** At 1920, 1440, 1366, 1280, 768, 390, and 320px widths there is no horizontal page scroll, and no foreground element is clipped by the viewport or overlaps another foreground element.
- **AC-29** At 390px and 320px the input's field spans the viewport width minus side gutters of at least 16px, and the primary action is visible inside it without horizontal scrolling.
- **AC-30** At 390px and 768px every interactive element has a hit area of at least 44×44 CSS px with at least 8px between adjacent targets.
- **AC-31** At 390px and 320px all suggestion chips are fully visible with untruncated text.
- **AC-32** The input's font size is at least 16px at every width.
- **AC-48** The heading renders at 64px/68px from 1440px, 54px/60px from 1024px, 42px/48px from 768px, and 32px/38px below that (30px/36px below 360px). The planner field is 720px wide at 1920 and 1440px, 660px at 1366 and 1280px, 640px at 768px, and the full content width at 390 and 320px; its corner radius is 24px (20px below 768px) and is never half its height. The primary action is a circle inside the field at every width. Heading, supporting text, field, and chips are centered on the viewport's vertical axis (±1px).

### Accessibility

- **AC-33** Using only the keyboard, a visitor can reach and operate, in this order: brand, Sign In, input, primary action, each suggestion, the background pause control. No element traps focus.
- **AC-34** Every interactive element shows a visible focus indicator when focused by keyboard, over each of the three scenes.
- **AC-35** The primary action, Sign In, suggestions, and pause control are native `button` or `a` elements with non-empty accessible names; the page has `nav` and `main` landmarks.
- **AC-36** With `prefers-reduced-motion: reduce`, on load and until the visitor activates the play control, the background shows one static scene, does not auto-advance, does not cross-fade, and plays no video; the control is in its paused state. AC-08 through AC-15 still hold.
- **AC-37** A visible pause control stops the scene rotation and a second activation resumes it; its accessible name reflects the current state.
- **AC-38** The media layer is hidden from assistive technology and contains no focusable element; no audio is ever played.
- **AC-39** Heading, supporting text, input text and label, chip text, and navigation text meet WCAG AA contrast against their effective background for each of the three scenes, and still meet it when the media layer is substituted with a plain white frame.
- **AC-40** Validation and auth-boundary messages are conveyed in text and do not rely on color alone.
- **AC-51** With a hover-capable pointer, each interactive element shows the cursor, hover, and pressed treatment listed in section 11.15; the media layer shows the default cursor and responds to no pointer event; every control is visible and identifiable without hovering.

### Engineering

- **AC-41** From `Project/Frontend/`, `npm run build` and `npm run lint` both exit with code 0 and no new warnings.
- **AC-42** No runtime dependency is added without Lead approval, and no 3D or video-player library is added.
- **AC-43** No file under `Project/Backend/` is modified, and no file outside `Project/Frontend/` and `docs/` is modified.
- **AC-44** All styling values used by the landing's interface come from tokens defined in `docs/DESIGN_SYSTEM.md` Version 2 or from values enumerated in this specification (section 11); any deviation is listed in the implementer's report.

## 11. Design Specification

Owned by `ui-ux`. Pixel positions quoted for a reference viewport are the expected result of the layout rules, given so QA can check them; the rules are what the engineer builds. Positions depend on system-font metrics and may differ by a few pixels. "V2" means `docs/DESIGN_SYSTEM.md` Version 2.

**Where values come from.** Colors (`ink`, `snow`, `paper`, `stone`, `conifer`, `conifer-deep`, `conifer-press`, `sun`, `ember`), the type sizes, `--focus-ring`, and the motion tokens (`--duration-fast` 150ms, `--duration-base` 240ms, `--duration-scene-fade` 1200ms, `--ease-ui`, `--ease-scene`) are V2 tokens. Where V2 gives a range, the number chosen is in the tables below. The following are **feature-level values**, defined by this specification:

| Value | Definition |
|---|---|
| Breakpoints | 768px, 1024px, 1440px (width). 1440px is not a Tailwind default and is declared once as a theme breakpoint. Secondary steps: width below 360px (narrow type), height at most 839px at ≥1024px wide (short desktop), height at most 599px (very short). |
| Scrim opacity | `ink` at **0.72** in every solid region; never below 0.60. |
| Feather profile | Opacity falls from 0.72 to 0 over the feather distance through five stops: at 0 / 25 / 50 / 75 / 100% of the feather, measured from the outside in, alpha is 0 / 0.115 / 0.36 / 0.605 / 0.72. |
| Quiet control | Fill `ink` at 0.72, 1px solid `snow` border, `snow` text 14/20, no shadow. Hover: fill `ink` at 0.88 and a 2px `snow` edge (the border plus a 1px inset ring, so nothing shifts). Pressed: fill solid `ink`, 2px edge kept. Used by Sign in and the chips. |
| Radii | Planner field 24px (20px below 768px). Pill = `border-radius: 9999px` (chips, Sign in, scene-control pill). Circle = 50% (primary action, pause / play button). Brand focus box 8px. |
| Control heights | Field 68 / 64 / 56px; primary action 52 / 48 / 44px; Sign in and scene control 44px; chips 36px (44px on touch layouts). |
| Spacing set | 4, 6, 8, 12, 14, 16, 20, 24, 32, 40, 48, 64, 80px. Scrim offsets and feathers are listed in 11.8. |
| Icons | lucide `ArrowRight`, `Pause`, `Play`, `CircleAlert`, `Info`; stroke width 2; always `aria-hidden`. |
| Weights | 400 body, 500 chips / caption / messages, 600 heading / label / Sign in, 700 brand. |

### 11.1 Information hierarchy

**Element inventory.** The page contains exactly these foreground elements and nothing else:

| # | Element | Content |
|---|---|---|
| 1 | Brand | Text wordmark "Outdoor Trip Companion". No logo mark exists; none is invented here. |
| 2 | Sign In | Button labelled "Sign in". |
| 3 | Heading (`h1`) | "Plan your next outdoor adventure" |
| 4 | Supporting text | "Describe your trip. We plan it around the trail, the weather, and your gear." (14 words) |
| 5 | Input label | "Where do you want to go?" |
| 6 | Planner input | Placeholder "A moderate lake hike this Saturday" |
| 7 | Primary action | Circular icon button (lucide `ArrowRight`), accessible name "Start planning" |
| 8 | Message slot | Empty by default. Holds validation and auth-boundary messages (11.11). |
| 9 | Suggestions | Three chips (11.5). |
| 10 | Scene caption | One short line per scene (11.10), allowed by section 4. |
| 11 | Background control | Icon button, pause / play (11.10). |

There is no footer, no leading icon in the field, no visible text in the primary action, no badge, no secondary link.

**Visual weight, strongest first.** This is what the eye should land on, and it follows the ranking in section 4.

1. The scene. The only saturated, detailed thing on the page. It is untouched by any overlay outside the regions in 11.8.
2. The planner field. The single bright, opaque shape in the foreground (`paper`, 720 × 68px on large desktop), with the only saturated UI color (the `conifer` action) inside it.
3. The heading. Large (64px on large desktop, set by V2) but plain `snow` text with no surface, so the field stays the brightest and only opaque shape.
4. Supporting text and the input label. `snow`, regular and semibold respectively.
5. Suggestion chips. Outlined, dark-filled, small type.
6. Brand and Sign In. Small, at the top corners of the foreground.
7. Scene caption and background control. Small, at the bottom-right corner of the foreground.

**Reading order (visual):** brand → Sign in → heading → supporting text → label → field → primary action → message → chips → caption → background control.

**DOM order and landmarks.** DOM order equals reading order. No positive `tabindex` anywhere.

```text
page wrapper                       base color `ink`
├─ media layer                     aria-hidden, inert, no focusable content
├─ header
│  └─ nav (aria-label "Primary")
│     ├─ a  href="/"               brand wordmark
│     └─ button type="button"      "Sign in"
└─ main
   ├─ h1
   ├─ p                            supporting text
   ├─ form (novalidate)
   │  ├─ label for=input           "Where do you want to go?"
   │  ├─ input type="text"
   │  ├─ button type="submit"      aria-label "Start planning"
   │  ├─ message slot              id referenced by the input's aria-describedby
   │  └─ ul (aria-label "Suggested requests")
   │     └─ li > button type="button"   ×3
   └─ scene control
      ├─ caption text
      └─ button type="button"      aria-label reflects state
```

**Tab order:** brand → Sign in → input → Start planning → chip 1 → chip 2 → chip 3 → background control. Eight stops. The message slot and the caption are not focusable. There is no dismiss button and no skip link (two navigation items do not justify one).

### 11.2 Composition and responsive rules

**Tiers.** Large desktop ≥1440px, laptop 1024–1439px, tablet 768–1023px, mobile below 768px. The large-desktop composition at 1920×1080 is the baseline; the other tiers are adaptations of it.

**Structure.** The hero is one grid, the same at every width. Everything in rows 3–4 is centered on the viewport's vertical axis; rows 1 and 6 use the full foreground container.

| Row | Content | Height |
|---|---|---|
| 1 | Navigation | fixed per tier |
| 2 | Scene window (empty) | flexible: `minmax(48px, 5fr)` from 768px, `minmax(24px, 1fr)` below |
| 3 | Heading, supporting text, label, field | content height |
| 4 | Below-field area: message slot, then chips, top-aligned | `min-height` reserve R |
| 5 | Spacer (empty) | `minmax(16px, 1fr)` from 768px, fixed 16px below |
| 6 | Scene control, right-aligned to the container | 44px |

From 768px, rows 2 and 5 share the spare height 5 : 1, which places the content block in the lower-middle of the frame without pinning it to the bottom edge. Below 768px all spare height goes to the scene window. Row 4 reserves the height of a three-line message plus the chips. When a message appears it pushes the chips down into space that is already reserved, and nothing above the message moves: the field never jumps under the pointer or thumb. If message plus chips ever exceed R, row 4 grows, taking the excess from rows 2 and 5 while they have spare height and making the page taller after that.

Hero height is `min-height: 100dvh` with `100vh` as the fallback. Content taller than the viewport scrolls normally; the navigation is not sticky. The media layer and base color cover the full hero box whatever its height.

**Foreground container.** Width `min(100% − 2 × gutter, 1280px)`, centered. Navigation and scene control align to its edges. Above 1920px wide nothing in the foreground grows: the container stays 1280px, the content keeps its widths, and the media alone fills the extra space (V2 §6.3).

**Values per tier.**

| Property | Mobile <768 | Tablet 768–1023 | Laptop 1024–1439 | Large desktop ≥1440 |
|---|---|---|---|---|
| Side gutter | 16px | 48px | 64px | 80px |
| Navigation row (vertical padding) | 56px (6px) | 76px (16px) | 92px (24px) | 108px (32px) |
| Heading | 32/38, 600 (30/36 below 360px) | 42/48, 600 | 54/60, 600 | 64/68, 600, letter-spacing −0.025em |
| Heading max-width | 100% | 600px | 680px | 760px |
| Heading → supporting text | 12px | 16px | 16px | 16px |
| Supporting text | 16/24, 400 | 18/28, 400 | 18/28, 400 | 18/28, 400 |
| Supporting text max-width | 100% | 540px | 580px | 620px |
| Supporting text → label | 24px | 32px | 32px | 32px |
| Label | 16/24, 600 | 18/28, 600 | 18/28, 600 | 18/28, 600 |
| Label → field | 8px | 12px | 12px | 12px |
| Field width | 100% | `min(640px, 100%)` | 660px | 720px |
| Field min-height / radius | 56px / 20px | 64px / 24px | 64px / 24px | 68px / 24px |
| Input text | 16/24 | 18/28 | 18/28 | 18/28 |
| Primary action (circle) / inset | 44px / 6px | 48px / 8px | 48px / 8px | 52px / 8px |
| Chip height / gap | 44px / 8px | 44px / 8px | 36px / 8px | 36px / 8px |
| Chip row max-width | 100% | 640px | 760px | 760px |
| Row-4 reserve R | 188px | 188px | 128px | 128px |
| Bottom padding | 16px + safe-area inset | 32px | 32px | 40px |

At every tier: field → message 12px, message → chips 20px, field → chips with no message 20px, message type 14/20 weight 500, scene control 44px tall. On mobile the content column is additionally capped at 640px and centered, which only matters above 672px. Gutters and bottom padding add `env(safe-area-inset-*)` where the device reports one. Heading and supporting text use `text-wrap: balance` and are centered blocks of their own width, so heading, supporting text, and field are three different widths on one axis. The heading takes 2 lines at every reference viewport (3 is the worst case at 320px); the supporting text takes 2 lines (3 at 320px). R is 12 + 60 + 20 + chips: one 36px chip row on desktop, two 44px rows on tablet and mobile.

**Short desktop viewports (V2 §25).** At ≥1024px wide and at most 839px tall, decorative spacing is reduced first: navigation padding 16px (row 76px), heading → supporting text 12px, supporting text → label 24px, bottom padding 24px. The scene window then gives up height before anything else does. No type size, control size, or element is reduced or removed. At any width, at most 599px tall: row 4 drops its reserve (`min-height: 0`), the scene-window minimum becomes 16px, and the page scrolls; nothing is hidden or re-ordered at any height.

**Expected positions (y, in px).** "Tallest message" is the three-line state (E2, the counter, and N3 together on desktop and tablet; N1 on mobile).

| Viewport | Nav row | Heading | Supporting text | Label | Field | Chips | Reserve ends | Scene control | Tallest message → chips |
|---|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 0–108 | 451–587 | 603–659 | 691–719 | 731–799 | 819–855 | 927 | 996–1040 | 811–871 → 891–927 |
| 1440×900 | 0–108 | 301–437 | 453–509 | 541–569 | 581–649 | 669–705 | 777 | 816–860 | 661–721 → 741–777 |
| 1366×768 | 0–76 | 226–346 | 358–414 | 438–466 | 478–542 | 562–598 | 670 | 700–744 | 554–614 → 634–670 |
| 1280×800 | 0–76 | 253–373 | 385–441 | 465–493 | 505–569 | 589–625 | 697 | 732–776 | 581–641 → 661–697 |
| 768×1024 | 0–76 | 393–489 | 505–561 | 593–621 | 633–697 | 717–813 | 885 | 948–992 | 709–769 → 789–885 |
| 390×844 | 0–56 | 332–408 | 420–468 | 492–516 | 524–580 | 600–696 | 768 | 784–828 | 592–652 → 672–768 |

**No-scroll arithmetic (AC-07).** Fixed height = navigation row + row 3 + R + scene control + bottom padding: 108 + 348 + 128 + 44 + 40 = 668px on large desktop, and 76 + 316 + 128 + 44 + 24 = 588px on a short laptop. Spare height = viewport height − fixed height, shared by the scene window and the spacer: 412px at 1920×1080 (343 + 69), 232px at 1440×900 (193 + 39), 180px at 1366×768 (150 + 30), and 212px at 1280×800 (177 + 35). Each exceeds the 64px the two flexible rows need at minimum, so nothing scrolls. Because the tallest message sits inside R, the default state and the tallest-message state have the same total height, so both fit. With short spacing the smallest heights that fit without scrolling are 672px on large desktop (76 + 336 + 128 + 44 + 24 + 64) and 652px on laptop.

**Large desktop, 1920×1080.** Container x 320–1600. Heading box x 580–1340, supporting text x 650–1270, field x 600–1320. In the frame, ▒ is the scrim's solid region (x 548–1372, y 435–815) and ░ its feather (out to x 428–1492, y 387–863). The block's vertical midpoint is at 60.5% of the viewport height and the field's center at 70.8%.

```text
0      320  428   548  600                                 1320 1372  1492 1600      1920
┌────────────────────────────────────────────────────────────────────────────────────────┐
│       Outdoor Trip Companion                                        ( Sign in )        │ y 32–76
│                                                                                        │
│                     scene as delivered: sky, summits, cloud                            │ y 120–387
│                                                                                        │
│           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │ y 387 feather
│           ░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   Plan your next   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░             │ y 451
│  scene    ░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒  outdoor adventure  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░    scene    │
│  as       ░░░░░▒▒  Describe your trip. We plan it around the trail,  ▒░░░░░    as       │ y 603
│  delivered░░░░░▒▒▒▒▒▒▒▒▒▒  the weather, and your gear.  ▒▒▒▒▒▒▒▒▒▒▒░░░░░    delivered│
│  (22%)    ░░░░░▒▒▒▒▒▒▒▒▒▒▒  Where do you want to go?  ▒▒▒▒▒▒▒▒▒▒▒▒░░░░░    (22%)    │ y 691
│           ░░░░░▒╭──────────────────────────────────────────────╮▒░░░░░             │ y 731
│           ░░░░░▒│ A moderate lake hike this Saturday        (→) │▒░░░░░             │
│           ░░░░░▒╰──────────────────────────────────────────────╯▒░░░░░             │ y 799
│           ░░░ (Lake view trail) (Rain-friendly short hike) (Moderate mountain…) ░░░    │ y 819–855
│                                                                                        │
│                                                ( Discover somewhere beautiful ⏸ )      │ y 996–1040
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Large desktop, 1440×900.** Same sizes; only the spare height and the container's position change. Container x 80–1360. Heading box x 340–1100, supporting text x 410–1030, field x 360–1080. Solid region x 308–1132, y 285–665; feather out to x 188–1252, y 237–713. Block midpoint 55.9%, field center 68.3%.

```text
0   80   188   308 360                                   1080 1132  1252  1360 1440
┌──────────────────────────────────────────────────────────────────────────────────┐
│    Outdoor Trip Companion                                          ( Sign in )   │ y 32–76
│                     scene as delivered                                           │ y 120–237
│         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │ y 237 feather
│         ░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒   Plan your next   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░           │ y 301
│  scene  ░░░░░▒▒▒▒▒▒▒▒▒▒▒▒  outdoor adventure  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░   scene   │
│  (13%)  ░░░░░▒  Describe your trip. We plan it around the trail,  ▒░░░░░   (13%)   │ y 453
│         ░░░░░▒▒▒▒▒▒▒▒▒  the weather, and your gear.  ▒▒▒▒▒▒▒▒▒▒░░░░░           │
│         ░░░░░▒▒▒▒▒▒▒▒▒▒  Where do you want to go?  ▒▒▒▒▒▒▒▒▒▒▒░░░░░           │ y 541
│         ░░░░░▒╭────────────────────────────────────────────╮▒░░░░░           │ y 581
│         ░░░░░▒│ A moderate lake hike this Saturday      (→) │▒░░░░░           │
│         ░░░░░▒╰────────────────────────────────────────────╯▒░░░░░           │ y 649
│         ░░ (Lake view trail) (Rain-friendly short hike) (Moderate mountain…) ░░  │ y 669–705
│                                            ( Discover somewhere beautiful ⏸ )    │ y 816–860
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Laptop, 1366×768 and 1280×800.** Heading 54/60 in a 680px box, supporting text 580px, field 660px, short spacing. At 1366: container x 64–1302, heading box x 343–1023, supporting text x 393–973, field x 353–1013; block midpoint 53.6%, field center 66.4%. At 1280: container x 64–1216, heading box x 300–980, supporting text x 350–930, field x 310–970; block midpoint 54.9%, field center 67.1%. The chips still fit on one row. The scene window is 150px and 177px tall: this is the environmental reserve V2 §25 says to give up first.

**Tablet, 768×1024.** Container x 48–720. Heading box x 84–684, supporting text x 114–654, field x 64–704. Chips wrap to two centered rows of 44px. The content scrim is a full-width band: feather y 329–377, solid y 377–713, feather to y 761; the scene is clear from the navigation row to y 329 and again below the band, where the chips and the scene control float on it.

**Mobile, 390×844.** Content column x 16–374 (358px). The field spans the column with the action inside it. The scene keeps a 276px window between the navigation row (y 0–56) and the heading (y 332). The content scrim is a full-width band: feather y 268–316, solid y 316–596, feather to y 644; chips (two rows, y 600–696) and the scene control (y 784–828) float on the picture below it. The default state and the three-line message state both fit in 844px without scrolling. A longer message (N4 at four lines, or E2 with the counter and N3 at five) exceeds R by 20–40px and takes that from the scene window, so in those two rare states the block above the message shifts up by the same amount. On a real device the browser chrome makes the visible area shorter than 844px; the scene window absorbs the difference down to its 24px minimum, and the field and the primary action are always in the first screen.

**320px.** Same rules as mobile. Content column 288px. Heading 30/36 (2 lines, 3 at worst). Brand at 14/20 so brand and Sign in stay on one row with at least 8px between them. Supporting text takes 3 lines. Each chip sits on its own row; a chip whose text cannot fit on one line wraps inside the chip to two lines instead of clipping. The scene-control caption may wrap to two lines inside its pill. At 320×568 the very-short rule applies: the page is about 584px tall and scrolls about 16px; heading, field, primary action, and all three chips are in the first screen. No horizontal scroll: nothing has a fixed width above 288px.

**Zoom and on-screen keyboard.** At 200% zoom a 1440×900 window is a 720×450 CSS viewport and a 1920×1080 window is 960×540: the mobile and tablet tiers with the very-short rule. No horizontal scroll, vertical scroll only. Font sizes are specified in `rem` so they follow the user's browser font setting. The input sets `scroll-margin-bottom: 24px` on mobile so that when it is focused the browser brings the whole field, action included, above the keyboard. `enterkeyhint="go"` puts a submit key on the keyboard itself, and the page stays scrollable.

**Touch targets at 390px and 768px (AC-30).**

| Target | Size | Nearest neighbour |
|---|---|---|
| Brand link | text width × 44px (padded hit box) | Sign in, ≥ 16px |
| Sign in | ≥ 76 × 44px | brand, ≥ 16px |
| Input | full field minus the action | action: 8px (mobile), 12px (tablet) |
| Primary action | 44 × 44px (mobile); 48 × 48px (tablet) | input: 8px or 12px; chips: 26px or 28px |
| Chips | ≥ 44px tall, ≥ 100px wide | 8px between chips, both axes |
| Background control | 44 × 44px | chips: ≥ 16px |

### 11.3 Hero layout: where the content sits and why

The content block is **horizontally centered and sits in the lower-middle of the frame**, and all hero text is **center-aligned**: heading, supporting text, label, and the chip row share the viewport's vertical axis. The one exception is the message, whose block is centered but whose lines are aligned to the start edge so a multi-line sentence stays readable beside its icon (11.11).

Reasons:

- It is where V2 puts it: §4.3 (lower-middle, not exact center) and §5.2 (a primary UI safe zone of X 430–1490, Y 390–920 on the 1920×1080 master, which is centered on the frame). At 1920×1080 the block and its scrim occupy x 428–1492, y 387–863, and the tallest message state ends at y 935, within 15px of that zone (11.7). It also meets PRD §7.3's "central AI trip-planning input" literally.
- The block's midpoint is at 60.5% and 55.9% of the viewport height at the two primary viewports, inside V2's 55–68% starting range, and the field's center is at 66–71% at all four desktop viewports. On the two short secondary viewports the block midpoint is 53.6% and 54.9%, the result of V2 §25's order of sacrifice.
- The sky, summits, and light in the upper third stay free of interface, and so do both side thirds, which is where V2 §5.3 places characters and focal objects.
- Text is centered because the block is on the frame's axis and its scrim is a symmetric pool: centered lines keep the dark area as narrow as the words, and the label reads as the question the field answers, not as a form caption.
- On portrait screens the same axis holds and the picture is split top and bottom: scene above, interface below, with the field in thumb reach.

**Why this is not a login form in empty space, and not a narrow marketing column** (V2 §3.3):

- Nothing is empty: the block sits over a full-bleed scene that stays visible above it, on both sides of it, and below the field, where the chips float directly on the picture.
- It is not at the vertical center, and it has no card: no panel, border, or box holds the content, only a feathered scrim that has no visible edge.
- It is not one column: heading (760px), supporting text (620px), and field (720px) are three widths, and the foreground uses the whole 1280px container, with brand and Sign in at its top corners and the scene control at its bottom-right corner.
- The field is a wide conversational surface with one integrated action, not a stacked form with a full-width button.

The block does not move, resize, or re-align between scenes. Scenes are composed to it, not the other way round (11.7).

### 11.4 Planner input

**Anatomy.** A visible, centered label above a single "field": an opaque `paper` rounded surface that contains the native text input and, at its right end, the circular primary action. The field is never a pill: its radius is 24px (20px on mobile), well under half its height.

| Part | Large desktop ≥1440 | Laptop and tablet 768–1439 | Mobile <768 |
|---|---|---|---|
| Field (fill `paper`, no border, no shadow) | 720px wide, min-height 68px, radius 24px | 660px (laptop) or `min(640px, 100%)` (tablet), min-height 64px, radius 24px | 100% wide, min-height 56px, radius 20px |
| Input padding | 24px left; 12px gap before the action | same | 20px left; 8px gap before the action |
| Input text | 18/28, 400, `ink` | 18/28 | 16/24 |
| Placeholder | same size, `stone`; `text-overflow: ellipsis` if it cannot fit | same | same |
| Primary action | 52px circle, inset 8px from the field's top, right, and bottom; 24px icon | 48px circle, inset 8px; 20px icon | 44px circle, inset 6px; 20px icon |

The native input is transparent, has no outline of its own, and fills the field except for the action. Attributes: `type="text"`, `name="prompt"`, `autocomplete="off"`, `autocapitalize="sentences"`, `enterkeyhint="go"`, `aria-describedby` pointing at the message slot. It is **not** auto-focused. It has **no `maxlength` attribute**: a hard limit truncates pasted text silently, and the visitor must be told about the limit instead (over-limit state below). The form uses `novalidate`; there is no native validation bubble. Caret color is `conifer`. The label is a real `<label for>`. It is always visible; the placeholder is an example, not the label.

**Primary action.** A `button type="submit"` with `aria-label="Start planning"`. Circle, fill `conifer`, containing only the lucide `ArrowRight` icon in `snow`. It is the same integrated circle at every width; there is no text button and no stacked mobile button. At 52px inside a 720 × 68px surface it is the only saturated color in the field without outweighing it (V2 §11).

**Field states.**

| State | Appearance | Behavior |
|---|---|---|
| Default (empty) | Fill `paper`. Placeholder in `stone`. | — |
| Hover | Fill `snow`. | Color change over `--duration-fast`. |
| Focus-visible | Fill `snow`. The focus ring (11.12) is drawn around the whole field, not the inner input. | Text inputs show this on mouse focus as well as keyboard focus. |
| Filled | Text in `ink`. Otherwise as default. Long text scrolls horizontally inside the input. | — |
| Invalid: empty submit | 2px inset ring in `ember` inside the field edge. `aria-invalid="true"`. Message E1 in the slot. | Focus moves to the input. The ring and message clear on the first non-whitespace character typed, or when a chip is selected. |
| Invalid: over limit | Same `ember` ring and `aria-invalid="true"`. Message E2 and the character counter in the slot. | Appears as soon as the trimmed value is longer than 2000 characters (typing or paste), without waiting for a submit. Stays until the trimmed length is 2000 or less. |
| After auth boundary | Field looks exactly like "filled" (or "default" if it was empty). Not invalid, not disabled, not read-only. Notice N1–N4 in the slot. | Value is unchanged and editable. Editing the value, or selecting a chip, clears the notice. |

There is no disabled state and **no loading or busy state of any kind**: no spinner, no progress, no "Planning…" text, no skeleton.

**Primary action states.**

| State | Appearance |
|---|---|
| Default | Fill `conifer`, icon `snow`. |
| Hover | Fill `conifer-deep`. |
| Active (pressed) | Fill `conifer-press`. |
| Focus-visible | Focus ring (11.12). With the 8px inset the 6px ring stays inside the field; with the 6px mobile inset it reaches the field's edge. Both are intended. |

The action is **never disabled**, visually or by attribute. With an invalid value, activating it does not invoke the auth boundary; it shows (or re-announces) the matching message and moves focus to the input. Keeping it enabled keeps it in the tab order and lets the visitor find out why nothing happened.

**Submit behavior** (Enter in the input and activating the action are the same event, the form's submit):

| Trimmed value | Result |
|---|---|
| Empty | Message E1. `aria-invalid`. Focus to input. Nothing saved, boundary not invoked. |
| Longer than 2000 | Message E2 is re-announced. Focus to input. Nothing saved, boundary not invoked. |
| 1–2000 characters | Prompt saved, boundary invoked with reason "start planning". Notice N1 (or N4 if the save failed). Focus stays where it was. |

**Validation copy.**

| Id | When | Text |
|---|---|---|
| E1 | Submit with an empty or whitespace-only value | "Enter a trip request first, or pick a suggestion below." |
| E2 | Trimmed value longer than 2000 characters | "Your request is over the 2,000-character limit. Shorten it to continue." |
| Counter | Shown with E2, on its own line beneath it | "{n} of 2,000 characters", for example "2,134 of 2,000 characters" |

**Association and announcement.** See 11.11 for the message slot's structure. In short: the input's `aria-describedby` points at the slot, so any message is read when the field is focused; E1 and E2 are in an alert region so they are also announced at the moment they appear, including when focus was already in the field. The counter is outside the live region so that it is not re-announced on every keystroke.

### 11.5 Suggestion chips

**Which and in what order.** Three, from the section-4 list, in scene order:

1. "Lake view trail"
2. "Rain-friendly short hike"
3. "Moderate mountain hike this weekend"

They correspond one-to-one to the three scenes (lake, rain, mountain) and to the three things the supporting text names. "Fall foliage hike" is left out because it is wrong for most of the year. "Easy hike near Vancouver" is left out to keep the desktop layout to one chip row and the mobile layout to two; it is the first one to add back if the Lead wants four.

**Appearance.** The quiet-control recipe (section 11 intro): fill `ink` at 0.72, 1px solid `snow` border, text `snow` 14/20 weight 500, pill, no shadow, no icon. Chips sit directly on the picture below the field; they carry their own surface and do not depend on the content scrim. They are at least 36px tall with 14px horizontal padding at ≥1024px with a fine pointer, and at least 44px tall with 16px padding below 1024px and on any coarse pointer; the gap is 8px on both axes.

**Wrapping.** Chips are a centered wrapping row (`flex-wrap`, `justify-content: center`), in the order above, never re-ordered and never horizontally scrolled. The row's maximum width is in 11.2.

| Width | Expected layout |
|---|---|
| Large desktop and laptop | One row of three, about 620px wide inside the 760px cap. If a system font makes it wider than the cap, chip 3 wraps to a second centered row, which still fits inside R. |
| Tablet | Row 1: chips 1 and 2. Row 2: chip 3. |
| Mobile 390 | Row 1: chips 1 and 2 (about 340 of 358px). Row 2: chip 3. If a system font makes row 1 too wide, three rows; still fully visible and still inside R. |
| 320 | One chip per row. |

A chip is `max-width: 100%`. Its text stays on one line while it fits and otherwise wraps onto a second line inside the chip (the chip grows taller). Text is never truncated, ellipsized, or clipped.

**States.**

| State | Appearance |
|---|---|
| Default | As above. |
| Hover | Fill `ink` at 0.88 and a 2px `snow` edge. |
| Active (pressed) | Fill solid `ink`; 2px edge kept. |
| Focus-visible | Focus ring (11.12). |
| After selection | No lasting "selected" look. Chips are shortcuts, not toggles; no `aria-pressed`. |

**Selection behavior (decision D2).** Activating a chip:

1. replaces the input's whole value with exactly the chip's text;
2. clears any message in the slot (E1 or a notice) and removes `aria-invalid`;
3. moves focus to the input with the caret at the end of the text;
4. does not submit, does not save, does not invoke the auth boundary.

No separate announcement is needed: the screen reader reads the input and its new value when focus lands on it. On touch devices moving focus to the input opens the on-screen keyboard; that follows from D2 and is accepted.

### 11.6 Navigation

A single transparent row floating over the media (V2 §13). No bar, no background, no border, no shadow, not sticky. Two items only, at every width: brand and Sign in. There is no menu button and no "Explore" link, because section 4 forbids links to authenticated areas. The row's content is the foreground container (maximum 1280px, centered): brand on its left edge, Sign in on its right edge. Row heights are in 11.2: 108px with 32px vertical padding on large desktop and 92px with 24px on laptop (V2's 24–32px), 76px with 16px on tablet and on short desktop viewports, 56px with 6px on mobile. Both items are 44px tall at every width.

**Brand.** A text wordmark, `snow`, weight 700, 16/24, letter-spacing 0.01em, on one line (`white-space: nowrap`); 14/20 below 360px. It is a link to `/` (the landing itself) with a 44px-tall hit box. Hover: underline, 2px thick, 4px offset. Focus-visible: focus ring on the padded box (8px horizontal padding, 8px corner radius, compensated with a negative margin so the text stays on the container edge). The brand is text directly over media, so it gets its own small scrim (11.8).

**Sign in.** The quiet-control recipe at weight 600: 44px tall, 20px horizontal padding (16px below 768px), pill, label "Sign in". It is a `button` in this feature because it does not navigate. Hover, active, and focus-visible as for chips. It carries its own fill and border, so it needs no scrim behind it and the top-right of the picture stays clear.

Activating Sign in follows section 6 and shows notice N2 or N3 in the planner's message slot (11.11). Focus stays on Sign in.

Nothing here refers to an account, a user, or an authenticated destination.

### 11.7 Background media and foreground UI

**Layer order, back to front.**

| # | Layer | Notes |
|---|---|---|
| 0 | Base color | `ink`, on the page wrapper. Always painted. What the visitor sees if no media ever renders. |
| 1 | Media layer | Fills the hero box. `aria-hidden="true"`, `inert`, `pointer-events: none`. Contains the scenes stacked on top of each other. |
| 2 | Scrims | The brand scrim and the content scrim (11.8). Decorative, `pointer-events: none`, not in the accessibility tree. |
| 3 | Foreground UI | Navigation, hero content, scene control. |

The foreground does not read anything from the media layer except, for the scene control only, the active scene's caption and the playing/paused state.

**Scene definitions.** One ordered list, the single source of truth:

| Order | `id` | `name` | `caption` | `durationMs` | `objectPosition` | `media` |
|---|---|---|---|---|---|---|
| A | `alpine-lake` | Sunny Alpine Lake | "Discover somewhere beautiful" | 5000 | `80% 30%` | video `/media/hero/scene1.mp4`, poster `/media/hero/scene1.png` |
| B | `rain-forest` | Rainy Pacific Northwest Forest | "Plan around the weather" | 5000 | `40% 30%` | video `/media/hero/scene2.mp4`, poster `/media/hero/scene2.png` |
| C | `mountain-ridge` | Cold Mountain Ridge | "Prepare for the conditions" | 5000 | `22% 30%` | video `/media/hero/scene3.mp4`, poster `/media/hero/scene3.png` |

`media` is one of two kinds: still image, or video with poster; all three scenes are video with poster today. Only the component that renders one scene's media looks at the kind. `objectPosition` is the scene's focal point. `caption` is an addition to the fields listed in section 5 (see section 12).

**Cover and focal point.** Every scene is drawn with `object-fit: cover` and its own `object-position`, filling the hero box. Media is never stretched or letterboxed. The delivered files are within 0.2% of 16:9 and are treated as 16:9.

**Timing.**

- `durationMs` is the time from the start of a scene's fade-in to the start of the next scene's fade-in. The loop is 5 + 5 + 5 = 15 seconds.
- Any value from 5000 to 10000 is valid and is read per scene. All three scenes use 5000 because their clips are 5.04 seconds long: the clip ends as the next fade begins and its last frame is held underneath the incoming scene. Looping a clip to fill a longer turn would show a hard cut at the loop point, so clips are not looped.
- Cross-fade: **1200ms**, easing `--ease-scene`, opacity only.
- The incoming scene fades from 0 to 1 **on top of** the outgoing scene, which stays fully opaque underneath until the fade ends and is hidden only then. Two scenes never fade at the same time, so the base color never shows through and brightness never dips mid-transition. C → A is the same transition as any other.
- If the next scene's poster or still is not ready when its turn comes, the current scene is held until it is. A scene whose poster or still has failed is skipped. If nothing can render, the base color stays and the page works as normal.
- Rotation is suspended while the document is hidden (background tab) and restarts the current scene's duration when it becomes visible.

**Crop behavior (V2 §6).** Scale is the factor applied to the 1920×1080 master; the visible slice of a cropped axis starts at `position × (1 − visible share)`.

| Viewport | Scale | Visible share (width × height) | What is cropped |
|---|---|---|---|
| 1920×1080 (16:9) | 1.00 | 100% × 100% | Nothing. The master target. |
| 1366×768 (16:9) | 0.71 | 100% × 100% | Nothing. |
| 1440×900, 1280×800 (16:10) | 0.83, 0.74 | 90% × 100% | 10% of the width, split by `object-position` x. |
| 3440×1440 (21:9 ultrawide) | 1.79 | 100% × 74% | 26% of the height, split by y (30% keeps summits and hikers; the foreground stays 1280px wide). |
| 768×1024 (tablet) | 0.95 | 42% × 100% | 58% of the width. Slices: A 0.46–0.88, B 0.23–0.65, C 0.13–0.55. |
| 390×844 (mobile) | 0.78 | 26% × 100% | 74% of the width. Slices: A 0.59–0.85, B 0.30–0.56, C 0.16–0.42. |

Each `object-position` x is chosen for the portrait crop, following V2 §6.5's priorities: planner usability and readability come from the layout, atmosphere comes from keeping each scene's summit in the scene window, and the hiker is kept only when practical (it is not: see the table below).

**Safe zones (V2 §5), on the 1920×1080 master.**

| Zone | Master coordinates | Rule |
|---|---|---|
| Navigation safe zone | Y 0–120 | No essential face, narrative detail, or focal object. Brand, Sign in, and the brand scrim (to y = 120 at 1920×1080) sit here. |
| Primary UI safe zone | X 430–1490, Y 390–920 | Reserved for hero text and the planner. Important subjects must not rely on it. |
| Subject placement | left third or right third | Characters and focal objects go here, not dead center. Scenes may alternate sides. The UI does not move. |
| General media safe area | X 250–1670, Y 100–950 | Mission-critical content stays inside; the edges are lost to responsive cropping. |

**Where the UI and its scrims actually sit** (viewport pixels, default state; the content scrim's solid region ends 16px below the field and its feather 48px below that).

| Viewport | Content scrim, solid | Content scrim with feather | Same footprint on the master (center crop) | Clear picture |
|---|---|---|---|---|
| 1920×1080 | x 548–1372, y 435–815 | x 428–1492, y 387–863 | X 428–1492, Y 387–863 (935) | Left and right 22%; y 120–387 full width; below y 863 except the scene control. |
| 1440×900 | x 308–1132, y 285–665 | x 188–1252, y 237–713 | X 322–1598, Y 284–856 (942) | Left and right 13%; y 120–237; below y 713. |
| 1366×768 | x 319–1047, y 210–558 | x 247–1119, y 162–606 | X 347–1573, Y 228–852 (953) | Left and right 18%; y 104–162; below y 606. |
| 1280×800 | x 276–1004, y 237–585 | x 204–1076, y 189–633 | X 371–1549, Y 255–855 (952) | Left and right 16%; y 104–189; below y 633. |
| 768×1024 | full width, y 377–713 | y 329–761 | n/a | y 104–329 full width (from y 76 on the right); below y 761. |
| 390×844 | full width, y 316–596 | y 268–644 | n/a | y 82–268 full width (from y 56 on the right); below y 644. |

Other fixed positions at 1920×1080: brand scrim x 200–640, y 0–120; Sign in about 88 × 44px ending at x 1600, y 32–76; scene control about 266 × 44px at x 1334–1600, y 996–1040. With the tallest message the content scrim's lower edge moves down 72px (solid to y 887, feather to y 935 at 1920×1080); the bracketed value in the fourth column is that lower edge on the master. The interface is sized in CSS pixels and does not shrink with the picture, so on smaller desktop viewports it covers more of the master than at 1920×1080. At 16:10 a scene's `object-position` shifts these X values by up to about ±60 master pixels. Guidance for art production: V2's primary UI safe zone is what the interface covers at 1920×1080 and is the minimum keep-clear area; across all desktop reference viewports the interface can dim anything inside about **X 320–1600, Y 230–955**. A subject that must stay undimmed on laptops belongs outside that larger rectangle.

**Delivered art against these zones (note for CG production).** Coordinates are fractions of the frame, x from the left, y from the top.

| Scene | At 1920×1080 | At 390×844 |
|---|---|---|
| A | Hiker (0.28, 0.62) at (538, 670): under the scrim's left feather at almost full strength. Snow summits (0.78, 0.15): clear, upper right. | Hiker outside the visible slice. Summits in the scene window at about (282, 127). |
| B | Waterfall (0.43, 0.57) at (826, 616): under the solid region. Campfire, tent, and vehicle (x 0.65–0.98, y 0.55–0.78) at x 1248–1882: the left 240px under the scrim, the rest clear. Mountain top (0.40, 0.13): clear. | Waterfall under the solid band; campfire outside the visible slice. Mountain top in the scene window at about (156, 110). |
| C | Hiker (0.77, 0.60) at (1478, 648): the outer edge of the right feather, effectively clear. Snow peak (0.29, 0.22) at (557, 238): clear. | Hiker outside the visible slice. Snow peak in the scene window at about (190, 186). |

In all three scenes the hiker stands inside or beside the primary UI safe zone, and at 1440×900 scene A's hiker is under the solid region. This is recorded for art production and is not corrected by moving the interface per scene (V2 §5, §17). Art production should also know that a portrait phone shows about a quarter of the frame's width, and that the first 1.2 seconds of each sequence are spent under a cross-fade, so nothing essential should happen there.

### 11.8 Readability over changing media

**Strategy.** Two mechanisms, and every piece of foreground text uses exactly one of them:

1. **Scrim plateau.** Text drawn directly over the picture (heading, supporting text, label, messages, counter, brand) is always `snow`, and always sits inside a region where a layer of `ink` at opacity **0.72** lies between it and the media. The region is defined from the text's own boxes, so it follows the text at every width and line count.
2. **Own surface.** Controls carry their own background: the field is opaque `paper`; the primary action is opaque `conifer`; quiet controls (Sign in, chips) and the scene-control pill are `ink` at 0.72.

Because both mechanisms put at least `ink`/0.72 or an opaque surface behind the text, the result does not depend on what the media shows, on which scene is active, or on where a cross-fade has got to. A cross-fade frame is a blend of two frames and is never brighter than white, which is the worst case computed below. Scene C is snow and cloud almost edge to edge, so while it is active the real result behind the heading is close to that worst case, not a comfortable margin above it.

There is no full-frame tint, no `backdrop-filter` blur, and no text shadow (V2 §16–17). Outside the two scrims and the small controls, the media is shown exactly as delivered.

**Scrim geometry.** "Solid" means opacity 0.72. "Feather" uses the profile in the section 11 intro. Where two feathers meet at a corner their factors multiply.

| Scrim | Width | Solid region | Feather |
|---|---|---|---|
| Content | ≥1440px | x: the heading's max-width box ± 32px (824px wide, centered). y: heading top − 16px → content bottom + 16px. | 120px left and right, 48px up and down |
| Content | 1024–1439px | x: the heading's max-width box ± 24px (728px wide, centered). y: as above. | 72px left and right, 48px up and down |
| Content | <1024px | x: full viewport width. y: as above. | 48px up and down |
| Brand | ≥768px | x: brand text ± 24px. y: viewport top → bottom of the brand's 44px hit box. | 96px left and right, 44px downward |
| Brand | <768px | Same definition. | 64px left and right, 32px downward |

"Content bottom" is the bottom of the field when the message slot is empty and the bottom of the slot's last line when it holds a message. The scrim therefore always contains the field's whole outline (which needs the 3:1 boundary contrast of section 8) and grows downward, without a transition, only while a message needs it. The chips are never part of the solid region by definition; they sit over its lower feather, on their own surface.

No text ever sits in a feather: all text is inside a solid region or on its own surface. The two scrims are separate at every reference viewport; where they meet on very short viewports the overlap only makes the result darker.

Suggested construction, not binding: the content scrim is a pseudo-element of the wrapper that holds the heading, supporting text, label, field, and message slot, absolutely positioned with the offsets above, filled with `ink/72`, and feathered with `mask-image` gradients combined with `mask-composite: intersect`. What is binding is the solid region and the 0.72 value.

**Contrast arithmetic (AC-39).** WCAG 2.x relative luminance: each sRGB channel `c` (0–1) is linearised as `c/12.92` if `c ≤ 0.04045`, else `((c+0.055)/1.055)^2.4`; `L = 0.2126 R + 0.7152 G + 0.0722 B`; contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`. Alpha compositing is done per channel on the encoded sRGB values, as browsers do: `result = α·top + (1−α)·bottom`.

Worst case for light text is a pure white frame, `rgb(255, 255, 255)`. `ink` is `#0B1C20` = rgb(11, 28, 32). At 0.72 over white: R = 0.72 × 11 + 0.28 × 255 = 79.3; G = 0.72 × 28 + 0.28 × 255 = 91.6; B = 0.72 × 32 + 0.28 × 255 = 94.4.

Linearised: R 0.0788, G 0.1060, B 0.1130. L = 0.2126 × 0.0788 + 0.7152 × 0.1060 + 0.0722 × 0.1130 = 0.0168 + 0.0758 + 0.0082 = **0.1007**.

`snow` text has L = 1. Contrast = (1 + 0.05) / (0.1007 + 0.05) = 1.05 / 0.1507 = **6.97 : 1**.

So every piece of text over the scrim plateau, at any size, is at least 6.97:1 against a white frame. The requirement is 4.5:1 for normal text and 3:1 for the heading. The same number applies to text on a quiet control or on the scene-control pill anywhere on the page, because their fill is the same `ink`/0.72. Sensitivity: 0.60 gives 4.61:1 and 0.59 gives 4.47:1. **0.60 is the lowest value that can ever be used** (V2 §16's absolute minimum); 0.72 is chosen for margin with thin 14px text.

Full table, white frame as the media:

| Element | Foreground | Effective background | Ratio | Needed |
|---|---|---|---|---|
| Heading (30–64px, 600) | `snow` | scrim plateau, rgb(79, 92, 94) | 6.97 | 3 |
| Supporting text, label, messages, counter, brand | `snow` | scrim plateau | 6.97 | 4.5 |
| Sign in and chip text (outside any scrim) | `snow` | `ink`/0.72 over white | 6.97 | 4.5 |
| Sign in and chip text, hover | `snow` | `ink`/0.88 over white, rgb(40, 55, 59) | 12.32 | 4.5 |
| Sign in and chip text, pressed | `snow` | `ink` (opaque) | 17.48 | 4.5 |
| Scene caption (pill outside any scrim) | `snow` | `ink`/0.72 over white | 6.97 | 4.5 |
| Input text | `ink` | `paper` (opaque) | 16.04 | 4.5 |
| Input text, field hovered or focused | `ink` | `snow` (opaque) | 17.48 | 4.5 |
| Placeholder | `stone` | `paper` / `snow` | 5.92 / 6.45 | 4.5 |
| Primary action icon | `snow` | `conifer` / `conifer-deep` / `conifer-press` | 8.05 / 10.23 / 12.57 | 3 |

Boundaries and non-text parts (3:1 needed):

| Element | Pair | Ratio |
|---|---|---|
| Field edge | `paper` against the plateau, white frame | 6.39 |
| Field edge | `paper` against the plateau, black frame | 17.14 |
| Primary action edge | `conifer` against `paper` | 7.38 |
| Quiet control edge, worst media | the better of border-vs-media and fill-vs-media; minimum over all grey levels is at grey 139 | 3.41 |
| Invalid ring | `ember` against `paper` | 4.43 |
| Pause / play icon | `snow` on the pill, white frame; with its hover overlay | 6.97; 5.16 |

The quiet-control row is why the border is solid `snow` and not a translucent hairline: with a 64% border the worst case over mid-grey media falls to 2.53:1.

For the opposite extreme, a black frame, the plateau is rgb(8, 20, 23), L 0.0062, and `snow` on it is 18.69:1. With all media blocked the background is `ink` itself and `snow` on it is 17.48:1. Every real frame of the three scenes lies between the black-frame and white-frame results.

**How QA can check it.** Replace the media layer's content with a plain white fill (and separately a black one). Sample the pixel color immediately beside each text element: inside a scrim it must be rgb(79, 92, 94) ± 2 for white, and rgb(8, 20, 23) ± 2 for black. Then confirm each control's own fill. Any contrast tool will reproduce the ratios above from those colors.

### 11.9 Scene media: playback, loading, and failure

**Rendering.** Each scene is one box that fills the hero. A still-image scene, a kind no scene uses today, is its image. A video scene is its poster image with the video drawn over it in the same box, with the same cover and `object-position`; the video is revealed only once it has a frame to show, so the swap never exposes the base color.

**Video element.** Muted (set as an attribute and never changed; no state of the page may produce audio, whatever a file contains), `playsinline`, no `controls`, no `loop`, `preload="none"` until its fetch turn, `disablepictureinpicture`, `disableremoteplayback`, `tabindex="-1"`, `aria-hidden="true"`. Playback is started and stopped by the rotation, not by an `autoplay` attribute. There is no volume, unmute, fullscreen, or seek control anywhere on the page.

**Playback.**

- A video starts from its beginning when its scene becomes active, which is the start of its fade-in. If it is not yet playable at that moment, it starts from its beginning as soon as it becomes playable during that turn; until then the poster is shown.
- It plays once per turn. When it reaches its end it holds its last frame until the scene is hidden at the end of the next cross-fade.
- A video whose scene is not active or fading is paused and reset to its beginning.
- Pause and Play follow 11.10; reduced motion follows 11.12.

**Loading order (V2 §28).**

1. HTML and interface. The planner is interactive without waiting for any media request; no media request blocks rendering.
2. Scene A's poster (`scene1.png`) is the first media request. When it has rendered, scene A fades in from the base color over 1200ms (instantly under reduced motion) and its first turn starts. Scene B's and scene C's posters follow at lower priority.
3. No video is requested until scene A's poster has rendered or failed. Then the videos are fetched strictly one at a time, in scene order: scene A's first, scene B's once scene A's is playable or has failed, scene C's once scene B's is playable or has failed. A scene whose video has not arrived when its turn comes shows its poster for that turn.
4. Under reduced motion no video is fetched until the visitor presses Play.

**Failure.**

| What fails | Result |
|---|---|
| A video fails to load, stalls, or the browser refuses to play it | Its poster stays for the scene's full `durationMs`; rotation continues. |
| A poster fails (or the image of a still-image scene) | That scene is skipped; its video is not requested. The other scenes rotate; a single remaining scene is shown without rotation. |
| Nothing loads | The `ink` base color stays. Every foreground function works. The scene control stays in place so the tab order does not change. |

No failure produces a message, a spinner, or a broken-image icon: media failure is silent.

### 11.10 Scene control: caption and pause

**Placement.** Last in the DOM and in the tab order. Row 6 of the grid at every tier: its right edge on the foreground container's right edge, its bottom edge on the bottom padding line, at least 16px below the below-field area.

**Anatomy.** One pill, 44px tall, fill `ink` at 0.72, no border, no shadow. Inside it, left to right: the caption (14/20, weight 500, `snow`, aligned to the right, 16px padding on its left, 4px gap before the button), then the button (44 × 44px, circular, no fill and no border of its own, with a 20px lucide icon in `snow`). The pill is as wide as the longest of the three captions and does not change width between scenes (suggested: render all three captions in one grid cell, the inactive ones `visibility: hidden` and `aria-hidden="true"`). The pill is not interactive; only the button is.

**Caption.** The active scene's `caption` from the scene list. It is plain text: readable by a screen reader that navigates to it, but **not** a live region, so scene changes are never announced. On a scene change the old caption fades out over the first 400ms of the cross-fade and the new one fades in from 600ms to 1000ms. With reduced motion or while paused it does not change.

**Button.**

| | Background is playing | Background is paused |
|---|---|---|
| Icon (lucide) | `Pause` | `Play` |
| Accessible name (`aria-label`) | "Pause background animation" | "Play background animation" |

The name changes with the state; `aria-pressed` is not used alongside it. The icon is `aria-hidden`.

| State | Appearance |
|---|---|
| Default | Icon `snow` on the pill. |
| Hover | A 36px circle of `snow` at 12% behind the icon. |
| Active | A 36px circle of solid `ink` behind the icon. |
| Focus-visible | Focus ring (11.12) around the 44px button. |

**Behavior.**

- **Pause:** scene rotation stops and any playing video is paused on its current frame. If a cross-fade is in progress it runs to completion (at most 1.2s) and the rotation holds on the incoming scene.
- **Play:** the current scene's full `durationMs` starts again. A video scene's clip continues from the frame it was paused on and, when it reaches its end, holds its last frame for the rest of the turn.
- The state is not stored. Every page load starts playing, unless reduced motion is requested.
- Activating the button does not move focus and is not announced beyond the button's own name change.

**Under reduced motion.** The control is still shown, in the same place, and starts in the **paused** state: icon `Play`, name "Play background animation". The system setting decides the default; it does not remove the visitor's choice. If the visitor activates Play, the background runs exactly as it does by default, and Pause stops it again.

### 11.11 Messages: validation and the auth boundary

**Placement.** One message slot, directly under the field, 12px below it and 20px above the chips. The slot is as wide as the field; the message is a block centered in it, no wider than it, with its lines aligned to the start edge. Empty, the slot takes no space. A message is always inside the content scrim's solid region (11.8).

**Appearance.** Plain text over the scrim: no box, no border, no background, no colored bar. A 16px lucide icon in `snow` sits at the start, aligned to the first line, with an 8px gap; the text is `snow`, 14/20 weight 500 at every width.

| Kind | Icon | Extra cue |
|---|---|---|
| Validation error (E1, E2) | `CircleAlert` | The field's `ember` ring and `aria-invalid`. |
| Auth notice (N1–N4) | `Info` | None on the field. |

Meaning is carried by the words. The two kinds differ by icon shape and by wording; color is not used to tell them apart, and the `ember` ring only repeats what the text says. Entrance: opacity 0 → 1 and a 4px upward slide over `--duration-base` (240ms), `--ease-ui`. Under reduced motion the message simply appears.

**Auth-boundary copy.** The message is assembled from the reason and from what happened to the prompt.

| Id | Reason | Prompt | Text |
|---|---|---|---|
| N1 | start planning | saved | "You'll need to sign in to plan a trip, but sign-in isn't available yet. Your request is saved in this tab." |
| N2 | sign in | valid prompt in the field, saved | "Sign-in isn't available yet. You'll need it to plan a trip. Your request is saved in this tab." |
| N3 | sign in | field empty or not valid | "Sign-in isn't available yet. You'll need it to plan a trip." |
| N4 | either | valid, but storage was unavailable | The first sentence(s) of N1 or N2, then: "Your request is still in the box above, but it couldn't be saved in this browser." |

Every variant says that sign-in is required to plan a trip and that it is not available yet. N1 and N2 say the request has been kept, and say where ("in this tab"), which is true of session storage. N4 exists so the page never claims a save that did not happen. No variant uses the words "planning", "finding", "results", "recommendation", "loading", or anything that suggests work was done or is in progress, and none addresses the visitor as signed in.

**Height.** On desktop and tablet every single message is one or two lines; the tallest state is three lines (60px): E2, the counter, and N3 together. On mobile at 390px N1 is three lines; N4 is four and the E2-counter-N3 state is five. R holds three lines at every tier (11.2).

**Lifetime and dismissal.** There is no close button and no timeout.

- An auth notice stays until the input's value changes (typing, deleting, or selecting a chip) or until the next activation of the primary action or Sign in, which replaces it.
- E1 stays until the first non-whitespace character is typed or a chip is selected.
- E2 and the counter stay for as long as the value is over the limit, and return if it goes over again.
- A new activation replaces whatever the slot shows. The one exception: while the value is over the limit, E2 and the counter remain, and a notice caused by Sign in (N3) is shown beneath them.
- Messages are not restored after a reload. A restored prompt (AC-20) appears in the field with no message.

A close button is left out on purpose: it would add a tab stop between the primary action and the chips that AC-33's order does not include, and the notice already clears itself the moment the visitor acts on the field.

**Structure and live regions.**

```text
message slot  (id = the value of the input's aria-describedby; always in the DOM)
├─ alert region    role="alert"                       holds E1 or E2, otherwise empty
├─ counter         plain text, not live               holds "{n} of 2,000 characters" with E2
└─ status region   role="status" aria-atomic="true"   holds N1–N4, otherwise empty
```

- Both regions exist, empty, from first render, so that inserting text into them is announced.
- Validation errors are assertive (`role="alert"`): the visitor tried to do something and it did not happen.
- Auth notices are polite (`role="status"`): nothing was lost, and focus has not moved.
- Every activation is announced, including a repeat that produces the same text. The implementation must make the repeat audible (for example by clearing and re-inserting the text); a live region whose text has not changed says nothing.
- Because the input describes itself by the slot, a visitor who later moves focus back to the field hears the current message again. This is what makes the slot a recovery path and not a one-time toast.
- When E1 moves focus to the input, some screen readers read the message twice (once as the alert, once as the field's description). That is accepted; dropping either mechanism would leave a path where it is not announced at all.

**Focus.** E1 and E2 on submit: focus to the input. N1 from the primary action or from Enter: focus stays on the element that was used. N2 and N3 from Sign in: focus stays on Sign in.

**Later use.** When real authentication replaces the placeholder, this slot is where "sign-in was cancelled" and "sign-in failed" will appear, with the prompt still in the field. The layout already allows for a message of up to three lines at every tier without moving anything, and for one inline text action after the sentence. Those states are not designed here.

### 11.12 Reduced motion and focus

**Reduced motion** (`prefers-reduced-motion: reduce`, V2 §22):

| Thing | Default | Reduced motion |
|---|---|---|
| Scene rotation | Advances every `durationMs` | Does not advance. Scene A is shown. |
| Cross-fade | 1200ms | None. |
| Video | Plays, muted | Not played and not fetched. Scene A's poster (`scene1.png`) is the stable frame. |
| Caption | Changes with the scene | Static: scene A's caption. |
| Scene control | Starts as Pause | Starts as Play (11.10). |
| Message entrance | Fade and 4px slide | Appears instantly. |
| Hover and press color changes | 150ms | Kept; they are color-only. |

This is the state on load and until the visitor presses Play. Layout, content, tab order, and every function are identical in both modes. A change of the system setting while the page is open takes effect without a reload.

**Focus indicator.** One ring for every interactive element, V2's `--focus-ring`: three concentric 2px bands outside the element's edge, `ink` then `sun` then `ink`, 6px in total, following the element's corner radius (element │ `ink` 2px │ `sun` 2px │ `ink` 2px │ whatever is behind). The bright `sun` band is always bounded by `ink` on both sides, so it is visible at 12.28:1 whatever the element's own color is and whatever is behind it: over scene A's bright sky, scene B's dark trees, scene C's snow and cloud, a white frame, a black frame, the `paper` field, or the scrim. It does not rely on contrast with the media at all.

| Element | Where the ring is drawn |
|---|---|
| Brand link | Around its padded 44px-tall box, 8px corner radius. |
| Sign in, chips | Around the pill. |
| Planner input | Around the whole field, following its 24px (or 20px) radius, shown while the inner input has focus. The inner input has no outline. |
| Primary action | Around the circle. |
| Background control | Around the 44px circle; it extends past the pill, which is fine. |

The ring is shown on `:focus-visible` only. It is implemented as box-shadows, so each element also sets `outline: 2px solid transparent; outline-offset: 2px`, which keeps a visible outline in forced-colors mode where shadows are removed. The ring appears with no transition. Nothing clips it: no ancestor of an interactive element has `overflow: hidden`.

### 11.13 Acceptance-criteria mapping

| Criterion | Satisfied by |
|---|---|
| AC-01, AC-02 | Engineering (routing). Design input: the landing has its own navigation (11.6) and uses nothing from the application layout. |
| AC-03 | 11.1 inventory, 11.6. The only link is the brand, to `/`. |
| AC-04 | 11.1 inventory; 11.4 (one input, one action); 11.5 (three chips from the list); 11.6 (Sign in). |
| AC-05 | 11.7 layer order and cover rule; 11.2 (media covers the hero box at any height). |
| AC-06 | 11.1: the inventory is closed; no cards, panels, charts, statistics, second action, or lower sections. |
| AC-07 | 11.2: expected positions and the no-scroll arithmetic for the four desktop viewports, tallest message included. |
| AC-08 | 11.4: label text and association; not auto-focused. |
| AC-09 | 11.5 selection behavior. |
| AC-10 | 11.4: over-limit state, E2, counter; no silent truncation. |
| AC-11, AC-12, AC-13 | Behavior in 11.4 (submit table) and 11.6 (Sign in); messages in 11.11. Invocation count and arguments are engineering. |
| AC-14 | 11.14: one auth-boundary module. Engineering. |
| AC-15 | 11.11: N1–N4, status region, field state "after auth boundary" in 11.4. |
| AC-16 | Engineering. Design input: system font stack (V2 §7.1) and hero media served from the site's own origin (section 5); nothing remote. |
| AC-17 | 11.4 (no loading state), 11.11 (copy rules), 11.9 (media failure is silent). |
| AC-18 | 11.1 inventory and 11.11 copy: no avatar, name, or signed-in wording. |
| AC-19, AC-20 | Engineering. Design input: a restored prompt shows with no message (11.11). |
| AC-21 | Engineering, plus N4 in 11.11 so the copy stays true. |
| AC-22 | 11.7 scene-definition table. |
| AC-23 | 11.7 timing: incoming fades over an opaque outgoing scene; C → A identical; clips hold their last frame and are not looped. |
| AC-24 | Section 5 media table; 11.7 scene definitions; 11.9 video element. |
| AC-25 | 11.7 (only the scene-media component reads the media kind); 11.14. |
| AC-26 | 11.7 timing: `durationMs` per scene, 5000–10000. |
| AC-27 | 11.7 (base color, hold and skip rules); 11.9 failure table; 11.8 (readability does not depend on media). |
| AC-28 | 11.2, all tiers including 320px. |
| AC-29 | 11.2 mobile: field spans the content column with 16px gutters; action inside the field (11.4). |
| AC-30 | 11.2 touch-target table. |
| AC-31 | 11.5 wrapping rules. |
| AC-32 | 11.2 / 11.4: input text is 16px below 768px and 18px above. |
| AC-33 | 11.1 DOM and tab order. |
| AC-34 | 11.12 focus indicator. |
| AC-35 | 11.1 landmarks and element types; 11.4 and 11.10 accessible names. |
| AC-36 | 11.12 reduced-motion table; 11.10 for the control; 11.9 (no video fetched). |
| AC-37 | 11.10. |
| AC-38 | 11.7 layer 1; 11.9 video element (muted, not focusable, no controls). |
| AC-39 | 11.8, with the arithmetic and the QA method. |
| AC-40 | 11.11: text plus icon shape; color is supplementary only. |
| AC-41, AC-42, AC-43 | Engineering. This design needs no new dependency (`lucide-react` is already installed). |
| AC-44 | V2 tokens plus the feature-level values table in the section 11 intro and the per-tier tables in 11.2, 11.4, 11.5, 11.8. |
| AC-46 | 11.2 mobile: scene window 56–332 at 390×844; 11.7 clear-picture table (content scrim feather starts at y 268). |
| AC-47 | 11.7 "where the UI and its scrims actually sit"; 11.8 scrim geometry (solid region 824 × 380px by default). |
| AC-48 | 11.2 values per tier; 11.4 anatomy; 11.3 alignment. |
| AC-49 | 11.3 (the block does not move between scenes); 11.7 (foreground reads only caption and play state). |
| AC-50 | 11.9 loading order and failure table. |
| AC-51 | 11.15. |

### 11.14 Suggested component breakdown

Names and responsibilities only. Folder names follow `FRONTEND_CONTEXT.md` §10; the current skeleton's `components/ui` is used where §10 says `shared/ui`.

| Module | Responsibility |
|---|---|
| `pages/PublicLandingPage` | Thin route composition for `/`, outside the application layout. |
| `features/landing/LandingHero` | The page wrapper and hero grid (11.2): base color, rows, container, gutters, the two scrims. Composes everything below. Knows nothing about scenes. |
| `features/landing/LandingNav` | `header` / `nav`, brand link, Sign in button. Calls the auth boundary with reason "sign in". |
| `features/landing/HeroIntro` | The `h1` and the supporting text. |
| `features/landing/PlannerPrompt` | The form: label, field, input, circular primary action, submit and validation rules (11.4). Owns the input value. Calls prompt preservation, then the auth boundary. |
| `features/landing/PromptSuggestions` | The three chips; reports the selected text to `PlannerPrompt`. |
| `features/landing/PlannerMessage` | The message slot: alert region, counter, status region (11.11). Renders text from a validation state and the boundary's notice. |
| `features/landing/content` | All user-facing strings on the page in one place: heading, supporting text, label, placeholder, suggestions, E1–E2, N1–N4, control names. |
| `features/landing/hero-media/scenes` | **The scene-definition list**: the ordered array of the three definitions in 11.7. The only place scene ids, durations, object positions, captions, and media paths are declared. |
| `features/landing/hero-media/HeroMedia` | The media layer: stacks scenes, runs the cross-fade, marks itself hidden and inert. Never inspects a scene's media kind. |
| `features/landing/hero-media/SceneMedia` | Renders one scene's media with cover and its object position. The **only** module that branches on image / video; owns the video element's attributes, start, pause, reset, and fallback to the poster (11.9). |
| `features/landing/hero-media/useSceneRotation` | Active index, timing from `durationMs`, play / pause, reduced-motion default, document-visibility suspension, readiness and skip rules. Shared by `HeroMedia` and `SceneControl`. |
| `features/landing/hero-media/SceneControl` | Caption pill and pause / play button (11.10). |
| `features/auth/authBoundary` | **The single auth-boundary module.** One function or hook taking the reason and the optional prompt. Placeholder body: no navigation, no network; publishes the notice that `PlannerMessage` shows. Replaced later by real authentication with no change to landing components. |
| `features/planning/pendingPrompt` | The one session-storage key and its save / read / clear helpers, with failures swallowed and reported as "not saved". Placed under `planning` because the Authenticated Home planner is what will read it; the Lead may prefer `features/auth`. |
| `components/ui/button` | Existing shadcn `Button`, used as a primitive only (V2 §30). Recommended: add an `accent` icon variant (primary action) and an `onMedia` variant (quiet control) with the sizes in 11.4–11.6, leaving `default` and `outline` untouched so other pages do not change. |

### 11.15 Pointer and cursor behavior

Hover treatments apply only where the device reports a hover-capable pointer (`hover: hover`), so touch screens never show a stuck hover. Color changes run over `--duration-fast` with `--ease-ui`; nothing moves or scales on hover or press.

| Element | Cursor | Hover | Pressed | Focus-visible |
|---|---|---|---|---|
| Media layer and scrims | `default`. Inert: no pointer events, no hover response, no click, no drag, no context action of their own. | None | None | Not focusable |
| Heading, supporting text, messages, caption | `auto` (text is selectable) | None | None | Not focusable |
| Label, and the scene-control pill outside its button | `default` | None | Clicking the label focuses the input (native label behavior); the pill does nothing | Not focusable |
| Planner field | `text` over the whole field surface except the action; a click anywhere on that surface focuses the input | Fill `paper` → `snow` | No separate state | Ring around the field; fill `snow` |
| Primary action | `pointer` | `conifer` → `conifer-deep` | `conifer-deep` → `conifer-press` | Ring around the circle |
| Chips | `pointer` | Fill `ink` 0.72 → 0.88; edge 1px → 2px `snow` | Fill solid `ink`; 2px edge | Ring around the pill |
| Sign in | `pointer` | Same as chips (surface and border emphasis) | Same as chips | Ring around the pill |
| Brand link | `pointer` | Underline, 2px thick, 4px offset | Underline stays | Ring around its padded box |
| Pause / play button | `pointer` | 36px circle of `snow` at 12% behind the icon | 36px circle of solid `ink` | Ring around the 44px circle |

Hover is never required to discover or use anything: every control is visible at rest with its full label or icon, there are no tooltips, nothing is revealed on hover, and every hover state has a keyboard-focus and a touch equivalent. Clicking the scene does nothing and never pauses the background; the pause control is the only way to do that.

## 12. Decisions and Open Questions

Decisions made for this feature. D1–D12 are Lead decisions; D13–D17 were made by `ui-ux` in the Design System Version 2 synchronization and accepted by the Lead on 2026-10-11.

| # | Decision | Reason |
|---|---|---|
| D1 | The Public Landing lives at `/` outside the application layout; the Home placeholder moves to `/home`. Redirecting signed-in users away from `/` is deferred to the authentication feature. | PRD §7.1 requires the two experiences to be separate; routing detail is left to implementation. |
| D2 | Suggested prompts populate the input and do not submit. | PRD §7.3 leaves this open. Populating keeps the visitor in control and avoids a surprise sign-in prompt. |
| D3 | The prompt is preserved in session storage. | PRD §7.5 leaves the mechanism open. Session storage survives a same-tab authentication redirect and clears itself afterwards. |
| D4 | The page is a single hero with no sections below it. | PRD §7.3 and §41 call for a minimal hero; additional marketing content is unrequested scope. |
| D5 | The background has a visible pause control. | Required for accessibility of auto-changing content; not stated in the PRD. |
| D6 | **Superseded by Design System Version 2 §4.3 and §5.2; see D13.** | The composition is now set by the design system, not by this feature. |
| D7 | Under reduced motion the background starts paused, and the visitor may start it with the play control. | The system setting should set the default, not remove a deliberate choice. AC-36 was amended to match. |
| D8 | The 2000-character limit is measured on the trimmed prompt. | The trimmed prompt is what is saved and later sent. |
| D9 | Scenes carry a caption, shown with the pause control. Three suggestion chips are shown. | Both proposed by `ui-ux` within the allowances of section 4; accepted. |
| D11 | Sign In feedback appears in the planner's message slot. | Accepted for the placeholder period; real authentication will navigate away instead. |
| D12 | On mobile the scene keeps a real window above the heading (AC-46): the primary action sits inside the field and the reserve holds a three-line message only. | V2 §26 requires mobile to preserve environmental atmosphere. |
| D13 | The hero content is horizontally centered in the lower-middle of the frame, inside V2's primary UI safe zone, with center-aligned text; spare height is split 5 : 1 above and below the block from 768px. | V2 §4.3, §5.2. PRD §7.3's "central AI trip-planning input" is met literally. Replaces D6. |
| D14 | The primary action is a circular icon button (`ArrowRight`, name "Start planning") inside the field at every width. | V2 §11 and §14. One treatment across tiers, and on mobile it returns 56px of height to the scene. |
| D15 | All three scenes are the delivered videos over their posters at 5000ms, played once per turn. The still-image kind stays in the contract, unused. | User decision on media: real media where it exists. Clip length is 5.04s and looping would show a hard cut. |
| D16 | The content scrim is a centered pool on desktop (a full-width band below 1024px) that ends 16px below the field and grows only while a message is shown; chips float on the picture with their own surface. | V2 §16: local scrim, environment stays visible. Keeps the scrim inside V2's safe zone at 1920×1080. |
| D17 | Hover on quiet controls is a more solid fill and a 2px edge. | V2 §19 asks for a contrast increase on hover and a more solid pressed state. |

Open questions:

| # | Question | Current assumption | Who decides |
|---|---|---|---|
| 1 | In the delivered art the hikers stand inside or beside the primary UI safe zone (11.7): scene A's hiker is under the scrim on every desktop viewport. Accept, or re-compose the scenes? | Accepted as delivered; the interface is not moved per scene. | User, with CG production |
| 2 | The posters are unoptimized PNGs and the videos are 12–20 MB each. Re-export web-sized files before public release? | Used as delivered; the poster-first, one-at-a-time loading order (11.9) keeps the page usable meanwhile. | User |
| 3 | The clips are 5.04s, so all three scenes run at V2's 5-second minimum, not its preferred 6–8 seconds. Deliver longer clips later? | 5000ms for video scenes; a longer clip needs only a new `durationMs`. | User, with CG production |
| 4 | V2's primary UI safe zone matches the interface at 1920×1080 only; on smaller desktop viewports the same interface covers about X 320–1600, Y 230–955 of the master (11.7). Should the design system state the larger area? | Both rectangles are recorded in 11.7; the design system is unchanged. | User |
| 5 | A single-line input shows about 65 characters at 720px and about 35 on mobile; several PRD example requests are longer. Should the planner become an auto-growing multi-line field? | Single-line for this feature. Decide when the Authenticated Home planner is designed, since the two should match. | Lead, in the Home feature |
None of these blocks implementation; each has a working assumption in section 11.
