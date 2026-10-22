# FEATURE-005 — Pack Customization & 3D Avatar

| | |
|---|---|
| Status | **PASS, FROZEN (2026-10-14).** Implemented through the feature cycle: 54 of 54 acceptance criteria passed, Asset Gate and Integration Gate passed. The product decisions of section 43.2 are final (2026-10-13). The 3D contract corrections accepted at freeze (CA1–CA18, cycle checkpoint `.claude/state/features/005-pack-customization-avatar.md`) are reconciled into sections 19–27 and 32 below and tagged with their CA number; accepted implementation deviations are listed in that checkpoint. Visual polish of the 3D assets is a separate backlog item, not a change to this specification |
| Date | 2026-10-13 |
| Route | `/trails/:trailId/prepare/:tripDate/pack` (Gear Customization Studio), protected |
| Depends on | FEATURE-002 (Authentication), FEATURE-004 (Trail Selection & Trip Preparation), `GET /api/trails/{id}`, `POST /api/recommendations/pack`, `GET /api/users/me/gear`, and `POST /api/users/me/gear` |
| Followed by | FEATURE-006 (Start Adventure, outdoor real-time environment, Explore) |
| Feature cycle | `3D pipeline: RUN`, `Blender production: REQUIRED` (sections 20–27 require Blender-made GLB assets, a real-time avatar, and a Three.js runtime) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` → `docs/FRONTEND_CONTEXT.md` → `docs/DESIGN_SYSTEM.md` → FEATURE-002 → FEATURE-003 → FEATURE-004 |

How to read this document. Each section stands on its own.

| Reader | Sections |
|---|---|
| Lead | 1–5, 7, 35–41, 43; the gates in 27 and the acceptance criteria in 42 |
| `frontend` | 4–14 (data, state, routing), 15–18 (design; 16.14 holds every user-facing string), 25 and 28–34 (manifest and runtime), 35–37 |
| `three-d` | 19–27 (the 3D contract: frozen at Stage B of the cycle), 33, and the runtime sections 28–32 and 34 that the assets must serve |
| `qa` | 42, with the sections each criterion names |
| `backend-api` | 6 and 7. No backend work is requested by this feature |

Notation. "004 §x" is section x of `docs/features/004-trail-selection-preparation.md`; "DS §x" is `docs/DESIGN_SYSTEM.md`; "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; a bare "§x" or "section x" is this document. Copy ids used without a definition here (TP7–TP17, SH1–SH7, DT3) are FEATURE-004's, from its section 21.16. Values marked (est.) are arithmetic or read by eye, not browser measurements. In sections 19–34: **B-space** is Blender space (Z up, the avatar faces −Y, the avatar's left is +X); **G-space** is glTF and three.js space (Y up, the avatar faces +Z, the avatar's left is +X); B (x, y, z) converts to G (x, z, −y); lengths are metres unless a unit is written; **TBC-A** means to confirm at Stage A or the P0 preflight; **TBC-I** means to confirm by `frontend` at implementation.

Authorship. Sections 15–18 were designed by `ui-ux` and sections 19–34 by `three-d`, each once, for this specification; the lead wrote the rest and reconciled the three. Sections 19–27 and 33 are the 3D asset contract. The final revision of 2026-10-13 (the headlamp in place of the sun hat, the simplified shading contract, the resolved product decisions, the write scope) was made by the lead; `three-d` validates the contract at Stage B as the cycle requires.

---

## 1. Feature Summary

FEATURE-004 ends on Trip Preparation: the user knows which trail and date they chose, what the system recommends bringing, which of those categories they own or are missing, and their packing readiness.

FEATURE-005 takes the user from "I know what I should bring" to **"I decided what I am actually bringing, and I can see my prepared avatar."**

It adds one screen, the **Gear Customization Studio**, reached from Trip Preparation by one call to action. In it:

1. A real-time 3D avatar, the product's persistent avatar (PRD sections 16–18), stands on a stage.
2. The user's gear for this trip is listed beside it, each row stating in words whether the category is Recommended, whether the user owns it or it is Missing, and whether it is Equipped.
3. The user explicitly **equips** and **unequips** owned gear. The avatar changes at once, with no page reload.

The feature introduces the product's fourth gear state, **Equipped**, which is specific to one trip. It delivers PRD development steps 13 (Gear customization), 14 (Real-time 3D avatar for Pack), and 15 (Gear-to-avatar mapping). It is the first place a 3D library and 3D assets enter the product (PRD sections 40.3 and 57).

It stops before Start Adventure, the outdoor scene, and Explore, which are FEATURE-006 (section 38).

## 2. Goals

1. One action on Trip Preparation opens the Studio with the trail, the trip date, and the pack recommendation carried over. Nothing is selected or typed again.
2. Recommended, Owned, Missing, and Equipped are four distinct, visible, textual states. None is inferred from another: **Recommended ≠ Owned ≠ Equipped**.
3. The user decides what is equipped. Nothing becomes equipped without an explicit action by the user (PRD sections 4.3 and 13.2).
4. Equipped gear appears on the avatar in real time, by category, through a documented and deterministic mapping.
5. The loadout survives a reload, a visit to Trip Preparation and back, and ordinary same-tab navigation, without a saved-trip backend.
6. A loadout belongs to one signed-in user and one trip. It is never restored for another user or another trip.
7. The whole workflow is usable without the 3D view: by keyboard, by screen reader, while models load, when a model fails, and when WebGL is unavailable (PRD sections 43 and 44).
8. The 3D asset contract is exact enough that Blender production can start without a design question left open, and the Asset Gate can pass or fail each file by measurement.
9. The boundary to FEATURE-006 is explicit: there is no outdoor scene, no walking, and no Start Adventure here.

Product positioning: the Studio is an outdoor gear preparation studio. It is not an enterprise dashboard, an inventory spreadsheet, an e-commerce configurator, a character creator, or a game lobby.

## 3. User Journey

```text
FEATURE-004  /trails/:trailId/prepare/:tripDate          Trip Preparation
  Preparing for {trail} · trip date
  Packing readiness · Recommended gear (Owned / Missing) · Forecast
        │  "Gear up"                                     (section 4)
        ▼
FEATURE-005  /trails/:trailId/prepare/:tripDate/pack     Gear Customization Studio
  Back to preparation
  Selected trail · trip date
  3D avatar on the stage
  Your pack
    Recommended for this trip      Owned / Missing / Equipped per category
    Also in your gear              owned, not recommended, may be equipped
  Packing readiness (owned)  ·  Pack completion (equipped)
        │  Equip / Unequip, choose an item, add missing gear
        ▼
  The avatar shows what is equipped, at once
        │
        ▼
FEATURE-006 (not built here): Start Adventure → outdoor environment → Explore
```

Other ways in, all supported (section 10):

| Entry | Result |
|---|---|
| Direct URL to the Studio, signed in, valid trail and date | The Studio, with the loadout stored for that user, trail, and date in this tab, or an empty one |
| Reload on the Studio | The same screen and the same loadout |
| Browser Back or "Back to preparation" | Trip Preparation for the same trail and date; the loadout is kept |
| Signed out on the Studio URL | FEATURE-002's sign-in gate; after sign-in the user returns to the Studio |
| Studio URL with no usable date | Trip Preparation's choose-a-date state. The Studio never asks for a date |

## 4. Entry from FEATURE-004

### 4.1 What FEATURE-004 already provides

Verified in `Project/Frontend/src/features/trails/` and `features/packing/` on 2026-10-13.

| Provided | Where | Used by the Studio |
|---|---|---|
| The selected trail and trip date | The Preparation path, `/trails/:trailId/prepare/:tripDate`. Nothing else stores them (FEATURE-004 D2) | The Studio path extends it by one segment |
| The trail's facts | The trail query, keyed by trail id (`features/trails`) | Reused as it is |
| The pack recommendation | The pack query, keyed by subject, trail id, and trip date (`usePackRecommendation`) | Reused as it is. It supplies the Recommended categories and Packing readiness |
| Gear category labels | `features/packing/gearCategories.ts` | Reused. One mapping, not two |
| A reserved position for the next call to action | The end of the date row in the Preparation panel's trip block (FEATURE-004 section 21.18) | The call to action is placed there |
| An optional `rec` query parameter | Rides along from the planner for the way back to Trail Detail | Carried through unchanged; the Studio does not read it |

### 4.2 The handoff

| Rule | Behavior |
|---|---|
| Entry action | Trip Preparation gains one call to action, **Gear up**, in the reserved position (design and the reason for the label in 16.12; the label is final, Q12). It is a link to the Studio path, with `rec` kept when present |
| When it is shown | Only when Trip Preparation's pack request has succeeded: with gear rows, with no weather, with nothing recommended, and with everything missing. It is absent, with no placeholder and no disabled form, while the pack is loading, after a pack failure or timeout, and in the trail-not-found and choose-a-date states (16.12) |
| What travels in the URL | The trail id and the trip date, in the path, exactly as on Preparation. No gear, no item id, no equipped state, no name |
| What is not repeated | The planner is not called. No recommendation is recomputed. The user does not choose the trail or the date again |
| Pack recommendation | Read through the same pack query. On arrival from Preparation it is normally already in the query cache and is shown at once while it refetches (`refetchOnMount: "always"` stays as FEATURE-004 set it) |
| Owned and Missing | Preserved in meaning. In the Studio they are derived from the gear inventory, which also supplies the item names (section 11) |
| Activating it | Makes no request by itself and writes nothing to storage. It is navigation |

### 4.3 Amendments to FEATURE-004

Each is the smallest change that lets the handoff exist. Everything else in FEATURE-004 holds and is regression-checked.

| FEATURE-004 text | Amended to |
|---|---|
| D11, section 21.18, section 27: "No FEATURE-005 call to action is rendered" | The call to action of 16.12 is rendered in the reserved position |
| AC-46: no "Customize my pack" control; no `three`, `@react-three/*`, canvas, GLB, or model file; no new runtime dependency | Superseded by this feature for exactly those clauses. Trip Preparation itself still has no Equipped state, no toggle, no checklist, no canvas, and no 3D |
| Section 26: `/api/users/**` is not proxied | One entry, `/api/users/me/gear`, is added (section 36) |
| Section 25: return-destination pattern | Extended by one accepted path (section 10) |
| Q4 (how the pre-rendered scene relates to the avatar) | Answered by section 15 (final, Q3) |
| Q11 (colour of the call to action on the panel) | Answered by 16.12 |
| Q3 (should a minimal add-gear action be pulled forward) | Answered by section 13 (final, Q1) |
| Section 13.2: "Primary action: None in FEATURE-004" on Trip Preparation | Trip Preparation's primary action is the call to action of 16.12 |
| Section 21.10: "The date popover is the only `paper` surface on the screen" | The call to action is a second `paper` surface |
| Section 23.2: the Preparation tab order | The call to action is a tab stop after the trip-date control and before the briefing region |
| Section 21.16: the words the copy never uses | "Equipped" is used throughout FEATURE-005. "Packed", "buy", "ready to go", "all set", and "safe" remain unused |

## 5. Business State Model

### 5.1 The four states

| State | Meaning | Scope | Source of truth | Who changes it |
|---|---|---|---|---|
| **Recommended** | The system recommends this gear *category* for the selected trail and date | One trail and date | `POST /api/recommendations/pack` → `requiredGear[].category` | The backend only |
| **Owned** | The user has at least one item of this category in their durable gear inventory | The user, across all trips | `GET /api/users/me/gear` | The user, by adding gear (section 13) or elsewhere |
| **Missing** | Recommended, and the user owns no item in that category | One trail and date | Derived: Recommended and not Owned | Nobody directly |
| **Equipped** | The user has explicitly chosen to wear or carry one owned item of this category on **this** trip | One user, one trail, one date, one tab session | The loadout (section 8) | The user only, by Equip and Unequip |

### 5.2 Rules

| # | Rule |
|---|---|
| R1 | The four states are stored, derived, and displayed separately. No single control or checkbox represents more than one of them |
| R2 | Recommended is never Equipped by default. Owned is never Equipped by default. An item becomes Equipped only through an explicit action by the user (PRD sections 4.3, 13.2, 18.1, 57) |
| R3 | Only an Owned item can be Equipped. A Missing category has no Equip control and cannot be equipped by any path |
| R4 | A category that is Owned but not Recommended may be equipped: the user decides what to bring (PRD section 4.3) |
| R5 | A category has at most one Equipped item per trip (section 12) |
| R6 | Equipped is not inventory state. Equipping never calls a gear endpoint and never changes what the user owns |
| R7 | Adding gear changes Owned only. A newly added item is not Equipped until the user equips it |
| R8 | Only Equipped gear is shown on the avatar. Recommended or Owned gear that is not Equipped is never shown (PRD section 18.1) |
| R9 | The avatar is a presentation of the loadout. Nothing in the 3D scene is read back as business state (section 28) |
| R10 | Packing readiness keeps FEATURE-004's meaning: the backend's number, based on Owned. It is never recomputed, restyled as a judgement, or replaced by an Equipped figure (section 14) |

### 5.3 Worked examples

For one trip on which the pack response recommends rain gear, a backpack, a warm layer, and hiking footwear:

| Category | The user's inventory | Recommended | Owned | Missing | Equipped | On the avatar |
|---|---|---|---|---|---|---|
| Rain gear | "Beta Jacket" | Yes | Yes | No | No | Nothing |
| Backpack | "Talon 33" | Yes | Yes | No | Yes: "Talon 33" | The generic backpack |
| Warm layer | none | Yes | No | Yes | Cannot be | Nothing |
| Hiking footwear | "Trail boots", "Winter boots" | Yes | Yes | No | Yes: "Winter boots" (the user's choice between two) | The generic hiking boots |
| Trekking poles | "Carbon poles" | No | Yes | No | Yes: the user chose to bring them | The generic poles |
| Headlamp | "Spot 400" | No | Yes | No | Yes: the user chose to bring it | The generic headlamp |
| Water | "1 L bottle" | No | Yes | No | Yes | Nothing: this category has no 3D model (section 20) |
| Sun protection | none | No | No | No | Cannot be | Nothing. The row is not listed |

## 6. Current Backend Contracts

Inspected in the working tree on 2026-10-13 (`GearController`, `GearService`, the three gear DTOs, `GearCategory`, `Gear`, `GlobalExceptionHandler`, `PackRecommendationService` and its DTOs). All services are stateless OAuth2 resource servers; every endpoint requires `Authorization: Bearer <access token>`. Java UUIDs and dates serialize as strings.

### 6.1 Owned gear — `user-service`, port 8081, base path `/api/users/me/gear`

| Method | Path | Request | Success | Used by FEATURE-005 |
|---|---|---|---|---|
| `GET` | `/api/users/me/gear` | None | `200`, `GearItemResponse[]` | **Yes** |
| `POST` | `/api/users/me/gear` | `CreateGearItemRequest` | `201`, `GearItemResponse` | **Yes** (section 13) |
| `PUT` | `/api/users/me/gear/{gearId}` | `UpdateGearItemRequest` (same shape as create; a full replacement) | `200`, `GearItemResponse` | No |
| `DELETE` | `/api/users/me/gear/{gearId}` | None | `204`, empty body; the row is soft-deleted | No |

`GearItemResponse`:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `name` | string | Non-null in persistence, at most 100 characters |
| `category` | `GearCategory` or `null` | **Nullable** in both DTOs and in the table |
| `description` | string or `null` | At most 255 characters |
| `createdAt` | ISO offset date-time string | |

`CreateGearItemRequest` and `UpdateGearItemRequest`:

| Field | Type | Validation |
|---|---|---|
| `name` | string | Required: `@NotBlank`, `@Size(max = 100)` |
| `category` | `GearCategory` or `null` | **None.** A missing or `null` category is accepted and stored |
| `description` | string or `null` | `@Size(max = 255)` |

Behavior, from `GearService`:

| Aspect | Behavior |
|---|---|
| Whose gear | Only the authenticated user's. The user is resolved from the JWT by `getOrCreateUser`, which creates the local profile on first use |
| `GET` order | Newest first (`createdAt` descending). Soft-deleted rows are excluded. Not paginated |
| Uniqueness | None. Two items may share a name and a category. `ErrorCode.GEAR_CONFLICT` exists but nothing raises it |
| Trip awareness | None. An item is "owned" by existing in the list. No field refers to a trail, a date, or a trip |
| `PUT` / `DELETE` on an unknown, foreign, or deleted id | `404` `ProblemDetail`, title "Resource Not Found", `code: "GEAR_NOT_FOUND"` |

Errors:

| Situation | Response |
|---|---|
| `name` blank or longer than 100, `description` longer than 255 | `400` `ProblemDetail`, title "Validation Failed", `code: "VALIDATION_ERROR"`, `errors: [{ field, message }]` |
| `category` is a string outside the enum; malformed JSON | `400`. Not handled by `GlobalExceptionHandler`: the body is Spring's default, not the shape above |
| No valid token | `401` |
| Anything else | `500`, unmapped |

`GearCategory` wire values, identical in `user-service`, `trail-service`, and `recommendation-service`, in enum order: `FOOTWEAR`, `RAIN_GEAR`, `WARM_LAYER`, `WIND_LAYER`, `TREKKING_POLES`, `TRACTION`, `HEADLAMP`, `BACKPACK`, `WATER`, `FOOD`, `SUN_PROTECTION`.

### 6.2 Pack — `POST /api/recommendations/pack` (`recommendation-service`, port 8083)

Unchanged since FEATURE-004, whose section 5.2 is the full reference. What the Studio relies on:

| Field | Type | Use in the Studio |
|---|---|---|
| `requiredGear[]` | `{ category: GearCategory, owned: boolean }` | `category` is the Recommended set. `owned` is category-level, with no item id or name |
| `readinessPercentage` | integer 0–100 | Packing readiness, shown as returned. `round(owned ÷ required × 100)`; an empty `requiredGear` returns `100` |
| `weather`, `weatherAvailable` | `TrailWeather` or `null`, boolean | Not shown in the Studio. The forecast stays on Trip Preparation |
| `trailId`, `trailName` | UUID string, string | As in FEATURE-004 |

Request: `{ trailId, tripDate }`, `tripDate` today or later by the server's clock. Errors are as FEATURE-004 section 5.2 lists them (`400` for a refused date, `500` for an unknown trail, `503` when `user-service` fails).

The backend decides `owned` with the same rule the Studio applies to the gear list: at least one non-deleted item whose `category` equals the required category. Items with a `null` category never count.

### 6.3 Trail — `GET /api/trails/{id}` (`trail-service`, port 8082)

Unchanged; FEATURE-004 section 5.1. The Studio uses `name`, `difficulty`, `distanceKm`, `elevationGainM`, and `estimatedDurationMin` for its trip block, and the `404` to recognise a missing trail.

### 6.4 TypeScript shape (guidance)

Contract types live with the feature that owns the endpoint (section 35). Both responses are untrusted when read: each field is checked and reduced to a value or `null`, as FEATURE-003 and FEATURE-004 do.

```ts
// features/gear
type GearItem = {
  id: string
  name: string
  category: string | null   // a GearCategory wire value, an unknown string, or null
  description: string | null
  createdAt: string | null
}

type CreateGearItemRequest = {
  name: string              // trimmed, 1–100 characters
  category: string          // always sent by this feature: the row's category or the one chosen; one of the 11 wire values
}
```

A list entry with no usable `id` or `name` is dropped. A response that is not an array is an unusable answer (section 16.13).

## 7. Backend Persistence Gap and Known Gaps

### 7.1 Trip, loadout, and Equipped persistence: CURRENTLY UNSUPPORTED

Verified on 2026-10-13 by listing every controller mapping in `Project/Backend/` and searching all Java, SQL, and configuration sources for `loadout`, `equipped`, `saved trip`, and `trip plan`:

| Capability | Exists in the backend? | Evidence |
|---|---|---|
| A saved trip | **No** | No entity, table, DTO, or endpoint. The twelve mappings are: user profile (1), gear (4), trails (3), recommendations (3), planner (1). `api-gateway` and `activity-service` are empty shells |
| Trip-specific selected gear | **No** | `gear_items` has no trip column; no join table exists |
| An Equipped state | **No** | The word does not occur in any backend source |
| Loadout persistence | **No** | As above |
| Avatar, 3D asset, or equipment-slot data | **No**, by design | PRD section 21: the mapping lives in the frontend and the backend never stores 3D content |

**This is not a FEATURE-005 blocker.** The product behavior this feature needs (decide a loadout, see it, keep it through same-tab navigation) does not require a server. The loadout is session-scoped frontend state (section 8), which is what PRD section 36 allows for initial versions.

What a session-scoped loadout cannot do, recorded as a limitation and not worked around: survive closing the tab, appear on another device or in another tab, or outlive the sign-in session.

**BACKEND CONTRACT GAP (future, class C, not requested).** When loadouts must outlive a tab, the smallest change would be one resource in `user-service`, keyed by the authenticated user, a trail id, and a trip date, holding a list of `{ category, gearItemId }`: one `GET` and one `PUT`. It would go through `backend-api` with lead approval, under a later feature. Nothing in FEATURE-005 authorizes it, and the frontend does not invent it.

### 7.2 Known gaps

Only confirmed items. Classes: **A** non-blocking, handled inside this feature; **B** blocker; **C** future enhancement.

| # | Gap | Evidence | Class | Handling |
|---|---|---|---|---|
| G1 | No trip, loadout, or Equipped persistence | Section 7.1 | C | Session-scoped loadout (section 8) |
| G2 | Pack ownership is category-level: no item id or name | `PackItemStatus` | A | The Studio reads the gear list and groups it by category (section 11) |
| G3 | `category` is nullable on a gear item | Both gear DTOs; `Gear.category` | A | An item with no category cannot be recommended, matched, or drawn. It is not listed in the Studio (section 11.3) |
| G4 | No browser path to `user-service`: no CORS, no gateway route | `FRONTEND_CONTEXT.md` section 7 | A | One development proxy entry (section 36) |
| G5 | `/gear` is an empty placeholder: the product has no way to add, edit, or delete gear | `pages/GearPage.tsx` | A | A minimal inline Add gear (section 13). Edit and delete stay unavailable |
| G6 | The gear `POST` accepts a `null` category and does not reject duplicates | Section 6.1 | A | This feature always sends a category. Duplicates are separate items and are listed separately |
| G7 | Gear error bodies are not uniform: validation is a `ProblemDetail`, an unknown enum value is Spring's default | Section 6.1 | A | Status-based handling. No body field is required |
| G8 | The pack response gives no reason for a recommended category | FEATURE-004 G7 | C | No reason is shown and none is invented |
| G9 | The gear list is not paginated | `GearController` | A | Accepted at prototype scale |
| G10 | Two requests can disagree for a moment: the pack's `owned` and the gear list are read separately | Sections 6.1, 6.2 | A | Both refetch on entering the Studio and after Add gear. The gear list governs the rows; the readiness number is shown as returned (section 11.2) |
| G11 | No browser path outside the development server | FEATURE-004 section 26 | A | Unchanged limitation: `npm run preview` and a deployed build cannot load the Studio's data |

There is no class B gap. No backend change is requested by this feature.

## 8. Equipped State Ownership

### 8.1 Decision

**The loadout is session-scoped frontend state, owned by one new module, `features/loadout`, bound to the signed-in user and to one trip** (D2; final, Q2).

| Question | Answer |
|---|---|
| What a loadout is | For one user, one trail, and one trip date: a map from gear category to the id of the one owned item the user equipped in that category |
| Where it lives while the Studio is open | In `features/loadout`'s state. The gear rows and the avatar both read it; only Equip and Unequip write it |
| Where it lives across a reload | `sessionStorage`, in one key owned by `features/loadout`, holding one versioned JSON value |
| Why not the URL | A loadout is the user's personal choice of their own inventory items. It does not belong in an address that can be copied, logged, or shared (section 37) |
| Why not `localStorage` | It would outlive the sign-in session and the tab. This is not a saved-trips feature |
| Why not the query cache | It is not server state. It would be cleared and refetched by rules that do not apply to it |
| Why not the planner store | It is not planning state, and `features/planning` must not learn about gear. New Plan must not own it (section 10) |
| Why not the 3D scene | R9: the scene renders the loadout and is never its source |
| What the user is told about it | Nothing. The interface does not say that the loadout is session-only, and it never says or implies that an equipped choice is saved, kept, or permanent (Q16; the copy rule is in 16.14) |

### 8.2 Stored value

One key, `outdoor-trip-companion.loadout`, defined in exactly one file in `features/loadout`.

```ts
type StoredLoadouts = {
  version: 1
  owner: string                       // the signed-in user's Keycloak subject (sub)
  trips: Record<TripKey, StoredTripLoadout>
}

type TripKey = string                 // `${trailId.toLowerCase()}/${tripDate}`  Dockerfile.g. "3f2a…/2026-10-17"

type StoredTripLoadout = {
  equipped: Record<string, string>    // GearCategory wire value → gear item id (UUID)
  updatedAt: number                   // epoch milliseconds, used only for eviction
}
```

| Rule | Detail |
|---|---|
| Contains | The owner subject, trail ids, trip dates, category wire values, gear item ids, and a timestamp. Identifiers only |
| Never contains | An access token, a refresh token, an ID token, a raw JWT, any other claim (name, email, username), a gear item's name or description, or anything from the pack or trail responses |
| Owner | The `sub` claim as a plain string from `getAuthenticatedSubject()` (`@/features/auth`), exactly as FEATURE-003 D28 uses it. It is an identifier, not a credential; it is never displayed or logged |
| Writes | After every Equip, Unequip, and item change. Nothing is written without an owner: with no subject the loadout lives in memory only |
| Size limit | At most 20 trips. When a write would exceed it, the entries with the oldest `updatedAt` are removed first |
| Stale trips | An entry whose trip date is before today is removed when the value is read |
| Write failure | If storage is unavailable or full, the Studio keeps working in memory for the visit and reports nothing |
| Empty loadout | A trip with nothing equipped is not stored; its entry is removed |

### 8.3 Reading: the stored value is untrusted

| Check | Result when it fails |
|---|---|
| The value parses as JSON, is an object, and has `version: 1` | The whole value is discarded and the key removed |
| `owner` is a string equal to the current subject | The whole value is discarded and the key removed. Nothing from it is merged or carried over |
| `trips` is an object | The whole value is discarded and the key removed |
| A trip key has the form `<uuid>/<YYYY-MM-DD>`; its `equipped` is an object of string to string; its `updatedAt` is a number | That trip's entry is dropped. Other trips are kept |
| A category key is one of the 11 known wire values and its item id has the form of a UUID | That category's entry is dropped |

Nothing is read from storage before the current subject is known.

### 8.4 Reconciling with the inventory

A stored loadout names items by id. The inventory can change between visits (an item added through the Studio, or changed or deleted through the API), so a stored entry is confirmed against the current gear list before it counts as Equipped.

| Situation | Result |
|---|---|
| The gear list has not loaded yet | No category is shown as Equipped and the avatar wears its base outfit. The stored loadout is held, untouched |
| The gear list has loaded | For each stored entry: if an item with that id exists in the list **and** its category equals the entry's category, the category is Equipped with that item. Otherwise the entry is dropped and the corrected loadout is written back |
| The gear request failed | No gear rows are shown (16.13, S7), nothing is shown as Equipped, the avatar wears its base outfit, and the stored loadout is **not** modified. Retry repeats the request |
| An equipped item is no longer in the list | Its category returns to not equipped, silently. No error is shown: nothing the user can act on has happened |

## 9. Session, User, and Trip Isolation

| Boundary | Rule |
|---|---|
| User | One stored value has one owner. A value whose owner is missing or is not the current subject is discarded whole when read (8.3). User A's loadout is never restored for user B, in whole or in part |
| Trip | Inside the value, each loadout is keyed by trail id and trip date. The loadout for one trail and date is never shown for another trail or another date |
| A different date for the same trail | A different trip, with its own loadout, empty at first. Changing the date on Trip Preparation does not move a loadout to the new date. The loadout for the earlier date stays in the tab's storage and reappears if the user returns to that date |
| Tab | `sessionStorage` is per tab. A second tab starts with empty loadouts. This is a known limitation, not a defect |
| Sign-out | The key is removed by a cleanup registered with `registerSessionCleanup` (`@/features/auth`), and the in-memory loadout is reset |
| Session expiry | The same cleanup runs. After signing in again the loadout is empty. This matches the planner's behavior (FEATURE-003 section 16) |
| A startup that finds no session | The key is removed, as `PlannerSessionBoundary` does for the planner. A person who signs in afterwards in the same tab never sees an earlier loadout |
| No subject | Nothing is read and nothing is written. The gear and pack requests are not made (their query keys start with the subject) |
| Server state | The gear list query is keyed by subject, as the pack query already is. The existing `registerSessionCleanup(() => queryClient.clear())` stays as it is |
| Tokens | No token, JWT, or credential is stored, logged, or put in a URL by this feature. It never imports `authSession.ts` internals or `keycloak-js` |

This rule set is part of the scoped security review of the implementation (section 37).

## 10. Reload and Navigation

| Situation | Result |
|---|---|
| "Gear up" on Trip Preparation | `/trails/{id}/prepare/{date}/pack` (plus `rec` when present). The Studio |
| Reload on the Studio | Same URL. The trail, pack, and gear requests run again. The loadout is restored from session storage for the same user, trail, and date, and becomes visible on the rows and on the avatar once the gear list has loaded (8.4) |
| "Back to preparation" | Trip Preparation for the same trail and date, with `rec` kept. The loadout is kept. Trip Preparation itself shows no Equipped state |
| Browser Back from the Studio | The same as "Back to preparation" when the user came from there; otherwise wherever the history leads |
| Browser Forward to the Studio | The Studio, rebuilt as on a reload, with the same loadout |
| Direct Studio URL, signed in | Works. A valid URL is a valid trip; having pressed the call to action in this tab is not required. The loadout is whatever is stored for that user, trail, and date, or empty |
| `trailId` is not a UUID | The trail-not-found state. No trail or pack request |
| The trail does not exist (`404`) | The trail-not-found state, whatever the other requests returned |
| `tripDate` not a real date, or before today | The Studio does not render. The address is replaced (history replace) with `/trails/{id}/prepare/{tripDate as given}`, where FEATURE-004's choose-a-date state takes over. No pack request and no gear request are made from the Studio |
| `tripDate` missing (`/trails/{id}/prepare/pack`) | The Studio's route does not match, because its date segment is required. The Preparation route reads `pack` as an unusable date and shows the same choose-a-date state |
| The pack endpoint answers `400` (the server refuses the date) | The same: replaced with the Preparation address, which shows the date as unusable (FEATURE-004 S12) |
| The trip date is changed on Trip Preparation | A different trip (section 9). Opening the Studio then shows that date's loadout |
| The user plans a different trip in the planner and chooses another trail | A different trip with its own loadout. The earlier one stays in the tab's storage |
| **New Plan** in the planner | Clears the planner session as FEATURE-003 defines. **Loadouts are not cleared** (D9): a loadout is keyed by the trip's address, which stays valid after New Plan exactly as the Preparation address does (FEATURE-004 section 25), and `features/planning` imports nothing from the gear features |
| Sign-out | FEATURE-002's sign-out. The loadout key, the planner session, and the query cache are cleared |
| Session expiry on the Studio | FEATURE-002's session-expired state. The loadout is cleared (section 9). After sign-in the user lands on the same path with an empty loadout |
| Signed out, opening the Studio URL | FEATURE-002's sign-in gate. After sign-in the user lands on the Studio |
| A different user signs in, same tab | No loadout, no gear list, and no pack result from the previous user can appear (section 9) |
| The inventory changed since the loadout was stored | Reconciled (8.4) |

Rules:

- **Return destination.** `features/auth/returnDestination.ts` currently accepts `/home`, `/gear`, `/trails/<segment>`, `/trails/<segment>/prepare`, and `/trails/<segment>/prepare/<YYYY-MM-DD>`. Implementation extends its pattern, in that one file, to accept `/trails/<segment>/prepare/<YYYY-MM-DD>/pack`, validated on write and on read as today. Query strings stay excluded. This is the only change to FEATURE-002 code.
- **Route.** One route is added inside `ProtectedRoute`, outside `AppLayout`: `trails/:trailId/prepare/:tripDate/pack`. The date segment is required in this route.
- The Studio writes nothing to `localStorage`, cookies, or `history.state`. Its one `sessionStorage` key is the loadout's.
- Equip, Unequip, choosing an item, and adding gear never navigate and never reload the page.

## 11. Recommended / Owned / Missing / Equipped: Data Rules

Design is in 16.8. This section says what each row is made of.

### 11.1 Sources

| Value | Source | Never from |
|---|---|---|
| Recommended categories | `requiredGear[].category` of the pack response | A rule in the frontend. The weather thresholds are not re-derived |
| Owned items, by category | The gear list, grouped by `category` | The pack response, which has no items |
| Missing | Recommended and no owned item in the category | A stored value |
| Equipped item per category | The loadout, confirmed against the gear list (8.4) | The pack response, the gear list alone, or the scene |
| Packing readiness | `readinessPercentage`, as returned | Any calculation in the frontend |
| Item names | The gear list's `name`, rendered as text only | Storage. Names are never stored (8.2) |

### 11.2 When the two responses disagree

The pack's `owned` flag and the gear list are produced by separate requests (G10). Both run when the Studio mounts, and both are refetched after a successful Add gear.

| Rule | Detail |
|---|---|
| The rows | Owned, Missing, and the items offered for equipping come from the gear list. A category is never shown as Owned with no item to equip, or as Missing while an item for it is listed |
| The number | Packing readiness is the pack response's number, unchanged, even if it momentarily disagrees with the rows. The frontend does not correct it |
| After Add gear | The gear list and the pack recommendation are both invalidated and refetched, so the row and the number move together within one round of requests |

This is a join of two responses by category, which FEATURE-004 did not need. It is not a redefinition: the rule is the backend's own (section 6.2), and no readiness is computed.

### 11.3 Which rows exist

| Group | Contains | Order |
|---|---|---|
| Recommended for this trip | One row per distinct category in `requiredGear`. Owned or Missing | As 16.8 specifies |
| Also in your gear | One row per category in which the user owns at least one item and which is **not** in `requiredGear` | Enum order (section 6.1) |
| Not listed | A category that is neither recommended nor owned. It gets a row when the user adds an item to it (section 13) | — |
| Not listed | A gear item whose `category` is `null` (G3). It cannot be matched to a recommendation or drawn, so it cannot be equipped here. When any exist, one informational line says so, with their count and no action (16.8) | — |

- A `requiredGear` category the frontend does not know is shown as "Other gear" with its real Owned or Missing state, as FEATURE-004 section 18 does. It can be equipped when owned and has no 3D representation.
- A gear item whose category the frontend does not know is grouped under "Other gear" in the same way.
- An empty `requiredGear` shows no Recommended rows and a neutral statement (16.13); owned gear can still be equipped.
- An empty inventory shows every recommended row as Missing and no second group (16.13).

### 11.4 State combinations

| Recommended | Owned | Equipped | Row shows | Controls |
|---|---|---|---|---|
| Yes | Yes | No | Recommended · Owned · Not equipped | Equip |
| Yes | Yes | Yes | Recommended · Owned · Equipped, with the item's name | Unequip; change item when several are owned |
| Yes | No | — | Recommended · Missing | No Equip control at all (not a disabled one). Add gear |
| No | Yes | No | Owned · Not equipped | Equip |
| No | Yes | Yes | Owned · Equipped, with the item's name | Unequip; change item when several are owned |
| No | No | — | No row | — |

Every state is a word. None is conveyed by color, position, or an icon alone (section 18).

## 12. Multiple Items per Category

A user may own several items in one category, for example two rain jackets.

| Rule | Behavior |
|---|---|
| One per category | A category has at most one Equipped item per trip (R5). There are no quantities, no "bring both", and no per-item packing list |
| The selection is an item | The loadout stores the chosen item's id, never just "the category is equipped" (8.2) |
| One owned item | Equip equips that item. No choice is asked |
| Several owned items | The row always names one of them as its **current item**: at first the newest (the first in the gear list's order), afterwards whichever the user last chose with the picker of 16.9. A press of Equip equips the current item. It never opens the picker and never asks, and the item is on screen before the press |
| The current item of a category that is not equipped | View state, held in memory for the visit. It is not stored: only Equipped is (8.2). After a reload it is the newest item again |
| Changing the item | Replaces the category's entry with the other item's id. It is one action, not an Unequip followed by an Equip |
| On the avatar | Nothing changes when the item changes within a category: the 3D model represents the category, not the product (section 20). Only the item name in the row changes |
| Two items with the same name | Listed as two entries; they are told apart by position only. The backend allows this (G6) and the Studio does not rename or merge them |
| An equipped item disappears from the inventory | The category returns to not equipped (8.4). Another item of the same category is **not** substituted: that would equip something the user did not choose |

## 13. Missing Gear and Add Gear

### 13.1 The decision

FEATURE-004 left Missing rows informational because there was nowhere to send the user (its D9, G15, Q3). That is still true: `/gear` is an empty placeholder and no screen in the product can add gear. Without a way to add gear, a new user opens the Studio with every recommended category Missing and nothing to equip, and the avatar can never change.

| Option | Effect |
|---|---|
| **A.** Missing stays informational | Smallest scope. A new user cannot equip anything until gear is added through the API by hand. The Studio's central interaction cannot be reached in a demo without seeded data |
| **B.** A minimal inline Add gear | One small form, one request. Missing → Owned in place; the user can then equip it. Pulls a slice of PRD step 12 (Gear inventory) forward |

**Decision: Option B, in the minimal form below (final, Q1).**

### 13.2 Scope of Add gear (Option B)

Two entries, one request. Design is in 16.10.

| Aspect | Rule |
|---|---|
| Entry 1: on a Missing row | **Add gear**, with the category fixed to that row's category. One field: the item's name |
| Entry 2: one general entry | **Add gear you own**, after the last group. Two fields: a category chosen from the 11 categories, and the item's name |
| Why the general entry exists | Without it a user could only ever add gear the current trail happens to recommend. Trekking poles and a headlamp, two of the six categories the avatar can show (section 20), are often not recommended on a mild day, and a user who owns them could never equip them or see them on the avatar. Both entries are approved (Q1) |
| Name | Required, trimmed, 1–100 characters |
| Description | No field. The Studio never displays a description, and a second free-text field would turn a step in packing into a form about inventory |
| Request | `POST /api/users/me/gear` with `{ "name": <trimmed name>, "category": <wire value> }`. `description` is not sent. A category is always sent (G6) |
| Success (`201`) | The gear list and the pack recommendation are invalidated and refetched. The category's row becomes Owned with the new item, or the row is created in the right group. **Nothing is equipped** (R7): the user equips it as a separate, explicit action. If the category already has an equipped item, that item stays equipped and the new one is offered in the picker |
| Failure | Status-based (G7): `400` is shown as a name that cannot be used; `401` goes to FEATURE-002's session handling; anything else, a network error, or no answer within 20 seconds is a general failure with the typed values kept so the user can try again. No backend text is shown |
| Double submission | While a request is in flight the form cannot be submitted again |
| Client validation | An empty or whitespace-only name is not sent. A name longer than 100 characters cannot be entered. The general form is not sent without a category |
| Not included | Editing, renaming, deleting, describing, or listing gear for management; items without a category; brands, products, prices, links, or quantities. `PUT` and `DELETE` are never called |

The Studio does not become an inventory manager: its only inventory action is "I have one of these; call it this". The full Gear inventory (PRD step 12) remains a later feature and `/gear` remains a placeholder. One consequence is recorded as a limitation (43.4): an item added by mistake cannot be renamed or removed from inside the product until that feature exists.

## 14. Packing Readiness and Pack Completion

Design is in 16.7.

| | Packing readiness | Pack completion |
|---|---|---|
| Question it answers | How much of the recommended gear do I **own**? | How much of the recommended gear am I actually **bringing**? |
| Based on | Owned | Equipped |
| Source | `readinessPercentage` from the pack response, as returned | Counted in the frontend from the loadout and the pack response |
| Definition | The backend's: `round(owned ÷ required × 100)` | The number of recommended categories that have an Equipped item, out of the number of recommended categories |
| Introduced by | FEATURE-004 | FEATURE-005 |
| Changes when | The inventory changes | The user equips or unequips |

Rules:

- **Packing readiness is not redefined** (R10). Same source, same label, same meaning, same explanation as on Trip Preparation. It does not move when the user equips or unequips.
- Pack completion always carries a different label, a different unit, and its own explanation, so the two cannot be mistaken for each other. On screen it is a plain count labelled "Equipped for this trip", "{e} of {m}", with no percentage and no meter (16.7). "Pack completion" is this document's name for it and is not shown to the user.
- Equipped categories that are not recommended do not count toward Pack completion. They are still equipped and still shown.
- With an empty `requiredGear`, neither figure is shown (as FEATURE-004 hides readiness in that case).
- Neither figure is described as safety, fitness, weather suitability, or permission to hike. Neither has threshold colors or a celebratory treatment at its maximum (FEATURE-004 section 19).
- Pack completion is shown, as the plain count of 16.7. This is final (Q5): no second percentage and no second meter is introduced.

## 15. Preparation-Scene Relationship

Two directions were weighed. **A**: keep `preparation bg.png` as the environment and place the real-time avatar in it. **B**: a dedicated Gear Studio composition with no scene image, tied to Trip Preparation by shell, panel, type, and color.

| Test | A — avatar inside the scene | B — dedicated Studio |
|---|---|---|
| Characters on screen | Two: the pre-rendered kneeling figure (scene x 61–88%) and the avatar. The figure cannot be removed without editing or covering the image | One: the avatar |
| Where the avatar can stand | The only open zone is the one the figure and the open pack occupy (004 §14.2). Anywhere else is under the panel or on the laid-out gear | Centre of the Stage |
| Perspective | The picture's camera is near floor level. The kneeling figure already spans y 12–72% of the frame; a standing figure at that depth would be about 110% of the frame's height (est.), so a full-body avatar does not fit at the figure's depth, and further back it stands behind the pack and the gear | The camera is free of the picture (section 30); nothing to match |
| Orbit | Turning the avatar while the room stays still breaks the picture | Turning is free: the backdrop has no perspective |
| Light | Golden-hour, strongly directional, painted. A real-time avatar lit differently reads as pasted on; matching it constrains §31 for no product gain | Lighting serves gear legibility only |
| Picture gear vs user gear | The picture shows boots, a jacket, a fleece, a cap, a headlamp, poles. Beside Equip controls for the same categories, a link between a row and an object is unavoidable (forbidden by 004 §13) | No pictured gear exists |
| Suppressing the conflict | Would need a tint, blur, or large cover over the subject zone: forbidden by DS §16–17 and 004 §14.3.1 | Nothing to suppress |
| Silhouette legibility | Mid-tone, warm, busy behind the avatar at every crop (004 §14.2: no quiet region) | A controlled value range behind the avatar (16.4) |
| Crop | The image is cropped differently at 16:9, 16:10, 4:3; the avatar's anchor would move against the room | The Stage is laid out in px from the tiers |
| Cost | Compositing rules, a per-viewport anchor table, an edited or second image | Tokens and CSS only; no asset |

**Decision: B (final, Q3).** The Studio does not show or request `preparation bg.png`. The image remains the environment of Trip Preparation only, unchanged.

Why this is consistent with the product: the room says "a trip has been chosen and getting ready has begun" (004 §13.1); the Studio is where the user's own choices become visible, so the only figure and the only gear on screen must be the user's avatar and the user's equipped categories. PRD §40.3 gives Pack to real-time 3D and does not ask for a room.

Continuity Preparation → Studio → back:

| Carried over unchanged | Changes |
|---|---|
| Shell `ink` base; header items, height, position (004 §21.2) | The room is not drawn; the Studio backdrop (16.4) is |
| Panel left edge, top edge, bottom margin, radius 24px, surface `ink` at 0.88, `snow` text, strip with a back link at its start | Panel is 40–80px wider (16.3) |
| `h1` pattern: a 14/20 lead-in line over the trail name ("Preparing for" → "Gearing up for") | — |
| Packing readiness label, number, and explanation (TP9–TP11) | No meter in the Studio (16.7) |
| Owned / Missing words and icons (004 §21.13) | Rows gain controls; order is fixed (16.8) |
| The backdrop is the same family as the Preparation fallback surface (004 §14.4), which every user sees for a moment before the room fades in: `ink` with a green lift on the right | Lift is brighter and centred on the Stage |

- Preparation → Studio: ordinary route change, no exit animation. The header does not move. The panel mounts with the 004 §21.19 motion (opacity and 4px rise, 240ms). The backdrop is painted from the first frame. The avatar fades in when the viewer is `ready` (16.16).
- Studio → Preparation: 004 §13.3 applies unchanged; the room image is cached, so its fade starts at once.
- Never done: a crossfade from the pre-rendered figure to the avatar, an avatar placed where the figure knelt as a "same person" gesture, any text calling the figure the user, or any reuse of the picture's gear as icons or thumbnails.

This answers 004 Q4 as: the image is kept for Trip Preparation, not shown in Pack, and not used as the non-3D fallback (the fallback is 16.11). **PRD §40 does not mention the Preparation still; any PRD wording change is the user's.**

## 16. Gear Customization Studio: UI/UX Design

All sizes px. Tiers as 004 §21: **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279; **T** 768–1023 and below 768 are section 17. Colors are DS §8 tokens. Vocabulary shared with sections 19–34: **Stage**, viewer states `loading` / `ready` / `partial` / `unavailable`.

### 16.1 Shell and layers

Route `/trails/:trailId/prepare/:tripDate/pack`, in `TripShell`, inside `ProtectedRoute`, outside `AppLayout`.

| # | Layer (back to front) | Specification |
|---|---|---|
| 0 | Base | `ink`, `min-height: 100dvh`. Always painted |
| 1 | Backdrop | Wash and floor pool (16.4). CSS only, `position: fixed`, full viewport, `aria-hidden="true"`, `pointer-events: none`. No image is requested |
| 2 | Stage | The canvas: alpha-transparent; avatar, gear, ground-contact shadow only (16.4) |
| 3 | Interface | Header (16.2), panel (16.5), Stage chrome (16.11) |

| Property | Value |
|---|---|
| Document scroll | None from 768px wide, except the short-viewport case (17). The gear zone scrolls inside the panel |
| Horizontal scroll | Never |
| Scrims | None. No text sits on an image; the header and Stage text sit on the backdrop, whose lightest value is `conifer` (`snow` on it: 8.05:1) |
| Not used | The preparation image, any other image or video, `backdrop-filter`, text shadow, a full-frame tint, a card grid, a second panel |

### 16.2 Header

The header of 004 §21.2, unchanged: Brand, Gear, identity, Sign out; no New Plan; no entry for this screen; in normal flow; no band, border, shadow, or scrim (it sits on the `ink` base and the wash's dark outer stops). FEATURE-002's `signing-out` state applies to `main` as in 004.

### 16.3 Composition and geometry

**Panel at the left, Stage at the right.** The panel keeps the left and top edges it has on `/home` and Trip Preparation, so the call to action the user just pressed, the back link, the trail name, and the date stay where they were, and the room is replaced by the Stage. DOM order (panel, then Stage) equals reading order.

**Final (Q3b):** the controls and the panel are on the left and the real-time avatar Stage is on the right.

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Gutter | 64 | 56 | 40 | 32 |
| Header height | 72 | 72 | 64 | 64 |
| Panel width | 600 | 560 | 520 | 460 |
| Panel top | 104 | 104 | 80 | 80 |
| Panel bottom margin | 40 | 40 | 24 | 24 |
| Gap, panel to Stage | 32 | 32 | 24 | 24 |
| Stage left | gutter + panel + gap | same | same | same |
| Stage right | viewport − gutter; Stage width capped at 1160 | same | same | same |
| Stage top | header height | same | same | same |
| Under the Stage | 12, view bar 44, 8, caption 20 (= 84), then the bottom margin | same | same | same |

Panel: height follows content up to `100dvh − top − bottom margin`; anchored at its top; only the gear zone scrolls (16.5). Surface as 004 §21.10: `ink` at 0.88, radius 24, 1px transparent border, no shadow, no blur, no `overflow: hidden`.

Panel box:

| Viewport | x, y, width | Height limit | Share of viewport at the limit |
|---|---|---:|---:|
| 1920×1080 | 64, 104, 600 | 936 | 27% |
| 1440×900 | 56, 104, 560 | 756 | 33% |
| 1366×768 | 40, 80, 520 | 664 | 33% |
| 1024×768 | 32, 80, 460 | 664 | 39% |

Stage box (the canvas; section 30 frames for these aspect ratios):

| Viewport | x | y | width | height | Aspect (w ÷ h) | Share of viewport |
|---|---:|---:|---:|---:|---:|---:|
| 1920×1080 | 696 | 72 | 1160 | 884 | 1.31 | 49% |
| 1440×900 | 648 | 72 | 736 | 704 | 1.05 | 40% |
| 1366×768 | 584 | 64 | 742 | 596 | 1.24 | 42% |
| 1024×768 | 516 | 64 | 476 | 596 | 0.80 | 36% |
| 1280×800 (check) | 584 | 64 | 656 | 628 | 1.04 | 40% |
| 768×1024 (T, section 17) | 440 | 64 | 304 | 852 | 0.36 | 33% |

- Aspect range to frame for: **0.80–1.31** at the four desktop references; down to **0.36** in tier T.
- Wider than 1920: panel stays 600 on the 64 gutter; the Stage stays 1160 wide, adjacent to the panel; the rest is backdrop. Interface is not stretched.
- The Stage has no visible edge, fill, border, or radius. It is a layout box, not a card.

### 16.4 Stage and backdrop

Backdrop, tokens only:

| Part | Specification |
|---|---|
| Wash | One radial gradient on layer 1. Centre: the Stage's horizontal centre, 46% of the Stage's height. Radii: horizontal `min(0.62 × Stage width, 620px)`, vertical `0.62 × Stage height`. Stops: `conifer` 0%, `conifer-deep` 35%, `conifer-press` 62%, `ink` 100% and beyond. It reaches `ink` before any viewport edge that has interface on it |
| Floor pool | One radial gradient ellipse. Centre: Stage x 50%, y 86% (the ground line). Width `min(0.56 × Stage width, 520px)`, height `0.16 ×` its width. Stops (closest-side): `snow` at 0.14 at 0%, `snow` at 0.06 at 55%, transparent at 100%. It gives the ground-contact shadow something lighter to read against. No horizon line, no grid, no wall, no props |
| Behaviour | Static. Same in every viewer state, with reduced motion, and when 3D is unavailable. It never changes with equipped gear, weather, or trail |
| Meaning | A quiet studio wall and floor. It depicts nothing and is never described |

Canvas:

| Property | Value |
|---|---|
| Element | One `canvas` filling the Stage box. `aria-hidden="true"`, not focusable, no `tabindex`, no key handlers |
| Pointer | Horizontal drag turns the avatar (16.11). `cursor: grab`; `grabbing` while dragging. `touch-action: pan-y`. Wheel and pinch are **not** captured: scrolling over the Stage behaves as anywhere else |
| Not interactive | No click, hover, or selection on the avatar or its gear. No tooltip, outline, or highlight on a body part |
| Visibility | Opacity 0 until `ready` or `partial`, then 16.16 |

UI ↔ viewer contract (product-facing; the exact types are in section 28.3):

| Direction | Contract |
|---|---|
| UI → viewer | The set of equipped **categories** among the six avatar-visible ones. Never an item id, name, or description: the canvas cannot show the user's exact product |
| UI → viewer | View commands: turn left, turn right, reset. Motion flags: paused; reduced motion |
| Viewer → UI | Viewer state: `loading`, `ready`, `partial`, `unavailable`; for `unavailable`, whether retrying can help (not the cause's name) |
| Viewer → UI | Per avatar-visible category that is equipped, a display status: `shown`, `covered` (hidden by the layer rule of section 20.4), `loading` (its model is still arriving), or `not-shown` (its model failed). Row notes (16.8) and announcements (18) are driven by this, not guessed in React |

What the design requires of the viewer and the assets. Sections 19, 24.4, 29.3, and 30 meet all six:

| # | Requirement | Why |
|---|---|---|
| R1 | At the default view the ground-contact centre is at Stage x 50%, y 86% ± 2%, and stays there while turning | The floor pool is DOM |
| R2 | Avatar plus all six gear models stay inside the Stage inset by 24px at every turn angle, at every aspect of 16.3 | No clipping at the box edge; no overlap with the view bar |
| R3 | From the default view, equipping any one of the six categories produces a visible change without turning; the backpack must be fully inspectable by turning | "My gear choices visibly change the character" (PRD §51) |
| R4 | Each gear model is distinguishable from the base outfit and from a backdrop between `ink` and `conifer` by shape and value, not hue alone | Legibility; forced colors and color-vision differences |
| R5 | Gear appears and disappears as a cut, within 240ms: no fade, bounce, spin, scale-pop, or camera move (section 29.3 says why not a fade) | DS §20 |
| R6 | The camera never moves by itself, including on equip | User control; reduced motion |

### 16.5 Panel anatomy

Four zones, top to bottom. Only the gear zone scrolls.

| Zone | Size | Content |
|---|---|---|
| Strip | Min-height 44; padding 0 12; 1px bottom rule, `snow` at 0.16 | At the start: a link to Trip Preparation for the same trail and date: 16px `ArrowLeft`, 8, label GS1. `snow`, 14/20, weight 600, 44px hit box. The end is empty |
| Trip block | Padding 16 24; 1px bottom rule | 16.6 |
| Pack summary | Padding 12 24; 1px bottom rule | 16.7 |
| Gear zone | Fills the rest; `min-height: 0`; `overflow-y: auto`; `overscroll-behavior: contain`; padding 16 24 24; thin scrollbar, thumb `snow` at 0.40 | Gear groups (16.8), the general Add gear entry (16.10); or a loading or failure block (16.13). A named, focusable scroll region (18) |

Fixed zones take about 283px (298 at S, where TP11 wraps) (est.). Gear zone height at the limit (est.): 649 at 1920×1080, 473 at 1440×900, 381 at 1366×768, 361 at 1024×768. A typical list (group header 98, three Owned rows at 108, two Missing rows at 84 = 590) fits without scrolling at 1920×1080 and scrolls at the other three.

No `paper` card is placed in the panel. Rows are text, rules, and controls on one surface.

### 16.6 Trip block

| Part | Specification |
|---|---|
| `h1` | Two lines in one heading, as 004 §21.11. Line 1: "Gearing up for", `snow`, 14/20, weight 600. Line 2, 2px below: the trail name, `snow`, 28/34 (XL) or 24/30 (other tiers), weight 600, letter-spacing −0.01em, wraps, `overflow-wrap: anywhere`, never truncated. Read as one phrase (GS2). `tabindex="-1"` |
| Name source and skeleton | As 004 §21.11 (trail request, else the pack response's `trailName`, else GS3) |
| Trip line | 4px below. One wrapping line, `snow`, 14/20: the trip date in the "Sat, Oct 17" wording (weight 600), then difficulty · distance · elevation gain · duration, joined by " · ", in 004's formats. The date is preceded by visually hidden "Trip date: ". Missing facts are dropped with their separators; the date is always present |
| Date | **Read-only text.** No date control, popover, or message slot exists in the Studio. To change the date the user follows GS1 and changes it on Trip Preparation |
| Forecast | Not repeated in the Studio |

### 16.7 Pack summary

Two measures, deliberately unlike each other in label, unit, and source. A `dl` with two entries, 8px apart.

```text
Packing readiness                                        60%
Counts how many of the recommended gear categories you own.

Equipped for this trip                                 2 of 5
Counts the recommended categories you've equipped. Plus 1 other category.
```

| | Packing readiness | Equipped for this trip ("Pack completion" in section 14) |
|---|---|---|
| Meaning | Owned ÷ recommended | Recommended categories the user has equipped |
| Source | `readinessPercentage` as returned. Never computed in React | Client equipped state (§8) |
| Label (`dt`) | TP9, `snow`, 14/20, weight 600 | GS9, same style |
| Value (`dd`), end of the label's row | "{n}%" (TP10), `snow`, 20/28, weight 700, tabular numerals | "{e} of {m}" (GS10), same style. A count, never a percentage |
| Caption, 0px below | TP11, `snow`, 14/20, weight 400 | GS11; GS12 appended when other categories are equipped |
| Changes when | The pack request returns a new number (after Add gear) | Every Equip / Unequip |
| Graphic | None | None |

Decision: **no second percentage and no meter in the Studio.** Two meters or two percentages side by side would be read as the same quantity. A percent sign means "owned"; "n of m" means "equipped". The visible label never contains "ready", "complete", or "completion": a full count is not a judgement that the user is prepared.

- `{m}` is the number of recommended categories; `{e}` the number of those that are equipped. Equipped categories from "Also in your gear" are reported only by GS12.
- No state at any value: no color change, icon, badge, or message at 0 of m or m of m.
- Nothing recommended (S10): the Packing readiness entry is absent (as 004 S14); the second entry's value is GS13 and its caption GS14.
- While the pack request refreshes after Add gear, the previous percentage stays on screen; it is replaced when the new one arrives. No spinner on the number.
- The summary is absent in S1–S7.

### 16.8 Gear groups and rows

The gear zone is a list of categories the user acts on. It is not a table, not a checklist, and not a form: no checkboxes, switches, column headers, quantity fields, sorting, or filters.

Groups:

| Group | Contains | Rendered |
|---|---|---|
| "Recommended for this trip" (GS15) | Every `requiredGear` category | Always (S10 shows GS32 in place of rows) |
| "Also in your gear" (GS20) | Every category the user owns an item in that is not recommended | Only when it has at least one row |

A category that is neither recommended nor owned has no row; the general Add gear entry (16.10) is how it gets one.

Group header: `h2`, `snow`, 16/24, weight 600; 2px below, a description in `snow`, 14/20, weight 400 (GS16, GS21). Groups are 24px apart. In S14 the forecast caveat TP17 follows GS16 in 004's caveat style.

Shortcut slot (first group only): 8px below the description, a box with min-height 36 that always holds exactly one of:

| Condition | Content |
|---|---|
| At least one recommended category is owned and not equipped | A secondary button on the panel (16.15), label GS17 |
| Every recommended category the user owns is equipped | Sentence GS18, `snow`, 14/20, with a 16px `Check` icon |
| The user owns no recommended category | Sentence GS19, `snow`, 14/20 |

The shortcut is kept (final, Q6). It is one explicit press, its label says exactly what it does, it never runs by itself, and it equips only categories that are both Recommended and Owned, each with the item its row is showing. Because the slot keeps its height, nothing below it moves when the button turns into a sentence. There is no "Unequip all".

Row order: backend enum order within each group, **fixed**. A row never moves when its state changes (unlike Preparation's Missing-first order: here rows hold controls, and a control that moves under the pointer or the focus is worse than an unsorted list).

Row anatomy (`li`; padding 12 0; 1px top rule, `snow` at 0.16, first row included):

```text
Backpack  [✓ Equipped]                              [ Unequip ]
(✓) Owned · Osprey Talon 33                           Change ⌄
On your avatar as a backpack.

Rain gear                                             [ Equip ]
(✓) Owned · Patagonia Torrentshell
Shows on your avatar as a rain shell.

Warm layer                                         [ Add gear ]
( ) Missing · Add it to your gear to equip it.
```

| Line | Start | End |
|---|---|---|
| 1, min-height 36 | Category label: `h3`, `snow`, 16/24, weight 600 (the 004 labels). 8px after it, the Equipped tag when equipped | The row's action: Equip, Unequip, or Add gear |
| 2, 4px below | Ownership state (icon, 6, word), then " · ", then the item name or GS24 | "Change" disclosure, only with two or more owned items (16.9) |
| 3, 4px below; owned rows only | Avatar note: 16px icon, 8, sentence; `snow`, 14/20, weight 400 | — |

How each concept appears. All four are always separately readable; none is a color.

| Concept | Carrier |
|---|---|
| Recommended | The group the row is in, named by its `h2` |
| Owned | Line 2: 18px `CircleCheck`, the word "Owned", weight 600; then the item name, weight 400, wraps, never truncated |
| Missing | Line 2: 18px `CircleDashed`, the word "Missing", weight 600; then GS24. The row has no Equip control and no note; its action is Add gear |
| Equipped | The tag on line 1: fill `snow`, text `ink`, 14/20, weight 600, radius 6, padding 2 8, a 14px `Check` before the word "Equipped"; 1px transparent border. And the action reads "Unequip". Not equipped = no tag and the action reads "Equip" |

An equipped row therefore shows "Owned" **and** "Equipped" at once; an owned, unequipped row shows "Owned" only. The Equipped tag is the only filled shape in a row.

Equip / Unequip:

| Property | Value |
|---|---|
| Element | One `button` per owned row. Its label is the action it performs: GS25 "Equip" or "Unequip". No `aria-pressed` (18) |
| Style | Secondary button on the panel (004 §21.17): no fill, 1px solid `snow` border, `snow` 14/20 weight 600, radius 10, padding 0 14, 36 tall (44 on a coarse pointer), min-width 96 so the two labels occupy the same box. No icon. Equip and Unequip look alike; the tag and the word carry the state |
| Equip | Equips the item named on line 2. Immediate, no request, no loading state. Tag appears, label becomes "Unequip", note changes, summary count changes, the viewer is told, the change is announced (18). Focus stays on the button |
| Unequip | The reverse. The item named on line 2 stays the row's item |
| One per category | Structural: a row has one item on line 2 and one action. Changing the item is 16.9 |
| Disabled | Never. A Missing row has no Equip button rather than a disabled one |
| 3D state | Works identically in `loading`, `partial`, `unavailable`, and with no viewer at all |

Avatar note (line 3). `{visual}` is the generic model's plain name, from section 20.1: Backpack "a backpack", Rain gear "a rain shell", Warm layer "a warm jacket", Hiking footwear "hiking boots", Trekking poles "trekking poles", Headlamp "a headlamp".

| Case | Icon | Note |
|---|---|---|
| Avatar-visible, not equipped | `PersonStanding` | N1 "Shows on your avatar as {visual}." |
| Avatar-visible, equipped, status `shown` | `PersonStanding` | N2 "On your avatar as {visual}." |
| Avatar-visible, equipped, status `covered` | `EyeOff` | N3 "Worn under your rain shell. Only its collar shows on the avatar." (section 20.4) |
| Avatar-visible, equipped, status `not-shown` (`partial`) | `EyeOff` | N4 "Equipped. It can't be shown on the avatar right now." |
| Avatar-visible, equipped, viewer `loading` or that category's status `loading` | `PersonStanding` | N5 "Equipped. It appears when your avatar has loaded." |
| UI-only, not equipped | `EyeOff` | N6 "The avatar doesn't show this category." |
| UI-only, equipped | `EyeOff` | N7 "Coming with you. The avatar doesn't show this category." |
| No avatar (viewer `unavailable`, or below 768px), equipped, any category | — | N8 "Coming with you." Not equipped: no note |

- "as {visual}" states in every visible row that the avatar wears a generic stand-in for the category: a Rain gear item named "Patagonia Torrentshell" is shown "as a rain shell", and the row keeps the user's own item name beside it.
- UI-only rows have the same label weight, the same tag, the same button, the same position rules, and count the same in 16.7. Their only difference is the note's sentence.
- No per-category icon, thumbnail, product image, brand mark, price, link, or shop action anywhere in a row.
- Items with `category: null` cannot be matched to a row. When any exist, one line follows the last group: GS23, `snow`, 14/20, with a 16px `Info` icon. No action.

### 16.9 Item picker for multiple owned items

**A plain press of Equip always equips the item named on the row's line 2.** With several owned items that is the row's *current item*: initially the newest (first in the inventory order returned), afterwards whichever the user last chose. Equip never opens the picker and never asks. The item is on screen before the press, so the choice is never blind; the picker is how it is changed.

| Owned items in the category | Line 2 | Picker |
|---|---|---|
| 1 | The item's name, static text | None |
| 2 or more | The current item's name | A "Change" disclosure at the end of line 2 |

| Part | Specification |
|---|---|
| Disclosure | `button`, label GS26 "Change", 14px `ChevronDown` after it (`ChevronUp` when open); `snow`, 14/20, weight 600; no border; 32 tall (44 coarse), padding 0 8; `aria-expanded`, `aria-controls`. Accessible name GS27 |
| List | Opens in the row, 8px under line 3, pushing later rows down. Not a popover, menu, or native `select`: it cannot be clipped by the scroll region and long names wrap. A `fieldset` with a visually hidden `legend` (GS28) holding one native radio per owned item, in inventory order |
| Option | Min-height 36 (44 coarse); an 18px ring (1.5px `snow`), selected = the ring with an 8px solid `snow` dot; 10px; the item name, `snow`, 14/20, weight 400 (600 when selected), wraps fully. The whole option is the label |
| Choosing | Applies at once; no confirm button. Line 2 shows the new name. The list stays open |
| If the category is equipped | The equipped item switches A → B. Tag, button, note, count, and avatar do not change. Announced as an item change with "the avatar looks the same" (18) |
| If not equipped | Only the current item changes. Nothing is equipped |
| Closing | The disclosure again, or Escape from inside the list (focus returns to the disclosure). Opening another row's list or an Add gear form closes it |
| Keyboard | Tab to the disclosure; Enter or Space opens; Tab enters the radio group (one tab stop); arrow keys move and choose; Escape closes |
| Not shown | Item descriptions, dates, ids, counts per item. Two items with the same name appear as two identical options |

### 16.10 Add gear

**Decision (final, Q1): both entries** — Add gear on each Missing row with the category fixed, plus one general entry with a category chooser. Reason: Trekking poles and Headlamp are two of the six avatar-visible categories and may never be recommended on a mild-day trail; without the general entry a user who owns them could never put them on the avatar, and a new user's Studio would be limited to whatever one trail happens to recommend. The general entry adds one button and one `select`; it adds no list, edit, or delete.

| | Row form | General form |
|---|---|---|
| Opened by | "Add gear" (AG1), the action of a Missing row; `aria-expanded` | "Add gear you own" (AG2): a secondary button on the panel with a 16px `Plus`, 24px after the last group (and after GS23) |
| Opens | In the row, 12px under line 2 | In place, 12px under the button |
| Category | Fixed to the row. Not a field. Stated in the helper (AG4) | A native `select` (AG6) with the eleven labels in enum order and a disabled first option AG7. Required |
| Fields | Item name | Category, then Item name |
| Description field | None. The row shows names only; a second field would make this a form about inventory, not a step in packing | None |

Form parts (one column, 12px apart; the form has no box, fill, or border of its own):

| Part | Specification |
|---|---|
| Group | `form`, named AG15 |
| Item name | Visible `label` AG3, `snow`, 14/20, weight 600; 6px; a text input: 44 tall, radius 10, no fill, 1px solid `snow` border, text `snow` 16/24, padding 0 12, caret `snow`, `maxlength="100"`, `required`, `autocomplete="off"`, no placeholder |
| Category `select` | Same box as the input, with a 16px `ChevronDown` at its end |
| Helper | 6px below the name: AG4 (row) or AG5 (general), `snow`, 14/20, weight 400; the input's `aria-describedby` |
| Actions | 12px below: the submit, an on-panel primary (16.12 recipe: fill `paper`, label `ink`, 14/20 weight 600, 40 tall, 44 coarse, radius 10, padding 0 16), label AG8; 8px; Cancel, a secondary button on the panel, label AG10 |
| Field error | Replaces the helper: 16px `CircleAlert`, 8, sentence, `snow`, 14/20, weight 600; the field's border becomes 2px solid `snow`; `aria-invalid="true"`. `ember` is not used on the panel |
| Request error | Above the actions: 16px `CircleAlert`, 8, sentence; `role="alert"` |

| Event | Behaviour | Focus |
|---|---|---|
| Open | Any open picker or other Add gear form closes; text typed in it is discarded | Item name (row form); Category (general form) |
| Submit, name empty or only spaces | AG11 on the name | The name input |
| Submit, no category (general) | AG12 on the category | The category |
| Submit, valid | Saving: submit shows `LoaderCircle` and AG9, `aria-disabled="true"`, cursor `progress`; fields read-only; Cancel `aria-disabled`. One request; a second press is ignored | Stays on the submit |
| Success | The form closes. The row becomes Owned with the new name on line 2 and an Equip button; **it is not equipped**. A general-form item creates its row in the right group, or becomes the current item of an existing unequipped row; if that category is equipped, the equipped item is unchanged and the new item appears in the picker. Packing readiness follows when the pack request returns | The row's Equip button (Unequip if the category is already equipped) |
| Failure | AG13, AG14, or AG16 as the request error. Typed values kept. Fields editable again | Stays on the submit |
| Cancel, or Escape inside the form | Closes; values discarded | The button that opened it |

Out of scope and never shown here: editing or deleting an item, a list of all items, descriptions, quantities, photos, brands, shopping links.

### 16.11 Stage chrome

Everything the Stage shows besides the canvas. All text is `snow` on the backdrop (lightest value behind it `conifer`: 8.05:1); none sits on the floor pool or over the canvas.

| Part | Specification |
|---|---|
| View bar | A centred row, 44 tall, 12px under the Stage. Rendered only in `ready` and `partial`. Its space is reserved in every state, so the Stage box never changes size when it appears |
| Turn left, Turn right | Two icon buttons, circles (DS §14), 40 (44 coarse), 8 apart: `ChevronLeft`, `ChevronRight`, 18px. Quiet-control recipe (004 §14.3.3): fill `ink` at 0.72, 1px solid `snow` border, `snow` icon. Names ST6; `title` the same. Each press turns the avatar one step of 30° (section 30.2). Turn left swings the avatar's front toward the left edge of the Stage |
| Reset view | 12px after. A pill, 40 tall (44 coarse), padding 0 14, same recipe, label ST7, 14/20, weight 600. Always enabled; at the default view it changes nothing |
| Pause motion | 8px after. Same pill; 16px `Pause` or `Play` icon, 6, label ST8 or ST9. Rendered only when an idle loop exists and motion is allowed (below) |
| Caption | 8px under the view bar, centred, `snow`, 14/20, weight 400, min-height 20: ST3. Rendered with the view bar. It may wrap; the Stage gives up the height |
| Drag hint | None as text. Dragging is signalled by the `grab` cursor and is never the only way to turn: the two buttons do the same |

Camera: the UX decisions (section 30 holds the limits and numbers; final, Q4):

| Question | Decision |
|---|---|
| (a) Horizontal orbit by drag | Yes. Horizontal only, fixed pitch, a full turn. No vertical tilt, no pan, no inertia that keeps the avatar spinning after release |
| (b) Zoom | **None in this feature.** The default view is full-body and shows all six categories (R3). Wheel zoom would hijack scrolling beside a scrolling panel; pinch and keyboard zoom add a control matrix for little gain; zoom would also move the ground line off the DOM floor pool (R1) |
| (c) Reset view | Yes, visible, labelled, always in the view bar |
| (d) Keyboard | Through the three buttons, which are ordinary tab stops. The canvas is not focusable and has no key bindings: no arrow-key orbit, no WASD, nothing to discover |
| (e) Cursor / affordance | `grab` / `grabbing` over the canvas; default arrow elsewhere on the Stage; pointer on buttons. No on-canvas gizmo, ring, or arrows |

Idle animation and Pause: a breathing loop runs for longer than five seconds beside other content, so DS §23 (and the pause/stop/hide rule it implements) applies to it as it does to video. **A Pause control is required whenever the loop exists.** Pausing holds the pose; the state lasts for the visit to the screen and is not stored. Under `prefers-reduced-motion: reduce` the loop never runs and the control is not rendered. If the idle loop is dropped (section 32), the control is not rendered.

Viewer states:

| State | Stage | View bar and caption | Rows |
|---|---|---|---|
| `loading` | Backdrop only. Centred at Stage x 50%, y 46%: three 6px `snow` dots (004 S9's indicator), 10, ST1 in `snow`, 16/24. After 10s: SH7 | Not rendered | Fully usable. Equipped visible categories show N5 |
| `ready` | The canvas | Rendered | N1–N3, N6, N7 |
| `partial` | The canvas, with whatever loaded | Rendered. Above ST3, one more caption line: 16px `Info`, 8, ST2 | Affected equipped rows show N4; the others as `ready` |
| `unavailable` | No canvas. A block, max-width 420, centred at Stage x 50%, y 46%, start-aligned: 20px `Info`; 12; ST4 (or ST5 when retrying cannot help), `snow`, 16/24; 16; the loadout text (18), visible, `snow`, 16/24; and, when retrying can help, 16 below, a Retry button (quiet pill, `RotateCcw`, SH3) | Not rendered | Fully usable. Equipped rows show N8; unequipped rows no note |

In no state is a gear control disabled, hidden, or delayed by the viewer. No state names WebGL, a model file, a library, or an error code.

### 16.12 The call to action on Trip Preparation

The single FEATURE-005 addition to Trip Preparation, in the position 004 §21.18 reserved.

| Property | Value |
|---|---|
| Element | An `a` to the Studio for the same trail and date (plain navigation; no request, no dependency) |
| Label | **PC1 "Gear up"**, then 8px, an 18px `ArrowRight`. Chosen over the earlier working label "Customize my pack": PRD §24 names this step "Gear up"; "pack" is also a row (Backpack); "customize" is configurator language; and at 16/24 the longer label does not fit beside the date control in the 372px content width at 1024px (est.). The label is final (Q12) |
| Position | The end of the date row in the trip block: date control at the start, the action at the end, at least 12px between. The row's height (44) does not change |
| Geometry | As Choose this trail (004 §21.8): 44 tall, radius 12, padding 0 20, label 16/24 weight 600. Compact rounded, not a pill |
| Color — **resolution of 004 Q11** | **On-panel primary: fill `paper`, label and icon `ink`** (16.04:1; edge against the panel 11.3:1). `conifer` stays off the panel: against it `conifer` is about 1.5:1, and a `conifer` fill with a `snow` edge would be indistinguishable from the panel's secondary buttons (no fill, `snow` edge). One recipe for every primary action on the `ink` panel; in this feature that is this link and the Add gear submit |
| Hover / active | Fill `paper` under `ink` at 0.08 (rgb 228, 228, 222) / at 0.16 (rgb 209, 210, 206), over `--duration-fast` |
| Focus-visible | Focus ring (DS §18) |
| Disabled / loading | None. It is never disabled |
| Rendered | Only when the pack request has succeeded (004's state numbers): with rows, in S13, S14, and S15. Not rendered (no placeholder, no disabled form) in 004's S2, S8, S9, S10, S11, S12. It appears with the briefing (opacity, 240ms) and does not take focus |
| Tab order | After the trip-date control (and its popover), before the briefing region |
| Below 1024px | The row may wrap; the action then takes the full row width under the date control |

FEATURE-004 statements this changes (also listed in section 4.3): §13.2 "Primary action: None in FEATURE-004"; §21.10 "The date popover is the only `paper` surface on the screen"; §23.2 Preparation tab order; §21.16's never-used word list ("equipped" is used throughout FEATURE-005; "packed", "buy", "ready to go", "all set", "safe" remain unused).

### 16.13 Screen states

"Focus" = where focus goes when the state is entered; "stays" = not moved. The viewer's state is independent of the data states: S15–S18 combine with S8–S14.

| # | State | Layout | Copy | Focus |
|---|---|---|---|---|
| S1 | Loading: the pack or the gear inventory is not yet known | Strip and trip block (skeleton name if unknown). No summary. Gear zone: waiting dots and text, min-height 136. The viewer may already be loading (S15) | GS7; after 10s SH7 | The `h1` |
| S2 | Trail not found | Panel holds one block, no strip: `h1`, text, a link to `/home` styled as a secondary button (as 004 Preparation S2). Backdrop only; the viewer is not started | SH5, SH6, SH1 | The `h1` |
| S3 | Date missing, not a date, or before today | Not drawn by the Studio. The address is replaced with the Preparation address (section 10), where FEATURE-004's choose-a-date state (its S8) takes over. The viewer is not started | FEATURE-004's TP3 or TP4 | FEATURE-004 |
| S4 | Pack request failed | Gear zone: `CircleAlert`, text, Retry (secondary on the panel). No summary, no rows | TP7, SH3 | Stays |
| S5 | Pack request timed out | As S4 | TP8, SH3 | Stays |
| S6 | Date refused by the pack request (`400`) | As S3: the address is replaced with the Preparation address, which shows the date as unusable (FEATURE-004 S12) | FEATURE-004's TP5 | FEATURE-004 |
| S7 | Gear inventory request failed (pack known) | As S4. No rows are shown: without items nothing can be equipped, and static Owned / Missing rows are Trip Preparation's job | GS8, SH3 | Stays |
| S4 / S5 / S7, Retry | The button shows its working state. On success the content replaces the block | SH4 | Stays on Retry; on success the first group's `h2` (`tabindex="-1"`) |
| S8 | Empty inventory | Every recommended row is Missing with Add gear. Slot: GS19. Summary: "0%" and "0 of {m}". No second group. Add gear you own is present. No warning treatment | — | The `h1` |
| S9 | All recommended Missing, other gear owned | As S8, plus "Also in your gear" | — | The `h1` |
| S10 | Nothing recommended | First group: header, description, GS32 in place of slot and rows. Summary: no Packing readiness entry; second entry in its GS13 / GS14 form. Second group as normal | GS32 | The `h1` |
| S11 | Nothing equipped (the state on first entry) | No tags. "0 of {m}". The avatar wears its base outfit. No prompt, banner, or empty-state art | — | The `h1` |
| S12 | Some equipped | Tags on those rows; count | — | Stays |
| S13 | Every recommended category equipped, or every owned one | Slot: GS18. Count may read "{m} of {m}". Nothing else: no success color, icon, message, or animation | GS18 | After the shortcut: the slot sentence (`tabindex="-1"`) |
| S14 | Pack returned without weather | Caveat under the first group's description | TP17 | Stays |
| S15 | Viewer `loading` | 16.11 | ST1, N5 | Stays |
| S16 | Viewer `ready` | 16.11 | ST3 | Stays |
| S17 | Viewer `partial` | 16.11 | ST2, N4 | Stays |
| S18 | Viewer `unavailable` | 16.11 | ST4 or ST5, loadout text, N8 | Stays. If Retry succeeds, the Retry button is removed and focus moves to Reset view |
| S19 | Add gear saving | 16.10 | AG9 | Stays on the submit |
| S20 | Add gear failed, timed out, or refused | 16.10 | AG13, AG14, AG16 | Stays on the submit |
| S21 | Add gear field invalid | 16.10 | AG11, AG12 | The invalid field |
| S22 | Packing readiness refreshing after Add gear | Previous number stays, then is replaced. If the refresh fails, the previous number stays and nothing is shown: the row is already Owned and the user can equip it | — | Stays |
| S23 | Uncategorised items exist | GS23 after the last group | GS23 | Stays |
| S24 | Session ended | FEATURE-002's handling. Nothing drawn by this feature | — | FEATURE-002 |

Rules for every state: the header, Sign out, and GS1 stay usable; no full-screen spinner; no control is disabled unless it is itself working; no text outside 16.14 is shown.

### 16.14 Copy deck

Every user-facing string of the Studio and of the Preparation call to action. `{…}` is a value. Reused 004 strings are referenced, not repeated: SH1, SH3–SH7, TP7–TP11, TP16, TP17, and the eleven category labels (TP15).

| Id | Where | Text |
|---|---|---|
| PC1 | Call to action on Trip Preparation | "Gear up" |
| GS1 | Strip link | "Back to preparation" |
| GS2 | `h1` | "Gearing up for {trail name}" |
| GS3 | `h1`, name not known | "Gearing up for your trip" |
| GS4 | Trip line | "{Sat, Oct 17} · {difficulty} · {distance} · {elevation gain} · {duration}"; hidden prefix "Trip date: " |
| GS5 | Summary heading (visually hidden `h2`) | "Pack summary" |
| GS6 | Name of the gear scroll region | "Gear choices" |
| GS7 | S1 | "Loading your gear…" |
| GS8 | S7 | "Your gear couldn't be loaded just now. Try again in a moment." |
| GS9 | Summary, second label | "Equipped for this trip" |
| GS10 | Its value | "{e} of {m}" |
| GS11 | Its caption | "Counts the recommended categories you've equipped." |
| GS12 | Appended to GS11 when other categories are equipped | "Plus 1 other category." / "Plus {x} other categories." |
| GS13 | Its value in S10 | "1 category" / "{x} categories" |
| GS14 | Its caption in S10 | "Nothing is recommended for this trip, so this counts everything you've equipped." |
| GS15 | First group heading | "Recommended for this trip" |
| GS16 | Its description | "A recommendation is a suggestion. You decide what to equip." |
| GS17 | Shortcut | "Equip recommended gear I own" |
| GS18 | Slot, all owned ones equipped | "All the recommended gear you own is equipped." |
| GS19 | Slot, none owned | "You don't own any of the recommended gear yet." |
| GS20 | Second group heading | "Also in your gear" |
| GS21 | Its description | "Not recommended for this trip. You can still equip it." |
| GS22 | State words | "Owned" · "Missing" · "Equipped" |
| GS23 | Uncategorised items | "1 item in your gear has no category, so it can't be equipped here." / "{u} items in your gear have no category, so they can't be equipped here." |
| GS24 | Missing row, line 2 | "Add it to your gear to equip it." |
| GS25 | Row action | "Equip" · "Unequip" (accessible names: "Equip {category}" · "Unequip {category}") |
| GS26 | Picker disclosure | "Change" |
| GS27 | Its accessible name | "Change {category} item. {k} owned." |
| GS28 | Picker legend | "{category} item" |
| GS32 | S10 | TP16: "No specific gear is recommended for this trail on this date." |
| N1–N8 | Row notes | 16.8 |
| AG1 | Missing row action | "Add gear" (accessible name: "Add gear: {category}") |
| AG2 | General entry | "Add gear you own" |
| AG3 | Field label | "Item name" |
| AG4 | Helper, row form | "Saved to your gear as {category}. Up to 100 characters." |
| AG5 | Helper, general form | "Saved to your gear. Up to 100 characters." |
| AG6 | Field label | "Category" |
| AG7 | First option | "Choose a category" |
| AG8 | Submit | "Add to my gear" |
| AG9 | Submit, saving | "Adding…" |
| AG10 | Cancel | "Cancel" |
| AG11 | Name empty | "Enter a name for this item." |
| AG12 | No category | "Choose a category." |
| AG13 | Request failed | "This item couldn't be added just now. Try again." |
| AG14 | Request timed out | "That took too long, so we stopped waiting. Try again." |
| AG15 | Form name | "Add {category} to your gear" / "Add gear you own" |
| AG16 | Request refused | "That name can't be used. Change it and try again." |
| ST0 | Stage heading (visually hidden `h2`) | "Your avatar" |
| ST1 | Viewer `loading` | "Loading your avatar…" |
| ST2 | Viewer `partial` | "Some gear can't be shown on the avatar right now. Your choices are unchanged." |
| ST3 | Caption | "Generic gear models, not your exact items." |
| ST4 | Viewer `unavailable`, retry can help | "The 3D avatar isn't available right now. You can still choose your gear." |
| ST5 | Viewer `unavailable`, retry cannot help | "The 3D avatar can't be shown in this browser. You can still choose your gear." |
| ST6 | Turn buttons | "Turn left" · "Turn right" |
| ST7 | Reset | "Reset view" |
| ST8 / ST9 | Motion control | "Pause motion" / "Play motion" |
| ST10 | Loadout text, nothing equipped | "Nothing is equipped. The avatar wears its base outfit." |
| ST11 | Loadout text, shown | "On your avatar: {list of visuals}." |
| ST12 | Loadout text, not shown | "Equipped, not shown on the avatar: {list of category labels}." |
| ST13 | Loadout text, no avatar | "Equipped: {list of category labels}." / "Nothing is equipped yet." |
| ST14 | Below 768px, above the loadout text | "The 3D avatar is shown on larger screens." |
| ST15 | Name of the view-control group | "Avatar view" |
| DT4 | Document title | "{trail name} · Gear up · Outdoor Trip Companion"; without a name: "Gear up · Outdoor Trip Companion"; S2: DT3 |

Announcement strings are in section 18. Words the Studio's own copy never uses: "ready", "ready to go", "all set", "complete", "completion", "safe", "good to go", "perfect", "great", "saved" for an equipped choice, "your jacket" / "your boots" for a model, "buy", "shop", "price", any brand, "level", "stats", "slot", "loadout" ("loadout" is this document's word for the ST10–ST13 text; the screen says "equipped"). Nothing in the copy says that equipped choices last only for this session, and nothing says or implies that they are saved, kept, or remembered (Q16).

### 16.15 Interaction states

Color and fill changes take `--duration-fast`. Focus ring: DS §18 on `:focus-visible`, no transition. Buttons and links use the pointer cursor.

| Element | Default | Hover (fine pointer) | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| Header items | 004 §21.17 | same | Focus ring | same | same | same |
| Back to preparation | `snow`, no fill | Underline 2px, offset 4px | Focus ring | Fill `snow` at 0.12, radius 8 | Never | — |
| Gear up (Preparation); Add to my gear | Fill `paper`, `ink` label | `paper` under `ink` at 0.08 | Focus ring | `paper` under `ink` at 0.16 | Gear up: never. Submit: only while saving | Submit: `LoaderCircle`, AG9, `aria-disabled="true"`, cursor `progress` |
| Equip, Unequip, shortcut, Add gear, Add gear you own, Cancel, Retry (panel) | No fill, 1px solid `snow`, `snow` label | Fill `snow` at 0.12 | Focus ring | Fill `snow` at 0.20 | Cancel while saving (`aria-disabled`). Others never | Retry: 004 §21.17 |
| Change (disclosure) | `snow` text and chevron, no fill | Underline 2px, offset 4px | Focus ring | Fill `snow` at 0.12, radius 8 | Never | — |
| Picker option | Ring; name weight 400 | Fill `snow` at 0.12 across the option, radius 8 | Focus ring on the option | Fill `snow` at 0.20 | Never | — |
| Text input, `select` | 1px solid `snow`, no fill | Fill `snow` at 0.08 | Focus ring | — | Never disabled. Read-only while saving, with no change of appearance | — |
| Turn left, Turn right, Reset view, Pause motion, Retry (Stage) | Fill `ink` at 0.72, 1px solid `snow`, `snow` | Fill `ink` at 0.88 | Focus ring | Fill `ink`, solid | Never | — |
| Canvas | `grab` | `grab` | Not focusable | `grabbing` | — | Hidden |
| Gear scroll region | — | — | Focus ring | — | — | — |
| Row, label, state words, tag, notes, summary, captions, backdrop | Static | None | Not focusable | None | — | — |

A row has no hover, selected, or pressed state of its own, and clicking a row outside its controls does nothing: a whole-row click target would make the row a checkbox. Hover is never needed to find an action.

### 16.16 Motion

| Element | Default | `prefers-reduced-motion: reduce` |
|---|---|---|
| Panel, on mount | Opacity 0 → 1 and a 4px rise, 240ms (004 §21.19) | Appears at once |
| Backdrop | Static from first paint | Same |
| Canvas, entering `ready` / `partial` | Opacity 0 → 1, 240ms, no movement | Appears at once |
| Gear on the avatar (section 29.3) | A cut | A cut |
| Idle loop (section 32) | Runs; Pause motion holds it | Never runs; control not rendered |
| Turn buttons, Reset view (section 30.2) | The view eases to the new angle: 240ms for a 30° step, at most 480ms for Reset view | A cut |
| Drag | Follows the pointer; stops on release | Same (user-driven) |
| Equipped tag, note text, count | Appear or change at once; tag opacity 0 → 1, 150ms | At once |
| Picker list, Add gear form | Height is not animated; content opacity 0 → 1, 150ms | At once |
| Waiting dots, `LoaderCircle` | Pulse, spin | Static; the text remains |
| Hover and fill changes | 150ms, color only | Kept |

Not used: auto-rotation, a turntable that spins by itself, camera moves on equip, a "reveal" when gear is equipped, confetti or any celebratory effect at a full count, count-up numbers, parallax on the backdrop, scale or bounce on any control. If the motion preference changes during a visit the screen follows it; layout, content, and tab order are identical in both modes apart from the Pause control.

## 17. Responsive Behavior

Desktop web is the baseline. Composed at 1920×1080 and 1440×900; validated at 1366×768 and 1024×768. Heights marked (est.) are arithmetic from section 16.

| | 1920×1080 | 1440×900 | 1366×768 | 1024×768 |
|---|---|---|---|---|
| Tier | XL | L | M | S |
| Header | 72 | 72 | 64 | 64 |
| Panel box (x, y, width) | 64, 104, 600 | 56, 104, 560 | 40, 80, 520 | 32, 80, 460 |
| Panel height limit | 936 | 756 | 664 | 664 |
| Stage box (x, y, w, h) | 696, 72, 1160, 884 | 648, 72, 736, 704 | 584, 64, 742, 596 | 516, 64, 476, 596 |
| Stage aspect | 1.31 | 1.05 | 1.24 | 0.80 |
| Trail name | 28/34 | 24/30 | 24/30 | 24/30 |
| Gear zone height at the limit (est.) | 649 | 473 | 381 | 361 |
| Typical five-row list (590, est.) | No scrolling | Scrolls about 120 | Scrolls about 210 | Scrolls about 230 |
| View bar | Two circles, two labelled pills | same | same | same (about 330 wide in 476, est.) |

| Step | Change |
|---|---|
| XL → L | Panel 600 → 560; trail name steps down; the Stage becomes nearly square |
| L → M | Panel top 104 → 80, bottom margin 40 → 24, panel 520, gap 24. On 768-high screens the gear zone shows about three and a half rows |
| M → S | Panel 460; TP11 wraps to two lines; the Stage becomes portrait (0.80); the camera still frames by height (section 30.1) |

- **What scrolls:** the gear zone inside the panel, only when its content is taller than the limit. Strip, trip block, and summary never scroll, so the trail, the date, and both measures are always on screen. The page does not scroll and the Stage does not move.
- **Open picker or form:** grows the row inside the gear zone; the zone scrolls. The focused control is scrolled into view with 24px to spare.
- **Short viewports:** when `100dvh − top − bottom margin` is under 560, the panel's limit is 560, the Stage's height is at least 360, and the page scrolls vertically with the backdrop fixed.
- **Wider than 1920:** 16.3. Panel and Stage keep their XL sizes; the backdrop's `ink` fills the rest.
- **Long content:** trail names, item names, and category labels wrap (`overflow-wrap: anywhere`). When line 1 of a row cannot hold label, tag, and action, the tag wraps under the label; the action stays at the end of line 1.

**768–1023px (tier T): functional and tidy, not composed, not a validation priority.** The two-column layout is kept, so the avatar stays beside the controls and DOM order still equals visual order.

| Property | Value |
|---|---|
| Gutter, header, panel top, bottom margin, gap | 24, 64, 80, 24, 16 |
| Panel width | 400 |
| Stage | The rest: 304 wide at 768, 559 at 1023 (aspect 0.36–0.66 at 1024 high). Below aspect 0.60 the camera frames by width (section 30.1) |
| View bar | Four icon-only circles, 44, 8 apart (`ChevronLeft`, `ChevronRight`, `Focus`, `Pause` / `Play`), with the same accessible names |
| Touch | Horizontal drag on the canvas turns; vertical drag scrolls (`touch-action: pan-y`). No pinch, no two-finger gesture |
| Header | FEATURE-003 §17.2 one-row form, as 004 §22.3 |

**Below 768px: best-effort, with no real-time 3D (final, Q11).** The viewer is not mounted and the 3D library and models are not requested.

| Property | Value |
|---|---|
| Layout | One column. The panel is in normal flow, full width between gutters (16; 12 below 360), padding 20, no height limit, no inner scrolling: the page scrolls |
| Stage | Replaced, after the panel in DOM and on screen, by a text block on the same surface recipe: ST14, then the loadout text (ST13), `snow`, 16/24. No canvas, view bar, caption, placeholder figure, or image |
| Backdrop | The `ink` base only |
| Rows | Equipped rows show N8; unequipped rows no note. Every control is at least 44 × 44 |
| Minimum that must hold to 320px | No horizontal scroll; GS1, every row with its state, Equip / Unequip, Change, both Add gear forms, and both measures are reachable by scrolling and operable by touch |

Why not a static avatar there: the six avatar-visible categories give 64 combinations, so a still either needs 64 renders or shows an avatar that ignores the rows beside it. Text that is true is better than a picture that is not. Why not real-time 3D there: it would need a stacked or sticky Stage, touch-orbit that competes with page scrolling, and model downloads on the weakest devices, for the tier the lead marked best-effort. If the width crosses 768 during a visit, the viewer mounts or unmounts; equipped state is unaffected.

**Zoom:** at 200% a 1920×1080 screen lays out as 960×540: tier T with the short-viewport rule. At 400% on 1280 wide it is the below-768 layout. No text-bearing box has a fixed height; nothing is clipped or truncated except the header identity (FEATURE-003).

## 18. Accessibility

### 18.1 Structure

```text
(backdrop)                         aria-hidden, no pointer events
header                             banner
main
├─ section                         the panel, labelled by the h1
│  ├─ a   "Back to preparation"
│  ├─ h1  "Gearing up for {trail name}"          tabindex="-1"
│  ├─ p   trip line
│  ├─ h2  "Pack summary" (visually hidden), dl with two entries
│  └─ div role="region"            aria-label GS6, tabindex="0"
│     ├─ section   h2 "Recommended for this trip", p, slot (button or p), ul
│     │    li:  h3 label · span "Equipped" · button Equip|Unequip|Add gear
│     │         p state + item · button "Change" · p note
│     │         fieldset (picker)  |  form (Add gear)
│     ├─ section   h2 "Also in your gear", p, ul
│     ├─ p    uncategorised line
│     └─ button "Add gear you own", form
└─ section                         the Stage, labelled by its h2
   ├─ h2  "Your avatar" (visually hidden)
   ├─ p   loadout text             18.5
   ├─ canvas                       aria-hidden="true"
   ├─ div role="group"             aria-label ST15: Turn left, Turn right, Reset view, Pause motion
   └─ p   caption(s)
announcer                          visually hidden: one role="status", one role="alert"
```

- One `h1` in every state (S2: SH5). `h2` for the summary, each group, and the Stage; `h3` for each category. No level skipped; no heading used for size.
- One `banner`, one `main`. DOM order equals visual order at every width.
- Document title DT4, updated when the trail name is known.
- Item names, trail names, and labels are text nodes: no markup, no auto-linking.

### 18.2 Tab order and keys

Brand → Gear → Sign out → Back to preparation → gear region → shortcut (when it is a button) → for each row in order: the row action → Change → the open picker's radio group (one stop) or the open form's fields, submit, Cancel → Add gear you own (and its form) → Turn left → Turn right → Reset view → Pause motion → Retry (viewer `unavailable`).

Not tab stops: rows, labels, tags, notes, the summary, the canvas, the backdrop. Enter and Space activate buttons; Enter activates links; arrow keys move within a radio group; Escape closes an open picker or form; with the gear region focused, arrow keys, Page Up / Down, Home, and End scroll it. No single-key shortcut, no drag-only action, no key binding on the canvas.

### 18.3 Focus

| Event | Focus goes to |
|---|---|
| Arriving by any route (Gear up, typed URL, reload, Back / Forward, return from sign-in) | The `h1` |
| S1 ends in content or a failure | Stays on the `h1`; the change is announced |
| Equip or Unequip | Stays on the same button, whose label has changed |
| Shortcut | The sentence that replaces it (GS18, `tabindex="-1"`, no ring) |
| Change opened / closed | Stays on Change. Escape inside the list: back to Change |
| An item chosen in the picker | Stays on the chosen radio |
| Add gear opened | Item name (row form); Category (general form) |
| Add gear succeeded | That category's row action (Equip; Unequip if already equipped). The row is scrolled into view |
| Add gear failed | Stays on the submit. Field error: the invalid field |
| Add gear cancelled | The button that opened the form |
| Retry (panel) | Stays while working; on success the first group's `h2` (`tabindex="-1"`); on failure Retry |
| Retry (Stage) succeeded | Reset view. Failed: stays on Retry |
| Viewer state changes by itself | Not moved |
| Back to preparation | Trip Preparation's `h1` (004 §23.2) |
| Session ended | FEATURE-002 |

Focus is never left on a removed element or sent to `body`. Headings and sentences focused this way draw no ring and are not in the tab order. Every stop shows the DS §18 ring; the panel sets no `overflow: hidden`, and the gear zone's 24px side padding keeps rings inside its scroll clip.

### 18.4 Announcements

One announcer, emptied and refilled per event. Nothing is announced for content present at first paint. `{count}` is "{e} of {m} recommended categories equipped." (in S10: "{x} categories equipped.").

| Event | Region | String |
|---|---|---|
| Data loaded after S1 | status | "Gear loaded. Packing readiness {n}%. {count}" |
| S4, S5, S7 | alert | TP7, TP8, GS8 |
| Equip, status `shown` | status | "{category} equipped: {item name}. On your avatar as {visual}. {count}" |
| Equip, status `covered` | status | "{category} equipped: {item name}. Worn under your rain shell; only its collar shows on the avatar. {count}" |
| Equip, UI-only category | status | "{category} equipped: {item name}. Not shown on the avatar. {count}" |
| Equip, status `not-shown` | status | "{category} equipped: {item name}. It can't be shown on the avatar right now. {count}" |
| Equip, viewer `loading` or no avatar | status | "{category} equipped: {item name}. {count}" |
| Equip or Unequip changes another row's status | appended | "{other category} is now covered." / "{other category} is visible on your avatar again." |
| Unequip, was `shown` | status | "{category} unequipped. Removed from your avatar. {count}" |
| Unequip, otherwise | status | "{category} unequipped. {count}" |
| Shortcut | status | "Equipped {k} categories: {list}. {count}" |
| Item changed, category equipped | status | "{category}: now {item name}. The avatar looks the same." |
| Item changed, not equipped | status | "{category}: {item name} selected. Not equipped." |
| Add gear succeeded | status | "{item name} added to your gear. {category} is owned, not equipped." |
| Packing readiness changed after a refresh | status | "Packing readiness {n}%." |
| Add gear request error | The form's own alert | AG13, AG14, AG16 |
| Viewer `loading` → `ready` | status | "Avatar loaded." |
| Viewer → `partial` | status | ST2 |
| Viewer → `unavailable` | status | ST4 or ST5. Status, not alert: nothing the user did failed and every control works |
| Turn, Reset view | status | "Turned left." · "Turned right." · "View reset." |
| Pause / Play motion | — | The button's name changes; nothing more |

The avatar sentence in an Equip announcement uses the display status the viewer reports (16.4). The announcement is composed when that report arrives or after 300ms, whichever is first; without a report the sentence is left out. An avatar change is therefore always conveyed three ways that do not need sight of the canvas: the announcement, the row's note, and the loadout text.

### 18.5 Names, roles, states, and alternatives

| Element | Treatment |
|---|---|
| Equip control — **pattern decision** | **A button whose name is the action: "Equip {category}" / "Unequip {category}". No `aria-pressed`, no `role="switch"`, no checkbox.** Reasons: a toggle with a fixed name and `aria-pressed` must not also change its label, and a fixed label ("Equipped", pressed) makes the user infer the action; a checkbox or switch is exactly the single tick the four concepts must not collapse into, and reads as a checklist; two side-by-side buttons would leave one permanently disabled. The state is carried by text in the row ("Equipped" tag, state line), not by the control |
| Row action description | `aria-describedby` the row's state-and-item line, so focus reads "Equip Rain gear, button. Owned, Patagonia Torrentshell": the item a press will equip is known before pressing |
| Row | An `li`: read in order as label (`h3`), "Equipped" when present, the action, the state and item, Change, the note |
| Equipped tag, state words | Plain text with `aria-hidden` icons. No `aria-checked`, no `aria-selected` |
| Change | `aria-expanded`, `aria-controls`; name GS27 (contains the visible label) |
| Picker | `fieldset` / `legend` GS28 with native radios |
| Add gear | `aria-expanded` on the opener; `form` named AG15; visible `label`s; helper and errors by `aria-describedby`; `aria-invalid` on a failing field; `required` |
| Summary | A `dl`: "Packing readiness, 60%, Counts how many…"; "Equipped for this trip, 2 of 5, Counts the recommended…". No `role="meter"` in the Studio |
| Gear region | `role="region"`, `aria-label` GS6, `tabindex="0"` |
| Canvas | `aria-hidden="true"`, not focusable, no fallback content inside it that could be read twice |
| **Loadout text (the canvas's text alternative)** | A `p` directly after the Stage's `h2`, so "Your avatar" always leads to words. Composed from equipped state and the viewer's display statuses: nothing equipped → ST10; otherwise ST11 listing the visuals shown ("a backpack, a rain shell, hiking boots"), then ST12 listing equipped categories that are not shown, each covered one with its reason ("Warm layer (under the rain shell), Sun protection, Water"). In `loading`, `unavailable`, and below 768px: ST13. Visually hidden in `loading`, `ready`, `partial`; visible in `unavailable` and below 768px. Updated on every change; **not** a live region (18.4 announces changes) |
| What the loadout text never says | Anything about the avatar's body, face, age, gender, skin, hair, or pose; an item name presented as what the avatar wears; a brand |
| View controls | A `group` named ST15; each button named ST6–ST9; `title` on icon-only buttons |
| Backdrop, icons, waiting dots | `aria-hidden`; icons in `currentColor` |

### 18.6 Understandable without color

| Content | How it reads with no color |
|---|---|
| Recommended | The group heading and the row's position under it |
| Owned / Missing | The word; the icon's shape (closed ring with a check, dashed empty ring); the presence of an item name; the action (Equip or Add gear) |
| Equipped | The word "Equipped" in a filled tag (a shape, kept as a bordered box in forced colors); the action reading "Unequip"; the count |
| On avatar / not shown | A sentence per row; two different icons |
| The two measures | Different labels, different units ("%" and "n of m"), different captions |
| Selected item in the picker | A dot inside the ring; weight 600 |
| Field errors | A thicker border, a `CircleAlert` icon, a sentence |
| Viewer states | Sentences |

Every element in the panel is `snow`, `ink` on `snow`, or `ink` on `paper`; no hue encodes anything.

### 18.7 Contrast pairs in use

WCAG 2.x arithmetic. "Panel over white" is 004's worst case (rgb 40, 55, 59); the Studio's panel actually sits on the `ink` base, where each ratio is higher. † = taken from DS §9 or 004 §23.6; the others were computed for this draft. None was measured in a browser.

| Foreground | Background | Ratio | Needed |
|---|---|---:|---:|
| `snow` text and icons in the panel | Panel over white / on `ink` | 12.32 † / 17.48 † | 4.5 |
| `snow` borders: buttons, inputs, radio rings | Panel over white | 12.32 † | 3 |
| `snow` label on a hovered / pressed secondary button | Panel over white with `snow` at 0.12 / 0.20 | 8.49 † / 6.60 † | 4.5 |
| `ink` text and icon in the Equipped tag | `snow` | 17.48 † | 4.5 |
| Equipped tag's edge | `snow` on panel over white | 12.32 † | 3 |
| `ink` label: Gear up, Add to my gear | `paper` / hover rgb(228, 228, 222) / active rgb(209, 210, 206) | 16.04 † / 13.7 / 11.5 | 4.5 |
| On-panel primary's edge | `paper` on panel over white | 11.3 | 3 |
| `snow` text: header, Stage loading text, captions, unavailable block | Backdrop, lightest stop `conifer` | 8.05 † | 4.5 |
| `snow` text if it ever met the floor pool (it must not) | `conifer` under `snow` at 0.14, rgb(62, 113, 96) | 5.6 | 4.5 |
| `snow` label and border: view-bar controls | Own fill, `ink` at 0.72 over `conifer`, rgb(17, 45, 43) | 14.6 | 4.5 |
| Focus ring's `sun` layer | `ink` layers / `conifer` | 12.28 † / 5.7 | 3 |

- `conifer`, `ember`, and `stone` are not used on the panel. `conifer` appears only in the backdrop.
- 1px rules (`snow` at 0.16) and the floor pool are decorative and not relied on.
- The avatar and gear are not text; their legibility against the backdrop is request R4.

Check for `qa`: with the canvas hidden, a pixel at the wash's centre is `conifer` ± 2; a pixel of the panel beside any text is within 2 of `ink` at 0.88 over the backdrop pixel beneath it; no text is found outside the panel, a control with its own fill, or the plain backdrop.

### 18.8 Forced colors, reduced motion, targets

- **Forced colors:** the focus ring's transparent outline becomes visible. The panel, the Equipped tag, the on-panel primary, inputs, and view-bar controls carry real 1px borders (transparent where the normal design has none) so each keeps an edge. Radio selection is a real inner element, not a background. The backdrop is replaced by the system canvas color; the 3D canvas still renders on it, and nothing depends on it: the loadout text and row notes carry the content.
- **Reduced motion:** 16.16. No idle loop, no fades, no eased turns; the Pause control is absent because nothing moves by itself. Every function is identical.
- **Targets:** on a coarse pointer every control is at least 44 × 44. With a fine pointer: row actions 36 tall, Change 32, picker options 36, inputs 44, view-bar controls 40, all at least 24 × 24 and at least 8 apart. Rows are not targets.
- **Text size:** nothing below 14px; inputs 16px. No text-bearing box has a fixed height.
- **No dependence on 3D:** every fact the canvas shows is also in text (rows, summary, loadout), and every action is a button outside the canvas (DS §27).

## 19. Avatar Visual Direction

One avatar. It is the persistent avatar of PRD sections 16 and 17 and is reused unchanged by FEATURE-006.

| Attribute | Contract |
|---|---|
| Character | One original stylized young-adult male outdoor explorer. No name, no backstory, no likeness |
| Style | Stylized low-poly with a cel-like, anime-inspired feel: simple flat base colours, geometry-led forms, a restrained material palette, no image textures, no photorealism. The separation of light and shadow comes from the runtime lighting (section 31), not from the asset |
| Height | 1.75 m ± 0.02, ground to top of hair, bare-headed |
| Proportions | 6.5 heads. Head 0.27 m (chin to top of hair). Hip joint at 0.93 to 0.95 m (legs about 54 % of height). Shoulder width 0.42 m. Hands and feet about 10 % larger than realistic so they read at small size |
| Build | Slim, tapered limbs, soft low-detail volumes. Elbows bent 5 to 10 degrees, knees 2 to 4 degrees |
| Face | Geometry only: two dark eye shapes with one highlight each, two brows, one short closed-mouth line. No nose beyond a slight bump. No expression change |
| Hair | Short, tousled, built from a few chunky tufts. Chestnut brown (palette) (CA16) |
| Hands | Loosely curled mitten hand with a separate thumb. No finger bones. The same hand shape is used empty and holding a pole |
| Default outfit | Long-sleeve base top, hiking trousers, low light trail shoes, bare head, empty hands, no pack (section 20) |
| Pose shown | The rest pose of section 21.3. The avatar is never shown in a T-pose |

**Palette.** Colours live on the materials (section 24.6). Values are sRGB hex; the GLB stores the linear equivalent.

| Material | sRGB | L* (approx.) | Note |
|---|---|---:|---|
| `Avatar_Mat_Skin` | `#E9B998` | 78 | |
| `Avatar_Mat_Hair` | `#8B5E3F` | 44 | chestnut; lighter than the backdrop so the bare head keeps its silhouette |
| `Avatar_Mat_Eye` | `#1A1614` | 8 | eyes, brows, mouth line (interior detail) |
| `Avatar_Mat_EyeLight` | `#FFFFFF` | 100 | token `snow` |
| `Avatar_Mat_Top` | `#9DAA9E` | 68 | muted sage |
| `Avatar_Mat_Trousers` | `#74807B` | 53 | `stone`, lifted to clear the backdrop |
| `Avatar_Mat_Shoe` | `#B9BEB9` | 76 | |
| `Avatar_Mat_Sole` | `#33403F` | 26 | shared by default shoes and boots (thin detail) |
| `Wear_Mat_Fleece` | `#EADFC8` | 89 | `paper` family |
| `Wear_Mat_Shell` | `#CF6A32` | 56 | rust, as in the landing and Home media. Deliberately not `ember`, which means "error" in the UI |
| `Wear_Mat_ShellTrim` | `#8E4420` | 37 | zip line, cuff tabs, hood edge (interior detail) |
| `Wear_Mat_Boot` | `#9A6A45` | 49 | |
| `Gear_Mat_Pack_Body` | `#D49B3A` | 68 | ochre. Not `conifer`: the Stage backdrop is `conifer` to `ink` |
| `Gear_Mat_Pack_Trim` | `#2F3B3D` | 24 | straps, hip belt, lid strap. Always seen against the torso, never against the backdrop |
| `Gear_Mat_Pack_Accent` | `#F7F5EF` | 96 | token `paper`; buckles |
| `Gear_Mat_Pole_Shaft` | `#C9CFCC` | 82 | aluminium |
| `Gear_Mat_Pole_Grip` | `#C89B6A` | 67 | cork |
| `Gear_Mat_Pole_Accent` | `#CF6A32` | 56 | baskets and tips |
| `Gear_Mat_Lamp_Body` | `#CF6A32` | 56 | lamp housing; the rust accent already used by the shell and the poles |
| `Gear_Mat_Lamp_Lens` | `#FFD27A` | 86 | token `sun`; a flat colour, no emission |
| `Gear_Mat_Lamp_Band` | `#2F3B3D` | 24 | elastic band. It lies on the head a few millimetres proud of the hair and is not relied on for the silhouette (interior detail) |

**Value rule (requirement R4 of 16.4).** The Stage backdrop runs from `ink` (L* about 9) to `conifer` (L* about 34). Every material that carries a silhouette against the backdrop has L* of 44 or more. `Gear_Mat_Lamp_Band` and `Gear_Mat_Pack_Trim` are exempt as interior detail; the headlamp is read by its housing and lens (CA17). Each gear model differs from what it replaces or sits on by shape and by value, not by hue alone:

| Gear | Shape difference | Value difference |
|---|---|---|
| Rain shell vs base top | hood bulk behind the neck, hem 0.10 m longer, wider sleeves | L* 56 vs 68 |
| Warm jacket vs base top | tall stand collar, thicker hem and cuffs | L* 89 vs 68 |
| Hiking boots vs default shoes | ankle-height shaft, thicker lugged sole | L* 49 vs 76 |
| Backpack | dark straps and hip belt across the torso; ochre body behind it | straps L* 24 on 56 to 89; body L* 68 on a backdrop of 34 or less |
| Trekking poles | two vertical lines from hand to ground | L* 82 on a backdrop of 34 or less |
| Headlamp | a housing standing proud of the forehead, on a band round the head | housing L* 56 on skin 78; lens 86 on the housing; band 24 on hair 44 and skin 78 |

**Polished enough** means all of: a clean readable silhouette at 300 px tall; no visible holes, flipped faces, or detached parts from any orbit angle; no severe clipping (section 27.4) in the nine loadouts of section 26.3; each of the six gear categories is identifiable on its own at Stage size; the avatar and the Home room figure read as one art direction (similar proportions and outdoor palette, no likeness required).

**Deliberately absent:** facial animation, blend shapes, finger articulation, hair or cloth simulation, textures, normal maps, a character creator, body or face options, a second avatar, accessories that are not one of the six categories.

**Anti-copying rule.** Every vertex is modelled in this project from primitives. No mesh, texture, rig, or animation is imported from a game, a marketplace, a model library, or a generator (`search_assets`, `import_asset`, and `generate_3d` are not used). The design copies no identifiable character: no signature hairstyle, costume, emblem, or colour scheme of an existing property. The style is described only as "anime-inspired stylized outdoor adventure".

## 20. MVP 3D Gear Categories

### 20.1 Category table

| `GearCategory` | 3D | Visual category | Generic model | Equipment slot | Mechanism | Hidden when equipped |
|---|---|---|---|---|---|---|
| `BACKPACK` | yes | `BACKPACK` | Medium daypack, about 25 L: body, lid, two shoulder straps, hip belt | `BACK` | attached model, `gear-backpack.glb` on `Slot_Back` | nothing |
| `RAIN_GEAR` | yes | `RAIN_SHELL` | Hip-length rain shell, hood down, front zip line | `TORSO_OUTER` | embedded variant `Wear_Shell` | `Avatar_Top_Base`, `Wear_WarmLayer_Body` |
| `WARM_LAYER` | yes | `WARM_LAYER` | Fleece jacket with a tall stand collar | `TORSO_INNER` | embedded variants `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar` | `Avatar_Top_Base` |
| `FOOTWEAR` | yes | `HIKING_BOOTS` | Mid-cut hiking boots with a lugged sole | `FEET` | embedded variant `Wear_Boots` | `Avatar_Shoes_Default` |
| `TREKKING_POLES` | yes | `TREKKING_POLES` | Pair of poles, planted vertically, one per hand | `HANDS` | attached model, `gear-trekking-poles.glb` on `Slot_Hand_L` and `Slot_Hand_R` | nothing |
| `HEADLAMP` | yes | `HEADLAMP` | Headlamp: a lamp housing with a lens on the forehead, on an elastic band round the head | `HEAD` | attached model, `gear-headlamp.glb` on `Slot_Head` | nothing |
| `WIND_LAYER` | no | none | UI-only | | | |
| `TRACTION` | no | none | UI-only | | | |
| `SUN_PROTECTION` | no | none | UI-only | | | |
| `WATER` | no | none | UI-only | | | |
| `FOOD` | no | none | UI-only | | | |

The 3D model is per category. Two owned items of one category look identical on the avatar. A UI-only category changes nothing in the scene, equipped or not.

Plain-language nouns for the row note "On your avatar as {visual}" (section 16 owns the copy; these describe what is actually modelled):

| Visual category | Noun |
|---|---|
| `BACKPACK` | a backpack |
| `RAIN_SHELL` | a rain shell |
| `WARM_LAYER` | a warm jacket |
| `HIKING_BOOTS` | hiking boots |
| `TREKKING_POLES` | trekking poles |
| `HEADLAMP` | a headlamp |

**Head slot: a headlamp, and no sun hat (final, Q8).** `SUN_PROTECTION` is UI-only: the category can hold sunscreen or other items that are not headwear, and the avatar must not show a hat for them. `HEADLAMP` takes the head slot instead. Every item in that category is a headlamp, so the generic model cannot misrepresent one. It sits on the forehead, in plain view from the default angle, and hides no part of the avatar.

**Models must not depict another category.** The backpack carries no bottle, poles, or lamp; the shell and fleece carry no pack straps. Otherwise the avatar would show gear that is not Equipped.

**Not modelled, on purpose.** `WIND_LAYER` could reuse `Wear_Shell` at zero asset cost, but wind and rain gear would then be indistinguishable and the layer rule would gain a third case. A hat or cap for `SUN_PROTECTION` is excluded by the decision above. Neither is in scope.

### 20.2 Base avatar parts

| Node | What it is | Default |
|---|---|---|
| `Avatar_Head` | Head, face, ears, and neck down into the collar | visible, never hidden |
| `Avatar_Hair_Base` | Hair below the headband plane (the plane of `Slot_Head`) | visible, never hidden |
| `Avatar_Hair_Top` | Hair above the headband plane | visible. Nothing hides it in FEATURE-005; the split is kept so that a later headwear model can |
| `Avatar_Hands` | Both hands with wrist stubs that end inside the sleeves | visible, never hidden |
| `Avatar_Legs` | Trousers, waist to ankle | visible, never hidden |
| `Avatar_Top_Base` | Long-sleeve base top: torso and both sleeves | visible |
| `Avatar_Shoes_Default` | Low trail shoes with an ankle column that ends inside the trouser leg | visible |
| `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`, `Wear_Shell`, `Wear_Boots` | Embedded gear variants | hidden |

### 20.3 Poke-through rules (asset rules; the frontend does nothing about clipping)

1. **No body under clothing.** The only skin geometry is `Avatar_Head` and `Avatar_Hands`. There is no torso, arm, leg, or foot mesh beneath a garment, so nothing can poke through one.
2. **One torso garment body at a time.** Exactly one of `Avatar_Top_Base`, `Wear_WarmLayer_Body`, `Wear_Shell` is visible in every reachable state. Garments are never stacked as visible layers.
3. **Garments are closed volumes.** Neck, cuff, and hem openings are closed by an inset cap at least 10 mm inside the rim. No camera angle sees into a hollow garment.
4. **Torso envelope.** In the strap zone (shoulders, chest front, upper back, waist at hip-belt height) every torso garment surface lies between 0 and 14 mm outside the `Avatar_Top_Base` surface.
5. **Thick straps.** Backpack shoulder straps and hip belt are solid bands whose inner face is at least 5 mm inside the `Avatar_Top_Base` surface and whose outer face is at least 26 mm outside it (14 mm envelope, 8 mm breathing, 4 mm margin). The pack body's front face is at least 5 mm inside the back surface. Straps therefore sit correctly over the base top, the fleece, and the shell with no variant and no runtime logic.
6. **Hood and pack.** The shell's folded hood stays within B-space z 1.41 to 1.52 and at most 70 mm behind the neck's back surface (as built: 61 mm; accepted reading, 2026-10-14). The pack body stays at or below z 1.40.
7. **Headlamp and hair.** `Avatar_Hair_Base` has no vertex above `Slot_Head` z minus 4 mm, and `Avatar_Hair_Top` overlaps downward by at least 10 mm, so the head shows no seam. Within 16 mm above and below the `Slot_Head` plane the head-and-hair surface is a smooth closed loop (radial variation 4 mm or less, no tuft tip); tufts live above and below that strip (CA5). The headlamp's band is a solid ring about 28 mm tall, centred on the `Slot_Head` plane, except over the forehead, where its lower edge follows the brow tops plus 4.5 mm so that it clears the brows (as built: about 22 mm tall there; accepted 2026-10-14): all the way round, its inner face lies at least 5 mm inside the head-and-hair surface at that plane and its outer face at least 6 mm outside it, so no hair shows through the band and no gap shows under it. The lamp housing (about 70 mm wide, 50 mm tall, 40 mm deep, a little larger than life so it reads at Stage size) sits on the band at the front, centred on the midline, with its lens facing forward. No hair geometry lies in front of the housing.
8. **Feet.** Both shoe variants include an ankle column reaching z 0.15 or higher. The trouser hem ends at z 0.12 ± 0.01, is capped, and is at least 6 mm wider in radius than the boot shaft. The boot shaft top is hidden inside the trouser leg.
9. **Clearance.** Two surfaces that can be visible together are either at least 4 mm apart or one is embedded at least 4 mm inside the other. Nothing is coplanar.

**Designed intersections** (not defects): strap and pack body into the torso, pole grip through the fist (as built, the grip narrows to a point hidden inside the fist above z 0.915), boot shaft and ankle column into the trouser leg, neck into the collar cap, fleece collar through the shell's neck cap, wrist stub into the cuff cap, head and hair into the headlamp band.

### 20.4 Layer rule: warm layer plus shell

| Equipped | Visible torso nodes |
|---|---|
| neither | `Avatar_Top_Base` |
| `WARM_LAYER` | `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar` |
| `RAIN_GEAR` | `Wear_Shell` |
| both | `Wear_Shell`, `Wear_WarmLayer_Collar` |

With both equipped the shell is drawn and the fleece body is hidden entirely; the fleece collar stays visible inside the shell's neck opening as the only sign of the inner layer. The shell's neck opening radius exceeds the fleece collar's outer radius by at least 6 mm, and the fleece collar rises at least 15 mm above the shell's front collar edge. The result does not depend on the order of equipping (section 29.1).

## 21. Rig and Clothing Strategy

### 21.1 Evaluation

| Option | What it is | Verdict |
|---|---|---|
| A. Skinned clothing in separate GLBs | Each garment GLB carries a copy of the skeleton; the runtime rebinds every `SkinnedMesh` to the avatar's bones by name | Rejected. The rebind is the single most error-prone step: bind matrices, joint order, and armature transforms must agree across separately exported files, a mismatch shows as an exploded mesh, and its owner (asset or runtime) is unclear |
| **B. Hybrid (chosen)** | Rigid gear (pack, poles, headlamp) as separate GLBs parented to slot nodes. Deforming wearables (shell, fleece, boots) as skinned mesh variants inside `avatar-base.glb`, toggled by visibility | Chosen. One armature exported once in the most standard glTF shape; no runtime rebind; rigid attachment is a plain `add()` |
| C. Everything in one GLB | Pack, poles, and headlamp also live in the avatar file | Rejected. Marginally simpler, but there is no per-gear loading or failure, every repair re-exports everything, and the slot contract FEATURE-006 needs would go unproven |
| C2. Segmented rigid body | No skinning; each body segment parented to one bone | Rejected. Gaps at joints in a walk cycle; toy look |

**Cost of B.** `gear-rain-shell.glb`, `gear-warm-layer.glb`, and `gear-footwear.glb` do not exist. Their geometry (about 11,500 triangles, roughly 0.3 to 0.45 MB) is part of the initial avatar download and cannot be lazy-loaded or fail independently. That is accepted: there are no textures, the cost is small, and three categories gain instant, failure-free equip.

**If a later feature needs separately shipped skinned clothing**, option A's procedure is: same bone names and rest pose, one skin per file, the runtime builds a `Skeleton` from the avatar's bones in the garment's joint order with the garment's own inverse bind matrices. It is not part of this contract.

### 21.2 Skeleton

Armature object `Avatar_Armature`. 23 bones. Names are final and are a public interface from FEATURE-005 onward: bones may be added later, never renamed.

```text
Root
└─ Hips
   ├─ Spine
   │  └─ Chest
   │     ├─ Breath                     (leaf; chest expansion only)
   │     ├─ Neck
   │     │  └─ Head
   │     ├─ Shoulder_L ─ UpperArm_L ─ LowerArm_L ─ Hand_L
   │     └─ Shoulder_R ─ UpperArm_R ─ LowerArm_R ─ Hand_R
   ├─ UpperLeg_L ─ LowerLeg_L ─ Foot_L ─ Toes_L
   └─ UpperLeg_R ─ LowerLeg_R ─ Foot_R ─ Toes_R
```

Nominal bone heads, B-space, `_L` side (mirror x for `_R`); production may deviate by up to 0.03 m except where the Asset Gate states a range:

| Bone | Head (x, y, z) | Bone | Head (x, y, z) |
|---|---|---|---|
| `Root` | 0, 0, 0 | `Shoulder_L` | 0.030, 0.020, 1.400 |
| `Hips` | 0, 0.010, 0.950 | `UpperArm_L` | 0.185, 0.020, 1.400 |
| `Spine` | 0, 0.010, 1.050 | `LowerArm_L` | 0.320, 0.020, 1.166 |
| `Chest` | 0, 0.015, 1.200 | `Hand_L` | 0.445, 0.010, 0.950 |
| `Breath` | 0, -0.060, 1.280 | `UpperLeg_L` | 0.090, 0.010, 0.930 |
| `Neck` | 0, 0.020, 1.430 | `LowerLeg_L` | 0.090, 0.005, 0.500 |
| `Head` | 0, 0.015, 1.500 | `Foot_L` | 0.090, 0.030, 0.090 |
| | | `Toes_L` | 0.090, -0.100, 0.020 |

Rules: no dots or spaces in any bone name (three.js strips them); sides are `_L` and `_R`; no IK, control, or helper bones in FEATURE-005; no bone constraints, drivers, or custom shapes; bone orientation and roll are free (slots carry the orientation contract, section 22).

### 21.3 Rest pose

Relaxed A-pose: upper arms 30 degrees ± 3 from vertical, palms facing the thighs, feet 0.18 m apart (centres), toes forward, head level.

Why not a T-pose: the rest pose is what the user sees whenever no animation plays (reduced motion, or the idle clip dropped under section 32), so it has to be presentable. Why not arms straight down: sleeves would intersect the shell hem, hip belt, and pack, and shoulder skinning is worst there. At 30 degrees the hands clear the body and planted poles stand vertical beside the feet.

The exported node transforms are the rest pose (section 23.4), so a GLB with no animation applied shows this pose.

### 21.4 Rigid, skinned, swapped

| Kind | Nodes | Rule |
|---|---|---|
| Skinned, always present | `Avatar_Head`, `Avatar_Hair_Base`, `Avatar_Hair_Top`, `Avatar_Hands`, `Avatar_Legs` | bound to `Avatar_Armature` |
| Skinned, swapped by visibility | `Avatar_Top_Base`, `Avatar_Shoes_Default`, `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`, `Wear_Shell`, `Wear_Boots` | bound to `Avatar_Armature`; shown or hidden by section 29.1 |
| Rigid, attached | `Gear_Backpack`, `Gear_TrekkingPole_L`, `Gear_TrekkingPole_R`, `Gear_Headlamp` | no skin, no bones; parented to a slot node at runtime |

### 21.5 Skinning rules

| Rule | Value |
|---|---|
| Influences per vertex | at most 4, weights normalized to 1 |
| Unweighted vertices | none. A `neutral_bone` node in the exported GLB means there were some and fails the gate |
| Hair, face | 100 % `Head` |
| Hands | 100 % `Hand_L` or `Hand_R` up to the wrist stub |
| Torso garments | weights for `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`, and `Wear_Shell` are transferred from `Avatar_Top_Base` (nearest surface), not weighted independently, so every torso variant deforms identically |
| Boots | weights transferred from `Avatar_Shoes_Default` |
| `Breath` | weighted only on the chest front of the torso garments, smooth falloff, peak weight at most 0.6 |
| Method | free. Automatic weights are allowed; if they fail on a primitive-built mesh, weights are assigned by script from distance to bone segments. The result is what is gated, not the method |
| Shape keys | none |

### 21.6 Idle animation and FEATURE-006

- The idle clip moves only `Breath`, `Neck`, and `Head` (section 32). Hips, legs, arms, and hands never move in FEATURE-005, so the feet stay planted and the poles stay vertical with no IK.
- A walk cycle is added later as a second action (`Walk`, in place, no root motion) on the same armature in the same `.blend`, and `avatar-base.glb` is re-exported. Every embedded variant deforms with it automatically. Rigid gear follows its slot and needs no change. Nothing built in FEATURE-005 is rebuilt.
- To prove that now, production renders one stride-pose stress test (section 26.3). The limb weights are exercised there, not in the idle clip.

## 22. Attachment and Slot Contract

### 22.1 Equipment slots (logical)

`HEAD`, `TORSO_INNER`, `TORSO_OUTER`, `BACK`, `HANDS`, `FEET`. `LEGS` is reserved: the base trousers occupy it and no MVP category targets it. The scene root is `Avatar_Root`. These map to PRD section 22's slots; left and right hand are one slot because the only hand gear is a pair.

### 22.2 Slot nodes (physical)

Slot nodes exist only where a separate rigid model attaches. Each is an Empty in Blender, parented to a bone, exported as a child node of that joint in `avatar-base.glb`.

| Slot node | Parent bone | Origin means | Nominal world position, B-space | Same point, G-space |
|---|---|---|---|---|
| `Slot_Head` | `Head` | Centre of the headband plane, at forehead height, on the head's vertical axis | 0, 0.015, 1.650 | 0, 1.650, -0.015 |
| `Slot_Back` | `Chest` | Point on the back surface of `Avatar_Top_Base`, on the midline, at shoulder-blade height | 0, 0.105, 1.300 | 0, 1.300, -0.105 |
| `Slot_Hand_L` | `Hand_L` | Centre of the grip inside the curled left hand | 0.475, -0.010, 0.895 | 0.475, 0.895, 0.010 |
| `Slot_Hand_R` | `Hand_R` | Centre of the grip inside the curled right hand | -0.475, -0.010, 0.895 | -0.475, 0.895, 0.010 |

Tolerances: each coordinate within ± 0.030 of nominal; `Slot_Head` and `Slot_Back` x within ± 0.001 of 0; the two hand slots mirror each other within 0.001.

### 22.3 Slot axes

**At rest pose every slot node's world rotation is identity and its world scale is 1.** A slot's local axes therefore equal the avatar's axes:

| Axis | G-space meaning | B-space meaning |
|---|---|---|
| +X | avatar's left | avatar's left |
| +Y (G) / +Z (B) | up | up |
| +Z (G) / -Y (B) | avatar's front | avatar's front |

The parent bone's own orientation is compensated inside the slot node's local transform in the asset. The gate checks world transforms, never local ones (section 27.2).

### 22.4 Gear origin rule

- In the `.blend`, each attached gear object is modelled in place on the avatar with its object origin exactly on its slot's world position (within 0.1 mm), rotation 0, scale 1, all applied.
- In the exported gear GLB, each attach node has translation (0, 0, 0), rotation identity, scale 1. Its geometry is expressed relative to the slot origin in avatar-aligned axes.
- At runtime the frontend calls the equivalent of `slotNode.add(attachNode)` and writes nothing to the attach node's position, rotation, or scale.

### 22.5 Category to mechanism

| `GearCategory` | Slot | Mechanism | Runtime action on equip |
|---|---|---|---|
| `BACKPACK` | `BACK` | attached model | load `gear-backpack.glb` once; add `Gear_Backpack` to `Slot_Back` |
| `TREKKING_POLES` | `HANDS` | attached model | load `gear-trekking-poles.glb` once; add `Gear_TrekkingPole_L` to `Slot_Hand_L` and `Gear_TrekkingPole_R` to `Slot_Hand_R` |
| `HEADLAMP` | `HEAD` | attached model | load `gear-headlamp.glb` once; add `Gear_Headlamp` to `Slot_Head` |
| `RAIN_GEAR` | `TORSO_OUTER` | embedded variant | show `Wear_Shell`; hide `Avatar_Top_Base`, `Wear_WarmLayer_Body` |
| `WARM_LAYER` | `TORSO_INNER` | embedded variant | show `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`; hide `Avatar_Top_Base` |
| `FOOTWEAR` | `FEET` | embedded variant | show `Wear_Boots`; hide `Avatar_Shoes_Default` |

### 22.6 No frontend offsets

No file under `Project/Frontend/src/` contains a position, rotation, or scale number that places an avatar part or a gear model. The only transform numbers the frontend owns are the camera, the lights, and the ground shadow (sections 30 and 31). Gear that sits wrongly is an asset defect: it is reported to the lead and repaired in the `.blend` by `three-d` (section 40). The frontend never compensates.

## 23. Blender Source and Export Conventions

### 23.1 Paths

| What | Exact path | In git | Ships to the browser |
|---|---|---|---|
| Source file (one) | `assets/blender/feature005/avatar-gear-studio.blend` | yes | no |
| Preview renders | `assets/blender/feature005/previews/*.png` | yes | no |
| Asset Gate evidence | `assets/blender/feature005/evidence/` (`exporter-options.txt`, `export-log.txt`, `glb-readback.json`, `blend-inventory.json`, `sha256.txt`) | yes | no |
| Third-party record | `assets/blender/feature005/THIRD_PARTY.md`, created only if a third-party asset is ever used. Expected: absent | | no |
| Avatar GLB | `Project/Frontend/public/models/avatar/avatar-base.glb` | yes | yes |
| Gear GLBs | `Project/Frontend/public/models/gear/gear-backpack.glb`, `gear-trekking-poles.glb`, `gear-headlamp.glb` | yes | yes |
| Experiments, spikes, WIP looks | the session scratch directory only | no | no |

Nothing but those four GLBs is written under `Project/Frontend/public/models/`. `gear-rain-shell.glb`, `gear-warm-layer.glb`, and `gear-footwear.glb` do not exist by design (section 21.1).

**One `.blend`, not several.** Gear is modelled in place against the avatar and its rig, and every preview needs all of it. One file avoids linked libraries and broken relative links. Cost: one file is a single point of loss, which the save rule (section 26) covers.

**Backup files.** `*.blend1`, `*.blend2`, and `*.recovered.blend` are never production assets and are never committed. Implementation requirement, to be done when asset production begins (not now): the root `.gitignore` gains `*.blend1` and `*.blend2`.

### 23.2 Scene

| Setting | Value |
|---|---|
| Unit system, scale, length | Metric, 1.0, metres. 1 Blender unit = 1 m |
| Axes | Z up; the avatar faces -Y; the avatar's left is +X |
| Frame rate, range | 30 fps, frames 1 to 121 |
| Ground | the plane z = 0. The avatar's origin is (0, 0, 0): on the ground, midway between the feet |

### 23.3 Collections and objects

| Collection | Contents (exact object names) | Exported to |
|---|---|---|
| `F005_Avatar` | `Avatar_Root` (Empty), `Avatar_Armature`, the 11 skinned meshes of section 20.2, `Slot_Head`, `Slot_Back`, `Slot_Hand_L`, `Slot_Hand_R` | `avatar-base.glb` |
| `F005_Gear_Backpack` | `Gear_Backpack` | `gear-backpack.glb` |
| `F005_Gear_TrekkingPoles` | `Gear_TrekkingPole_L`, `Gear_TrekkingPole_R` | `gear-trekking-poles.glb` |
| `F005_Gear_Headlamp` | `Gear_Headlamp` | `gear-headlamp.glb` |
| `F005_Preview` | `Preview_Camera`, `Preview_Key`, `Preview_Fill`; names start with `Preview_` | never |
| `F005_Scratch` | anything temporary | never; empty or absent at the Asset Gate |

Naming rules, for objects, mesh data, bones, materials, and actions used by an exported or `Preview_` object (CA14):

- Every name matches `^[A-Za-z][A-Za-z0-9_]*$`. No dot, space, or hyphen. A name ending in `.001` (Blender's duplicate suffix) fails the gate.
- Mesh data is named `<ObjectName>_Mesh` (for example `Wear_Shell_Mesh`), so no mesh name equals a node name.
- Prefixes: `Avatar_` base avatar, `Wear_` embedded gear variant, `Gear_` attached gear, `Slot_` slot node, `Preview_` never exported. Materials: `Avatar_Mat_*`, `Wear_Mat_*`, `Gear_Mat_*`.
- Node names are unique across all four GLBs.

### 23.4 Object and mesh rules

| Rule | Value |
|---|---|
| Hierarchy | `Avatar_Root` at the origin with identity transform; `Avatar_Armature` is its child with identity transform; skinned meshes are children of `Avatar_Armature`; slot Empties are bone-parented |
| Skinned mesh transforms | location 0, rotation 0, scale 1, applied |
| Attached gear in the source | parented to its slot Empty with an identity local matrix and an identity parent-inverse matrix. That is rule 22.4 in checkable form |
| Modifiers at the pre-export save | skinned meshes: exactly one Armature modifier. Rigid gear: none. Mirror, Subdivision, Solidify, and Bevel are applied before weighting |
| Topology | triangles and quads only, no n-gons; no loose vertices or edges; vertices merged at the mirror seam (0.1 mm); normals recalculated outward; smooth shading with sharp edges marked where a crease is wanted |
| Thickness | no single-sided sheet. Hood, straps, bands, and hems have real thickness, because all materials are single-sided |
| UV maps, vertex colours, shape keys | none |
| Custom properties, drivers, constraints, physics, particles, geometry nodes | none on exported objects |
| Actions | exactly one Action in the file at export time, `Idle` (or none, if the idle clip is dropped under section 32). The stress pose of section 26.3 is applied for the render and cleared, never keyed |
| Visibility | every exported object is visible and selectable at export. The GLB carries no visibility state; default visibility is the manifest's (section 25) |

### 23.5 Materials

One Principled BSDF per material, found by node type, never by node name. Base Color is the palette value of section 19, set on the shader input (a viewport colour alone is not exported). Metallic 0, Roughness 1, IOR 1.5, no emission, alpha 1, blend mode opaque, backface culling on. No image texture node anywhere. A material slot with no faces assigned is removed. Specular IOR Level 0.5, Specular Tint white, Coat, Sheen and Transmission weights 0, Emission Strength 0 (the Blender defaults); `use_backface_culling` is set explicitly, because its default is off (CA9).

### 23.6 glTF exporter settings

`bpy.ops.export_scene.gltf`, option names as in the Blender 4.x exporter. **TBC-A:** before the first export, production dumps the operator's actual property list in Blender 5.2.2 to `evidence/exporter-options.txt`; an option below that no longer exists, or whose enum values changed, is reported to the lead with its replacement, not silently dropped. The read-back in section 27 is what decides pass or fail, not the option list.

| Option | Value | Why |
|---|---|---|
| `export_format` | `'GLB'` | one binary file, buffers embedded |
| `use_selection` | `True` | the recipe selects exactly the contract's object list |
| `use_visible`, `use_renderable`, `use_active_collection`, `use_active_scene` | `False` | selection alone decides |
| `export_yup` | `True` | glTF is +Y up |
| `export_apply` | `True` | harmless: only Armature modifiers remain |
| `export_normals` | `True` | |
| `export_texcoords` | `False` | no UVs |
| `export_tangents` | `False` | |
| `export_vertex_color` | `'NONE'` | (older name: `export_colors=False`) |
| `export_attributes` | `False` | |
| `export_materials` | `'EXPORT'` | |
| `export_image_format` | `'NONE'` | no images |
| `export_cameras`, `export_lights` | `False` | |
| `export_extras` | `False` | no custom properties |
| `export_draco_mesh_compression_enable` | `False` | forbidden extension |
| `export_morph` | `False` | |
| `export_skins` | `True` for the avatar, irrelevant for gear | |
| `export_all_influences` | `False` | at most 4 influences |
| `export_def_bones` | `False` | every bone is exported, including `Root` |
| `export_rest_position_armature` | `True` | node transforms are the rest pose |
| `export_hierarchy_flatten_bones`, `export_hierarchy_flatten_objs`, `export_armature_object_remove`, `export_leaf_bone`, `export_gpu_instances`, `export_gn_mesh` | `False` | keep the named hierarchy as authored |
| `export_animations` | `True` for the avatar, `False` for gear | |
| `export_animation_mode` | `'ACTIONS'` | clip named after the Action. If the exported name is not exactly `Idle`, use `'NLA_TRACKS'` with one track named `Idle` |
| `export_force_sampling`, `export_frame_step` | `True`, `1` | baked, 30 samples per second |
| `export_frame_range` | `True` | frames 1 to 121 |
| `export_optimize_animation_size` | `True` | drop constant channels |
| `export_current_frame`, `export_reset_pose_bones` | `False`, `True` | |
| `check_existing` | `False` | |
| `export_anim_slide_to_zero` | `True` | key times start at 0.0 s (CA1) |
| `export_optimize_animation_keep_anim_armature` | `False` | only keyed channels are exported (CA18) |
| `export_hierarchy_full_collections`, `export_meshopt_compression_enable`, `export_use_gltfpack`, `export_bake_animation`, `export_shared_accessors`, `export_unused_images`, `export_unused_textures`, `export_extra_animations`, `export_action_filter`, `will_save_settings` | `False` | pinned, not inherited (CA8) |
| `export_influence_nb` | `4` | (CA8) |
| `export_merge_animation` | `'ACTION'` | (CA8) |
| `export_anim_single_armature` | `True` | (CA8) |

Every option is passed explicitly and never inherited from the session's remembered operator settings (CA8). Confirmed in Blender 5.2.2 LTS with glTF addon 5.2.40: every option name above exists as spelled.

### 23.7 Export recipe

All four exports are one script run after the pre-export save, with the armature's pose cleared and the frame at 1.

| File | Recipe |
|---|---|
| `avatar-base.glb` | Deselect all. Select exactly the 17 objects of `F005_Avatar`. Assert the selection equals that list. Export |
| each gear GLB | For each attach object: assert parent is its slot and local matrix is identity; clear the parent and set the world matrix to identity (the object is now at the origin). Deselect all, select the file's attach objects, export. Restore the parent and the identity local and parent-inverse matrices. Assert the world matrix equals the value recorded before |

After each export: the operator returned `{'FINISHED'}`, the file starts with `glTF`, and the GLB's JSON chunk is read back into `evidence/glb-readback.json`. A failed assertion stops the script before anything is written.

## 24. GLB Runtime Contract

### 24.1 General

| Item | Contract |
|---|---|
| Format | glTF 2.0 binary (`.glb`): 12-byte header, one JSON chunk, one BIN chunk |
| Unit | metres |
| Orientation, G-space (what the browser sees) | +Y up; the avatar faces +Z; the avatar's left is +X |
| Orientation, B-space (what Blender shows) | +Z up; the avatar faces -Y; the avatar's left is +X |
| Avatar origin | on the ground, midway between the feet: (0, 0, 0) in both spaces. Soles touch y = 0 (G) |
| Scene | exactly one scene |
| Buffers | exactly one, embedded; no `uri` |
| Images, textures, samplers | none. Colours come from material `baseColorFactor` only. No vertex colours, no palette texture |
| Cameras, lights | none |
| `extensionsRequired` | absent or empty |
| `extensionsUsed` | target: absent. Tolerated if the exporter emits them (the runtime ignores them): `KHR_materials_ior`, `KHR_materials_specular`, `KHR_materials_emissive_strength`. Anything else fails |
| Explicitly forbidden | `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_texture_basisu`, `EXT_texture_webp`, `KHR_mesh_quantization`, `KHR_lights_punctual`, `KHR_materials_variants`, `EXT_mesh_gpu_instancing`, `KHR_texture_transform`. No compression is self-hosted: the whole model set is under 2 MB and a decoder would add a second asset pipeline and a second failure mode |
| Primitives | mode 4 (triangles); attributes `POSITION`, `NORMAL`, plus `JOINTS_0` and `WEIGHTS_0` on skinned meshes. No `TEXCOORD_n`, `COLOR_n`, `TANGENT`, `JOINTS_1`, morph targets |
| Materials | `doubleSided` false; `alphaMode` opaque; `metallicFactor` 0; `roughnessFactor` 1; no texture reference |
| Node scale | every node's scale is (1, 1, 1) within 0.001 |
| Re-import | each file imports into a factory-startup background Blender with `{'FINISHED'}` and the names below |

### 24.2 `avatar-base.glb`

| Kind | Count | Exact names |
|---|---:|---|
| Scene root node | 1 | `Avatar_Root` (translation 0, rotation identity, scale 1) |
| Armature node | 1 | `Avatar_Armature` (identity) |
| Joint nodes | 23 | `Root`, `Hips`, `Spine`, `Chest`, `Breath`, `Neck`, `Head`, `Shoulder_L`, `UpperArm_L`, `LowerArm_L`, `Hand_L`, `Shoulder_R`, `UpperArm_R`, `LowerArm_R`, `Hand_R`, `UpperLeg_L`, `LowerLeg_L`, `Foot_L`, `Toes_L`, `UpperLeg_R`, `LowerLeg_R`, `Foot_R`, `Toes_R` |
| Slot nodes | 4 | `Slot_Head` (child of `Head`), `Slot_Back` (child of `Chest`), `Slot_Hand_L` (child of `Hand_L`), `Slot_Hand_R` (child of `Hand_R`) |
| Skinned mesh nodes | 11 | `Avatar_Head`, `Avatar_Hair_Base`, `Avatar_Hair_Top`, `Avatar_Hands`, `Avatar_Legs`, `Avatar_Top_Base`, `Avatar_Shoes_Default`, `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`, `Wear_Shell`, `Wear_Boots` |
| Meshes | 11 | each node's name plus `_Mesh` |
| Skins | 1 | named `Avatar_Armature` (exporter-defined: the armature object's name) (CA2); all 11 meshes reference it; 23 joints, `Root` included (as exported) |
| Materials | 12 | `Avatar_Mat_Skin`, `Avatar_Mat_Hair`, `Avatar_Mat_Eye`, `Avatar_Mat_EyeLight`, `Avatar_Mat_Top`, `Avatar_Mat_Trousers`, `Avatar_Mat_Shoe`, `Avatar_Mat_Sole`, `Wear_Mat_Fleece`, `Wear_Mat_Shell`, `Wear_Mat_ShellTrim`, `Wear_Mat_Boot` |
| Animations | 1 | `Idle` (0 if dropped under section 32, recorded by the lead) |
| Total nodes | 40 | no other node. A node named `neutral_bone` fails |

Where the exporter places the skinned mesh nodes in the hierarchy is exporter-defined; they must be descendants of `Avatar_Root`. As exported they are children of `Avatar_Armature`. Opened in a generic viewer the file shows every variant overlapped (base top, fleece, and shell at once). That is expected.

Material use per mesh: `Avatar_Head`: Skin, Eye, EyeLight. `Avatar_Hair_Base`, `Avatar_Hair_Top`: Hair. `Avatar_Hands`: Skin. `Avatar_Legs`: Trousers. `Avatar_Top_Base`: Top. `Avatar_Shoes_Default`: Shoe, Sole. `Wear_WarmLayer_Body`, `Wear_WarmLayer_Collar`: Fleece. `Wear_Shell`: Shell, ShellTrim. `Wear_Boots`: Boot, Sole.

### 24.3 Gear files

| File | Scene root nodes (each: translation 0, rotation identity, scale 1) | Meshes | Materials | Skins, animations |
|---|---|---|---|---|
| `gear-backpack.glb` | `Gear_Backpack` | `Gear_Backpack_Mesh` | `Gear_Mat_Pack_Body`, `Gear_Mat_Pack_Trim`, `Gear_Mat_Pack_Accent` | none |
| `gear-trekking-poles.glb` | `Gear_TrekkingPole_L`, `Gear_TrekkingPole_R` | `Gear_TrekkingPole_L_Mesh`, `Gear_TrekkingPole_R_Mesh` | `Gear_Mat_Pole_Shaft`, `Gear_Mat_Pole_Grip`, `Gear_Mat_Pole_Accent` | none |
| `gear-headlamp.glb` | `Gear_Headlamp` | `Gear_Headlamp_Mesh` | `Gear_Mat_Lamp_Body`, `Gear_Mat_Lamp_Lens`, `Gear_Mat_Lamp_Band` | none |

No other node. Geometry is expressed relative to the slot origin in avatar-aligned axes (section 22.4), so the two poles overlap when the file is opened on its own. That is expected.

### 24.4 Extents

"Assembled" means the gear's local bounds added to its slot's as-built world position from `avatar-base.glb`. B-space; for G-space read z as y and -y as z.

| Subject | Must hold |
|---|---|
| Avatar, all meshes | lowest point z in [-0.002, 0.002]; highest point in [1.73, 1.77] and belonging to `Avatar_Hair_Top`; x extent 0.94 to 1.08 and symmetric within 0.005; y extent 0.26 to 0.42 |
| `Wear_Boots`, `Avatar_Shoes_Default` | each: lowest point z in [-0.002, 0.002] |
| Backpack, assembled | x within ± 0.21; front-most y in [-0.17, -0.12]; rear-most y in [0.28, 0.36]; lowest z in [0.86, 0.98]; highest z in [1.42, 1.48] |
| Each pole, assembled | lowest z in [0.000, 0.010]; highest z in [0.96, 1.08]; x and y extents each 0.08 or less (so it is vertical) |
| Headlamp, assembled | lowest z in [slot z − 0.045, slot z − 0.012]; highest z in [slot z + 0.012, slot z + 0.045], where slot z is the as-built `Slot_Head` world z (CA4); x extent 0.17 to 0.27 and symmetric within 0.005; y extent 0.19 to 0.32; front-most y in [-0.17, -0.09] (the lamp is on the avatar's front); centred on the `Slot_Head` axis in x within 0.005 |
| Full loadout, assembled | height 1.82 or less; no vertex farther than 0.54 from the vertical axis through the origin. The camera of section 30 relies on both |

### 24.5 Facing and handedness (checkable from the file)

| Check, G-space | Value |
|---|---|
| Every vertex of the `Avatar_Mat_Eye` primitive | z of +0.05 or more (the face is on the +Z side) |
| `Slot_Back` world z | -0.06 or less |
| `Toes_L` world z minus `Foot_L` world z | +0.05 or more |
| `Slot_Hand_L` world x; `Slot_Hand_R` world x | +0.40 or more; -0.40 or less |
| `Head` joint world y | 1.44 to 1.52 |
| Every vertex of the `Gear_Mat_Lamp_Lens` primitive, in `gear-headlamp.glb`'s own coordinates | z of +0.06 or more (the lens is in front of the slot, on the avatar's front) |

### 24.6 Colour

`baseColorFactor` of each material equals the section 19 palette value converted from sRGB to linear, each channel within 0.01; alpha 1. The GLB is the single source of colour: the runtime reads it and keeps no colour table of its own.

## 25. Asset Manifest

| Decision | Value |
|---|---|
| Location | `Project/Frontend/src/features/avatar/avatarManifest.ts`. Written by `frontend` as a mirror of this section; this section is the source of truth |
| Format | a typed TypeScript module, not JSON under `public/`. It is checked by the compiler (`satisfies`, exhaustive `Record` over all 11 categories), needs no request and so adds no loading or failure state, and cannot drift from the code that reads it |
| Imports | none from `three`, React, or any business feature. It is plain data and may be imported anywhere without pulling in the 3D chunk |
| Consequence for the gates | the Asset Gate runs before this file exists, so it checks the GLBs against this section. The lead's diff review checks the file against this section |

React business components never contain a model path, a node name, or a slot name. They pass visual categories; only `features/avatar` reads the manifest's asset fields.

### 25.1 Schema

```ts
export type GearCategoryKey =
  | 'FOOTWEAR' | 'RAIN_GEAR' | 'WARM_LAYER' | 'WIND_LAYER' | 'TREKKING_POLES' | 'TRACTION'
  | 'HEADLAMP' | 'BACKPACK' | 'WATER' | 'FOOD' | 'SUN_PROTECTION';   // backend wire values, declared locally

export type VisualCategory =
  | 'BACKPACK' | 'RAIN_SHELL' | 'WARM_LAYER' | 'HIKING_BOOTS' | 'TREKKING_POLES' | 'HEADLAMP';

export type EquipmentSlot = 'HEAD' | 'TORSO_INNER' | 'TORSO_OUTER' | 'BACK' | 'HANDS' | 'FEET';
export type SlotNode = 'Slot_Head' | 'Slot_Back' | 'Slot_Hand_L' | 'Slot_Hand_R';

type Representation =
  | { kind: 'embedded-variant'; show: readonly string[] }            // nodes inside the avatar GLB
  | { kind: 'attached-model';
      model: string;                                                 // path under the public root
      attachments: readonly { node: string; slotNode: SlotNode }[];
      load: 'after-ready' | 'on-equip' };

export interface VisualEntry {
  slot: EquipmentSlot;
  layer: 1 | 2 | 3;                  // 1 worn, 2 outer shell, 3 carried over clothing
  representation: Representation;
  hide: readonly string[];           // nodes hidden while this category is equipped
}

export interface AvatarManifest {
  version: number;                   // bumped whenever any GLB changes; appended to model URLs as ?v=
  avatar: {
    model: string;
    rootNode: 'Avatar_Root';
    slotNodes: readonly SlotNode[];
    defaultHidden: readonly string[];
    requiredNodes: readonly string[];  // validated after load (section 34)
    idleClip: 'Idle' | null;
  };
  gear: Record<GearCategoryKey, VisualCategory | null>;   // null = UI-only
  visuals: Record<VisualCategory, VisualEntry>;
}
```

`layer` is validated, not interpreted: an entry may hide only base avatar nodes or nodes shown by an entry with a lower layer. Visibility itself is resolved by the order-independent rule of section 29.1.

### 25.2 Content (this is the contract; the file reproduces it)

```ts
export const avatarManifest = {
  version: 1,
  avatar: {
    model: 'models/avatar/avatar-base.glb',
    rootNode: 'Avatar_Root',
    slotNodes: ['Slot_Head', 'Slot_Back', 'Slot_Hand_L', 'Slot_Hand_R'],
    defaultHidden: ['Wear_WarmLayer_Body', 'Wear_WarmLayer_Collar', 'Wear_Shell', 'Wear_Boots'],
    requiredNodes: ['Avatar_Root', 'Avatar_Head', 'Avatar_Hair_Base', 'Avatar_Hair_Top', 'Avatar_Hands',
      'Avatar_Legs', 'Avatar_Top_Base', 'Avatar_Shoes_Default', 'Wear_WarmLayer_Body',
      'Wear_WarmLayer_Collar', 'Wear_Shell', 'Wear_Boots'],
    idleClip: 'Idle',
  },
  gear: {
    BACKPACK: 'BACKPACK', RAIN_GEAR: 'RAIN_SHELL', WARM_LAYER: 'WARM_LAYER', FOOTWEAR: 'HIKING_BOOTS',
    TREKKING_POLES: 'TREKKING_POLES', HEADLAMP: 'HEADLAMP',
    WIND_LAYER: null, TRACTION: null, WATER: null, FOOD: null, SUN_PROTECTION: null,
  },
  visuals: {
    WARM_LAYER:   { slot: 'TORSO_INNER', layer: 1, hide: ['Avatar_Top_Base'],
                    representation: { kind: 'embedded-variant', show: ['Wear_WarmLayer_Body', 'Wear_WarmLayer_Collar'] } },
    RAIN_SHELL:   { slot: 'TORSO_OUTER', layer: 2, hide: ['Avatar_Top_Base', 'Wear_WarmLayer_Body'],
                    representation: { kind: 'embedded-variant', show: ['Wear_Shell'] } },
    HIKING_BOOTS: { slot: 'FEET', layer: 1, hide: ['Avatar_Shoes_Default'],
                    representation: { kind: 'embedded-variant', show: ['Wear_Boots'] } },
    BACKPACK:     { slot: 'BACK', layer: 3, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-backpack.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_Backpack', slotNode: 'Slot_Back' }] } },
    TREKKING_POLES: { slot: 'HANDS', layer: 1, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-trekking-poles.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_TrekkingPole_L', slotNode: 'Slot_Hand_L' },
                                    { node: 'Gear_TrekkingPole_R', slotNode: 'Slot_Hand_R' }] } },
    HEADLAMP:     { slot: 'HEAD', layer: 1, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-headlamp.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_Headlamp', slotNode: 'Slot_Head' }] } },
  },
} as const satisfies AvatarManifest;
```

The UI-only categories are exactly the five `null` entries. Model URLs are built by `features/avatar` as base URL + path + `?v=` + `version`, because files under `public/` are not content-hashed and a repaired GLB must not be served from a stale cache.

## 26. Blender MCP Production Workflow

This is Stage C. It runs only after the user has started the feature cycle on the frozen specification, the contract is frozen, and Stage A has passed in that session.

### 26.1 Shared-instance rule

First call: `mcp__blender__get_addon_status`. If the tool is missing or the addon does not answer, stop and report. Then read `bpy.data.filepath` and `bpy.data.is_dirty`.

| The session holds | Action |
|---|---|
| `avatar-gear-studio.blend` at the approved path | continue; on a resume, inventory it and produce only what is missing |
| The untouched startup file (no path, not dirty) and the source does not exist yet | delete only `Cube`, `Light`, `Camera` and purge their orphan data; save at once to the approved path (CA14) |
| The untouched startup file and the source already exists on disk | opening it replaces the session's file, so it needs the lead's go-ahead in the Stage C brief |
| Any other file, or unsaved work that is not this feature's | stop and report. Never load over it, never reset it |

Everything is built by Python through `mcp__blender__execute_blender_code`: primitives, modifiers, scripted vertex edits, scripted weights. No sculpting, no hand painting, no manual retopology, no simulation, no imported or generated model.

### 26.2 Steps

Every step ends with a save of the source to its approved path. No step starts before the previous save is reported.

| Step | Work | Ends with |
|---|---|---|
| P0 | Preflight in a separate background Blender (`--factory-startup`), files in the scratch directory; the shared session is not touched (CA7). Dump the exporter's option list; export a test rig with a root Empty above the armature, skinned cubes (one with two materials), a bone-parented Empty with a rigid cube exported by the 23.7 gear recipe, and one action; read it back; one background EEVEE render. Confirms every TBC-A item of sections 23.6 and 24.2 | report only (no source yet) |
| S1 | Base avatar meshes in rest pose, materials, no rig | save; a three-quarter look sent to the lead. **Style check by the lead:** the lead accepts the look against section 19 or sends it back before any gear is built. It is an in-cycle check and never a stop for the user (Q13) |
| S2 | Armature, weights, `Avatar_Root`, the four slot Empties; rest pose verified | save |
| S3a, S3b, S3c | `Wear_WarmLayer_Body` and `_Collar`; `Wear_Shell`; `Wear_Boots`; weights transferred | save after each |
| S4, S5, S6 | `Gear_Backpack`; `Gear_TrekkingPole_L` and `_R`; `Gear_Headlamp`; each parented to its slot with identity local matrix | save after each |
| S7 | `Idle` action, or the recorded decision to drop it (section 32) | save |
| S8 | Pre-export validation script over the source: names, transforms, modifiers, n-gons, materials, actions, triangle counts, extents, `F005_Scratch` empty; written to `evidence/blend-inventory.json` | save (the pre-export save) |
| S9 | Export the four GLBs by the recipe of section 23.7; read each back; write `exporter-options.txt`, `export-log.txt`, `glb-readback.json`, `sha256.txt` (CA11) | save (the post-export save) |
| S10 | Preview renders of section 26.3 | pose cleared, frame 1, every exported object visible in viewport and render; save (CA12) |

**Reported to the lead after each save:** the step id; what was completed; the `.blend` path, size in bytes, and modification time; the value Blender returned for the save; the object and triangle counts; and any deviation from this contract. The lead copies it to the checkpoint's `Last saved` line.

A contract value that turns out to be wrong or unreachable is reported, not modelled around.

### 26.3 Required preview renders

PNG, 768 x 1024, rendered through `Preview_Camera`, which reproduces the runtime camera of section 30 (vertical field of view 30 degrees, distance 4.3, pitch 10 degrees, aim height 0.872). Flat background `#18362E` (inside the Stage backdrop's range, so the value rule is judged as shipped). Backface culling honoured. Engine `BLENDER_EEVEE`; view transform `Standard`, look none, exposure 0, gamma 1; dither 0; camera rays see the flat background colour, and lighting adds a neutral ambient of 0.28 so faces turned from both lights are not black; film not transparent; `Preview_Camera` sensor fit `VERTICAL`. The `RT` process sets the same (CA6). Angles: `front` 0, `q3` 30 (the runtime default), `side` 90, `back` 180 degrees of azimuth toward the avatar's left.

| Loadout | Equipped | Angles | Files |
|---|---|---|---|
| `L0-none` | nothing | front, q3, side, back | 4 |
| `L1-backpack` | `BACKPACK` | q3, back | 2 |
| `L2-rain-shell` | `RAIN_GEAR` | q3, back | 2 |
| `L3-warm-layer` | `WARM_LAYER` | q3, back | 2 |
| `L4-footwear` | `FOOTWEAR` | q3, back | 2 |
| `L5-trekking-poles` | `TREKKING_POLES` | q3, back | 2 |
| `L6-headlamp` | `HEADLAMP` | q3, back | 2 |
| `L7-warm-shell-pack` | `WARM_LAYER`, `RAIN_GEAR`, `BACKPACK` | front, q3, side, back | 4 |
| `L8-full` | all six | front, q3, side, back | 4 |
| `ST-stride` | all six, stress pose: one thigh 30 degrees forward, the other 20 back, knees 45, elbows 60, upper arms swung 25 | q3, side | 2 |
| `RT-L0-none`, `RT-L8-full` | rendered from the **exported GLBs**, re-imported into a separate background Blender and assembled only by the rules of sections 22 and 25; background `#808080` | L0: q3. L8: q3, back | 3 |

File name: `<loadout>_<angle>.png`, for example `L7-warm-shell-pack_side.png`. 29 files. The renders are required evidence for the lead's Asset Gate (section 27). They are not a product approval step: nobody outside the cycle is asked to approve them, and the cycle does not wait on them (Q13). Visibility in every render follows section 29.1 exactly. If the background Blender cannot render with the session's engine, the `RT` set uses Workbench (TBC-A).

## 27. Asset Gate

Run by the lead on the files in the tree, after `three-d` reports. When it passes, the cycle continues to the frontend's 3D integration at once: no product approval sits between this gate and Stage E (section 41.1). Any failed row fails the gate. A failing asset is repaired in the `.blend` and re-exported by `three-d` (one asset repair cycle); the frontend never compensates with a transform, a scale, or a material override. A row that does not apply is recorded as not applicable, not as passed.

### 27.1 Files

| Check | Pass |
|---|---|
| The seven expected items exist at the exact paths of section 23.1: one `.blend`, four GLBs, `previews/` with 29 PNGs, `evidence/` with its five files | all present, names exact |
| Nothing else under `Project/Frontend/public/models/`; no `.blend1`, `.blend2`, or `.recovered.blend` tracked | true |
| Each GLB header | bytes 0 to 3 are `glTF`; version 2; declared length equals the file size |
| File size | `avatar-base.glb` 1,500,000 bytes or less; `gear-backpack.glb` 250,000; `gear-trekking-poles.glb` 120,000; `gear-headlamp.glb` 120,000 |
| Triangles (sum of index counts / 3) | avatar 30,000 or less in total and 16,000 or less in the default-visible nodes; backpack 5,000; poles 1,500 (both); headlamp 1,500; worst loadout (all six equipped, visibility by 29.1) 28,000 or less (CA13) |
| Primitives (draw calls) | avatar 20 or less (16 expected); backpack exactly 3; poles exactly 6; headlamp exactly 3 (CA13) |

### 27.2 GLB JSON, per file

| Check | Pass |
|---|---|
| `asset.version` | `"2.0"` |
| Node, mesh, material, skin, and animation names and counts | exactly sections 24.2 and 24.3; no name matching `\.\d{3}$`; no `neutral_bone` |
| Scene roots | avatar: `Avatar_Root` only. Gear: exactly the attach nodes |
| Root and attach node transforms | translation within 0.0001 of 0; rotation identity; scale 1 |
| Every node's scale | 1 within 0.001 |
| Buffers and images | one buffer without `uri`; no `images`, `textures`, or `samplers` |
| `cameras`; `KHR_lights_punctual` | absent |
| Extensions | section 24.1's allow-list; none required |
| Primitive attributes | section 24.1; `JOINTS_0` on all 11 avatar meshes and on no gear mesh |
| Materials | section 24.1 flags; `baseColorFactor` within 0.01 per channel of section 19 |
| Slot nodes: parent joint | section 22.2 |
| Slot nodes: world transform at rest (composed down the node hierarchy) | position within section 22.2's tolerances; rotation within 0.5 degrees of identity; scale 1 within 0.001 |
| Extents, facing, handedness | sections 24.4 and 24.5 |
| Pole length ties to the avatar | each pole's lowest local point plus its slot's world height is in [0.000, 0.010] (CA3) |
| Animation (if present) | exactly one, `Idle`; first key time 0 within 0.0001; last key time 3.96 to 4.04 s (CA1); first and last keys equal within 0.0001; first key equals the node's rest transform within 0.0001 (CA10); section 32's motion limits |

### 27.3 Background Blender

Separate processes; read-only; the running session is not touched.

| Check | Pass |
|---|---|
| Each GLB imports with `--factory-startup` (and `disable_bone_shape=True`, so the importer adds no helper object) | `{'FINISHED'}`; object names as contracted; `avatar-base.glb`: one armature with 23 bones (CA15); dimensions inside section 24.4 |
| The `.blend` opens | objects and collections as section 23.3; `F005_Scratch` empty or absent |
| Source transforms | skinned meshes at identity; each gear object parented to its slot with identity local and parent-inverse matrices |
| Source hygiene | modifiers as section 23.4; zero n-gons; no image used by any material; Actions as section 23.4 |
| Evidence agrees with the files | `sha256.txt` matches the four GLBs now in the tree |

### 27.4 Visual checks on the previews

The lead opens every PNG at 100 %. At this camera one pixel is about 2.2 mm on the avatar and the head is about 90 px wide.

| Check | Pass |
|---|---|
| Severe clipping | none in `L0` to `L8` and `RT`. A clipping defect is **severe** when a surface that should be covered shows through another, or a hole or back face is visible, over a patch whose longest side is 8 px or more (about 18 mm, one eleventh of the head width), or when one image has more than three such patches of 3 px or more. The designed intersections of section 20.3 are not defects |
| Layer rule | `L7` shows the shell, the fleece collar inside its neck opening, no fleece body, straps over the shell |
| Attachment | pack against the back with no gap; headlamp band seated round the head with no gap and no hair through it, its housing centred on the forehead and uncovered; pole grips inside the fists and tips on the ground; boots under the trouser hems |
| Default view | in each of `L1` to `L6` at `q3`, the equipped category is visibly different from `L0` at `q3` without turning |
| Value | every gear model reads against the background by lightness, not hue alone |
| Round trip | `RT-L0` and `RT-L8` match `L0` and `L8` at the same angle in pose, placement, and colour. A mismatch means the export or the slot contract is wrong, not the modelling |
| Stride | `ST-stride`: no torn, detached, or unweighted geometry and no hole. Layer poke-through in this pose is recorded as input to FEATURE-006 and does not fail FEATURE-005 |
| Style | sections 19's "polished enough" list |

## 28. Realtime Viewer Architecture

### 28.1 Packages

| Package | Decision |
|---|---|
| `three` | approved, runtime dependency |
| `@react-three/fiber` | approved, runtime dependency |
| `@types/three` | approved as a dev dependency only if `three` does not ship its own types (TBC-I) |
| `@react-three/drei` | **not approved** (D12). After the camera decision of section 30 nothing in it is needed: there is no orbit-controls use, no environment, no text. It is a large dependency whose defaults reach public CDNs |
| From three's examples | `GLTFLoader` only. No `DRACOLoader`, `KTX2Loader`, `MeshoptDecoder`, `RGBELoader`, `OrbitControls`, post-processing |

**Dependency rule (final).** If `three` and `@react-three/fiber` are not already installed, `frontend` is explicitly authorized to add them to `package.json` and `package-lock.json`: only the minimum runtime dependencies this specification requires, and nothing else. `@react-three/drei` is not added unless a later blocker proves it necessary and the lead approves that scope change.

Versions: the current release line of each that supports React 19, confirmed by `frontend` at implementation. None is pinned here. If drei is ever approved under the rule above, allowed: nothing but `OrbitControls`. Forbidden: `useGLTF` with default arguments (its default wires a Draco decoder URL on a public CDN, TBC-I), `Environment`, `Stage`, and `Lightformer` presets (download HDRIs), `Text` and `Text3D` (remote default font), `Loader` and `Html` (DOM belongs to section 16), `ContactShadows` and `AccumulativeShadows` (extra passes for a shadow section 31 does more cheaply).

No runtime request leaves the application's origin. Model requests are plain same-origin static requests and never carry the bearer token.

### 28.2 Module boundary

- `features/avatar` is a leaf. It imports nothing from a business feature, makes no API request, reads and writes no storage, and reads no route.
- No file outside `features/avatar` imports `three`, `@react-three/fiber`, or anything 3D.
- Inside `features/avatar`, the public entry exports only three-free code: the types below, `avatarManifest`, and `AvatarViewer`, a thin shell that does capability detection and holds the error boundary. Every file that imports `three` is reachable only through one dynamic `import()` made by that shell. So the 3D chunk is requested only when the viewer mounts, and importing the manifest or the types costs nothing.
- The parent mounts `AvatarViewer` only on the Studio route and only at 768 px viewport width or more (section 17). Below that it is not mounted: no 3D chunk and no model is requested.

### 28.3 Props, events, commands (illustrative types; names are the contract)

```ts
export type AvatarViewerState = 'loading' | 'ready' | 'partial' | 'unavailable';
export type CategoryDisplay = 'shown' | 'covered' | 'loading' | 'not-shown';
export type UnavailableReason =
  | 'no-webgl' | 'viewer-load-failed' | 'avatar-load-failed' | 'avatar-invalid' | 'context-lost' | 'render-error';

export interface AvatarViewerStatus {
  state: AvatarViewerState;
  display: Partial<Record<VisualCategory, CategoryDisplay>>;   // one entry per equipped category
  motion: 'none' | 'playing' | 'paused';                       // 'none': no idle clip, reduced motion, or not shown
  unavailable?: { reason: UnavailableReason; retryable: boolean };
}

export interface AvatarViewerProps {
  equipped: readonly VisualCategory[];   // order-insensitive; compared by content, not identity
  reducedMotion: boolean;
  paused: boolean;
  onStatusChange: (status: AvatarViewerStatus) => void;
  className?: string;
}

export interface AvatarViewerHandle {    // via ref
  turnLeft(): void;
  turnRight(): void;
  resetView(): void;
  retry(): void;
}
```

| Decision | Reason |
|---|---|
| UI to viewer carries only visual categories | never a gear item id, name, or `GearCategory`. The loadout module maps equipped `GearCategory` values through `avatarManifest.gear` and drops the `null` ones |
| View commands are imperative, not a controlled azimuth prop | a drag changes the azimuth every frame; a controlled prop would push every frame through React state. The view angle is presentation state and stays inside the viewer |
| `display` has a fourth value, `loading` | an attached model can still be in flight when its category is equipped. Section 16 renders it with note N5 |
| `covered` | at least one node the category shows is hidden by another equipped category's hide list. In the MVP: `WARM_LAYER` while `RAIN_SHELL` is equipped (its collar still shows) |
| `not-shown` | the category's model failed to load, or the state is `unavailable` |
| `motion` | tells section 16 whether to show Pause motion / Play motion. It is `'none'` whenever the loop cannot run |

`onStatusChange` fires once with the initial status, then only when the status changes by content, and never during render.

### 28.4 Ownership

| The viewer owns | The viewer never owns |
|---|---|
| The canvas, renderer, scene, camera, lights, ground shadow | Equipped state, the loadout, owned gear, gear names or ids |
| Loading, caching, and disposal of the avatar and gear models | Trail, date, readiness, recommendations |
| The runtime materials and the visibility rule of section 29.1 | Any API call, token, storage, route, or query cache |
| The idle animation mixer; the view angle | Any text, icon, spinner, fallback art, or button. Every state's appearance is DOM drawn by section 16 from `onStatusChange` |
| Its own error boundary and capability detection | Any transform that places gear (section 22.6) |

The viewer renders one root element containing one `<canvas>` and nothing else. The canvas fills the Stage box exactly (100 % by 100 %), is `aria-hidden="true"`, is not focusable, and has no key bindings.

### 28.5 Renderer and lifecycle

| Item | Contract |
|---|---|
| Instances | one canvas and one WebGL renderer per mount of `AvatarViewer` |
| Persistence | a change of `equipped`, `paused`, `reducedMotion`, or any React state outside the viewer never recreates the canvas or renderer, never reloads `avatar-base.glb`, and never reloads a gear model already loaded. No `key` that changes with business state |
| Evidence hooks | the root element carries `data-avatar-state` (the current state) and `data-avatar-renderer` (an integer that increases each time a renderer is created). The Integration Gate reads them |
| Capability detection | in the three-free shell, before the dynamic import: a throwaway canvas must return a `webgl2` context. `failIfMajorPerformanceCaveat` is false, so software rendering (which QA's browser may use) is accepted |
| Context | `alpha: true`, clear alpha 0, antialias on, no `preserveDrawingBuffer`, shadow maps off |
| Device pixel ratio | `min(devicePixelRatio, 2)` |
| Colour | output colour space sRGB; no tone mapping; exposure fixed at 1 |
| Render loop | on demand. A frame is drawn only when something changed: a resize, a visibility change, a model attached, a turn in progress, or the idle clip advancing. While the idle clip plays, frames run at display rate; they stop when the document is hidden, the Stage is off screen, `paused` is true, or `reducedMotion` is true. With no animation and no interaction the viewer draws zero frames |
| Skinned meshes | frustum culling off (bounds are computed in bind pose) |
| Context loss | `webglcontextlost` is prevented from discarding the canvas; if `webglcontextrestored` does not arrive within 4 s the state becomes `unavailable` (`context-lost`, retryable) |
| Error boundary | an exception anywhere in the scene is caught inside `features/avatar`; the page never unmounts because of it |
| Disposal on unmount | geometries, materials, runtime textures, the mixer, listeners, and the renderer are disposed and the context released. The model cache lives and dies with the viewer instance |

### 28.6 Shading

| Item | Contract |
|---|---|
| Look | stylized low-poly, cel-like: simple flat base colours, geometry-led forms, a restrained material palette, no image textures. Readable separation between the lit and the shadowed side comes from the runtime lighting of section 31 |
| Source of colour | the GLB's `baseColorFactor` per material (section 24.6). The runtime keeps no colour table of its own |
| Runtime material | the materials `GLTFLoader` builds from the GLB (metallic 0, roughness 1) are used as loaded. `frontend` may use another built-in three.js material with the same colour if that gives a cleaner flat look. Either way: one instance per glTF material name, no image texture, no specular highlight, no rim light, no bloom |
| Not required | a custom toon shader, any shader written for this feature, a fixed number of tonal bands, a ramp texture, post-processing. None of them is an acceptance criterion |
| Outline | none in the MVP. An inverted hull in the asset would double the triangle count and need skinning on every hull; a post-process outline is a second render pipeline. An outline may be added later at runtime with no asset change |
| Checks | flat colours and material names are verified in the GLB JSON (section 27.2). The look itself is judged in the browser, from pixels (AC-40) |

## 29. Equip and Unequip Runtime Behavior

### 29.1 The rule

Let E be the set in `equipped`. With the manifest of section 25:

```text
embedded node n is visible  <=>  ( n is not in avatar.defaultHidden  OR  n is in show(c) for some c in E )
                                 AND  n is not in hide(c) for any c in E
attached node a of category c is in the scene  <=>  c is in E  AND  its model has loaded
```

Hide always wins over show. The rule is a pure function of E: it does not depend on the order of equipping, on history, or on which item within a category is chosen. Visibility is toggled on the named node (which may be a group when a mesh has several materials), never by assuming a mesh.

### 29.2 Cases

| Event | What happens in the scene |
|---|---|
| Equip an embedded category (`RAIN_SHELL`, `WARM_LAYER`, `HIKING_BOOTS`) | the rule is re-applied; the change is drawn in the next frame |
| Equip an attached category whose model is loaded | its nodes are added to their slots; drawn in the next frame |
| Equip an attached category whose model is not loaded yet | the load starts (or its background load is promoted). The avatar is unchanged meanwhile; `display` for that category is `loading`. When the model arrives and the category is still equipped, it is attached and drawn; if it was unequipped meanwhile, the model is kept in the cache and not shown |
| Unequip | attached nodes are removed from their slots (kept in the cache); the rule is re-applied; hidden base parts reappear in the same frame |
| Switch between two owned items of one category | E is unchanged, so `equipped` is unchanged by content: no scene work, no frame, no request |
| Equip or unequip a UI-only category | the category has no visual category and never reaches the viewer |
| Both `WARM_LAYER` and `RAIN_SHELL` | section 20.4, produced by the rule with no special case. `display.WARM_LAYER` is `covered` |
| A gear model fails to load | that category is not drawn; its hide list is **not** applied (no attached model has a hide list in this feature; the rule is stated for later ones); `display` is `not-shown`; the state is `partial`. The business control still shows Equipped, because Equipped is business state |
| Any of the above | no page reload, no route change, no renderer or avatar reload, no camera movement |

### 29.3 Transition (requirements R5 and R6 of 16.4)

Gear appears and disappears as a **cut**: all nodes of one change switch in a single frame, with and without reduced motion. No fade, scale, bounce, spin, or highlight. A fade is rejected because the materials are opaque: fading needs transparency, which brings sorting artefacts and shows two garments overlapped mid-fade. For embedded variants and already-loaded models the cut lands within one frame of the prop change, well inside 240 ms. Attached models are loaded in the background right after `ready` (`load: 'after-ready'`), so a first equip normally also lands within one frame; only an equip that beats the background load, or a failed load, takes longer. The camera never moves on equip or unequip.

## 30. Camera

Controlled camera. It moves only while the user drags the Stage or after the user activates Turn left, Turn right, or Reset view. It never moves by itself, including on equip (R6).

### 30.1 Framing

| Parameter | Value (G-space) |
|---|---|
| Projection | perspective, vertical field of view 30 degrees, near 0.1, far 50 |
| Pitch | fixed: the camera looks down 10 degrees |
| Orbit axis | the vertical line through the avatar origin (x = 0, z = 0) |
| Azimuth θ | measured from +Z (the avatar's front) toward +X (the avatar's left). Default 30 degrees: the avatar is seen three-quarter and faces the left edge of the Stage |
| Stage aspect a | canvas width / height |
| Distance d | `4.3 * max(1, 0.60 / a)`. Framed by height when a is 0.60 or more, by width below |
| Aim height T | `0.2028 * d`. This places the avatar origin at 86 % of the Stage height for every d |
| Camera position | `( d cos10° sinθ ,  T + d sin10° ,  d cos10° cosθ )`, looking at `(0, T, 0)` |

At the default view with a at 0.60 or more: d = 4.3, T = 0.872, position (2.117, 1.619, 3.667).

| Stage box (section 16) | a | Regime | d |
|---|---:|---|---:|
| 1160 x 884 | 1.31 | height | 4.30 |
| 736 x 704 | 1.05 | height | 4.30 |
| 742 x 596 | 1.24 | height | 4.30 |
| 476 x 596 | 0.80 | height | 4.30 |
| 304 x 852 (tablet minimum) | 0.36 | width | 7.23 |

Guarantees, which hold because of the extents of section 24.4 (height 1.82 or less, radius 0.54 or less):

| Requirement (16.4) | Result |
|---|---|
| R1: ground-contact centre at Stage x 50 %, y 86 % ± 2 % | exact by construction (50 %, 86.0 %) at every aspect, and unchanged while turning, because the orbit axis passes through the origin and pitch and distance are fixed |
| R2: avatar and all six gear models inside the Stage inset by 24 px at every angle | computed worst cases with the full loadout: top margin 7.9 % of Stage height; bottom margin 4.6 % (a pole tip pointing at the camera), which is 27 px at the 596 px tall Stages; side margin 20 % of width at a = 0.80 and 10.6 % in the width regime (32 px at 304 px wide). To be confirmed from pixels by QA |
| R3: equipping any one category changes the default view without turning | at θ = 30: backpack shows both shoulder straps and the hip belt across the front and the ochre body behind the avatar's left shoulder and arm; shell, warm jacket, boots, poles, and the headlamp on the forehead are all in plain view. The backpack is fully inspectable by turning to 180 |

### 30.2 Turning

| Item | Contract |
|---|---|
| Range | a full turn; azimuth unrestricted |
| Drag | horizontal only, primary mouse button or one finger or pen, with pointer capture. 0.4 degrees per CSS pixel. The avatar follows the pointer (dragging right turns its front to the right: θ decreases). Stops the instant the pointer is released: no inertia, no damping |
| `turnLeft()` / `turnRight()` | one step of 30 degrees. Left: the avatar's front swings toward the left edge (θ + 30). Right: θ - 30. Eased over 240 ms with the `--ease-ui` curve; repeated presses accumulate. Under reduced motion: a cut |
| `resetView()` | returns to θ = 30 by the shorter way. Duration 240 ms per 30 degrees, at most 480 ms. Under reduced motion: a cut |
| Zoom | none. Wheel and pinch are not listened for, so the page and panel scroll normally over the Stage. The canvas has `touch-action: pan-y` |
| Pan, pitch change, roll | none |
| Keyboard | none on the canvas. Turning by keyboard is the DOM buttons of section 16 |
| Implementation | a small pointer handler inside `features/avatar`. `OrbitControls` is not used: with fixed pitch, no zoom, no pan, and no damping it adds only listeners that would have to be disabled |

**Forbidden:** free camera, fly or first-person camera, WASD or arrow-key movement, auto-rotate, pan, zoom, dolly on equip, camera cuts to a gear close-up, any camera motion not started by the user.

## 31. Lighting

| Item | Contract |
|---|---|
| Key | one directional light, fixed relative to the **camera**, coming from the upper left of the view and slightly in front (camera-space direction toward the light about (-0.5, 0.7, 0.5)). Because it turns with the camera, the visible side is lit the same at every azimuth and the shading does not swim as the user turns |
| Fill | one ambient or hemisphere light. It keeps the shadowed side readable against the backdrop, never black |
| Intensities | tuned at implementation until section 28.6's look holds: for every palette colour the lit and the shadowed side are clearly different from each other and both readable against the backdrop. Then constants. Not per page, not per loadout |
| Ground-contact shadow | one flat disc at the avatar origin, 2 mm above the ground, radius 0.30 m, `ink` colour, alpha from 0.35 at the centre to 0 at the rim, generated in code (no image file, no shadow map, one draw call). It does not change with gear. It sits on top of section 16's DOM floor pool, which is centred on the same point |
| Shadow maps, `ContactShadows`, baked lightmaps | none |
| Environment map, HDRI, skybox, fog, background colour | none. The canvas is transparent; the backdrop is CSS |
| Tone mapping, exposure, colour space | none; 1; sRGB. Constant for the life of the viewer |
| Time of day, weather, light animation | none in FEATURE-005 |

## 32. Animation

| Item | Contract |
|---|---|
| Clip | one, named `Idle`: subtle breathing |
| Length, rate | 4.0 s, 30 fps, frames 1 to 121, frame 121 equal to frame 1 |
| Loop | repeat, no cross-fade, no pause between cycles |
| Bones that move | `Breath` (translation only, at most 8 mm), `Neck` (rotation, at most 1.0 degree), `Head` (rotation, at most 1.5 degrees) |
| Bones that do not move | every other bone: no channel, or constant within 0.0001. Hence the feet stay planted and `Slot_Back`, `Slot_Hand_L`, and `Slot_Hand_R` do not move at all: the pack does not shift and the pole tips do not slide |
| Scale channels | none on any bone |
| Rest at the ends | frame 1 and frame 121: every animated channel equals its rest value within 0.0001 (CA10) |
| Runtime | one `AnimationMixer` on the avatar. Rigid gear follows its slot; nothing else animates |
| `paused` true | the clip freezes at its current time (no jump to rest); the render loop goes idle. `paused` false resumes from there |
| `reducedMotion` true | the clip is never started. The avatar stands in the rest pose of section 21.3. Turns and resets are cuts. `motion` is `'none'`, so section 16 shows no Pause control |

**Drop rule.** The idle loop is wanted, not required. If, after the S7 attempt and one fix within that step, the clip does not pass section 27.2's animation row or the `Breath` weights tear the chest in the previews, it is dropped: `avatar-base.glb` ships with no animation, `Breath` stays in the skeleton unweighted, the manifest's `idleClip` is `null`, `motion` is always `'none'`, and no Pause control appears. The lead records the drop. The feature is not blocked and no acceptance criterion fails.

**Not required:** walk, run, jump, turn-in-place, emotes, equip or unequip gestures, facial animation, blinking, lip sync, finger motion, cloth or hair motion, look-at. A walk cycle belongs to FEATURE-006 (section 21.6).

## 33. Performance Budget

Capstone demo on a desktop browser: a reasonable load and a stable picture, not a AAA target. Asset rows are enforced by the Asset Gate (section 27.1). File sizes are uncompressed bytes on disk.

| Item | Budget | Expected |
|---|---|---|
| `avatar-base.glb` size | 1,500,000 bytes | 0.7 to 1.0 MB |
| `avatar-base.glb` triangles | 30,000 total; 16,000 default-visible | about 26,500; 15,000 |
| Per avatar mesh (guide, not gated) | Head 3,500; hair 3,000; hands 1,500; base top 3,000; legs 2,500; default shoes 1,500; shell 5,000; fleece body 3,500; collar 500; boots 2,500 | |
| `gear-backpack.glb` | 250,000 bytes; 5,000 triangles | 0.12 MB |
| `gear-trekking-poles.glb` | 120,000 bytes; 1,500 triangles (both poles) | 0.04 MB |
| `gear-headlamp.glb` | 120,000 bytes; 1,500 triangles | 0.04 MB |
| Textures in any GLB | 0 | 0 |
| Runtime-generated textures | 1 at most: the ground shadow's alpha gradient, 128 x 128, made in code | |
| Materials | avatar 12; backpack 3; poles 3; headlamp 3; total 21 | |
| Bones | 23; at most 4 influences per vertex | |
| Payload before the first avatar frame | the 3D chunk plus `avatar-base.glb`: 1.5 MB of model at most | |
| Payload with everything equipped | 1,990,000 bytes of model at most | about 1.0 to 1.2 MB |
| Visible triangles, worst loadout | 28,000 | about 25,500 |
| Draw calls, worst loadout | 30, including the shadow | about 25 |
| Device pixel ratio | 2 at most | |
| Frames | on demand; zero when nothing changes (section 28.5) | |
| 3D JavaScript chunk | 350 KB gzip at most | 250 to 330 KB gzip. **Unverified**: no package is installed |
| Entry bundle on other routes | no `three` or fiber code in any chunk loaded outside the Studio route; entry growth under 5 KB gzip (manifest and types) | **unverified** until built |
| Frame rate while the idle clip plays | 50 fps or more on a 2020-or-later laptop with an integrated GPU | **unverified** |

**Loading plan.** `avatar-base.glb` is the only model requested before the avatar is shown. The three gear files are requested in the background after `ready`, one at a time, at low priority; an equip promotes its file to immediate. Embedded variants need no request. Nothing is requested below 768 px or when WebGL 2 is absent. No compression, no decoder, no worker.

## 34. 3D Loading and Failure Fallback

Section 16 designs how each state looks. This section defines when each occurs. In every state, including `loading`, `partial`, and `unavailable`, every business control works and `equipped` changes are accepted; the viewer never blocks, delays, or reverses an Equip or Unequip.

### 34.1 Sequence

| Step | Success | Failure |
|---|---|---|
| 1. Mount (768 px or wider) | state `loading`; every equipped category's `display` is `loading` | |
| 2. WebGL 2 check, synchronous | continue | `unavailable`, `no-webgl`, not retryable. The 3D chunk and the models are never requested |
| 3. Dynamic import of the 3D chunk, 20 s limit | continue | `unavailable`, `viewer-load-failed`, retryable |
| 4. Request and parse `avatar-base.glb`, 20 s limit from the request | continue | `unavailable`, `avatar-load-failed`, retryable |
| 5. Validate: every `requiredNodes` and `slotNodes` name exists | continue | `unavailable`, `avatar-invalid`, not retryable (the file is wrong; retrying cannot help) |
| 6. Runtime materials, default visibility, the rule of section 29.1 | continue | `unavailable`, `render-error`, retryable once |
| 7. Reveal | the avatar's first frame is drawn. If `equipped` already holds attached categories, the reveal waits for their models to settle, for at most 2.5 s after step 6 | |
| 8. Settled | `ready` when no equipped category is `not-shown`; otherwise `partial` | |

### 34.2 State definitions

| State | Exactly when |
|---|---|
| `loading` | from mount until the first avatar frame or a failure; and again after `retry()` from `unavailable` |
| `ready` | the avatar is drawn and no **equipped** category is `not-shown`. Categories still `loading` do not change the state |
| `partial` | the avatar is drawn and at least one equipped category is `not-shown`. Unequipping that category returns the state to `ready`. A background load that fails for a category that is not equipped is silent |
| `unavailable` | no WebGL 2, the chunk or the avatar failed, the avatar is invalid, the context was lost for more than 4 s, or the scene threw. The canvas is removed; every equipped category's `display` is `not-shown` |

### 34.3 What counts as a failed model load

A network error; a status outside 200 to 299; a body that does not begin with the bytes `glTF` (a development server answers a missing file with the application's HTML and status 200, so the status alone proves nothing); a parse error; a missing node named in the manifest; or no result within the limit (avatar 20 s, each gear model 15 s).

### 34.4 Retry

| Case | Policy |
|---|---|
| Automatic retry | none. No loops, no back-off timers |
| A failed gear model | tried again when its category is next equipped (one attempt per equip), and when `retry()` is called in `partial` (every equipped `not-shown` category, once). Section 16 renders no Retry control in `partial`, so in this feature the next equip is the user's path |
| `unavailable`, retryable | `retry()` restarts at step 3 with a new canvas and renderer (`data-avatar-renderer` increases). State returns to `loading` |
| `unavailable`, not retryable | `retry()` does nothing. Section 16 offers no retry |
| `render-error` twice in a row | the second is reported as not retryable |

### 34.5 Reported outward

Only `AvatarViewerStatus` through `onStatusChange` (section 28.3): the state, the per-category `display`, `motion`, and for `unavailable` the reason and `retryable`. The reason is for choosing copy and for QA; it is never shown raw. The viewer logs at most one console warning per failure and shows no message of its own. One failed gear model never breaks the page, the avatar, or another gear model.

## 35. Frontend Architecture Boundaries

Guidance, not a mandated file list. Names may change; boundaries may not.

```text
Project/Frontend/src/
  pages/GearStudioPage.tsx      thin composition for the new route
  features/packing/             unchanged role: the pack recommendation and the gear category
                                labels. Gains only the call to action on Trip Preparation (16.12)
  features/gear/                NEW. The durable owned inventory: api (GET and POST
                                /api/users/me/gear), contract types, response checking,
                                the gear list as a query keyed by subject, the add-gear mutation
  features/loadout/             NEW. The trip-specific Equipped state: the loadout store, its one
                                sessionStorage key, validation and reconciliation (section 8),
                                the session cleanup, Pack completion, and the Studio screen
                                and its gear controls
  features/avatar/              NEW. The real-time 3D presentation: the viewer (section 28),
                                the asset manifest (section 25), the mapping from equipped
                                categories to what is drawn (section 29)
  services/apiClient.ts         unchanged; authenticatedApiRequest is reused
```

| Domain | Owns | Never owns |
|---|---|---|
| `packing` | What is Recommended for a trail and date; Packing readiness | Items, Equipped, 3D |
| `gear` | What the user Owns, durably | Trips, Recommended, Equipped, 3D |
| `loadout` | What is Equipped for one user and one trip; the Studio's composition | The inventory's contents, the recommendation, any Three.js object |
| `avatar` | How a set of equipped categories looks | Business state, requests to the API, storage, item names |

Dependency direction. Every arrow is one-way:

```text
loadout ──▶ packing ──▶ trails
   │  └───▶ gear
   └──────▶ avatar          (props in, narrow events out)
```

| Boundary | Rule |
|---|---|
| `avatar` is a leaf | It imports nothing from `loadout`, `gear`, `packing`, `trails`, `planning`, or `auth`. It receives the equipped visual categories as props and reports only its own state (section 28). It makes no API request and reads no storage |
| Three.js stays in `avatar` | No file outside `features/avatar` imports `three` or `@react-three/fiber` (`@react-three/drei` is not approved at all, section 28.1). The 3D code is a separate chunk loaded only on the Studio route (section 28) |
| `gear` is independent | It imports nothing from `loadout`, `packing`, or `avatar`. A later Gear inventory page reuses it unchanged |
| `packing` does not learn about Equipped | Its only change is the call to action. It imports nothing from `loadout`, `gear`, or `avatar` |
| `planning` is untouched | It imports nothing from the three new features and they import nothing from it beyond what FEATURE-004 already shares (formatters, the trip-date formatting) |
| No mega-component | The Studio screen composes four things that do not know each other's internals: the trip block, the gear controls, the summary, and the viewer. No single component holds authentication, requests, loadout logic, the Three.js scene, and the controls |
| Direction of state | Equipped state → 3D presentation, never the reverse (R9). The viewer has no callback that changes the loadout, and a click on the canvas changes nothing in the product |
| Model paths | Only the manifest names a model file (section 25). No React business component contains a `.glb` path |
| No per-asset numbers in React | No position, rotation, or scale that places an asset appears outside the manifest and the contract (section 22). Such a number is a hidden asset repair (section 40) |
| Server state | TanStack Query: the trail query and the pack query as FEATURE-004 built them, plus the gear list query, keyed by subject |
| Auth | Only through `@/features/auth`'s exported API (`getAuthenticatedSubject`, `registerSessionCleanup`, `authenticatedApiRequest` through the shared client). No token decoding and no new storage of anything from authentication |
| Error parsing | Status-based. A missing, empty, or non-`ProblemDetail` body is expected (G7) |
| No fake data | No mock, fixture, sample inventory, or placeholder loadout ships in production code |
| Existing behavior | FEATURE-001 to FEATURE-004 are not modified except for the amendments of section 4.3 |

Approved new runtime dependencies are listed in section 28.1 and nowhere else: `three` and `@react-three/fiber`. If they are not already installed, `frontend` is explicitly authorized to add them, and only them, as the minimum the frozen specification requires (`package.json` and `package-lock.json`; `@types/three` as a development dependency only if `three` does not ship its own types). `@react-three/drei` is not added unless a later blocker proves it necessary and the lead approves that scope change. No other dependency is added: no state library, no form library, no animation library, no physics, no post-processing package.

## 36. API and Browser Routing

Current state, verified in `Project/Frontend/vite.config.ts` on 2026-10-13: `VITE_API_BASE_URL` is empty, so every request is same-origin, and the development server proxies exactly `/api/planner`, `/api/trails`, and `/api/recommendations/pack`. `user-service` defines no CORS and the gateway has no routes (G4).

FEATURE-005 adds one development proxy entry, in the same form as the existing three:

| Proxy path | Target | Used for |
|---|---|---|
| `/api/users/me/gear` | `http://localhost:8081` (`user-service`) | `GET /api/users/me/gear`, and `POST /api/users/me/gear` |

| Rule | Detail |
|---|---|
| Narrow path | `/api/users/me/gear`, not `/api/users`. `GET /api/users/me` stays unreachable from the browser and is still not called. The prefix also reaches `PUT` and `DELETE` on `/api/users/me/gear/{id}`; this feature never sends them |
| Scope | Frontend-only, local development only. No environment variable is added. No CORS configuration, gateway route, Docker file, or backend networking is changed |
| Authentication | Every API call goes through `authenticatedApiRequest` |
| Timeouts | One 20-second client limit per request, as FEATURE-004 D14 |
| Model files | The GLBs are static files under `Project/Frontend/public/models/`, served from the application's own origin at `/models/...` with no token. They are public, generic assets and contain no user data |
| Origins contacted | The application's origin and the Keycloak origin, and no other. No CDN, no decoder download, no remote environment map, no remote font (section 24, section 31) |
| Check at implementation start | That `GET /api/users/me/gear` answers through the proxy with the user's token. A refusal is a backend contract gap that `frontend` reports and the lead routes to `backend-api` |
| Production limitation | Unchanged (G11) |
| Documentation | `docs/FRONTEND_CONTEXT.md` is updated in the implementing change (section 41) |

## 37. Security, Privacy, and the Blender Runtime Boundary

### 37.1 Security and privacy

| Rule | Detail |
|---|---|
| Nothing personal in a URL | The Studio's address holds a trail id and a trip date, as Trip Preparation's does. No gear item id, item name, equipped state, or loadout is ever put in a path, a query string, a fragment, or `history.state` |
| No credentials anywhere | No access token, refresh token, ID token, raw JWT, or password is stored, logged, or put in a URL |
| The loadout is user-isolated | Section 9. The stored value holds identifiers only (8.2) |
| Item names are text | A gear item's name comes from the API and is rendered as text only, never as markup. It is not stored by the frontend |
| No telemetry | No analytics, tracking, or event reporting is added |
| No third-party request | Section 36: the browser contacts only the application's origin and Keycloak |
| Model files are not secrets | They are generic category models. They carry no user data and need no authentication |
| Security review | The implementation gets the cycle's one scoped security review, on this feature's diff, for: the loadout's storage and owner check, the session cleanup, the absence of tokens in storage, logs, and URLs, and the rendering of item names |

### 37.2 Blender is development tooling only

```text
Development time                          Runtime (the web application)

Claude                                    React
  → Blender MCP server                      → Three.js / React Three Fiber
  → Blender                                 → GLB files served from /models/
  → .blend sources
  → exported GLB files
```

| Rule | Detail |
|---|---|
| No runtime connection | The web application never connects to Blender, to the Blender MCP server, to any MCP server, or to `localhost:9876`. Nothing in `Project/Frontend/` references them |
| What the application needs | The GLB files and the manifest. With those present, the Studio works on a machine with no Blender installed |
| What is checked in | The `.blend` sources and the exported GLBs. Blender is not needed to build or run the frontend |
| Business state | Never stored in, or read from, a `.blend` or a GLB |

## 38. FEATURE-006 Handoff

FEATURE-005 is complete when:

- the user has a selected trail and trip date;
- Recommended gear is known;
- Owned and Missing are known;
- the user has chosen Equipped gear;
- the real-time avatar reflects that loadout.

What FEATURE-006 can rely on:

| Provided by FEATURE-005 | Where |
|---|---|
| The trip: trail id and trip date | The Studio path |
| The loadout for that trip: category → equipped item | `features/loadout` (section 8) |
| The persistent avatar and its gear models | Sections 19–24; the same files are reused, not remade (PRD section 17) |
| The mapping from equipped categories to what is drawn | The manifest (section 25) |
| A skeleton that can carry a walk cycle | Section 21 |
| A viewer whose scene content can be extended | Section 28 |

What FEATURE-006 owns and FEATURE-005 does not start:

- **Start Adventure**: the action, its label, its position, and its transition (PRD sections 23 and 24). **The Studio renders no Start Adventure control and no placeholder for one**: a control that leads nowhere is a dead end, as FEATURE-004 D11 decided for this feature's call to action.
- The outdoor real-time environment, its archetypes, and scene selection from the trail's scenery and the weather (PRD sections 25–27).
- The walk cycle and any animation beyond the idle loop (PRD section 28).
- Explore, live hikers, the map, and Memory.
- Whether the loadout must then outlive the tab (section 7.1).

## 39. Non-Goals

Not part of FEATURE-005:

- An outdoor trail 3D scene, an open world, or any environment geometry beyond the avatar's ground shadow; a real-time recreation of the preparation room
- Start Adventure, the Adventure transition, Explore, live hikers, map tracking
- WASD or any player-controlled movement, walking gameplay, jumping, a free, first-person, or fly camera
- Physics, collision, cloth simulation, hair simulation
- A walk, run, or jump animation; emotes; facial animation; lip sync; dialogue
- A character creator, body customization, face or hair customization, a second avatar, avatar selection
- A photorealistic avatar or environment
- More than the six gear models of section 20; a 3D model for `SUN_PROTECTION`, `WIND_LAYER`, `TRACTION`, `WATER`, or `FOOD`; a hat or cap; a model per product; exact commercial product replicas; brand marks or logos on any asset
- A custom toon shader, an outline pass, or post-processing
- Shopping, product recommendations, external gear links, prices, e-commerce
- Quantities, weights, a per-item packing checklist, "bring two"
- A full gear inventory: editing, renaming, deleting, or describing gear; a redesign of `/gear`
- Drag-and-drop equipping; clicking the avatar's body to equip; any interaction in which the 3D view is the only way to do something
- A saved-trip backend, a loadout endpoint, trip history, or any backend change
- Loadouts that survive the tab, the sign-in session, or another device
- Memory, GPX upload, photo upload, recap, video
- Multiplayer, sharing a loadout, social features
- Analytics or telemetry
- Mesh compression, texture transcoders, an environment-map download, or anything fetched from a CDN at runtime
- Mobile 3D controls beyond the best-effort treatment of section 17
- API gateway, CORS, Docker, Keycloak, or other infrastructure work
- Edits to `docs/PRODUCT_REQUIREMENTS.md` or `docs/DESIGN_SYSTEM.md`

## 40. Repair Ownership

The cycle's routing (`feature-cycle`, step 6) applies. The frozen contract (sections 19–27) and the Asset Gate evidence decide between an asset fault and a mapping fault: if the GLB matches the contract and the view is still wrong, the fault is in the frontend.

| Failure | Owner |
|---|---|
| Model geometry is wrong, ugly, or clips through the body in a contract loadout | `three-d` |
| Gear sits in the wrong place because of the asset: its origin, its slot node, its scale, its skinning | `three-d` |
| A material or color is missing or wrong in the GLB | `three-d` |
| A GLB is invalid, does not load, has the wrong orientation or scale, exceeds its budget, or breaks the contract's naming | `three-d` |
| The idle animation is missing, misnamed, or broken in the GLB | `three-d` |
| The contract or the manifest itself is wrong | `three-d` corrects the contract first; the lead records the change |
| Equip or Unequip does not update the loadout | `frontend` |
| The loadout is correct but the wrong asset is shown, hidden, or attached | `frontend` |
| Loadout storage, owner check, reconciliation, or cleanup | `frontend` |
| Scene, camera, lighting, loading, fallback, or remount behavior in the React runtime | `frontend` |
| Layout, copy, focus, announcements, or any accessibility failure | `frontend` |
| The specification contradicts itself or the Design System | `ui-ux` |
| A backend category or contract is wrong | `backend-api`, after the lead approves its proposal |

Rules:

- **A broken asset is repaired in the asset.** `frontend` never compensates with a position, rotation, or scale offset, a per-asset special case, or a hidden mesh that the manifest does not declare. A frontend diff that contains such a number is a scope failure in the lead's diff review.
- An asset repair always goes back through the Asset Gate for the files it changed before anything else looks at it.
- Two budgets, counted separately: at most 2 asset repair cycles (`three-d`) and at most 2 frontend repair cycles (`frontend`, `ui-ux`, `backend-api`). When either is used up with a failure still open, the feature is `BLOCKED` and reported to the user.

## 41. Agent and Write-Scope Rules

This document is specification and design only. Nothing here authorizes implementation, asset production, or a Blender call. Those start only when the user starts the feature cycle. Once it runs, the write scope of 41.2 is authorized in full, with no further approval needed for the paths it lists.

### 41.1 Order of work in the cycle

FEATURE-005 runs the 3D pipeline: `3D pipeline: RUN`, `Blender production: REQUIRED`.

| Stage | Owner | What happens | Gate |
|---|---|---|---|
| A. 3D capability check | Lead | The real in-session check of Blender and the Blender MCP server: read, change, save, export. The earlier external smoke test does not replace it | Fails → `BLOCKED` |
| B. 3D contract | `three-d` validates, lead freezes | Sections 19–27 and 33 of this document are the contract. `three-d` checks them for completeness and reports gaps; it does not redesign what was approved | `3D contract: FROZEN` |
| C. Asset production | `three-d` | Section 26: a preflight spike in the scratch directory (P0), then steps S1 to S10, each ending in a save. After S1 the lead checks the avatar's look against section 19 before any gear is built; that is an in-cycle check and never a stop for the user | — |
| D. Asset Gate | Lead | Section 27. The preview renders are required evidence | **The final frontend 3D integration does not begin until this passes** (Q10). On PASS the cycle continues to Stage E at once |
| E. Frontend implementation | `frontend` | Sections 4–18, 25, 28–37, against the gated files | Lead diff review |
| F. Integration Gate | `frontend` produces evidence, lead decides | `feature-cycle` stage F | — |
| G. QA | `qa` | Section 42 | `PASS` or `FAIL` |

Assets are produced and pass the Asset Gate before the frontend's 3D integration begins. The frontend is never integrated against assets that are missing, assumed, or stand-ins.

**Product gate (final, Q13).** The cycle runs from Stage A to `PASS` or `BLOCKED` without stopping for product approval. The Asset Gate and the Integration Gate are decided by the lead from evidence. The preview renders are part of that evidence; they are not shown to the user for approval in the middle of the cycle, and after the lead's Asset Gate `PASS` the cycle goes straight on to Stage E. The user is the product gate once, after the whole feature reaches `PASS` (`CLAUDE.md`, feature workflow step 6). The cycle still stops, as it always does, for `BLOCKED`: a failed capability check, a used-up repair budget, or unsaved work in the shared Blender that is not this feature's.

### 41.2 Authorized write scope when the cycle runs

Authorized for the FEATURE-005 implementation cycle (final, 2026-10-13). Nothing outside this table may be written, apart from the cycle's own checkpoint file named in the agent table below.

| Path | Includes | Limits |
|---|---|---|
| `assets/blender/feature005/**` | The `.blend` source, `previews/`, `evidence/` | The files section 23.1 names. The directory does not exist today; the cycle creates it |
| `Project/Frontend/**` | Source files for the new route, the three feature folders, and the Three.js / React Three Fiber integration; `public/models/**`; `package.json` and `package-lock.json`; the one proxy entry in `vite.config.ts` (section 36); the return-destination pattern (section 10); the call to action on Trip Preparation | Dependencies: only what sections 28.1 and 35 approve. Under `public/models/`: only the four GLBs of section 23.1 |
| `docs/FRONTEND_CONTEXT.md` | What actually changed: the route, the new feature folders and their dependency direction, the gear endpoints now called, the proxy entry, the return-destination pattern, the loadout storage key, the 3D dependencies, and the asset paths | Nothing else under `docs/` except this document when a specification contradiction is routed to `ui-ux` |
| `.gitignore` | The two lines `*.blend1` and `*.blend2` | Restricted to those two Blender backup patterns. No other line is added, removed, or changed |

By agent:

| Agent | May write |
|---|---|
| `three-d` | `assets/blender/feature005/**` and `Project/Frontend/public/models/**`: exactly the files section 23.1 names. It creates those directories with its first files. Nothing under `Project/Frontend/src/` |
| `frontend` | The rest of `Project/Frontend/**`, including the manifest at the path section 25 names, `package.json`, and `package-lock.json`; and `docs/FRONTEND_CONTEXT.md` in the same change. It does not edit a GLB: an asset that looks wrong is reported (section 40) |
| Lead | `.gitignore`, the two lines, before Stage C begins. The cycle's checkpoint under `.claude/state/features/`, which is cycle state and not product scope |
| `qa` | Nothing in production code or assets. Tests only if the lead says so. `qa` does not open Blender |
| `ui-ux` | This document, only when the lead routes a specification contradiction to it |
| `backend-api` | Nothing. `Project/Backend/**` stays unauthorized unless `backend-api` identifies a genuine contract gap and its proposal is approved |

Not authorized for any agent: `Project/Backend/**` (apart from the case above), `Project/docker/**`, `Project/docker-compose.yml`, Keycloak configuration or theme, the API gateway, any infrastructure, `docs/PRODUCT_REQUIREMENTS.md`, `docs/DESIGN_SYSTEM.md`.

### 41.3 Asset file rules

| Rule | Detail |
|---|---|
| Approved paths only | Sources under `assets/blender/feature005/`; runtime GLBs under `Project/Frontend/public/models/avatar/` and `Project/Frontend/public/models/gear/`. Experiments and smoke-test files go in the session scratch directory and never in either tree |
| Backups | Blender's `*.blend1` and `*.blend2` are not production assets. They are ignored by Git from the moment asset production begins and are never committed |
| Recovered copies | A `*.recovered.blend` is promoted or deleted before the Asset Gate (`feature-cycle`, 3D recovery audit) |
| Nothing else ships | Preview renders and gate evidence stay outside `Project/Frontend/public/`. Only the GLBs are served |
| One shared Blender | Before changing anything, `three-d` reads `bpy.data.filepath` and `bpy.data.is_dirty`. Unsaved work that is not this feature's stops the stage. A file is never loaded over it and it is never reset |
| Never overwrite good work | On a resume, existing files are inspected and only what is missing is produced |
| Resuming in the shared Blender | Opening the existing source into an untouched startup session replaces that session's file. The Stage C brief says whether that is allowed for the resume; without it `three-d` stops and reports (section 26.1) |

### 41.4 Standing rules

No unrelated refactors. Unrelated modified files in the working tree are left alone. The preparation image is used as delivered and is not modified. No commit or push without the user's instruction.

## 42. Acceptance Criteria

### 42.1 How these are validated

- **Where.** Browser criteria: in a browser against `npm run dev` on `http://localhost:5173`, signed in through Keycloak. There is no test runner; `npm run build` and `npm run lint` are run as well.
- **Viewports.** "Desktop" means 1920×1080, 1440×900, 1366×768, and 1024×768. 768–1023px is functional but not a validation priority. Below 768px is best-effort and is judged only by AC-47.
- **Live.** Criteria marked **Live** must pass at least once against the real stack (PostgreSQL, Keycloak, `user-service`, `trail-service`, `recommendation-service`). If the stack cannot run for an environment reason they are reported as blocked by the environment, not passed by interception.
- **Interception.** Other states (failures, timeouts, specific inventories, several items in one category, a `null` category, specific readiness values, an empty `requiredGear`, a blocked model file) may be produced by intercepting requests in the browser. Interception is a test tool only; no mock, fixture, or fake response ships in production code.
- **Asset.** Criteria marked **Asset** are checked on the files, by the lead at the Asset Gate (section 27), from the GLB's own JSON, a separate background Blender, and the preview renders. `three-d`'s report is a claim; the files are the evidence. `qa` does not open Blender. An Asset criterion must hold on the files that are in the tree when `qa` runs.
- **Pixels.** Criteria marked **Pixels** are about what the 3D view shows. They pass only from a screenshot of the rendered canvas that `qa` has opened and looked at. A DOM check, a state check, or a successful request shows that code ran, not that the picture is right. Before judging any of them `qa` confirms the test browser has a working WebGL 2 context; a blank canvas caused by the test browser is an unverified criterion, not a failure and not a pass.
- **Idle.** Clauses about the idle loop and the Pause control apply unless the loop was dropped under section 32's drop rule, in which case the lead records the drop and the clause is not applicable.
- **Baseline.** The working tree already holds unrelated uncommitted changes. `qa` records a baseline at the start of the cycle and judges the boundary criteria against it.
- A criterion fails if any clause in it fails. Section references say where the exact values are. Geometry is checked to ±2px.

### 42.2 Entry and continuity

| # | Criterion |
|---|---|
| AC-01 | **Live.** On Trip Preparation with a successful pack response, the call to action PC1 is shown at the end of the date row with the geometry and colors of 16.12, and the row's height is unchanged. It is absent, with no placeholder, while the pack is loading, after a pack failure, and in the trail-not-found and choose-a-date states. Activating it by mouse and by keyboard opens `/trails/{id}/prepare/{date}/pack`, keeping `rec` when present. Activation makes no API request by itself and writes nothing to web storage (sections 4.2, 16.12). |
| AC-02 | **Live.** The Studio shows the same trail name and the same trip date as the Preparation screen it was opened from. The user is never asked to choose the trail or the date again; the date is plain text and the Studio contains no date control. Opening the Studio makes no request to `/api/planner/turn` or `/api/recommendations/query` (sections 4.2, 16.6). |
| AC-03 | **Live.** Entering the Studio sends `GET /api/trails/{id}`, one `POST /api/recommendations/pack` whose body is `{ trailId, tripDate }` from the URL, and one `GET /api/users/me/gear`, each same-origin with `Authorization: Bearer`. Equip, Unequip, and changing an item send no request (sections 6, 11.1, 36). |
| AC-04 | **Live.** With two or more categories equipped, reloading the Studio shows the same trail, date, and rows, the same Equipped tags and item names, the same count, and the avatar wearing the same gear, with no action by the user (sections 8, 10). |
| AC-05 | **Live.** "Back to preparation" and browser Back return to Trip Preparation for the same trail and date, with `rec` kept. Trip Preparation shows no Equipped state. Returning to the Studio by the call to action and by browser Forward shows the same loadout (section 10). |
| AC-06 | A typed Studio URL with a valid trail and date, signed in, shows the Studio with focus on the `h1`. A `trailId` that is not a UUID shows the trail-not-found state and makes no trail or pack request; a UUID with no trail (`404`) shows the same state. A malformed or past date, and a `400` from the pack endpoint, replace the address with the Preparation address, where FEATURE-004's choose-a-date state is shown; `/trails/{id}/prepare/pack`, with no date, shows that same state. In the date cases the Studio made no pack or gear request (sections 10, 16.13). |
| AC-07 | **Live.** Signed out, opening a Studio URL shows FEATURE-002's sign-in gate; after sign-in the user lands on the same Studio path. With the session ended mid-visit, no feature-specific error is drawn: FEATURE-002's session-expired handling applies (section 10). |

### 42.3 Business state

| # | Criterion |
|---|---|
| AC-08 | **Live.** Every distinct `requiredGear` category appears exactly once under "Recommended for this trip". Every category in which the user owns an item and which is not recommended appears exactly once under "Also in your gear". A category that is neither has no row. Rows are in enum order within each group, do not move when their state changes, and show no wire value (sections 11.3, 16.8). |
| AC-09 | A row is Owned, with an item's name, exactly when the gear list holds an item of that category; otherwise a recommended row is Missing. With an intercepted inventory containing an item whose `category` is `null`, that item creates no row and the line GS23 states the count. An unknown category appears as "Other gear" with its real state (sections 11.2, 11.3). |
| AC-10 | On first entry for a trip, with empty storage and every recommended category owned, nothing is equipped: no row carries the Equipped tag, the count reads "0 of {m}", and the avatar wears its base outfit. Nothing becomes equipped until the user activates a control (sections 5.2 R2, 16.13 S11). |
| AC-11 | Activating Equip on an owned row adds the Equipped tag, changes that button's label to "Unequip", updates the note and the count, leaves focus on the same button, and moves no other row. Unequip reverses all of it. Neither causes a navigation, a page load, or a network request (sections 16.8, 29.2). |
| AC-12 | A Missing row has no Equip control, not a disabled one. No path equips a Missing category: the shortcut skips it, and a stored loadout entry that names a category with no owned item is dropped when read (sections 5.2 R3, 8.4). |
| AC-13 | A category that is owned and not recommended can be equipped and unequipped like any other. It does not change "{e} of {m}" and is reported by GS12 (sections 5.2 R4, 14, 16.7). |
| AC-14 | The shortcut GS17 equips exactly the categories that are Recommended, Owned, and not yet equipped, each with the item its row names, and nothing else. It is then replaced in the same box by GS18 with no layout shift below it. It never runs without being activated (section 16.8). |
| AC-15 | With an intercepted inventory holding two or more items in one category: the row names the newest item; "Change" lists every owned item by its name; Equip equips the named item without opening the list; choosing another item while equipped changes only the name on the row, keeps the tag and the count, and stores that item's id. A category never has two equipped items (sections 12, 16.9). |
| AC-16 | Packing readiness shows `readinessPercentage` exactly as returned, with "%", for intercepted values `0`, `33`, `67`, `100`, and a value that deliberately disagrees with the rows, under the label "Packing readiness". It does not change when the user equips or unequips. "Equipped for this trip" shows "{e} of {m}" with no "%" and no meter. Neither has a threshold color or any special treatment at its maximum. With `requiredGear: []` the readiness entry is absent and the second entry takes its GS13 and GS14 form (sections 14, 16.7). |
| AC-17 | **Live.** Add gear on a Missing row with a valid name sends one `POST /api/users/me/gear` whose body is `{ name, category }` with that row's category and nothing else. On `201` the row becomes Owned with that name and is **not** equipped, the gear list and the pack are requested again, Packing readiness shows the new returned number, and focus is on the row's Equip button. An empty name is not sent and shows AG11 on the field. A failed request shows AG13 with the typed name kept. A second activation while saving sends nothing (sections 13.2, 16.10). |
| AC-18 | "Add gear you own" cannot be submitted without a category. On success its item appears as a row in the correct group, or as the current item of an existing unequipped row, and nothing is equipped. The Studio offers no control to edit, rename, or delete gear and never sends `PUT` or `DELETE` (sections 13.2, 16.10). |
| AC-19 | **Live.** User isolation: user A equips gear and signs out; user B signs in in the same tab and opens the same Studio URL. Nothing is equipped, B's own gear and ownership are shown, new gear and pack requests are made with B's token, and web storage holds no value owned by A (section 9). |
| AC-20 | Trip isolation: a loadout made for trail X on date D is not shown for another trail, or for trail X on another date. Returning to X on D in the same tab shows it again (section 9). |
| AC-21 | Sign-out removes the key `outdoor-trip-companion.loadout`. A reload that finds no session removes it. New Plan in the planner leaves it in place and behaves exactly as FEATURE-003 specifies (sections 9, 10). |
| AC-22 | After equipping across two trips, the stored value contains only `version`, `owner`, trip keys, category wire values, item ids, and timestamps: no token, JWT, name, email, or item name. Nothing of this feature is in `localStorage`, a cookie, `history.state`, or any URL. A stored value that does not parse, has another version, has another owner, or has the wrong shape is removed and the Studio starts empty with no error shown. A stored entry whose item id is not in the gear list, or whose item now has another category, is dropped while valid entries are kept (sections 8.2–8.4, 37.1). |
| AC-23 | While the pack or the gear list is loading, loading feedback is shown and announced and the trail is already visible. A failed gear request shows GS8 with Retry and no rows, leaves the stored loadout unchanged, and Retry repeats only that request. A failed or timed-out pack request shows TP7 or TP8 with Retry. In no state does any text or DOM attribute show a service name, an HTTP status, a class name, or backend error text (sections 8.4, 16.13). |

### 42.4 3D assets

| # | Criterion |
|---|---|
| AC-24 | **Asset.** The source `.blend`, the four GLBs, the 29 preview renders, and the five evidence files exist at the exact paths of section 23.1. Nothing else is under `Project/Frontend/public/models/`. No `*.blend1`, `*.blend2`, or `*.recovered.blend` is tracked, and `.gitignore` holds the two backup patterns. Each GLB begins with `glTF`, declares version 2, and its declared length equals its file size. Each re-imports into a factory-startup background Blender, and the `.blend` opens with the contracted collections and an empty or absent `F005_Scratch` (sections 23, 27.1, 27.3). |
| AC-25 | **Asset.** File sizes and triangle counts are within budget: `avatar-base.glb` at most 1,500,000 bytes, 30,000 triangles in total, and 16,000 in the default-visible nodes; `gear-backpack.glb` 250,000 bytes and 5,000 triangles; `gear-trekking-poles.glb` 120,000 and 1,500; `gear-headlamp.glb` 120,000 and 1,500 (sections 27.1, 33). |
| AC-26 | **Asset.** `avatar-base.glb` contains exactly the 40 node names, 11 mesh names, and 12 material names of section 24.2, and each gear file exactly those of section 24.3. No name ends in a `.001`-style suffix and no node is named `neutral_bone` (sections 24.2, 24.3, 27.2). |
| AC-27 | **Asset.** Scale, orientation, and origin: the avatar is 1.73 to 1.77 m tall, its soles are within 2 mm of the ground plane, +Y is up and the avatar faces +Z in glTF space (every check of section 24.5 holds), `Avatar_Root` has an identity transform, and every node's scale is 1 within 0.001 (sections 24.1, 24.4, 24.5). |
| AC-28 | **Asset.** Attachment: each of the four slot nodes has the parent joint of section 22.2, a world rotation within 0.5 degrees of identity, unit scale, and a world position within tolerance of nominal. Every gear attach node is a scene root with zero translation, identity rotation, and unit scale. The assembled extents of section 24.4 hold, including pole tips between 0 and 10 mm above the ground (sections 22, 24.4, 27.2). |
| AC-29 | **Asset.** Materials and embedding: every material's `baseColorFactor` matches the section 19 palette within 0.01 per channel, with `doubleSided` false and opaque alpha. No GLB has an image, a texture, a sampler, an external `uri`, a camera, a light, a required extension, or a forbidden extension (sections 24.1, 24.6, 27.2). |
| AC-30 | **Asset. Idle.** `avatar-base.glb` has exactly one animation, `Idle`, lasting 3.96 to 4.04 s, with equal first and last keys, moving only `Breath`, `Neck`, and `Head` within section 32's limits (sections 27.2, 32). |
| AC-31 | **Asset.** The lead has opened every preview render. There is no severe clipping, as section 27.4 defines it, in loadouts `L0` to `L8` and the round-trip set. `L7` shows the shell, the fleece collar, no fleece body, and the pack's straps over the shell. Each of `L1` to `L6` at the default angle is visibly different from `L0`. The round-trip renders made from the exported GLBs match the source renders in pose, placement, and color (sections 26.3, 27.4). |
| AC-32 | The manifest file reproduces section 25.2. No model path, node name, or slot name appears outside `features/avatar`. No file under `Project/Frontend/src/` contains a position, rotation, or scale number that places an avatar part or a gear model. No file outside `features/avatar` imports `three` or `@react-three/fiber`. `package.json` gains exactly `three` and `@react-three/fiber` as runtime dependencies (and `@types/three` as a development dependency only if needed), and not `@react-three/drei`; `package-lock.json` changes only to match (sections 22.6, 25, 28.1, 35). |

### 42.5 3D runtime

| # | Criterion |
|---|---|
| AC-33 | **Live. Pixels.** At the four desktop viewports the avatar is drawn whole on the Stage in its base outfit, with no headlamp, pack, poles, shell, fleece, or boots, over the token backdrop of 16.4. The Studio requests no image or video, including the preparation image, and shows exactly one figure (sections 15, 16.4, 20.2). |
| AC-34 | **Pixels.** Equipping the backpack makes a backpack appear on the avatar, visible from the default view without turning; turned to the back it sits against the back with no gap. Unequipping removes it and restores the previous picture (sections 20.1, 29.2, 30.1). |
| AC-35 | **Pixels.** Equipping rain gear shows the rain shell in place of the base top, and unequipping restores the base top. The same holds for the warm layer and the warm jacket. With both equipped the shell and the fleece collar are visible and the fleece body is not, whichever was equipped first, and the Warm layer row shows note N3 (sections 20.4, 29.1). |
| AC-36 | **Pixels.** Equipping footwear shows hiking boots in place of the default shoes. Equipping trekking poles shows one pole in each hand with its tip on the ground. Equipping the headlamp shows a headlamp on the forehead, its band round the head with no gap. Each is visible from the default view without turning, and each unequip restores the previous picture (sections 20.1, 30.1). |
| AC-37 | **Pixels.** Every equip and unequip changes the avatar without a page reload or navigation, as a cut with no fade, scale, or spin, within 240 ms once the model is loaded. The camera does not move (sections 29.2, 29.3). |
| AC-38 | **Pixels.** Changing between two owned items of one equipped category, and equipping or unequipping a category with no 3D model (Sun protection is one), change no pixel of the Stage and make no model request. The row of a category with no model states N6 or N7 (sections 12, 29.2). |
| AC-39 | **Pixels.** Camera: the avatar's ground-contact centre is at Stage x 50%, y 86% (± 2%) at the four desktop viewports and stays there through a full turn. With all six categories equipped, nothing is cut off by the Stage inset by 24px at azimuths 0, 90, 180, and 270 degrees. Dragging turns the avatar horizontally only and stops on release. The wheel over the Stage scrolls the page or panel and does not zoom. There is no pan, pitch, or zoom. Turn left and Turn right move by 30 degrees, and Reset view returns to the default view. The camera never moves unless the user turns it (sections 16.11, 30). |
| AC-40 | **Pixels.** Lighting is stable and the look is stylized: the avatar shows flat base colors with no image texture and no specular highlight, its lit and shadowed sides are clearly different, the visible side is lit the same at every azimuth, and the lighting does not change with the loadout. In the browser there is no severe clipping, as section 27.4 defines it, in loadouts `L0` to `L8` at azimuths 0, 30, 90, and 180. No number of tonal bands is required (sections 19, 28.6, 31). |
| AC-41 | After an equip, an unequip, an item change, an opened picker, and an Add gear, the canvas element is the same element and the value of `data-avatar-renderer` is unchanged. Through a whole visit `avatar-base.glb` is requested once and each gear GLB at most once (section 28.5). |
| AC-42 | **Pixels. Idle.** With motion allowed, the idle loop runs and a Pause motion control is present; pausing holds the pose and Play motion resumes it. Under `prefers-reduced-motion: reduce`, two screenshots of the Stage one second apart are identical, no Pause control is rendered, turns and gear changes are cuts, and layout, content, tab order, and every function are otherwise the same (sections 16.11, 16.16, 32). |

### 42.6 Loading and failure

| # | Criterion |
|---|---|
| AC-43 | With `avatar-base.glb` delayed, the Stage shows ST1 over the backdrop and the panel is fully usable: Equip works and the row shows N5. When the avatar appears, the panel box and the Stage box have not changed size or position, and the equipped gear is on the avatar. After 10 s of waiting SH7 is shown (sections 16.11, 34.1). |
| AC-44 | **Pixels.** With `gear-backpack.glb` blocked and the backpack equipped: the avatar still renders, other equipped gear still appears, the Backpack row still shows Equipped with note N4, ST2 is shown, Unequip and Equip still toggle the row, and no uncaught error breaks the page (sections 29.2, 34.2). |
| AC-45 | With WebGL disabled: no canvas is rendered, no 3D chunk and no model file is requested, the Stage shows ST5 with the visible loadout text and no Retry, and every Equip, Unequip, Change, and Add gear control works. With `avatar-base.glb` blocked instead: ST4 with Retry; after unblocking, Retry shows the avatar wearing the current loadout (sections 16.11, 34). |
| AC-46 | No critical information exists only in the 3D view: with the canvas hidden, every equipped category, every Owned and Missing state, both measures, and the loadout text are readable as text, and the whole loadout can be built and changed (sections 18.5, 34). |
| AC-47 | Best-effort, at 390×844 and 320×568: no canvas is mounted and no 3D chunk or model is requested; ST14 and the loadout text are shown; every row with its state, Equip and Unequip, Change, and both measures are reachable by scrolling the page and operable; every control is at least 44 × 44px; there is no horizontal scrolling (section 17). |

### 42.7 Accessibility and layout

| # | Criterion |
|---|---|
| AC-48 | With the keyboard alone the whole workflow is operable in the tab order of 18.2: equip, unequip, the shortcut, changing an item, adding gear, turning and resetting the view, and going back. Every stop shows the Design System focus ring, fully visible and unclipped. The canvas is `aria-hidden` and is not a tab stop. Rows, tags, and notes are not tab stops and do not react to click or hover. Escape closes an open picker or form (sections 16.15, 18.2). |
| AC-49 | Recommended, Owned, Missing, and Equipped are each readable as words, and remain distinguishable in grayscale and in forced-colors mode. The Equip control is a `button` named "Equip {category}" or "Unequip {category}", with no `aria-pressed`, checkbox, or switch role. No row contains a checkbox (sections 16.8, 18.5, 18.6). |
| AC-50 | There is one `h1` in every state. Each Equip and Unequip produces one status announcement naming the category, the item, the avatar effect, and the count. Focus follows 18.3 and is never left on `body`. The loadout text after the "Your avatar" heading states what is equipped and what is and is not shown. Viewer state changes are announced as status, not alert (sections 18.1, 18.3–18.5). |
| AC-51 | At the four desktop viewports the panel box and the Stage box match the tables of 16.3. There is no page scroll and no horizontal scroll in any state of 16.13, including with an intercepted eleven-row list and a 100-character unbroken item name. Only the gear zone scrolls; the back link, the trail name, the date, and both measures stay in place. The contrast pairs of 18.7 meet the ratios listed as needed (sections 16.3, 16.5, 17, 18.7). |

### 42.8 Performance

| # | Criterion |
|---|---|
| AC-52 | On desktop, the panel's content is usable before the avatar appears. The 3D chunk and the model files are requested only on the Studio route at 768px wide or more, and no `three` or fiber code is in any chunk loaded on `/home`, Trail Detail, or Trip Preparation. The model bytes transferred with everything equipped are at most 1,990,000. The 3D chunk is at most 350 KB gzip in the `npm run build` output; a larger chunk is reported to the lead with its size and is decided there, because that budget could not be verified before implementation. Through a full pass the console shows no uncaught error and no WebGL error (sections 28.2, 33). |

### 42.9 Boundaries and regression

| # | Criterion |
|---|---|
| AC-53 | The Studio has no outdoor scene, no environment geometry beyond the avatar's ground shadow, no Start Adventure control or placeholder, no walk animation, no player movement, no map, and no FEATURE-006 element. It has no shop link, brand, price, quantity, or product image (sections 38, 39). |
| AC-54 | No Blender dependency at runtime: nothing under `Project/Frontend/` refers to Blender, an MCP server, or `localhost:9876`, and the Studio works with Blender closed. During a full pass the browser contacts only the application's origin and the Keycloak origin. `vite.config.ts` proxies exactly `/api/planner`, `/api/trails`, `/api/recommendations/pack`, and `/api/users/me/gear`, and no environment variable was added. Against the `qa` baseline nothing changed under `Project/Backend/`, `Project/docker/`, or `Project/docker-compose.yml`; no loadout, trip, or avatar endpoint exists or is called; the production source contains no mock, fixture, or sample inventory. FEATURE-001 to FEATURE-004 still behave as specified apart from the amendments of section 4.3, and `npm run build` and `npm run lint` pass (sections 7, 36, 37.2, 41). |

54 criteria: 7 entry and continuity, 16 business state, 9 asset and manifest, 10 runtime, 5 loading and failure, 4 accessibility and layout, 1 performance, 2 boundary and regression.

## 43. Decisions, Final Product Decisions, and Known Limitations

### 43.1 Lead decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The Studio's address is `/trails/:trailId/prepare/:tripDate/pack`. | It extends the address that already is the selection (FEATURE-004 D2), survives reload and a sign-in round trip, and puts nothing personal in the URL. |
| D2 | Equipped is session-scoped frontend state in one owner-checked `sessionStorage` key, keyed inside by trail and date. | No backend loadout exists (section 7.1) and none is needed for this behavior. Reuses FEATURE-003's subject isolation. Final (Q2). |
| D3 | A loadout stores identifiers only: category → item id. | Names stay in the API; nothing personal or credential-like is stored. |
| D4 | Owned and Missing on the Studio's rows come from the gear list; Recommended and Packing readiness come from the pack response, unchanged. | The pack has no items (G2). The join uses the backend's own rule and computes no readiness. |
| D5 | Owned categories that are not recommended may be equipped. | PRD section 4.3: the user decides what to carry. |
| D6 | A stored loadout entry is confirmed against the current gear list before it counts; a vanished item is dropped, never substituted. | The inventory can change; substituting would equip something the user did not choose. |
| D7 | An unusable date, and a `400` from the pack endpoint, send the user to Trip Preparation; the Studio has no date control and no date state. | One place owns the date (FEATURE-004). The Studio stays a single-purpose screen. |
| D8 | New Plan does not clear loadouts. | A loadout is keyed by the trip's address, which stays valid after New Plan, and `features/planning` must not depend on the gear features. |
| D9 | A date change is a different trip with its own loadout. | The recommended set can change with the forecast; trip identity is trail plus date (section 9). |
| D10 | One development proxy entry, `/api/users/me/gear`. | Same frontend-only bridge as FEATURE-003 D2 and FEATURE-004 D7. |
| D11 | Three new feature folders, `gear`, `loadout`, `avatar`, with one-way dependencies and `avatar` as a leaf. | Section 35. Keeps inventory, trip state, and 3D apart. |
| D12 | Runtime 3D stack: `three` and `@react-three/fiber`. `@react-three/drei` is **not** approved. `frontend` may add the two approved packages if they are absent; drei only after a proven blocker and a lead-approved scope change. | Accepted from `three-d`. With a fixed-pitch, no-zoom camera nothing in drei is needed, and its defaults can reach public CDNs, which the application's origin rule forbids. |
| D13 | No mesh compression, no textures, no environment map; nothing fetched from a CDN. | The whole model set is budgeted under 2 MB; a decoder would add a second pipeline and a second failure mode. |
| D14 | Four GLBs, not seven: the shell, the warm jacket, and the boots are embedded variants inside `avatar-base.glb`. `gear-rain-shell.glb`, `gear-warm-layer.glb`, and `gear-footwear.glb` do not exist. | Accepted from `three-d` (section 21.1). Separately shipped skinned clothing needs a runtime skeleton rebind, the most error-prone step. Final (Q9). |
| D15 | The look is flat base colors in the asset and simple runtime lighting: stylized low-poly, cel-like. No custom toon shader, no fixed number of tonal bands, no outline. | Final product decision (Q17). Flat colors are checkable at the Asset Gate; a toon shader or an outline would add a pipeline for no product gain in this feature. |
| D16 | The manifest is a typed module in `features/avatar`, written by `frontend` as a mirror of section 25. | Compiler-checked, needs no request, and cannot drift from the code that reads it. |
| D17 | One `.blend` source; a preflight spike (P0) before any modelling; a save at the end of every production step. | Section 26. Guards the exporter unknowns and session loss. |
| D18 | The Equip control is a button named by its action, never a checkbox, switch, or pressed toggle. | Accepted from `ui-ux` (18.5). A single tick is exactly what the four states must not collapse into. |
| D19 | Rows keep a fixed enum order and never move when their state changes. | Accepted from `ui-ux`. A control that moves under the pointer or the focus is worse than an unsorted list. This differs from Trip Preparation's Missing-first order, on purpose. |
| D20 | The call to action is an on-panel primary: `paper` fill with an `ink` label. | Accepted from `ui-ux`; resolves FEATURE-004 Q11. `conifer` on the panel is about 1.5:1. |
| D21 | Design System proposals from `ui-ux` are deferred (43.5). `docs/DESIGN_SYSTEM.md` is not edited by this feature. | Same handling as FEATURE-003 D27 and FEATURE-004 D22. |

### 43.2 Final product decisions

Decided by the user on 2026-10-13. None is open. The numbers are those under which the questions were first raised.

| # | Final decision | Sections |
|---|---|---|
| Q1 | Inline Add gear is in: "Add gear" on each Missing row (name only, category fixed) and one general "Add gear you own" entry (category and name). No edit, delete, or description | 13, 16.10 |
| Q2 | Equipped is session-scoped frontend state. No backend persistence | 7.1, 8, 9 |
| Q3 | A dedicated Gear Studio composition. The preparation image is not shown in the Studio | 15, 16.4 |
| Q3b | The controls and the panel are on the left; the real-time avatar Stage is on the right | 16.3 |
| Q4 | Limited horizontal orbit, by drag and by Turn left and Turn right, with Reset view. No zoom and no pan | 16.11, 30 |
| Q5 | Pack completion is a plain count: "Equipped for this trip — {e} of {m}". No second percentage and no second meter. Packing readiness keeps the backend's number and label | 14, 16.7 |
| Q6 | Nothing is equipped on first entry. "Equip recommended gear I own" stays, as an explicit user action | 5.2, 16.8 |
| Q7 | One equipped inventory item per `GearCategory`. Several owned items use the row's current item and the in-row "Change" list | 12, 16.9 |
| Q8 | Six real-time models: `BACKPACK`, `RAIN_GEAR`, `WARM_LAYER`, `FOOTWEAR`, `TREKKING_POLES`, `HEADLAMP`. UI-only: `WIND_LAYER`, `TRACTION`, `WATER`, `FOOD`, `SUN_PROTECTION`. `SUN_PROTECTION` has no model because the category may hold sunscreen or other items that are not headwear, and it must not be shown as a hat | 20 |
| Q9 | Hybrid rig. The shell, the warm layer, and the footwear are variants on the shared avatar skeleton, inside the avatar file. The backpack, the poles, and the headlamp are rigid attachments on slot nodes. Four runtime GLBs | 21, 22, 23.1 |
| Q10 | The Blender assets pass the Asset Gate before the final frontend 3D integration begins | 27, 41.1 |
| Q11 | Below 768px no real-time 3D is required: the viewer is not mounted | 17 |
| Q12 | The call to action is "Gear up" | 16.12 |
| Q13 | The preview renders are required Asset Gate evidence. They are not an intermediate human approval gate: the cycle continues after the lead's Asset Gate `PASS` without stopping for product approval, and the user is the product gate only after the whole feature reaches `PASS` | 26.3, 27, 41.1 |
| Q14 | The idle animation is optional and non-blocking | 32 |
| Q15 | Generic category-level 3D representation is approved for the six modelled categories. The interface shows the user's item name; the avatar shows the category | 16.8, 20 |
| Q16 | The interface does not tell the user that the loadout is session-only, and uses no wording that implies it is permanently saved | 8.1, 16.14 |
| Q17 | Visual-material contract: a stylized low-poly, cel-like appearance; simple flat base colors; no image textures; geometry-led forms; a restrained material palette; runtime lighting gives readable light and shadow. No fixed number of tonal bands and no custom toon shader is required | 19, 28.6, 31 |
| Q18 | Implementation write scope: `assets/blender/feature005/**`; `Project/Frontend/**`, including `package.json`, `package-lock.json`, `public/models/**`, and the Three.js / React Three Fiber sources; `docs/FRONTEND_CONTEXT.md`; `.gitignore`, restricted to `*.blend1` and `*.blend2`. The backend stays unauthorized unless `backend-api` identifies a genuine contract gap and it is approved | 41.2 |
| Q19 | Dependency rule: if `three` and `@react-three/fiber` are not installed, the frontend implementation may add only those minimum runtime dependencies. No Drei unless a later blocker proves it necessary and the lead approves the scope change | 28.1, 35 |

### 43.3 Conflicts and deviations reported, not silently adapted

| # | Source | What this feature does | Status |
|---|---|---|---|
| C1 | `docs/PRODUCT_REQUIREMENTS.md` section 40 gives Pack to real-time 3D and does not mention the pre-rendered preparation image (FEATURE-004 Q4) | Keeps the image on Trip Preparation only; the Studio has none (section 15) | The PRD is not edited. Any wording change is the user's |
| C2 | PRD section 15 lists Equip, Unequip, Bring, Remove, and Replace | Uses one verb pair, Equip and Unequip, for worn and carried gear alike, and "Change" for Replace. "Bring" and "Remove" are not used | Reported. A terminology decision for the user |
| C3 | PRD section 55 puts Gear inventory (step 12) before Gear customization (step 13) | Delivers steps 13–15 first and pulls one slice of step 12 forward: a minimal Add gear (Q1). `/gear` stays a placeholder | Reported; follows the user's instruction for this feature |
| C4 | PRD section 20 lists possible visual categories this MVP does not model: default and winter jackets as separate items, hiking pants as gear, trail shoes as gear, three backpack sizes, cap, beanie. It lists no headlamp, which this MVP does model (Q8) | One model per backend category, six in all. The PRD calls its list "potential", and section 19 of the PRD asks for exactly this many-to-one mapping | Consistent; recorded for completeness |
| C5 | PRD section 46 includes "basic idle animation" in the 3D MVP | Included, with a drop rule (Q14) | A drop would be reported when it happens |
| C6 | PRD section 42: packing and gear selection must work on mobile | Gear selection works below 768px without 3D; validation there is best-effort (FEATURE-004 Q7 stands) | Open, the user's to settle |
| C7 | The task's proposed runtime files: seven GLBs including `gear-rain-shell.glb`, `gear-warm-layer.glb`, `gear-footwear.glb` | Four GLBs (D14, Q9) | Approved (Q9) |
| C8 | The task's proposed stack: Three.js, React Three Fiber, and Drei | Drei is not approved (D12) | Approved (Q19) |
| C9 | `docs/DESIGN_SYSTEM.md` section 32 defines nothing for Packing, avatar UI, or real-time 3D controls, and section 33 says the hero's media rules must not be applied to real-time 3D without review | Sections 15–18 define feature-level values and review those rules; nothing is written into the Design System (D21) | Promotion candidates in 43.5 |
| C11 | PRD sections 16.2 and 40.3 name the target style "cel-shaded" | Requires a stylized low-poly, cel-like look with flat colors and readable light and shadow, with no toon shader and no band count required (Q17) | Approved by the user. The PRD is not edited |
| C10 | `docs/FRONTEND_CONTEXT.md` describes no `gear`, `loadout`, or `avatar` feature, no gear proxy entry, and no 3D dependency | Unchanged by this specification task. It is updated in the implementing change (section 41.2) | Pending implementation |

### 43.4 Known limitations

| Limitation | Effect | Handling |
|---|---|---|
| A loadout lives in one tab's session | It is lost when the tab closes, at sign-out, and at session expiry. Another tab or device starts empty | Section 7.1; a later backend resource |
| A date change starts an empty loadout | Choices made for one date do not follow to another | D9 |
| Gear added in the Studio cannot be edited or removed in the product | A typo in an item's name stays until the Gear inventory feature exists | Section 13.2; no undo is designed |
| Items with no category cannot be equipped here | They are counted in one informational line | G3 |
| The header's Gear link still leads to an empty page | From a screen that is all about gear | Out of scope; PRD step 12 |
| The avatar shows a category, not a product | Two different items of one category look the same on the avatar (Q15) | Row note and Stage caption |
| The warm layer is mostly hidden under the shell | Only its collar shows; the row and the announcement say so | Section 20.4 |
| The shell, warm jacket, and boots cannot load or fail on their own | They are part of the avatar file | D14 |
| No toon shader and no outline | The look is stylized low-poly with flat colors, not strict cel shading | D15, Q17 |
| Five categories never appear on the avatar | Sun protection, wind layer, traction, water, and food can be equipped but are shown only in text | Q8; the row note says so |
| Packing readiness lags a moment after Add gear | The row turns Owned at once; the number follows when the pack request returns. If that refresh fails the old number stays, silently | G10, 16.13 S22 |
| No browser path outside the development server | `npm run preview` and a deployed build cannot load the Studio's data | G11 |
| No automated test runner | Validation is in the browser and on the files, plus build and lint | Section 42.1 |

### 43.5 Unverified values, and deferred Design System proposals

When this specification was written nothing in it had been run, rendered, installed, or measured. These were designed values to be confirmed at the stage named. They have since been confirmed or corrected in the feature cycle (2026-10-13 to 2026-10-14): corrections are the CA-tagged texts in sections 19–27 and 32, and the measured values are in the cycle checkpoint (Stage A, P0, Asset Gate, Integration Gate, QA run 1).

| Value | Confirmed at |
|---|---|
| glTF exporter option names and enum values in Blender 5.2.2; where skinned mesh nodes are placed; one skin or several; whether `Root` is listed as a joint; the exported clip name; which material extensions the exporter emits; whether bone-parented empties export with correct world transforms | Stage A and the P0 preflight (sections 23.6, 24.2, 26.2) |
| Whether a background Blender can render the round-trip previews with the session's engine | P0 |
| The release lines of `three` and `@react-three/fiber` that support React 19.3; whether `three` ships its own types | Implementation |
| The 3D chunk's size (350 KB gzip budget), GLB sizes, frame rate | Implementation and the Asset Gate |
| Camera margins for the Stage (computed by hand), the light values, the palette's lightness values | The preview renders, then `qa` from pixels |
| Panel-zone heights, gear-zone heights, row heights, scroll amounts, label widths behind the "fits at 1024px" claims, the Stage aspect ratios | `qa` (AC-51) |
| Contrast ratios computed for this document: 11.3, 13.7, 11.5, 5.6, 14.6, 5.7 | `qa` (AC-51) |
| The 110% estimate behind section 15's perspective argument | Not needed: Q3 is final |
| The headlamp's dimensions, extents, facing check, and palette values (sections 19, 20.3, 24.4, 24.5), written by the lead in the final revision | Stage B, when `three-d` validates the contract, then the Asset Gate |

Design System promotion candidates from `ui-ux`, deferred (D21): the on-panel primary action; the Equipped state tag; the on-panel text input and select; the real-time 3D Stage rules (transparent canvas, `aria-hidden`, no wheel capture, view controls as buttons outside the canvas); the extension of DESIGN_SYSTEM section 23's Pause and Play to a real-time idle loop; the Studio backdrop recipe; the viewer state vocabulary; the in-row disclosure pattern; the panel width tiers for control-bearing panels.
