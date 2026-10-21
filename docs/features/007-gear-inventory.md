# FEATURE-007 — Gear Inventory (My Gear)

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-16).** Product gate accepted by the user. Lean QA PASS after one repair cycle (Targeted QA PASS); the record is `.claude/state/features/007-gear-inventory.md`. Backend: existing `user-service` CRUD sufficient, no backend change (`backend-api` skipped). 3D pipeline: SKIP; Blender: NOT REQUIRED. Final desktop (1440–1679) detail-panel width: **328px** (section 21.3 amendment). Interim category icons (sections 14.2, 21.6): accepted as shipped artwork. Final category illustrations (section 14.3): **deferred polish**, a separate explicitly approved asset task. History: approved for implementation 2026-10-15 (U1 decided (a)). Q1–Q15 and D1–D17 are final (section 23) |
| Date | 2026-10-15 |
| Route | `/gear` (authenticated; reused, no new route) |
| Depends on | FEATURE-002 (Authentication), FEATURE-005 (`features/gear`, the Studio's reconciliation of the loadout), `GET`, `POST`, `PUT`, `DELETE /api/users/me/gear` (all existing) |
| Followed by | FEATURE-008 (Memories & Sharing) |
| Feature cycle | `3D pipeline: SKIP`, `Blender production: NOT REQUIRED`, `backend-api: SKIP` (backend classification A, section 7.6). Recover → Scope → `frontend` → lead diff review → `qa` (Lean) → product gate → closeout |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (sections 13.2, 14, 15, 35) → `docs/FRONTEND_CONTEXT.md` → `docs/DESIGN_SYSTEM.md` → FEATURE-004 → FEATURE-005 (frozen) |

How to read this document.

| Reader | Sections |
|---|---|
| Lead / user | 1–5, 23, 24 |
| `frontend` | 6–21, 24.2–24.4 |
| `ui-ux` / design review | 4, 10–14, 18, 20, 21 |
| `qa` | 22, with the sections each criterion names |
| `backend-api` | Not engaged. Section 7 records the contract the frontend uses as it is |

Notation. "005 §x" is section x of `docs/features/005-pack-customization-avatar.md`; "004 §x", "006 §x" likewise; "DS §x" is `docs/DESIGN_SYSTEM.md`; "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`; "FC §x" is `docs/FRONTEND_CONTEXT.md`; a bare "§x" is this document. Copy ids defined in section 21 are written `MG…`. Ids of FEATURE-005 keep their prefixes (G, AG, GS).

Authorship. Section 21 was designed by `ui-ux` (2026-10-15). The lead wrote and reconciled the rest.

---

## 1. Feature Summary

FEATURE-007 turns the empty `/gear` placeholder into **My Gear**: the signed-in user's permanent collection of outdoor gear.

The user opens My Gear from the header's **Gear** link, sees what they own as a visual grid of item cards, selects a card to inspect it in a detail panel beside the grid, and adds, renames, recategorizes, or removes items. Every change is stored by the existing `user-service` endpoints and is the same inventory the FEATURE-005 Gear Studio reads, so an item added here is available to equip the next time the user prepares a trip, and an item removed here stops being Owned or Equipped anywhere.

No trip is needed to use My Gear. It shows ownership only: nothing about recommendations, missing gear, readiness, or what is equipped for a trip.

## 2. Goals

The user's sentence: *"This is the gear I own. I can see it at a glance, keep it accurate, and it is ready when I prepare a trip."*

Success state:

1. A signed-in user reaches My Gear from the header in one step, with or without a trip in progress.
2. They can tell what they own from the grid alone: each item's name and category, with category art.
3. They can add an item, correct its name or category, and remove it, and each change survives a reload.
4. An item added or changed in My Gear is what the Gear Studio shows; an item added in the Studio appears in My Gear. There is one inventory.
5. Removing an item never leaves a ghost: it is no longer Owned in Trip Preparation and no longer Equipped in the Studio.
6. Empty, loading, and unavailable are three different states, and none of them is shown as another.

## 3. Product Model

### 3.1 The four gear states

| State | Meaning | Scope | Source | Stored where |
|---|---|---|---|---|
| **Recommended** | The trip preparation system suggests this category for a specific trail, date, and weather | One trip | `POST /api/recommendations/pack` (`requiredGear[]`) | Nowhere; derived per request |
| **Owned** | An item exists in the user's Gear Inventory | The user, across all trips | `GET /api/users/me/gear` | `gear_items` (server) |
| **Equipped** | The user chose this item to bring on this trip | One trip | The FEATURE-005 loadout | Session storage, per trip (FC §7) |
| **Missing** | Recommended, and the user owns no item of that category | One trip | Derived: the pack response's `owned: false` | Nowhere; derived per request |

**Recommended ≠ Owned ≠ Equipped.** FEATURE-007 creates, changes, and removes **Owned** only. It never writes Recommended, Missing, or Equipped, and it stores none of them in `gear_items` (section 16).

### 3.2 Two surfaces, two questions

| | My Gear (FEATURE-007) | Gear Studio (FEATURE-005, frozen) |
|---|---|---|
| Question | "What gear do I own?" | "What am I bringing for this trip?" |
| Metaphor | The collection: the storage room of everything you own | The loadout for one adventure |
| Route | `/gear`, global, from the header | `/trails/:trailId/prepare/:tripDate/pack`, reached from Trip Preparation only |
| Shows | Every owned item, by name and category | Recommended and owned categories for one trip, Equipped items, the avatar |
| Changes | Owned (add, edit, remove) | Equipped (per trip); a minimal Add gear that writes to the same inventory |
| 3D | None | The real-time avatar |

The Gear Studio stays contextual: there is no global navigation entry for it (PRD §35).

### 3.3 One inventory

```text
Add in My Gear ─┐                     ┌─> My Gear grid
                ├─> POST /api/users/me/gear ─> gear_items ─> GET /api/users/me/gear ─┤
Add in Studio ──┘                     └─> Gear Studio rows (Owned)
                                                         └─> pack `owned` (via recommendation-service)
```

There is exactly one source of truth for ownership: the server's non-deleted `gear_items` rows for the current user. The frontend holds one cached copy of it, the existing gear list query (section 17). No second store, context, or web-storage copy of ownership exists.

## 4. Game-Inventory Visual Principle

> **Gear Inventory should feel like an adventure-game item collection, while remaining a practical ownership-management tool rather than a game mechanic.**

| Yes | No |
|---|---|
| Item cards that read as slots in a collection | Rarity, rarity colours, loot, "legendary", "quest item" |
| One piece of category art per card | Levels, XP, stats, stat grids, durability, equipment score, value |
| A collection grid, not a table | Achievements, collection completion ("42% complete"), badges |
| A selection that opens a detail panel | Item economy, crafting, trading |
| Subtle motion on arrival and selection | "NEW ITEM ACQUIRED!", celebratory pop-ups, glow, neon, HUD chrome |
| Warm, tactile surfaces from the product's palette | Glassmorphism, sci-fi HUD, dense dashboard panels |

The inspiration is general (adventure-game inventories, cozy collection screens, an expedition kit laid out on a floor). No layout, asset, or UI element of an existing game is reproduced (PRD §7.7, §40.3).

## 5. Scope and Non-goals

### 5.1 In scope

- My Gear at `/gear`: page heading, quiet summary, Add Gear, an optional lightweight category selector, and the inventory grid.
- Item detail in a panel on the same page: name, category art, category, Edit, Remove from My Gear.
- Add (name and category), Edit (name and category), Remove (soft delete, with a small confirmation).
- Category art at the category level, through one art manifest (section 14).
- Empty, loading, unavailable, and per-action failure states.
- The header's Gear link marks itself as the current page on `/gear`.

### 5.2 Non-goals

Real-time 3D, the avatar, Blender, GLBs; per-item or SKU images; image upload; product catalog, brand lookup, retailer integration, AI item recognition, barcode scanning; price, purchase history, weight, packing weight; rarity, stats, levels, crafting, achievements, collection completion; search, sort, faceted or advanced filters, pagination; public, shared, or social inventories; restore, recycle bin, or history of removed items; editing the `description` field (section 8.3); any change to the Gear Studio, Trip Preparation, the planner, or Discover beyond what section 24.2 lists.

## 6. Current Implementation Inspection

Inspected on 2026-10-15 from the working tree.

| Area | Finding | Evidence |
|---|---|---|
| A. `/gear` route | Exists, protected, inside `AppLayout` (neutral shadcn header, `max-w-5xl`). The page is a placeholder `<h1>Gear</h1>`. Already an accepted return destination | `app/router/routes.tsx`; `pages/GearPage.tsx`; `features/auth/returnDestination.ts` |
| A. Navigation to `/gear` | The Authenticated Home header and the trip header (Trail Detail, Trip Preparation, Studio) both link **Gear** → `/gear`, on the wide row and in the narrow Menu. Neither marks a current page | `features/home/HomeHeader.tsx`; `components/layout/TripHeader.tsx` |
| B. Gear API | `GET`, `POST`, `PUT /{gearId}`, `DELETE /{gearId}` on `/api/users/me/gear` | `GearController` |
| C. Schema / entity | `gear_items`: `id`, `user_id`, `name`, `category`, `description`, `created_at`, `deleted` | Migrations V1, V3, V4; `entity/Gear.java` |
| D. `GearCategory` | Eleven values, identical and in the same order in `user-service` and the frontend | `entity/GearCategory.java`; `features/gear/types/gear.ts` |
| E. Soft delete | `DELETE` sets `deleted = true`; list, update, and delete look items up with `…AndDeletedFalse` | `GearService`; `GearItemRepository` |
| F. Gear Studio | Reads the gear list, groups items by category, equips one item per category per trip, minimal Add gear (row form with a fixed category, general form with a `<select>`) | `features/loadout/**` |
| G. How the Studio loads Owned | `useGearItems` from `features/gear`: query key `["gear","items",<subject>]`, `refetchOnMount: "always"` | `features/gear/hooks/useGearItems.ts` |
| H. State derivation | Recommended from the pack's `requiredGear`; Owned from the gear list; Missing from the pack's `owned: false`; Equipped from the session loadout after `reconcileLoadout` | `features/loadout/model/studioModel.ts`; `features/packing/gearCategories.ts` |
| I. Studio Add gear | `useAddGearItem` → `POST { name, category }`; puts the created item at the head of the cached list, then invalidates it; refetches the pack | `features/gear/hooks/useGearItems.ts`; `features/loadout/components/AddGearForm.tsx` |
| J. Update / Delete | Both exist and are tested in `user-service`. The frontend has no function for either; FEATURE-005 never sends them (005 §6.1) | `GearController`; `features/gear/api/gearItems.ts` |
| K. Ownership | Every operation resolves the current user from the JWT `sub` and scopes the query by `user_id`. Another user's item is "not found" | `GearService`; `UserService.getOrCreateUser` |
| Dev proxy | `/api/users/me/gear` → `user-service` (8081) is a prefix entry, so it already reaches `PUT` and `DELETE` on `/api/users/me/gear/{id}`. No proxy change | `vite.config.ts` (FEATURE-005 D10) |
| Category labels | The only label map (`"FOOTWEAR"` → "Hiking footwear", …, unknown → "Other gear") lives in `features/packing/gearCategories.ts` | That file |
| Existing 2D gear art | None. `public/media/` holds only hero, home, and preparation images; `public/models/gear/` holds three GLBs, which FEATURE-007 must not load | Directory listing |
| Icons | `lucide-react` is a dependency and includes `backpack`, `footprints`, `cloud-rain`, `shirt`, `wind`, `hiking-stick`, `snowflake`, `flashlight`, `glass-water`, `sandwich`, `sun` | `node_modules/lucide-react` |
| Dialog primitive | No dialog library (no Radix). Native `<dialog>` is available | `package.json` |

## 7. Backend Contract

Service `user-service`, port 8081, base path `/api/users/me/gear`, reached in development through the existing Vite proxy entry. Every operation requires `Authorization: Bearer <access token>`; the frontend sends it through `authenticatedApiRequest()` via `features/gear/api/gearRequest.ts` (20-second limit).

### 7.1 LIST

| | |
|---|---|
| Request | `GET /api/users/me/gear`, no body |
| Response | `200`, `GearItemResponse[]`: the current user's non-deleted items, newest first (`created_at` descending). Not paginated |
| Errors | `401` without or with an invalid token (`RestAuthenticationEntryPoint`) |
| Ownership | Scoped to the current user's `user_id`. The local profile is created on first access from the JWT |

### 7.2 CREATE

| | |
|---|---|
| Request | `POST /api/users/me/gear`, JSON `CreateGearItemRequest { name, category, description }`. `name`: required, not blank, at most 100 characters (not trimmed by the server). `category`: a `GearCategory` value or `null`. `description`: at most 255 characters or `null` |
| Response | `201`, `GearItemResponse` |
| Errors | `400` `ProblemDetail` with `code: "VALIDATION_ERROR"` and `errors[]` for a blank or long name or long description; `400` with Spring's default body for an unknown category value or malformed JSON; `401` |
| Ownership | The item is created for the current user; no client-supplied owner exists |
| Notes | Duplicate names and several items in one category are accepted (005 G6) |

### 7.3 UPDATE

| | |
|---|---|
| Request | `PUT /api/users/me/gear/{gearId}`, JSON `UpdateGearItemRequest`, the same shape and validation as create |
| Semantics | **Full replacement** of `name`, `category`, and `description`. A field that is omitted or `null` becomes `null`. `id`, `created_at`, and the owner do not change |
| Response | `200`, `GearItemResponse` |
| Errors | `404` `ProblemDetail` `code: "GEAR_NOT_FOUND"` when the item does not exist, is removed, or belongs to another user; `400` as for create; `400` with Spring's default body for a non-UUID `gearId`; `401` |
| Ownership | Looked up by `id` **and** the current user's `user_id`; another user's item is indistinguishable from a missing one. Covered by `GearIntegrationTest.shouldNotAllowUserToUpdateAnotherUsersGear` |

### 7.4 REMOVE

| | |
|---|---|
| Request | `DELETE /api/users/me/gear/{gearId}`, no body |
| Semantics | Soft delete: sets `deleted = true`. The row stays; every normal query excludes it. No restore endpoint exists |
| Response | `204`, empty body |
| Errors | `404` `GEAR_NOT_FOUND` when the item does not exist, is already removed, or belongs to another user; `401` |
| Ownership | The same scoped lookup as update |

### 7.5 `GearItemResponse`

`{ id: UUID string, name: string, category: GearCategory | null, description: string | null, createdAt: ISO-8601 offset date-time }`. No `updatedAt`, no `deleted`, no owner field.

### 7.6 Classification

**A — COMPLETE.** List, create, update, and remove exist, are current-user scoped, soft-delete correctly, and have controller, service, and Testcontainers integration tests. FEATURE-007 needs no backend change, migration, or new endpoint, and `backend-api` is not engaged. One test gap is recorded as a non-blocking follow-up (F7, section 24.6).

## 8. Gear Data Model

### 8.1 Fields (Q2)

| Column | Type | Null | In the API | Used by FEATURE-007 |
|---|---|---|---|---|
| `id` | UUID | no | `id` | Identity, selection, update and remove paths |
| `user_id` | UUID, FK `users(id)` | no | No | Never seen by the frontend; ownership is implied by the token |
| `name` | varchar(100) | no | `name` | Shown; added and edited |
| `category` | varchar(50), enum string | **yes** | `category` | Shown as a label and art; added and edited |
| `description` | varchar(255) | yes | `description` | Shown read-only when present; preserved on edit (8.3) |
| `created_at` | timestamptz | no | `createdAt` | Optional "Added {date}" line in the detail panel; never a sort control |
| `deleted` | boolean, default false | no | No | Never exposed; set only by `DELETE` |

No other field is added. Brand, price, weight, size, colour, photo, notes, purchase date, and the rest of section 5.2 stay out.

### 8.2 Categories

`GearCategory`: `FOOTWEAR`, `RAIN_GEAR`, `WARM_LAYER`, `WIND_LAYER`, `TREKKING_POLES`, `TRACTION`, `HEADLAMP`, `BACKPACK`, `WATER`, `FOOD`, `SUN_PROTECTION`. The frontend's `GEAR_CATEGORY_VALUES` matches `user-service` exactly. Wire values are never shown; labels come from the one existing label map (D3).

Two edge cases exist in data and must render:

- **No category.** `category` is nullable in the schema and both DTOs (005 G3). Such an item appears in My Gear with the label "No category" and the neutral art, appears only under **All**, and does not count as a category in the summary. Editing it requires choosing a category, because FEATURE-007, like FEATURE-005, always sends one.
- **Unknown category.** A string the frontend does not know is labelled "Other gear" (the existing fallback), uses the neutral art, and appears only under **All**. Edit offers the eleven known categories; none is preselected.

### 8.3 `description`

The field exists, is nullable, and nothing in the product writes it today (FEATURE-005 never sends it). FEATURE-007 does not add a way to edit it. Because `PUT` replaces every field, **every update sends the item's current `description` back unchanged**, so an existing value is never erased by a rename. When it is present it is shown read-only in the detail panel as plain text.

### 8.4 Multiple items per category (Q1)

Allowed and required. A user may own any number of items in one category, including items with the same name; each is a separate card. One-item-per-category applies only to Equipped in the Studio (005 §8).

## 9. Routes and Authentication

| Rule | Value |
|---|---|
| Route | `/gear`, unchanged path. No `/inventory`, `/my-gear`, `/collection`, or `/gear-inventory`, and no per-item route or search parameter |
| Access | Behind `ProtectedRoute`, as today. A signed-out visitor is sent to `/` with the sign-in gate, and `/gear` is kept as the return destination (already accepted by `returnDestination.ts`; no FEATURE-002 change) |
| Shell (D1) | `/gear` leaves `AppLayout` and renders in the authenticated full-viewport shell (`TripShell` with `TripHeader`), as Trail Detail, Trip Preparation, and the Studio do, so the header a user sees on `/gear` is the same one that led them there. `AppLayout` keeps only the Not Found route |
| Loading (D2) | The page is a lazily loaded route chunk, added to `pages/LazyRoutes.tsx` like the other pages, with the same `ink` fallback |
| Header | The trip header's **Gear** link carries `aria-current="page"` and a visible current-page treatment on `/gear` (section 21). The label stays **Gear** (PRD §35); the page itself is titled **My Gear** |
| Document title | "My Gear · Outdoor Trip Companion" (follow the existing `useDocumentTitle` convention). Never an item name |
| Sign-out | Unchanged FEATURE-002 behaviour: the page becomes inert, and sign-out clears the query cache, so no other user's gear can be shown |

## 10. My Gear Page

Desktop hierarchy, top to bottom (design in section 21):

1. **Header** (shared trip header).
2. **Title block:** "My Gear", one support line, a quiet summary, and **Add Gear** as the page's one primary action. Add Gear appears once the list has loaded with at least one item; the empty state carries its own **Add your first item**, and nothing offers Add while the list is loading or unavailable (D15).
3. **Category selector** (optional, section 11.4).
4. **Collection:** the inventory grid, and beside it, while an item is selected, the item detail panel.

The summary counts items and distinct known categories, for example "12 items across 6 categories", with correct singular forms. It never expresses completeness, progress, or a target (no "of", no percentage, no bar).

## 11. Inventory Grid

### 11.1 Presentation

The default and only view is a **visual grid of item cards**. There is no list or table view and no view toggle. Each card shows the category art, the item name, and the category label. Edit and Remove never appear on a card; they live in the detail panel.

### 11.2 Order

The server's order: newest first. A newly added item therefore appears first, where the user is looking. No sort control.

### 11.3 Density

At 1440×900, about 4–5 cards per row with no item selected; the grid narrows when the detail panel is open. At 1024 fewer columns; at 1920 the card size is capped and extra width becomes spacing, not larger or more stretched cards. Below 768 a basic two- or one-column grid. Exact tracks are in section 21.

### 11.4 Category selector (Q14)

A lightweight, single-choice selector of frontend-only **families**. Families group the existing categories for browsing; they are never sent, stored, or shown as a category of an item.

| Family | Categories | Why |
|---|---|---|
| **Packs** | `BACKPACK` | |
| **Layers** | `RAIN_GEAR`, `WARM_LAYER`, `WIND_LAYER` | All three are worn layers; "Clothing" would imply more than the categories cover |
| **Footwear** | `FOOTWEAR`, `TRACTION` | Traction is worn over footwear |
| **Tools** | `TREKKING_POLES`, `HEADLAMP` | Carried equipment |
| **Essentials** | `WATER`, `FOOD`, `SUN_PROTECTION` | Sun protection may be sunscreen, sunglasses, or a hat, so it is not clothing or headwear; the three are consumable or everyday essentials |

Rules:

- Options are **All** plus each family that has at least one item, in the table's order. A family with no items is not shown, and no "0 items" appears anywhere.
- The selector appears only when the user's items span two or more families. Otherwise the grid shows everything with no selector.
- Items with no category or an unknown category appear only under **All**.
- The choice is page state: not in the URL, not persisted, reset to **All** on each visit. If the chosen family becomes empty (after a remove or a category edit), the selection returns to **All**.
- Choosing a family that does not contain the selected item closes the detail panel.
- An add or edit that puts an item outside the chosen family returns the selection to **All**, so the item stays visible (and, after an edit, selected).
- No search, sort, multi-select, counts per option, or second filter.

## 12. Item Detail (Q15)

Selecting a card opens the **item detail panel** on `/gear`; there is no navigation, route change, or history entry.

| Content | Rule |
|---|---|
| Name | The heading of the panel, the user's text as text |
| Art | The category art, larger than on the card; decorative |
| Category | The label |
| Description | Only when present, read-only (8.3) |
| Context | Optional quiet lines that are true: "Added {date}" from `createdAt`, and one plain sentence that owned gear can be equipped when preparing a trip. Never a stat, a recommendation, or an Equipped state |
| Actions | **Edit** (ordinary), **Remove from My Gear** (destructive, secondary) |

Interaction: activating a card opens the panel; activating another card switches it; activating the selected card, Close, or Escape closes it; the selected card stays visibly selected while the panel is open. Focus behaviour, the panel's semantics, and its narrow-width form are designed in section 21. The selected item is page state only and is not persisted.

If the selected item disappears from the list (removed here, or gone when the list is refetched), the panel closes and focus moves to a stable place defined in section 21.

## 13. Add, Edit, Remove

### 13.1 Add Gear

- Opened from **Add Gear** in the title block, and from the empty state's call to action.
- One step: choose a category from visual tiles (the same art as the grid, each tile labelled), enter an item name, **Add to My Gear**. No wizard.
- Validation before sending: a category is chosen; the trimmed name is 1–100 characters. Errors are shown on the field.
- Request: `POST { name: <trimmed>, category: <wire value> }`. No `description` is sent (as in FEATURE-005).
- While saving, a second activation sends nothing.
- On `201`: the form closes, the new item appears at the head of the grid with a restrained arrival (opacity, at most a 0.98 → 1 scale or 4px movement, `--duration-base`; none under reduced motion), the addition is announced politely, and the list is refetched. The new item is **not** selected automatically unless section 21 decides otherwise; it is never equipped.
- If the selected family would hide the new item, the selection returns to **All** so the user sees it.
- On failure: the form stays open with the values kept and a short error; the user can retry (section 18).

### 13.2 Edit (Q3)

- From **Edit** in the detail panel. Editable: **name** and **category**. Category editing is supported because `PUT` replaces `category` and the Studio already handles an item whose category changed (section 15.3).
- The form starts with the current values. A no-category or unknown-category item starts with no category chosen and requires one.
- Request: `PUT { name: <trimmed>, category: <wire value>, description: <the item's current description, unchanged> }`.
- On `200`: the cached item is replaced by the response, the list is refetched, the panel shows the updated item, and the change is announced. No history, version, or duplicate is created.
- On failure: the stored item is unchanged on screen (no false success), the form keeps the typed values, and the user can retry or cancel.
- On `404`: the item is no longer in My Gear (removed in another tab or session). Say so briefly, refetch the list, and close the panel.

### 13.3 Remove (soft delete)

- From **Remove from My Gear** in the detail panel. A small confirmation asks, in the item's name, whether to remove it and says it can be added again later; its actions are **Cancel** and **Remove**. No typed confirmation and no large danger modal.
- Request: `DELETE /api/users/me/gear/{id}`. The server marks the row deleted (soft delete). Nothing is physically deleted and no restore is offered.
- On `204`: the item leaves the cache and the grid, the panel closes, the removal is announced, focus moves to a stable place (section 21), and the list is refetched.
- On `404`: treat as already removed: the same outcome as `204`.
- On failure: the item stays visible and selected, an error is shown, and the user can retry.
- `features/gear/api/gearRequest.ts` reports a `2xx` with a non-JSON body as `unreadable`. For `DELETE`, any `2xx` is success; the empty `204` body is never parsed as a failure.

## 14. Category Illustrations

### 14.1 Strategy (Q8)

**One illustration per category**, plus one neutral illustration for no-category and unknown-category items: twelve in all. A card is *category art + the user's item name*. No per-item, per-brand, or uploaded image exists; no product catalog or SKU matching is involved.

All art is reached through one **art manifest** in `features/gear` that maps each category (and the neutral case) to its art. Cards, the detail panel, and the Add Gear category tiles all read the manifest, so replacing the art changes one module and no layout.

### 14.2 Two tiers (U1)

| Tier | What | When |
|---|---|---|
| **Interim (ships with FEATURE-007)** | A designed "slot plate": a warm tinted plate from the product palette with one large `lucide-react` line pictogram per category, drawn to section 21's rules. Uses an existing dependency; no new files under `public/` | Implementation cycle |
| **Final** | Stylized 2D illustrations to section 14.3, as static files under `Project/Frontend/public/media/gear/categories/` | A separate static-asset task that the lead and user approve. Not part of the FEATURE-007 cycle; never Blender; never generated silently by the implementation agent |

Interim pictograms (each must be checked against section 21 by the designer; a misleading one is replaced, not kept):

| Category | Pictogram | | Category | Pictogram |
|---|---|---|---|---|
| `FOOTWEAR` | `footprints` | | `HEADLAMP` | `flashlight` |
| `RAIN_GEAR` | `cloud-rain` | | `BACKPACK` | `backpack` |
| `WARM_LAYER` | `shirt` | | `WATER` | `glass-water` |
| `WIND_LAYER` | `wind` | | `FOOD` | `sandwich` |
| `TREKKING_POLES` | `hiking-stick` | | `SUN_PROTECTION` | `sun` (not a hat: sun protection is not only headwear) |
| `TRACTION` | `snowflake` | | none / unknown | a neutral mark defined in section 21 |

### 14.3 Final art direction and asset contract

Direction: stylized outdoor-adventure gear illustration in the product's world (PRD §7.7): simplified forms, soft painterly or cel-like shading, clean silhouette, warm natural palette, slightly game-like, readable at card size, one consistent camera angle and light direction across all twelve. Not photoreal product photography, not a branded product, not a hyper-detailed render, not emoji, not a generic enterprise icon.

| Property | Contract |
|---|---|
| Location | `Project/Frontend/public/media/gear/categories/` |
| Names | `<category-in-kebab-case>.webp`, e.g. `rain-gear.webp`, `trekking-poles.webp`; `uncategorized.webp` for the neutral case |
| Count | 12 |
| Aspect | 1:1, subject centred with consistent padding (the art region in section 21 crops nothing) |
| Size | 512 × 512 source; WebP with alpha; about 40 KB or less each |
| Background | Transparent; the card's plate supplies the surface |
| Semantics | Decorative (`alt=""`); the name and category are always text |
| Loading | Same-origin static files, `loading="lazy"`, `decoding="async"`, fixed dimensions so nothing shifts |
| Sun protection | Must not read only as a hat; for example sunscreen with sunglasses |

## 15. FEATURE-005 Integration

### 15.1 One inventory both ways (Q5)

- **Studio → My Gear.** The Studio's Add gear calls `POST /api/users/me/gear` through `useAddGearItem` in `features/gear`. The item is a normal `gear_items` row; My Gear lists it on its next mount (`refetchOnMount: "always"`). Verified in code.
- **My Gear → Studio.** My Gear writes through the same endpoints and the same query key. The Studio refetches the gear list whenever it mounts, and the pack whenever Trip Preparation or the Studio mounts, so an item added here appears as Owned there, and a Missing category becomes Owned when the pack is recomputed. Verified in code.
- My Gear uses the same `useGearItems` and `useAddGearItem` hooks; FEATURE-007 adds update and remove alongside them in `features/gear`.

### 15.2 Equipped stays trip-scoped (Q11)

Equipped is the FEATURE-005 loadout in session storage, keyed by trip. `gear_items` gets no `equipped` column, and My Gear neither reads nor writes the loadout: `features/gear` continues to import nothing from `loadout`, `packing`, or `avatar` (FC §10).

### 15.3 Removing or recategorizing an Equipped item (Q4)

FEATURE-005 already implements the safe rule. On each Studio mount the gear list is fetched again and `reconcileLoadout` (`features/loadout/model/studioModel.ts`) keeps a stored Equipped entry **only** if the list holds an item with that id **and** that category; anything else is dropped, never substituted, and the corrected loadout is written back once the list is confirmed by the server (005 §8.4, D6).

Consequences, with no FEATURE-005 change:

| Action in My Gear | Next time the Studio for that trip opens |
|---|---|
| Remove an Equipped item | It is not listed as Owned, not Equipped, and not on the avatar. If it was the only item of a recommended category, the row is Missing |
| Change an Equipped item's category | The old category's Equipped entry is dropped; the item is listed, not equipped, under its new category |
| Rename an Equipped item | Still Equipped (same id and category), shown with the new name |

My Gear does not purge the loadout itself and no permanent loadout persistence is introduced. A Studio already open in another tab shows its old list until it is reopened; that is accepted (section 24.6, F9).

### 15.4 What FEATURE-007 does not change in FEATURE-005

The Studio's layout, rows, Add gear form and copy, avatar, Stage, and loadout rules are frozen and untouched. The only shared code FEATURE-007 changes is `features/gear` (additive: update and remove) and the location of the category label map (D3, behaviour-identical).

## 16. Owned / Recommended / Equipped / Missing Semantics

- `gear_items` stores ownership only. FEATURE-007 adds no `recommended`, `missing`, or `equipped` column, flag, or client field.
- Recommended and Missing remain derived per trip by `recommendation-service` (`requiredGear[].owned` compares recommended categories with the categories of the user's non-deleted items). Missing = Recommended categories − Owned categories.
- A removed item stops counting as Owned immediately on the server, because every gear read excludes `deleted = true`.
- My Gear shows none of Recommended, Missing, Equipped, or readiness. It has no trip context.

Worked example (section 41 of the brief):

```text
My Gear:      Talon 22 (Backpack), Daypack (Backpack), Hiking Boots (Hiking footwear), Shell Jacket (Rain gear)
Trip X pack:  recommends Backpack, Hiking footwear, Headlamp
Studio:       Backpack     Recommended · Owned (Talon 22, Daypack) · user equips Talon 22 → Equipped for trip X
              Hiking footwear  Recommended · Owned (Hiking Boots) · not equipped
              Headlamp     Recommended · Missing
              Rain gear    not recommended · Owned (Shell Jacket), under "Also in your gear"
```

## 17. Queries and State

| State | Where | Persisted |
|---|---|---|
| Owned items | Existing query `["gear","items",<subject>]` (`useGearItems`). `refetchOnMount: "always"`, no focus or reconnect refetch, one automatic retry for `unavailable` | Server only |
| Add | Existing `useAddGearItem`: on success, put the created item at the head of the cached list, then invalidate | — |
| Edit | New `useUpdateGearItem` in `features/gear`: on success, replace the cached item by id with the response, then invalidate. Not optimistic. Never retried automatically | — |
| Remove | New `useRemoveGearItem` in `features/gear`: on success (or `404`), remove the item from the cached list, then invalidate. Not optimistic. Never retried automatically | — |
| Selected item, open forms, chosen family | React state in the page | No: not in the URL, web storage, or history state |

Rules:

- No second permanent copy of the inventory: no new store, context, `localStorage`, or session-storage key. FEATURE-007 adds no storage key.
- No optimistic writes and no rollback machinery. The screen reflects the server's answer.
- The pack query is not invalidated from My Gear; it refetches on its own whenever Trip Preparation or the Studio mounts.
- New failure kinds reuse `GearFailureKind`: `timeout`, `unavailable`, `rejected` (`400`), `unusable`, `no-session`, plus a not-found outcome for `PUT` and `DELETE` (`404`).

## 18. Empty, Loading, and Error States

| State | Condition | Behaviour |
|---|---|---|
| Loading | The list has no data yet | Card skeletons in the grid's geometry; the title block is shown, the summary is not. Never the empty state. No large spinner |
| Empty | The list loaded and has zero items | The collection-styled empty state: a short sentence that the collection is empty, why adding gear helps trip preparation, and **Add your first item**. Optional single calm decorative illustration. No sample or placeholder items, and nothing is seeded on the server |
| Unavailable | The list request failed (`unavailable`, `timeout`, `unusable`) | A clear message that gear could not be loaded, with **Try again**. Never "You own no gear", never zero, never the empty state |
| Refetch failed with data | A later refetch fails while cached items exist | Keep showing the cached items; no destructive change. A quiet notice is optional (section 21) |
| Add failed | `POST` failed | Form stays open, values kept, error on the form, retry possible. `rejected` names the field to change; `timeout` says it took too long |
| Edit failed | `PUT` failed | Stored values stay on screen, typed values kept, error, retry or cancel. `404` → section 13.2 |
| Remove failed | `DELETE` failed | Item stays visible, error near the confirmation, retry possible. `404` → removed |
| No session | `no-session` | No request; FEATURE-002's session handling takes over |

Messages never expose status codes, endpoint names, `GearCategory`, "soft delete", or backend text (PRD §37). Copy is in section 21.

## 19. Security and Privacy

- Gear is private user data. `/gear` is protected in the browser; the real boundary is `user-service`, which authenticates every request and scopes every query by the current user (section 7). Another user's item id returns `404`, which reveals nothing about its existence.
- Q10: `/gear` and the gear API stay authenticated. Nothing about gear is public, shared, or shown on Discover.
- The frontend never sends an owner or user id; it cannot address another user's gear except by an item id, and that is refused.
- Item names and descriptions are user text, rendered as text only (never as HTML). They are not written to the URL, web storage, the document title, or the console, and are not logged by the gear request layer.
- QA reports never contain tokens.
- **Ownership isolation is not changed by this feature.** If any future change touches `GearService` lookups, a backend test must prove that user A cannot read, update, or remove user B's item (P0).

## 20. Accessibility, Responsive, Performance

### 20.1 Accessibility

- The grid is the page's main content; each card is one keyboard-reachable control with an accessible name made of the item name and category. Its selected state is exposed programmatically and visibly not by colour alone.
- Card art is decorative (`alt=""` or `aria-hidden`); the image is never the only way to identify a category.
- The detail panel is related to its card (`aria-controls`/`aria-expanded` or equivalent), labelled by the item name, and keyboard-reachable for Edit and Remove. Escape closes it and focus returns to the originating card. A non-modal panel does not trap focus; any modal (Add Gear, if designed as one, and the remove confirmation, if modal) traps focus correctly and returns it on close.
- The Add Gear category tiles are a labelled single-choice group (each tile has a visible text label), operable by keyboard, with a selected state not shown by colour alone. No icon-only choices.
- Add, edit, and remove outcomes are announced in a polite live region. Errors are tied to their fields.
- DS §18 focus ring on every control; text no smaller than 14px; contrast from DS §9; reduced motion removes every movement.

### 20.2 Responsive

Desktop web first. Acceptance at **1440×900**; quick checks at **1920×1080** and **1024×768**. Below 768px a basic usable grid with the detail panel as a full-width panel or sheet; no mobile-first redesign.

### 20.3 Performance

- `/gear` is its own lazy chunk. It loads no map library, hero or home video, `three`, `@react-three/fiber`, avatar runtime, or GLB, and adds no runtime dependency.
- One `GET` per visit (plus the single automatic retry on failure); each action is one request plus one refetch of the list. No polling.
- Interim art is inline SVG from `lucide-react`; final art is twelve small same-origin WebP files, loaded lazily with fixed dimensions.

## 21. UI/UX Design

All sizes px. Colours are DS §8 tokens; "`ink` 0.12" means `ink` at 12% opacity (the shell's `--trip-ink-12` family). Tiers as 004 §21: **XL** ≥1680, **L** 1440–1679, **M** 1280–1439, **S** 1024–1279; **T** 768–1023 and **N** <768 (best effort, validated to 320). The page is composed at 1440×900 and checked at 1920×1080 and 1024×768.

Design idea in one line: **a warm paper floor with the user's gear laid out on it as slots, and one inspection panel beside it.** The game-like quality comes from the slot plates, the art, and select-to-inspect; nothing else is decorated.

### 21.1 Page surface and composition (A)

| Property | Specification |
|---|---|
| Shell | `TripShell` + `TripHeader` on the solid `ink` base, as Trail Detail (004 §21.1): no scene, backdrop, image, or scrim |
| Scrolling | The **document** scrolls vertically. The header is in flow and scrolls away (004 §21.2). Never horizontal scroll |
| Collection sheet | One `paper` sheet holding everything in `main`: radius 24 (20 on N), no shadow, 1px transparent border (an edge in forced colors), no `overflow: hidden`, no texture or gradient |
| Sheet width | `min(100vw − 2 × gutter, 1600)`, centred. Gutters as the shell (64 / 56 / 40 / 32 / 32 / 16, 12 below 360) |
| Sheet top / bottom | 16 below the header (8 on N); bottom margin 40 (XL, L), 24 (M, S, T), 16 (N) |
| Sheet min-height | `100dvh − header − top − bottom margin`, so the floor never ends mid-screen when the collection is small |
| Sheet padding | 56 (XL), 48 (L), 40 (M), 32 (S, T), 20 (N; 16 below 360) |
| Order inside | Title block (21.2) → notice slot (21.12) → family selector (21.7) → collection row: grid (21.4) + detail panel (21.8) |

Reference boxes (sheet x-extent, top): 1920×1080: 160–1760, 88. 1440×900: 56–1384, 88. 1366×768: 40–1326, 80. 1024×768: 32–992, 80.

### 21.2 Title block (A)

A row: text block at the start, Add Gear at the end, vertically centred on the `h1`'s first line. Below 768 Add Gear moves under the summary, 16 below, full width.

| Part | Specification |
|---|---|
| `h1` MG2 | `ink`, 36/42 (XL, L), 32/38 (M, S, T), 28/34 (N); weight 600; letter-spacing −0.02em. `tabindex="-1"` (a focus target, 21.13), no ring |
| Support line MG3 | 8 below. `stone`, 16/24 (14/20 on N) |
| Summary MG4 | 4 below. `ink`, 14/20, weight 500, tabular numerals. Shown only in the ready state with at least one item (not while loading, empty, or unavailable). No icon, bar, ring, fraction, or percentage |
| Add Gear MG5 | The page's one primary action. `button`, 16px lucide `Plus`, 8, label; fill `conifer`, `snow` 16/24 weight 600 (8.05:1); 44 tall, radius 12, padding 0 20 (Choose this trail geometry, 004 §21.8). Hover `conifer-deep`, active `conifer-press`, 150ms. Opens the Add Gear dialog (21.10). Rendered only in the ready state with items; in the empty state the empty-state action replaces it; in loading and unavailable it is not rendered (it sits at the row's end, so nothing shifts) |
| Spacing below | 24 to the notice slot (when used) or 32 to the selector, or to the grid when there is no selector |

**Header Gear link on `/gear`** (a `TripHeader` change visible only on this route): `aria-current="page"`; a **persistent** 2px `snow` underline at 4px offset (the hover treatment, kept at rest), weight unchanged; hover adds nothing. In the narrow Menu (below 768): the Gear row gets a 3px `ink` bar on its inline-start edge (inset, radius 2) and weight 600. Both cues are shape, not hue. On every other route the link is unchanged.

### 21.3 Collection row

A flex row: the grid (flexible, `min-width: 0`), then, while an item is selected and the viewport is ≥1024, the panel (fixed width, `align-self: start`). Panel closed = no panel element and the grid uses the full width. Below 1024 the panel is never in the row (21.9).

| | XL | L | M | S |
|---|---:|---:|---:|---:|
| Panel width | 400 | 328 | 336 | 320 |
| Gap, grid to panel | 32 | 24 | 24 | 24 |

Amended 2026-10-15 (lead, FEATURE-007 Lean QA AC-27): the L panel was 344. With a classic (always visible) 15px scrollbar, which appears once the page scrolls, the 1440 grid had 847px for 4 columns that need 860 (4 × 200 + 3 × 20), so it fell to 3. At 328 the open grid is 865px wide with a classic scrollbar and 880 without one: 4 columns either way. Track widths below assume the scrollbar is present.

### 21.4 Inventory grid tracks (B, K)

`ul` with `display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min)), 1fr))`. The sheet cap (1600) is what caps card width at large desktop: extra width becomes space beside the sheet, never larger cards.

| Tier | `--card-min` | Grid gap | Reference | Columns, panel closed | Card width | Columns, panel open | Card width |
|---|---:|---:|---|---:|---:|---:|---:|
| XL | 200 | 24 | 1920×1080 | 6 | 228 | 4 | 246 |
| L | 200 | 20 | 1440×900 | **5** | **230** | **4** | **201–205** |
| M | 200 | 20 | 1366×768 | 5 | 225 | 3 | 269 |
| S | 200 | 16 | 1024×768 | 4 | 212 | 2 | 268 |
| T | 168 | 16 | 768×1024 | 3 | 203 | — (sheet, 21.9) | — |
| N | fixed `repeat(2, minmax(0, 1fr))` | 12 | 390×844 / 320 | 2 | 153 / 126 | — | — |

- Cards stay between about 200 and 270 at every desktop width. Row gap equals column gap.
- Opening or closing the panel reflows the grid at once (no animated reflow). If the selected card is then not fully inside the viewport, the page scrolls by the least amount that shows it, instantly.
- At 1440×900 with the panel closed, two full rows (10 cards) are visible on arrival (title block ≈ 102, selector 36, grid top ≈ 326, card ≈ 271).

### 21.5 Item card (C, D)

**Semantics.** Each item is an `li` holding one `button`: no other control inside. Its text content is the name then the category label, so its accessible name is "{name}, {category}" (MG10) — the full name, even when visually clamped. `aria-expanded` is `true` on the selected card and `false` on the others; `aria-controls` points to the panel's id while the panel is rendered. Below 1024 the same attributes apply to the sheet. The art is `aria-hidden="true"`.

**Anatomy** (one column; padding 8):

| Part | Specification |
|---|---|
| Card | Fill `snow`; border 1px `ink` 0.10 drawn as an inset box-shadow (state changes never shift layout); radius 18; `text-align: start`; height follows content; cards in a row stretch to the row's height |
| Plate (art region) | Full card width minus padding, `aspect-ratio: 5 / 4`, radius 10. Contents: 21.6 |
| Name | 12 below the plate, horizontal inset 6. `ink`, 16/22 (14/20 on N), weight 600; at most **2 lines**, then an ellipsis (`line-clamp: 2`); `overflow-wrap: anywhere`. Up to 100 characters: the full name is always in the accessible name and in the panel heading. No tooltip |
| Category | 4 below. `stone`, 14/20, weight 500, one line, ellipsis if it ever overflows. Label from the one label map; "No category" (MG11) for `null`, "Other gear" for unknown |
| Bottom inset | 10 |

Not on a card: Edit, Remove, a menu, a checkbox, a date, a description, a count, an Equipped/Owned/Missing word, a badge.

**States** (colour changes 150ms `--ease-ui`; cursor `pointer`):

| State | Treatment |
|---|---|
| Default | As anatomy |
| Hover (fine pointer) | Border `ink` 0.32 (1px). Nothing moves |
| Focus-visible | DS §18 ring outside the card (gap ≥12 keeps it unclipped; no ancestor clips) |
| Active / pressed | Fill `ink` 0.04 over `snow`; border `ink` 0.32 |
| **Selected** | Border becomes a **2px solid `ink` ring** (inset) and the card fill becomes `paper`, so the slot reads as "pressed in". The ring's thickness and value change carry the state without hue; `aria-expanded="true"` carries it programmatically. No glow, lift, scale, or colour accent. Hover adds nothing; focus adds the outer ring |
| Disabled | Never |
| Forced colors | Border 1px `CanvasText`; selected 3px `CanvasText`; focus via the transparent outline (DS §18) |
| Skeleton (loading) | Same geometry, `aria-hidden`: border `ink` 0.08, no `snow` fill change, plate `ink` 0.06, a name bar 60% × 14 and a category bar 40% × 12, `ink` 0.08, radius 6, 8 apart. Static: no shimmer or pulse |

**Arrival of a newly added card:** opacity 0 → 1 and scale 0.98 → 1, `--duration-base`, `--ease-ui`, once, on that card only. None under reduced motion. Removed cards leave instantly (no exit animation, so focus can move at once).

**Card ↔ panel relationship.** The selected card stays selected and visible beside the open panel; the panel's heading repeats its name exactly. No connector, arrow, or tab joins them: the ring and the matching name do.

### 21.6 Slot plate and interim art (L)

One plate for every category: **no per-family or per-category tint** (any colour coding of slots reads as rarity).

| Property | Specification |
|---|---|
| Plate fill | `gear-plate` `#ECE8DD` (the same value as `map-land`, DS §35.2; proposed as a token, 21.19) with one soft highlight: a radial gradient from `paper` at the centre to `gear-plate` at 70%. No other gradient, texture, or border |
| Art box | A square centred in the plate, side = **72% of the plate's height**. Both tiers draw into this box, so final art replaces interim art with no layout change |
| Interim pictogram | `lucide-react`, centred in the art box at **60% of its side** (card at L ≈ 74px; panel ≈ 96px; Add tile 24px). Stroke `conifer-press` (10.3:1 on `gear-plate`), `absoluteStrokeWidth`, stroke width 2 on cards and tiles, 2.5 in the panel. Line only: no fill, no second colour |
| Final art (§14.3) | `<img>` filling the art box, `alt=""`, `width`/`height` set, `loading="lazy"`, `decoding="async"`, `object-fit: contain`. Transparent 1:1 WebP sits on the plate. On load error the interim pictogram is shown (the manifest keeps both) |
| Forced colors | Plate fill removed; pictogram `CanvasText` |

Interim mapping, checked for misleading meaning:

| Category | Pictogram | Verdict |
|---|---|---|
| `BACKPACK` | `backpack` | Exact |
| `RAIN_GEAR` | `cloud-rain` | Kept. Reads as "for rain", which is what the label says; no forecast appears on this page to confuse it with |
| `WARM_LAYER` | `shirt` | Kept as "a garment"; a tee is not warm, so the final art must be a fleece or insulated jacket |
| `WIND_LAYER` | `wind` | Kept, as rain gear |
| `FOOTWEAR` | `footprints` | Kept (lucide has no boot); final art: a hiking boot |
| `TRACTION` | `snowflake` | Kept. Traction is for snow and ice; because Warm layer uses a garment, not a cold symbol, the snowflake means only "snow and ice" on this page |
| `TREKKING_POLES` | `hiking-stick` | Exact enough |
| `HEADLAMP` | `flashlight` | Kept as "a light"; final art must be a headlamp |
| `WATER` | `glass-water` | Kept: instantly "water"; final art: a bottle |
| `FOOD` | `sandwich` | Exact enough |
| `SUN_PROTECTION` | `sun` | Kept: "protection from sun", not a hat (§14.2) |
| none / unknown | **`package`** | A neutral "an item". **`circle-dashed` is rejected**: the Studio uses it to mean Missing (005 §16.8) |

All twelve names exist in the installed `lucide-react` (checked in `node_modules/lucide-react/dist/esm/icons/`).

### 21.7 Family selector (K)

| Property | Specification |
|---|---|
| Control | A `fieldset` with a visually hidden `legend` MG8 holding native `<input type="radio">`s, one per option, each inside its `label`. Single choice is exactly radio semantics; the group is one tab stop, arrow keys move and choose (filtering is instant and non-destructive, so selection-follows-focus is acceptable). Not ARIA tabs: it filters one grid, it does not switch panels |
| Options | MG9: All, then non-empty families in §11.4 order. Rendered only when the items span ≥2 families. No counts |
| Placement | A left-aligned row under the title block; 8 between pills; wraps on narrow widths (8 row gap) |
| Pill | The radio is visually hidden; the label is the pill: 36 tall (44 on a coarse pointer), padding 0 16, radius 9999, 14/20 weight 600 |
| Unchosen | No fill, 1px `ink` 0.16 border, `ink` text. Hover: fill `ink` 0.06. Active: fill `ink` 0.10 |
| Chosen | Solid `ink` fill, `snow` text (17.48:1). Outline → solid is a value and shape change, not a hue. Forced colors: 3px border |
| Focus-visible | DS §18 ring on the pill (`label:has(:focus-visible)`) |
| Behaviour | As §11.4. Choosing a family that hides the selected item closes the panel; focus stays on the radio |

### 21.8 Item detail panel, ≥1024 (E)

**Container decision: a non-modal side panel in layout flow** beside the grid (21.3). It hides no cards, traps nothing, and leaves the page operable.

| Property | Specification |
|---|---|
| Element | `section` `aria-labelledby` its heading, id referenced by the cards' `aria-controls`. In the DOM directly after the grid's `ul` |
| Surface | Fill `snow`, 1px `ink` 0.12 border, radius 20, padding 24 (28 at XL). No shadow, blur, or translucency |
| Sticky | `position: sticky; top: 24`, so it stays in view while the grid scrolls the page. `max-height: calc(100dvh − 48)`; when taller, the panel scrolls internally (`overflow-y: auto`, overscroll handed to the page) |
| Art | Plate (21.6) at the panel's content width, `aspect-ratio: 4 / 3`, radius 12. Decorative |
| Name | 20 below the art. `h2`, `ink`, 22/28 (24/30 at XL), weight 600, wraps fully, `overflow-wrap: anywhere`, never truncated, rendered as text. `tabindex="-1"`, no ring |
| Category | 6 below. `stone` 14/20 weight 500, after visually hidden MG12 |
| Description | Only when non-empty. 16 below. `ink` 16/24, `white-space: pre-line`, `overflow-wrap: anywhere`, text node only |
| Context lines | 16 below. `stone` 14/20, 4 apart: MG13 "Added {date}" (omitted when `createdAt` cannot be read), then MG14. Nothing else: no stats, no recommendation, no Equipped state |
| Actions | 24 below, after a 1px `ink` 0.12 rule with 20 below it. A wrapping row, 8 apart: **Edit** MG15 (secondary button on paper, 004 §21.17: no fill, 1px `stone` border, `ink` 14/20 600, 16px `Pencil`, 40 tall / 44 coarse, radius 10, padding 0 14); **Remove from My Gear** MG16 (a quiet destructive text button: no border, `ink` 14/20 600, 16px `Trash2` in `ember` (4.4:1 on `snow`, an icon), 40 tall, padding 0 10, radius 10; hover underline + fill `ink` 0.04; active `ink` 0.08) |
| Close | MG17. Icon action (DS §14): circle 36 (44 coarse), 18px `X` in `ink`, fill `snow`, 1px `ink` 0.12 border; hover fill `paper`; active `ink` 0.08. Positioned top-right, 12 from the panel edges (over the plate's corner). **Last in the DOM** (DS §35.4), so Tab runs heading → Edit → Remove → Close |

Behaviour:

| Event | Result | Focus |
|---|---|---|
| Activate a card (no panel) | Panel opens with that item; card selected | **Moves to the panel heading** (`preventScroll: true`) |
| Activate another card | Panel content switches in place (no animation); selection moves | Moves to the panel heading |
| Activate the selected card | Panel closes | Stays on that card |
| Close, or Escape while focus is in the panel or on any card | Panel closes | The originating card |
| Choose a family that hides the item | Panel closes | Stays on the radio |
| Item removed here | 21.11 | 21.11 |
| Item vanishes on refetch | Panel closes; MG42 in the notice slot | If focus was in the panel: the `h1`; otherwise unchanged |

Why focus moves to the heading: the panel is beside the grid but after the whole grid in the DOM, so without the move a keyboard or screen-reader user would traverse every following card to reach Edit or Remove. Opening is an explicit activation, so arriving at the result is expected; the heading is read first, then the panel in order. It is non-modal: nothing is trapped, Shift+Tab leaves it, and Escape or Close always returns to the card. The card grid itself already shows name and category, so browsing does not require opening the panel.

### 21.9 Item detail below 1024 (E)

The panel content becomes a **modal bottom sheet** (native `<dialog>` with `showModal()`), because beside the grid there is no room and an in-flow panel would appear far from the tapped card.

| Property | Specification |
|---|---|
| Geometry | Anchored to the bottom edge. T: `min(560, 100vw − 32)` wide, centred; N: full width. Radius 20 20 0 0. `max-height: 85dvh`; content scrolls inside. Padding 24 (20 on N) plus `env(safe-area-inset-bottom)` |
| Content | As 21.8; plate `aspect-ratio: 16 / 9`, max-height 180 |
| Backdrop | `ink` 0.40. A tap on it closes the sheet (it is a viewer, nothing is lost) |
| Focus | On open, the heading. Trapped by the native modal. Escape (native `cancel`) and Close return focus to the card |
| Edit from the sheet | Opens the form dialog (21.10) above the sheet; on its close, focus returns to Edit |

### 21.10 Add Gear and Edit Gear dialog (F, G, H)

**Container decision: one modal dialog, native `<dialog>` + `showModal()`, shared by Add and Edit.** Reason: Add is a short, self-contained task whose category picker needs width that the side panel (≤400) cannot give without cramming; a modal keeps the collection stable behind it, gives a native focus trap and Escape, and behaves the same at every width. Edit reuses the same form so the two can never drift; the panel stays visible behind on desktop as context.

| Property | Specification |
|---|---|
| Surface | `paper`, radius 20, no border, one shadow `0 8px 32px rgb(11 28 32 / 0.24)`. Width 560 (≥768); padding 32. N: a bottom sheet, full width, radius 20 20 0 0, padding 20, `max-height: 92dvh`, internal scroll |
| Backdrop | `ink` 0.40. Clicking it does **nothing** (no accidental loss of typed text). Page scroll is locked while open |
| Header | `h2` MG18 (Add) or MG19 (Edit), `ink` 22/28 weight 600, the dialog's `aria-labelledby`. Close icon action (21.8 recipe) at the end of the header row, name MG17 |
| Field 1: Category | 24 below. 21.10.1 |
| Field 2: Item name | 24 below. Visible `label` MG22, `ink` 14/20 weight 600; 6; input 44 tall, fill `snow`, 1px `stone` border, radius 10, padding 0 12, `ink` 16/24, `maxlength="100"`, `autocomplete="off"`, no placeholder. 6 below: helper MG23 (`stone` 14/20) at the start and, from 80 characters, the counter MG24 at the end (tabular). Helper and counter are the input's `aria-describedby` |
| Request error | 20 above the actions: 16px `CircleAlert` `ember`, 8, sentence `ink` 14/20 weight 500, `role="alert"` |
| Actions | 28 below the name. End-aligned row: **Cancel** MG20 (secondary button on paper), 8, submit **Add to My Gear** MG25 or **Save changes** MG27 (fill `conifer`, `snow` 14/20 weight 600, 40 tall / 44 coarse, radius 10, padding 0 16). N: both full width, submit first (top) |
| Field error | Replaces the helper: 16px `CircleAlert` `ember`, 8, sentence `ink` 14/20 weight 500; input border 2px `ember`; `aria-invalid="true"` |

Estimated height at ≥768: about 560, which fits 1366×768 and 1024×768 without internal scroll.

#### 21.10.1 Category picker

| Property | Specification |
|---|---|
| Semantics | `fieldset`, visible `legend` MG21 (`ink` 14/20 weight 600), helper MG26 under it (Add, or Edit with no known category). Eleven native radios, one per known category, each tile its `label`. **No "No category" tile**: a category is required (§8.2, §13). One tab stop; arrows move and choose |
| Order | **By family**, matching the selector: Backpack · Rain gear, Warm layer, Wind layer · Hiking footwear, Traction · Trekking poles, Headlamp · Water, Food, Sun protection. Families sit adjacent; no family subheads (they would add ~140px) |
| Layout | 3 columns (2 on N, 1 below 360), 8 gap, rows of 3-3-3-2 → about 232 tall |
| Tile | Horizontal: a 40×40 plate (21.6, radius 8, pictogram 24) then 10, the label `ink` 14/20 weight 500, up to 2 lines. Min-height 52 (56 coarse), padding 6 10 6 6, fill `snow`, 1px `ink` 0.16 inset border, radius 12 |
| Hover / active | Border `ink` 0.32 / fill `ink` 0.04 |
| Selected | 2px `ink` inset ring, label weight 600, and a 16px `CircleCheck` in `ink` at the tile's end (space reserved, so nothing shifts). Ring + mark: not colour-only |
| Focus-visible | DS §18 ring on the tile |
| Invalid (submit with none) | MG30 under the legend in the field-error style; tiles unchanged; `aria-describedby` on the fieldset; focus to the first tile |
| Edit start | The item's category checked; `null` or unknown: none checked, MG26 shown |

#### 21.10.2 Events

| Event | Behaviour | Focus |
|---|---|---|
| Open Add (Add Gear or MG47) | Empty form | First category tile (none checked) |
| Open Edit | Current name and category (21.10.1) | Name input, caret at end; but the **category group** when no known category is set (that is what needs attention) |
| Submit, invalid | Field errors (MG30, MG31, MG32); no request | First invalid field |
| Submit, valid | Saving: submit shows spinning `LoaderCircle` + MG29 (Add) or MG28 (Edit), `aria-disabled="true"`, cursor `progress`; name read-only; radios ignore changes (`aria-disabled` on the fieldset); Cancel and Close `aria-disabled`; Escape ignored. A second press sends nothing | Stays on submit |
| Add success | Dialog closes; card arrives first (21.5); family resets to All if it would hide it; announce MG40. **Not selected** (lead default kept: adding several items in a row stays one press each) | The opener; if the opener no longer exists (empty-state action), the new card |
| Edit success | Dialog closes; panel and card show the response; if the new category is outside the chosen family, the family resets to All so the item stays visible and selected; announce MG41 | Edit in the panel |
| Failure | Request error (MG33–MG37); values kept; editable again | Stays on submit |
| Edit `404` | Dialog and panel close; MG42 in the notice slot; list refetched | The `h1` |
| Cancel, Close, Escape | Closes; typed values discarded without asking | The opener |

### 21.11 Remove confirmation (I)

**Decision: inline, inside the panel (or sheet)**, replacing the action row. It is small, keeps the item's art and name in view, and avoids a modal over a non-modal panel.

| Part | Specification |
|---|---|
| Container | `role="group"` `aria-labelledby` the question; same place as the action row, no new surface |
| Question MG43 | `ink` 16/24 weight 600, wraps, the name in curly quotes as text |
| Body MG44 | 4 below, `stone` 14/20 |
| Actions | 16 below: **Cancel** MG20 (secondary on paper), 8, **Remove** MG45: fill `ember`, `snow` 14/20 weight 600 (4.8:1), 16px `Trash2`, 40 tall / 44 coarse, radius 10, padding 0 16; hover `ember` mixed 12% toward `ink`, active 24% |
| Open | Focus moves to **Cancel** (the safe default) |
| Cancel / Escape | Action row returns; focus to Remove from My Gear |
| Removing | Remove shows `LoaderCircle` + MG46, `aria-disabled`; Cancel `aria-disabled`; Escape ignored |
| Success (`204` or `404`) | Card leaves; panel closes; announce MG39. **Focus:** the card now at the removed card's position in the visible grid, else the previous card; if the family became empty it resets to All and the same rule applies to All; if the collection is empty, the empty-state heading (`tabindex="-1"`) |
| Failure | Error line (MG38) above the actions, `role="alert"`; the confirmation stays; **Remove** retries. Item stays visible and selected |

### 21.12 Screen states (J)

| State | Collection area | Title block |
|---|---|---|
| Loading | 10 skeleton cards (21.5) in the grid tracks; the `ul` region `aria-busy="true"`; visually hidden status MG52. Never the empty state, never a large spinner | `h1` + support; no summary, no Add Gear, no selector |
| Empty | Replaces the grid. Centred column, max-width 480, 48 top padding: decorative trio of **empty slots** (three 72×72 squares, 12 apart, 1.5px dashed `ink` 0.24 border, radius 12, no fill, nothing inside, `aria-hidden`); 24; `h2` MG48 `ink` 22/28 600, `tabindex="-1"`; 8; MG49 `stone` 16/24; 24; **Add your first item** MG47 (Add Gear recipe). No sample items | `h1` + support only |
| Unavailable | Same column, no art: `h2` MG50, `ink` 22/28 600; 8; MG51 `stone` 16/24; 24; **Try again** MG53 (secondary on paper, `RotateCw` 16; working: `LoaderCircle` + MG54, `aria-disabled`). Never "no gear", never zero | `h1` + support only |
| Refetch failed, data cached | Cached items stay; **nothing is shown** (the list refetches on every visit and every write already reflects the server's answer) | Unchanged |
| Notice slot | Under the title block, `role="status"`, takes no space when empty: 16px `Info` `stone`, 8, text `ink` 14/20. Holds MG42 only. Cleared when the user next selects a card or opens Add Gear | — |
| Per-action errors | In their form or confirmation (21.10, 21.11) | — |

### 21.13 Motion

| Element | Default | Reduced motion |
|---|---|---|
| Panel open | Opacity 0 → 1 and 4px slide from the right, `--duration-base` | Instant |
| Panel switch, close | Instant | Instant |
| Card arrival | 21.5 | None |
| Dialog / sheet open | Opacity and a 4px rise, `--duration-base`; backdrop opacity `--duration-fast` | Instant |
| Dialog / sheet close, card removal, grid reflow | Instant | Instant |
| Hover, press, selection | Colour only, `--duration-fast` | Kept |
| `LoaderCircle` | Spins (900ms) | Static; text still shows |

Nothing loops or moves by itself; no Pause control is needed.

### 21.14 Wireframes

1440×900, panel closed:

```text
┌─ ink ──────────────────────────────────────────────────────────────────────────────┐
│ Outdoor Trip Companion                                Gear   {Account} (Sign out)  │ 72
│                                                       ‾‾‾‾ current                 │
│ ┌─ paper sheet  x 56–1384 · top 88 · padding 48 ───────────────────────────────┐   │
│ │ My Gear                                                     [ + Add Gear ]   │   │
│ │ Everything you own for your adventures.                                      │   │
│ │ 12 items across 6 categories                                                 │   │
│ │                                                                              │   │
│ │ (█All█) ( Packs ) ( Layers ) ( Footwear ) ( Tools ) ( Essentials )           │   │
│ │                                                                              │   │
│ │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   5 × 230, gap 20     │   │
│ │ │░░░░░░░░│ │░░░░░░░░│ │░░░░░░░░│ │░░░░░░░░│ │░░░░░░░░│   plate 5:4          │   │
│ │ │░░(ico)░│ │░░(ico)░│ │   …    │ │   …    │ │   …    │                      │   │
│ │ │░░░░░░░░│ │░░░░░░░░│ │        │ │        │ │        │                      │   │
│ │ │Talon 22│ │Hiking  │ │        │ │        │ │        │                      │   │
│ │ │Backpack│ │Boots   │ │        │ │        │ │        │                      │   │
│ │ └────────┘ │Hiking f│ └────────┘ └────────┘ └────────┘                      │   │
│ │            └────────┘                                                        │   │
│ │ ┌ row 2: five more cards, fully visible ┐                                    │   │
```

1440×900, panel open (grid 4 × ~201, panel 328, sticky 24 from the top):

```text
│ ┌─ paper sheet ─────────────────────────────────────────────────────────────────┐ │
│ │ My Gear …                                                   [ + Add Gear ]    │ │
│ │ (█All█) ( Packs ) ( Layers ) …                                                │ │
│ │ ┌──────┐ ┏━━━━━━┓ ┌──────┐ ┌──────┐   ┌─ panel (snow, r20) ───────────(×)┐  │ │
│ │ │░░░░░░│ ┃░░░░░░┃ │░░░░░░│ │░░░░░░│   │ ┌──────────────────────────────┐ │  │ │
│ │ │Name  │ ┃Talon ┃ │Name  │ │Name  │   │ │░░░░░░░░ plate 4:3 ░░░░░░░░░░░│ │  │ │
│ │ │Categ.│ ┃Backp.┃ │Categ.│ │Categ.│   │ │░░░░░░░░  (backpack)  ░░░░░░░░│ │  │ │
│ │ └──────┘ ┗━━━━━━┛ └──────┘ └──────┘   │ └──────────────────────────────┘ │  │ │
│ │  selected = 2px ink ring, paper fill  │ Talon 22                    (h2) │  │ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │ Backpack                         │  │ │
│ │ │ …    │ │ …    │ │ …    │ │ …    │   │ Added Oct 12, 2026               │  │ │
│ │                                       │ Gear you own can be equipped …   │  │ │
│ │                                       │ ──────────────────────────────── │  │ │
│ │                                       │ [✎ Edit]  🗑 Remove from My Gear │  │ │
│ │                                       └──────────────────────────────────┘  │ │
```

Add Gear dialog (560 wide):

```text
┌─ Add Gear ─────────────────────────────────────── (×) ┐
│ Category                                              │
│ Choose the kind of gear it is.                        │
│ [▣ Backpack    ] [▣ Rain gear   ] [▣ Warm layer   ]   │
│ [▣ Wind layer  ] [▣ Hiking      ] [▣ Traction     ]   │
│                  [  footwear    ]                     │
│ [▣ Trekking    ] [▣ Headlamp    ] [▣ Water       ✓]   │ ← selected: ring + check
│ [  poles       ]                                      │
│ [▣ Food        ] [▣ Sun         ]                     │
│                  [  protection  ]                     │
│                                                       │
│ Item name                                             │
│ [_________________________________________________]   │
│ The name you know it by.                  87 of 100   │
│                                                       │
│                       ( Cancel )  [ Add to My Gear ]  │
└───────────────────────────────────────────────────────┘
```

N, 390 wide (detail as a bottom sheet):

```text
┌ Outdoor Trip            (☰) ┐
│┌─ paper ──────────────────┐ │
││ My Gear                  │ │
││ Everything you own …     │ │
││ 5 items across 3 cat…    │ │
││ [ + Add Gear  (full) ]   │ │
││ (All)(Packs)(Layers)     │ │
││ (Footwear)               │ │
││ ┌─────────┐ ┌─────────┐  │ │
││ │░(ico)░░░│ │░(ico)░░░│  │ │  2 × 153, gap 12
││ │Talon 22 │ │Shell    │  │ │
││ │Backpack │ │Rain gear│  │ │
│▓▓▓▓▓▓ backdrop ink 0.40 ▓▓▓▓│
│╭─ sheet ─────────────── (×)╮│
││ ░░░ plate 16:9 ░░░         ││
││ Talon 22 · Backpack        ││
││ [Edit] Remove from My Gear ││
╰────────────────────────────╯
```

### 21.15 Copy deck

User text only; never a status code, endpoint, "GearCategory", "soft delete", or backend text. Curly quotes and the ellipsis character as written.

| Id | Where | Text |
|---|---|---|
| MG1 | Document title | My Gear · Outdoor Trip Companion |
| MG2 | `h1` | My Gear |
| MG3 | Support line | Everything you own for your adventures. |
| MG4 | Summary (known categories only) | n≥2, c≥2: "{n} items across {c} categories" · n≥2, c=1: "{n} items in 1 category" · n=1, c=1: "1 item in 1 category" · c=0: "{n} items" / "1 item" |
| MG5 | Primary action | Add Gear |
| MG6 | Grid heading (visually hidden `h2`) | Your gear |
| MG7 | Header link (unchanged label) | Gear |
| MG8 | Selector legend (hidden) | Show |
| MG9 | Families | All · Packs · Layers · Footwear · Tools · Essentials |
| MG10 | Card name pattern | {name}, {category label} |
| MG11 | Null category label | No category |
| MG12 | Panel, before the category (hidden) | Category: |
| MG13 | Panel context | Added {Mon D, YYYY} — e.g. "Added Oct 12, 2026" |
| MG14 | Panel context | Gear you own can be equipped when you prepare a trip. |
| MG15 | Panel action | Edit |
| MG16 | Panel action | Remove from My Gear |
| MG17 | Close (panel, sheet, dialog; accessible name) | Close |
| MG18 | Dialog title, add | Add Gear |
| MG19 | Dialog title, edit | Edit Gear |
| MG20 | Cancel | Cancel |
| MG21 | Category legend | Category |
| MG22 | Name label | Item name |
| MG23 | Name helper | The name you know it by. |
| MG24 | Counter (from 80) | {n} of 100 |
| MG25 | Submit, add | Add to My Gear |
| MG26 | Category helper (add; edit with no known category) | Choose the kind of gear it is. |
| MG27 | Submit, edit | Save changes |
| MG28 | Saving, edit | Saving… |
| MG29 | Saving, add | Adding… |
| MG30 | Error, no category | Choose a category. |
| MG31 | Error, empty name | Enter a name for this item. |
| MG32 | Error, name too long | Use 100 characters or fewer. |
| MG33 | Add failed, timeout | This took too long, and your item wasn't added. Try again. |
| MG34 | Add failed, unavailable / unusable | Your item couldn't be added right now. Try again. |
| MG35 | Not used | Reserved, no text. A failed response's body is never read (005 G7), so a `400` cannot name a field; every rejected add or edit shows MG36 |
| MG36 | Add or edit, rejected (`400`) | This couldn't be saved. Check the name and category, then try again. |
| MG37 | Edit failed, timeout / unavailable | timeout: "This took too long, and your changes weren't saved. Try again." · other: "Your changes couldn't be saved right now. Try again." |
| MG38 | Remove failed | timeout: "This took too long. The item is still in My Gear. Try again." · other: "The item couldn't be removed right now. Try again." |
| MG39 | Announce, remove | Removed {name} from My Gear. |
| MG40 | Announce, add | Added {name} to My Gear. |
| MG41 | Announce, edit | Saved changes to {name}. |
| MG42 | Notice (edit `404`; item gone on refetch) | This item is no longer in My Gear. |
| MG43 | Remove question | Remove “{name}” from My Gear? |
| MG44 | Remove body | You can add it again later if needed. |
| MG45 | Remove confirm | Remove |
| MG46 | Removing | Removing… |
| MG47 | Empty action | Add your first item |
| MG48 | Empty title | Your gear collection is empty. |
| MG49 | Empty body | Add the gear you already own so trip preparation can tell you what's ready and what's missing. |
| MG50 | Unavailable title | We couldn't load your gear. |
| MG51 | Unavailable body | Nothing in My Gear has changed. Try again in a moment. |
| MG52 | Loading status (hidden) | Loading your gear… |
| MG53 | Retry | Try again |
| MG54 | Retry working | Trying again… |

"No session" shows no MG text (FEATURE-002 takes over). Names inside MG39–MG43 are the user's text, rendered as text.

### 21.16 Interaction states summary

| Element | Hover | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|
| Add Gear, Add your first item, dialog submit | `conifer-deep` | DS §18 ring | `conifer-press` | Never | Submit only: 21.10.2 |
| Card | 21.5 | Ring | 21.5 | Never | Skeleton |
| Family pill | `ink` 0.06 fill | Ring | `ink` 0.10 | Never | — |
| Edit, Cancel, Try again (secondary on paper) | `ink` 0.06 | Ring | `ink` 0.10 | `aria-disabled` while saving | Try again: 21.12 |
| Remove from My Gear (text) | Underline + `ink` 0.04 | Ring | `ink` 0.08 | Never | — |
| Remove (confirm) | 21.11 | Ring | 21.11 | — | MG46 |
| Close (circle) | 21.8 | Ring | `ink` 0.08 | `aria-disabled` while saving | — |
| Category tile | 21.10.1 | Ring | `ink` 0.04 | `aria-disabled` while saving | — |
| Name input | Border `ink` | Ring | — | Read-only while saving | — |

Hover never reveals an action: every control is visible and labelled at rest; touch works identically.

### 21.17 Focus map

| Situation | Focus goes to |
|---|---|
| Page arrival | Browser default (no programmatic move) |
| Panel opened or switched | Panel heading |
| Panel closed (Close, Escape) | The originating card |
| Selected card activated again | Stays on the card |
| Item removed | 21.11 success rule |
| Item gone (edit `404`, or refetch while focus was in the panel) | `h1` |
| Add / Edit dialog opened, closed, saved | 21.10.2 |
| Remove confirmation opened / cancelled | Cancel / Remove from My Gear |
| Collection becomes empty | Empty-state heading |

### 21.18 Accessibility checklist

1. Grid is a `ul` of `li`s, each with exactly one `button`; name "{name}, {category}"; `aria-expanded` + `aria-controls`; art `aria-hidden`.
2. Selection visible by a 2px ring and fill value change, never hue alone; forced colors keep it (3px `CanvasText`).
3. Panel: `section` labelled by its `h2`; non-modal, no trap; focus to heading on open; Escape and Close return to the card; Close last in DOM.
4. Below 1024 the sheet and the form dialog are native modal dialogs: trapped, Escape closes (except while saving), focus returns per 21.17, `aria-labelledby` their title.
5. Family selector: `fieldset` + hidden `legend` + native radios; one tab stop; chosen state not by hue.
6. Category picker: `fieldset` + visible `legend`; 11 labelled radio tiles; selected = ring + `CircleCheck`; no icon-only choice.
7. Every field has a visible label; helper and errors linked with `aria-describedby`; `aria-invalid` on error; focus to the first invalid field.
8. One polite live region on the page announces MG39–MG41; request errors use `role="alert"`; the notice slot is `role="status"`; family changes and loading completion are not announced.
9. All text ≥14px; pairs in use: `ink`/`paper` 16.04, `ink`/`snow` ~17.5, `stone`/`paper` 5.92, `stone`/`snow` ~6.4, `snow`/`conifer` 8.05, `snow`/`ink` 17.48, `snow`/`ember` ~4.8 (14px weight 600, confirm button only), `conifer-press`/`gear-plate` ~10.3 (graphic). `ember` is never text on `paper` or `snow` (4.4:1): icons and borders only.
10. Touch: every control ≥44 on a coarse pointer; cards and tiles exceed it.
11. Reduced motion removes every movement (21.13); layout and function identical.
12. Item names never appear in the document title, URL, or console; rendered as text nodes only.

### 21.19 Design-system additions for closeout

For the lead to apply to `docs/DESIGN_SYSTEM.md` after acceptance (DS §32 lists Gear and dialogs as undefined):

1. **Token `gear-plate` `#ECE8DD`** (same value as `map-land`) for slot plates; pair `conifer-press` on `gear-plate` ≈10.3:1 (graphics).
2. **Contrast pair** `snow` on `ember` ≈4.8:1, allowed for a 14px weight-600 label on a destructive confirm button only; `ember` on `paper`/`snow` ≈4.4:1 is icon/border only.
3. **Destructive actions:** a two-step pattern — a quiet text button with an `ember` icon, then an inline confirmation whose confirm button is `ember`-filled. No large danger modal; initial focus on Cancel.
4. **Modal dialog / bottom sheet:** native `<dialog>` + `showModal()`; `paper`, radius 20, one shadow `0 8px 32px rgb(11 28 32 / 0.24)`, backdrop `ink` 0.40, no blur; bottom sheet below 768 (radius 20 20 0 0); opacity + 4px rise in, instant out; forms ignore backdrop clicks, viewers close on them.
5. **Selectable card / tile:** selected = 2px inset `ink` ring (+ a check mark where the choice is a form value); hover `ink` 0.32 border; never glow or colour accent.
6. **Filter pills as a radio group:** outline → solid `ink` when chosen; 36 tall (44 coarse).
7. **Current-page navigation:** `aria-current="page"` + persistent 2px underline on `ink` headers; a 3px inline-start bar in `paper` menus.
8. **Collection surface:** a `paper` sheet on `ink`, capped at 1600 wide, as the pattern for authenticated collection pages (FEATURE-008 may reuse it).

### 21.20 Notes for the lead

1. **Narrow detail is modal.** Below 1024 the item detail is a modal bottom sheet, not an in-flow panel (§20.2 allows "panel or sheet"; §20.1 allows modals that trap correctly). Desktop stays non-modal as §12 implies.
2. **Edit can move an item out of the chosen family.** §11.4 does not cover it; 21.10.2 resets the selector to All so the edited item stays visible and selected. Please encode in section 22.
3. **Add Gear visibility.** §10 calls Add Gear the page's one primary action; this design hides it in loading and unavailable and replaces it with MG47 in the empty state, so there is never a second `conifer` action or an Add during an unknown list.
4. **Refetch failure with cached data shows nothing** (§18 allowed "quiet or nothing").
5. **Picker order differs from the Studio's `select`** (family order here, enum order in 005 §16.10). Intentional; FEATURE-005 is untouched.
6. **Interim pictograms:** the §14.2 mapping is kept; the neutral mark is `package`; `circle-dashed` is ruled out because it means Missing in the Studio. `shirt`, `footprints`, `flashlight`, and `glass-water` are approximations that the final art (§14.3) must resolve (fleece/jacket, boot, headlamp, bottle).
7. **Header change touches shared code** (`TripHeader` and `trip-shell.css`): the current-page treatment must appear only when the route is `/gear`; Trail Detail, Trip Preparation, and the Studio must look unchanged.

## 22. Acceptance Criteria

38 criteria: **16 P0**, **15 P1**, **7 P2**. "Live" means checked in a browser against the running services with a real signed-in user. Item names in reports are the tester's own test data; no token appears in any report.

### 22.1 Criteria

| Id | P | Criterion |
|---|---|---|
| AC-01 | P0 | **Live.** Signed out, opening `/gear` shows `/` with the sign-in gate and makes no gear request; after signing in from that gate the user lands on `/gear`. A gear request without a token is refused with `401` (§9, §19). |
| AC-02 | P0 | **Live.** The **Gear** link in the Authenticated Home header and in the trip header opens `/gear` in the trip shell (`ink` base, trip header, `paper` collection sheet), not in `AppLayout`. The link has `aria-current="page"` and the persistent underline on `/gear` only. The page sends one `GET /api/users/me/gear` with `Authorization: Bearer` and no other API request (§9, §21.1, §21.2). |
| AC-03 | P0 | **Live.** Until the list arrives the grid shows static skeleton cards; the empty state, a zero, the summary, and Add Gear are never shown during loading, and there is no large spinner (§18, §21.12). |
| AC-04 | P0 | **Live.** With items, the page shows MG2, MG3, the MG4 summary with correct counts and singular forms, Add Gear, and a grid of cards in the server's order (newest first). Each card shows the category art, the name, and the category label, and nothing else: no Edit, Remove, menu, badge, count, or Owned/Equipped/Missing word. There is no table, list view, search, or sort (§10, §11, §21.5). |
| AC-05 | P0 | **Live.** Add Gear opens the dialog (MG18). Choosing a category tile and entering a name, then **Add to My Gear**, sends one `POST /api/users/me/gear` whose body is exactly `{ name: <trimmed>, category: <wire value> }`. On `201` the dialog closes, the new card appears first with the restrained arrival, MG40 is announced, the list is requested again, and the new item is not selected (§13.1, §21.10). |
| AC-06 | P0 | **Live.** Adding a second item of a category already owned (for example a second Backpack, even with the same name as the first) succeeds, and both appear as separate cards (§8.4, Q1). |
| AC-07 | P0 | **Live.** Activating a card opens the detail panel beside the grid with no route, search-parameter, or history change: name heading, larger art, category, MG14, Edit, Remove from My Gear, Close. The card is visibly selected (`aria-expanded="true"`). Activating another card switches the panel; Close or Escape closes it and focus returns to the originating card (§12, §21.8). |
| AC-08 | P0 | **Live.** Edit opens the dialog (MG19) with the item's name and category. Changing the name and **Save changes** sends one `PUT /api/users/me/gear/{id}` whose body is `{ name, category, description }` with the item's current `description` unchanged (`null` when it has none). On `200` the card and panel show the new name, MG41 is announced, and a reload shows the change (§13.2, §8.3). |
| AC-09 | P0 | **Live.** Remove from My Gear replaces the panel's actions with the inline confirmation (MG43, MG44, Cancel, Remove), with focus on Cancel; Cancel restores the actions. Remove sends one `DELETE /api/users/me/gear/{id}`; on `204` the card leaves, the panel closes, MG39 is announced, and focus follows §21.11. After a reload the item is still gone (§13.3, §21.11). |
| AC-10 | P0 | **Live.** A user with no items sees the empty state (MG48, MG49, **Add your first item**) and no grid, summary, selector, Add Gear, sample, or placeholder items. **Add your first item** opens the Add dialog; after adding, the grid replaces the empty state (§18, §21.12). |
| AC-11 | P0 | **Live.** When the list request fails (for example `user-service` stopped), the page shows MG50, MG51, and **Try again**, never the empty state, a zero, or "no gear". Try again requests the list again and, once the service is back, shows the items (§18). |
| AC-12 | P0 | **Live.** An item added in My Gear in a category that a trip's pack recommends is listed as Owned (not Equipped) in that trip's Gear Studio, and the category is no longer Missing in Trip Preparation (§15.1). |
| AC-13 | P0 | **Live.** An item added through the Gear Studio's Add gear appears in My Gear on the next visit to `/gear`, with its name and category (§15.1). |
| AC-14 | P0 | **Live.** An item equipped in the Studio for a trip and then removed in My Gear is, when that trip's Studio is opened again, neither listed as Owned nor Equipped nor shown on the avatar; if it was the only item of a recommended category, that row is Missing. No error appears (§15.3). |
| AC-15 | P0 | **Live.** During the journey the console shows no uncaught error or React error, and every gear request returns its expected status (`200`, `201`, `200`, `204`) (§7). |
| AC-16 | P0 | `npm run build` and `npm run lint` pass. `package.json` has no new dependency; `vite.config.ts` is unchanged; nothing under `Project/Backend/`, `features/loadout/`, `features/avatar/`, or `features/discover/` changed (§24.2). |
| AC-17 | P1 | **Live.** Editing an item's category (via the tile picker) changes its card's art and label and the MG4 category count; a reload keeps it (§13.2, Q3). |
| AC-18 | P1 | **Live.** When an add fails, the dialog stays open with the category and name kept and the matching message (MG33, MG34, or MG36); retrying succeeds. While saving, a second activation sends nothing and Escape does not close the dialog (§13.1, §21.10.2). |
| AC-19 | P1 | **Live.** When an edit fails, the card and panel still show the stored values (no false success), the dialog keeps the typed values with MG37, and Cancel leaves the item unchanged (§13.2). |
| AC-20 | P1 | **Live.** When a remove fails, the item stays visible and selected with MG38 in the confirmation, and Remove retries (§13.3). |
| AC-21 | P1 | **Live.** With the item already removed in another tab: Remove in this tab ends as a successful removal (the `404` is treated as removed); Edit shows MG42, closes the dialog and panel, and refreshes the list (§13.2, §13.3, D10). |
| AC-22 | P1 | **Live.** The family selector appears only when items span two or more families and lists **All** plus only non-empty families in §11.4 order, with no counts. Choosing a family filters the grid; choosing one that hides the selected item closes the panel; removing the last item of the chosen family, or adding or editing an item into another family, returns the selection to **All** (§11.4, §21.7). |
| AC-23 | P1 | **Live.** An item with no category (created through the API) shows "No category" with the neutral art, appears only under **All**, is not counted as a category in MG4, and its Edit dialog starts with no category chosen and requires one (§8.2, D7). |
| AC-24 | P1 | **Live.** An item that has a `description` (created through the API) shows it read-only in the panel; after a rename in My Gear, `GET /api/users/me/gear` still returns the same `description` (§8.3, D6). |
| AC-25 | P1 | **Live.** Keyboard only: every card is reachable and its name is "{name}, {category}"; opening a card moves focus to the panel heading; Tab then reaches Edit, Remove from My Gear, Close in that order; Shift+Tab leaves the panel (nothing is trapped); Escape returns focus to the card. The DS §18 focus ring is visible on every control (§21.8, §21.17). |
| AC-26 | P1 | **Live.** The Add/Edit dialog is modal: focus starts per §21.10.2, Tab stays inside, Escape and Close return focus to the opener, and a backdrop click does nothing. The category picker is a labelled radio group of eleven tiles with visible text, one tab stop with arrow-key choice, and a selected state shown by ring and check mark, not colour alone (§21.10). |
| AC-27 | P1 | **Live.** At 1440×900 the grid has 5 columns with the panel closed and 4 with it open, with classic (always visible) scrollbars as well as overlay ones; at 1920×1080 the sheet is capped at 1600 and cards do not exceed about 270; at 1024×768 it has 4 and 2 columns. No horizontal scroll at any of the three (§11.3, §21.4). |
| AC-28 | P1 | **Live.** Trail Detail, Trip Preparation, and the Gear Studio headers look and behave as before, with no current-page marker on Gear (§21.2, §21.20). |
| AC-29 | P1 | **Live.** Signing out from `/gear` makes the page inert, then lands on `/`; signing in as a different user and opening `/gear` shows only that user's items (§9, §19). |
| AC-30 | P1 | **Live.** No item name appears in the URL, the document title (MG1 only), `localStorage`, or session storage, and FEATURE-007 adds no web-storage key (§17, §19). |
| AC-31 | P1 | **Live.** On `/gear` the browser downloads no `three`, React Three Fiber, avatar runtime, GLB, MapLibre, hero or home video; `/gear` is its own lazily loaded chunk (§20.3, D2). |
| AC-32 | P2 | **Live.** At 390 wide the grid has two columns, Add Gear is full width, the detail opens as a modal bottom sheet with Edit and Remove usable, and Escape or Close returns focus to the card (§21.9). |
| AC-33 | P2 | **Live.** With reduced motion, the card arrival, panel slide, and dialog rise do not move, and spinners are static; everything else works the same (§21.13). |
| AC-34 | P2 | Visual principle: every card uses the same plate colour (no per-category or per-family tint); no rarity colour, glow, level, stat, badge, completion figure, or game wording appears; all visible strings match the copy deck (§4, §21.6, §21.15). |
| AC-35 | P2 | A removed item's row remains in `gear_items` with `deleted = true` (database check, or the existing `GearIntegrationTest.shouldSoftDeleteGearItem` passing) (§7.4). |
| AC-36 | P2 | **Live.** An item equipped in the Studio whose category is then changed in My Gear is, when the Studio reopens, no longer equipped under the old category and is listed, not equipped, under the new one (§15.3). |
| AC-37 | P2 | **Live.** A 100-character name is clamped to two lines on its card without breaking the grid, and appears in full in the panel heading and in the card's accessible name (§21.5, §21.8). |
| AC-38 | P2 | **Live.** Interim art: each of the eleven categories shows its §21.6 pictogram on a card, in the panel, and in the picker, and the neutral item shows `package`; images are decorative (`aria-hidden` or `alt=""`) (§14.2, §21.6). |

### 22.2 QA model

**Lean QA by default** (`.claude/agents/qa.md`), about 5–10 minutes, as one journey in one browser session at 1440×900:

```text
Signed out → /gear → gate → sign in → lands on /gear (AC-01)
→ list loads, grid renders (AC-02–AC-04)
→ Add Gear → item appears first (AC-05) → add a second item of the same category (AC-06)
→ select a card → panel (AC-07) → Edit → updated (AC-08)
→ Remove → confirm → gone → reload → still gone (AC-09)
→ add another item in a recommended category
→ Trail Detail → Trip Preparation → Gear Studio: the new item is Owned (AC-12); equip it
→ back to /gear → remove it → reopen the Studio: not Owned, not Equipped (AC-14)
→ console and network health (AC-15); quick 1920 and 1024 sweep (AC-27)
```

AC-10 and AC-11 are checked with a second, empty test user and by stopping `user-service` briefly. AC-13 uses the Studio's Add gear once. AC-16 is the lead's diff review plus `build`/`lint`. Lean QA runs the P1 checks that matter most here: one failure path (AC-18 or AC-20), AC-22, AC-25, AC-28. It does not open every card or every family, and P2 is deferred unless the lead asks.

**Targeted QA** after a repair, about 2–5 minutes: the failed criterion, the behaviour it touches, and one or two adjacent checks. **Full QA** only on the user's request.

**Security.** Ownership logic does not change in FEATURE-007, and `GearIntegrationTest.shouldNotAllowUserToUpdateAnotherUsersGear` already covers cross-user mutation, so browser QA does not repeat cross-user tests beyond AC-29. If any change touches `GearService` lookups, a backend test proving that user A cannot read, update, or remove user B's item becomes P0.

## 23. Final Product Decisions

### 23.1 Q1–Q15

| # | Question | Decision | Basis |
|---|---|---|---|
| Q1 | Can one user own multiple items in the same category? | **Yes.** Any number, including identical names; each is its own card | No unique constraint; 005 G6; §8.4 |
| Q2 | What fields does a gear item have? | `id`, `name`, `category` (nullable), `description` (nullable), `createdAt`; internally `user_id` and `deleted` | §8.1, inspected |
| Q3 | Can category be edited? | **Yes.** `PUT` replaces it, and the Studio's reconciliation already handles an item whose category changed | §7.3, §13.2, §15.3 |
| Q4 | What happens when an Equipped item is removed from My Gear? | The server stops counting it as Owned at once. The next time the Studio for that trip opens, `reconcileLoadout` drops the stale Equipped entry and writes the corrected loadout back. No FEATURE-005 change, no permanent loadout | §15.3, inspected |
| Q5 | Does Gear Studio Add gear write to the same inventory? | **Yes.** Same endpoint, same table, same query key | §15.1, inspected |
| Q6 | Does My Gear use real-time 3D? | **No** | §5.2, §20.3 |
| Q7 | Does My Gear use visual inventory cards? | **Yes.** A grid of cards is the only view | §11 |
| Q8 | Are item visuals category-level? | **Yes**, for MVP: one illustration per category plus a neutral one | §14 |
| Q9 | Is soft delete required? | **Yes**, and it already exists | §7.4 |
| Q10 | Is `/gear` authenticated? | **Yes**, and so is every gear endpoint | §9, §19 |
| Q11 | Does Gear Studio remain trip-specific? | **Yes** | §15.2 |
| Q12 | Rarity, stats, or game mechanics? | **No** | §4 |
| Q13 | Search, sort, advanced filters? | **No** | §5.2, §11.4 |
| Q14 | Lightweight category navigation? | **Yes**: a single-choice family selector over existing categories, frontend-only, shown only when useful | §11.4 |
| Q15 | Does selecting an item navigate? | **No.** A detail panel opens on `/gear` | §12 |

### 23.2 Lead decisions

| # | Decision | Reason |
|---|---|---|
| D1 | `/gear` renders in the authenticated trip shell (`TripShell` + `TripHeader`) instead of `AppLayout` | The Home and trip headers both lead to `/gear`; arriving in a different, neutral shadcn header breaks the product's continuity. Reuses an existing shell; no new layout |
| D2 | `/gear` becomes a lazy route chunk in `pages/LazyRoutes.tsx` | Same pattern as every other page since FEATURE-006 |
| D3 | The category label map moves from `features/packing/gearCategories.ts` to `features/gear`; `packing` imports it from there and keeps exporting `gearCategoryLabel`, so `loadout` is untouched. Labels and behaviour do not change | FC §10 names `gear` as the owner of category presentation, and `gear` must not import from `packing`. Avoids a duplicate map that could drift |
| D4 | My Gear UI lives in `features/gear` (components, content, styles, art manifest, family map, update and remove) | One feature owns the inventory; no new feature folder |
| D5 | Category is editable | Q3 |
| D6 | `description` is preserved on every `PUT` and shown read-only when present; no editor | The field exists and is not removed; editing notes is out of scope |
| D7 | Items with no or unknown category render as "No category" / "Other gear" with neutral art, under **All** only; editing requires a known category | §8.2 |
| D8 | Server order (newest first); no sort | §11.2 |
| D9 | Frontend-only families: Packs, Layers, Footwear, Tools, Essentials; `SUN_PROTECTION` is an Essential, not clothing | §11.4 |
| D10 | `DELETE` `404` is treated as removed; `PUT` `404` says the item is no longer in My Gear and refetches | Another tab or session already removed it; the outcome the user wanted holds |
| D11 | No optimistic writes; cache updated from the server's answer, then invalidated | Proportional error handling; no rollback machinery |
| D12 | Interim art (lucide pictogram plates) ships with FEATURE-007; final illustrations are a separate approved asset task | Keeps the cycle from turning into art production (U1) |
| D13 | The header link keeps the label **Gear** and gains a current-page state on `/gear` | PRD §35 names it Gear; the page title says My Gear |
| D14 | My Gear never reads or writes the loadout; the Studio's reconciliation is the only cleanup of Equipped | Keeps `gear` free of `loadout` and Equipped trip-scoped |
| D15 | Add Gear is shown only once the list has loaded with items; the empty state has its own **Add your first item**; nothing offers Add while loading or unavailable | One primary action at a time, and no Add against an unknown list (§21.20 note 3) |
| D16 | Item detail is a non-modal side panel from 1024px up and a modal bottom sheet below; Add and Edit share one modal dialog; Remove confirms inline in the panel | §21.8–§21.11 |
| D17 | An add or edit that puts an item outside the chosen family returns the selector to **All** | The user always sees the item they just changed (§11.4) |

## 24. Implementation Plan, Write Scope, and Blockers

### 24.1 Agent sequence

```text
Recover → Scope
  → backend-api: SKIP (classification A, §7.6)
  → three-d / Blender: SKIP (3D pipeline: SKIP; Blender production: NOT REQUIRED)
  → frontend (implement §9–§21)
  → lead diff review (write scope, no FEATURE-005 change, no new dependency, no storage key)
  → qa: Lean QA (§22.2); Targeted QA after a repair
  → product gate (user)
  → closeout (docs, §24.6)
```

`backend-api` is engaged only if `frontend` or `qa` finds that the live API disagrees with section 7 (for example, the proxy does not pass `PUT` or `DELETE`). Full QA only on the user's request.

### 24.2 Write scope — `frontend`

| Path | Allowed change |
|---|---|
| `Project/Frontend/src/features/gear/**` | My Gear components, content (copy deck §21), styles, art manifest, family map, label map (D3), update and remove request functions and hooks. `GearFailureKind` may gain a not-found kind. Existing `useGearItems` / `useAddGearItem` behaviour stays as FEATURE-005 relies on it |
| `Project/Frontend/src/features/packing/gearCategories.ts` | D3 only: import the label map from `@/features/gear` and keep exporting `gearCategoryLabel`. No other change |
| `Project/Frontend/src/pages/GearPage.tsx`, `pages/LazyRoutes.tsx`, `app/router/routes.tsx` | D1, D2: the page, its lazy route, and moving `/gear` out of `AppLayout` |
| `Project/Frontend/src/components/layout/TripHeader.tsx`, `trip-shell.css`, and if needed `TripShell.tsx` | D13: the Gear link's current-page state; any shell hook the page needs. No other header change |
| `Project/Frontend/src/index.css` | Only if a shared token from §21 must be declared globally |

Not in scope: `features/loadout/**`, `features/avatar/**`, `features/discover/**`, `features/landing/**`, `features/planning/**`, `features/home/**`, `features/auth/**` (`/gear` is already a return destination), `features/trails/**`, `vite.config.ts` (the proxy already covers `PUT` and `DELETE`), `package.json` (no new dependency), `Project/Frontend/public/**` (no art in this cycle unless U1 says otherwise), `Project/Backend/**`, `Project/docker/**`, `assets/**`.

### 24.3 Conditional write scope — `backend-api`

Only on a proven contract failure and lead approval: `Project/Backend/user-service/**`, limited to the gear contract, with focused tests (list, create, update, soft delete, removed item excluded, wrong owner → `404`, validation). Never `trail-service`, `recommendation-service`, `activity-service`, or `api-gateway`.

### 24.4 Implementation checks for `frontend`

1. Before building, confirm through the dev proxy that `PUT` and `DELETE /api/users/me/gear/{id}` reach `user-service` with the token (expect `200` / `204`, and `404` for an unknown id). A refusal is a contract gap reported to the lead.
2. `DELETE` success is any `2xx`; do not treat the empty `204` body as `unreadable` (§13.3).
3. Every `PUT` sends `name`, `category`, and the item's current `description`.
4. `features/gear` imports nothing from `loadout`, `packing`, `avatar`, or `discover`; no file under `/gear` imports `three`, `@react-three/fiber`, or `maplibre-gl`.
5. `npm run build` and `npm run lint` pass.

### 24.5 Decision for the user at approval (decided 2026-10-15)

| # | Question | Options | Recommended default |
|---|---|---|---|
| U1 | How should the final category illustrations be produced? | (a) Ship FEATURE-007 with the interim pictogram plates; produce the twelve illustrations of §14.3 later as a separate approved static-asset task (image generation or hand illustration), dropped in through the manifest. (b) Produce the illustrations before or during FEATURE-007 and block the product gate on them | **(a)**. It keeps the cycle small and the layout is designed so the swap changes no code outside the manifest |

**Decided by the user, 2026-10-15: (a).** FEATURE-007 ships with the interim pictogram plates. The twelve final illustrations are post-feature visual polish, produced only by a separate explicitly approved asset task after the core product features are complete; they block neither implementation nor QA.

No other decision blocks implementation.

### 24.6 Follow-ups (documentation and non-blocking)

Recorded, not repaired by this task.

| # | Item | Where | When |
|---|---|---|---|
| F1 | `FRONTEND_CONTEXT.md` §1 and `CLAUDE.md` still describe the journey as "Plan → Pack → Explore → Memory"; the PRD's is Discover → Plan → Prepare → Go in real life → Remember | FC §1, `CLAUDE.md` line 5 | Closeout (FC); `CLAUDE.md` at the user's discretion |
| F2 | FC §7 says `PUT` and `DELETE /api/users/me/gear/{id}` are never sent; FC §8 lists `/gear` as a placeholder in `AppLayout`; FC §10 places category labels in `packing` | FC §7, §8, §10 | Closeout |
| F3 | FEATURE-005 G5, §13.3 and limitation 43.4 say `/gear` is a placeholder and a mistaken item cannot be renamed or removed. FEATURE-007 resolves this. The FEATURE-005 spec is frozen; at most a one-line "resolved by FEATURE-007" note | 005 §4, §13, §43.4 | Closeout, lead's choice |
| F4 | The Studio's copy says "Add to my gear" / "your gear"; My Gear capitalises "My Gear". Cosmetic; FEATURE-005 is frozen, so no change now | `features/loadout/content.ts` AG8 | Post-freeze polish |
| F5 | DS §32 lists Gear and dialogs as undefined. Add the My Gear collection, item card, detail panel, and dialog rules (§21's closeout list) | DS | Closeout |
| F6 | PRD §14 and §47 list FEATURE-007 as planned / next | PRD | Closeout |
| F7 | `GearIntegrationTest` proves another user's item cannot be updated, but has no cross-user `DELETE` test. The code path is the same scoped lookup, so isolation holds; a test would document it | `user-service` tests | Optional; only if `backend-api` is engaged for another reason, or post-freeze |
| F8 | Unhandled `user-service` errors (unknown enum value, non-UUID id, malformed JSON) return Spring's default body, not the `ProblemDetail` shape (005 G7). Status-based handling covers it | `GlobalExceptionHandler` | None required |
| F9 | A Studio already open in another tab keeps its old gear list until it is reopened, so an item removed in My Gear can still look Equipped there | §15.3 | Accepted limitation |
| F10 | Final category illustrations (U1) | §14.3 | Separate approved asset task |

### 24.7 Closeout record (2026-10-16)

| Item | Result |
|---|---|
| Implementation | `frontend`, within section 24.2; `npm run build` and `npm run lint` exit 0 |
| Lead diff review | PASS: only section 24.2 paths changed; no backend, `public/`, package, or proxy change |
| Lean QA (run 1) | Every P0 passed; one P1 failed: AC-27, 3 columns at 1440 with the panel open under a classic scrollbar |
| Repair cycle 1 | Section 21.3 amended: L panel 344 → 328 (one CSS value) |
| Targeted QA (run 2) | PASS: 4 columns at 1440 with the panel open (classic and overlay scrollbars); no regression at 1440 closed, 1920 open, or in the panel content |
| Product gate | Accepted by the user, 2026-10-16 |
| Deferred, not failed | AC-17, AC-19, AC-21, AC-23, AC-24, AC-26, AC-32 to AC-38; AC-30 and AC-31 partly. Not verified: real screen reader, Safari, overlay scrollbars on macOS, Escape while saving on a physical keyboard |
| Accepted limitations | A Gear Studio already open in another tab shows its old list until reopened (F9); below 768px Save is drawn above Cancel while keyboard order reaches Cancel first; final illustrations deferred |
| Follow-ups (24.6) | Resolved at closeout: F1 (journey wording in `FRONTEND_CONTEXT.md` §1 and `CLAUDE.md`), F2 (`FRONTEND_CONTEXT.md`), F5 (`DESIGN_SYSTEM.md` §9, §14, §32, §36), F6 (PRD §1.1, §13.2, §14, §47). Left as recorded: F3 (the frozen FEATURE-005 spec is not edited), F4 (post-freeze copy polish), F7 (optional test), F8 (none required), F9 (accepted), F10 (polish backlog below) |
| Polish backlog | Replace the interim gear category icons with the approved set of consistent stylized category illustrations (section 14.3). Not a FEATURE-007 blocker; produced only by a separate explicitly approved asset task |

