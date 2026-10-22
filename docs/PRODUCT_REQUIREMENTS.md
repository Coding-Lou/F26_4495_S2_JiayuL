# Outdoor Trip Companion — Product Requirements

The current product definition: what the product is, how it behaves, what is in and out of scope, and the roadmap. It does not describe the repository; current APIs, routes, and implementation state are in `docs/FRONTEND_CONTEXT.md`, and visual rules in `docs/DESIGN_SYSTEM.md`. Detailed per-feature behavior, acceptance criteria, and decision history are in `docs/features/<feature>.md`.

When an implementation constraint conflicts with this document, do not silently change the requirement: surface the conflict and decide whether the implementation or the requirement changes.

**Section numbers.** This document was compacted on 2026-10-19 and renumbered. Feature specifications, checkpoints, and `DESIGN_SYSTEM.md` written up to that date cite the earlier numbering ("PRD §x"); those references resolve in the verbatim snapshot `docs/archive/PRODUCT_REQUIREMENTS-2026-10-19-pre-compaction.md`, which also keeps the full decision record and the superseded sections.

---

## 1. Decision Record

Decisions that still shape current behavior. Earlier and superseded entries are in the archived snapshot.

| Date | Decision | Detail |
|---|---|---|
| 2026-10-11 | The Authenticated Home is a pre-rendered room background with the React planner over it, not a real-time 3D scene | §19.1 |
| 2026-10-14 | The product prepares users for real trips and is not a hiking simulation. Start Adventure, real-time outdoor scenes, and 3D Explore are removed. The Gear Studio is the product's real-time 3D experience | §3, §21 |
| 2026-10-15 | The signed-out `/` is the cinematic Hero (no planner), then Discover (map + synchronized list). Signed-out trail detail is a marker-anchored popup whose action is **Sign in to plan this trip**; there is no public Trail Detail page | §5, spec 006 |
| 2026-10-16 | Gear model: Recommended ≠ Owned ≠ Equipped. `/gear` (My Gear) manages ownership; the Gear Studio stays trip-specific; one inventory feeds both | §9, spec 007 |
| 2026-10-16 | Remember is FEATURE-008 (Memory backend), FEATURE-009 (My Memories), FEATURE-010 (Community Memories). GPX, AI recap, video, and social features are out of scope | §12, specs 008–010 |
| 2026-10-17 | Two trail populations: the curated catalog and generated synthetic planner candidates, always disclosed as sample data. Discover is viewport-driven and shows both, clustered | §5.2, §13 |
| 2026-10-18 | Community Memories in Discover: popup preview plus a docked Community panel, the one exception to the single floating surface | §12.3, spec 010 |
| 2026-10-19 | The feature freeze is reopened by explicit user decision for FEATURE-011 to FEATURE-014 (Plans). FEATURE-014 is the final product feature; there is no FEATURE-015; the freeze resumes after it | §11, §22 |
| 2026-10-19 | Planner polish: a "no preference" answer leaves a dimension open, each dimension is asked at most once, and durations carry a mode (around / up to / at least) | §7 |
| 2026-10-20 | My Plans (`/plans`) accepted: the user's Plans as Upcoming / Past with a monthly calendar; Continue after Finish preparation leads there | §11 |
| 2026-10-20 | Plan → Memory Bridge accepted (FEATURE-014, final product feature): a past Plan on a curated trail offers Add memory or View memory, derived from the user's own Memories (no stored link); past Plans on synthetic trails have no bridge. The feature freeze is active again | §11, §22, spec 014 |
| 2026-10-21 | Final Full Regression PASS (classification B) and release / product gate accepted: functional development complete; next demo and deployment preparation | §22 |

---

## 2. Product Overview

Outdoor Trip Companion is an AI-assisted outdoor trip planner that takes a user from "I want to go somewhere this weekend" to "I know where I am going, what to bring, and I am ready", and afterwards to "I have kept and shared what I experienced."

It combines public map-first trail discovery, aggregate Daily Trail Activity, conversational AI planning, weather-aware recommendation, packing recommendations with Gear Readiness, a personal gear inventory, user-controlled gear selection on a personalized real-time 3D avatar, a saved Plan for each trip the user commits to, and trip Memories that can optionally be shared back to Discover.

**One-sentence description:** Outdoor Trip Companion helps people discover trails, plan trips with AI, prepare the right gear, go outdoors in real life, and preserve and share their memories.

**Tagline:** From "Where should I go?" to "I'm ready to hike."

### 2.1 Terminology

| Term | Meaning |
|---|---|
| **Public Discover** | The signed-out homepage at `/`: cinematic Hero, then the Discover section |
| **Authenticated Home** | `/home`: the AI planner over a pre-rendered preparation-room background |
| **Plan** (stage) | Deciding where to go: the AI planner or a trail found in Discover |
| **a Plan** (record) | One user's saved decision to go on one trail on one date, created by **Finish preparation** |
| **Trip** | A selected trail and date during preparation |
| **Memory** | A user's record of a real trip on a trail: date, title, optional story, up to five photos |
| **Community Memories** | Memories authors chose to make PUBLIC, read on a trail in Discover |
| **Curated trail / synthetic trail** | A trail of the curated catalog / a generated sample planner candidate (§13) |

---

## 3. Product Vision and Principles

Planning should feel guided, personal, and honest about real conditions. The user sees real trails first, then describes what they want in their own words; the system considers trail characteristics and weather, recommends options, helps prepare the right gear, shows that preparation on a personal 3D avatar, records the decision as a Plan, and after the real trip helps them remember and share it. It is not a hiking simulator or an outdoor game.

1. **Discovery first, AI-first planning.** Visitors understand the product and browse real trails without an account. Once signed in, conversational planning is the primary planning entry; users need not understand the data model or filters.
2. **Visual but functional.** Every visual serves a purpose: the Hero sets atmosphere and promise; the map supports choosing trails; the Home room provides atmosphere; real-time 3D appears only where application state changes what is visible (the Gear Studio). Atmosphere-only scenes are pre-rendered.
3. **User control.** Recommendations are suggestions. Users control trail, date, gear, what to wear and carry, and whether to follow recommendations. A recommended item never becomes equipped automatically.
4. **Progressive experience.** Each stage reveals only what the current decision needs.
5. **Consumer product, not dashboard.** Avoid enterprise, admin, developer-dashboard, or generic AI-SaaS feel.
6. **3D supports preparation; it is not core business logic.** The core value is discovery, recommendation quality, weather-aware planning, packing, gear management, and personalization.
7. **Real trails at the door, personalized product inside.** Public Discover shows where one could go; the authenticated product helps plan and prepare. Same brand and identity, distinct responsibilities.
8. **Honest real-world data.** Activity figures are planning counts, never presence; sample or simulated data is disclosed; missing data (routes, images, weather, activity) degrades gracefully and is never fabricated.

---

## 4. Primary User Journey

**Discover → Plan → Prepare → Finish preparation → a saved Plan → Go in real life → Remember → optionally share back to Discover**

| Stage | What the software does |
|---|---|
| Discover | Hero, public trail map and synchronized list, trail name search, trail popup with Daily Trail Activity and Community Memories |
| Plan | Authenticated conversational planner; recommendations; Trail Detail with a trip date and **Choose this trail** |
| Prepare | Trip Preparation (weather, recommended gear, Owned / Missing, Gear Readiness); My Gear; the Gear Studio with the 3D avatar |
| Finish preparation | Saves a Plan for the trail and date (FEATURE-011); the Ready-to-Go completion follows (FEATURE-012) |
| Go in real life | Nothing. The software does not simulate, track, or accompany the trip |
| Remember | From a past Plan in My Plans, **Add memory** or **View memory** (FEATURE-014); My Memories; optionally PUBLIC Memories that appear as Community Memories in Discover |

```text
Public Discover (/) → Hero → Discover → select a trail → popup → "Sign in to plan this trip"
    → sign in → that trail's Trail Detail (/trails/:trailId)
Authenticated Home (/home) → AI conversation → recommendations → Trail Detail
Trail Detail → date + Choose this trail → Trip Preparation → Gear up → Gear Studio
    → Finish preparation → Plan saved → Ready for the trail. → Continue → My Plans (/plans)
After the trip → My Plans → past Plan → Add memory (trail and date preselected) → My Memories
    → optionally Public → Community Memories in Discover
```

The complete product loop: Discover → Planner → Trail selection → Preparation → Gear Studio → Finish preparation → Ready-to-Go → My Plans / Calendar → real-world trip → past Plan → Memory → optional Community sharing.

Signed-in users who open `/` go to `/home`.

---

## 5. Discover (Public)

### 5.1 Experience boundary

Public Discover (`/`, signed out) and the Authenticated Home (`/home`) are separate experiences and never interchangeable uses of "Home". Public Discover is brand first, discovery second, in this order:

1. A fixed public header: product identity, Discover (in-page), Sign in.
2. The **cinematic Hero**: three pre-rendered outdoor scenes with posters, rotation, a still poster under reduced motion, and Pause / Play; the slogan "Discover the trail. Prepare for the journey.", one support line, and **Explore trails**, which moves to Discover. The Hero hosts authentication notices and the sign-in gate. It has no planner input, conversation, suggestions, or pending prompt.
3. The **Discover section**: an interactive trail map with a synchronized trail list, and one marker-anchored trail popup.

Discovery never depends on the Hero media. The map opens on a fixed default region (Vancouver and the Lower Mainland) and never requests the visitor's location. Desktop is primary; in Discover the map dominates with a compact list beside it.

### 5.2 Map, list, search, and popup

- **Viewport-driven.** Discover shows the trails in the current map area, curated and synthetic alike, read once the map comes to rest (never during movement).
- **Map.** Each trail is a marker at its trailhead; at wider views nearby trails merge into clusters whose number counts **trails only**; selecting a cluster zooms until it splits. Markers may encode a coarse activity level; no people counts, people icons, heat, or moving dots, and nothing implies live presence. The map is never the only way to reach a trail.
- **List.** The trails in the current map area, nearest the map centre first, with their count; at most the 50 nearest, with a prompt to zoom in for the rest. It is the precise browsing, keyboard, and assistive-technology path. One selected trail is shared by list and map.
- **Trail name search.** A search field finds trails by name across the curated catalog and the trails already loaded; picking one selects it, moves the map to it, and opens its popup.
- **Popup** (the signed-out visitor's trail detail): name, difficulty, distance, elevation gain, estimated duration, scenery, short description, today's Daily Trail Activity with its sample disclosure, an image only when a real one exists, a sample-data disclosure for sample trails, Community Memories for curated trails (§12.3), then **Sign in to plan this trip** (primary) and **Create account**. No View trail link, no navigation to a full Trail Detail, no planning controls.

### 5.3 Public access and conversion

Public visitors may watch the Hero, browse the map and list, search, read trails in the popup, see Daily Trail Activity, and read PUBLIC Memories. They may not use the AI planner, choose a date, prepare, use the Gear Studio, open Trail Detail, manage gear, save Plans, or create Memories. Authentication is requested only when the visitor wants personalized functionality.

**Sign in to plan this trip** preserves that trail as the return destination: after authentication the user lands on the authenticated Trail Detail of the same trail. The header's Sign in, used without a trail, leads to `/home`. Cancelled or failed authentication shows a clear recovery path and never implies that planning occurred.

---

## 6. Daily Trail Activity

**Daily Trail Activity** for trail *T* on date *D* is the number of trips planned for *T* for *D*: one aggregate, non-negative integer per trail per local day. Wording describes planning: "N trips planned for today", "1 trip planned for today", "No trips planned for today yet".

- It is not live presence, GPS-derived, a count of people on the trail, real-time, or location tracking. Copy never says "exploring today", "people on this trail", "live hikers", "right now", or similar.
- Source **SIMULATED** (deterministic sample values, disclosed as **Sample activity**) is current. **RECORDED** (real planned trips) would not change the response shape; no decision yet connects Plans to it.
- "Activity unavailable" is distinct from zero and never shown as zero. Discovery works fully without activity. Synthetic trails have no activity figure.
- Only aggregate counts are public: never identity, participant lists, locations, individual timestamps, or planning content.

---

## 7. Plan: AI Trail Planning

Help the user answer "Where should I go?" AI planning is authenticated and happens in the Authenticated Home.

- **Input.** Natural language combining any of difficulty, distance, duration, elevation, scenery, location, date, and weather; users need not give every dimension. Examples: "a moderate hike with a lake view this Saturday", "something easy near Vancouver for tomorrow", "a mountain trail but I only have three hours".
- **Multi-turn.** The conversation accumulates preferences; a later message changes only what it mentions. When the request is not yet specific enough, the planner asks one short question at a time (difficulty first, then trip length). The planner needs the trip date and a starting location.
- **No preference.** "Any", "no preference", or "I'm flexible" leaves that dimension open and the planner moves on. Each dimension is asked at most once; an unanswered question is left open. The summary shows open dimensions as "Any difficulty", "Any trip length", "Any scenery".
- **Duration.** A duration is read as approximate ("around three hours", "half-day"), a maximum ("up to three hours"), or a minimum ("at least four hours"), and shown as "Around …", "Up to …", or "At least …".
- **Explicit constraints are respected.** An explicit difficulty, an explicit scenery preference (any of the named types), and a maximum or minimum duration exclude trails that contradict them. When nothing fits, the planner says so and suggests changing preferences rather than returning a contradictory trail; it may then return fewer than three.
- **Recommendations.** Up to three primary recommendations, considering difficulty, distance, elevation, duration, proximity, scenery, weather, and gear readiness. Each card communicates name, difficulty, distance, elevation gain, duration, scenery, a match score, and a human-readable explanation, with weather where available. Raw scoring is secondary information at most.
- Weather lookups are limited to a short list after the hard constraints; one failed lookup never fails a recommendation.

---

## 8. Trail Detail

Help the user confirm "Is this the trip I actually want to do?" Trail Detail (`/trails/:trailId`) is authenticated only; a signed-out visitor is asked to sign in and returns to it.

It shows trail facts, description, scenery, route and image (with graceful fallbacks; never fabricated), the sample disclosure for sample trails, and "Why this trail" when reached from a recommendation. Its primary action is a trip date plus **Choose this trail**, which moves the user from Plan to Prepare. For curated trails it also offers a quiet **Add a memory** for someone who has already been there.

Selecting a trail for a date establishes the trip context used by Trip Preparation and the Gear Studio. Trail and date travel with the user; they never have to choose them again, and signing in never loses the trail they were reading.

---

## 9. Prepare

Help the user answer "What should I bring?"

### 9.1 Trip Preparation

The chosen trail and date with the forecast (temperature, precipitation, wind), the recommended gear, each recommended category marked Owned or Missing, and Gear Readiness. Recommendations consider trail difficulty, distance, elevation, duration, the forecast, baseline trail requirements, and the user's owned gear. **Gear up** leads to the Gear Studio.

### 9.2 Gear states

| State | Meaning | Scope |
|---|---|---|
| **Owned** | In the user's persistent Gear Inventory (My Gear) | The user, across trips; stored on the server |
| **Recommended** | What preparation recommends for this trail, date, and weather | One trip; derived |
| **Missing** | Recommended categories not represented in the owned inventory | One trip; derived |
| **Equipped** | What the user explicitly chooses to wear or carry | One trip; never a permanent property of an item |

**Recommended ≠ Owned ≠ Equipped.** **Gear Readiness** is the share of recommended gear categories the user owns ("All recommended gear covered" or "N recommended items missing"). It is distinct from the planner's match score.

### 9.3 My Gear (Gear Inventory)

`/gear` is the permanent ownership experience, reached from global navigation and usable without a trip: create, view, edit, and remove owned items. A user may own several items in one category. Removal is a soft delete: the item stops being Owned everywhere and stops counting as Equipped. My Gear uses category-level 2D artwork, not 3D; the interim icons are accepted, and illustrated replacements are polish.

### 9.4 Gear Studio

The trip-specific space, reached from Trip Preparation (no global navigation entry), where the user equips or unequips owned items (one per category), replaces one item with another owned item, and adds gear they own. Adding gear in either place creates the same owned item. The user keeps final control.

### 9.5 Avatar and gear visualization

- One persistent, stylized, anime-inspired, cel-shaded avatar represents the user in every trip they prepare; no unrelated characters per page. No face customization, body sliders, complex hair, RPG stats, combat, or classes. A basic idle animation is allowed.
- Only Equipped gear appears on the avatar, and it updates in real time without a reload.
- Real gear maps to a small set of **fixed visual categories** (many products → one asset, e.g. any rain jacket → `rain_jacket`). The mapping user gear item → gear category → visual category → 3D asset → equipment slot (head, body, legs, back, hands, feet) stays separate from the gear record; the backend stores no 3D content. Not every category is visible (food and water stay packing states).
- Packing and gear selection work while 3D loads, on reduced-capability devices, and without 3D; the avatar may be omitted on small screens.

---

## 10. Go in Real Life

After preparing, the user has a clear ready state (trip, date, conditions, what to bring, what is equipped) and goes outdoors. "Go in real life" is not a software feature: the product does not simulate, guide, track, or record the trip.

---

## 11. Finish Preparation and Plans

A **Plan** means "I intend to go on this trail on this date, and I have finished reviewing my preparation." It is not "this trail was recommended to me" or "I opened preparation".

### 11.1 Current behavior (FEATURE-011 to FEATURE-014, PASS / FROZEN; specs `docs/features/011-plan-foundation-finish-preparation.md`, `docs/features/012-ready-to-go-3d-completion.md`, `docs/features/013-my-plans-calendar.md`, `docs/features/014-plan-memory-bridge.md`)

- **Finish preparation** at the end of the Gear Studio is the only way to create a Plan. It is available whatever the Gear Readiness.
- A Plan stores only the trail, the trip date, the status `READY`, and timestamps. It copies no trail, weather, or gear data; later loadout changes do not affect it. Upcoming and Past are derived from the date; there is no "completed" status (having gone is expressed by a Memory).
- A Plan is private to its owner; there is no public Plan. Ownership comes only from the signed-in identity.
- One user has at most one active Plan per trail and date, however often Finish is pressed or retried; saving again confirms the existing Plan.
- The trip date cannot be in the past. Synthetic trails may be planned.
- After saving, the avatar plays a short ready-to-go animation (FEATURE-012; skipped under reduced motion, when paused, or without the avatar), then the user sees **Ready for the trail.** and **Continue** to My Plans. A failed or unconfirmed save never shows completion or the animation and offers Try again; an animation that cannot play never affects the saved Plan.
- **My Plans** (`/plans`, FEATURE-013) shows the user's whole Plan collection: **Upcoming** (trip date today or later, nearest first; today's Plan marked Today) and **Past** (most recent first), beside a monthly calendar that marks the days with Plans (a count where a day has several). Selecting a Plan shows its month and day; selecting a day selects its Plan or narrows the list to that day's Plans. A selected Plan shows its trail facts and offers **View trail**, **Review gear** (Upcoming only, opening Trip Preparation for that trail and date), and **Delete plan** after a confirmation. A Plan whose trail is gone shows "Trail unavailable" and can still be deleted. There is no Plan editing, no creation from the calendar, and no weather or readiness. An incomplete collection is never shown as complete.
- **Plan → Memory Bridge** (FEATURE-014). A selected **Past** Plan (trip date before today) on a **curated** trail whose details loaded shows, in its detail only:
  - no matching Memory: **How was your trip?** and **Add memory**, which opens the Memory editor with the Plan's trail and date preselected (both stay editable);
  - one or more matching Memories: **You kept a memory of this trip.** and **View memory**, which opens the user's own Memory (the most recently created when several match).
  - A Memory matches when it is the signed-in user's own, not deleted, on the same trail and the same trip date; PRIVATE and PUBLIC both count. The match is derived each time from the user's Memories: nothing links a Plan to a Memory, opening Add memory marks nothing, and a Memory saved with a different trail or date matches that other trail and date instead.
  - While the user's Memories are not yet known, nothing is offered; when they cannot be read completely, the Plan says **Memory status is unavailable.** with **Try again**. Unknown is never treated as "no Memory".
  - Upcoming Plans (today included), past Plans on synthetic trails, and Plans whose trail is unavailable or not yet loaded show no bridge and no explanation. The calendar and the collapsed Plan rows show nothing about Memories.
  - Deleting a Plan never deletes a Memory, and deleting a Memory never deletes a Plan.

### 11.2 Roadmap boundaries

| Feature | Owns | Status |
|---|---|---|
| **FEATURE-012 Ready-to-Go 3D Completion** | A ready-to-go avatar animation in the Gear Studio that plays only after a Plan save has succeeded, then the **Ready for the trail.** completion | PASS / FROZEN |
| **FEATURE-013 My Plans & Calendar** | `/plans`: the user's Plans, a monthly calendar, Upcoming / Past, Plan detail, deleting a Plan, and a **Plans** navigation entry; a Plan whose trail is gone shows as unavailable | PASS / FROZEN |
| **FEATURE-014 Plan → Memory Bridge** | From a past Plan on a curated trail, **Add memory** with trail and date preselected, or **View memory** when a matching Memory exists; past Plans on synthetic trails have no bridge | PASS / FROZEN; final product feature |

---

## 12. Remember

Help the user answer "What did I experience?" Remember happens after the real trip.

### 12.1 My Memories (FEATURE-009)

The authenticated journal at `/memories`: a Memory has a trail, a trip date (not in the future), a title, an optional story, and up to five photos, the first being the cover. The user creates, reads, edits, and deletes their Memories and chooses **Private** (default) or **Public** for each. A Memory can be started from Trail Detail, or from a past Plan with its trail and date preselected (§11.1). The trail is fixed once saved. Only curated trails can be chosen; synthetic trails are not real routes and are not used for Memories.

### 12.2 Memory foundation (FEATURE-008)

Owner and public access are separate. A Memory is private unless its author makes it public. Photos are sanitized by the server so no location or other metadata is kept, and are served through short-lived links that the product refreshes when they expire.

### 12.3 Community Memories (FEATURE-010)

- Supporting evidence for a trail; Discover stays trail-first.
- The selected curated trail's popup shows its PUBLIC Memories as a count, at most two short previews, and **View all memories**. View all hides the popup and opens a Community panel beside the map that lists them and opens one read-only; closing it brings the popup back. This is the one exception to the single floating surface (§19.4).
- Synthetic trails show no Community Memories.
- Read-only for everyone in Discover, including signed-out visitors. PRIVATE Memories never appear; a Memory that stops being public stops showing.
- No author identity, likes, comments, followers, feeds, ranking, or other social features, and no creating, editing, or reporting from Discover.

---

## 13. Trail Data

- **Curated catalog:** the small set of curated sample trails that forms the product's catalog (disclosed as sample trail data where shown). Daily Trail Activity, the My Memories trail picker, Community Memories, and Add a memory use curated trails only.
- **Synthetic planner candidates:** generated sample routes that give the planner enough candidates. They are always disclosed as sample data and never presented as verified trails. They appear in Discover (clustered with the rest), can be recommended, opened in Trail Detail, prepared, and saved as Plans, but have no activity figure, no Memories, and no Community Memories.
- Missing routes, images, or weather degrade gracefully; nothing is fabricated.

---

## 14. Information Architecture and Navigation

Public navigation: product identity (to `/`), Discover, Sign in. Authenticated navigation: Planner (Home, reached through the product identity), Plans, Gear, Memories. A Profile destination belongs to the original information architecture but is neither built nor scheduled. Navigation represents user goals, never service names, and never exposes unbuilt destinations. Trail Detail, Trip Preparation, and the Gear Studio are states of one journey reached from the planner or Discover, not top-level destinations.

---

## 15. Errors and Empty States

Failures never expose technical details ("Weather information is temporarily unavailable. You can still review this trail.", not "OpenMeteo API failed with HTTP 500"). Required states include: no matching trails, trail list unavailable, map unavailable (the list remains usable), activity unavailable (never zero), recommendation unavailable, weather unavailable, route or image unavailable, empty gear inventory, owning none of the recommended gear, Memories unavailable, a Memory no longer available, a Plan save that failed or could not be confirmed, no Plans yet, no upcoming Plans, Plans unavailable (never shown as no Plans), a Plan whose trail is unavailable, and a past Plan's Memory status unavailable (never shown as no Memory).

---

## 16. Authentication

Public discovery needs no account. Planning, preparation, gear, the Gear Studio, Plans, Memories, and profile require one. Authentication is a supporting interaction: requested when the user chooses a personalized action and returning them to where they were. Identity is handled externally (Keycloak); the product builds no password system.

---

## 17. Security and Privacy

- Every personal resource (gear, Plans, Memories, planner and loadout state) belongs to the signed-in user, identified only by the server from the user's credentials, never by anything the client claims. Another user's resource is indistinguishable from a missing one.
- PRIVATE Memories, Plans, and planning content never appear publicly. Public surfaces never show an author or user identity.
- Photos are stored without location or other metadata, privately, and shown through short-lived links.
- No geolocation without a user action; no location tracking, presence, or GPS.
- Per-user data kept in the browser is bound to that user and cleared on sign-out; tokens are never stored by the application.

---

## 18. Visual Direction

The product should feel modern, outdoor-oriented, calm, immersive where it matters, slightly playful, premium, and exploratory. Public Discover, the Authenticated Home, and the Gear Studio use different rendering (pre-rendered video plus a 2D web map; pre-rendered video; real-time 3D) but share brand, typography, a nature-derived colour philosophy, calm motion, and outdoor identity.

Pre-rendered media and real-time 3D share an **anime-inspired stylized outdoor adventure** direction: cel-shaded or stylized, painterly environments, simplified high-quality geometry, natural slightly saturated colour, atmospheric depth, subtle motion. It may draw inspiration from stylized Japanese adventure games but must not reproduce copyrighted characters, proprietary environments, recognizable game UI, or branded assets, nor be described as a clone. The Discover map follows the calm, paper-like colour philosophy rather than cel shading. Visual consistency matters more than identical rendering quality.

---

## 19. Visual Technology Roles

| Experience | Visual role |
|---|---|
| Public Discover | Pre-rendered cinematic Hero, then an interactive 2D web map with a synchronized list |
| Authenticated Home | Pre-rendered looping preparation-room background with the interactive React planner over it |
| Trail Detail, Trip Preparation, My Gear, Memories | Calm reading surfaces; Trip Preparation may use a pre-rendered still |
| Gear Studio | Interactive real-time 3D avatar and gear visualization (and, from FEATURE-012, the ready-to-go animation) |

### 19.1 Authenticated Home

The room background (shelves, backpack, boots, jackets, map, window; a generic character seen from behind is allowed) is atmosphere only. It does not reflect application state, is not a navigation system, and has no interactive objects. The planner is visually central, works before and without the media, and has a non-animated alternative under reduced motion. The generic room character is not the persistent avatar but follows the same art direction and proportions. Rationale: the room has no object-level interaction, so real-time 3D would add cost without improving planning.

### 19.2 Gear Studio

The product's real-time 3D experience, because equipping gear changes what is visible. Stylized, anime-inspired, cel-shaded, colourful but controlled, simplified rather than photorealistic; web-optimized assets.

### 19.3 3D scope

3D must not block the functional product. Real-time 3D is limited to the Gear Studio: one persistent avatar, a basic idle animation, fixed equipment visualization for the supported categories, and (FEATURE-012) the ready-to-go completion. No other real-time 3D experience is planned.

### 19.4 UI anti-patterns

Avoid purple-gradient AI SaaS styling, dashboard layouts, excess cards, heavy glassmorphism, excess shadows or borders, unnecessary charts, and admin density. The map, planner, and avatar stay visually dominant on their screens. On Discover, no floating surface other than the trail popup, except the Community panel, which replaces the popup while open and is never shown beside it; no dashboard widgets over the map; nothing suggesting people's locations.

---

## 20. Responsive, Accessibility, and Performance

- **Responsive.** Desktop web is primary; feature specs define viewports. At smaller widths discovery (through the list), planning, recommendations, trail information, packing, and gear selection stay usable. The avatar may be omitted, the Home media simplified, and the map reduced, but trails in the map area stay reachable through the list.
- **Accessibility.** Keyboard-accessible controls, readable contrast, labelled inputs, reduced-motion support, and functional fallbacks. The Discover list is the keyboard and assistive equivalent of the map for the current area, and the map can be panned and zoomed by keyboard; markers need not be tab stops. Gear selection works without the avatar.
- **Performance.** On `/` the Hero comes first; map code, style, and tiles load only when Discover is about to be seen. Discover makes one nearby request on activation and one after each settled pan or zoom, plus one activity request, with no polling and no per-marker requests. The public entry loads no planner, preparation, Studio, avatar, or 3D code. The planner works before its media; the Studio's gear selection works while 3D loads and without it.

---

## 21. Explicit Non-Goals

- A hiking simulation, outdoor game, or open world; Start Adventure, real-time outdoor scenes, or a Home-to-Adventure transition; walking gameplay, WASD, physics, combat, NPCs, multiplayer.
- Complex character creation; a unique 3D model per real gear product.
- Real-time presence, live hikers, GPS tracking, background location, WebSocket presence, heat maps or dots of people, automatic geolocation.
- A public AI planner input; a public full Trail Detail page or public "View trail".
- Discovery that depends on the Hero media.
- A real-time 3D Authenticated Home or any object-level interaction with its room.
- Accurate recreation of every trail; photorealistic environments; real-time global weather simulation.
- Social networking (followers, feeds, likes, comments) beyond Community Memories; GPX or video generation pipelines; AI recap.
- Features beyond FEATURE-014.

---

## 22. Roadmap and Freeze

| Feature | Name | Status |
|---|---|---|
| FEATURE-001 | Public Landing (Hero reused on `/`) | PASS / FROZEN |
| FEATURE-002 | Authentication | PASS / FROZEN |
| FEATURE-003 | Conversational Trip Planner | PASS / FROZEN |
| FEATURE-004 | Trail Selection & Preparation | PASS / FROZEN |
| FEATURE-005 | Pack Customization & 3D Avatar (Gear Studio) | PASS / FROZEN |
| FEATURE-006 | Public Discover & Trail Activity | PASS / FROZEN |
| FEATURE-007 | Gear Inventory | PASS / FROZEN |
| FEATURE-008 | Memory Foundation (backend) | PASS / FROZEN |
| FEATURE-009 | My Memories | PASS / FROZEN |
| FEATURE-010 | Community Memories | PASS / FROZEN |
| FEATURE-011 | Plan Foundation & Finish Preparation | PASS / FROZEN |
| FEATURE-012 | Ready-to-Go 3D Completion | PASS / FROZEN |
| FEATURE-013 | My Plans & Calendar | PASS / FROZEN |
| FEATURE-014 | Plan → Memory Bridge | PASS / FROZEN; final product feature |

The original roadmap ended at FEATURE-010; its final Full Regression and polish passed, and the freeze was reopened on 2026-10-19 by explicit user decision for FEATURE-011 to FEATURE-014 only. There is no FEATURE-015. **The feature freeze is active again since FEATURE-014 was accepted (2026-10-20).** The Final Full Regression passed on 2026-10-21 (classification B: no blocking, high, or medium finding; two low Community polish items in the backlog) and the release / product gate was accepted: functional development is complete. The next phase is demo preparation and deployment preparation, each started only on explicit instruction. Work is limited to bug fixes, UI, gear-illustration and 3D polish, performance, regression, accessibility and correctness fixes, deployment and configuration (e.g. production routing for Memories and Plans), documentation, and demo and presentation preparation. Any new capability needs an explicit product decision that updates this document.

Delivery is incremental vertical slices: specify → close backend gaps → implement → validate → continue.

---

## 23. Agent Change Rules

Agents must not reinterpret major requirements without explicit instruction. In particular, do not silently change:

- the journey of §4, including Finish preparation as the only way to create a Plan;
- `/` as Public Discover for signed-out visitors (Hero first, then map + list) and `/home` for signed-in users;
- no public planner; AI planning is authenticated;
- signed-out trail detail in one popup; Trail Detail is authenticated only; **Sign in to plan this trip** returns to the same trail's Trail Detail;
- Daily Trail Activity as an aggregate planning count with sample disclosure and no presence claims;
- the pre-rendered Home with the React planner; real-time 3D limited to the Gear Studio;
- user-controlled gear selection; Recommended ≠ Owned ≠ Equipped; Gear Inventory vs Gear Studio;
- persistent avatar identity, fixed visual gear categories and their mapping, equipment slots, real-time visual updates, web-optimized assets;
- Plans as private, one per owner, trail, and date, with no snapshot; completion shown only after a confirmed save;
- curated vs synthetic trail rules (§13); PRIVATE Memories never public; no author identity in public;
- the roadmap ending at FEATURE-014, then the freeze.

Without an explicit product decision that updates this document, agents must not: reintroduce a public planner or change the Hero-then-Discover order; create a public Trail Detail or "View trail"; request geolocation automatically or show presence-like activity; build gameplay, simulation, or outdoor scenes; make the Home a real-time 3D scene or add 3D assets or interaction to it; make planning depend on media or 3D; or weaken the Gear Studio requirements.

If an implementation limitation makes a requirement difficult, report the limitation instead of silently replacing the experience.

---

## 24. Success Criteria, Metrics, and Risks

**Success journey:** I open the site and see real trails → I read a trail and see how much planning surrounds it → I sign in and land on that trail, or describe a hike and get understandable recommendations → I choose a trail and date → I understand the conditions → I get useful packing advice and compare it with my gear → I equip gear and see it on my avatar → I finish preparation and my Plan is saved → I go → afterwards I keep and share a Memory.

**Evaluation (prototype, no telemetry needed):** discovery comprehension, activity read as planning not presence, planning completion, recommendation understanding, packing completion, end-to-end completion without blocking, and understanding that gear choices change the avatar.

**Risks and mitigations:** scope expansion (3D only in the Gear Studio; roadmap ends at FEATURE-014); activity misread as presence (planning wording, sample disclosure, nothing drawn as people); visual drift between surfaces (shared brand and art direction); third-party map tiles (the list is a complete equivalent); gear explosion (fixed visual categories); backend contract gaps (never fabricate; record gaps in `FRONTEND_CONTEXT.md`); the product becoming a game (§21).

---

## 25. Document Maintenance

Update this document when a product feature is added or removed, the journey, MVP scope, or roadmap changes, 3D or gear-interaction semantics change, or Daily Trail Activity, Plan, or Remember behavior changes. Keep it a statement of the current product: put history, acceptance criteria, and implementation detail in feature specs, and APIs, DTOs, and routes in `FRONTEND_CONTEXT.md`.
