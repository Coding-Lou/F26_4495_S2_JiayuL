# Outdoor Trip Companion — Product Requirements

## 1. Document Purpose

This document defines the target product experience, user journey, feature requirements, scope boundaries, and phased delivery plan for **Outdoor Trip Companion**.

This document answers:

> What should the product become?

It does **not** describe the exact current repository implementation.

Current APIs, services, DTOs, technical risks, routes, and implementation status are documented separately in:

`docs/FRONTEND_CONTEXT.md`

Future AI coding agents should use:

- `PRODUCT_REQUIREMENTS.md` for product intent and behavior.
- `FRONTEND_CONTEXT.md` for current technical capabilities and repository state.
- `DESIGN_SYSTEM.md` for visual and interaction rules once that document exists.

When implementation constraints conflict with this PRD, do not silently change the product requirement. Surface the conflict and determine whether the implementation or the product requirement should change.

---

# 2. Product Overview

Outdoor Trip Companion is an AI-powered hiking and outdoor planning experience that helps users move from:

> “I want to go somewhere this weekend.”

to:

> “I know where I am going, what I need to bring, and I am ready for the trip.”

The product combines:

- conversational AI trip planning
- trail recommendation
- weather-aware decision making
- personal gear inventory
- packing recommendations
- user-controlled gear selection
- personalized 3D avatar visualization
- interactive outdoor environments
- trip memories and recap

The product is organized around four major stages:

**Plan → Pack → Explore → Memory**

The product presents these capabilities through two clearly separated experiences:

1. **Public Landing Experience** — an unauthenticated, cinematic brand and acquisition experience with a pre-rendered CG hero and a low-friction planning input.
2. **Authenticated Product Experience** — the personalized planning and preparation product: an Authenticated Home / Plan experience that pairs a pre-rendered looping preparation-room CG/video background with the interactive AI planning UI, a Pack experience where real-time 3D begins with the persistent avatar and gear visualization, and later adventure environments.

The experience should feel like a personalized outdoor companion rather than a traditional trail database or enterprise dashboard.

---

# 3. Product Vision

The long-term vision is to turn outdoor trip planning into an interactive journey.

Instead of asking users to manually configure many filters, the application should allow them to describe what they want naturally.

For example:

> “I want a moderate hike with mountain views this Saturday.”

The system should understand the request, consider trail characteristics and weather, recommend suitable options, help the user prepare appropriate gear, and visually represent the user's preparation through a personalized 3D hiking avatar.

After preparation, the experience transitions from a home environment into an outdoor environment representing the chosen trip.

The product should connect:

**real planning data**

with

**interactive visual storytelling**.

The public landing page previews this world through cinematic, pre-rendered CG. The interactive journey begins only after authentication, in the Authenticated Home, where the AI planner is presented over a pre-rendered stylized preparation-room background. Real-time 3D begins in Pack, where the user's gear choices visibly change their avatar.

---

# 4. Product Principles

## 4.1 AI First

Conversational planning is the primary entry point.

Users should be able to begin planning without understanding the application's data model, trail taxonomy, or filtering system.

Traditional browsing and filtering can exist, but AI planning should remain a first-class experience.

---

## 4.2 Visual but Functional

Visual experiences must support a defined product purpose. The Public Landing CG supports brand storytelling, acquisition, and preview; the Authenticated Home's pre-rendered room background provides atmosphere for planning; real-time 3D, which begins in Pack, supports personalized product functionality.

Interactive real-time 3D scenes should not exist only as decoration. Real-time 3D is therefore reserved for experiences where application state changes what the user sees, beginning with Pack, where equipping gear changes the avatar. A scene that is atmosphere only, with no required object-level interaction, is pre-rendered instead; this is why the Authenticated Home room is CG/video rather than a real-time 3D scene (section 40.5).

Whenever possible, real-time visual changes should reflect actual application state such as:

- selected trail
- scenery type
- weather
- user gear
- equipped gear
- trip preparation status

---

## 4.3 User Control

AI recommendations are suggestions rather than commands.

Users retain control over:

- trail selection
- trip date
- gear selection
- what to wear
- what to carry
- whether to accept or ignore recommendations

A recommended item must not automatically become an equipped item.

---

## 4.4 Progressive Experience

Do not present the entire application at once.

The product should progressively guide the user through:

**Plan → Choose → Prepare → Adventure**

Each stage should reveal only the information needed for the current decision.

---

## 4.5 Consumer Product, Not Dashboard

The product should feel like a modern outdoor consumer application.

Avoid making the primary experience resemble:

- enterprise administration software
- a developer dashboard
- a generic AI SaaS product
- a collection of disconnected forms

---

## 4.6 3D as Product Experience, Not Core Business Logic

3D is an important presentation and interaction layer.

However, the core product value remains:

- trail discovery
- recommendation quality
- weather-aware planning
- packing recommendations
- user gear management
- personalization

3D must enhance these capabilities rather than replace them.

---

## 4.7 Cinematic Entry, Personalized Product

The public experience should inspire interest through a cinematic representation of outdoor adventure. After authentication, the experience should shift from brand storytelling to personalized planning, preparation, and utility.

In product terms:

**The Public Landing creates motivation to begin a trip.**

**The Authenticated Home helps the user plan and prepare for that trip.**

The transition between these experiences should feel coherent, but their responsibilities must remain distinct.

Both experiences use pre-rendered CG/video as their visual background. What separates them is responsibility and content, not rendering method: the Public Landing shows cinematic outdoor scenes for acquisition, while the Authenticated Home shows a preparation room behind the working AI planner.

---

# 5. Primary User Journey

The target user journey begins in the public experience and continues into the authenticated product:

```text
PUBLIC

Public Landing
        ↓
Pre-rendered CG Hero
        ↓
Enter Trip Intent
        ↓
Start Planning
        ↓

AUTHENTICATION BOUNDARY

Login / Register
        ↓

AUTHENTICATED PRODUCT

Authenticated Home
        ↓
AI Planning
        ↓
Trail Recommendations
        ↓
Select Trail
        ↓
Trail Detail
        ↓
Gear Recommendation
        ↓
Customize Gear
        ↓
Avatar Update
        ↓
Start Adventure
        ↓

FUTURE / PHASED VISUAL EXPERIENCE

Outdoor Scene
        ↓
Explore
        ↓
Memory
```

The authenticated product preserves the established **Plan → Pack → Explore → Memory** journey. The MVP does not need to implement every stage at full fidelity, and later-stage labels indicate delivery sequence rather than a separate product journey.

Within this journey, the Authenticated Home and AI Planning steps are a React planning UI presented over a pre-rendered room background. Real-time 3D first appears in Pack, at the Customize Gear and Avatar Update steps.

---

# 6. Plan

## 6.1 Goal

Help the user answer:

> Where should I go?

Planning should begin from a natural-language conversation.

---

# 7. Entry and Home Experiences

## 7.1 Experience Boundary

The Public Landing and Authenticated Home are separate product experiences.

```text
Unauthenticated user
→ Public Landing

Authenticated user
→ Authenticated Home / Planning Experience
```

The term **Public Landing** refers to the unauthenticated brand and acquisition page. The term **Authenticated Home** refers to the authenticated planning space: the AI planner presented over a pre-rendered preparation-room background (section 7.8). They must not be treated as the same screen or as interchangeable uses of “Home.”

Returning authenticated users should enter the Authenticated Home or active planning experience directly. They should not be required to repeatedly pass through the Public Landing. The exact routing behavior is an implementation decision.

---

## 7.2 Public Landing Experience

Unauthenticated users first arrive on a cinematic public landing page. Its purpose is to communicate the product's outdoor identity, create interest, and preview the visual world users enter after authentication.

The Public Landing must not be a real-time 3D application. Its hero uses three short, high-quality, pre-rendered CG animation sequences.

Each sequence should be approximately **5–10 seconds**, with a preferred target of approximately **6–8 seconds**. The sequences should transition softly and loop continuously:

```text
Scene A
  ↓
soft transition
  ↓
Scene B
  ↓
soft transition
  ↓
Scene C
  ↓
soft transition
  ↓
Scene A
```

The CG environment should remain the dominant visual element. It is a cinematic preview, not a personalized simulation, and does not need to react to user state.

---

## 7.3 Public Hero UI

The interface layered over the CG hero should remain intentionally minimal and contain:

- product branding or logo
- lightweight navigation
- Sign In action
- main heading
- short supporting text
- central AI trip-planning input
- a small number of suggestion prompts

Example heading:

> Plan your next outdoor adventure

Primary interaction prompt:

**Where do you want to go?**

Example input:

> A moderate lake hike this Saturday

The UI must not visually compete with the CG scene. Do not add dashboard widgets, large feature panels, charts, or heavy card layouts to the hero.

Suggested prompts may include:

- Easy hike near Vancouver
- Lake view trail
- Rain-friendly short hike
- Fall foliage hike
- Moderate mountain hike this weekend

Selecting a suggestion may populate or submit the planning query depending on the final interaction design.

---

## 7.4 Unauthenticated Planning and Authentication Gate

Unauthenticated users may:

- type a trip request
- select a suggested prompt
- activate the primary planning action

Personalized AI trip planning requires authentication. Authentication is required when the user attempts to start planning, not before the user can express planning intent.

```text
Enter planning prompt
        ↓
Start planning
        ↓
Authentication required
        ↓
Login / Register
        ↓
Authenticated Home
```

This distinction is a product requirement: public intent entry must remain available even though personalized planning and all current planning APIs are authenticated capabilities.

---

## 7.5 Prompt Continuity Through Authentication

When practical, the application must preserve a valid planning prompt entered on the Public Landing through the authentication flow and restore it in the Authenticated Home planner.

Example:

```text
Public Landing
"A moderate lake hike this Saturday"
        ↓
Login / Register
        ↓
Authenticated Home
AI Planner: "A moderate lake hike this Saturday"
```

The user should not need to type the same request again. The storage and transfer mechanism is an implementation decision.

If continuity cannot be completed because authentication is cancelled, fails, or the prompt is invalid, the product should preserve a clear recovery path and must not imply that planning occurred.

---

## 7.6 Initial Public CG Hero Scenes

The initial hero contains three scenes in one consistent visual world.

### Scene A — Sunny Alpine Lake

**Purpose:** Represent destination discovery and the emotional appeal of outdoor exploration.

**Visual concept:**

- British Columbia-inspired alpine lake and mountain valley
- clear weather and warm sunlight
- moving grass and subtle clouds
- calm lake movement
- stylized hiking character
- anime-inspired outdoor environment

**Product meaning:** **Discover somewhere beautiful.**

### Scene B — Rainy Pacific Northwest Forest

**Purpose:** Represent weather-aware planning.

**Visual concept:**

- Pacific Northwest- or Vancouver-inspired forest
- cedar and evergreen trees
- light rain, wet trail, fog or mist
- soft overcast lighting
- hiking character wearing rain protection
- stylized anime-inspired environment

**Product meaning:** **Plan around the weather.**

### Scene C — Cold Mountain Ridge

**Purpose:** Represent preparation and gear awareness.

**Visual concept:**

- alpine mountain ridge
- cold, cloudy environment with strong wind
- light snow patches where appropriate
- dramatic clouds
- hiking character wearing warmer equipment and a backpack
- stylized anime-inspired environment

**Product meaning:** **Prepare for the conditions.**

---

## 7.7 Public CG Visual Style

All three CG scenes must share an **anime-inspired stylized outdoor adventure** direction, expressed through:

- cel-shaded visual language
- painterly environments
- simplified but high-quality geometry
- natural but slightly saturated colors
- atmospheric depth
- cinematic lighting
- expressive vegetation
- subtle environmental motion
- premium animation quality

The direction may take inspiration from stylized Japanese adventure games, but must not reproduce copyrighted characters, proprietary environments, recognizable game UI, or specific branded assets. Internal and external product language must not characterize the experience as a clone of an existing game. Appropriate descriptions include **anime-inspired stylized outdoor adventure** and **cel-shaded cinematic outdoor world**.

---

## 7.8 Authenticated Home Experience

After successful authentication, the user enters the actual product experience. The Authenticated Home / Plan experience is where the interactive product journey begins. It is built from two layers:

1. **Background: pre-rendered looping CG/video** showing a general stylized outdoor-preparation room. The room is visual atmosphere only.
2. **Foreground: the interactive React UI**, centred on the AI planner and conversation. This is the only interactive layer.

The Authenticated Home is not a real-time 3D environment.

```text
Authenticated Home
        ↓
Pre-rendered looping room CG/video (background, atmosphere only)
        +
AI planning UI / conversation (foreground, interactive, visually central)
        ↓
AI Planning
```

### Room background

The room should visually communicate outdoor preparation. Possible visual elements include:

- entrance or gear room
- equipment shelf
- backpack
- hiking shoes
- jackets
- map
- window or outdoor view

These elements are visual direction rather than mandatory individual features. In the Home scene they are decorative and environmental: for the Capstone MVP they do not need to reflect live application state such as owned gear, equipped gear, weather, or the selected trip.

The background may show a generic character from behind, for example seated at a computer. That figure is part of the pre-rendered atmosphere. It is not the persistent avatar described in sections 16 and 17, and the Authenticated Home does not require the production-ready avatar.

### Interaction

The primary interaction remains AI trip planning. The planning input and conversation stay visually central and are the dominant functional UI. When a planning prompt was entered on the Public Landing, it continues into this planner after authentication when practical (section 7.5).

The room background is not a navigation system and contains no required interactive 3D objects. The user does not need to click furniture, gear, maps, computers, or other room objects. The following are outside the approved scope:

- clicking the computer, the map, or gear shelves
- walking around the room, including WASD movement
- room customization
- room physics
- room inventory interaction

### Personalization

The Authenticated Home is not a marketing page. It is the user's planning space, and its personalization lives in the UI layer rather than in the room: the restored planning prompt, the conversation, planning state, and later saved trips and trip context.

A Home background that responds to application state, or a real-time 3D Home, is a deferred possible enhancement only. It is not part of the approved scope and must not be built without an explicit product decision that updates this document.

### Functional-first

The planner must be usable before the background media has loaded and when it fails to load. The background must have a reduced-motion or non-animated alternative (section 43). Temporary media, a still image, or a placeholder is acceptable until final CG/video exists; producing that media must not block functional Plan → Pack work.

The rationale for this architecture is recorded in section 40.5.

---

# 8. AI Trail Planning

## 8.1 User Input

The system should support natural-language requests containing combinations of:

- desired difficulty
- maximum distance
- maximum duration
- elevation preference
- scenery preference
- location
- trip date
- weather considerations

Users should not need to specify all dimensions.

---

## 8.2 Example Queries

Examples include:

> I want a moderate hike with a lake view this Saturday.

> Find an easy hike near Vancouver for tomorrow.

> I want a mountain trail but I only have three hours.

> Give me something suitable for a rainy day.

---

## 8.3 Recommendation Factors

Trail recommendations may consider:

- difficulty
- distance
- elevation gain
- estimated duration
- proximity
- scenery
- weather
- user gear readiness
- future user preferences

The application should communicate enough reasoning to help the user understand why a trail was recommended.

---

# 9. Trail Recommendation Results

## 9.1 Recommendation Count

The primary planning experience should show a small number of high-quality recommendations rather than overwhelming the user.

Target:

**up to 3 primary recommendations**

---

## 9.2 Trail Recommendation Card

Each recommendation should ideally communicate:

- trail name
- difficulty
- distance
- elevation gain
- estimated duration
- scenery
- recommendation score
- recommendation explanation
- relevant weather information where available

The exact information shown depends on backend contract availability.

---

## 9.3 Recommendation Explanation

The UI should explain recommendations in human-readable terms.

Example:

> Good match for your preferred moderate difficulty and mountain scenery, with suitable conditions expected this Saturday.

Avoid exposing raw backend scoring logic unless useful.

Detailed score breakdown may be available as secondary information.

---

# 10. Trail Selection

Selecting a recommendation establishes the active trip context.

At minimum, trip context should include:

- selected trail
- selected date
- user/origin context where relevant

This context is later used for:

- trail detail
- packing
- gear customization
- outdoor scene selection

---

# 11. Trail Detail

## 11.1 Goal

Help the user confirm:

> Is this the trip I actually want to do?

---

## 11.2 Desired Information

Trail detail should eventually support:

- trail name
- description
- difficulty
- distance
- elevation gain
- estimated duration
- map / route
- scenery
- weather
- recommendation context
- image or visual representation

If route geometry or imagery is unavailable, the UI must degrade gracefully rather than fabricate data.

---

## 11.3 Primary Action

Primary action:

**Plan This Trip**

This moves the user from:

**Plan**

to:

**Pack**

---

# 12. Pack

## 12.1 Goal

Help the user answer:

> What should I bring?

Packing recommendations should be contextual to the selected trip.

---

# 13. Gear Recommendation

## 13.1 Recommendation Inputs

Gear recommendations may consider:

- trail difficulty
- trail distance
- elevation gain
- duration
- weather
- temperature
- precipitation
- wind
- baseline trail requirements
- user's owned gear

---

## 13.2 Gear States

The product should distinguish between the following concepts.

### Owned

The user owns an item that belongs to the required gear category.

### Recommended

The system recommends bringing or wearing the item for this trip.

### Equipped

The user has explicitly chosen to wear or carry the item.

### Missing

The system recommends the category, but the user does not currently own an appropriate item.

These states must not be treated as equivalent.

In particular:

**Recommended ≠ Equipped**

and:

**Owned ≠ Equipped**

---

# 14. Personal Gear Inventory

Users should be able to maintain a personal inventory of outdoor equipment.

Examples:

- hiking boots
- trail shoes
- rain jacket
- warm layer
- backpack
- trekking poles
- headlamp
- traction
- water
- sun protection

The inventory represents what the user owns.

It does not automatically represent what the user is taking on a specific trip.

---

# 15. Gear Customization

After receiving packing recommendations, users should be able to decide which items they actually want to wear or carry.

Possible actions:

- Equip
- Unequip
- Bring
- Remove
- Replace one item with another owned item

The user should always retain final control.

---

# 16. 3D Avatar

## 16.1 Purpose

The avatar is the persistent visual representation of the user. It is a real-time 3D character introduced in Pack, where the user prepares for the selected trip, and it carries the same identity and equipment into Adventure.

The Authenticated Home does not require the avatar. A generic character may appear in the pre-rendered Home room background (section 7.8); that figure is atmosphere and is not the persistent avatar.

The trip chosen during planning determines what the avatar is prepared for, so the avatar should connect:

**Planning**

to

**Preparation**

to

**Adventure**

---

## 16.2 Visual Direction

The target style is:

- stylized
- anime-inspired
- cel-shaded
- simplified
- outdoor adventure oriented

The product may draw inspiration from stylized adventure games without copying proprietary characters, environments, or assets.

---

## 16.3 Character Complexity

The avatar does not need extensive character creation.

The first versions should avoid:

- face customization
- body sliders
- complex hairstyles
- RPG statistics
- combat systems
- character classes

The avatar exists primarily to visualize preparation and outdoor activity.

---

# 17. Persistent Avatar Identity

The same avatar should persist across every stage in which it appears. It is introduced in Pack and continues into Adventure.

Example:

```text
PACK (avatar introduced)

Avatar with default equipment

        ↓

PACK (gear customization)

Avatar updates as user equips gear

        ↓

ADVENTURE

The same avatar enters the outdoor scene
with the same selected equipment
```

Do not independently generate unrelated characters for different pages.

The generic character that may appear in the pre-rendered Authenticated Home room background is not the persistent avatar and does not need to match the user's equipment. Where practical it should follow the same art direction and character proportions so that it does not read as a different product (section 39).

---

# 18. Gear-to-Avatar Visualization

## 18.1 Goal

When the user changes equipped gear in Pack, the avatar should update visually in real time. Pack is the first experience in the product that uses real-time 3D, because it is where application state directly changes what is visible on the avatar.

Equip, Unequip, Bring, and Remove actions (section 15) drive these updates. Only gear the user has explicitly chosen to wear or carry (Equipped, section 13.2) is shown on the avatar; a Recommended or Owned item is not shown until the user equips it.

Examples:

- selecting a backpack adds a backpack
- selecting trekking poles adds poles
- selecting a rain jacket changes the jacket
- selecting hiking boots changes footwear
- selecting a hat changes headwear

Changes should appear without requiring a page reload.

---

# 19. Fixed Visual Gear Categories

The 3D layer does not need a unique model for every real-world product.

Multiple gear items can map to a shared visual asset.

Example:

```text
Arc'teryx Beta Jacket
Patagonia Torrentshell
Columbia Rain Jacket

        ↓

RAIN_JACKET

        ↓

rain_jacket 3D asset
```

Another example:

```text
Osprey Talon 33
Gregory Zulu 35
Deuter Futura 32

        ↓

MEDIUM_BACKPACK

        ↓

medium_backpack 3D asset
```

This mapping is intentional and should be preserved unless a future requirement changes it.

---

# 20. Initial 3D Gear Categories

The first 3D implementation should use a limited asset library.

Potential categories:

### Body

- default jacket
- rain jacket
- winter/warm jacket

### Legs

- hiking pants

### Feet

- trail shoes
- hiking boots

### Back

- small backpack
- medium backpack
- large backpack

### Head

- cap
- beanie

### Hands

- trekking poles

Not every backend `GearCategory` must initially have visible equipment.

Examples such as food and water may remain packing states without visible character equipment.

---

# 21. Gear Visualization Mapping

The future frontend should maintain a mapping conceptually similar to:

```text
User Gear Item
        ↓
Gear Category
        ↓
Visual Category
        ↓
3D Asset
        ↓
Avatar Equipment Slot
```

This mapping should remain separate from the user's actual gear record.

The backend gear database must not need to store 3D binary content.

---

# 22. Avatar Equipment Slots

The visual avatar may support slots such as:

- head
- body
- legs
- back
- left hand
- right hand
- feet

Some equipment may use:

- attachment models

while other equipment may use:

- mesh variants

The exact rendering technique is an implementation decision, not a product requirement.

---

# 23. Start Adventure

After selecting a trail and preparing gear, the user can begin the visual adventure experience.

Primary action:

**Start Adventure**

This represents the transition from:

**Preparation**

to:

**Explore**

---

# 24. Home-to-Adventure Transition

The application should visually transition from the preparation experience (Authenticated Home / Plan, then Pack) into an Outdoor environment.

Conceptually:

```text
AUTHENTICATED HOME
  ↓
PLAN
  ↓
PACK
  ↓
GEAR UP
  ↓
START ADVENTURE
  ↓
OUTDOOR ENVIRONMENT
```

The avatar must retain the user's selected equipment during this transition.

This transition is a product concept, not a rendering requirement. It does not imply that the Authenticated Home is a real-time 3D scene: the Home room is pre-rendered CG/video (section 7.8), and the avatar that enters the outdoor environment is the one prepared in Pack. How the transition is rendered is an implementation decision to be made when Adventure is scoped.

---

# 25. Outdoor Environment

## 25.1 Purpose

The outdoor scene should create a visual representation of the selected trip.

The first implementation does not need to reproduce the actual trail geographically.

Instead, the system may select an environment archetype representing the trail.

---

## 25.2 Environment Types

Possible environment archetypes include:

- Forest
- Alpine Lake
- Mountain Ridge
- Waterfall
- Coastal
- Snow / Winter

Initial implementation may use only a subset.

---

# 26. Scene Selection Logic

Outdoor scene selection should eventually be driven by real trip context.

Conceptually:

```text
Selected Trail
      +
Scenery / Terrain
      +
Weather
      ↓
Adventure Scene
```

Examples:

```text
LAKE + SUNNY
→ sunny alpine lake environment

FOREST + RAINY
→ rainy forest environment

MOUNTAIN + FOGGY
→ foggy ridge environment
```

The system should not randomly select a scene unrelated to the chosen trail.

---

# 27. Dynamic Weather Visualization

Weather can influence the visual environment.

Potential states:

### Sunny

- bright lighting
- clear sky
- high visibility

### Cloudy

- softer lighting
- overcast sky

### Rainy

- rain effects
- cloudy lighting
- wet environment appearance

### Foggy

- mist
- reduced visibility
- atmospheric mountains

### Snowy

- snow-covered environment
- snow particles where appropriate

Weather visualization is an enhancement and should not block the core Plan → Pack journey.

---

# 28. Outdoor Avatar Animation

In the adventure environment, the avatar may continuously perform a hiking animation.

The experience does not require game-style player controls.

Initial scope should avoid:

- WASD movement
- jumping
- collision systems
- combat
- player physics
- complex navigation
- open-world simulation

A fixed or predefined walking path is sufficient.

---

# 29. Interactive Hiking Journey

The intended outdoor experience is:

**an interactive visual hiking journey**

not:

**a browser-based open-world game**

A simple combination of:

- character walking animation
- slow camera movement
- environmental motion
- scene transitions

is sufficient to create the intended product experience.

---

# 30. Visual Trail Discovery

Future versions may allow environmental objects to act as trail discovery entry points.

Examples:

Clicking a lake:

> Show lake-view trails

Clicking a mountain:

> Show mountain-view trails

Clicking a forest:

> Show forest trails

These interactions should ultimately reuse the existing trail/recommendation system rather than implement an independent recommendation mechanism.

---

# 31. Dual Discovery Model

The product may eventually support two complementary forms of discovery.

## AI Discovery

User describes a need:

> Find me a moderate trail with lake views.

## Visual Discovery

User interacts with an environment:

> Select Lake.

Both should lead into the same underlying trail discovery and recommendation ecosystem.

---

# 32. Explore

The long-term Explore stage may include:

- trail environment
- map
- active users
- route awareness
- visual discovery
- simulated or real activity indicators

Explore is not required for the first frontend vertical slice.

---

# 33. Memory

## 33.1 Goal

Help users answer:

> What did I experience?

The Memory stage occurs after the trip.

---

## 33.2 Potential Inputs

Future inputs may include:

- GPX file
- trail data
- trip duration
- photos
- user notes

---

## 33.3 Potential Outputs

Memory may eventually provide:

- trip summary
- route recap
- photo timeline
- AI-generated narrative
- shareable recap
- short video

Memory remains a later product phase.

---

# 34. Frontend Information Architecture

The final product may conceptually contain:

```text
Public Landing
Authentication
Authenticated Home / Plan
Trail Recommendation
Trail Detail
Pack
Gear
Avatar / Gear Preparation
Adventure
Explore
Memory
Profile
```

Not every concept must become an independent URL or page.

Some should exist as states within one continuous journey.

---

# 35. Navigation Principles

Primary navigation should remain simple.

Potential high-level navigation:

- Home (authenticated product)
- Explore
- Gear
- Trips / Memory
- Profile

Do not expose internal technical architecture through the navigation.

For example, users should not see menu concepts based on:

- recommendation-service
- user-service
- activity-service

Navigation should represent user goals.

---

# 36. State Continuity

The application should preserve relevant context while the user moves through the journey.

At minimum:

```text
Public Planning Prompt
        ↓
Authentication
        ↓
Authenticated Planner
        ↓
Trip Date
Selected Trail
        ↓
Pack
        ↓
Selected Gear
        ↓
Avatar
        ↓
Adventure
```

Users should not need to repeatedly select the same trail or date.

When practical, users should also not need to re-enter a planning prompt submitted before authentication.

Initial versions may maintain this state client-side if persistent trip storage is unavailable.

Long-term versions should support persisted trips.

---

# 37. Error and Empty-State Product Requirements

Failures should not expose technical implementation details.

Examples:

Instead of:

> OpenMeteo API failed with HTTP 500

show:

> Weather information is temporarily unavailable. You can still review this trail.

Instead of:

> Recommendation service returned empty array

show:

> We couldn't find a good match. Try increasing the distance or changing your preferences.

Important failure states include:

- no matching trails
- recommendation unavailable
- weather unavailable
- route unavailable
- image unavailable
- gear inventory empty
- user owns none of the recommended gear

---

# 38. Authentication Experience

**Personalized AI trip planning requires authentication.**

**Unauthenticated users may express planning intent before authentication.**

The Public Landing must allow a user to enter or select a planning prompt. Activating the planning action then initiates authentication. After successful authentication, the user enters the Authenticated Home, where the prompt should be restored when practical and personalized planning can begin.

Identity is also required for personalized features such as:

- personal gear
- profile
- future saved trips
- avatar state

Authentication should remain a supporting interaction.

Users should not feel that authentication is the main product experience.

The application should avoid building its own password system when identity is already handled externally.

---

# 39. Visual Direction

The product should feel:

- modern
- outdoor-oriented
- calm
- cinematic
- immersive
- slightly playful
- premium
- exploratory

The Public Landing and Authenticated Product must feel like the same visual universe even though they use different rendering methods: pre-rendered CG/video for the Public Landing and the Authenticated Home room background, and real-time 3D from Pack onward. They should share:

- art direction
- character proportions
- environment language
- color philosophy
- cel-shaded or stylized appearance
- outdoor identity

Conceptually:

```text
Public CG Character
≈
Home Room Character (pre-rendered, generic)
≈
Pack Avatar (real-time 3D)

Public CG World
≈
Home Preparation Room (pre-rendered)
≈
Real-Time 3D Visuals (Pack, later Adventure)
```

Visual consistency is more important than identical rendering quality. The real-time experience may use simpler geometry, lighting, animation, and effects to meet performance needs.

---

# 40. CG and Real-Time 3D Roles

The product intentionally uses two visual technologies, pre-rendered CG/video and interactive real-time 3D, and assigns each a specific role:

| Experience | Visual role |
|---|---|
| Public Landing | Pre-rendered cinematic outdoor CG/video |
| Authenticated Home / Plan | Pre-rendered stylized preparation-room CG/video, with the interactive AI planning UI overlaid |
| Pack | Interactive real-time 3D avatar and gear visualization |
| Adventure / Explore | A later interactive visual environment, as defined by future scope |

Real-time 3D begins in Pack. Neither the Public Landing nor the Authenticated Home is a real-time 3D experience.

## 40.1 Public Landing — Pre-Rendered Cinematic CG

The Public Landing uses pre-rendered cinematic outdoor CG/video for:

- brand expression
- acquisition
- storytelling
- atmosphere
- previewing the product world

It does not need to respond to personalized user state and must not be described as the interactive 3D product.

## 40.2 Authenticated Home / Plan — Pre-Rendered Preparation-Room CG/Video

The Authenticated Home / Plan experience uses a pre-rendered, looping CG/video background showing a general stylized outdoor-preparation room, with the interactive AI planning UI overlaid on it.

The background is used for:

- atmosphere
- communicating outdoor preparation
- continuity with the public CG world

All interaction happens in the React UI layer, where the AI planner remains visually central. The room contains no required interactive 3D objects, is not a navigation system, and for the Capstone MVP does not need to reflect live application state. Section 7.8 defines the experience in full.

## 40.3 Pack — Interactive Real-Time 3D

Pack is the first experience in which the product uses interactive real-time 3D. Pack uses real-time 3D for:

- personalization
- persistent avatar visualization
- equipment visualization
- real-time visual response to Equip / Unequip / Bring / Remove actions
- trip preparation

The fixed visual gear categories (sections 19 and 20), the gear-to-visual mapping (section 21), and the avatar equipment slots (section 22) remain part of the intended product architecture. Recommended gear remains distinct from Equipped gear, and Owned gear remains distinct from Equipped gear (section 13.2).

The target real-time 3D visual style should be:

- stylized
- anime-inspired
- cel-shaded
- colorful but controlled
- simplified rather than photorealistic

Potential visual influences include modern stylized adventure environments.

Do not directly reproduce:

- copyrighted characters
- proprietary assets
- recognizable game UI
- branded environmental designs

The goal is:

**stylized outdoor adventure**

rather than:

**a clone of a specific game**

The real-time 3D layer may be simplified for performance but should preserve the public CG world's recognizable character and environment language.

## 40.4 Adventure / Explore — Later Interactive Visual Environment

The future Adventure experience may use real-time 3D or another suitable interactive visual implementation. That choice is made when the Adventure scope is defined. The avatar prepared in Pack continues into Adventure with the same selected equipment (sections 17 and 24).

This section does not expand Adventure or Explore scope.

## 40.5 Rationale

This architecture is an approved product decision (2026-10-11). It replaces the earlier direction in which the Authenticated Home was a real-time 3D room.

- The Authenticated Home room has no required object-level user interaction.
- A real-time 3D room would add Blender, Three.js, rendering, responsive camera, asset loading, performance, and maintenance cost without materially improving the Plan interaction.
- Pre-rendered CG/video can provide higher visual quality with substantially lower implementation complexity.
- Real-time 3D is reserved for Pack because that is where application state directly changes visible equipment on the avatar.
- This follows the principle that 3D should support product functionality rather than exist only as decoration (sections 4.2 and 4.6).
- It protects the Capstone scope and keeps Plan → Select → Pack functionality on the critical path.

---

# 41. UI Anti-Patterns

Avoid:

- purple-gradient AI SaaS styling
- generic dashboard layouts
- excessive cards
- heavy glassmorphism
- excessive shadows
- unnecessary charts
- too many borders
- admin-panel information density

The conversational planner and outdoor environment should remain visually dominant.

On the Public Landing specifically, avoid placing dashboard widgets, large feature panels, charts, or dense card layouts over the cinematic hero.

---

# 42. Mobile Experience

Primary user flows must remain usable on mobile.

At minimum:

- planning input
- recommendation selection
- trail information
- packing
- gear selection

must work without requiring desktop layout.

The advanced 3D experience may use reduced visual complexity on smaller or less powerful devices.

The Public Landing may use an appropriately optimized or simplified media treatment on mobile, but its planning input and authentication path must remain usable. The Authenticated Home room background may likewise be optimized or simplified on mobile, but the planner must remain usable.

Functional planning must never depend on high-end 3D rendering.

---

# 43. Accessibility

Core product functions must remain accessible without relying exclusively on 3D interaction.

For example:

If a user can click a lake in the 3D environment to discover trails, there must also be a conventional accessible UI path to discover lake trails.

Required principles:

- keyboard-accessible controls
- readable text contrast
- labeled inputs
- reduced-motion support where appropriate
- functional fallback when advanced visual effects are unavailable

The Public Landing must provide a reduced-motion or non-animated alternative to the looping CG hero without removing access to the planning input, suggestion prompts, or authentication action. The Authenticated Home must provide the same alternative for its looping room background without removing access to the planner.

---

# 44. Performance Principles

The product must prioritize functional usability over visual complexity.

For future 3D:

- models should be optimized for web delivery
- only required assets should be loaded
- environments should avoid unnecessary geometry
- textures should be optimized
- lower-complexity mobile experiences are acceptable
- loading the trip planner must not depend on all 3D assets finishing first

The user should be able to begin planning quickly.

The Public Landing must not require all final CG media to finish loading before its core text, planning input, and authentication actions become usable. Pre-rendered hero media should use delivery and fallback strategies appropriate to the user's device and connection. The Authenticated Home must apply the same functional-first principle to its pre-rendered room background: the planner must be usable before the background media loads and when it fails to load. Pack must apply the principle to real-time 3D loading: packing recommendations and gear selection must remain usable while 3D assets load, on reduced-capability devices, and when 3D is unavailable.

---

# 45. MVP Definition

The MVP should validate the core product promise:

> AI helps me choose a trail and prepare for it.

The MVP is divided into public, authenticated functional, and 3D product layers so visual production does not block validation of the planning and packing experience.

---

## 45.1 Public MVP

Required:

- public landing page
- cinematic hero structure designed for three looping scenes
- central planning input and a small number of suggestion prompts
- ability to express trip intent before authentication
- authentication gate when the user starts planning
- prompt continuity through authentication when practical
- mobile, accessible, loading, error, and reduced-motion states

The first development version may use temporary media, still images, simple motion studies, or placeholders before final CG assets are available. Final high-quality CG production must not block functional frontend development.

---

## 45.2 Authenticated Functional MVP

### Planning

- authentication
- Authenticated Home / planning experience
- pre-rendered looping preparation-room background behind the planner (non-blocking; see the note at the end of this section)
- restored public planning prompt when available
- conversational trip input
- trail recommendation
- recommendation result cards

### Trail

- trail selection
- trail detail
- weather information where available

### Packing

- gear recommendation
- owned / missing visualization
- packing readiness

### Gear

- personal gear inventory
- create gear
- edit gear
- remove gear

### State

- selected trail continuity
- selected trip date continuity

### Quality

- loading states
- error states
- empty states
- mobile usability

The Authenticated Home room background may use temporary media, a still image, or a placeholder until final CG/video is available. It is atmosphere only and must not block functional Plan → Pack development or validation.

---

# 46. 3D Product MVP

**3D must not block delivery of the functional MVP.**

Once Plan → Pack works end-to-end, the first visual MVP may include:

- one persistent avatar, introduced in Pack
- basic idle animation
- fixed equipment visualization
- gear-to-avatar updates for the supported visual categories
- one outdoor scene
- one walking animation
- Home / Plan → Adventure transition

This is sufficient to prove the visual product concept.

Real-time 3D in this MVP begins in Pack. It does not include a real-time 3D Authenticated Home scene; the Home background is pre-rendered CG/video (sections 7.8 and 40).

---

# 47. Phase 2 — Personalized Adventure

After the core MVP is stable, deepen the initial 3D Product MVP through:

- persistent avatar
- fixed gear-to-model mapping
- real-time avatar equipment updates
- Forest environment
- Lake environment
- Mountain environment
- environment selection based on trail scenery
- basic weather visual states
- outdoor walking animation
- adventure transition

---

# 48. Phase 3 — Interactive Explore

Possible enhancements:

- clickable 3D environmental hotspots
- visual trail discovery
- additional environment types
- more equipment models
- more weather states
- activity indicators
- map integration
- simulated live hikers
- richer scene animation

---

# 49. Phase 4 — Memory

Possible capabilities:

- saved trips
- trip history
- GPX upload
- route replay
- photo upload
- timeline
- AI trip recap
- shareable memory
- generated short-form recap video

---

# 50. Explicit Non-Goals for Initial Versions

The following are not required for MVP:

- open-world game mechanics
- character combat
- player-controlled movement
- physics simulation
- NPCs
- complex character creation
- multiplayer gameplay
- fully accurate recreation of every trail
- unique 3D model for every real gear SKU
- photorealistic environments
- real-time global weather simulation
- advanced social network
- full GPX/video generation pipeline
- requiring final public CG assets before the functional product can be developed or validated
- a real-time 3D Authenticated Home room
- object-level interaction with the Authenticated Home room, such as clicking the computer, map, or gear shelves, walking around the room, room customization, room physics, or room inventory interaction
- requiring final Authenticated Home room CG/video before the functional product can be developed or validated

---

# 51. Product Success Criteria

The first meaningful product version should allow a user to complete this journey:

```text
I enter the hike I want from the Public Landing or Authenticated Home
        ↓
If needed, I authenticate without re-entering my prompt
        ↓
I receive understandable recommendations
        ↓
I choose a trail
        ↓
I understand the expected conditions
        ↓
I receive useful packing recommendations
        ↓
I can compare them with gear I already own
        ↓
I feel prepared for the trip
```

The visual version should extend this journey to:

```text
I prepare my avatar
        ↓
My gear choices visibly change the character
        ↓
I start the adventure
        ↓
My character enters an environment representing my trip
```

---

# 52. Primary Product Metrics

For the Capstone prototype, metrics do not need production telemetry, but product evaluation can consider:

### Planning Completion

Can the user successfully move from natural-language request to selecting a trail?

### Recommendation Understanding

Can the user understand why a trail was recommended?

### Packing Completion

Can the user determine what gear they need and what they already own?

### End-to-End Completion

Can the user complete:

**Plan → Select → Pack**

without becoming blocked?

### Visual Comprehension

When 3D is introduced, can users immediately understand that gear choices affect their avatar?

---

# 53. Product Risks

## Scope Expansion

3D development can easily consume more time than the recommendation and packing experience.

Mitigation:

Complete the functional end-to-end flow before advanced 3D work. Reserve real-time 3D for Pack, where application state changes visible equipment, and keep the Authenticated Home pre-rendered.

---

## Visual Complexity

High-quality public CG and anime-inspired real-time environments can become separate art projects.

Mitigation:

Use temporary public hero and Authenticated Home room media during functional development, keep final CG production off the critical path, and use a small fixed asset library with reusable real-time scene archetypes.

---

## Visual World Drift

The pre-rendered Public Landing, the pre-rendered Authenticated Home room, and the real-time 3D Pack avatar could appear to belong to different products. The generic character in the Home room and the persistent avatar in Pack could also read as unrelated characters.

Mitigation:

Define and reuse shared art direction, character proportions, environment language, color philosophy, and cel-shaded styling while allowing lower real-time rendering fidelity.

---

## Gear Explosion

Supporting unique models for every real-world item is not scalable for the prototype.

Mitigation:

Map many real gear items into a small set of visual categories.

---

## Backend / Frontend Contract Gaps

Some desired UI states may not yet exist in backend responses.

Mitigation:

Do not fabricate backend behavior.

Document missing requirements in `FRONTEND_CONTEXT.md` and decide whether they require:

- backend contract changes
- frontend composition
- deferred functionality

---

## Product Becoming a Game

Interactive environments may distract from the planning purpose.

Mitigation:

Do not add gameplay mechanics unless they directly improve outdoor planning or discovery.

---

# 54. Development Strategy

Frontend development should use incremental vertical slices.

Do not ask an AI coding agent to generate the entire frontend in one task.

Preferred workflow:

```text
Understand requirement
        ↓
Implement static UI
        ↓
Review visual direction
        ↓
Integrate real API
        ↓
Validate behavior
        ↓
Commit
        ↓
Continue to next feature
```

Public hero and Authenticated Home background development should begin with structure, content hierarchy, interaction, and representative temporary media. Final high-quality CG asset production for either may proceed earlier in parallel when assets are available, but it must not block authentication, planning, trail, packing, or gear functionality.

---

# 55. Recommended Initial Development Sequence

## Step 1

Public Landing structure.

## Step 2

Public CG/video hero.

## Step 3

Public hero planner input.

## Step 4

Authentication gate interaction.

## Step 5

Authentication integration.

## Step 6

Authenticated Home / Plan structure.

## Step 7

Authenticated Home looping room CG/video background.

## Step 8

Prompt continuity from the Public Landing into the Authenticated Home planner.

## Step 9

Real recommendation integration.

## Step 10

Trail detail.

## Step 11

Packing.

## Step 12

Gear inventory.

## Step 13

Gear customization.

## Step 14

Real-time 3D avatar for Pack.

## Step 15

Gear-to-avatar mapping.

## Step 16

Outdoor / Adventure visual experience.

## Step 17

Home / Plan → Adventure transition.

## Step 18

Later Explore and Memory work.

Steps 2 and 7 may be delivered with temporary media, still images, or placeholders. Final high-quality CG/video for the public hero and the Authenticated Home room may be produced in parallel at any point, but neither blocks product functionality, and the Home CG/video in particular is not a blocker for functional Plan → Pack work.

Real-time 3D begins at Step 14. No earlier step requires a 3D library, 3D assets, or a real-time scene.

---

# 56. Source-of-Truth Rules for AI Agents

Future AI agents must read:

1. `docs/PRODUCT_REQUIREMENTS.md`
2. `docs/FRONTEND_CONTEXT.md`

before making significant frontend product decisions.

If available, also read:

3. `docs/DESIGN_SYSTEM.md`

before visual implementation.

---

## Product Requirements Authority

This document is the source of truth for:

- user journey
- product behavior
- product terminology
- product priorities
- MVP scope
- future experience direction

---

## Frontend Context Authority

`FRONTEND_CONTEXT.md` is the source of truth for:

- current APIs
- current backend capabilities
- current frontend structure
- technical constraints
- known integration risks
- implementation status

---

## Design System Authority

`DESIGN_SYSTEM.md` will be the source of truth for:

- typography
- spacing
- colors
- visual components
- animation rules
- layout conventions
- visual consistency

---

# 57. Agent Change Rules

AI coding agents must not reinterpret major product requirements without explicit instruction.

In particular, do not silently change:

- AI-first planning
- Public Landing and Authenticated Home separation
- pre-rendered CG/video for the Public Landing
- a pre-rendered room CG/video background with the React AI planning UI for the Authenticated Home / Plan
- real-time 3D beginning in Pack rather than in the Authenticated Home
- unauthenticated planning-intent entry followed by an authentication gate
- prompt continuity through authentication when practical
- Plan → Pack → Explore → Memory
- user-controlled gear selection
- Recommended vs Equipped distinction
- persistent avatar identity
- fixed visual gear category strategy
- Trail + Weather driven scene selection
- Home → Adventure transition concept

If implementation limitations make a requirement difficult, report the limitation instead of silently replacing the experience.

## Visual Architecture Guard

Agents must read the visual architecture as:

- Home / Plan background = pre-rendered CG/video
- Home interaction = the React UI planning experience
- Pack = the first primary real-time 3D avatar and gear experience

Without an explicit product decision that updates this document, agents must not:

- implement the Authenticated Home as a real-time 3D scene, or add a 3D library, 3D model, or 3D asset pipeline for it
- add object-level interaction to the Home room, such as clickable computers, maps, furniture, or gear, room navigation, movement, customization, physics, or inventory interaction
- make planning depend on the Home background media or on any 3D asset
- treat the generic character in the Home room background as the persistent avatar
- remove or weaken the Pack requirements: persistent avatar identity, fixed visual gear categories, gear category to visual asset mapping, avatar equipment slots, Equip / Unequip behavior, Recommended ≠ Equipped, Owned ≠ Equipped, real-time visual changes when supported gear is equipped, web-optimized 3D assets, and continuity of the avatar into Adventure

---

# 58. Document Maintenance

Update this document when:

- a major product feature is added or removed
- the primary user journey changes
- MVP scope changes
- avatar or 3D experience decisions materially change
- gear interaction semantics change
- Explore or Memory behavior becomes defined

Do not update this document for:

- small code refactors
- endpoint implementation details
- dependency upgrades
- file moves
- internal DTO changes

Those belong in `FRONTEND_CONTEXT.md`.

---

# 59. One-Sentence Product Description

**Outdoor Trip Companion is an AI-powered outdoor planning experience that helps users discover trails, prepare the right gear, personalize their hiking avatar, and bring their trip to life through an interactive outdoor journey.**

---

# 60. Product Tagline

**From “Where should I go?” to “I’m ready to hike.”**

AI helps plan the trail, prepare the gear, and bring the adventure to life.
