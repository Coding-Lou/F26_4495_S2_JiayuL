# Outdoor Trip Companion — Design System

**Version 2 — Desktop-First Cinematic Web**

Version 2 is initially defined for:

**FEATURE-001 — Public Landing + Cinematic CG Hero**

This file contains reusable visual and interaction rules.

Feature-specific layout and behavior belong in:

`docs/features/<feature>.md`

Later features may extend this design system when genuinely reusable patterns are introduced.

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

For the Public Landing:

**the conversational planner is the primary interactive element.**

Nothing else should compete with it in:

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

Do not use:

- `stone` directly over media
- `ember` as normal text over media
- `sun` as text on `paper`
- low-opacity white text over changing video

---

# 10. Planner

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
Brand                         Explore      Sign In
```

Maximum navigation content width:

`1280px`

Typical vertical padding:

`24–32px`

Navigation should visually float over the environment.

Avoid a conventional heavy opaque website navbar unless readability requires a local surface.

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
- Gear
- Packing
- avatar UI
- realtime 3D controls
- Explore
- Memory
- dialogs
- menus
- date pickers
- long-form content
- application-wide dark mode
- final logo
- final display font

Those will extend this design system as their features are designed.

---

# 33. Authenticated 3D Experience

Known future direction only:

- persistent user avatar
- realtime stylized 3D
- gear visualization
- AI planning
- same broad visual universe as Public Landing

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