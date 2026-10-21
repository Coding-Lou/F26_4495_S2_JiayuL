# Outdoor Trip Companion — Design System

**Version 2 — Desktop-First Cinematic Web**

Version 2 is initially defined for:

**FEATURE-001 — Public Landing + Cinematic CG Hero**

This file contains reusable visual and interaction rules.

Feature-specific layout and behavior belong in:

`docs/features/<feature>.md`

Later features may extend this design system when genuinely reusable patterns are introduced.

Extended on 2026-10-15 by **FEATURE-006 — Public Discover & Trail Activity** (the two-stage public homepage: Hero, then map and trail list): §3.2, §4.4, §9, §10, §13, §14, §18, and §35.

Extended on 2026-10-16 by **FEATURE-007 — Gear Inventory** (My Gear at `/gear`): §9, §14, §32, and §36.

Extended on 2026-10-17 by **FEATURE-009 — My Memories** (the owner's journal at `/memories`): §9, §14, §32, §36.1, and §37.

Extended on 2026-10-18 by **FEATURE-010 — Community Memories** (public trail Memories in Discover): §14, §35.1, §35.8, §37.1, §37.3, §37.4, §37.5, and §37.6.

---

# 1. Product Design Baseline

Outdoor Trip Companion is a responsive **web application**.

For cinematic public-facing experiences, design priority is:

1. Large Desktop — `1440px–1920px`
2. Laptop / Desktop — `1024px–1439px`
3. Tablet — `768px–1023px`
4. Mobile — `320px–767px`

Primary visual reference viewports:

- `1920 × 1080`
- `1440 × 900`

Secondary validation viewports:

- `1366 × 768`
- `1280 × 800`
- `768px` tablet
- approximately `390px` mobile
- minimum approximately `320px`

The Public Landing is **desktop-first**.

Mobile is a responsive adaptation, not the visual baseline.

---

# 2. Hero Media Baseline

The Public Landing uses pre-rendered cinematic media.

Master production format:

- resolution: `1920 × 1080`
- aspect ratio: `16:9`
- quality: `1080P`
- preferred scene duration: `6–8 seconds`
- acceptable range: `5–10 seconds`

Current conceptual scenes:

1. Sunny Alpine Lake — discovery
2. Rainy Pacific Northwest Forest — weather-aware planning
3. Cold Mountain Ridge — preparation

The media is the dominant environmental layer.

The interface must be designed around the cinematic frame rather than treating media as generic decoration.

---

# 3. Visual Principles

## 3.1 The Environment Leads

Scenery is the largest and most detailed thing on screen.

The interface should feel deliberately small and quiet compared with the environment.

The user should perceive:

1. outdoor world
2. product purpose
3. primary interaction

---

## 3.2 One Dominant Interaction

Each screen should have one visually dominant action.

For the FEATURE-001 Public Landing (historical at `/`), the conversational planner was the primary interactive element.

For the public homepage at `/` (FEATURE-006):

- Hero: the single action is **Explore trails**, deliberately quiet (§4.4) so the scene leads.
- Discover: the dominant interaction is choosing a trail, from the list or a marker.
- The map popup's **Sign in to plan this trip** is the page's only `conifer` action.

Nothing else should compete with a screen's dominant interaction in:

- brightness
- saturation
- size
- visual weight

---

## 3.3 Modern Web, Not Mobile UI

The desktop experience must not look like:

- a mobile app stretched across a browser
- a login form centered in empty space
- a generic chatbot interface
- a narrow SaaS marketing column

Use the desktop canvas intentionally.

---

## 3.4 Cinematic, Not Dashboard

Avoid:

- enterprise dashboards
- admin layouts
- dense card grids
- decorative charts
- heavy glassmorphism
- stacked shadows
- neon effects
- purple AI gradients
- fantasy RPG HUD styling

The intended visual language is:

**cinematic anime-inspired outdoor environment**
+
**minimal modern web interface**

---

## 3.5 Color Comes From Nature

Preferred visual families:

- evergreen
- moss
- stone
- snow
- warm paper
- steel blue
- sunlight
- restrained rust

Do not use purple or violet as core branding.

---

## 3.6 Calm Motion

Environmental media supplies most visual motion.

UI motion should remain:

- short
- restrained
- opacity-led
- color-led

Avoid decorative bouncing, scaling, or looping interface animation.

---

# 4. Desktop Hero Composition

## 4.1 Master Composition

Primary cinematic canvas:

`1920 × 1080`

Hero foreground maximum content width:

`1280px`

Typical desktop horizontal gutter:

`64–80px`

Laptop horizontal gutter:

`48–64px`

Tablet:

`32–48px`

Mobile:

`16–24px`

---

## 4.2 Foreground Content

For large desktop:

- heading max-width: approximately `760px`
- supporting copy max-width: approximately `620px`
- planner width: approximately `680–720px`

The heading, copy, and planner do not have to share the same width.

Do not constrain all Hero content to one narrow column.

---

## 4.3 Vertical Position

The primary Hero interaction should generally occupy the lower-middle region of the viewport.

Preferred visual balance:

```text
Environment
Environment
Environment

     Heading
     Supporting copy
     Planner
     Prompt suggestions

Environment
```

Avoid defaulting everything to exact vertical center.

A useful starting range for desktop content is approximately:

`55–68%` of viewport height.

This is guidance, not a fixed coordinate.

---

## 4.4 Hero Without a Planner

Used by the public homepage (FEATURE-006). 001's grid with the planner rows removed:

- Scene window above the centred text block (heading, supporting copy, notice reserve), spacer below; spare height split **3 : 1** from 768px. Below 768px all spare height goes to the scene window.
- One action, a **quiet pill CTA** over media: 48 tall (44 below 768), 24px horizontal padding (20 below 768), `snow` 16/24 weight 600, fill `ink` at 0.72, 1px `snow` border. Hover: fill `ink` at 0.88 with a 2px `snow` edge (border plus a 1px inset ring, so nothing shifts). Pressed: solid `ink`. Never `conifer`.
- Placement: bottom centre, on one row with the scene control (bottom right, bottom edges aligned). Below 1024px they stack: CTA centred, 16px, scene control aligned right.

Geometry and positions: `docs/features/006-public-discover-trail-activity.md` §16.5.

---

# 5. Media Safe Zones

CG production and UI layout must be designed together.

The interface remains spatially stable across scenes.

The scene changes around the UI.

---

## 5.1 Navigation Safe Zone

Approximate master-frame region:

`Y: 0–120px`

Avoid placing essential faces, narrative details, or major focal objects here.

---

## 5.2 Primary UI Safe Zone

For a `1920 × 1080` master frame, reserve approximately:

```text
X: 430–1490
Y: 390–920
```

for Hero text and planning interaction.

These coordinates are art-direction guidance, not CSS coordinates.

Important subjects should not rely on this area.

---

## 5.3 CG Subject Placement

When a scene contains a strong character or focal object, prefer:

- left third
- right third

rather than dead center underneath the Hero UI.

Scenes may alternate subject placement.

The UI must not jump between scenes.

---

## 5.4 General Media Safe Area

Keep mission-critical media content approximately within:

```text
X: 250–1670
Y: 100–950
```

Avoid important content at extreme edges because responsive cropping may remove it.

---

# 6. Responsive Media Behaviour

Hero media uses:

```css
object-fit: cover;
```

Do not stretch or distort media.

Each scene may define its own `object-position`.

---

## 6.1 16:9 Desktop

Ideal composition.

Minimal crop.

This is the master visual target.

---

## 6.2 16:10 / Taller Laptop

Some horizontal or vertical crop is expected.

Preserve:

1. Hero UI
2. main subject
3. environmental atmosphere

---

## 6.3 Ultrawide

Do not stretch the foreground UI continuously.

Above approximately `1920px`:

- environment may continue filling viewport
- foreground remains constrained around `1280px`

The experience should feel like:

**larger world**
+
**stable interface**

---

## 6.4 Tablet

Use deliberate `cover` cropping.

Reduce spacing and typography.

Do not attempt to preserve the full desktop cinematic frame.

---

## 6.5 Portrait Mobile

A `16:9` landscape video cannot preserve its full composition.

Substantial crop is expected.

Priority:

1. planner usability
2. text readability
3. environmental atmosphere
4. main subject when practical

Mobile-specific media may be introduced later, but is not required for FEATURE-001.

---

# 7. Typography

## 7.1 Font Families

Version 2 uses the system font stack.

```css
--font-sans:
  ui-sans-serif,
  system-ui,
  -apple-system,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  "Noto Sans",
  sans-serif;

--font-display: var(--font-sans);
```

A future display font requires explicit design approval.

If introduced, it should:

- be self-hosted
- use WOFF2
- use `font-display: swap`
- preserve layout with fallback fonts

---

## 7.2 Display Heading

### Large Desktop ≥1440px

```text
64px / 68px
weight: 600
letter-spacing: -0.025em
```

Preferred maximum:

`1–2 lines`

---

### Desktop / Laptop 1024–1439px

```text
54px / 60px
weight: 600
```

---

### Tablet 768–1023px

```text
42px / 48px
weight: 600
```

---

### Mobile <768px

```text
32px / 38px
weight: 600
```

Very narrow mobile may reduce to:

```text
30px / 36px
```

---

## 7.3 Supporting Copy

Desktop:

```text
18px / 28px
```

Mobile:

```text
16px / 24px
```

---

## 7.4 Planner Text

Desktop:

```text
18px / 28px
```

Mobile:

```text
16px / 24px
```

Never below `16px`.

---

## 7.5 UI Text

```text
14px / 20px
```

Used for:

- prompt chips
- navigation
- captions
- media controls

Do not use text smaller than `14px`.

---

# 8. Color Tokens

| Token | Value | Role |
|---|---|---|
| `ink` | `#0B1C20` | Night-spruce near-black. Media fallback, scrim, dark controls, text on light surfaces. |
| `snow` | `#FFFFFF` | Text/icons over media. |
| `paper` | `#F7F5EF` | Warm off-white planner surface. |
| `stone` | `#55615D` | Muted text on light surfaces. |
| `conifer` | `#1F5A46` | Primary action. |
| `conifer-deep` | `#18493A` | Primary hover. |
| `conifer-press` | `#123A2E` | Primary pressed state. |
| `sun` | `#FFD27A` | Focus highlight. |
| `ember` | `#C8452D` | Invalid/error outline. |

Tailwind theme:

```css
@theme {
  --color-ink: #0b1c20;
  --color-snow: #ffffff;
  --color-paper: #f7f5ef;
  --color-stone: #55615d;
  --color-conifer: #1f5a46;
  --color-conifer-deep: #18493a;
  --color-conifer-press: #123a2e;
  --color-sun: #ffd27a;
  --color-ember: #c8452d;
}
```

---

# 9. Contrast Rules

Approved important contrast pairs:

| Foreground | Background | Approx. ratio |
|---|---|---:|
| `snow` | `ink` | 17.48 |
| `ink` | `paper` | 16.04 |
| `stone` | `paper` | 5.92 |
| `snow` | `conifer` | 8.05 |
| `sun` | `ink` | 12.28 |
| `snow` | `ink` at 0.72 over a white frame | 6.97 |
| `ink` | `map-land` (§35.2) | 14.3 |
| `conifer-press` | `gear-plate` (§36.4) | 10.3 (graphics only) |
| `snow` | `ember` | 4.8 (14px weight-600 label on a destructive confirm button only, §36.9) |
| `stone` | `paper-shade` (§37.1) | 5.27 (text allowed, 14px and up) |
| `ink` | `paper-shade` (§37.1) | 14.3 |

Do not use:

- product text directly on map tiles; text over a map sits on `paper`, `ink`, or `map-land`
- `stone` directly over media
- `ember` as normal text over media
- `sun` as text on `paper`
- low-opacity white text over changing video
- `ember` as text on `paper` or `snow` (about 4.4:1): icons and borders only

---

# 10. Planner

Sections 10–12 were written for the FEATURE-001 public planner. Since FEATURE-006 the public homepage has no planner (§4.4); the authenticated planner is specified in `docs/features/003-conversational-planner.md`.

The planner is the visual center of the Public Landing interface.

It should feel like a conversational surface, not a conventional form input.

Large desktop target:

```text
width: 680–720px
min-height: 68px
radius: 20–24px
```

Laptop:

```text
width: 620–680px
```

Tablet:

```text
width: min(640px, available width)
```

Mobile:

```text
width: 100%
```

Surface:

`paper`

Text:

`ink`

Placeholder:

`stone`

Do not use an infinite pill radius for the planner.

---

# 11. Primary Planner Action

The planning action should be visually integrated into the planner.

Preferred geometry:

- circular icon action, or
- compact highly rounded action

Primary state:

`conifer`

Hover:

`conifer-deep`

Pressed:

`conifer-press`

The action should not visually overpower the planner itself.

---

# 12. Suggested Prompt Chips

Suggestion prompts may use pill geometry.

Desktop target height:

`36px`

Touch layouts:

minimum `44px` touch target.

Prompt chips are secondary interaction.

They must not compete visually with the planner.

---

# 13. Navigation

The Public Landing navigation should remain lightweight.

Typical desktop composition:

```text
Brand                                      Sign In
```

or, if approved by the feature:

```text
Brand                         Discover     Sign In
```

where Discover is an in-page link (§35.6).

Maximum navigation content width:

`1280px`

Typical vertical padding:

`24–32px`

Navigation should visually float over the environment.

Avoid a conventional heavy opaque website navbar unless readability requires a local surface.

## 13.1 Fixed Public Header

Amends §13 for a header that spans both media and light surfaces (FEATURE-006), where floating text would need a scrim over video and translucency turns grey over `paper`.

- Solid `ink` at full opacity, `position: fixed`, full viewport width (not capped at 1280px). No border, shadow, blur, or translucency.
- Identical at every scroll position: never changes height, color, items, or content while scrolling. No current-section indicator.
- Height H: 72 (≥1440), 64 (768–1439), 56 (<768). Side padding is the page gutter: 64 (≥1680), 56 (1440–1679), 40 (1280–1439), 32 (768–1279), 16 (<768; 12 below 360). These match the authenticated trip header, so signing in changes only the right-hand items.
- Brand: `snow` 16/24 weight 700, `nowrap`. In-page links: `snow` 14/20 weight 600. Both have a 44px-tall hit box, hover underline 2px at 4px offset; a link's pressed state is a `snow` 0.12 fill. Sign in is the on-ink quiet control (§14), 24px after the last link (16 below 768).
- The page root sets `scroll-padding-top: H` so focused elements and hash targets clear the header.
- Over hero media it covers only the navigation safe zone (§5.1).

Detail: `docs/features/006-public-discover-trail-activity.md` §16.4.

---

# 14. Control Geometry

Version 2 does **not** use one universal radius.

Use geometry by role.

### Planner

`20–24px`

### Suggestion Chip

pill

### Sign In

pill or compact rounded control

### Media Control

pill

### Icon Action

circle

### On-Ink Quiet Control

pill, 44 tall, 20px horizontal padding, no fill, 1px `snow` border, `snow` 14/20 weight 600. Hover: `snow` at 0.12 fill. Pressed: `snow` at 0.20. For secondary actions on `ink` surfaces, such as the header's Sign in.

### Anchored Popup, Map Control Group

`12px` (§35)

### Collection Surfaces (§36)

Collection sheet 24; item card 18 with a 10 plate; detail panel and modal dialog 20; choice tiles 12; filter pills pill.

### Journal Surfaces (§37)

Journal sheet 24 (20 below 768); entry-card photo frame 12; photo mat 16; thumbnail 8; photo row 12; primary action 12.

### Community Surfaces (§35.8)

Docked Community rail 0 (its sheet below 1024: 20 20 0 0); preview row 10; journal index entry 12; quiet text buttons (View all, Back) 8.

### Future content surfaces

Defined by their feature when introduced.

Do not make every control a pill.

---

# 15. Readability Over Media

Foreground text must not depend on whatever frame happens to be visible.

Text directly over media uses:

`snow`

Do not use muted/tinted text directly over changing media.

Hierarchy over media comes from:

- size
- weight
- spacing
- location

---

# 16. Scrim

A scrim is an `ink` layer used locally behind foreground content.

Recommended solid opacity:

`0.72`

Absolute minimum:

`0.60`

The scrim should contain:

1. a solid region behind text
2. a feathered region fading into the scene

Do not apply a broad full-frame dark overlay by default.

The environment must remain visible.

---

# 17. Rules for UI Over Cinematic Media

1. Text never relies on raw video contrast.
2. Text directly over media uses `snow`.
3. Media is decorative and inert.
4. Media receives no pointer events.
5. Media is hidden from assistive technology.
6. No audio is required for the experience.
7. UI must render and function before video finishes loading.
8. Media failure must not block planning.
9. The UI stays spatially stable across scenes.
10. CG composition adapts to the UI, not the reverse.

Avoid:

- backdrop blur as a readability dependency
- text shadows as a contrast dependency
- heavy glass surfaces
- unnecessary full-screen overlays

---

# 18. Focus

All keyboard-focusable controls use a consistent visible focus treatment.

```css
--focus-ring:
  0 0 0 2px var(--color-ink),
  0 0 0 4px var(--color-sun),
  0 0 0 6px var(--color-ink);
```

Apply on:

`:focus-visible`

Also provide:

```css
outline: 2px solid transparent;
outline-offset: 2px;
```

for forced-colors compatibility.

No ancestor should clip focus rings.

### Inset Variant

For edge-to-edge regions where an outward ring would be clipped, such as a map canvas, draw the same three bands inset:

```css
box-shadow:
  inset 0 0 0 2px var(--color-ink),
  inset 0 0 0 4px var(--color-sun),
  inset 0 0 0 6px var(--color-ink);
```

---

# 19. Desktop Pointer Behaviour

Desktop web interactions must define hover behavior.

### Planner

Hover:

- slight surface brightness increase

Focus:

- visible focus ring

### Prompt Chip

Hover:

- controlled contrast increase

Pressed:

- darker/more solid state

### Sign In

Hover:

- border or surface emphasis

### Primary Action

Hover:

`conifer → conifer-deep`

Pressed:

`conifer-deep → conifer-press`

Hover must never be required to discover functionality.

---

# 20. Motion Tokens

```css
--duration-fast: 150ms;
--duration-base: 240ms;
--duration-scene-fade: 1200ms;

--ease-ui: cubic-bezier(0.2, 0, 0, 1);
--ease-scene: cubic-bezier(0.45, 0, 0.55, 1);
```

UI movement should use:

- opacity
- color
- at most approximately `4px` translation

Avoid:

- bounce
- decorative scale
- repeated UI animation
- unnecessary parallax

---

# 21. Scene Transitions

Default scene crossfade:

`1200ms`

Preferred scene display:

`6000–8000ms`

Acceptable:

`5000–10000ms`

The UI must not move during scene changes.

---

# 22. Reduced Motion

When:

```css
prefers-reduced-motion: reduce
```

disable:

- automatic scene cycling
- crossfades
- ambient UI translation
- automatic video playback where practical

Show a stable poster/static frame.

Planning functionality must remain fully available.

---

# 23. Playback Control

If cinematic media continuously moves for more than five seconds, provide an accessible:

**Pause / Play**

control.

It must:

- remain visually secondary
- be keyboard accessible
- expose current state
- not use native browser video controls

---

# 24. Media Layer Architecture

Media is conceptually configured as scenes.

Example:

```ts
type HeroScene = {
  id: string
  video?: string
  poster?: string
  objectPosition?: string
}
```

Replacing a scene asset should require changing configuration rather than rewriting Hero layout.

The design system does not prescribe the exact React implementation.

---

# 25. Page Height

Desktop cinematic Hero:

```text
min-height: 100vh
```

Short viewports must remain usable.

For screens such as:

`1366 × 768`

reduce:

- decorative vertical spacing
- environmental reserve

before reducing core interaction usability.

Priority remains:

1. navigation
2. heading
3. planner
4. primary action
5. prompts
6. supporting copy

---

# 26. Mobile Interaction

Mobile must preserve:

- navigation identity
- heading
- planner
- planning action
- suggestion prompts
- Sign In
- environmental atmosphere

Minimum touch target:

`44 × 44px`

Prompt chips may wrap.

Do not require horizontal scrolling.

---

# 27. Accessibility

All features must support:

- semantic HTML controls
- accessible input labels
- keyboard navigation
- logical focus order
- visible focus state
- sufficient contrast
- reduced-motion behavior
- no meaning conveyed only through color

Decorative Hero video:

- `aria-hidden`
- not focusable
- no audio dependency
- no native controls

Core user flows must never depend exclusively on:

- CG
- animation
- realtime 3D

---

# 28. Performance

UI must become usable independently of Hero media.

Expected loading order:

```text
HTML / React UI
↓
Planner becomes interactive
↓
Poster or fallback visible
↓
Video loads and begins when available
```

Never block application rendering on large video assets.

---

# 29. Relationship to Existing shadcn Tokens

The existing frontend currently includes standard neutral shadcn semantic tokens.

Version 2 does not require globally replacing those tokens yet.

For FEATURE-001:

- landing wrapper explicitly uses `ink`
- Hero controls explicitly use this design system
- unrelated existing placeholder pages retain their current neutral styling

Do not globally restyle the entire application while implementing the Public Landing.

A future authenticated-app design feature will define the long-term semantic token mapping.

---

# 30. Existing shadcn Components

shadcn/ui may be used as an implementation primitive.

It is not the visual design source of truth.

Do not force the product to resemble default shadcn examples.

Custom composition and styling are acceptable when required by this system.

---

# 31. Current FEATURE-001 Media Direction

The Public Landing supports three conceptual scene slots:

### Scene A

Sunny Alpine Lake

Meaning:

**Discovery**

### Scene B

Rainy Pacific Northwest Forest

Meaning:

**Weather-aware planning**

### Scene C

Cold Mountain Ridge

Meaning:

**Preparation**

Final source files are implementation/configuration details rather than permanent design tokens.

A missing scene may use an intentional static fallback without changing Hero layout.

---

# 32. What Version 2 Does Not Define

Do not infer designs for:

- authenticated Home
- Trail Detail
- Trail cards
- recommendation results
- Gear Studio and Packing (feature specs; collection pages such as My Gear: §36)
- avatar UI
- realtime 3D controls
- Explore
- Memory: owner pages in §37; public community presentation is defined by FEATURE-010
- menus (modal dialogs and bottom sheets: §36.7)
- date pickers
- long-form content (user-written text on journal pages: §37.6)
- application-wide dark mode
- final logo
- final display font

Those will extend this design system as their features are designed.

---

# 33. Authenticated Experience

Known future direction only (see `PRODUCT_REQUIREMENTS.md` sections 7.8 and 40):

- Authenticated Home / Plan: a pre-rendered looping preparation-room CG/video background with the AI planning UI overlaid. It is not realtime 3D.
- Pack: persistent user avatar and gear visualization in realtime stylized 3D.
- same broad visual universe as Public Landing

Whether the pre-rendered Hero layout rules carry over to the Authenticated Home background is decided when that feature is designed.

Do not automatically apply pre-rendered Hero layout rules to realtime 3D screens.

Those rules must be reviewed when that feature begins.

---

# 34. FEATURE-001 Visual Target

The Public Landing should feel like:

```text
Cinematic 16:9 outdoor world
          +
Minimal desktop Web interface
          +
Wide conversational planner
```

Primary design canvas:

`1920 × 1080`

Primary experience:

**Desktop Web**

Responsive adaptations:

- laptop
- tablet
- mobile

The intended first impression is:

> “I want to enter this world.”

The intended immediate product understanding is:

> “I can tell this product what kind of outdoor adventure I want.”

---

# 35. Maps, Discovery, and Trail Activity

Introduced by FEATURE-006. Feature geometry (tiers, rail widths, positions), the popup placement algorithm, and the copy deck stay in `docs/features/006-public-discover-trail-activity.md`, cited by section.

## 35.1 Map–Rail Layout

- An interactive map is paired with a **docked `paper` rail**, not with floating panels. The rail has a 1px `ink` 0.12 rule on its map edge and no radius or shadow (006 §16.7).
- Inside the rail only the list scrolls, and it hands its overscroll to the page (`overscroll-behavior: auto`, never `contain`).
- Over the map, only: its controls (zoom group top right, attribution bottom right), marker labels, the gesture hint (§35.5), the map's own loading and failure states, and at most one anchored popup (§35.4). No widgets, cards, charts, or legends.
- **The trail popup is normally the only floating trail-information surface over the map.** One exception (FEATURE-010, approved 2026-10-17): **View all memories** in the selected trail's popup hides the popup and opens a docked **Community rail** (§35.8); closing the rail shows the popup again. The popup and the rail are never shown together and never compete as two information surfaces. The exception covers only this rail, opened only from the selected trail's popup; it does not allow any other panel, widget, or surface over the map.
- The list is the complete textual, keyboard, and assistive-technology equivalent of the map. Every map stays optional.

## 35.2 Map Palette ("paper trail map")

Style values for the vector map (`map-land` is also the fill for the map's loading and failure states). They are not Tailwind theme tokens.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `map-land` | `#ECE8DD` | | `map-road` | `#FBFAF6` |
| `map-wood` | `#D3DDCB` | | `map-road-casing` | `#D2CCBF` |
| `map-park` | `#DDE3D2` | | `map-boundary` | `#A9A396` |
| `map-grass` | `#E3E6D6` | | `map-building` | `#E2DDD1` |
| `map-ice` | `#F6F7F4` | | `map-label` | `stone` |
| `map-water` | `#B9CBD3` | | `map-label-water` | `#4A6670` |
| `map-waterway` | `#9FB6C0` | | `map-label-halo` | `paper` |

Tiles are decorative: no POIs, icons, shields, transit, hillshade, pitch, or rotation (006 §16.8.1).

## 35.3 Trail Markers

- **Activity level by fill amount**, which survives grayscale: *base* (`paper` disc, 2px `ink` ring, 20px), *some* (base plus an 8px `ink` centre dot), *many* (solid `ink` disc with a 2px `paper` halo, 24px). Thresholds are absolute: some 1–9, many 10 or more. Base also covers zero, unknown, and loading, so the map never asserts a state that only text can state.
- Pointer hit area 32px (44px on a coarse pointer). `forced-color-adjust: none`.
- **Hover** (or the linked list row hovered or focused): the ring thickens by 1px and a name label appears: `paper`, 1px `ink` 0.16 border, radius 8, padding 4 × 8, `ink` 14/20 weight 600, max-width 240, 8px beside the marker, moving to its left near the map's right edge. At most one label; the name only.
- **Selected**: a 28px disc that keeps its level, a 3px `paper` gap, and a 2px `ink` outer ring (38px overall), raised above other markers. No label while its popup names the trail.
- Markers are **never tab stops** (`aria-hidden`, no `tabindex`). The list is the keyboard path; the map canvas is one tab stop for panning and zooming.
- The list shows the same level as a 12px glyph at the start of each activity line, which serves as the legend.
- **Clusters** (viewport-driven Discover, 2026-10-17): at wider views nearby markers merge into a `stone` disc with a 2px `paper` stroke and a soft `stone` 0.2 halo, sized in steps at 10 and 50 trails, with the count in `paper` (Noto Sans Bold, from the map's glyph source). The count is the number of trails, so clusters never use the `ink`/`paper` activity treatments, and no activity or people figure is ever drawn. Selecting a cluster zooms in until it splits. The selected and hovered trail are drawn on top as individual markers, so a selection never disappears into a cluster. Markers and clusters are drawn by the map itself (no element per trail); the one hover label is the only marker element in the DOM.
- Never on a map: counts, people icons, heat, density shading, pulsing, or moving dots.

## 35.4 Anchored Map Popup

- **Surface:** `paper`, 1px `ink` 0.24 border, radius 12, one shadow `0 4px 16px rgb(11 28 32 / 0.16)`, padding 20. No blur or translucency. A tip (a 12px square rotated 45°, bordered on its outer edges) protrudes 6px toward the anchor and is shown only while anchored.
- **Width:** 360 (≥1680), 340 (1440–1679), 320 (1280–1439), 300 (768–1279). No fixed height; it scrolls internally only when it reaches the map's safe-area height.
- **Placement:** computed and collision-aware. It goes right of the anchor, else left, clamped vertically inside the map's safe area and clear of the map controls. The camera pans, never zooms, only when neither side fits, and the popup follows its anchor while the map moves. Never a fixed position. Algorithm: 006 §16.10.
- **DOM and semantics:** rendered directly after its trigger (a disclosure button with `aria-expanded` and `aria-controls`), positioned over the map, `role="group"` labelled by its heading. Not a dialog: focus is not moved on open and nothing is trapped. Close (a 36px circle, 44 on a coarse pointer) comes last in the DOM. Close and Escape return focus to the trigger. No ancestor between the popup and its positioning container may form a containing block or clip it (006 §16.11.2).
- **Motion:** opacity and a 4px slide from the anchor's side, `--duration-base`, `--ease-ui`. Closing and reduced motion are instant.
- **Below 768px:** not anchored. It sits in the flow under its trigger, full width, with no tip and no shadow.

## 35.5 Map on a Scrolling Page

- Cooperative gestures at every width. A plain wheel and one finger scroll the page; Ctrl or ⌘ + wheel, pinch, and two fingers move the map. A map never traps page scrolling.
- **Hint:** a box drawn by the product, centred in the map. Opaque `ink`, radius 12, padding 8 × 16, `snow` 14/20 weight 500, centred, max-width 320. The library's dimming overlay is not shown.
- Timing: fades in over `--duration-fast`, holds 1200ms after the input stops, then fades out over `--duration-base`. Under reduced motion it has no fade and the same hold. The wheel hint shows only while the map's section is aligned under the header; the touch hint always shows.
- The hint is `aria-hidden`. Keyboard instructions go in the canvas's accessible name, and the canvas uses the inset focus ring (§18).

## 35.6 In-Page Section Navigation

- Links use `href="#section"`. On activation the page scrolls until the section's top meets the header (smooth; instant under reduced motion), then focus moves to the section heading (`tabindex="-1"`, no ring) with `preventScroll: true`. No route, history, or hash change.
- No scroll-snap, scroll hijacking, root `scroll-behavior: smooth`, or scroll-linked effects.
- Programmatic focus always uses `preventScroll: true`. Inner scrollers are scrolled with their own `scrollTo`, never `scrollIntoView`, which also scrolls the document.

## 35.7 Activity Text and Sample-Data Disclosure

- Daily Trail Activity is an aggregate daily planning count, worded as trips planned (PRD §32; strings in 006 §16.17). Never use: "now", "right now", "live", "currently", "on the trail", "people here", "hikers nearby", "exploring", "busy", "crowded", "real-time", "active users".
- Treatment: the 12px level glyph, 8px, then the figure in `ink` 14/20 weight 500. Wrapped lines align with the text, not the glyph.
- **Unavailable is never zero.** A list shows no line; a detail view says so in `stone`. Loading shows no number: a static `ink` 0.08 bar (radius 6) in lists, `stone` text in a detail.
- **Sample-data disclosure:** while data is sample or simulated, every surface that shows it carries a visible `stone` 14/20 disclosure. Show it once per list, as a caption under the list heading, and inline after the figure in a detail view (" · Sample activity"). Sample trail records get one `stone` line in the same way. Never only in a tooltip, by color, or by icon.
- Activity is not announced when it loads.

## 35.8 Supporting Content Beside the Map (Community Memories)

Introduced by FEATURE-010. Geometry by tier, the copy deck (CM…), and focus maps stay in `docs/features/010-community-memories.md` §18, cited by section. Public Memories are **supporting evidence for a trail**: these patterns keep them subordinate to the trail and never shaped like a feed.

- **Popup preview block.** A `section` after the trail's own content and before the popup's actions, set off by a 1px `ink` 0.12 top rule (16 above and below; 12 when short). Heading one level under the popup's trail heading, `ink` 14/20 weight 600; the count follows it as words ("2 memories"), `stone` weight 400, never a bare numeral, never bold, right-aligned, or in a disc, bubble, or badge, and never in the activity or cluster treatments (§35.3, §35.7). At most two rows, then a quiet **View all** text button (`ink` 14/20 weight 600 with a 16px chevron; never `conifer`, so the popup's sign-in action stays its only filled action).
- **Compact preview row.** One native button per row: a 4:3 thumbnail (56 × 42; 40 × 30 in the compact density for short viewports), the title on one line with an ellipsis, the date in `stone`. No story text in the popup. Hover `ink` 0.04 and a title underline; pressed `ink` 0.08; the §18 ring. Compact density is the only lever for fitting the popup; trail content is never removed for it (010 §18.1–18.2).
- **States in the block.** Loading: static skeleton rows whose total height equals the loaded state, so the popup never jumps. Empty: one `stone` line ("No public memories yet."), no call to action. Failure: an `ember` alert icon, an `ink` line, and Retry; it never closes or blocks the popup and never shows zero. A trail that cannot have Memories (generated sample trails) shows no block at all, not an empty state.
- **Docked Community rail (≥1024).** A non-modal complementary region docked to the map's far edge, full section height, `paper`, a 1px `ink` 0.12 rule on its map-facing edge, no radius, shadow, or blur (the §35.1 rail treatment). A fixed header (heading, the trail name and count, Close as a 36px circle, last in the DOM) and one scrolling body that hands overscroll to the page. Map controls and attribution move clear of it so the licence text stays visible; it never moves the camera. Opens with opacity and a 4px slide (`--duration-base`, `--ease-ui`); closing and list ↔ detail switches are instant; instant under reduced motion.
- **Below 1024:** the same content in the §36.7 detail-viewer bottom sheet (modal, backdrop tap closes).
- **Focus.** Opening focuses the rail heading (`preventScroll`); opening an entry focuses its title; Back returns focus to the entry; Close returns it to the opener (View all or the preview row) once the popup is shown again, otherwise to the popup heading. Escape steps back one level (detail → list → closed) and never also closes the popup. One polite status region announces the first result and failures once; nothing in the popup is announced.
- **Read-only list and public detail.** The rail uses the §37 journal visuals read-only: journal index entries (§37.3), the reading mat and strip (§37.5), and long-form text (§37.6) at their narrow-column values. Empty and failure use the block's wording; a Memory that is no longer public shows one neutral line ("This memory is no longer available.") with Back and no reason.
- **Public versus owner.** A public view shows no author identity (no avatar, name, initials, or "by"), no visibility label (§37.9), no owner action (edit, delete, upload, reorder; §37.10), no sign-in action inside the rail, no engagement row (likes, comments, shares, views), no relative times, and no ranking, sort, or filter. Counts appear only as "N memories" and "N photos", in `stone`.

---

# 36. Collections, Item Detail, and Dialogs

Introduced by FEATURE-007 (My Gear). Feature geometry, copy, and focus maps stay in `docs/features/007-gear-inventory.md` §21, cited by section.

## 36.1 Scope

These patterns are for **authenticated collection pages**: a page whose job is to show and manage a set of the user's own things (My Gear). Memory pages do not use them: they use the journal pattern of §37. The adventure-inventory feel (slots, category art, select to inspect) belongs to such pages only and is **not** a global style for unrelated screens.

Always excluded: rarity or per-category colour coding, levels, stats, XP, completion figures, badges, glow, neon, HUD chrome, celebratory messages.

## 36.2 Collection Sheet

- One `paper` sheet on the trip shell's solid `ink` base: radius 24 (20 below 768), no shadow, texture, or gradient, a 1px transparent border (an edge in forced colors), no `overflow: hidden`.
- Width `min(100vw − 2 × gutter, 1600)`, centred; the shell's gutters. The 1600 cap is what limits card width on wide screens: extra width becomes space, never larger cards.
- The document scrolls; the header scrolls away.
- Order inside: title block → notice slot → optional filter → collection (grid, plus the detail panel while an item is selected).

## 36.3 Collection Grid and Summary

- A `ul` with `grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min)), 1fr))`; `--card-min` 200 on desktop (168 on tablet); two fixed columns below 768. Cards stay roughly 200–270 wide at every desktop width.
- Track math must include a classic 15px scrollbar: a layout that only fits with overlay scrollbars is wrong (007 §21.3 amendment).
- The grid is the only view: no table, list toggle, search, or sort.
- **Summary:** one quiet `ink` 14/20 weight-500 line of counts with correct singular forms ("12 items across 6 categories"). Never a fraction, percentage, bar, ring, or target.
- **Loading:** static skeleton cards in the grid's geometry (no shimmer); never the empty state.
- **Empty and unavailable** are different states with different text; unavailable is never shown as empty or zero.

## 36.4 Item Card (Slot) and Category Artwork

- One `li` holding exactly one `button`; its accessible name is "{name}, {category}". No other control inside: actions live in the detail panel.
- Anatomy: `snow` card, radius 18, 1px `ink` 0.10 border drawn inset (state changes never shift layout), padding 8; a **plate** (5:4, radius 10); the name `ink` 16/22 weight 600, at most two lines; the category `stone` 14/20 weight 500.
- **Plate:** one fill for every category, `gear-plate` `#ECE8DD` (same value as `map-land`), with one soft radial highlight from `paper`. Never a per-category or per-family tint.
- **Category artwork:** one piece per category, never per item. It sits in a square art box 72% of the plate's height. Interim art is a line pictogram at 60% of that box, `conifer-press` strokes, no fill; final art is a transparent 1:1 image filling the same box, so art can be replaced with no layout change. Artwork is decorative (`aria-hidden` / `alt=""`); the name and category are always text.
- States: hover border `ink` 0.32; pressed fill `ink` 0.04; focus the §18 ring; arrival of a new card is opacity plus a 0.98 → 1 scale once (`--duration-base`, none under reduced motion); removal is instant.

## 36.5 Selection and Detail Panel

- **Selected:** a 2px inset `ink` ring and a `paper` fill ("pressed in"), with `aria-expanded="true"` and `aria-controls` pointing to the panel. Shape and value carry it, never hue; no glow, lift, or scale.
- **From 1024px:** a **non-modal side panel** in layout flow beside the grid (it hides no cards). `snow`, 1px `ink` 0.12 border, radius 20, padding 24, no shadow; sticky 24 from the top with internal scroll when taller than the viewport. Opening or switching moves focus to the panel heading (`preventScroll`); Close (last in the DOM) or Escape returns focus to the originating card; nothing is trapped.
- **Below 1024px:** the same content in a modal bottom sheet (§36.7).
- Panel content is facts that are true: the name, larger artwork, category, and quiet `stone` context lines. Never stats or invented attributes.

## 36.6 Choice Tiles and Filter Pills

- **Visual choice tiles** (for example a category picker): a `fieldset` with a visible `legend` and native radios, one tab stop with arrow-key choice. Each tile shows small artwork and a visible text label; never icon-only. Selected = 2px inset `ink` ring, label weight 600, and a check mark in reserved space. Radius 12, min-height 52 (56 on a coarse pointer).
- **Filter pills:** a single-choice filter over one collection is a native radio group (not ARIA tabs). Pills 36 tall (44 coarse), radius 9999, 14/20 weight 600; unchosen 1px `ink` 0.16 outline, chosen solid `ink` with `snow` text. Show only non-empty options and no counts; hide the filter when there is nothing to choose between.

## 36.7 Modal Dialog and Bottom Sheet

- Native `<dialog>` with `showModal()` (native focus trap and Escape). `paper`, radius 20, no border, one shadow `0 8px 32px rgb(11 28 32 / 0.24)`, backdrop `ink` 0.40, no blur. Width 560 from 768px, padding 32.
- Below 768px (and for a detail viewer below 1024px): a bottom sheet, full width or `min(560, 100vw − 32)`, radius 20 20 0 0, internal scroll, bottom safe-area padding.
- Motion: opacity and a 4px rise in (`--duration-base`), instant out; instant under reduced motion.
- A form dialog ignores backdrop clicks and ignores Escape while saving; a viewer sheet closes on a backdrop tap. Focus returns to the opener on close.

## 36.8 Current-Page Navigation

On a page reached from a header link, that link carries `aria-current="page"` and keeps a persistent 2px `snow` underline (4px offset) on `ink` headers; in a `paper` menu, a 3px inline-start `ink` bar and weight 600. Shape, not hue.

## 36.9 Destructive Actions

- Two steps, no large danger modal and no typed confirmation. Step one is a quiet text button (`ink` 14/20 weight 600, a 16px `ember` icon). Step two is an inline confirmation in the same place: a question naming the item, one `stone` reassurance line, **Cancel** (initial focus) and the confirm button filled `ember` with `snow` 14/20 weight 600.
- A failure keeps the confirmation open with an error line; the item stays visible.

---

# 37. Journal Pages (Memories)

Introduced by FEATURE-009 (My Memories). Feature geometry, the copy deck (MM…), and focus maps stay in `docs/features/009-my-memories.md` §22, cited by section.

## 37.1 Scope

These patterns are for **journal pages**: pages that show the user's own written and photographed entries (My Memories, Memory Detail, the Memory editor). The look is an open field journal on warm paper. It is **not** a global style: it does not replace §36 for owned-item collections, and it does not apply to planning, preparation, or Discover screens. The one exception (FEATURE-010) is the read-only use of these visuals inside the Discover Community rail (§35.8), without any owner element.

`paper-shade` names the value `#ECE8DD` used on journal pages (the same value as `map-land`, §35.2, and `gear-plate`, §36.4). It is a style value, not a Tailwind theme token.

Always excluded: textures, tape, torn edges, bindings, handwriting fonts, stickers, streaks, achievements, engagement counts, likes, comments, or any feed or social styling. The only ornament is the spine rule (§37.2).

## 37.2 Journal Sheet and Spread

- Collection pages use the §36.2 sheet. Single-entry pages (reading and editing) use the same surface capped at 1440 wide, with a Back row on `ink` above it.
- From 1280px a single entry is a **spread**: `minmax(0, 7fr) 1px minmax(0, 5fr)`, the 1px track filled `ink` 0.10 (the spine rule). Below 1280, one centred column, max-width 760.
- In the reading page the photographs take the left page and the writing the right; in the editor the field order decides the pages.

## 37.3 Photo-Led Entry Card and Collection Grid

- The photograph **is** the card: a 4:3 frame, `object-fit: cover`, radius 12, a 1px `ink` 0.08 inset edge, `paper-shade` while loading. The caption (title `ink` 18/24 weight 600, two-line clamp; trail `ink` 14/20 weight 500; date and visibility in `stone` 14/20) sits directly on the paper, with no card container.
- The whole entry is one link to its reading page; its accessible name is title, trail, date, visibility. No action buttons, menus, or counts on a card.
- Hover: title underline and a darker frame edge; never zoom, lift, or shadow.
- Grid: `repeat(auto-fill, minmax(min(100%, var(--card-min)), 1fr))` with a per-tier minimum (300 / 272 / 260 / 240) so a 1440 viewport shows 4 columns and never 5; track math includes a classic 15px scrollbar (§36.3). Loading uses static skeletons; empty and unavailable are distinct states.
- **Journal index entry** (FEATURE-010, for a narrow single-column list such as the Community rail): one native button per entry, a side cover in the 4:3 frame (128 × 96 at ≥1440, 112 × 84 below), the title `ink` 16/22 weight 600 with a two-line clamp, the date in `stone` (plus "N photos" from two photos), and an optional excerpt across the full width, `ink` 14/20, three-line clamp, ending in "…" when the server shortened it. Entries are separated by a 1px `ink` 0.12 rule. A stack of full-width photos is not used in narrow columns: it reads as a feed. A single-column list appends **8** entries per page.
- **Pagination by appending:** one secondary button under the grid in words that describe the order ("Show older memories"), not numbered pages and not infinite scroll. On failure the loaded entries stay and the same button becomes **Try again**. Focus stays on the button, or moves to the first new entry when the button disappears.

## 37.4 No-Photo Surface and Photo Fallback

- An entry without photos shows `paper-shade`, an `ink` 0.07 `repeating-radial-gradient` contour, a `stone` line glyph (lucide `Mountain`), and a `stone` caption ("No photos"). Never a grey box, a fake photo, or the word "error".
- A photo that cannot be shown keeps its frame geometry on plain `paper-shade` with one `stone` line ("Photo couldn't be shown"). No broken-image glyph.
- **Compact no-photo mark** (FEATURE-010, thumbnails under 64px): the same `paper-shade` and contour with a 16px (14px compact) `stone` `Mountain` glyph, no caption, `aria-hidden`.

## 37.5 Reading Page Photographs

- A reading view shows the **whole** photograph: `object-fit: contain` on a `paper-shade` mat (radius 16, padding 16; 4:3 on the spread, 3:2 in one column). Crops are for previews only.
- With two or more photos, a **thumbnail strip** sits directly under the large photo: 64px buttons (56 below 1280), radius 8, `object-fit: cover`; the shown one has `aria-current="true"` and a 2px `ink` ring outside a 2px `paper` gap (shape, not hue). A caption names the position ("Photo 1 of 3 · Cover").
- **Narrow reading column** (≤ about 440px, FEATURE-010): the mat is 4:3 with 12 padding, strip thumbnails are 56px at every width, and the shown photo changes instantly on a thumbnail click.
- **The first photo is the cover.** Said in words ("The first photo is your cover.") and by a text tag, never by position numbers.

## 37.6 User-Written Long-Form Text

User text at `ink` 18/30 (16/26 below 1280, and 16/26 at every width in a narrow reading column such as the Community rail), `max-width: 66ch`, `white-space: pre-line`, rendered as a text node only (never HTML or Markdown).

## 37.7 Journal Editor

- One page, not a wizard or a modal. Fields use a visible label with a text **Required** / **Optional** marker, a `snow` control with a 1px `stone` border (radius 10; 12 for a writing area), helper and counter in `stone` 14/20, errors as a 2px `ember` border plus an icon and `ink` text. No placeholders; no `maxlength` that silently cuts pasted text (the counter and error carry the limit).
- A value that becomes permanent after the first save is shown afterwards as read-only text with a short note saying it can't be changed.
- Footer: a 1px `ink` 0.12 rule, then **Cancel** (secondary) and the save action (`conifer`), end-aligned; full width below 768.

## 37.8 Ordered Photo List, Upload Progress, and Errors

- Photos in an editor are a vertical list of rows (preview 120×90, a "Photo n" label, the Cover tag on the first), so "earlier" and "later" mean up and down. Each row has **Move earlier**, **Move later**, and **Remove** icon buttons (36px circles, 44 on a coarse pointer, explicit names); end controls are `aria-disabled` so focus is never lost; focus follows the moved photo and the new position is announced. No drag-and-drop.
- Row states are words on a second line: Preparing…, Waiting to upload, Uploading…, Added, Couldn't be added (with the reason in `stone` and **Retry** / **Remove**). One status line reports progress per photo ("Uploading photo 2 of 4…"), never a byte progress bar.
- When some uploads fail after the entry itself was saved, the page says what was saved and what was not ("2 of 3 photos added. 1 photo couldn't be added.") and offers retry; it never reports the whole save as failed.

## 37.9 Private / Public Visibility

- The choice is two stacked §36.6 choice tiles, each with an icon (`Lock` / `Globe`), a word, and a one-line meaning; Private is the default. Both values are styled identically: Public is not coloured or warned about.
- Elsewhere visibility is a small line icon plus the word in `stone`, never a coloured badge. Wording never implies a feed, followers, or publishing.

## 37.10 Owner-Only Destructive Action

Deleting an entry follows §36.9 inline on the reading page: a question naming the entry in quotes, a reassurance line (plus one line when the entry is public), **Cancel** first with initial focus, and the `ember` confirm. Never "soft delete", "permanently erased", or a typed confirmation.

## 37.11 Missing Related Data

When an entry refers to something that no longer exists (a removed trail), show its name slot as `stone` text such as "Trail unavailable" and keep the entry fully usable. Never hide the entry and never show a blank.

## 37.12 Leave Without Saving

A §36.7 dialog, 440 wide: "Leave without saving?", a body line, **Leave** (secondary) and **Keep editing** (`conifer`, initial focus, last). Escape keeps editing; a backdrop click does nothing. Used only while an editor holds unsaved changes or uploads, and never in the way of a sign-out or session end.

