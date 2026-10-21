# FEATURE-003 — Conversational Trip Planner

| | |
|---|---|
| Status | Implemented and validated 2026-10-12 (checkpoint: `.claude/state/features/003-conversational-planner.md`). Product decisions Q1, Q2, Q3, and Q5 finalized by the user on 2026-10-12 (section 25.2). Hardened the same day: planner state is owned by the signed-in user (D28, section 16) and the product is desktop-web first for validation (D29, section 24.1) |
| Date | 2026-10-12 |
| Route | `/home` (protected) |
| Depends on | FEATURE-001 (Public Landing), FEATURE-002 (Authentication), backend conversational planner (`POST /api/planner/turn`) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` → `docs/DESIGN_SYSTEM.md` → `docs/FRONTEND_CONTEXT.md` → FEATURE-001 → FEATURE-002 |

How to read this document: sections 4–7 and 13–16 are what `frontend` needs for data and state; sections 8–12 and 17–19 are the design; section 24 is what `qa` validates; section 25 lists decisions and limits. Each section stands on its own.

---

## 1. Feature Summary

The authenticated `/home` becomes the product's main planning experience: a multi-turn conversation in which the user describes a hike in their own words, the backend planner asks for what it still needs, and real trail recommendations appear in the conversation. The user can keep refining after results arrive.

The conversation sits over the existing pre-rendered looping Home video (a stylized outdoor-preparation room). The video is atmosphere; the conversation is the product.

This feature delivers PRD development steps 6–9: the Authenticated Home structure, its looping room background, prompt continuity from the Public Landing, and real recommendation integration.

## 2. Goals

1. A signed-in user can go from a natural-language request to real backend recommendations through repeated conversation, without filters or forms.
2. The backend `PlanningContext` carries across turns unchanged by the frontend, so each reply builds on the last.
3. Recommendations do not end the conversation; one more message refines them.
4. A prompt typed on the Public Landing arrives in the planner without retyping.
5. `/home` feels like a personal preparation space: the room video stays visible beside a bounded, readable planner.
6. The planner works before the video loads, without the video, and with reduced motion.

Product positioning: `/home` is a personal conversational outdoor-planning workspace. It is not a dashboard, a search and filter page, a trail database, a full-screen chat clone, a set of metric cards, or a prompt box that navigates elsewhere.

## 3. User Journey

```text
Public Landing prompt (optional)
        ↓ sign in / register (FEATURE-002)
/home: room video + planner, prompt waiting as a draft
        ↓ choose trip date and starting point (once)
User message ──► POST /api/planner/turn ──► assistant reply
        │                                     │
        │        NEEDS_CLARIFICATION: a question; user answers
        │        READY_TO_RECOMMEND: up to 3 trail cards in the conversation
        ↓
User refines ("Actually, something easier") ──► new turn, same context ──► new results
        ↓
New Plan (start over)  ·  Sign out (FEATURE-002)
```

Example conversation. The assistant lines are the backend's actual `assistantMessage` texts.

| Turn | User | Backend status | Assistant |
|---|---|---|---|
| 1 | "I want to go hiking this weekend." | `NEEDS_CLARIFICATION` | "How difficult would you like the hike to be?" |
| 2 | "Moderate." | `NEEDS_CLARIFICATION` | "How long would you like to spend hiking?" |
| 3 | "About three hours." | `READY_TO_RECOMMEND` | "I found 3 trails that fit what you're looking for." + cards |
| 4 | "Actually, I'd prefer something easier." | `READY_TO_RECOMMEND` | New message + new cards; turn 3's cards stay in the history as earlier results |

A reply such as "Moderate, preferably somewhere with a lake" in turn 2 already satisfies the readiness rule (section 4.5), so the backend goes straight to recommendations. The frontend never decides which question comes next.

## 4. Current Backend Contract

Source: `docs/FRONTEND_CONTEXT.md` sections 4–6, checked against the DTO records in `recommendation-service` on 2026-10-12. They agree. If they are found to disagree during implementation, stop and report; do not adapt the frontend silently.

### 4.1 Endpoint

| | |
|---|---|
| Method and path | `POST /api/planner/turn` |
| Service | `recommendation-service`, `http://localhost:8083` |
| Authentication | Required: `Authorization: Bearer <Keycloak access token>` |
| Behavior | Processes exactly one turn. Stateless: no session and no message history is kept by the backend |
| Response | Complete and synchronous. There is no streaming |

### 4.2 Request: `PlannerTurnRequest`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `message` | string | yes | Not blank; at most 2000 characters |
| `context` | `PlanningContext` or `null` | no | `null` on the first turn of a plan; afterwards the latest context the backend returned |
| `latitude` | number | yes | −90 to 90 |
| `longitude` | number | yes | −180 to 180 |
| `tripDate` | string, ISO local date `YYYY-MM-DD` | yes | Required. No past/future check exists in the backend |
| `radiusKm` | number or `null` | no | Greater than 0 when present. Omitted means the backend's 50 km default |

### 4.3 `PlanningContext`

| Field | Type | Validation |
|---|---|---|
| `difficulty` | `"EASY" \| "MODERATE" \| "HARD" \| null` | |
| `maxDistanceKm` | number or `null` | Greater than 0 |
| `maxElevationGainM` | integer or `null` | 0 or greater |
| `maxDurationMin` | integer or `null` | Greater than 0 |
| `preferredScenery` | array of `"LAKE" \| "VIEWPOINT" \| "WATERFALL" \| "FOREST" \| "MOUNTAIN" \| "OCEAN"` | The backend returns `[]`, never `null` |

### 4.4 Response: `PlannerTurnResponse`

| Field | Type | Notes |
|---|---|---|
| `status` | `"NEEDS_CLARIFICATION" \| "READY_TO_RECOMMEND"` | |
| `assistantMessage` | string | Deterministic text written by the backend |
| `context` | `PlanningContext` | The supplied context with this message's preferences merged in |
| `recommendations` | array of `ScoredTrailRecommendation` | Empty while clarifying. At most 3 when ready. Can be empty when ready (no match) |

`ScoredTrailRecommendation`:

| Field | Type | Notes |
|---|---|---|
| `trail` | `TrailSummaryResponse` | Below |
| `score` | integer | 0–100 |
| `breakdown` | `{ intent, weather, gear, scenery, proximity }`, all integers | Maximums: intent 55, weather 15, gear 15, scenery 10, proximity 5 |

`TrailSummaryResponse` as it arrives inside a recommendation. Every field can be `null`.

| Field | Type | Used by this feature |
|---|---|---|
| `id` | string (UUID) | As a list key only |
| `name` | string | Shown |
| `description` | string | Shown, per section 12 |
| `difficulty` | string: `EASY`, `MODERATE`, `HARD` | Shown as a label |
| `distanceKm` | number | Shown |
| `elevationGainM` | integer | Shown |
| `estimatedDurationMin` | integer | Shown |
| `scenery` | array of scenery values | Shown as labels |
| `latitude`, `longitude`, `source` | number, number, string | Not shown |
| `coverImageUrl` | string | Not shown. It is `null` for every seeded trail |
| `baselineGearRequirements` | array of gear categories | Not shown. Belongs to Pack |

The response does **not** contain: the forecast, temperature, precipitation, wind, distance from the user, driving time, route geometry, the required gear, gear readiness, or a written explanation. None of these may be shown or implied.

### 4.5 Planner behavior the frontend relies on

- Only preferences the message explicitly mentions replace earlier values. Everything else in the context is kept. An explicit "no scenery preference" clears scenery.
- The planner is ready when `difficulty` is known and at least one of `maxDurationMin`, `maxDistanceKm`, `maxElevationGainM`, or a non-empty `preferredScenery` is known.
- Not ready and no difficulty: it asks "How difficult would you like the hike to be?". Not ready with difficulty: it asks "How long would you like to spend hiking?".
- Ready: it runs the same pipeline as `/api/recommendations/query` (nearby trails, owned gear, weather per trail, scoring, top three) and answers "I found N trail(s) that fit what you're looking for." or, with no match, "I couldn't find a trail that fits those preferences."
- The message is used only to extract hiking preferences. **A date or a place written in the message is not read.** The date and the starting point come only from `tripDate`, `latitude`, and `longitude`.
- Clarification turns call no trail, user, weather, or scoring service. Ready turns call all of them, one weather request per nearby trail, so a ready turn is noticeably slower.

### 4.6 Errors as the backend produces them

| Situation | HTTP | Body |
|---|---:|---|
| Message matched the prompt-injection guard | 400 | `ProblemDetail` with `title: "Unsafe Prompt"` |
| Request validation failed | 400 | Spring's default error body; shape not guaranteed |
| Missing, invalid, or expired token | 401 | Usually empty |
| User service unavailable | 503 | `ProblemDetail` with `title: "User Service Unavailable"` |
| OpenAI, weather, or trail-service failure; anything unmapped | 500 | Default error body |

One weather failure fails the whole ready turn. A date the weather dependency cannot serve would be such a failure; the frontend does not try to predict it (section 11.1).

### 4.7 TypeScript shape (guidance)

```ts
type TrailDifficulty = "EASY" | "MODERATE" | "HARD"
type SceneryType = "LAKE" | "VIEWPOINT" | "WATERFALL" | "FOREST" | "MOUNTAIN" | "OCEAN"

type PlanningContext = {
  difficulty: TrailDifficulty | null
  maxDistanceKm: number | null
  maxElevationGainM: number | null
  maxDurationMin: number | null
  preferredScenery: SceneryType[]
}

type PlannerTurnRequest = {
  message: string
  context: PlanningContext | null
  latitude: number
  longitude: number
  tripDate: string // YYYY-MM-DD
  // radiusKm is not sent by this feature
}

type PlannerTurnResponse = {
  status: "NEEDS_CLARIFICATION" | "READY_TO_RECOMMEND"
  assistantMessage: string
  context: PlanningContext
  recommendations: ScoredTrailRecommendation[]
}
```

### 4.8 Reaching the endpoint from the browser

`recommendation-service` defines no CORS policy and the API gateway has no routes, so a browser on `http://localhost:5173` cannot call `http://localhost:8083` directly. Changing the backend is out of scope.

Decision D2 (approved by the user, 2026-10-12): the Vite development server proxies `/api/planner/**` to `recommendation-service` at `http://localhost:8083`. It is the smallest possible bridge: one proxy entry in `Project/Frontend/vite.config.ts`, with no new environment variable. `VITE_API_BASE_URL` stays empty, so the browser makes a same-origin request to `/api/planner/turn`. Nothing else is proxied; this feature calls no other endpoint.

This is explicitly a local-development bridge. It does not change `recommendation-service` CORS, the API gateway, or any backend networking, and none of those may be modified in this feature. Production routing remains future infrastructure work (`FRONTEND_CONTEXT.md` section 11): `npm run preview` and a deployed build cannot reach the planner until it exists. If the proxied request is refused for a server-side reason, that is a backend contract gap: stop and route it through `backend-api`.

### 4.9 Authentication of the request

- The token comes from `getAccessToken()` exported by `@/features/auth` (FEATURE-002), obtained immediately before each request. It is never read from storage and never stored by this feature.
- The `Authorization` header is attached only to requests for the application's own API paths (FEATURE-002 rule S15). The shared API layer gains this authenticated request function in this feature; it is the first feature to call a product API (FEATURE-002 D8).
- If `getAccessToken()` rejects, no request is sent, and FEATURE-002's session-ended handling applies.
- The browser makes no request to OpenAI, Open-Meteo, or any third party. It talks to the application's own origin and to Keycloak, nothing else.

## 5. Product Behavior

### 5.1 What `/home` contains

1. The Home media background (section 8).
2. A lightweight header: product name, New Plan, a link to Gear, the signed-in identity, Sign out (section 9).
3. The conversational planner: message history, trip context (date and starting point), composer (sections 10 and 11).
4. Recommendation results, inside the conversation (section 12).

Nothing else: no metric cards, no filter panel, no trail browser, no secondary feature panels.

### 5.2 What it replaces

The `/home` placeholder content is removed: the placeholder heading, the "Frontend ready" button, and the read-only "Your trip request" block. The planner replaces the block's purpose (section 15).

`/home` no longer renders inside `AppLayout`'s header and centered column. It gets its own full-viewport shell, still inside `ProtectedRoute` (decision D1). `/gear`, `/trails/:trailId`, and the not-found route keep `AppLayout` unchanged.

### 5.3 A turn, step by step

1. The user sends a message. Sending needs a valid message, a trip date, and a starting point (sections 10 and 11).
2. The message appears in the history immediately. A waiting indicator appears in the assistant's position.
3. The frontend sends the message, the latest `PlanningContext` (or `null`), the coordinates, and the date.
4. On success: the returned `context` replaces the stored one; `assistantMessage` is shown exactly as returned; if the status is `READY_TO_RECOMMEND`, the recommendation group is shown with that message.
5. On failure: the message stays, marked as not sent, with a way to retry. The stored `PlanningContext` does not change (section 13).

### 5.4 Refinement

After results, the composer stays available. The next message is sent with the current context exactly like any other turn. If the backend returns recommendations again, that group becomes the current result and the earlier group stays in the history, marked as earlier (section 12). The user is never told to start over to change one preference.

### 5.5 Initial state

A new plan opens with a fixed greeting in the assistant's position and four starter ideas. The greeting is interface copy, not a backend message, and is never sent.

Starter ideas are natural-language sentences. Activating one puts its sentence in the composer as a draft and focuses the composer; it does not send. Starters must not mention a date or a place, because the backend does not read either from text (section 4.5). For that reason the brief's example "Somewhere close to Vancouver" is not used.

| Label | Sentence placed in the composer |
|---|---|
| Easy lake hike | An easy hike with a lake view |
| Mountain views | A moderate hike with mountain views |
| Half-day adventure | A half-day hike, around four hours |
| Waterfall walk | A short, easy walk to a waterfall |

Starter ideas are shown only while the conversation has no user message.

## 6. Conversation Model

Two separate things, never derived from each other:

| | Displayed history | `PlanningContext` |
|---|---|---|
| What it is | What the user sees: `ChatMessage[]` | The backend's structured planning state |
| Owner | Frontend | Backend. The frontend stores the latest copy and returns it |
| Changes when | A message is sent, answered, or fails | A turn succeeds |
| Sent to the backend | Never | On every turn after the first |

Conceptual message shape (guidance, not a required type):

```ts
type ChatMessage =
  | { id: string; role: "user"; text: string; delivery: "sending" | "sent" | "failed"; failure?: FailureKind }
  | {
      id: string
      role: "assistant"
      text: string                       // assistantMessage, verbatim
      status: "NEEDS_CLARIFICATION" | "READY_TO_RECOMMEND"
      recommendations: ScoredTrailRecommendation[]
      usedTripDate: string               // what this turn was sent with
      usedLocationLabel: string          // "Your location" or "Vancouver"
    }
```

Rules:

- Assistant text is always the backend's `assistantMessage`, rendered as a text node. The frontend writes no assistant sentences of its own, with one exception: the fixed greeting (section 5.5).
- A user message that failed was never merged into the context and is shown as not sent.
- One request at a time. A second turn cannot start while one is in flight.
- A response that arrives after New Plan, after sign-out, or for a conversation that no longer exists is discarded.

## 7. PlanningContext Ownership

- The latest `context` returned by the backend is the source of truth. The frontend stores it and sends it back unmodified on the next turn.
- The first turn of a plan sends `context: null`.
- The frontend must not: build or edit a `PlanningContext` itself; parse its own chat history or the user's text to infer preferences; map starter ideas to enum values; call OpenAI; reinterpret, default, or clear any field.
- The frontend displays the returned context read-only as the plan summary line (10.2.8), using the label rules of section 12.2. It is a rendering of backend state, has no edit controls, and is not a filter.
- Date and starting point are not part of `PlanningContext`. They are trip context owned by the frontend (section 11).
- A failed turn leaves the stored context exactly as it was.

## 8. Home Media Behavior

### 8.1 The actual assets

Directory: `Project/Frontend/public/media/home/`, served at `/media/home/`. Inspected 2026-10-12.

| File | Kind | Facts |
|---|---|---|
| `background.mp4` | Looping video | H.264, 1916×1080, 8.04 s, about 8.8 Mbit/s, 8.8 MB, **no audio track**. The first and last frames match, so it loops without a visible cut |
| `background.png` | Poster / still | 1672×941 (same 16:9 shape as the video), 2.7 MB. The same scene and composition as the video's opening frame |

No other Home media exists. In this feature no file is generated, downloaded, renamed, or transcoded, and no separate mobile asset is created.

Which asset is the background (decision D26):

| Condition | Background |
|---|---|
| Viewport 768px wide or more, motion allowed | `background.mp4` looping over the `background.png` poster |
| Viewport under 768px wide | `background.png` only. The video is not requested |
| `prefers-reduced-motion: reduce`, any width | `background.png` only. The video is not requested |

Reason for the mobile rule: below 768px the conversation sheet covers most of the scene, so continuously decoding an 8.8 MB video adds little.

What the scene shows, as fractions of the frame (x from the left, y from the top):

| Region | Content | Motion in the video |
|---|---|---|
| x 0–25%, y 15–65% | Stone wall, wood stove with a fire, cat bed below | Fire flickers. The cat leaves its bed and walks toward the center (about x 20–35%, y 50–65%) and returns |
| x 30–75%, y 12–58% | Large window: snowy peaks, forest, lake at sunset. The brightest region | Still |
| x 30–75%, y 58–95% | Bench, rug, wooden floor in warm light | Still |
| x 62–78%, y 45–80% | Trekking poles, boots, backpack; white dog beside the chair | The dog stands and walks a few steps (about x 60–78%, y 50–80%) and settles again |
| x 75–100%, y 10–90% | Generic character seen from behind at a desk with a laptop, lantern, map wall, hanging jacket | Minor |
| x 0–30%, y 70–100% and x 85–100%, y 65–100% | Dark foreground: armchair, mugs, plants | Still |

The scene is warm, bright, and detailed everywhere. No region is quiet or dark enough to carry text unaided.

The character is the generic pre-rendered figure of PRD section 7.8. It is not the user's avatar and must not be presented as one.

### 8.2 Behavior requirements

| # | Requirement |
|---|---|
| M1 | The media fills the viewport behind all content, keeps its aspect ratio, and is cropped with `object-fit: cover`. It is never stretched or letterboxed |
| M2 | Where the video is the background (768px wide or more, motion allowed), it is muted, loops, plays inline, and starts by itself where the browser allows. It shows no native controls, no picture-in-picture or remote-playback affordance, and cannot produce sound |
| M3 | The poster is the base layer and is requested first. The video is drawn over it in the same box with the same crop and is revealed only once it is showing frames, so the swap causes no flash and no layout shift |
| M4 | If the video is refused, stalls, or fails to load, the poster stays. If the poster also fails, the `ink` base color stays. In every case the planner is fully usable and no error is shown to the user |
| M5 | The interface renders and works without waiting for any media event. No planner element depends on media readiness |
| M6 | The media is mounted once for the life of the `/home` visit. Sending a message, receiving a reply, an error, New Plan, opening the date control, or any other planner state change must not remount, reload, restart, or seek the video |
| M7 | The media is decorative: empty alternative text, hidden from assistive technology, not focusable, no pointer events |
| M8 | Below 768px wide, and under `prefers-reduced-motion: reduce` at any width, the poster is the background and the video file is not requested (section 18). The choice follows the viewport and the preference as they change during a visit (resize, rotation, a changed setting): when the video stops applying it is paused and removed; when it starts applying it is requested and revealed as M3 describes. Planner state is untouched either way |
| M9 | Because the loop moves continuously for more than five seconds, a Pause / Play control is provided wherever the video is the background (DESIGN_SYSTEM section 23). It is secondary, keyboard-operable, exposes its state, and is not the browser's native control |
| M10 | The media takes no props from planner state. Its only inputs are its asset configuration, the motion preference, and the viewport width (section 21) |

`SceneMedia.tsx` from FEATURE-001 is the reference for stable native-video behavior (poster under video, reveal on `playing`, enforced silence). It is a reference, not a required dependency: the Home has one scene and no rotation.

### 8.3 Presentation: crop, position, readability

#### 8.3.1 Layers, back to front

| # | Layer | Specification |
|---|---|---|
| 0 | Base | `ink`, on the Home shell. Always painted |
| 1 | Poster | Fills the viewport, `object-fit: cover`. Fades in from the base over `--duration-scene-fade` (1200ms, `--ease-scene`) once decoded |
| 2 | Video | Only at 768px wide or more with motion allowed (M8). Same box, same `object-fit` and `object-position` as the poster. Opacity 0 until its first `playing` event, then 0 → 1 over `--duration-base` (240ms, `--ease-ui`). Its opening frame is the poster's frame, so the swap is not perceptible |
| 3 | Header scrim | 8.3.3 |
| 4 | Interface | Header, planner panel, background control |

Layers 0–3 are decorative: `aria-hidden`, `pointer-events: none`. There is no full-frame tint, no `backdrop-filter`, and no text shadow anywhere on `/home`.

#### 8.3.2 Crop

"Scene x / y" is a fraction of the frame from the left / top, as in 8.1.

| Viewport width | Layout | `object-position` | Effect |
|---|---|---|---|
| ≥1024px | Panel at the left (section 9) | `100% 30%` | Narrower than 16:9: the whole crop comes off the left edge, which is behind the panel. Wider than 16:9: most of the crop comes off the floor, keeping the window and the character's head |
| 768–1023px | Panel docked at the bottom (section 17) | `68% 50%` | At 768×1024 the viewport shows scene x 39–81%: the whole window, centred |
| <768px | Panel docked at the bottom | `64% 50%` | Poster only (M8). At 390×844 the viewport shows scene x 47–73%: the main window pane with the ridge and the lake |

What each crop leaves unobstructed is listed in 9.3 and 17.1.

#### 8.3.3 Readability

Every piece of text on `/home` uses exactly one of these mechanisms (the method of FEATURE-001 section 11.8), so no text depends on a video frame. Ratios are worst case, with a pure white frame behind; the arithmetic is in 19.5.

| Mechanism | Used by | Value |
|---|---|---|
| Own surface, translucent | Planner panel; text set directly on it is `snow` | `ink` at **0.88**. `snow` on it: at least 12.32:1 |
| Own surface, opaque | Composer, user messages, trail cards, popovers: `paper` with `ink` text. Send: `conifer` | 16.04:1; 8.05:1 |
| Scrim plateau | Header text (`snow`) | A band of `ink` at **0.72** across the full width and the full header height, then a feather to 0 over 40px (24px below 768px). No text sits in the feather. At least 6.97:1 |
| Quiet control | New Plan, Sign out, Menu, background control | FEATURE-001's recipe: fill `ink` at 0.72, 1px solid `snow` border, `snow` text or icon. At least 6.97:1 |

Outside the header band, the panel, and the background control, the media is shown exactly as delivered. The band covers ceiling rafters only: the window glass starts at scene y 16% (173px at 1080, 144px at 900, 123px at 768), below the band and its feather (112px, 112px, 104px).

#### 8.3.4 Background control (Pause / Play)

| Property | Value |
|---|---|
| Anatomy | One 44px circle, quiet-control recipe, a 20px lucide icon in `snow`. No caption, no label text |
| Placement, ≥1024px | Fixed at the bottom-right: right edge on the gutter, 40px (XL, L) or 24px (M, S) above the bottom edge. It sits on the dark foreground plant, away from the planner and the header |
| Placement, 768–1023px | Fixed at the top-right: right edge on the gutter, 8px below the header. The docked panel always leaves this strip free (17.1) |
| Below 768px | Not rendered: the background is the poster (M8) |
| Icon and name | Playing: `Pause`, `aria-label="Pause background animation"`. Paused: `Play`, `aria-label="Play background animation"`. The name carries the state; no `aria-pressed` |
| Hover / active / focus-visible | Fill `ink` at 0.88 and a 2px `snow` edge / solid `ink` / focus ring |
| Behavior | Pause holds the current frame; Play continues from it. Activation moves no focus. The state is not stored: every load starts playing. It is untouched by New Plan and by every planner change (M6) |
| Rendered when | The viewport is 768px wide or more, motion is allowed, and the video has not failed to load. If the browser refuses autoplay it shows `Play`. Not rendered below 768px, under reduced motion (section 18), or after a video failure: nothing moves, so there is nothing to control |
| Order | Last element in the DOM and in the tab order, wherever it is rendered |

## 9. Desktop UI Composition

Lead constraints for this section:

- The video stays visible. The planner is a bounded surface in the scene, not a full-width or full-height opaque panel.
- Planner width is in the approximate range 620–760px on desktop unless the scene composition justifies another value.
- Text never depends on raw video contrast, text shadow, or backdrop blur (DESIGN_SYSTEM sections 15–17).
- The header keeps FEATURE-002's account behavior exactly: identity as text with the same fallback order, an immediate Sign out, and the `signing-out` state (control shows it is working; the rest of the page is inert and `aria-busy`). Only its presentation over media may differ from `AppLayout`.
- Header contents: product name, New Plan, Gear (a link to the existing `/gear` route), identity, Sign out, and the media Pause / Play control wherever the design places it. No entries for pages that do not exist.

### 9.1 Placement

The planner is one panel in the **left third** of the frame, under the header, with the room open to its right.

Reason, from the frames: the window (scene x 40–76%) is the brightest and most emotional region; the character at the desk (x 75–94%) is the echo of the user planning; the dog walks through x 60–78%. A panel large enough for a conversation and three trail cards cannot sit in the centre, at the bottom, or on the right without covering one of them. The left third holds the stove, the small side window, and the cat: the room's secondary detail. It is given up. At 0.88 the fire still reads as a faint warm glow through the panel.

### 9.2 Geometry

Tiers by viewport width. All values in px.

| | XL ≥1680 | L 1440–1679 | M 1280–1439 | S 1024–1279 |
|---|---:|---:|---:|---:|
| Gutter (left and right) | 64 | 56 | 40 | 32 |
| Header height | 72 | 72 | 64 | 64 |
| Panel width | 680 | 640 | 620 | 560 |
| Panel top | header + 32 | header + 32 | header + 16 | header + 16 |
| Bottom margin | 40 | 40 | 24 | 24 |

- Panel height: `min(760px, 100vh − top − bottom margin)`, never below 480px (17.3). Left edge on the gutter. Radius 24px.
- The panel does not follow FEATURE-001's centred 1280px container: centring would push it over the window. Above 1920px wide it stays on the 64px gutter and the room simply grows.
- The 560px width in tier S is below the 620–760 range on purpose: at 1024px a 620px panel leaves under 40% of the frame for the room.

| Reference viewport | Panel box (x, y, w × h) | Share of viewport | Free below panel |
|---|---|---:|---:|
| 1920×1080 | 64, 104, 680 × 760 | 25% | 216px: armchair and mugs in the foreground |
| 1440×900 | 56, 104, 640 × 756 | 37% | 40px |
| 1366×768 | 40, 80, 620 × 664 | 39% | 24px |

### 9.3 Safe zones: what stays visible

Horizontal extents in viewport px, with the crop of 8.3.2.

| Scene content | 1920×1080 (no crop) | 1440×900 (157px off the left) | 1366×768 (no crop) |
|---|---|---|---|
| Panel right edge | 744 | 696 | 660 |
| Window frame | 768–1450: fully clear, 24px from the panel | 482–1049: the narrow left pane and 94px of the main pane are behind the panel | 546–1031: the narrow left pane is behind the panel |
| Snowy ridge | 970–1436 | 649–1038 (its first 47px hidden) | 690–1022 |
| Lake | 1152–1382 | 801–993 | 820–983 |
| Character and laptop | 1440–1803 | 1041–1343 | 1025–1283 |
| Dog, resting and walking | 1152–1478 | 801–1073 | 820–1052 |
| Stove, fire, cat | Behind the panel | Behind the panel | Behind the panel |

Guaranteed at every viewport from 1280px wide and 16:10 or wider: the ridge from scene x 57%, the lake, the whole character with the laptop, and the dog's whole path are never under interface. In tier S at 4:3 (1024×768) the panel covers the window up to scene x 68%; the character and the dog stay clear.

Contract for any later Home media (art-direction guidance, as in DESIGN_SYSTEM section 5): the interface occupies scene x 0–40% at 16:9 and up to 57% at 16:10, plus the top 8%. Narrative subjects belong in x 57–95%, y 10–90%.

### 9.4 Panel surface

- Fill `ink` at 0.88. No shadow, no blur. A 1px transparent border, so that an edge exists in forced-colors mode.
- The panel never sets `overflow: hidden` (focus rings must not be clipped); its corners come from its children's own radii.
- Two kinds of content only. Text set directly on the panel is `snow`. What the user writes or reads as content sits on opaque `paper`: user messages, the composer, trail cards, popovers.
- `conifer` appears once in the panel: the Send action.

### 9.5 Header

One row at the top of the viewport, full width, horizontal padding equal to the gutter, over the header scrim (8.3.3). It has no fill, border, or shadow of its own. The page does not scroll, so it is not sticky.

```text
|gutter| Brand ................ New Plan |                    Gear   identity   Sign out |gutter|
       |<--------- panel width --------->|
```

The left group is exactly as wide as the panel: the brand on its left edge, New Plan on its right edge, so the action sits directly above the thing it clears. The right group ends on the right gutter. DOM order: brand, New Plan, Gear, identity, Sign out.

| Item | Specification |
|---|---|
| Brand | "Outdoor Trip Companion". `snow`, 16/24, weight 700, letter-spacing 0.01em, one line. A link to `/home` with a 44px-tall hit box. Hover: underline, 2px thick, 4px offset |
| New Plan | Section 14.1 |
| Gear | A link to `/gear`, label "Gear". `snow`, 14/20, weight 600; 44px-tall hit box, 12px horizontal padding, radius 8px. Hover: underline, 2px thick, 4px offset. Active: fill `snow` at 0.12. No icon |
| Identity | Content, semantics, and fallback order exactly as FEATURE-002 21.4.1 (a `span` after visually hidden "Signed in as "). Presentation: `snow`, 14/20, weight 400, one line with ellipsis; max-width 240px (XL, L), 200px (M), 160px (S); 24px after Gear |
| Sign out | Behavior exactly as FEATURE-002 21.4.2. Presentation: quiet-control recipe, pill, label "Sign out" 14/20 weight 600, 16px horizontal padding; 36px tall with a fine pointer, 44px on a coarse pointer; 12px after the identity. Hover: fill `ink` at 0.88 and a 2px `snow` edge. Active: solid `ink` |
| Sign out, working (`signing-out`) | Label "Signing you out…" with a 16px `LoaderCircle` before it; `aria-disabled="true"`; cursor `progress`; it grows toward the start. `main` is `inert`, `aria-busy="true"`, opacity 0.4 |

Every item shows the focus ring on `:focus-visible`.

### 9.6 Stability

- The panel's position and size depend on the viewport only, never on its content. A reply, an error, or a recommendation group changes what the history contains and where it is scrolled; nothing else moves.
- Recommendation cards appear inside the history at the panel's width. The panel does not widen, no second column or side drawer opens, and nothing is drawn over the room.
- The composer's height changes only when the user's own text grows or shrinks it (10.2.5).

## 10. Conversational Planner Design

### 10.1 Behavior rules

**Panel**

- Bounded height on desktop. The message history scrolls inside the panel; the document does not grow with each message.
- The composer and the trip context stay in place while the history scrolls.
- The layout does not jump when a reply, an error, or a recommendation group appears.
- User and assistant messages are distinguishable without relying on color alone.

**Composer**

| Rule | Behavior |
|---|---|
| Control | A multiline `textarea` with a label. It grows with its content up to a limit, then scrolls. Not a single-line search field |
| Limit | 2000 characters, measured on the trimmed text, using the existing `checkPlanningPrompt` (`features/planning/planningPrompt.ts`). Over the limit, the text is kept, sending is blocked, and a visible message says so |
| Empty | With no non-space text, the send action is unavailable |
| Enter | On a device with a hardware keyboard and fine pointer, Enter sends and Shift+Enter inserts a line break. Enter during IME composition never sends |
| Touch | On coarse-pointer devices Enter inserts a line break and the send button sends |
| Missing context | With valid text but no date or no starting point, activating send does not send. A visible message names what is missing and focus moves to the first missing control. The draft is kept |
| In flight | While a turn is in flight the send action is unavailable and Enter does not send. The textarea stays editable so the user can prepare the next message |
| After sending | The composer is cleared when the message is added to the history |
| Draft | Unsent text is part of the planner's session state (section 16) |

**Scroll and focus**

| Event | Scroll | Focus |
|---|---|---|
| User sends a message | History scrolls to show it and the waiting indicator | Stays in the composer |
| Reply arrives, user is at or near the bottom | Scrolls so the start of the new reply is visible. A recommendation group is brought into view from its top, not its end | Stays where it is. If it was in the composer or was lost, it is in the composer |
| Reply arrives, user has scrolled up | No automatic scroll. A "new reply" affordance lets the user jump down | Unchanged |
| Turn fails | The failed message and its error are brought into view | Unchanged. Retry is the last focusable control in the history, directly before the composer in the tab order |
| Retry succeeds | As for a reply | Composer |
| New Plan | History returns to the top of the initial state | Composer |
| Page restored from session state | The latest message is in view | Not moved automatically |

No virtualized list. A plain scrolling container is sufficient.

### 10.2 Design

#### 10.2.1 Panel anatomy

Four zones, top to bottom. Only the history scrolls. Values are for ≥768px; small-screen changes are in 17.1.

| Zone | Size | Content |
|---|---|---|
| Title strip | min-height 48px; padding 12px 24px; 1px bottom rule in `snow` at 0.16 | The `h1` "Plan a trip" (`snow`, 16/24, weight 600) and the plan summary line (10.2.8). New Plan's confirmation appears here (14.1) |
| History | Fills the rest; `overflow-y: auto`; `overscroll-behavior: contain`; padding 20px 24px 16px | Greeting, messages, recommendation groups, waiting indicator, failures. Content starts at the top and grows downward |
| Note line | min-height 20px; margin 0 24px 8px | One slot for composer messages (10.2.6). It keeps its 20px when empty, so a one-line note moves nothing |
| Composer | margin 0 16px 16px | 10.2.5, including the trip-context controls (11.5) |

Type used inside the panel: message and composer text 16/24; interface text 14/20; nothing below 14px. (DESIGN_SYSTEM 7.4's 18/28 planner text is the landing hero's; a conversation column at 620–680px reads better at 16/24.)

#### 10.2.2 Messages

| | Assistant | User |
|---|---|---|
| Position | Start edge, full column width | End edge, bubble no wider than 85% of the column |
| Surface | None: text directly on the panel | `paper` bubble, padding 10px 16px, radius 18px with a 6px bottom-end corner |
| Role cue (not color) | A visible label row above the text: 16px lucide `Mountain` icon and "Planner", `snow`, 14/20, weight 600; 4px gap to the text | Alignment and the bubble; visually hidden text "You said: " before the message |
| Text | `snow`, 16/24, weight 400 | `ink`, 16/24, weight 400; `white-space: pre-wrap`; `overflow-wrap: anywhere`. Never clamped |
| Entrance | Opacity 0 → 1 and 4px upward over `--duration-base` | Same |

Spacing: 20px between messages of different roles, 8px between consecutive blocks of one role, 12px between an assistant text and its recommendation group. All message text is rendered as text nodes: no markup, no auto-linking.

#### 10.2.3 Initial state

In the assistant's position, under the "Planner" label:

| Id | Element | Text | Style |
|---|---|---|---|
| GR1 | Greeting, first line (a `p`) | "What kind of hike are you looking for?" | `snow`, 20/28, weight 600 |
| GR2 | Greeting, second line | "Describe it in your own words: how hard, how long, what you'd like to see. Then set your trip date and starting point with the two buttons under the message box. They aren't picked up from what you type." | `snow`, 16/24; 8px below GR1 |
| GR3 | Starter caption | "Or start from an idea:" | `snow`, 14/20, weight 500; 20px below GR2 |

The greeting never asks "where": a place in the message is not read (section 4.5).

Starter ideas: the four labels of section 5.5, in that order, as a wrapping row 8px below GR3, 8px gaps.

| State | Appearance |
|---|---|
| Default | Pill, no fill, 1px solid `snow` border, `snow` 14/20 weight 500, 14px horizontal padding; at least 36px tall with a fine pointer, 44px on a coarse pointer. Text wraps inside the chip if it must; never truncated |
| Hover / active | Fill `snow` at 0.12 / `snow` at 0.20 |
| Focus-visible | Focus ring |

Activating a starter replaces the composer's text with its sentence, moves focus to the textarea with the caret at the end, and sends nothing. No lasting selected state.

#### 10.2.4 Scrolling details

- "At or near the bottom" (10.1) means within 80px of the end.
- Bringing a reply into view: if the reply and its group fit in the history, scroll to the end; otherwise place the top of the assistant's label row 16px below the history's top edge.
- Scrollbar: thin, thumb `snow` at 0.40, transparent track.

#### 10.2.5 Composer

One `paper` surface, radius 20px, no border, no shadow, holding the textarea and, under it, one control row.

| Part | Specification |
|---|---|
| Label | A real `<label for>`, visually hidden: "Message to the planner" |
| Textarea | Transparent, no outline of its own, `ink` 16/24, caret `conifer`, padding 14px 16px 6px, `resize: none`. Height: 2 lines minimum (48px), grows to 6 lines (144px), then scrolls. No `maxlength`. Not focused on first load |
| Placeholder | `stone`. Before the first user message: "Describe the hike you want". Afterwards: "Answer, or change what you're looking for" |
| Control row | Height 44px, padding 0 8px 8px; from the start: date control, 8px, starting-point control (11.5); at the end: character counter (when shown), 8px, Send |
| Send | `button`, `aria-label="Send message"`, 40px circle (44px on a coarse pointer), fill `conifer`, 20px lucide `ArrowUp` in `snow` |
| Counter | Shown once the trimmed text reaches 1,800 characters: "{n} / 2,000", `stone`, 14/20, tabular numerals. Over the limit: `ink`, weight 600 |

Composer surface states:

| State | Appearance |
|---|---|
| Default | Fill `paper` |
| Hover (fine pointer) | Fill `snow`, over `--duration-fast` |
| Textarea focused | Fill `snow`; the focus ring is drawn around the whole surface, on mouse focus as well as keyboard focus |
| Over the limit | 2px inset ring in `ember`; `aria-invalid="true"`; message V1 in the note line; Send unavailable. Appears as soon as the limit is passed, without waiting for a send |
| Turn in flight | Unchanged and editable; only Send changes |

Send states:

| State | Appearance and behavior |
|---|---|
| Default | Fill `conifer` |
| Hover / active | `conifer-deep` / `conifer-press` |
| Focus-visible | Focus ring |
| Unavailable (no text, over the limit, or a turn in flight) | Fill `ink` at 0.12, icon `stone`, `aria-disabled="true"`, cursor `default`. It stays focusable and is not removed from the tab order; activation does nothing |
| Text valid, date or starting point missing | Looks and is available. Activation follows the missing-context rule of 10.1 (messages V2–V4, section 13.3) |

#### 10.2.6 Note line

One slot directly above the composer, referenced by the textarea's `aria-describedby`. Plain text on the panel: a 16px lucide icon in `snow`, 8px, then `snow` 14/20 weight 500. Kinds differ by icon and wording, not color.

| Kind | Icon | Region | Ids (copy in 13.3) | Stays until |
|---|---|---|---|---|
| Validation | `CircleAlert` | `role="alert"` | V1–V5 | V1: the text is within the limit. V2–V4: the missing value is set. V5: a date is chosen |
| Note | `Info` | `role="status"` | N1–N3 | N1: the draft is sent, emptied, or replaced. N2, N3: the next message is sent |

One message at a time; validation outranks a note. No close button, no timeout. A message longer than one line grows the slot upward into the history; the composer does not move.

#### 10.2.7 "New reply" affordance

Shown only when a reply arrives while the user is scrolled up (10.1).

| Property | Value |
|---|---|
| Control | `button`, label "New reply" with a 16px `ArrowDown` after it |
| Appearance | Pill, fill `paper`, `ink` 14/20 weight 600, 36px tall (44px coarse), 14px horizontal padding. Hover: `snow`. Focus-visible: focus ring |
| Placement | Centred over the history, 8px above its bottom edge. In the DOM between the history and the note line |
| Behavior | Scrolls to the new reply (10.2.4) and disappears. It also disappears when the user scrolls there. If it held focus, focus goes to the textarea |

#### 10.2.8 Plan summary line

Included (decision): the backend's replies are terse, so one quiet line showing what the planner currently holds makes it visible that each message builds on the last.

| Property | Value |
|---|---|
| Source | The stored `PlanningContext` only, rendered with the label rules of 12.2. Never derived from message text |
| Content | "So far: " then the non-null parts joined by " · ", in this order: difficulty, "up to {duration}", "up to {distance}", "up to {gain}", scenery labels joined by ", ". Example: "So far: Moderate · up to 3 h · Lake" |
| Empty context | Not rendered. The title strip keeps its height |
| Style | `snow`, 14/20, weight 400, in the title strip after the `h1` (16px gap), wrapping to further lines if long. Never truncated |
| Interaction | None. A `p`: no controls, not focusable, not a live region |

## 11. Date and Location Context

Both values are required by the backend on every turn, including clarification turns, and neither can be taken from the message text (section 4.5). They are set with two compact controls that belong to the planner, not a filter form.

### 11.1 Trip date

| Rule | Behavior |
|---|---|
| Required | No turn is sent without a date |
| No default | The date starts unset. The frontend never assumes today, the weekend, or any other date, and never reads a date out of the message |
| Range | The date must be today or later in the device's local calendar (`tripDate >= today`). There is no maximum: the backend contract defines none, and the frontend does not infer one from an assumption about the weather provider (decision D4) |
| Unservable date | If the backend or its weather dependency cannot serve the chosen date, the turn fails in the normal way: the message stays, marked as not sent, with Retry (section 13.2). The user can change the date and retry. A formal forecast-horizon rule belongs in backend validation if the product later requires one |
| Format | Sent as the local calendar date `YYYY-MM-DD`. Never converted through UTC |
| Visible | The chosen date is always visible in the planner, in words (for example "Sat, Oct 17") |
| Changing it | Allowed at any time. It applies from the next message. It does not resend anything |
| Stale | A stored date that is now in the past is cleared when the page is restored, and the user is asked for a date again |
| Control | The native date input with `min` and `max` is the baseline. No date-picker dependency is approved |

### 11.2 Starting point

| Rule | Behavior |
|---|---|
| Required | No turn is sent without a starting point |
| Two choices | **Use my location** and **Use Vancouver** |
| Use my location | Calls the browser's geolocation API only when the user activates it. Never on page load, never on restore, never on send |
| Use Vancouver | Sets fixed demo coordinates, latitude 49.2827 and longitude −123.1207. It is labelled "Vancouver" and is never described as the user's location |
| Shown as | "Your location" or "Vancouver". Coordinates are never displayed and there are no latitude or longitude fields |
| Failure | Permission denied, position unavailable, timeout (10 s), or no geolocation support: a visible message explains it and Use Vancouver remains available. Nothing is assumed in its place |
| Changing it | Allowed at any time. Applies from the next message |
| Not included | Geocoding, place search, maps, any location provider |

### 11.3 Radius

Not exposed and not sent. The backend's default applies. The interface does not state a radius value.

### 11.4 After results

Each recommendation group records the date and starting-point label it was requested with and shows them (section 12). If the user then changes the date or the starting point, the existing results are not recomputed; they keep their own caption, and the planner makes clear that the change applies from the next message. The frontend does not send a message the user did not write in order to refresh results.

### 11.5 Design

#### 11.5.1 Two context controls inside the composer

The date and the starting point are two compact buttons at the start of the composer's control row (10.2.5): they read as part of the message being written, not as a form above it. Tab order: textarea, date, starting point, Send.

Shared geometry: 32px tall with a fine pointer, 44px on a coarse pointer; radius 10px (not a pill, so they do not read as starter ideas); 12px horizontal padding; a 16px lucide icon, 6px, then the label in 14/20. Each is a `button` with `aria-expanded` and `aria-controls` for its popover.

| State | Date control | Starting-point control |
|---|---|---|
| Unset | Icon `CalendarDays` in `stone`; label "Trip date", `ink`, weight 500; 1px dashed `stone` border; no fill. Name: "Trip date: not set" | Icon `MapPin`; label "Starting point"; same style. Name: "Starting point: not set" |
| Set | Label in words, weight 600, for example "Sat, Oct 17"; 1px solid `stone` border; fill `ink` at 0.06. Name: "Trip date: Saturday, October 17" | Label "Your location" or "Vancouver"; same style. Name: "Starting point: Your location" |
| Hover / open | Fill `ink` at 0.10 | Same |
| Focus-visible | Focus ring | Same |
| Missing on send | 2px solid `ember` border and the icon replaced by `CircleAlert` in `ember`, with V2–V4 in the note line. Focus moves to the first missing control; its popover is not opened for the user | Same |
| Waiting | — | Icon `LoaderCircle` (spinning); label "Finding location…" |

Date wording is fixed English: short weekday, short month, day ("Sat, Oct 17"); the long form is used in accessible names. The year is added only when the date is not in the current calendar year ("Sat, Jan 9, 2027").

#### 11.5.2 Popovers

Both controls open a small non-modal popover, built from plain elements (no dependency).

| Property | Value |
|---|---|
| Position | Above the composer, start-aligned with it, 8px gap; drawn over the history, inside the panel |
| Size | 320px wide from 768px; the composer's width below 768px |
| Surface | `paper`, radius 16px, 1px border in `ink` at 0.16, one shadow `0 8px 24px` in `ink` at 0.24 (it has to separate from `paper` cards behind it), padding 16px |
| Opening | Opacity 0 → 1 over `--duration-fast`. Focus moves to the first control inside |
| Closing | Escape, the control activated again, a pointer press outside, or focus leaving the popover. Escape and a choice return focus to the control |
| Semantics | `role="group"` named by its title. Only one popover is open at a time |

Date popover, top to bottom:

| Part | Specification |
|---|---|
| Title | "When are you going?", `ink`, 14/20, weight 600 |
| Quick picks | A wrapping row of buttons: "Today", "Tomorrow", the first Saturday and the first Sunday on or after today, labelled as dates ("Sat, Oct 17", "Sun, Oct 18"). A pick equal to today or tomorrow is omitted. 36px tall (44px coarse), radius 10px, 1px solid `stone` border, `ink` 14/20 weight 500; hover fill `ink` at 0.06. The pick matching the chosen date: fill `ink`, text `snow`, `aria-pressed="true"` |
| Date input | Label "Or pick a date" (`stone`, 14/20). Native `<input type="date">` with `min` today and no `max`; full width, 44px tall, 16px text, 1px solid `stone` border, radius 10px |
| Past-date entry | The input gets a 2px `ember` border and `aria-invalid="true"`; message D1 under it (`role="alert"`: `CircleAlert` in `ember`, text in `ink`). The previous date is kept |

A quick pick sets the date and closes the popover. A valid value in the date input sets the date and leaves the popover open. Quick picks act only when the user activates them; nothing is pre-selected.

Starting-point popover, top to bottom:

| Part | Specification |
|---|---|
| Title | "Where are you starting from?" |
| Option 1 | Button, full width, 48px tall, radius 10px: icon `LocateFixed`, "Use my location"; second line "We use it to find trails near you." (`stone`, 14/20) |
| Option 2 | Same shape: icon `MapPin`, "Use Vancouver"; second line "Start from downtown Vancouver." |
| Chosen option | A 16px `Check` at its end and `aria-pressed="true"`. Hover on either: fill `ink` at 0.06 |
| Waiting (option 1) | Icon `LoaderCircle`, label G1, `aria-disabled="true"`. Option 2 stays available; choosing it discards the pending lookup |
| Failure | Message G2–G5 under the options (`role="alert"`: `CircleAlert` in `ember`, text in `ink` 14/20). Option 1 returns to default and can be tried again; after G5 it stays `aria-disabled`. The starting point keeps its previous value |
| Success | The value is set, the popover closes, focus returns to the control |

#### 11.5.3 Changing a value once results exist

The control shows the new value at once. No request is sent. The note line shows N2 (date) or N3 (starting point). Every recommendation group keeps the caption it was made with (12.3.1), so the difference between the controls and the results is readable, not hidden. Both controls stay usable while a turn is in flight; the change applies from the next message.

## 12. Recommendation Presentation

### 12.1 Rules

- A recommendation group appears inside the conversation, attached to the assistant message of the turn that returned it.
- Up to three cards, in the order the backend returned them. The frontend does not re-sort or filter.
- Only fields listed as "Shown" in section 4.4 are used. A `null` field is omitted; no placeholder, zero, or estimate takes its place.
- Cards are summaries. They have no action that selects a trail, opens Trail Detail, shows a map or route, or starts packing. No control implies one. The card is not a link.
- No image area. `coverImageUrl` is not rendered.
- The group shows the date and starting-point label it was requested with.
- The newest group is the current result. An earlier group stays in the history, marked as earlier results and collapsed (12.3.3).
- Ready with zero recommendations: the backend's message is shown as the assistant message, followed by interface guidance on what to change (PRD section 37). The guidance is not presented as assistant speech.

### 12.2 Field presentation

| Data | Presentation rule |
|---|---|
| `name` | The card's heading, as text |
| `difficulty` | `EASY` → Easy, `MODERATE` → Moderate, `HARD` → Hard. Text, not color alone |
| `distanceKm` | Kilometres, one decimal at most, for example "8.4 km" |
| `elevationGainM` | Metres, for example "420 m gain" |
| `estimatedDurationMin` | Hours and minutes, for example "3 h 15 min" |
| `scenery` | `LAKE` → Lake, `VIEWPOINT` → Viewpoint, `WATERFALL` → Waterfall, `FOREST` → Forest, `MOUNTAIN` → Mountain, `OCEAN` → Ocean |
| `description` | Optional supporting text, limited in length by the design; the full text remains available |
| `score` | The overall match out of 100, labelled as a match score |
| `breakdown` | Secondary detail, available on request: Your preferences (of 55), Weather (of 15), Your gear (of 15), Scenery (of 10), Distance from you (of 5). Numbers only; no invented prose about why |
| Any unrecognized enum value | Omitted. Raw wire values are never shown |

The breakdown's Weather and Your gear parts are scores only. The forecast and the gear list are not available and are not described.

### 12.3 Design

#### 12.3.1 Group

Order inside the assistant's block: label row, the backend's message, then the group, 12px below.

| Part | Specification |
|---|---|
| Heading | A visually hidden `h2`: "Trails for {date}, from {starting point}" |
| Caption | "For Sat, Oct 17 · from Vancouver" or "… · from your location". `snow`, 14/20, weight 500 |
| List | An `ol`, 8px below the caption; cards are full column width, 8px apart, in the backend's order |

#### 12.3.2 Trail card

An `article` inside each `li`: fill `paper`, radius 16px, padding 14px 16px, no border, no shadow, no image, no link, no hover state of its own. Two columns from 768px: content (flexible) and score (auto), 12px apart.

| Part | Specification | When the data is null or empty |
|---|---|---|
| Name | `h3`, `ink`, 18/24, weight 600; wraps; `overflow-wrap: anywhere` | No heading is rendered; the article is named "Recommendation {n}" for assistive technology only |
| Facts | One wrapping line, 2px below, `ink` 14/20: difficulty (weight 600) · distance · elevation gain · duration, joined by " · " | Each missing part is dropped with its separator; the line is dropped if all are missing |
| Scenery | One line, 2px below, `stone` 14/20: labels joined by " · " ("Lake · Forest"). Plain text, not chips: nothing here is a control | Line dropped |
| Description | 8px below, `ink` 14/20, clamped to 2 lines. If, and only if, the text overflows the clamp, a text button "More" follows it (then "Less"): `ink`, 14/20, weight 600, underlined, 44px hit height on a coarse pointer, `aria-expanded`, named "More about {name}". The full text is always in the DOM | Dropped |
| Score | The score column: a `button`, at least 88 × 48px, radius 12px. Line 1: the number (`ink`, 22/28, weight 700, tabular) and "/100" (`stone`, 14/20). Line 2: "Match score" (`stone`, 14/20) and a 16px `ChevronDown`, turned 180° when open. Hover: fill `ink` at 0.06; active: 0.10; focus ring. `aria-expanded`; named "Match score {n} out of 100. Score details" | `score` null: no score column and no breakdown. `breakdown` null: the same block as static text, no chevron |
| Breakdown | Opens under the card's content, full width: 12px above and below a 1px rule in `ink` at 0.12. A `dl` of up to five rows, `ink` 14/20, label at the start and value at the end in tabular numerals: "Your preferences 48 / 55", "Weather 12 / 15", "Your gear 15 / 15", "Scenery 10 / 10", "Distance from you 3 / 5". Under it, in `stone` 14/20: "Scores only. The forecast and gear details aren't shown here." No bars, no chart, no color scale | A null part's row is dropped |

A collapsed card with a two-line description is about 144px tall, so three cards and their caption are about 480px: they fit the history at 1920×1080 and 1440×900, and the third is partly visible at 1366×768.

#### 12.3.3 Earlier results

When a newer group arrives, each older group collapses to one row in its place; its assistant message stays above it unchanged.

| Property | Value |
|---|---|
| Row | A `button` inside the group's `h2`: "Earlier results · Sat, Oct 17 · from Vancouver · 3 trails" and a 16px `ChevronDown`. `snow`, 14/20, weight 500; 1px solid `snow` border, radius 10px, 12px horizontal padding, 36px tall (44px coarse), full column width. Hover: fill `snow` at 0.12. Focus ring. `aria-expanded="false"` |
| Expanded | The same cards, unchanged, 8px below the row. The words "Earlier results" mark the group, not a color change |
| Timing | The collapse is applied in the same frame as the new group's insertion, before the scroll position is set, with no animation |
| Restore | After a reload, every group but the newest is collapsed |

#### 12.3.4 Zero results

The backend's message is shown as the assistant's text. Under it, in place of the list: the caption, then interface guidance that is visibly not assistant speech: a block with a 2px `snow` start rule and 12px start padding, holding "What to try" (`snow`, 14/20, weight 600) and text Z1 (`snow`, 14/20, weight 400). No button and no automatic change; the user answers in the composer.

## 13. Loading, Errors, and Retry

### 13.1 Loading

- The submitted message is visible at once. A restrained waiting indicator appears in the assistant's position and is announced to assistive technology once.
- No simulated streaming: no token-by-token reveal, no typewriter effect, no invented progress text such as "Checking the weather…". The backend reports no progress. The waiting text may change once to say that the wait is long (13.3.1); it describes elapsed time only.
- The composer does not move or resize while waiting. Sending is blocked (section 10.1).
- Client timeout: 45 seconds, after which the request is aborted and the turn fails with the timeout message.
- New Plan and Sign out stay available while waiting.

### 13.2 Failure handling

| Kind | Detected by | Retry offered | Notes |
|---|---|---|---|
| Unavailable | Network error; 500, 502, 503, 504; a response that cannot be parsed or lacks `status` or `context` | Yes | Covers planner, OpenAI, weather, trail-service, and user-service failures. The frontend cannot tell them apart and does not pretend to |
| Timeout | The 45 s client limit | Yes | |
| Not accepted | 400 with `ProblemDetail.title` equal to "Unsafe Prompt" | No. An action puts the text back in the composer for editing | Resending the same text would fail again |
| Invalid request | Any other 400 | Yes | Points the user to the date and starting point |
| Sign-in problem | 401 or 403 from the API | Yes | If `getAccessToken()` itself rejects, the session has ended and FEATURE-002 takes over: the user lands on `/` with notice X1 and planner state is discarded (section 16) |

Rules for every failure:

- The user's message stays in the history, marked as not sent. It is never removed.
- No assistant message is shown for a failed turn. Nothing is fabricated.
- The stored `PlanningContext`, date, and starting point are unchanged.
- **Retry** resends the same text with the current context, date, and starting point. It reuses the existing message: no second copy appears.
- A failed message that the user does not retry stays marked as not sent if they send something else instead; from then on it has no Retry.
- A turn that was in flight when the page was reloaded is restored as not sent, with Retry.
- User-facing text is this specification's copy only. Status codes, backend `detail` text, exception names, stack traces, tokens, and request bodies are never shown and never written to the console.

### 13.3 Design and copy

#### 13.3.1 Waiting indicator

In the assistant's position, under the "Planner" label row: three 6px `snow` dots, 6px apart, then 10px, then text W1 in `snow` 16/24. Each dot's opacity runs 0.3 → 1 → 0.3 over 1200ms, staggered by 200ms. Nothing else moves.

- It is exactly as tall as a one-line assistant reply (label row, 4px, one 24px line), so replacing it with a clarification question shifts nothing.
- After 10 seconds the text changes to W2. This is a statement about elapsed time, not about backend progress; it is not announced again.
- It is removed in the same frame as the reply or the failure is inserted.

#### 13.3.2 A message that was not sent

| Part | Specification |
|---|---|
| Bubble | Same position and text. The `paper` fill is removed: no fill, 1px dashed border in `snow` at 0.60, text `snow`. The shape change marks it; color is not the cue |
| Status row | Under the bubble, end-aligned, 6px gap: 16px `CircleAlert` in `snow`, then "Not sent" (L1) in `snow` 14/20 weight 600 |
| Reason | Under the status row, end-aligned, no wider than the bubble's 85%: the failure text E1–E6 in `snow` 14/20 |
| Actions | 8px below, end-aligned, 8px apart |
| Superseded (the user sent something else) | Bubble and status row stay. Reason and actions are removed |

Action buttons (Retry, Edit message): no fill, 1px solid `snow` border, `snow` 14/20 weight 600, radius 10px, 14px horizontal padding, 36px tall (44px coarse), a 16px icon before the label (`RotateCcw`, `Pencil`). Hover: fill `snow` at 0.12. Active: `snow` at 0.20. Focus-visible: focus ring.

| Action | Offered for | Behavior |
|---|---|---|
| Retry | E1, E2, E4, E5, E6 | The bubble returns to its normal `paper` look, the status row, reason, and actions are removed, and the waiting indicator appears under it. Focus moves to the textarea. If the date or starting point is missing, the missing-context rule applies instead and nothing is sent |
| Edit message | E3 only | The text replaces the composer's content and focus moves to the textarea, caret at the end. The message stays in the history as superseded |

#### 13.3.3 Approved copy

No other user-facing text may be shown for these situations.

| Id | When | Text |
|---|---|---|
| W1 | A turn is in flight | "Working on it…" |
| W2 | In flight for 10 s | "Still working. This one is taking a little longer." |
| L1 | Any failed message | "Not sent" |
| E1 | Unavailable | "The planner couldn't answer just now. Your message is still here. Try again in a moment." |
| E2 | Timeout | "That took too long, so we stopped waiting. Your message is still here." |
| E3 | Not accepted | "This message can't be used for trip planning. Edit it to describe the hike you want." |
| E4 | Invalid request | "That request didn't go through. Check the trip date and starting point, then try again." |
| E5 | Sign-in problem | "We couldn't confirm your sign-in for this message. Try again. If it keeps happening, sign out and sign in again." |
| E6 | Restored after a reload while in flight | "This message hadn't been answered when the page reloaded." |
| V1 | Message over the limit | "Your message is over the 2,000-character limit. Shorten it to send." |
| V2 | Send without a date | "Choose a trip date to send your message." |
| V3 | Send without a starting point | "Choose a starting point to send your message." |
| V4 | Send without either | "Choose a trip date and a starting point to send your message." |
| V5 | A stored date has passed (restore) | "The trip date you chose has passed. Choose a new one." |
| D1 | Date typed that is before today | "Choose today or a later date." |
| G1 | Geolocation in progress | "Finding your location…" |
| G2 | Permission denied | "Location access is off for this site. Allow it in your browser settings, or use Vancouver." |
| G3 | Position unavailable | "Your location couldn't be found. Try again, or use Vancouver." |
| G4 | Timeout (10 s) | "Finding your location took too long. Try again, or use Vancouver." |
| G5 | No geolocation support | "This browser can't share a location. Use Vancouver instead." |
| N1 | A landing prompt arrived as the draft | "This is your request from before signing in. Set a trip date and starting point below, then send it. A day or place written in the message isn't picked up." |
| N2 | Date changed after results | "Trip date changed. It applies from your next message. Results already shown keep their own date." |
| N3 | Starting point changed after results | "Starting point changed. It applies from your next message. Results already shown keep their own starting point." |
| Z1 | Ready with zero recommendations | "Try a different difficulty, more time or distance, or another kind of scenery. A different starting point can help too." |
| C1 | New Plan confirmation (14.1) | "Start a new plan? This conversation and its results will be cleared." |

None of these names a service, a status code, or a cause the frontend cannot know.

## 14. New Plan

A clearly labelled **New Plan** action is always available on `/home`.

| It clears | It keeps |
|---|---|
| The displayed conversation | The signed-in session and all authentication state |
| The stored `PlanningContext` (next turn sends `null`) | The starting point: it describes the user, not one trip |
| All recommendation groups | The media playing or paused state |
| The trip date: a new plan is a new trip | |
| The composer draft and any failed message | |
| The saved landing prompt, if it has not been used (section 15) | |
| The planner's session-storage entry, rewritten to the new empty plan | |

Afterwards the planner shows the initial state (section 5.5) and focus is in the composer.

- With no user message in the conversation, New Plan is unavailable (14.1.1).
- If a turn is in flight, New Plan still works; the late response is discarded.
- Clearing a conversation takes one in-place confirmation step (14.1.2). It is never a browser `confirm()` dialog or a modal.

### 14.1 Design

#### 14.1.1 Control

A `button` in the header (placement in 9.5 and 17.2): a 16px lucide `Plus`, 6px, then the label "New Plan". Quiet-control recipe: fill `ink` at 0.72, 1px solid `snow` border, `snow` 14/20 weight 600, pill, 14px horizontal padding; 36px tall with a fine pointer, 44px on a coarse pointer.

| State | Appearance |
|---|---|
| Default | As above |
| Hover / active | Fill `ink` at 0.88 and a 2px `snow` edge / solid `ink` |
| Focus-visible | Focus ring |
| Unavailable (no user message in the conversation) | Label and icon in `snow` at 0.56, border in `snow` at 0.40, `aria-disabled="true"`, cursor `default`. It stays in place and in the tab order; activation does nothing |
| Confirming | `aria-expanded="true"`; otherwise as default |

#### 14.1.2 Confirmation

Decision: **one in-place confirmation step** whenever the conversation holds at least one user message. A conversation with results cannot be recovered (there are no saved chats), and the control sits in a header where a stray click is plausible.

| Property | Value |
|---|---|
| Where | The panel's title strip. Its normal content (the `h1` text and the summary line) is replaced by the confirmation until it is resolved; the `h1` element stays, visually hidden. No dialog, no overlay, no `confirm()` |
| Content | Text C1 (`snow`, 14/20, weight 500), then two buttons at the end, 8px apart: "Start new plan" and "Keep this plan" |
| "Start new plan" | Fill `paper`, text `ink` 14/20 weight 600, radius 10px, 14px horizontal padding, 36px tall (44px coarse). Hover: `snow`. Focus ring |
| "Keep this plan" | The outline action-button style of 13.3.2 |
| Semantics | `role="group"` labelled by the C1 text |
| Focus | On opening: "Start new plan". On confirm: the textarea (section 14). On cancel: back to New Plan |
| Cancel | "Keep this plan", Escape, activating New Plan again, or focus leaving the group. No timeout |
| Layout | The strip may grow by one or two lines while confirming (text wraps above the buttons on narrow panels); the history absorbs it |
| In flight | Works the same; the late response is discarded (section 6) |
| After confirm | The strip returns to the `h1`; the history shows the initial state from its top; the date control is unset; the starting point keeps its value |

## 15. Landing Prompt Handoff

FEATURE-002 keeps a prompt typed on the Public Landing in session storage under the single key defined in `features/planning/pendingPrompt.ts`, validates it when read, and clears it on sign-out. FEATURE-003 consumes that mechanism and adds no other.

Decision D8: the prompt arrives as the **composer draft**, not as a message already in the conversation.

Reason: a turn cannot be sent on arrival, because the date and the starting point are not known yet and must not be invented. A message shown in the history with nothing happening would look like a stalled request. A draft is honest about its state, is editable, and puts the user one step from sending.

| Rule | Behavior |
|---|---|
| Read | With `readPendingPrompt()`, which already returns only a valid, trimmed prompt |
| Placement | Into the composer as editable text, with a short visible note that it is the request from before signing in and that a date and starting point are needed |
| Never | Sent automatically; added to the history before the user sends it; placed in a URL, a route state visible in the address, or a request to Keycloak |
| Consumed | Once the draft has been written to the planner's session state (section 16), the pending-prompt key is cleared with `clearPendingPrompt()`. From then on the draft lives only in planner state |
| No duplicates | Because the key is cleared on transfer, a reload restores the draft from planner state and does not insert it again. If the user deleted or sent it, it does not come back |
| Existing draft | If the composer already holds unsent text when a pending prompt is found, the pending prompt replaces it: it is the user's most recent request |
| Existing conversation | If a conversation is already in progress in this tab, the prompt still arrives as a draft only. The user can send it as a refinement or start a New Plan first |
| Rendering | As text only, never as markup (FEATURE-002 S13) |
| Sign-out | Still clears it (FEATURE-002 section 9), now wherever it lives: the pending key and the planner state |

A landing prompt often contains a day ("…this Saturday"). The backend ignores that text (section 4.5), so the arrival note must direct the user to the date control rather than suggest the day was understood.

Changes to FEATURE-002 on `/home`: its section 8 "saved request", design section 21.4.3, criterion AC-23, and the D24 clause keeping the "Frontend ready" button are superseded by this feature. Everything else in FEATURE-002 holds and is regression-checked.

## 16. Session Persistence

There is no backend conversation storage. The planner keeps its own state for the life of the tab.

| Rule | Behavior |
|---|---|
| Where | `sessionStorage`, one key owned by the planning feature, holding one versioned JSON value |
| Owner | The value records the signed-in user's stable Keycloak subject (`sub`) as its owner (D28). The subject is an identifier, not a credential; it is used only to decide whose state this is, is never displayed, and is never logged. Planning receives it as a plain string from `@/features/auth` and never sees a token |
| Contains | Messages (with their recommendation data), the latest `PlanningContext`, the trip date, the starting point (label and coordinates), the composer draft |
| Never contains | Access token, refresh token, ID token, raw JWT, password, or anything else from the auth adapter. The owner subject above is the single exception; no other claim (name, email, username) is stored |
| Not `localStorage` | Nothing of the planner is written to durable storage. This is not a saved-chats feature |
| Restore | On reload or on returning to `/home` in the same tab, the conversation, context, date, starting point, current results, and draft reappear for the same signed-in user. Nothing is read from storage before the current subject is known |
| Different user | A stored value whose owner is missing or is not the current subject is discarded and removed when it is read. Nothing from it is merged or carried over: not the messages, the `PlanningContext`, the recommendations, the trip date, the draft, or the starting-point coordinates. With no signed-in subject nothing is restored and nothing is written |
| Validation | The stored value is untrusted when read: wrong version, wrong shape, a missing or foreign owner, or unparsable means it is discarded and the planner starts empty. Stored text is rendered as text only |
| Stale date | A stored date before today is cleared (section 11.1) |
| In-flight turn | Restored as not sent (section 13.2) |
| Geolocation | Restoring a "Your location" starting point reuses the stored coordinates. It does not call the geolocation API again |
| Write failure | If storage is unavailable or full, the planner keeps working in memory for the visit and reports nothing |
| Cleared by New Plan | As section 14 describes |
| Cleared when the session ends | Sign-out, session expiry, and any startup that finds no session all discard the planner state. A person who signs in afterwards in the same tab never sees an earlier conversation, date, or location |

Mechanism guidance: `registerSessionCleanup` from `@/features/auth` already runs on sign-out and on session expiry. The startup case (a reload that finds the session gone) must be covered as well; how is an implementation choice, provided the outcome in the last row holds. This rule is part of the scoped security review of the implementation.

## 17. Responsive Behavior

Lead constraints: desktop web is primary and must look composed around the room, not like a stretched mobile chat. Required viewports: 1920×1080, 1440×900, 1366×768, about 768px wide, about 390px wide, about 320px wide. On small screens the conversation, the date and starting-point controls, the composer, the recommendation cards, New Plan, Gear, identity, and Sign out all remain reachable, with no horizontal scrolling. Aggressive cropping of the media is acceptable. Below 768px the background is the poster, not the video (section 8.1).

### 17.1 Reference viewports

Two layouts. From 1024px wide the panel stands at the left of the room (section 9). Below 1024px the room cannot sit beside it, so the panel docks at the bottom and the room shows above it.

| | 1920×1080 | 1440×900 | 1366×768 | 768×1024 | 390×844 | 320×568 |
|---|---|---|---|---|---|---|
| Layout | Left panel | Left panel | Left panel | Bottom dock, centred | Bottom sheet, edge to edge | Bottom sheet |
| Gutter | 64 | 56 | 40 | 32 | 16 | 12 |
| Header | 72, one row | 72, one row | 64, one row | 64, one row | 56: brand, New Plan, Menu | 56: brand on two lines |
| Panel box | 680 × 760 at 64, 104 | 640 × 756 at 56, 104 | 620 × 664 at 40, 80 | 640 × 635 at 64, 365 | 390 × 588 at 0, 256 | 320 × 452 at 0, 116 |
| Panel radius | 24 | 24 | 24 | 24 | 20 top corners, 0 bottom | same |
| Background (8.1) | Video | Video | Video | Video | Poster only | Poster only |
| Media crop (8.3.2) | Uncropped | 157px off the left | Uncropped | Scaled to 1817 × 1024; shows scene x 39–81% | Scaled to 1497 × 844; shows x 47–73% | Scaled to 1008 × 568; shows x 44–75% |
| Room visible | 9.3 | 9.3 | 9.3 | Above the panel: rafters, and the window's sky, ridge, and treetops | Above the panel: the sunset sky and the top of the ridge through the window | Above the panel: the window's top edge and sky |
| Textarea lines (min–max) | 2–6 | 2–6 | 2–6 | 2–6 | 1–4 | 1–4 |
| Trail card | Two columns | Two columns | Two columns | Two columns | One column | One column |
| Background control | Bottom-right | Bottom-right | Bottom-right | Top-right, under the header | None | None |

Docked panel size:

| Width | Rule |
|---|---|
| 768–1023px | Width `min(640px, 100vw − 64px)`, centred; 24px above the bottom edge; height `min(100dvh − 148px, max(560px, 62dvh))` |
| <768px | Left, right, and bottom edges on the viewport; height `min(100dvh − 116px, max(560px, 100dvh − 256px))`; bottom padding adds `env(safe-area-inset-bottom)` |

At 768–1023px the space left above the panel holds the header and, under it, the background control, so the control never overlaps the panel. Below 768px the 116px above the sheet (the 56px header and a 60px strip) is always left free so that a strip of the room is always visible; nothing is placed in that strip, because there is no background control at that width. The room also stays faintly present through the panel's 0.88 surface.

Inside the panel below 768px: title strip padding 10px 16px, min-height 44px; history padding 16px; note line margin 0 16px 8px, and it takes no height while empty; composer margin 0 8px 8px. The character counter moves from the control row to its own end-aligned line above that row. In a one-column trail card the score button is the last row of the card: full width, 44px tall, one line ("Match score 86 / 100" and the chevron).

Below 360px the two context controls drop their icons and the waiting label is "Finding…", so date, starting point, and Send fit one row at 320px.

### 17.2 Header collapse

| Width | Header |
|---|---|
| ≥1024px | 9.5 |
| 768–1023px | One row: brand at the start; at the end New Plan, Gear, identity (max-width 160px), Sign out. All targets 44px tall |
| <768px | Brand at the start (16/24; below 480px it is set on two lines, 16/20: "Outdoor Trip" / "Companion"). At the end: New Plan with its label, then a Menu button |

Menu button: 44px circle, quiet-control recipe, 20px lucide `Menu`; `aria-label="Menu"`, `aria-expanded`, `aria-controls`. It opens a popover with the surface of 11.5.2, end-aligned under the header, width `min(280px, 100vw − 24px)`, holding in order:

1. The identity: "Signed in as" (`stone`, 14/20) above the name (`ink`, 16/24, wrapping, never truncated).
2. Gear: a link row, 48px tall, `ink` 16/24, weight 500.
3. Sign out: a button row, 48px tall, 1px solid `stone` border, radius 10px, `ink` 14/20 weight 600. In the `signing-out` state the menu stays open and the row shows the working state of 9.5.

It closes on Escape, a press outside, or focus leaving it; focus returns to the Menu button.

### 17.3 Short viewports

If the height left for the panel is under 480px in the left layout, or under 420px in a docked layout (a phone in landscape, a very short window, 200% zoom), the panel keeps that minimum height and the page itself scrolls vertically. The media stays fixed to the viewport. This is the only case in which the document scrolls. There is no horizontal scrolling at any width: long words in messages and trail names wrap (`overflow-wrap: anywhere`), and every flex child that holds text may shrink (`min-width: 0`).

### 17.4 On-screen keyboard

Required outcome on touch devices, at 390×844 and 320×568, with the keyboard open:

- The textarea, both context controls, and Send are fully visible above the keyboard and operable.
- At least the last 48px of the history is visible above the note line.
- Nothing the user must reach is underneath the keyboard, and a popover opened from a context control is fully visible.
- Closing the keyboard returns the layout to 17.1 without a reload or a jump in the history's scroll position.
- Focusing the textarea does not zoom the page (its text is 16px).

How this is achieved is an implementation choice (for example sizing the shell from the visual viewport height). The header and the strip of room above the panel may scroll out of view while the keyboard is open.

## 18. Reduced Motion

Rules: under `prefers-reduced-motion: reduce` the Home shows the poster, the video file is not requested, and no Pause / Play control is needed because nothing moves. Interface transitions are removed or reduced to opacity. Scrolling to a new message is instant, not animated. The waiting indicator does not animate continuously. Every planning function remains available. If the preference changes during a visit, the page follows it.

### 18.1 Per element

| Element | Default | Reduced motion |
|---|---|---|
| Poster | Fades in from `ink` over 1200ms | Appears at once |
| Video | Revealed over 240ms, loops | Not requested, not in the DOM |
| Background control | Rendered | Not rendered. Nothing takes its place and no other control moves |
| Message, note, and failure entrance | Opacity and 4px rise, 240ms | Appears at once |
| Popover, confirmation, card breakdown, "More" | Opacity, 150ms | Appears at once |
| Waiting indicator | Three dots pulsing | Three static dots at full opacity. Text W1, then W2, still shown, so the state does not depend on movement |
| `LoaderCircle` (location lookup, signing out) | Spins | Static |
| Scrolling to a reply, "New reply" | `behavior: "smooth"` | Instant |
| Hover, press, and fill changes | 150ms, color only | Kept: they are color-only |
| Earlier-results collapse | Instant | Instant |

### 18.2 A change of preference during a visit

- To reduce: the video is paused and removed, the poster shows, the background control is removed. If the control held focus, focus moves to the panel's `h1` (`tabindex="-1"`).
- To no preference, at 768px wide or more: the video is requested, revealed when playing, and the control appears in its `Pause` state. Below 768px nothing changes in the background: it is the poster in both modes.
- Crossing the 768px width during a visit is handled the same way (M8): narrower removes the video and the control, wider brings them back unless reduced motion applies.
- In both directions the planner's state, scroll position, draft, and focus (other than the case above) are untouched.

Layout, content, tab order (apart from the one control), and every function are identical in both modes.

## 19. Accessibility

Lead constraints: semantic controls; full keyboard operation with a logical tab order; visible focus using the design system's focus ring; labelled inputs; the waiting state and errors exposed to assistive technology; roles and states never by color alone; recommendation cards readable in order by a screen reader; touch targets of at least 44px on coarse pointers; text contrast of at least 4.5:1 (3:1 for large text and control boundaries) measured against the surface the text actually sits on. Contrast must hold at every moment of the loop, so it cannot depend on the video: it comes from the planner's own surfaces and scrims.

### 19.1 Structure

```text
(media layers: aria-hidden, inert)
header                       banner: brand link, New Plan, Gear, identity, Sign out
main
└─ section                   labelled by the h1
   ├─ h1 "Plan a trip"       + summary line (p)
   ├─ div role="region"      aria-label="Conversation", tabindex="0" (keyboard scrolling)
   │  └─ ol                  one li per message, in order
   │     └─ li (assistant)   label "Planner", text, then for a result:
   │        └─ section       h2 (visually hidden, or the Earlier-results button), caption, ol of cards
   │           └─ article    h3 trail name, facts, scenery, description, score button, dl
   ├─ "New reply" button     only when shown
   ├─ note line              alert region + status region, both always in the DOM
   └─ form                   label, textarea, date control, starting-point control, Send
announcer                    visually hidden: one role="status", one role="alert"
background control           last; only where the video is the background
```

Headings: one `h1`; an `h2` per recommendation group; an `h3` per trail. A screen-reader user can move straight to the results by heading and read cards in order. Document title: "Plan a trip · Outdoor Trip Companion". All user, backend, and stored text is rendered as text nodes.

### 19.2 Announcements

The history is **not** a live region: a live history would read whole cards and would re-read on restore. Instead a separate visually hidden announcer receives one short string per event. It is emptied and refilled each time so that a repeated string is still spoken. Nothing is announced on load or on restore.

| Event | Region | String |
|---|---|---|
| Message sent | status | "Sent. Waiting for the planner." (once per turn; W2 is not announced) |
| Clarification reply | status | "Planner: {assistantMessage}" |
| Reply with n ≥ 1 trails | status | "Planner: {assistantMessage} {name 1}, {name 2}, {name 3}. Details are in the conversation." |
| Reply with zero trails | status | "Planner: {assistantMessage} {Z1}" |
| Turn failed | alert | "Not sent. {E text}" |
| New plan started | status | "New plan started." |
| Composer validation, notes | the note line's own regions (10.2.6) | V and N texts |
| Location and date errors | `role="alert"` inside the popover | G2–G5, D1 |

Recommendation data is announced by name only; the cards are read in place.

### 19.3 Keyboard and focus order

DOM order equals visual order at every width:

brand → New Plan → Gear → Sign out (below 768px: brand → New Plan → Menu) → confirmation buttons, when shown → conversation region → controls inside it in reading order (starter ideas; Earlier-results buttons; "More" and score buttons card by card; Retry or Edit message) → "New reply", when shown → textarea → date → starting point → Send → background control (where rendered).

- A failed message is always the last item in the history, so its Retry or Edit message is the last focusable control before the textarea: one Shift+Tab from the composer. This matches 10.1.
- Enter and Space activate every button. Escape closes a popover, the Menu, or the confirmation and returns focus to its control. Enter in the textarea follows 10.1.
- Focus movements are those of 10.1, 11.5, 13.3.2, and 14.1.2 only. Focus is never moved on a reply and never left on a removed element.
- The focus ring is DESIGN_SYSTEM section 18 on every interactive element, shown on `:focus-visible` (the composer shows it on any textarea focus), with no transition. The history's padding (16px or more) keeps rings inside its scroll clip; no other ancestor clips.

### 19.4 Names and labels

| Control | Accessible name |
|---|---|
| Textarea | "Message to the planner" (label); described by the note line |
| Send | "Send message" |
| Date / starting point | "Trip date: {long date or not set}" / "Starting point: {label or not set}" |
| Score button | "Match score {n} out of 100. Score details" |
| "More" / "Less" | "More about {trail name}" / "Less about {trail name}" |
| Earlier-results button | Its visible text |
| Starter idea | Its visible label |
| Background control, Menu | 8.3.4, 17.2 |

Every icon is `aria-hidden`. No state is carried by color alone: a failed message has the words "Not sent", an icon, and a dashed outline; a missing context control has an icon and a message; difficulty and scores are text.

### 19.5 Contrast pairs in use

WCAG 2.x arithmetic and compositing as in FEATURE-001 section 11.8. "Over white" is the worst case for light text: a pure white frame behind a translucent surface. `ink` at 0.88 over white is rgb(40, 55, 59); `ink` at 0.72 over white is rgb(79, 92, 94).

| Foreground | Background | Ratio | Needed |
|---|---|---:|---:|
| `snow` text: assistant messages, labels, captions, notes, failure text, summary | Panel, `ink`/0.88 over white | 12.32 | 4.5 |
| `snow` text: brand, Gear, identity | Header plateau, `ink`/0.72 over white | 6.97 | 4.5 |
| `snow` text or icon: New Plan, Sign out, Menu, background control | Their own `ink`/0.72 fill over white | 6.97 | 4.5 |
| `ink` text: user message, composer, trail card, popover | `paper` / `snow` | 16.04 / 17.48 | 4.5 |
| `stone` text: placeholder, scenery, "/100", "Match score", help | `paper` / `snow` | 5.92 / 6.45 | 4.5 |
| `stone` text on a hovered or pressed score button | `paper` with `ink` at 0.06 / 0.10 | 5.25 / 4.84 | 4.5 |
| `snow` icon on Send | `conifer` / `conifer-deep` / `conifer-press` | 8.05 / 10.23 / 12.57 | 3 |
| `snow` text on a chosen quick pick | `ink` | 17.48 | 4.5 |
| Edge of `paper` surfaces (bubble, composer, card) | Panel over white | 11.30 | 3 |
| `snow` 1px borders (starter ideas, action buttons, Earlier results) | Panel over white | 12.32 | 3 |
| `stone` borders of the context controls and the date input | `paper` | 5.92 | 3 |
| `ember` ring and icons (over-limit, missing context, popover errors) | `paper` / `snow` | 4.43 / 4.83 | 3 |
| Send edge | `conifer` on `paper` | 7.38 | 3 |

`ember` is never used on the panel (it would be about 2.5:1 there) and never as text. Unavailable controls (Send, New Plan, a disabled location option) are exempt from contrast minimums and are also marked with `aria-disabled`.

Check for `qa`: replace the media with a plain white fill. A pixel of the panel beside any text must be rgb(40, 55, 59) ± 2, and a pixel of the header band beside the brand must be rgb(79, 92, 94) ± 2. Repeat with a black fill: every ratio above only rises.

### 19.6 Touch targets

On a coarse pointer every control is at least 44 × 44px: header items, Menu rows (48px), starter ideas, context controls, Send, quick picks, the date input, location options (48px), score buttons, "More", Earlier results, Retry, Edit message, "New reply", the confirmation buttons, and the background control. Adjacent targets are at least 8px apart. With a fine pointer the compact heights given in each section apply.

### 19.7 Forced colors, zoom, and text size

- Forced colors: the focus ring's transparent 2px outline becomes visible (DESIGN_SYSTEM section 18). The panel, `paper` surfaces, and popovers each carry a 1px border (transparent where the design shows none) so they keep an edge. Icons use `currentColor`. The `ember` ring becomes a system-colored 2px border; the words and icons that accompany it carry the meaning. The translucent fills are replaced by system colors; nothing depends on them.
- At 200% zoom the layout falls through the tiers of 17.1 and the short-viewport rule of 17.3; nothing is lost or clipped.
- No text-bearing box has a fixed height: surfaces use `min-height`, and labels wrap.

## 20. Frontend Architecture Boundaries

Guidance, not a mandated file list. Names may change; boundaries may not.

```text
Project/Frontend/src/
  pages/HomePage.tsx              thin composition: AuthenticatedHome
  features/home/                  HomeMedia, Home shell (header, layout over media)
  features/planning/
    api/                          planner turn request, error classification
    types/                        contract types (section 4.7), ChatMessage
    storage/                      planner session state (section 16); pendingPrompt.ts stays
    hooks/                        conversation state, turn mutation, geolocation
    components/                   ConversationalPlanner, PlannerConversation, PlannerMessage,
                                  PlannerComposer, PlannerContextBar, RecommendationGroup,
                                  TrailRecommendationCard
  services/apiClient.ts           gains the authenticated request (section 4.9)
```

| Boundary | Rule |
|---|---|
| Media and planner | `HomeMedia` and `ConversationalPlanner` are siblings. Neither imports the other; they share no state (section 21) |
| Server state | The turn is a TanStack Query mutation. No polling, WebSocket, or SSE |
| Auth | Only through `@/features/auth`'s exported API (`getAccessToken`, `useAuth`, `AccountControls`, `registerSessionCleanup`). No import of `authSession.ts` internals or of `keycloak-js` |
| Contract types | Live in `features/planning`, with wire enum values kept canonical and mapped to labels only in the interface |
| Error parsing | `ProblemDetail` is read where available; a missing or different body is tolerated |
| Dependencies | No new runtime dependency is approved: no chat UI library, no date-picker library, no 3D library. shadcn components already present are reused; adding another shadcn component that brings a new package needs lead approval |
| Not built | A generic chat framework, a message virtualization layer, a client-side intent parser |
| Development proxy | `vite.config.ts` proxies `/api/planner/**` only, as a local-development bridge (section 4.8) |
| Existing behavior | FEATURE-001's landing and FEATURE-002's authentication are not modified, apart from what section 15 lists and the route change for `/home` in section 5.2 |

## 21. Future 3D Compatibility

FEATURE-003 uses pre-rendered video. It introduces no Three.js, React Three Fiber, WebGL, model asset, realtime avatar, room interaction, camera control, or physics. The PRD keeps the Authenticated Home pre-rendered (sections 7.8 and 40) and makes a realtime Home a deferred possibility that needs an explicit product decision.

The architecture keeps that possibility cheap without building toward it:

```text
AuthenticatedHome
├── HomeMedia                  presentation layer: poster + looping video
└── ConversationalPlanner      conversation, PlanningContext, API, recommendations
```

`HomeMedia` is a presentation layer with a narrow input: asset configuration, the motion preference, and the viewport width. It knows nothing about the conversation. The planner knows nothing about what is behind it; its readability comes from its own surfaces (section 19).

If a later product decision replaces the background, the change is `HomeMedia → RealtimeHomeScene` inside `AuthenticatedHome`, and these stay untouched: conversation state, `PlanningContext` handling, the planner API integration, recommendation rendering, session persistence, and the authentication integration. Acceptance criteria AC-06 and AC-45 check the separation.

## 22. Non-Goals

Not part of FEATURE-003:

- Backend changes of any kind; a new or changed recommendation algorithm
- Direct OpenAI calls from the browser
- Trail Detail, maps, GeoJSON or route display, trail selection, "Plan This Trip"
- Pack, gear recommendation, gear readiness, gear inventory changes
- Avatar, Three.js, realtime 3D, Adventure, Explore, Memory
- A saved-conversation backend, saved trips, durable chat history
- WebSocket, SSE, token streaming, simulated streaming
- Voice input, image input, attachments
- Geocoding, place search, a radius control
- Social sharing, notifications
- Changes to Keycloak, its theme, Docker, or infrastructure
- A redesign of `AppLayout`, `/gear`, or `/trails/:trailId`
- Calling `GET /api/users/me` (identity still comes from the ID token, as in FEATURE-002)

## 23. Agent and Write-Scope Rules

This document is specification and design only. Nothing here authorizes implementation; that starts only when the user approves and the lead runs the feature cycle.

When the implementation cycle runs:

| Agent | May write |
|---|---|
| `frontend` | `Project/Frontend/**`, including the one proxy entry in `vite.config.ts` for section 4.8 |
| `frontend`, in the same change | `docs/FRONTEND_CONTEXT.md`, limited to what actually changed: the `/home` route and shell, the authenticated API request, the development proxy, the planning feature structure, the planner session-storage key, and the removal of the saved-request block |
| `qa` | Nothing in production code. Tests only if the lead says so |
| `ui-ux` | This document and, with lead approval, `docs/DESIGN_SYSTEM.md` |

Not authorized for any agent in this feature: `Project/Backend/**`, `Project/docker/**`, `Project/docker-compose.yml`, Keycloak realm or client configuration, the Keycloak theme, any infrastructure.

If implementation finds a real backend contract gap (for example the proxied request is refused, or the response differs from section 4): stop, report it to the lead, and route it through the `backend-api` process in `CLAUDE.md`. The backend is not changed to make the frontend more convenient, and the frontend does not invent a contract to work around it.

Other standing rules: no unrelated refactors; unrelated modified files in the working tree are left alone; no commit or push without the user's instruction.

## 24. Acceptance Criteria

### 24.1 How these are validated

- **Where.** In a browser against `npm run dev` on `http://localhost:5173`, signed in through Keycloak. There is no test runner; `npm run build` and `npm run lint` are run as well.
- **Viewports.** "Desktop" means 1920×1080, 1440×900, and 1366×768. "Small" means 768×1024, 390×844, and 320×568. "All six" means both sets. Since D29 the desktop set plus a width of about 1024px is the priority for any re-validation; results below 768px are best-effort.
- **Trip date for testing.** Criteria that send a turn use a near-future trip date, today or within the next few days, which the live weather-backed recommendation flow can serve. A far-future date is not used to judge the live flow; if the backend cannot serve a date, the expected result is the normal failure state of AC-21.
- **Live backend.** Criteria marked **Live** must pass at least once against the real stack (PostgreSQL, Keycloak, `user-service`, `trail-service`, `recommendation-service` with an OpenAI key). If the stack cannot run for an environment reason, those criteria are reported as blocked by the environment. They are not passed by interception alone.
- **Interception.** Other states (failures, timeouts, slow replies, zero results, null fields, specific payloads) may be produced by intercepting `POST /api/planner/turn` in the browser. Interception is a test tool only; no mock, fixture, or fake response ships in production code.
- **Baseline.** The working tree already holds unrelated uncommitted changes, including under `Project/Backend/` and in `Project/docker-compose.yml`. `qa` records a baseline at the start of the cycle and judges AC-43 against it.
- A criterion fails if any clause in it fails. Section references say where the exact values are.

### 24.2 Home shell and authentication

| # | Criterion |
|---|---|
| AC-01 | A signed-in user on `/home` sees the Home shell and nothing from the old placeholder: the header (product name, New Plan, Gear, identity, Sign out), the planner panel with the `h1` "Plan a trip", greeting GR1–GR3, four starter ideas, and the composer with the two trip-context controls. The placeholder heading, the "Frontend ready" button, and the "Your trip request" block are absent. The document title is "Plan a trip · Outdoor Trip Companion". |
| AC-02 | Authentication is preserved. A signed-out visitor who opens `/home` sees no Home content and ends on `/` with the sign-in gate, exactly as FEATURE-002 specifies. The identity shown follows FEATURE-002's fallback order. Gear in the header opens `/gear`, which still renders inside the unchanged `AppLayout`, as does `/trails/:trailId`. |
| AC-03 | Sign out on `/home` behaves as in FEATURE-002: the control shows its working state, `main` is inert and `aria-busy`, and the user lands on `/` with the signed-out notice. No confirmation dialog appears. |

### 24.3 Home media

| # | Criterion |
|---|---|
| AC-04 | The background is the actual assets. At 768px wide and above, with motion allowed, the page requests `/media/home/background.png` and `/media/home/background.mp4` and no other media file, and the video element is muted, loops, plays inline, has no native controls, and produces no sound. Below 768px (390×844 and 320×568) the page requests `/media/home/background.png` only: `background.mp4` is never requested and nothing in the background moves. At all six viewports the media covers the whole viewport with `object-fit: cover` and the `object-position` of 8.3.2, with no letterboxing and no stretching. |
| AC-05 | The loop is stable. At the desktop viewports, through one scripted session (send, clarification reply, results, a failure, Retry, opening both popovers, New Plan) the video is the same DOM node throughout, its `currentTime` only ever advances or wraps at the loop point, and the video file is not requested a second time. Playback continues past 8 seconds without a visible cut. |
| AC-06 | Media failure is harmless. At a desktop viewport with the video request blocked, the poster stays, the Pause / Play control is not rendered, no error is shown, and a full turn can be completed. With both files blocked, the `ink` base shows and a full turn can still be completed. The planner panel's box is identical before and after the media loads (no layout shift). |
| AC-07 | The interface does not wait for media. With both media requests delayed by 10 seconds, the composer accepts text, the trip-context controls work, and a turn can be sent and answered before either file has loaded. |
| AC-08 | Reduced motion (section 18). With `prefers-reduced-motion: reduce`, the poster is shown, the video file is never requested, no Pause / Play control exists, the waiting dots are static, and scrolling to a reply is instant. Every planning function still works. Switching the preference during a visit follows 18.2 without changing the conversation, the draft, or the scroll position. |
| AC-09 | The Pause / Play control (8.3.4) is present at 768px wide and above when motion is allowed, and is not rendered below 768px. It is operable by keyboard and pointer, and named "Pause background animation" or "Play background animation" according to its state. Pause holds the current frame; Play continues from it. It is not the browser's native control, and planner actions never change its state. |

### 24.4 Composition and readability

| # | Criterion |
|---|---|
| AC-10 | Desktop composition. At each desktop viewport the panel's box matches the table in 9.2 within 2px, the header is one row laid out as 9.5, and the character with the laptop is under no interface element (9.3). The panel's position and size do not change when a reply, a failure, or a recommendation group appears (9.6), and the document does not scroll. |
| AC-11 | Readability does not depend on the video. With the media replaced by a plain white fill, the pixel checks of 19.5 pass (panel rgb(40, 55, 59) ± 2 beside text; header band rgb(79, 92, 94) ± 2 beside the product name). No element on `/home` has a computed `text-shadow` or `backdrop-filter`, and there is no full-frame overlay over the media. |

### 24.5 Conversation

| # | Criterion |
|---|---|
| AC-12 | Send gating. With no text, Send is unavailable (`aria-disabled`) and Enter sends nothing. With valid text but no date, no starting point, or neither, activating Send or pressing Enter sends no request, shows V2, V3, or V4, moves focus to the first missing control, and keeps the draft. |
| AC-13 | Composer behavior (10.1, 10.2.5). It is a labelled multiline textarea that grows from its minimum to its maximum line count and then scrolls. With a fine pointer, Enter sends and Shift+Enter adds a line break; Enter during IME composition does not send. With a coarse pointer, Enter adds a line break and the Send button sends. From 1,800 characters the counter shows; past 2,000 the text is kept, V1 shows, and nothing can be sent. The composer is cleared when a message is sent. |
| AC-14 | **Live.** Clarification. The first message of a plan sends `POST /api/planner/turn` with `message`, `context: null`, `latitude`, `longitude`, and `tripDate`, and without `radiusKm`. When the response status is `NEEDS_CLARIFICATION`, the assistant text equals `assistantMessage` character for character and no recommendation group is rendered. |
| AC-15 | **Live.** `PlanningContext` continuity. For every turn after the first, the request's `context` is deeply equal to the `context` of the previous successful response. The plan summary line (10.2.8) shows only what that context contains. Typing a preference without sending it changes neither. |
| AC-16 | **Live.** Recommendations. Continuing the conversation until the status is `READY_TO_RECOMMEND` shows the assistant message verbatim and, under it, one recommendation group with at most three cards in the order of the response, captioned with the date and starting-point label the turn was sent with (12.3.1). |
| AC-17 | Card content (12.2, 12.3.2). Each card shows only the returned name, difficulty, distance, elevation gain, duration, scenery, description, and score, formatted as 12.2 states. With a response in which fields are `null`, each missing part is omitted with no placeholder, zero, or dash. An unrecognized difficulty or scenery value is omitted. The score button opens a breakdown of up to five labelled rows with their maximums (55, 15, 15, 10, 5). No card contains an image, a link, a map, a route, a forecast value, a driving time, a distance from the user, a gear list, or any action that selects or opens a trail. |
| AC-18 | **Live.** Refinement. After results, sending another message issues a normal turn carrying the current context. When recommendations come back, the new group is shown expanded and the earlier group collapses to an "Earlier results" row that keeps its own date and starting-point caption and expands to the unchanged cards (12.3.3). No earlier message disappears, and the user is never asked to start a new plan. |
| AC-19 | Zero results. A `READY_TO_RECOMMEND` response with an empty list shows the backend's message as the assistant text, the caption, and the Z1 guidance block, visibly distinct from assistant speech. No card and no button is rendered. |
| AC-20 | Loading (13.1, 13.3.1). On send, the user's message is visible immediately and the waiting indicator with W1 appears in the assistant's position; after 10 seconds it reads W2. The reply appears whole in one update: no character-by-character or word-by-word reveal. The composer does not move or resize. While the turn is in flight, Send is unavailable and neither Enter, the Send button, nor a starter idea can start another: exactly one request is made per turn. |
| AC-21 | Failures (13.2, 13.3). For each of: a network error, a 500, a 503, a 45-second timeout, a 400 titled "Unsafe Prompt", any other 400, and a 401, the user's message stays in the history marked "Not sent" with the approved text (E1, E1, E1, E2, E3, E4, E5). No assistant message is created for the failed turn. The next request sent carries the same `context` as before the failure. Neither the page nor the console shows a status code, a backend error text, a stack trace, a request body, or a token. |
| AC-22 | Retry (13.3.2). Retry resends the same text with the current context, date, and starting point. The message appears exactly once before, during, and after the retry. A successful retry continues as a normal turn. The "Unsafe Prompt" case offers Edit message instead of Retry, and it puts the text back in the composer. A failed message the user did not retry before sending something else stays marked "Not sent" and loses its actions. |
| AC-23 | Scrolling and focus (10.1, 10.2.4). The history scrolls inside the panel: after 20 messages the document's scroll height still equals the viewport height at the desktop viewports. With the history at the bottom, a new reply is scrolled into view from its top. With the history scrolled up, a reply does not move it and the "New reply" button appears and jumps to the reply. After a successful turn focus is in the composer; a reply never moves focus elsewhere. |
| AC-24 | New Plan (section 14). With at least one user message, New Plan opens the in-place confirmation C1 in the panel's title strip; no browser `confirm()` or modal dialog is used. "Keep this plan" and Escape change nothing. "Start new plan" clears the conversation, every recommendation group, the summary line, the trip date, and the draft; keeps the starting point and the signed-in session; shows the initial state; and puts focus in the composer. The next turn sends `context: null`. With no user message New Plan is unavailable. A response that arrives after New Plan is discarded. |
| AC-25 | Starter ideas (5.5, 10.2.3). Activating one puts its sentence in the composer, focuses the textarea, and sends nothing. None of the four sentences contains a date or a place. The starter ideas are not shown once the conversation holds a user message. |

### 24.6 Trip date and starting point

| # | Criterion |
|---|---|
| AC-26 | Trip date (11.1, 11.5). On a new plan the date is unset and nothing is preselected. The date input accepts today and any later date, has no maximum, and rejects a date before today with D1. The chosen date is shown in words on the control. The `tripDate` sent equals the displayed date as a local calendar date, including when the browser's time zone is far from UTC and the local time is close to midnight. Changing the date after results shows N2 and sends no request. |
| AC-27 | Geolocation needs an explicit action. The browser's geolocation API is not called on page load, on restore, when a popover opens, or on send. It is called only when the user activates "Use my location". After permission is granted the control reads "Your location" and the next request carries the coordinates the browser returned. Coordinates are never displayed, and there is no latitude or longitude field. |
| AC-28 | Fallback and failure. When permission is denied, the position is unavailable, the lookup times out, or geolocation is unsupported, G2–G5 is shown, no starting point is assumed, and "Use Vancouver" stays available. "Use Vancouver" sets the control to "Vancouver" and requests carry latitude 49.2827 and longitude −123.1207. No text calls Vancouver the user's location. No geocoding, map, or location-provider request is made. |

### 24.7 Landing prompt and session state

| # | Criterion |
|---|---|
| AC-29 | Landing prompt handoff (section 15). A prompt entered on the Public Landing, followed by sign-in or registration, appears on `/home` as the composer's editable draft with note N1. It is not in the history and no planner request has been sent. The pending-prompt key is no longer in `sessionStorage`. After a reload the draft is present exactly once. After it is sent it appears once as a user message and does not return to the composer. The prompt never appears in any URL. |
| AC-30 | Session restore (section 16). Reloading `/home` mid-conversation restores the messages, the recommendation groups (newest expanded, older collapsed), the summary line, the trip date, the starting point, and the draft. The restore itself sends no planner request and makes no geolocation call. A turn that was in flight at reload is restored as "Not sent" with E6 and Retry. A stored date that is now in the past is cleared and V5 is shown. |
| AC-31 | Storage hygiene. The planner uses one `sessionStorage` key. No `sessionStorage` or `localStorage` value written by the application contains an access, refresh, or ID token (no JWT-shaped string), and the planner writes nothing to `localStorage`. Replacing the stored value with invalid JSON, or with a value of the wrong shape, and reloading gives a clean initial state with no error on the page. |
| AC-32 | State ends with the session. After sign-out, the planner's key and the pending-prompt key are gone from `sessionStorage`. Signing in again in the same tab, as the same or a different user, shows the initial state with no earlier conversation, date, or starting point. The same holds after session expiry, and after a reload that finds the session has ended. Ownership (D28): the stored value names the signed-in user's subject as its owner. When a different user is the authenticated user at load, including after an identity change made in another tab followed by a reload of this one, none of the earlier user's messages, context, recommendations, trip date, draft, or starting point appears, the earlier value is gone from `sessionStorage`, and no request carries the earlier user's coordinates or context. The same user reloading still gets their state back (AC-30). |

### 24.8 API boundary

| # | Criterion |
|---|---|
| AC-33 | Every planner request is a same-origin `POST /api/planner/turn` with an `Authorization: Bearer` header. The token does not appear in a URL, in web storage, or in the console. During a full session on `/home` the browser makes requests only to the application's own origin and to the configured Keycloak origin: none to OpenAI, to a weather provider, or to any other third party. No product endpoint other than `/api/planner/turn` is called. |

### 24.9 Responsive

| # | Criterion |
|---|---|
| AC-34 | Tablet. At 768×1024 the panel is docked at the bottom as 17.1 specifies, the header is one row (17.2), the room is visible above the panel with the video playing and the Pause / Play control at the top-right, and a complete flow (set date, set starting point, send, read results, open a score breakdown, New Plan) works. |
| AC-35 | Phone. At 390×844 and 320×568 the panel is a bottom sheet as 17.1 specifies; the header shows the product name, New Plan, and a Menu that contains the identity, Gear, and Sign out (17.2); the date control, starting-point control, and Send share one row; trail cards are one column. The background is the still poster: no video plays and there is no Pause / Play control. The complete flow of AC-34 works, and so does Sign out from the Menu. |
| AC-36 | No horizontal overflow. At all six viewports the document's scroll width does not exceed the viewport width in the initial state, with three result cards shown, with an open popover, with a failed message, and with a 2,000-character message containing no spaces and a trail name of 80 characters with no spaces. |
| AC-37 | On-screen keyboard (17.4). On a touch device or touch emulation at 390×844, with the keyboard open, the textarea, both trip-context controls, and Send are visible and usable, a popover opened from a context control is fully visible, and focusing the textarea does not zoom the page. If no touch device or emulation with a keyboard is available, this criterion is reported as not verified rather than passed. **Not applicable since D29 (desktop-web first, user decision 2026-10-12).** It was never verified; QA's simulation suggested the control row can sit below the visible area with a keyboard open. |

### 24.10 Accessibility

| # | Criterion |
|---|---|
| AC-38 | Keyboard. Using only the keyboard, a user can set a date, choose Use Vancouver, send a message, open a score breakdown, expand an earlier result, retry a failed message, confirm New Plan, pause the background (at 768px wide and above), and sign out. Tab order follows 19.3 at the desktop viewports and at 390×844. Escape closes a popover, the Menu, or the confirmation and returns focus to the control that opened it. There is no focus trap, and focus is never left on a removed element. |
| AC-39 | Focus visibility. Every interactive element shows the design system's focus ring on `:focus-visible`, and no ring is clipped by an ancestor, including inside the scrolling history. |
| AC-40 | Semantics and names (19.1, 19.4). The page has one `h1`, an `h2` for each recommendation group, and an `h3` for each trail; the history is an ordered list; the textarea has a programmatic label; every control has the accessible name listed in 19.4; the media is hidden from assistive technology. Roles and states are carried by text or shape, not color alone: the "Planner" label, "You said:", and "Not sent" are present. |
| AC-41 | Announcements (19.2). Sending, a clarification reply, a reply with trails, a reply with none, a failure, and a new plan each put the string listed in 19.2 into the status or alert region once. The history itself is not a live region, and nothing is announced on load or on restore. |
| AC-42 | Contrast and targets. Each text and boundary pair listed in 19.5 meets its required ratio. The check is made with the media replaced by a white fill and again by a black fill, and visually at four moments of the loop about two seconds apart. With a coarse pointer, every control listed in 19.6 is at least 44 × 44px. |

### 24.11 Boundaries and regression

| # | Criterion |
|---|---|
| AC-43 | Scope. Compared with the baseline, nothing under `Project/Backend/` or `Project/docker/` and nothing in `Project/docker-compose.yml` has changed, and no Keycloak realm, client, or theme setting was altered. Changes are limited to `Project/Frontend/**` and the permitted parts of `docs/FRONTEND_CONTEXT.md` (section 23). |
| AC-44 | No realtime 3D and no new dependencies. `package.json` gains no runtime dependency: no Three.js, React Three Fiber, or other 3D or WebGL library, no chat UI library, no date-picker library. `/home` creates no `canvas` element and no WebGL context. |
| AC-45 | Separation and regression. In source, the Home media component imports nothing from the planning feature and the planner imports nothing from the media component (section 21). `npm run build` and `npm run lint` pass. The Public Landing and the authentication flows still meet their FEATURE-001 and FEATURE-002 criteria, except FEATURE-002 AC-23, which section 15 supersedes. |

## 25. Decisions, Open Questions, and Known Limitations

### 25.1 Lead decisions

| # | Decision | Reason |
|---|---|---|
| D1 | `/home` gets its own full-viewport shell inside `ProtectedRoute` and leaves `AppLayout`. The other routes keep `AppLayout`. The Home header reuses FEATURE-002's account behavior. | `AppLayout` is a bordered header over a centered column and cannot hold a full-viewport media background. The Public Landing already sits outside it for the same reason. |
| D2 | The browser reaches the planner through the smallest frontend-only Vite development proxy: `/api/planner/**` to `recommendation-service` on `localhost:8083`. `VITE_API_BASE_URL` stays empty. It is a local-development bridge; `recommendation-service` CORS, the API gateway, and backend networking are not modified. Production routing remains future infrastructure work. | `recommendation-service` has no CORS policy and the gateway has no routes. A proxy is frontend-only and needs no backend change. Approved by the user, 2026-10-12. |
| D3 | The shared API layer gains an authenticated request that gets its token from `getAccessToken()` and attaches it only to the application's own API paths. | FEATURE-002 D8 and S15 left this to the first feature that calls an API. |
| D4 | The trip date has no default and must be today or later. No maximum is applied. A date the backend cannot serve surfaces the normal failure and Retry state. | The backend requires a date and reads none from text. The contract defines no upper limit, and one must not be inferred from an assumption about the weather provider. Final decision by the user, 2026-10-12; it replaces an earlier 15-day frontend limit. |
| D5 | Starting point is one of two explicit choices: Use my location (geolocation on activation only) or Use Vancouver (49.2827, −123.1207). No coordinates are shown and no place search exists. | The backend requires coordinates. The capstone has no geocoding provider, and the demo trails are in the Vancouver region. |
| D6 | `radiusKm` is not sent and not exposed. | The backend default is adequate, and a radius control starts turning the chat into a filter panel. |
| D7 | Sending needs a valid message, a date, and a starting point. Missing context produces visible guidance and moves focus; it never sends with invented values. | Both values are required on every turn, including clarification turns. |
| D8 | A landing prompt arrives as the composer draft, is never sent automatically, and is consumed (its key cleared) once the draft is held in planner state. | Section 15. |
| D9 | Starter ideas fill the composer and do not send. They contain no date or place wording. | Predictable in every state; the date or starting point may not be set yet. The backend ignores dates and places in text. |
| D10 | Assistant text is the backend's `assistantMessage` verbatim. The only frontend-authored assistant-position text is the fixed greeting. | Nothing is fabricated, and the backend's wording stays the single source. |
| D11 | Cards show only returned fields, have no image area and no action, and are not links. The score breakdown is numbers with labels. | Trail Detail, selection, and Pack are later features. The response has no explanation text, forecast, or image. |
| D12 | No simulated streaming or invented progress text. One client timeout of 45 seconds. | The backend answers in one piece and reports no progress. A ready turn makes one weather request per nearby trail and can be slow. |
| D13 | Failures are grouped into five user-facing kinds (section 13.2). A failed message stays, is marked not sent, and can be retried without duplication. Backend error text is never shown. | The backend's error shapes are inconsistent, and most failures are indistinguishable from the browser. |
| D14 | Planner state lives in one `sessionStorage` key, is validated on read, and is discarded whenever the session ends, including a startup that finds no session. | Tab-scoped continuity without a saved-chats product, and no leakage to the next person at a shared computer. |
| D15 | New Plan clears the messages, the `PlanningContext`, the recommendations, the trip date, the draft and any pending planning input, and all other planner-specific state. It preserves authentication, account state, and the explicitly selected starting point. | A new plan is a new trip, so its date is not carried over silently. Where the user starts from does not change between plans. Approved by the user, 2026-10-12. |
| D16 | A Pause / Play control is provided wherever the Home video plays. Where the poster is the background (below 768px, or reduced motion) the video is not requested and the control is not shown. | DESIGN_SYSTEM sections 22 and 23. |
| D17 | The existing `background.mp4` and `background.png` are used as they are. No separate mobile asset is created and nothing is transcoded in this feature. | User decision, 2026-10-12. |
| D18 | Changing the date or starting point after results does not resend anything. | A turn needs a user message, and the frontend does not send one the user did not write. |
| D19 | No new runtime dependency. The date control is the native date input. | Keeps the feature small; the native control is accessible and works on mobile. |
| D20 | On `/home`, FEATURE-002's saved-request block (section 8, 21.4.3, AC-23) and the "Frontend ready" button (D24) are superseded. | The planner now consumes the prompt, as FEATURE-002 D6 anticipated. |
| D21 | Design choices accepted from `ui-ux`: the panel stands in the left third of the frame (9.1); the read-only plan summary line is included (10.2.8); the date and starting point are two compact controls inside the composer with small popovers and quick-pick dates (11.5); an earlier recommendation group collapses to one expandable row (12.3.3); New Plan has one in-place confirmation step (14.1.2). | Each follows a lead rule that left the choice to the design. The left third is the only position that keeps the window, the character at the desk, and the dog's path uncovered. |
| D22 | Tier S (1024–1279px wide) uses a 560px panel, below the 620–760px target. | At that width a 620px panel would leave under 40% of the frame for the room. The three required desktop viewports are all within the range. |
| D23 | The waiting text may change once, after 10 seconds, to W2. | It states elapsed time only and claims no backend progress, so it is not simulated streaming or invented status. |
| D24 | A failed message's Retry is the last focusable control in the history, directly before the composer in the tab order. | Keeps the tab order equal to the visual order. |
| D25 | A card whose `name` is `null` has no visible heading and is named "Recommendation {n}" for assistive technology only. | Section 12.1 forbids placeholders for missing data, but an unnamed article is unusable with a screen reader. |
| D26 | From 768px wide the video may autoplay, muted, looping, and inline, under the Home media rules. Below 768px the background is `background.png` and the video is not played or requested. Under `prefers-reduced-motion` the poster is used at every width. | Below 768px the conversation sheet covers most of the scene, so continuously decoding the 8.8 MB video adds little product value. Final decision by the user, 2026-10-12. |
| D27 | The design-system proposals from `ui-ux` are deferred: the panel surface (`ink` at 0.88), the header scrim band, the quiet-control recipe, 16/24 conversation type, the popover surface, the compact context-button geometry, the trail card, the note line, and the left-panel media safe zones. They remain feature-level values here and `docs/DESIGN_SYSTEM.md` is not edited by this feature. | Same handling as FEATURE-002 D24. They are promoted when a second feature needs them. |
| D28 | Planner session state belongs to one authenticated Keycloak subject. The stored value carries the owner's `sub`, and a value with a missing or different owner is discarded and removed on read. The single key, `sessionStorage`, and every session-end rule of D14 are kept. | A reload that found a different user's live session (for example after an identity change in another tab) restored the previous user's conversation and starting-point coordinates, because ownership relied only on this tab observing a session end. `sub` is not a secret; storing it for ownership replaces the earlier rule that nothing from the auth adapter is stored. User decision, 2026-10-12. |
| D29 | The product is desktop-web first. Validation priority is 1920×1080, 1440×900, 1366×768, and about 1024px wide. Below 768px is best-effort: the layout of section 17 stays as built, but no phone-specific hardening is done and AC-37 (on-screen keyboard) is not applicable. | User decision, 2026-10-12. Recorded here as a note only: `docs/PRODUCT_REQUIREMENTS.md` section 42 still states that primary flows remain usable on mobile, and that document has not been changed. The difference is the user's to settle. |

### 25.2 Open questions

Q1, Q2, Q3, and Q5 were decided by the user on 2026-10-12 and are closed. Q4 is the only open item; it is a check made at the start of implementation and blocks nothing now.

| # | Question | Outcome | Status |
|---|---|---|---|
| Q1 | Is the Vite development proxy acceptable as the browser path to the planner? | Approved as a local-development bridge (D2, section 4.8). No CORS, gateway, or backend networking change. Production routing is future infrastructure work. | Resolved |
| Q2 | Should the frontend cap the trip date at 15 days ahead? | No. The cap is removed: the only rule is `tripDate >= today` (D4, section 11.1). An unservable date shows the normal failure and Retry state. | Resolved |
| Q3 | Should New Plan keep the starting point? | Yes (D15, section 14). | Resolved |
| Q4 | Does the proxied request pass `recommendation-service` unchanged (it will carry the browser's `Origin` header)? | Expected to pass. Verified at the start of implementation; a refusal is a backend contract gap that `frontend` reports and the lead routes to `backend-api`. | Open, non-blocking |
| Q5 | How are the existing media assets used across screen sizes? | From 768px the video plays; below 768px the poster is the background; reduced motion uses the poster at every width. No mobile-specific assets and no transcoding (D17, D26, section 8.1). | Resolved |

### 25.3 Known limitations

| Limitation | Effect in this feature | Handling |
|---|---|---|
| Contrast ratios and scene geometry in sections 8, 9, 17, and 19 were worked out from the poster and extracted frames, not measured in a browser. | A value may need a small correction once rendered. | AC-10, AC-11, and AC-42 measure them. A needed correction is reported to the lead, not applied silently. |
| The backend does not read a date or a place from the message. | "This Saturday" or "near Squamish" typed in a message changes nothing. | The date and starting point are always visible in the planner; the landing-prompt note and the composer hint point to the controls. No frontend text parsing. |
| The response carries no forecast, distance from the user, required gear, or explanation text. | Cards cannot say why in words, show the weather, or show how far away a trail is. PRD sections 9.2 and 9.3 are met only as far as the score breakdown allows. | Listed in `FRONTEND_CONTEXT.md` section 11. A contract change is a later `backend-api` decision, not part of this feature. |
| One weather failure, or an OpenAI or trail-service failure, fails the whole turn with an unmapped server error. | The user sees one general "unavailable" message. | Retry. Backend exception mapping stays a documented gap. |
| The backend does not validate `tripDate`. | The control prevents a past date. A future date the weather dependency cannot serve fails as an unmapped server error. | Shown as the normal failure (E1) with Retry (D4). A forecast-horizon rule belongs in backend validation if the product later requires one. |
| The planner asks at most two fixed questions and its texts are deterministic. | The conversation is short and plain. | Shown as returned. Not embellished by the frontend. |
| The dataset is eight demo trails near Vancouver. | Use my location far from Vancouver returns "I couldn't find a trail that fits those preferences." | The zero-results guidance suggests Use Vancouver. |
| No browser path to the backend outside the development server. | `npm run preview` and a deployed build cannot plan. | D2 is a local-development bridge. Production routing is future infrastructure work. |
| No saved trips or conversation storage in the backend. | The conversation lasts for the tab and ends with the session. | Section 16. |
| Selecting a trail is not possible yet. | The journey stops at viewing recommendations. | Trail Detail and selection are the next feature. |
| No automated test runner exists in `Project/Frontend/`. | Validation is in the browser, plus build and lint. | Section 24. |
