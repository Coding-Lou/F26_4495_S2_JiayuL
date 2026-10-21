# FEATURE-012 — Ready-to-Go 3D Completion

| | |
|---|---|
| Status | **IMPLEMENTED — PASS / FROZEN (2026-10-20).** Product Gate accepted; Lean QA PASS; repair cycles 0/2 (asset 0/2, frontend 0/2). Closeout record: §25. Spec approved and frozen for implementation 2026-10-19 with U1 = versioned copy (§14.4) and U2–U7 accepted; contract amendments at stage B in §14.8 |
| Date | 2026-10-19 |
| Roadmap | Second of the approved extension: FEATURE-011 (PASS / FROZEN) → **FEATURE-012** → FEATURE-013 My Plans & Calendar → FEATURE-014 Plan → Memory Bridge (final product feature). There is no FEATURE-015 |
| Route | No new route. The post-save completion state of the Gear Studio, `/trails/:trailId/prepare/:tripDate/pack` |
| Backend | None. `plan-service` and every other service are unchanged |
| Feature cycle | Recover → baseline record (§14.4) → `three-d` (Blender MCP, one `ready_to_go` action) → lead asset gate → `frontend` → lead diff review → Lean QA → product gate. `ui-ux: SKIP`, `backend-api: SKIP`, Blender: REQUIRED (§8) |
| Depends on | FEATURE-005 (Gear Studio, avatar runtime, 3D asset contract), FEATURE-011 (Finish preparation, `createPlan`, D-INV-1, D-INV-2) |
| Followed by | FEATURE-013 (changes the Continue destination to `/plans`) |
| Sources of truth | `CLAUDE.md` → `docs/PRODUCT_REQUIREMENTS.md` (§9.4–9.5, §11, §19.2–19.3, §20, §23) → `docs/FRONTEND_CONTEXT.md` (§7, §8, §9, §10, §13) → `docs/DESIGN_SYSTEM.md` → specs 005, 011 |

Notation. "PRD §x" is `docs/PRODUCT_REQUIREMENTS.md`, "FC §x" is `docs/FRONTEND_CONTEXT.md` (both as compacted on 2026-10-19), "DS §x" is `docs/DESIGN_SYSTEM.md`, "005 §x" and "011 §x" are those specifications; a bare "§x" is this document. Decisions are `D…`, acceptance criteria `AC-…`, approval items `U…`. Appendices A and B are the specialists' inspection records and proposals; where they differ from §1–§24 (for example the announcement wording), the numbered sections decide.

---

## 1. Feature Summary

FEATURE-012 replaces the post-save moment of Finish preparation. Today a confirmed Plan save shows a static "Preparation complete" and **Continue**. After FEATURE-012:

- The Plan is saved first, exactly as in FEATURE-011 (`POST /api/plans`, `201` or `200`).
- Only then does the existing avatar, wearing the user's equipped gear, play one short skeletal clip, `ready_to_go`: 4.0 s, played once, a calm "gear check → settle the pack → look ahead" gesture.
- The Finish section then shows **Ready for the trail.**, the existing saved line ("Your plan for … has been saved."), and **Continue**, still to `/home`.
- Whenever the clip cannot play (reduced motion, Pause, narrow layout, no WebGL, viewer failure, missing clip, a hidden tab, a timeout), the same completion appears without motion. The Plan is never reported as failed because of the animation.

It adds one animation action to the existing avatar GLB through Blender, plus a small runtime and Studio integration. No route, backend, dependency, camera, environment, or gear change.

## 2. Product Problem

```text
Today:  Gear Studio → Finish preparation → Plan saved → static "Preparation complete" → Continue → /home
After:  Gear Studio → Finish preparation → Plan saved → avatar plays ready_to_go (~4 s) → "Ready for the trail." → Continue → /home
```

The business flow is correct since FEATURE-011, but the journey ends abruptly on a block of text. Preparation is the one place where the product's real-time avatar carries meaning (PRD §9.5, §19.2). A brief completion gesture by that avatar says: **the digital preparation is done; you are ready to go outside.** It is a cue, not a game sequence: no reward, score, level, or cinematic.

## 3. Goal

1. Play one short (4.0 s) completion clip on the **existing** avatar and rig, with the currently equipped gear visible and attached throughout (§9, §14).
2. Start it only after the Plan save has been confirmed; a failed or unconfirmed save never shows completion (§11).
3. Never let the animation block, delay beyond about 5 s, or contradict the saved Plan (§12).
4. Respect reduced motion and the Studio's Pause control (§13).
5. Keep FEATURE-011's persistence semantics, FEATURE-005's Studio behavior, and the Continue destination seam unchanged (§4, §15).

FEATURE-012 is not a page, a camera sequence, an environment, a new character, a Plan lookup, or a calendar.

## 4. 011 / 012 / 013 / 014 Boundary

| Feature | Owns | FEATURE-012 must not |
|---|---|---|
| **011 Plan Foundation & Finish Preparation** (frozen) | `plan-service`, the Plan API, `createPlan`, `useCreatePlan`, the Finish action and its failure states, idempotency | change the request, its retry policy, the failure states, or Plan semantics |
| **012 Ready-to-Go 3D Completion** (this) | the `ready_to_go` clip in the versioned avatar GLB `avatar-base-ready-to-go.glb`, its playback in the Studio, the save-success → completion transition, the completion copy, the no-motion fallback | — |
| **013 My Plans & Calendar** | `/plans`, the calendar, Plan detail and delete UI, the **Plans** navigation entry, and changing Continue's destination to `/plans` | create `/plans`, read or list Plans, or suppress the animation for an already-saved Plan |
| **014 Plan → Memory Bridge** | a past Plan's **Add memory** | touch `features/memories` or memory-service |

Invariants carried forward from 011 §4:

- **D-INV-1** (now implemented by this feature): the completion animation may play only after `POST /api/plans` returned `201` or `200`. A failed, unconfirmed, or in-flight save never shows a completion state.
- **D-INV-2**: Continue → `/home` stays temporary. FEATURE-012 keeps it as one value in one place (`GearStudioScreen.tsx:784`, Appendix B) so FEATURE-013 changes one line.

Re-entry (accepted, unchanged from 011): reopening the Studio for a trip whose Plan already exists shows the ordinary Finish action. Pressing it again confirms the existing Plan (`200`) and plays the clip again, once. FEATURE-012 does not read Plans to prevent that.

## 5. Current 3D Implementation Inspection

Inspected read-only on 2026-10-19 by `three-d` (§6, §7, Appendix A: the GLB JSON and BIN chunks, the FEATURE-005 evidence and previews, the avatar runtime) and `frontend` (Appendix B: the Finish flow, the Studio, the viewer and runtime). No Blender process was opened and no asset or code changed. Summary:

| Question | Finding |
|---|---|
| A. Avatar asset | `Project/Frontend/public/models/avatar/avatar-base.glb`, 630,128 B, unchanged since the 005 Asset Gate (SHA-256 matches). **Untracked in git**, as is `assets/blender/` (§6.1) |
| B. Skeleton | Yes: one skin, armature `Avatar_Armature`, 23 joints; no IK, helper, or finger bones; no constraints |
| C. Useful bones | `Hips`, `Spine`, `Chest`, `Breath`, `Neck`, `Head`, `Shoulder_L/R`, `UpperArm_L/R`, `LowerArm_L/R`, `Hand_L/R`; legs only to counter a hip motion |
| D. Clips | Exactly one: `Idle`, 4.0 s, 121 keys at 30 fps, linear, on `Breath` (translation), `Neck`, `Head` (rotation); first and last keys equal rest; no root motion |
| E. Idle | An embedded GLB clip found by name (`avatarManifest.avatar.idleClip`), looped forever |
| F. Mixer | One `AnimationMixer` on `gltf.scene`, created only when `Idle` exists; advanced by on-demand frames only while the idle plays and the tab and canvas are visible, at most 1/20 s per step |
| G. Gear | Backpack, poles, headlamp: rigid GLBs added as children of bone-parented `Slot_Back`, `Slot_Hand_L/R`, `Slot_Head`. Rain gear, warm layer, footwear: skinned `Wear_*` variants shown or hidden. Five categories have no visual |
| H. Gear during a clip | Structurally safe: everything follows its bone. Visually bounded: rigid poles (tips 2 mm above the ground), the rigid pack with its hip belt on `Chest`, and the collar / hood near the head limit the motion (§7.2) |
| I. Blender source | `assets/blender/feature005/avatar-gear-studio.blend` (+ `.blend1`), `Idle` its only action |
| J. Export path | Blender 5.2.2 glTF exporter, options recorded in `assets/blender/feature005/evidence/exporter-options.txt` (005 §23.6–§23.7) → `public/models/avatar/avatar-base.glb` |
| K. In place or versioned | **Versioned copy** (user decision U1, 2026-10-19): new `avatar-base-ready-to-go.glb` beside the untouched original; the manifest's model path switches (§14.4) |
| Studio ↔ viewer | Props in (`equipped`, `reducedMotion`, `paused`), status out (`onStatusChange`); the viewer mounts only at ≥ 768 px with WebGL 2 |
| Success point | `FinishPreparation.tsx:95–96`, after `mutateAsync` resolves |

## 6. Avatar / Rig / Animation Findings

Method: read-only. I parsed the GLB JSON and BIN chunks with `python3 -I`, read the FEATURE-005 evidence (`assets/blender/feature005/evidence/`), looked at two FEATURE-005 previews, and read the avatar runtime source. No Blender process was opened, and no file other than this one was written.

**6.1 Asset file (A).** `Project/Frontend/public/models/avatar/avatar-base.glb`, 630,128 bytes:

- Its SHA-256 (`50b58cd3…5efb`) equals the 005 `evidence/sha256.txt`, so it has not changed since the FEATURE-005 Asset Gate. The same holds for the three gear GLBs.
- Format: glTF 2.0, generator "Khronos glTF Blender I/O v5.2.40". It has one scene with root `Avatar_Root`, no `extensionsUsed`, and no images, textures, cameras, or lights.
- BIN chunk (605,908 B): mesh and skin attributes 598,628 B; inverse bind matrices 1,472 B (23 × 64); animation 5,808 B. The JSON chunk is about 26.6 kB.
- **Finding: the assets are untracked.** `git status` shows `?? Project/Frontend/public/models/` and `?? assets/blender/`, although 005 §23.1 says "In git: yes". The frozen FEATURE-005 assets therefore have no version-control rollback (see A.3 and A.6).

**6.2 Skeleton (B, C).** There is one skin, with armature node `Avatar_Armature` and 23 joints whose names exactly match 005 §21.2. There are no finger, IK, control, or helper bones. The source has no constraints or drivers (`blend-inventory.json`: `no_props_constraints_drivers: true`). Hierarchy as exported:

```text
Avatar_Root → Avatar_Armature → Root → Hips ┬ Spine → Chest ┬ Breath (joint, leaf)
                                           │               ├ Neck → Head → Slot_Head
                                           │               ├ Shoulder_L → UpperArm_L → LowerArm_L → Hand_L → Slot_Hand_L   (R mirrors)
                                           │               └ Slot_Back
                                           └ UpperLeg_L → LowerLeg_L → Foot_L → Toes_L                                    (R mirrors)
```

The 11 mesh nodes are children of `Avatar_Armature`. `Root`, `Avatar_Root`, and `Avatar_Armature` have identity transforms. Rest-pose world positions (G-space, metres, Y up, avatar faces +Z), composed from the node TRS:

| Node | Position | Node | Position |
|---|---|---|---|
| `Hips` | 0, 0.950, −0.010 | `UpperArm_L` | 0.185, 1.400, −0.020 |
| `Spine` | 0, 1.050, −0.010 | `LowerArm_L` (elbow) | 0.320, 1.166, −0.020 |
| `Chest` | 0, 1.200, −0.015 | `Hand_L` (wrist) | 0.444, 0.951, 0.010 |
| `Breath` | 0, 1.280, 0.060 | `Slot_Hand_L` | 0.459, 0.874, 0.021 |
| `Neck` / `Head` | 0, 1.430 / 1.500, ~−0.02 | `Foot_L` / `Toes_L` | 0.09, 0.09, −0.03 / 0.09, 0.02, 0.10 |
| `Slot_Head` | 0, 1.650, −0.015 | `Slot_Back` | 0, 1.300, −0.105 |

- The rest pose is the relaxed A-pose of 005 §21.3: each upper arm points (±0.5, −0.87, 0), which is 30° from vertical.
- The knees are bent about 3.9° (`LowerLeg_*` rotation x −0.0339).
- Height is 1.752 m, the soles are at y = 0, and every scale is 1.
- Bones useful for a gesture: `Hips`, `Spine`, `Chest`, `Breath`, `Neck`, `Head`, `Shoulder_*`, `UpperArm_*`, `LowerArm_*`, `Hand_*`. Leg bones are needed only to counter a hip motion.

**6.3 Skinning.** All 11 meshes are skinned to the one skin, including every `Wear_*`. Summed vertex weights per mesh (from `JOINTS_0`/`WEIGHTS_0`):

| Meshes | Bones |
|---|---|
| `Avatar_Hair_Base`, `Avatar_Hair_Top` | `Head` 100 % |
| `Avatar_Hands` | `Hand_L`/`Hand_R` 100 %, so the hands are rigid |
| `Avatar_Head` | `Head`, plus a little `Neck` and `Chest` |
| `Avatar_Legs` | `Hips`, `UpperLeg_*`, `LowerLeg_*` |
| `Avatar_Shoes_Default`, `Wear_Boots` | `Foot_*`, `Toes_*`, `LowerLeg_*` |
| `Avatar_Top_Base`, `Wear_Shell`, `Wear_WarmLayer_Body` | `Chest`, `Hips`, `Spine`, `UpperArm_*`, `LowerArm_*`, `Shoulder_*`, `Breath` (small) |
| `Wear_WarmLayer_Collar` | `Chest` 100 % |

Limb deformation in a large pose was shown once, in `previews/ST-stride_q3.png`: elbows at 60°, upper arms swung 25°, knees at 45°, with no tearing. Layer poke-through in that pose was not gated (005 §27.4).

**6.4 Existing clip (D).** The file has exactly one animation, `Idle`. It has three LINEAR channels with 121 keys each, from 0.0 to 4.0 s (30 fps), sharing one input accessor:

| Node | Path | Largest offset from rest |
|---|---|---|
| `Breath` | translation | 5.15 mm |
| `Neck` | rotation | 0.50° |
| `Head` | rotation | 0.80° |

- The first and last keys equal the rest transform exactly.
- No channel targets `Root`, `Hips`, a limb, or a slot node, and there are no scale channels. **There is no root motion.**
- In the `.blend` (from `blend-inventory.json`), `Idle` is the only action. It uses slot `Avatar_Armature`, frames 1–121 at 30 fps, and 11 F-curves.

**6.5 How the idle plays (E, F).** `Idle` is an embedded clip, not procedural.

- `AvatarStage.setAvatar` looks the clip up by name in `gltf.animations` using `avatarManifest.avatar.idleClip` (`AvatarStage.ts:188–192`).
- It creates `new AnimationMixer(gltf.scene)` and a `LoopRepeat, Infinity` action **only when that clip is found** (`:193–197`). It keeps no other clip, and does not keep the `GLTF`.
- Reduced motion never starts the clip and leaves the rest pose. Paused freezes the action (`applyMotion`, `:305–324`).

Frames are drawn on demand:

- R3F runs with `frameloop: "demand"` (`RuntimeController.tsx:341`).
- `FrameDriver` (`SceneParts.tsx:9`) calls `controller.frame` (`RuntimeController.tsx:319–329`), which calls `stage.frame(delta, now, animate)`. Here `animate` = tab visible AND canvas intersecting (`:322`).
- `stage.frame` advances the mixer by `min(delta, 1/20 s)` only when `idlePlaying && animate`, then returns `true` so the controller calls `invalidate()` for the next frame (`AvatarStage.ts:412–416`). This self-sustaining invalidation is the animation loop.

Three consequences for a one-shot clip:

1. Nothing advances a mixer unless the idle is playing.
2. A hidden tab or an off-screen canvas freezes the clip, so a `finished` event does not fire.
3. Below 20 fps the 1/20 s step cap makes the clip run slower than wall-clock time.

Disposal calls `stopAllAction` and `uncacheRoot` (`:423–427`). The manifest version is 1, and `modelUrl` adds `?v=<version>` to **every** model URL (`loadModel.ts:22–24`).

## 7. Gear Attachment Findings

**7.1 Mechanism per category (G).** Sources: `avatarManifest.ts:72–94`, the GLB JSON, and `blend-inventory.json`.

| `GearCategory` | Visual | Mechanism | Node(s) | Moves with |
|---|---|---|---|---|
| `BACKPACK` | `BACKPACK` | attached rigid model, `gear-backpack.glb` (79,208 B) | `Gear_Backpack` on `Slot_Back` | `Chest` (not `Breath`) |
| `TREKKING_POLES` | `TREKKING_POLES` | attached rigid models, `gear-trekking-poles.glb` (31,824 B) | `Gear_TrekkingPole_L`/`_R` on `Slot_Hand_L`/`_R` | `Hand_L`/`Hand_R` |
| `HEADLAMP` | `HEADLAMP` | attached rigid model, `gear-headlamp.glb` (31,536 B) | `Gear_Headlamp` on `Slot_Head` | `Head` |
| `RAIN_GEAR` | `RAIN_SHELL` | embedded skinned variant | `Wear_Shell` shown; `Avatar_Top_Base` and `Wear_WarmLayer_Body` hidden | skin |
| `WARM_LAYER` | `WARM_LAYER` | embedded skinned variant | `Wear_WarmLayer_Body` and `Wear_WarmLayer_Collar` shown; `Avatar_Top_Base` hidden | skin |
| `FOOTWEAR` | `HIKING_BOOTS` | embedded skinned variant | `Wear_Boots` shown; `Avatar_Shoes_Default` hidden | skin |
| `WIND_LAYER`, `TRACTION`, `WATER`, `FOOD`, `SUN_PROTECTION` | `null` | none, UI only | — | — |

So six categories are visible on the avatar and five are not.

- At runtime an attach node is placed by `slot.add(node)` alone, with no transform written (`AvatarStage.ts:239–258`).
- Visibility is a pure function of the equipped set (`visibility.ts:46–63`).
- Each gear attach node is an unskinned scene root with identity TRS, and its geometry is relative to the slot.
- In the `.blend`, the slots are bone-parented Empties (`parent_type: BONE`), and each gear object is parented to its slot with identity local and parent-inverse matrices.

**7.2 Does a new skeletal clip keep the gear attached (H)? Yes, structurally.**

- Every slot is a child of a joint, and every attach node is a child of a slot. three.js passes any joint animation down the scene graph, so attached gear follows with no runtime code.
- Every `Wear_*` mesh is bound to the same skeleton, so it deforms with it whether it is visible or not.
- The mixer root is `gltf.scene`, so the tracks bind by node name.

The clip must key bones only. Slot nodes are objects, not bones, and must never be keyed.

**What a clip does not guarantee is that the gear still looks right.** Rigid gear does not deform. Moving a rigid part's parent bone relative to a skinned surface weighted to other bones opens gaps or causes clipping. The geometry below bounds the motion. The figures are estimated from rest-pose geometry and must be checked per frame in Blender.

- **Poles.** Each pole's local bounds run from y −0.872 to +0.087 relative to its slot. With the slot at y 0.874, the tip sits **2 mm above the ground** (inventory `assembled z 0.002–0.961`; 005 AC-28 requires 0–10 mm). The pole is a rigid 0.96 m lever on the hand:
  - Bringing an arm 8° toward the body lowers the tip about 24 mm, **into the ground**.
  - Any upper-body roll lowers one hand.
  - 6° of elbow flexion lifts the tip about 6 mm and swings it about 12 cm forward.
  - A hand at strap height (about 1.3 m) needs about 90° of elbow flexion. That would turn the pole near horizontal, through a leg, the torso, or the other pole.
- **Backpack.** It is one rigid mesh that includes the shoulder straps, the chest detail, and **the hip belt** (`previews/L8-full_side.png`, `ST-stride_q3.png`; extents z 0.93–1.48). The belt sits at waist height (about 0.95–1.0 m) but hangs from `Chest`, while the waist under it is weighted to `Hips` and `Spine`. Per 005 §20.3 rule 5 the belt and straps are embedded only about 5 mm inside the surface (outer face 26 mm out), and the pack's front face is 6–17 mm inside the back.
  - A `Chest` rotation slides the belt against the waist by roughly 4 mm per degree. A `Spine` rotation slides it by about 1–2 mm per degree.
  - `Breath` moves the chest surface but not the straps. The breathing budget in rule 5 is 8 mm.
  - Lowering a shoulder by more than about 5 mm opens a gap under its strap. Raising it by up to about 20 mm stays inside the strap.
- **Headlamp.** It follows `Head` exactly. The risks are next to it, not on it:
  - Looking down can push the chin into `Wear_WarmLayer_Collar` (100 % `Chest`) or the shell's neck.
  - Looking up pushes the back of the head toward the folded hood, which sits 61 mm behind the neck at z 1.41–1.52.
- **Embedded wear** deforms with the skin. Its torso weights were transferred from `Avatar_Top_Base` (005 §21.5), so all torso variants deform identically.

## 8. Blender Requirement Decision

**D1. Outcome A: Blender is required.** The rig is usable as it is, but no existing clip contains the motion, so FEATURE-012 adds exactly one action to the existing rig (Appendix A.1).

- **Not B:** `Idle` moves three bones by less than a degree and has no arm or torso data. Authoring bone rotations in frontend code would put pose numbers in `src/` (forbidden by 005 §22.6) and bypass the per-frame pole, foot, and pack checks, which need the evaluated mesh.
- **Not C:** nothing blocks the work. No new bone, mesh, weight, material, or gear change; the gear GLBs are not re-exported.
- The avatar is not rebuilt, no new character is made, and no image-to-3D or generation tool is used.

Blender work starts only after product approval, inside the feature cycle, through the Blender MCP server, by `three-d`, under the asset gate of §14. No Blender tool was used for this specification.

## 9. Ready-to-Go Motion Design

**D2. One clip, `ready_to_go`, 4.0 s (121 frames at 30 fps, frames 1–121), played once.** It matches `Idle`'s length and the scene's frame range, so the exporter cannot clip it. The detailed table, bone limits, and rationale are Appendix A.2; this section is the approved summary.

| Time | Gesture | Bones |
|---|---|---|
| 0.00–0.50 s | Settle: small inhale, head begins to tip | `Breath`, `Neck`, `Head` |
| 0.50–1.50 s | Gear check: glance down at hands and feet, forearms lift slightly | `Neck` + `Head` (≤ 12° down, ≤ 10° yaw), `Spine` ≤ 2°, `LowerArm_*` ≤ 6°, `Hand_*` ≤ 5° |
| 1.50–2.50 s | Pack settle: shoulders shrug into the straps and release | `Shoulder_*` ≤ 4° with a slight roll back, `Breath`, `Chest` ≤ 1° |
| 2.50–3.30 s | Look forward and straighten | `Neck`, `Head`, `Spine` back to level, exhale |
| 3.30–4.00 s | Ready stance: everything settles to rest | all animated bones |

- **D3. End pose = rest pose** (every channel within 0.0001 of rest at frame 121). Rest is the upright, relaxed stance, equals `Idle`'s first frame, and equals the reduced-motion pose, so the hand-back to the idle is invisible and the final picture is the same with or without motion.
- **D4. No hand-on-strap gesture.** Reaching the straps needs about 90° of elbow flexion, which would swing each 0.96 m pole through the legs or torso. The shoulder shrug into the straps replaces it; without a pack it reads as a shoulder roll. No IK.
- **D5. Root motion: W1 (none).** No key on `Root`, `Hips`, or any leg bone; the feet are planted by construction. W2 (a `Hips` weight shift ≤ 10 mm, ≤ 1.5°, FK-countered legs, feet drift ≤ 2 mm) is permitted only if `three-d` judges W1 too static after the first render **and** every per-frame check passes; the lead decides at the asset gate. `Root` is never keyed in either case. *W2 withdrawn at stage B: it cannot meet AC-19 with the tips down (§14.8 G1).*
- **D6. One clip for every gear combination.** With or without poles, pack, headlamp, or wear. The pole rules (tips 0–60 mm above the ground, no skating, no intersection; upper arm never toward the body beyond rest, elbow ≤ 10°, wrist ≤ 8°) make the clip valid with poles and harmless without them.
- **D7. Camera: none.** The Studio camera, framing, and orbit stay as they are. No environment, particles, wind, scenery, video, or physics.
- Tone: subtle, grounded, readable at the Studio's default framing, not theatrical, comedic, or exaggerated. Film-quality animation is not required.

## 10. Animation Runtime Flow

**D8. Playback model** (Appendix A.4, B):

```text
Idle (looping) ──0.25 s crossfade──▶ ready_to_go (LoopOnce, clampWhenFinished)
      ▲                                       │ "finished"
      └──────────0.25 s crossfade, Idle reset to 0────┘
```

- The runtime keeps a reference to `ready_to_go` (looked up by exact name, from a new manifest field `avatar.readyClip`) beside `Idle`, on the one mixer. A mixer exists whenever either clip exists.
- The Studio sends a declarative **ready cue** (`readyCue: number`) through `StudioStage` → `AvatarViewer` → runtime. The runtime plays once each time the cue **increases after the controller exists**. The value present when the controller is constructed counts as consumed, so a viewer Retry, a remount, or StrictMode never replays the clip.
- The runtime reports `readyClip: "none" | "available" | "playing"` in the existing viewer status (new `RuntimeState.hasReady` / `readyPlaying`), exposed as `data-avatar-ready`.
- While the clip runs, `frame()` keeps requesting frames independently of the idle, and starting playback invalidates once. The existing 1/20 s step cap stays: it only slows the clip below 20 fps, and the UI completes on wall-clock time anyway.
- **D9. Final state (Q17): return directly to Idle.** On `finished`, crossfade over 0.25 s back to `Idle` reset to time 0. Because the clip ends on rest and `Idle` starts on rest, there is no hold and no visible transition; the idle then loops as before.
- Reduced motion stops a running clip; Pause freezes it like the idle (existing `applyMotion` semantics).
- Equipped gear and visibility are untouched by playback (visibility stays a pure function of the equipped set).

## 11. Plan Save Integration

**D10. Order is mandatory: persist, then celebrate.**

```text
Finish preparation (click / Enter / Space)
  → phase "saving": button disabled state, "Saving plan…", announce "Saving your plan."   (unchanged, 011)
  → createPlan → 201 or 200
  → phase "celebrating": button shows "Plan saved" (aria-disabled), announce "Your plan is saved."
  → celebrate()  ── plays ready_to_go when possible (§12 decides) ──
  → phase "complete": "Ready for the trail." + saved line + Continue
createPlan fails (unavailable / unconfirmed / invalid date / trail gone / unexpected)
  → phase "failed": FEATURE-011 failure and Try again, unchanged; no cue is sent; the announcer is silenced
```

- The cue is sent from the continuation of the resolved mutation, never from an effect and never before the response.
- **No duplicate Plan.** FEATURE-011's synchronous `savingRef` guard stays. During `celebrating` the button is `aria-disabled` and ignores activation; in `complete` it is replaced by the completion. Nothing in the animation path calls `createPlan`.
- **No navigation before or during persistence.** The only navigation is Continue, which exists only in `complete`.
- FEATURE-011's request, `retry: false`, `networkMode: "always"`, failure classification, and copy FP13–FP18 are unchanged.
- `FinishPreparation` gains one optional prop, `celebrate?: () => Promise<void>`, supplied by the Studio (`features/loadout`). Without it, `complete` follows success at once (FEATURE-011 behavior), so `features/plans` gains no import of `features/avatar` (FC §10).

## 12. Animation Failure / Fallback

**D11. Business and visual errors are separate.**

| Situation | Plan | What the user sees |
|---|---|---|
| Save fails | **not** saved | FEATURE-011 failure + Try again; no clip, no completion |
| Save succeeds, clip plays | saved | `ready_to_go`, then the completion |
| Save succeeds, clip cannot or does not play | saved | the same completion, without motion |

`celebrate()` (in `features/loadout/hooks/useReadyToGo.ts`) **skips the clip and resolves at once** when any of these is true at save success:

- the viewer is not mounted (< 768 px, no WebGL 2) or its state is not `ready`/`partial` (loading, failed, timed out, avatar invalid);
- `readyClip` is not `"available"` (clip missing from the GLB, an old cached GLB, reduced motion);
- the user has paused motion (**D12**, below);
- the document is hidden.

Otherwise it increments the cue and resolves on the **first** of:

1. `readyClip` leaves `"playing"` (the clip finished; the crossfade back to Idle continues behind the copy);
2. no `"playing"` report within **1,000 ms** of the cue;
3. the viewer becomes unavailable or unmounts;
4. the user presses Pause or reduced motion turns on;
5. a **5,000 ms** wall-clock safety timer from the cue (D13).

`FinishPreparation` adds its own **6,000 ms** ceiling from save success, so a confirmed save always reaches `complete` even if `celebrate()` never settles or throws. A thrown or rejected `celebrate()` is treated as resolved. No message ever says the Plan failed because of the animation; the animation's failure has no user-visible message at all.

- **D12. Pause.** If motion is paused at save success, the clip is skipped (the user chose a still avatar). Pressing Pause during the clip freezes the avatar (existing semantics) and completes the UI immediately; Play resumes the remainder, then the idle.
- **D13. Safety timeout.** Expected completion ≈ 4.0 s after the cue (clip end); at the latest 5.0 s after the cue, 6.0 s after save success. A hidden tab, a throttled CPU, or a missed `finished` event cannot trap the user.
- **D14. No Skip button.** The clip is 4.0 s and the completion is bounded at 5 s; Continue appears promptly. Skip would add a control for a moment shorter than reading it. If the implemented clip ever exceeds 5 s, Skip becomes mandatory (and the clip fails the asset gate first).
- **Drop rule (D15).** If `ready_to_go` fails the asset gate after the permitted asset repairs (§24 U2), the manifest keeps the original `models/avatar/avatar-base.glb`, the versioned GLB is not shipped (removed from `public/models/`), `readyClip` is `null`, and every save reaches the static completion. The rest of FEATURE-012 (state machine, copy, focus) still ships.

## 13. Reduced Motion

**D16. Reduced motion skips the clip.** When `prefers-reduced-motion: reduce` matches (read by the Studio, `StudioStage.tsx:28`), the runtime reports no available clip and `celebrate()` resolves at once: save success → `complete` with no character motion. The avatar stays in the rest pose, which is the clip's own end pose, so nothing is lost. The only feedback is text: the "Plan saved" button state for one render, the announcement, and the completion. Turning reduced motion on during the clip stops it and completes the UI. This is P0.

## 14. Asset / GLB Export Contract

### 14.1 Preserved exactly

Everything listed in Appendix A.3 "Preserved exactly": the 40 node names and hierarchy (23 joints, 4 `Slot_*` nodes with parents and rest TRS), the 11 skinned meshes including every `Wear_*`, the 12 materials, one skin, `Avatar_Root` at identity with scale 1, origin between the feet, soles at y 0. `Idle` is unchanged (121 keys, 4.0 s, values equal within 0.0001). The gear GLBs are not re-exported and keep their 005 SHA-256. These properties are checked on the new versioned GLB; the original `avatar-base.glb` is not touched at all.

### 14.2 Added

One animation, named exactly `ready_to_go`, per §9 and A.2: keys on bones only (never on `Slot_*`, `Root`, or meshes), no scale channels, FK only (any temporary IK baked and removed), bound to the `Avatar_Armature` slot, `use_fake_user=True` on **both** `ready_to_go` and `Idle` (otherwise `Idle` loses its last user and is dropped on save; the flag is not exported). Channel and key rules: §14.8 G2.

### 14.3 Export

The 005 options of A.3 (Blender 5.2.2, `ACTIONS` mode, forced sampling at step 1, frame range on, slide to zero, optimized animation size, rest-position armature, reset pose bones, apply, +Y up), exporting only the 17 `F005_Avatar` objects with the pose cleared, the frame at 1, and `Idle` active. Three checks can only be settled in Blender and are part of the gate: both actions export under their exact names (fall back to `NLA_TRACKS` if not); `Idle` reads back as 121 keys / 4.0 s; no channel held at a non-rest value is dropped.

### 14.4 Asset versioning (D17, user decision U1, 2026-10-19)

**The FEATURE-005 assets are immutable during FEATURE-012.** `Project/Frontend/public/models/avatar/avatar-base.glb` and `assets/blender/feature005/avatar-gear-studio.blend` (with its `.blend1`, evidence, and previews) are the rollback baseline: never overwritten, renamed, deleted, re-exported into, or opened for editing in Blender. They are not committed now; whether 3D binaries are later tracked in Git or Git LFS is a separate decision after FEATURE-012 passes QA.

- **Baseline record (lead, before Blender opens anything):** path, size, and SHA-256 of the original GLB and `.blend`, written to the FEATURE-012 checkpoint and to `assets/blender/feature012/evidence/baseline.json`. The GLB SHA-256 must equal the 005 Asset Gate value.
- **Working source:** a filesystem copy of the 005 `.blend` at `assets/blender/feature012/avatar-gear-studio-ready-to-go.blend`, made before Blender opens it. Only this copy is opened and saved. (If the 005 `.blend` were missing or unusable, the original GLB would be imported, unchanged, and the import saved as this new file.)
- **Export:** to a new file, `Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb`. Never to the original path.
- **Frontend switch:** only after the asset gate passes, `avatarManifest.avatar.model` changes from `models/avatar/avatar-base.glb` to `models/avatar/avatar-base-ready-to-go.glb`. `avatarManifest.version` stays 1: the new path is a new URL, so no browser holds a stale copy, and the gear GLBs are not re-downloaded. `requiredNodes` stays the same; `ready_to_go` is **not** a required node.
- **Rollback** is one line: the model path back to `models/avatar/avatar-base.glb`. No binary restoration. With `readyClip` set and the clip absent, the runtime reports `none` and every save reaches the static completion (D11), so a rollback of the asset alone is safe.
- **No other binary copies:** the original plus one FEATURE-012 working `.blend` and one versioned GLB. No rollback copy is made.
- Checkpoint rollback record: original path and SHA-256, working `.blend` path, new GLB path and SHA-256, and the manifest reference changed from / to.
- Why not a separate animation-only GLB: it would add a request, a failure path, and name-based retargeting to save about 40 kB.

### 14.5 Paths

| What | Path |
|---|---|
| Baseline (read-only) | `Project/Frontend/public/models/avatar/avatar-base.glb`; `assets/blender/feature005/**` |
| Working Blender source | `assets/blender/feature012/avatar-gear-studio-ready-to-go.blend` (a copy of the 005 `.blend`) |
| Evidence | `assets/blender/feature012/evidence/` (`baseline.json`, the 005 evidence file types, and `ready-to-go-checks.json`: per-frame pole-tip heights and travel, foot drift, `Hips` offset, `Spine`/`Chest` angles, end-equals-rest difference, `Idle` equality) |
| Previews | `assets/blender/feature012/previews/<loadout>_<angle>_t<seconds>.png` (A.5) |
| Output | `Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb` (new file) |

### 14.6 Asset gate (lead, before integration)

The lead checks, before `frontend` starts: the read-back report (node, joint, mesh, material, slot equality; two animations with exact names; `Idle` equality), `ready-to-go-checks.json` within the A.2 limits on every frame, the A.5 renders for L0, L1, L5, L6, L7, L8, L9, the round-trip renders from the exported GLB, gear SHA-256 unchanged, the original `avatar-base.glb` and 005 `.blend` SHA-256 unchanged against the baseline record, and the size. The read-back compares the new GLB against the original: scale, origin, hierarchy, bone and node names used by the frontend, materials, `Idle`, the four slot anchors, and the `Wear_*` variants. The only added capability is `ready_to_go`.

### 14.7 FEATURE-005 contract clauses superseded

Re-exporting the frozen avatar touches 005 clauses that assumed one clip. FEATURE-012 supersedes them for the avatar asset; the 005 specification itself is **not edited** (closeout note only, §22):

- 005 §23.4 and §24.2: the avatar holds two actions / two animations.
- 005 §27.2 animation row, AC-30, §21.6, §32 "bones that do not move": apply to `Idle`; `ready_to_go` is governed by A.2.
- 005 §25 manifest schema: gains optional `avatar.readyClip: string | null`; `avatar.model` points to the versioned GLB.
- 005 AC-24 (no extra files under `public/models/`): the original `avatar-base.glb` stays beside `avatar-base-ready-to-go.glb` as the rollback baseline (user decision U1).
- 005 §28.3 viewer interface: gains `readyCue` (in) and `readyClip` (status out).
- 005 "Not used … celebratory effect" (line 1104): FEATURE-012's completion clip is the single exception.
- 011 §14.3 "No animation … or 3D (FEATURE-012)": superseded by this feature.

### 14.8 Contract amendments at stage B (lead, 2026-10-19)

`three-d` validated the contract against the working `.blend` (read-only) and measured the pole response per degree of pose rotation. These decisions complete the contract; they bind over Appendix A where the two differ. Product intent (§9 beats, 4.0 s, end on rest, gear attached, no root motion) is unchanged.

- **G1 Poles bind the choreography.** Measured: about 8–24 mm of tip travel per 1° of any torso or arm rotation; 6° of elbow flexion moves a tip 112 mm. Therefore: (a) while a tip is within 10 mm of the ground, torso and arm rotations cancel at the tip (in the gear check, `LowerArm_*` flexion matches `Spine` flexion about 1:1); (b) tips leave the ground only in the shrug: `Shoulder_*` raised ≤ 4° with `UpperArm_*` counter-rotated to keep its direction relative to `Chest` (about 11 mm near-vertical lift); `Chest` tilt and the roll-back happen only while both tips are ≥ 10 mm up and return before set-down; (c) the `UpperArm_*` limits (toward body ≤ 2°, away ≤ 6°) are measured as the change of the bone's direction relative to `Chest`. The A.2 per-bone figures are maxima; the pole rules bind first. **W2 is withdrawn** (a hip shift with tips down cannot meet AC-19); the clip is W1. AC-18's W2 clause no longer applies.
- **G2 Channels.** F-curves only on `pose.bones[<allowed bone>].rotation_quaternion` and `pose.bones["Breath"].location`; no scale, Euler, or other location channels. Keys on frames 1 and 121 (the exported range is the key range). F-curves whose value never changes are deleted before export, so every exported `ready_to_go` channel has 121 samples over 0.0–4.0 s (AC-07).
- **G3** Fake user on both actions (§14.2).
- **G4 No `.blend1`.** The user's preferences save a `.blend1` on every save, and the user approved no extra binary copies. Around each save of the working file, `three-d` sets `preferences.filepaths.save_version = 0` and restores the previous value immediately after, in the same script, so nothing persists. Any `avatar-gear-studio-ready-to-go.blend1` that appears anyway is a by-product of this cycle and is removed by `three-d`. The 005 `.blend1` is never touched.
- **G5** Manifest: `version` stays 1 (§14.4, §15).
- **G6 `ready-to-go-checks.json`.** Computed in Blender on frames 1–121 (t = (frame − 1) / 30), one entry per frame, then a per-metric summary (max, frame, limit, pass) and `all_pass`:
  - angles: each limited bone relative to its parent vs rest; Neck+Head pitch/yaw as `Head` relative to `Chest`; elbow and wrist as `LowerArm_*`/`Hand_*` angles; upper arm per G1(c); `Shoulder_*` raise + roll ≤ 4° and never below rest; `Breath` as offset length;
  - pole tips: height = lowest vertex of the evaluated pole (0–60 mm); travel = that vertex's horizontal path per continuous run below 10 mm (≤ 10 mm per run);
  - feet: `Foot_*` and `Toes_*` head drift ≤ 2 mm, rotation ≤ 0.5°; `Hips` offset and rotation (0 under W1);
  - clearance (no new penetration): for each pair, vertices of one mesh outside the other's closed volume at rest but > 1 mm inside at a frame = 0 on every frame. Pairs: each pole vs legs, shoes, boots, the three torso garments, the other pole; `Avatar_Hands` vs torso garments and `Gear_Backpack`; `Avatar_Head` vs `Wear_WarmLayer_Collar` and `Wear_Shell`; `Avatar_Hair_*` vs `Wear_Shell`;
  - pack seat: `Gear_Backpack` vertices within 30 mm of each torso garment at rest keep their signed distance within −8 / +5 mm of the rest value (adopted from 005 §20.3);
  - frames 1 and 121 equal rest within 0.0001; `Idle` F-curves unchanged and GLB values within 0.0001.
- **G7 What the renders prove.** A.5 checks 1–5 are judged on the renders; check 6 (no snap) by the numeric start/end-equals-rest result plus the browser crossfade at QA; check 7 (calm motion) from the 9-frame sequence and the browser. AC-17 reads accordingly.
- **G8 Previews.** `<loadout>_<angle>_t<seconds>.png`, e.g. `L8_q3_t1.5.png`; frame = 30t + 1; angles per 005 §26.3 (front 0°, q3 30°, side 90°, back 180°) and its render settings; round-trip renders `RT-<loadout>_<angle>_t<seconds>.png` from the exported GLB plus the three gear GLBs on `#808080`. Render output paths are absolute per render; `render.filepath` is restored before any save.
- **G9** A.3 "Preserved exactly" is checked on the new GLB (§14.1).
- **G10 Geometry identity.** In the GLB read-back, every non-animation accessor (mesh, skin, inverse bind matrices) of the new GLB is byte-identical to the original's.
- **Export safeguards.** Every export passes all 108 recorded 005 exporter options plus an explicit absolute `filepath`, asserted equal to the versioned GLB path and outside `feature005` and `avatar-base.glb`; before export the file's actions are exactly `{Idle, ready_to_go}`; the baseline SHA-256 set (original GLB, 005 `.blend`/`.blend1`, gear GLBs) is re-hashed before and after every export and save. Saves use `save_mainfile` to the working path only, after asserting `bpy.data.filepath`; the 005 CA12 state (all visible, pose cleared, frame 1, `Idle` active) is restored before every save.
- **Live session.** The working `.blend` may be loaded into the running Blender (`open_mainfile(load_ui=False)`) only if `bpy.data.filepath` is empty and the scene holds only the default Camera, Cube, and Light; otherwise `three-d` stops and reports.

## 15. Frontend Integration

**Where things live** (FC §10 dependency rules hold; no new cross-feature edge):

| Concern | Location |
|---|---|
| Orchestration (`celebrate()`, cue counter, latest-status ref, timers) | new `features/loadout/hooks/useReadyToGo.ts` (`loadout` already imports `avatar` and `plans`) |
| Phase machine, copy, focus, announcements, 6 s ceiling | `features/plans/components/FinishPreparation.tsx`, `features/plans/content.ts` |
| Passing `celebrate`, `silence`, and the cue | `features/loadout/components/GearStudioScreen.tsx`, `StudioStage.tsx` |
| Viewer API and status | `features/avatar/AvatarViewer.tsx`, `viewerTypes.ts`, `viewerStatus.ts`, `runtimeTypes.ts`, `index.ts` |
| Clip lookup, playback, crossfades, frames | `features/avatar/runtime/AvatarStage.ts`, `RuntimeController.tsx`, `AvatarRuntime.tsx` |
| Clip name and model path | `features/avatar/avatarManifest.ts` (`readyClip: "ready_to_go"`, `avatar.model` → `models/avatar/avatar-base-ready-to-go.glb`, `version` stays 1; §14.4) |

**Phases** (`data-finish-phase`): `idle` → `saving` → `celebrating` → `complete`, or `saving` → `failed` → (`Try again`) `saving`. The `celebrating` phase lasts from save success until `celebrate()` resolves (≤ 5 s, ceiling 6 s).

**D18. Gear controls stay enabled during the clip.** Visibility is a pure function of the equipped set and gear follows its slot, so equipping or unequipping during playback is safe; disabling controls would also break 005's rule that no viewer state disables, hides, or delays a gear control. A change made during the clip is applied immediately and does not affect the saved Plan (no snapshot, 011).

**Continue.** One prop of `FinishPreparation`, one literal at `GearStudioScreen.tsx:784` (already marked "the destination changes here only"). FEATURE-012 keeps `/home`; FEATURE-013 changes that line to `/plans`. FEATURE-012 creates no `/plans`.

**Cleanup.** Navigating away or activating Continue mid-clip is safe: the Plan is saved, `useReadyToGo` clears its timers and listeners on unmount, and the runtime's `dispose()` stops all actions and uncaches the root. `celebrate()` reads the latest viewer status from a ref, never a render closure. Re-entering the Studio starts with the idle only; the cue counter starts at the constructed value.

**Test seams.** `data-finish-phase` on the Finish section and `data-avatar-ready` on the viewer, read by QA only. No test-only code paths, query parameters, or globals.

**Estimate.** About +320 lines across 12 files (one new), no new dependency, no CSS file (the completion reuses the Studio's existing Finish classes), no route.

## 16. Accessibility

- Finish preparation, Try again, and Continue remain native controls, keyboard-operable (Enter / Space), with visible focus.
- During `celebrating`, the button keeps focus and reads "Plan saved" with `aria-disabled="true"`; activation does nothing.
- Announcements through the Studio's polite announcer: "Saving your plan." on submit (011); "Your plan is saved." once at save success (replaces the saving message); on failure the announcer is silenced so "Saving your plan." no longer lingers (fixes 011 accepted limitation B); the failure alert itself is unchanged.
- On `complete`, focus moves to the **Ready for the trail.** heading (`tabIndex=-1`, `aria-describedby` the saved line) **only if** focus is still inside the Finish section or on `body`. A user who moved on to a gear control keeps their focus.
- Success never depends on seeing the avatar: the announcement, the heading, and the saved line state it in text, with or without the clip, with or without WebGL.
- Reduced motion is honored (§13); Pause is honored (D12).
- The clip has no flashing, no camera motion, and no sound.

## 17. Performance

- No Blender, tool, or new library at runtime; no new animation library (three.js `AnimationMixer` only); no new request (the clip is inside the existing GLB).
- Asset size: the original is 630,128 B. The versioned GLB is estimated at +40 kB (at most +80 kB) for the clip, so about 0.67–0.72 MB, within the 1.5 MB avatar budget (005 §33). Acceptance ceiling: **≤ +120 kB** over the original (AC-29). Both sizes are recorded in the closeout.
- The new path downloads the avatar once per browser; the gear GLBs stay cached (no version bump). The original file stays on disk but is never requested while unreferenced.
- The avatar runtime and Studio remain lazy chunks; nothing new enters the entry chunk or the public `/` page.
- Frames: the clip renders only while it plays (on-demand frames); afterwards the existing idle loop alone runs, as today.

## 18. Test Strategy

There is no frontend test runner (CLAUDE.md), so validation is layered:

| Layer | Who | What |
|---|---|---|
| Asset gate | `three-d`, then the lead | Blender per-frame checks (`ready-to-go-checks.json`), GLB read-back, A.5 renders, gear SHA-256, size (§14.6) |
| Static | `frontend`, then the lead | `npm run build`, `npm run lint`; diff review against §21 (no forbidden imports, no backend, no dependency) |
| Browser | `qa` | Lean QA (§20) in a real browser with Playwright route interception for failure simulation: plan-service `503` / aborted, the versioned GLB path answered with the original `avatar-base.glb` bytes (missing clip), the GLB or runtime chunk aborted (viewer failure), `emulateMedia({ reducedMotion: "reduce" })`, a < 768 px viewport, CPU throttling, a hidden tab |

Observation points: the network log (exactly one `POST /api/plans`, its response before any `data-avatar-ready="playing"`), `data-finish-phase` transitions with timestamps, `data-avatar-ready`, the polite announcer text, `document.activeElement`, and console errors.

Repair cycles follow CLAUDE.md for 3D features: at most 2 asset repairs (`three-d`) and at most 2 frontend repairs, counted separately.

## 19. Acceptance Criteria

Priorities: **P0** blocks PASS; **P1** must pass in Lean QA unless the lead records a deferral; **P2** is observed when practical and never blocks.

**P0**

- **AC-01** No ready cue and no `data-avatar-ready="playing"` before `POST /api/plans` has returned `201` or `200`; the response timestamp precedes playback.
- **AC-02** A failed save (`503`, network abort, unconfirmed, past date, trail gone) never plays the clip and never shows the completion; FEATURE-011's failure message and Try again appear unchanged, the Studio stays usable, and nothing navigates.
- **AC-03** Exactly one `POST /api/plans` per Finish activation, including double-click and repeated Enter during `saving` and `celebrating`; playback, remounts, and viewer Retry never create a Plan.
- **AC-04** The avatar is the existing character, loaded from the versioned `avatar-base-ready-to-go.glb` (same scale and origin, 23 joints, 40 node names, 4 slots, 11 meshes, 12 materials as the original); no new character; the original `avatar-base.glb` and 005 `.blend` keep their baseline SHA-256.
- **AC-05** With L8 (all six visible items) and L9 (pack + poles), every equipped item stays attached and visible through the whole clip (A.5 checks 2–4 pass).
- **AC-06** `ready_to_go` plays exactly once per successful Finish; it never loops; afterwards `Idle` resumes and loops as before.
- **AC-07** The clip is 4.0 s (121 keys at 30 fps) in the GLB read-back, and in the browser the completion appears 3.8–5.0 s after playback starts at normal frame rates.
- **AC-08** Nothing navigates automatically; Continue exists only in `complete`.
- **AC-09** With the clip missing (v1 GLB), the viewer failed or absent (aborted GLB or chunk, no WebGL, < 768 px), a confirmed save reaches the completion ("Ready for the trail.", the saved line, Continue) within 1.5 s; no Plan error and no animation error is shown.
- **AC-10** Under `prefers-reduced-motion: reduce` the clip never plays and the completion appears without character motion.
- **AC-11** Continue navigates to `/home`; the destination is one value at one place in `GearStudioScreen.tsx`.
- **AC-12** Existing Studio behavior is unchanged: equip, unequip, Add gear, Gear Readiness, idle, Pause / Play, reduced motion, viewer error and Retry, < 768 px layout, and Finish's FEATURE-011 states.
- **AC-13** No backend change: nothing under `Project/Backend/` changes; the only Plan call is `POST /api/plans` with the 011 body.
- **AC-14** The re-exported GLB preserves §14.1 exactly: `Idle` unchanged within 0.0001; gear GLBs keep their 005 SHA-256.
- **AC-15** No `/plans` route, calendar, Plan list/read/delete call, Memory change, or new dependency (`package.json` and the lockfile unchanged).

**P1**

- **AC-16** Idle → `ready_to_go` and `ready_to_go` → Idle crossfade over 0.25 s; no visible snap at the start or the end.
- **AC-17** The A.5 renders for L0, L1, L5, L6, L7, L8, L9 pass checks 1–5, and checks 6–7 pass as §14.8 G7 assigns them; in the browser L0 and L8, poles on and off, show no gross clipping.
- **AC-18** `Root` is never keyed; feet drift ≤ 2 mm on every frame; the avatar stays centred on its ground shadow; `Hips` is unkeyed (W1; W2 withdrawn, §14.8 G1).
- **AC-19** Pole tips stay 0–60 mm above the ground on every frame, travel ≤ 10 mm while within 10 mm of the ground, and never intersect a leg, boot, torso, or the other pole.
- **AC-20** If the clip never reports playing within 1 s, or never finishes (hidden tab mid-clip, throttled CPU), the completion appears no later than 5.0 s after the cue and 6.0 s after save success.
- **AC-21** Pause at save success skips the clip; Pause during the clip completes the UI at once; Play resumes the remainder, then the idle.
- **AC-22** Announcements: "Your plan is saved." exactly once on success; "Saving your plan." does not linger after a failure; the failure alert is announced as in 011.
- **AC-23** Focus: during `celebrating` focus stays on the `aria-disabled` "Plan saved" button; on `complete` it moves to the heading only if it was in the Finish section or on `body`; Continue is reachable by keyboard.
- **AC-24** All completion copy is text, calm, and outdoor-planning in tone; no "mission", "level", "achievement", or similar game copy.
- **AC-25** At 1440×900, 1920×1080, and 1024×768 the Finish row and completion fit the gear zone with no horizontal scroll and no overlap with the Stage; below 768 px the static completion appears.
- **AC-26** Navigating away or activating Continue mid-clip produces no console error or warning; returning to the Studio shows the idle only, with no replay.
- **AC-27** Viewer Retry, a remount, and React StrictMode double effects never replay the clip.
- **AC-28** Equipping or unequipping during the clip raises no error; the change appears at once and stays attached; the saved Plan is unaffected.
- **AC-29** `avatar-base-ready-to-go.glb` is at most 120 kB larger than the original and within the 1.5 MB avatar budget; both sizes are recorded.
- **AC-30** `avatarManifest.avatar.model` is `models/avatar/avatar-base-ready-to-go.glb` and the Studio requests that path (not `avatar-base.glb`); a cold load receives the new clip; the checkpoint records the rollback reference.
- **AC-31** `npm run build` and `npm run lint` pass.

**P2**

- **AC-32** With 4× CPU throttling the completion still appears within 6 s and the motion remains acceptable.
- **AC-33** Unusual combinations (shell + headlamp + poles without a pack; warm layer + boots only) show no gross clipping.
- **AC-34** Safari (WebGL 2) plays the clip and reaches the completion, if Safari is available.

## 20. Lean QA

Lean QA, about 5–10 minutes, Playwright (or Chrome DevTools MCP), one signed-in account with owned backpack, poles, headlamp, and one wear item. No Full Regression.

1. Sign in; open a curated trail; choose a date; Trip Preparation; **Gear up** to the Studio (1440×900).
2. Equip backpack + poles + one wear item (L9-like). Confirm idle runs.
3. Activate Finish preparation (also double-click). Network: exactly one `POST /api/plans` → `201`. *(AC-01, AC-03)*
4. Timestamps: the response precedes `data-avatar-ready="playing"`; phases `saving → celebrating → complete`. *(AC-01)*
5. Watch the clip once: gear stays on, poles in the hands, no snap; completion 3.8–5.0 s after start; idle resumes. *(AC-05–AC-07, AC-16)*
6. Completion copy, announcement, focus; Continue → `/home`. *(AC-11, AC-22–AC-24)*
7. Back to the same trip with Gear Readiness < 100 % (unequip / different trip); Finish → `200` or `201`; the clip plays once again. *(AC-06)*
8. Route `/api/plans` to `503`: failure + Try again, no clip, no completion, no navigation. *(AC-02)*
9. Answer the versioned GLB path with the original `avatar-base.glb` bytes (clip missing): static completion within 1.5 s, no error. *(AC-09)*
10. `emulateMedia` reduced motion: no clip, immediate completion. *(AC-10)*
11. Equip during the clip; Continue mid-clip on a second run; console clean. *(AC-26, AC-28)*
12. Quick visual at 1920×1080 and 1024×768; one < 768 px check. *(AC-25)*
13. Build and lint. *(AC-31)*

Asset-side criteria (AC-04, AC-14, AC-17–AC-19, AC-29, AC-30) are verified at the asset gate (§14.6) and spot-checked in step 5.

## 21. Future Write Scope

**Production (frontend, after the asset gate), `Project/Frontend/src/`:**

- `features/plans/components/FinishPreparation.tsx`, `features/plans/content.ts`
- `features/loadout/hooks/useReadyToGo.ts` (new), `features/loadout/components/GearStudioScreen.tsx`, `features/loadout/components/StudioStage.tsx`
- `features/avatar/avatarManifest.ts`, `AvatarViewer.tsx`, `viewerTypes.ts`, `viewerStatus.ts`, `runtimeTypes.ts`, `index.ts`, `runtime/AvatarRuntime.tsx`, `runtime/RuntimeController.tsx`, `runtime/AvatarStage.ts`
- Minimal CSS only if the completion needs it, inside the Studio's existing stylesheet.

**Assets (`three-d`, Blender MCP, after the baseline record):**

- create `assets/blender/feature012/**` (the working `.blend` copy, evidence, previews);
- create `Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb`.
- Read-only: `Project/Frontend/public/models/avatar/avatar-base.glb`, `Project/Frontend/public/models/gear/**`, `assets/blender/feature005/**`.

**Not authorized:** `Project/Backend/**` (plan, recommendation, trail, memory, user services), the Plan schema or API, `/plans`, a calendar, Plan reads, `features/memories`, the gear GLBs, `assets/blender/feature005/**`, the camera, the Studio background or environment, materials, lighting, new dependencies. `ui-ux`: SKIP (no new page; the completion reuses the Finish row's existing design language). `backend-api`: SKIP.

Feature cycle: lead (baseline record) → `three-d` asset production → lead asset gate → `frontend` → lead diff review → Lean QA → product gate.

## 22. Documentation Follow-ups

At closeout (not now):

- `docs/FRONTEND_CONTEXT.md` §8 (Gear Studio: the clip, cue, status, completion phases, D11 fallback), §9 (FEATURE-012 delivered; FEATURE-013 changes Continue), §10 (`useReadyToGo`), §1 status table.
- `docs/PRODUCT_REQUIREMENTS.md` §11.1 (completion copy and the Ready-to-Go clip as current behavior), §11.2 and §22 (FEATURE-012 PASS / FROZEN, FEATURE-013 next), §19 table wording if needed.
- `CLAUDE.md` roadmap lines.
- `docs/DESIGN_SYSTEM.md` only if the completion state becomes a reusable pattern.
- A short dated note in 005 and 011 pointing to §14.7 of this spec, **only if the user approves** touching frozen specs; otherwise this spec alone records the supersession.
- Checkpoint `.claude/state/features/012-ready-to-go-3d-completion.md`; the asset sizes before and after.

## 23. Product Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | Reuse the existing avatar? | **Yes**, `avatar-base.glb` |
| Q2 | Reuse the existing rig? | **Yes**, confirmed by inspection (§6) |
| Q3 | Usable skeleton? | **Yes**: one skin, 23 joints, no constraints |
| Q4 | Existing clips? | **`Idle` only** (4.0 s, 3 channels) |
| Q5 | How is gear attached? | Rigid GLBs under bone-parented `Slot_*` nodes (pack, poles, headlamp); skinned `Wear_*` variants (shell, warm layer, boots) |
| Q6 | Blender required? | **Yes**, outcome A (D1) |
| Q7 | Clip name | **`ready_to_go`** |
| Q8 | Length | **4.0 s** (121 frames at 30 fps) |
| Q9 | Camera movement | **None** (D7) |
| Q10 | Root motion | **None** (W1); a gated ≤ 10 mm hip shift only if checks pass (D5) |
| Q11 | Gear visible during the clip | **Yes** |
| Q12 | Animations per equipment | **No**: one clip for all combinations (D6) |
| Q13 | Save before animation | **Yes, mandatory** (D10) |
| Q14 | Animation failure blocks the Plan | **No** (D11) |
| Q15 | Reduced motion | **Skip the clip**, immediate completion (D16) |
| Q16 | Skip button | **No** (D14) |
| Q17 | Final animation state | **Return directly to Idle** by a 0.25 s crossfade; the end pose equals rest (D3, D9) |
| Q18 | Continue destination | **`/home`**, temporary |
| Q19 | Create `/plans` | **No** |
| Q20 | Backend change | **No** |
| Q21 | New JS dependency | **No** |
| Q22 | New character or model | **No** |
| Q23 | Replace or version the asset | **Versioned copy** `avatar-base-ready-to-go.glb`; original immutable; rollback = one manifest path (D17, U1) |
| Q24 | FEATURE-013 integration | Change Continue's one destination value to `/plans`; nothing else |
| — | Hand-on-strap gesture | **No**; shoulder shrug into the straps (D4) |
| — | Pause | Skip at save success; completes the UI if pressed mid-clip (D12) |
| — | Gear controls during the clip | **Enabled** (D18) |
| — | Completion copy | Heading **"Ready for the trail."** (replaces FP7 "Preparation complete"); body FP8–FP11 unchanged ("Your plan for … has been saved." / "is already saved."); announcement **"Your plan is saved."**; button during the clip **"Plan saved"** |

## 24. Blockers / Approval Items

No technical blocker. All items decided by the user on 2026-10-19: U1 as below (versioned copy), U2–U7 accepted as recommended.

- **U1 — RESOLVED: versioned copy.** The FEATURE-005 avatar GLB and `.blend` are immutable; FEATURE-012 works on `avatar-gear-studio-ready-to-go.blend` and exports `avatar-base-ready-to-go.glb`; the frontend switches its reference only after the asset gate; rollback is the reference alone (§14.4). Nothing is committed or pushed; Git / Git LFS tracking of 3D binaries is decided after FEATURE-012 passes QA.
- **U2: drop rule.** If `ready_to_go` still fails the asset gate after 2 asset repairs, keep the original GLB reference (`readyClip: null`) and ship the static completion (D15). **Accepted.**
- **U3: completion copy.** Heading "Ready for the trail." replacing "Preparation complete"; body unchanged; announcement "Your plan is saved."; button "Plan saved" during the clip. **Accepted.**
- **U4: Pause and gear controls.** Skip the clip when paused (D12); keep gear controls enabled during the clip (D18). **Accepted.**
- **U5: root motion.** W1 (no hip motion) by default, W2 only if the lead accepts it at the asset gate (D5). **Accepted.**
- **U6: FEATURE-005 / FEATURE-011 supersession.** Record the superseded clauses in this spec only (§14.7) and leave the frozen specs unedited, adding a pointer note at closeout only if approved. **Accepted.**
- **U7: small FEATURE-011 polish carried in.** Silencing the announcer on failure (fixes 011 limitation B) and the conditional focus rule. **Accepted**; both are inside files FEATURE-012 already changes.

## 25. Closeout (Product Gate, 2026-10-20)

**Status: IMPLEMENTED — PASS / FROZEN.** Accepted by the user at the Product Gate. Lean QA PASS, repair cycles 0 / 2. Checkpoint: `.claude/state/features/012-ready-to-go-3d-completion.md`.

**Final behavior.** Finish preparation → `POST /api/plans` → confirmed `201`/`200` → "Plan saved" and the announcement "Your plan is saved." → `ready_to_go` plays once (4.0 s, 0.25 s crossfades from and back to `Idle`) → **Ready for the trail.** with the saved line and **Continue** (`/home`, until FEATURE-013). A failed save keeps FEATURE-011's failure state and Try again, with no animation. After a successful save, an animation or avatar that cannot play (clip missing, model failed, viewer below 768 px, reduced motion, Pause) skips the clip and shows the same completion; the Plan is unaffected and Continue stays available. The completion copy states success on its own; the animation is not needed to understand it.

**Accepted motion.** A visible glance down at the gear, a subtle shoulder preparation, a restrained ready posture, about 4 seconds, ending on the rest pose. Accepted as final; no larger gesture and no other variant.

**Equipment-safety constraint (not a defect).** `three-d` measured that larger torso and arm motion slides the trekking-pole tips (8–24 mm per degree; tips 2 mm above the ground), and that the optional hip shift could not keep them still. The motion plan was constrained accordingly and W2 withdrawn (§14.8 G1). Asset Gate: pole-tip skate ≤ 1.35 mm per run, feet and hips static, no new penetrations, pack seat within −8/+5 mm on all 121 frames.

**Accepted limitation.** The movement is subtle, especially the shoulder adjustment. A first-time viewer may mainly perceive "the avatar looks down, checks the gear, and gets ready" rather than a distinct backpack-strap pull. This is acceptable.

**Assets (U1, versioned copy).**

| | Path | SHA-256 |
|---|---|---|
| Original avatar (immutable, rollback baseline) | `Project/Frontend/public/models/avatar/avatar-base.glb` (630,128 B) | `50b58cd3e285307c2433a6e78da27aa93f11c0058ea77e32e781e632ff235efb` |
| Original Blender source (immutable) | `assets/blender/feature005/avatar-gear-studio.blend` | `521e74ad3f46b8ef80655f0a1aedd25c164793010cdd9f4f87abf33086217dc6` |
| Production avatar | `Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb` (653,396 B) | `50cb78a865011fae2d18f94dec5410f1a9c39545d661c5277aec21bcec31f016` |
| Working Blender source | `assets/blender/feature012/avatar-gear-studio-ready-to-go.blend` | `76cbb38e92e7bedd5e74e63e06ab8481fa5375b3fd1fe72a7ab25e0862977201` |

Frontend reference: `avatarManifest.avatar.model` changed from `models/avatar/avatar-base.glb` to `models/avatar/avatar-base-ready-to-go.glb`; `version` stays 1. **Rollback:** set `avatar.model` back to `models/avatar/avatar-base.glb`; no binary restoration (that file has no `ready_to_go`, so every save reaches the static completion). Nothing committed or pushed; whether `.glb`, `.blend`, and preview renders are tracked in Git or Git LFS is a separate repository decision.

**Verified (Lean QA and gates).** One Plan save per Finish action; animation only after save success; about 4 s (4,007–4,035 ms) and once; completion copy, focus, and a single announcement; save failure → no animation; missing-clip, reduced-motion, and avatar-load fallbacks; no replay after reload, back-navigation, or viewer Retry; gear changes during and around the completion; 1440×900, 1920×1080, 1024×768, and 390 px; build and lint PASS; Asset Gate PASS; Integration Gate PASS.

**Deferred / not run** (not passed; FEATURE-012 is not reopened for them): every visible equipment combination in the browser (all six visible items checked in Asset Gate renders only); hidden-tab behavior during the clip; uncommon Plan-save failure variants (network abort, unconfirmed, past date, trail gone); Safari; a real screen reader; physical phones.

**QA data.** The QA account `otc-qa-012-d5015c` and its gear items and Quarry Rock Plans remain; no cleanup is required to close the feature.

---

## Appendix A — three-d Inspection and Proposals

### A.1 Blender requirement: **A**, add one action to the existing rig in Blender

- **The rig is usable as it is.** The 23 named bones and the skin are already there. The weights held up in the stride stress pose (§6.3), and every gear item already follows its bone (§7.2).
- **What is missing is the motion itself.** `Idle` moves three bones by less than a degree, with no arm or torso data. So no existing clip can stand in for the gesture, which rules out **B**.
- **The motion should not be authored in code.** Procedural bone rotations in the runtime would put pose numbers in `Project/Frontend/src/`, which 005 §22.6 forbids for avatar parts. The motion would also skip the per-frame pole, foot, and pack checks below, which need the evaluated mesh. That is a second reason against **B**.
- **Nothing blocks the work**, so **C** does not apply.
- **The scope is small.** It is one new action. There are no new bones, no change to meshes or weights, no gear change, and no re-export of the gear GLBs.

### A.2 `ready_to_go` adapted to the real rig

**Duration and loop.** The clip is **4.0 s: 121 frames at 30 fps, frames 1–121, played once.** This is the existing scene range (005 §23.2) and the same length as `Idle`. Matching that range removes the risk that `export_frame_range=True` clips a longer action. 4.0 s is within the brief's "~4 s, max 5 s".

**Gestures.** The brief's timings are rescaled to 4.0 s.

| Time (frames) | Bones | Intent |
|---|---|---|
| 0.00–0.50 (1–16) | `Breath`, `Neck`, `Head` | Settle: a small inhale; the head starts to tip down. Everything else stays at rest |
| 0.50–1.50 (16–46) | `Neck`+`Head` pitch down (≤ 12° combined), yaw ≤ 10° toward one hand and back; `Spine` flexion ≤ 2°; `LowerArm_L/R` flexion 0 → ≤ 6°; `Hand_L/R` ≤ 5° | Gear check: a glance down at the hands and feet. Superseded by §14.8 G1: forearm flexion cancels the `Spine` flexion at the pole tips, which stay planted |
| 1.50–2.50 (46–76) | `Shoulder_L/R` raise ≤ 4° with a slight roll back, then release; `Breath` inhale; `Chest` ≤ 1° | Pack settle: the shoulders shrug into the straps. This replaces the hand-on-strap gesture (feasibility below) |
| 2.50–3.30 (76–100) | `Neck`/`Head` return to level; `Spine` returns to 0 (extension ≤ 1°); `Breath` exhale; forearms ease back | Look forward and straighten |
| 3.30–4.00 (100–121) | All animated bones settle to rest; optionally the W2 hip shift below | Ready stance. The clip ends on rest |

**End pose.** At frame 121, every channel equals its rest value within 0.0001, which is the same rule as `Idle` (005 §27.2, CA10).

- The rest pose is already the upright, arms-relaxed stance.
- It equals `Idle` frame 0, so a crossfade back to the idle is invisible.
- It equals the reduced-motion pose, so the final picture is the same with or without motion.
- A held pose that differs from rest would snap or blend back as soon as `Idle` resumes. Holding it alongside `Idle` would halve the idle amplitude on `Neck`/`Head`, because three.js averages two full-weight actions.

**Root motion and feet.** The two hip options:

- **W1 (preferred):** no channel on `Root` or `Hips`, and none on any leg bone. The feet are planted by construction.
- **W2 (optional, gated):** a `Hips` shift of at most 10 mm sideways, within ±2 mm vertically, and at most 1.5° of roll or yaw, returning to rest by 4.0 s. The legs are counter-rotated with FK. `Foot_*` and `Toes_*` world positions must not drift more than 2 mm, or rotate more than 0.5°, at any frame.

In both options `Root` is never keyed.

**Backpack strap gesture: not feasible as hand-on-strap.**

- The straps are rigid parts of `Gear_Backpack` on `Slot_Back` (§7.2), at about 1.3 m on the chest front.
- The hands rest at 0.95 m, 0.44 m out to the side.
- Reaching the strap needs about 90° of elbow flexion plus adduction. With poles equipped, that turns each 0.96 m pole near horizontal through the legs, the torso, or the other pole.
- Hiding the poles would break the P0 rule, and two clips would break "one clip for all combinations".
- **The substitute is the shoulder shrug into the straps above.** It reads as settling the pack, and without a pack it reads as a shoulder roll.

**Poles.** One clip must work with and without them. Rules for every frame:

- Both pole tips (the lowest vertex of each pole) stay between 0.000 and 0.060 m above the ground.
- While a tip is within 10 mm of the ground, it travels at most 10 mm horizontally, so there is no skating.
- No pole intersects a leg, a boot, the torso, or the other pole.
- Arm limits:
  - **Upper arm:** no motion toward the body beyond rest (2° at most); at most 6° away from it.
  - **Elbow:** flexion at most 10°.
  - **Wrist:** at most 8°.
  - **Compensation:** any torso motion that lowers a hand is offset by that side's forearm.

**Torso and pack.**

- `Chest`: at most 1° on any axis.
- `Spine`: at most 3° of flexion, 2° of side bend, and 5° of yaw.
- `Breath`: at most 6 mm of translation, within the 8 mm breathing budget for the straps.
- `Hips` and the hip belt move together, so a W2 shift does not move the belt against the waist.

**Headlamp and neck.** The headlamp needs nothing of its own. Head and neck pitch down at most 12° combined, which protects the chin from the collar and the shell's neck. The head does not tilt back more than 3° past rest, which protects the hair from the hood.

**General.** No scale channels and no keys on slot nodes.

### A.3 GLB compatibility and export

**Preserved exactly in `avatar-base.glb`** (005 §24.2; checked on the new `avatar-base-ready-to-go.glb` against the original, §14.1):

- the 40 node names and the hierarchy, including the 23 joints and the 4 `Slot_*` nodes with their parents and rest TRS;
- the 11 skinned meshes, including every `Wear_*`;
- the 12 materials and their `baseColorFactor`;
- one skin;
- `Avatar_Root` at identity, scale 1, origin between the feet, soles at y 0.

**`Idle` is unchanged:** 121 keys over 4.0 s on `Breath`, `Neck`, and `Head`, with every value equal to the current file within 0.0001. The gate compares the new file against the current `glb-readback.json`.

**One addition:** `animations` gains `ready_to_go`, so the file has two animations. The name matches the 005 §23.3 name rule.

**Gear GLBs** are not re-exported. Their SHA-256 must still equal the 005 `sha256.txt`.

**Contract amendments needed (the lead records them):**

- 005 §23.4: the file holds exactly two actions.
- 005 §24.2: the animation count is 2.
- 005 §27.2 animation row and AC-30: they apply to `Idle`. `ready_to_go` gets the A.2 limits.
- 005 §21.6 and §32: "bones that do not move" applies to `Idle` only.
- 005 §25 schema: a new manifest field, for example `avatar.readyClip: 'ready_to_go' | null`. It must not be added to `requiredNodes`.

**Export.** Use the same options as 005 §23.6, recorded in `evidence/exporter-options.txt`:

- `export_animation_mode='ACTIONS'`, `export_force_sampling=True`, `export_frame_step=1`;
- `export_frame_range=True`, `export_anim_slide_to_zero=True`;
- `export_optimize_animation_size=True`, `export_optimize_animation_keep_anim_armature=False`;
- `export_rest_position_armature=True`, `export_reset_pose_bones=True`, `export_apply=True`, `export_yup=True`.

Export only the 17 `F005_Avatar` objects, with the pose cleared, the frame at 1, and `Idle` as the active action.

The new action must be:

- bound to the `Avatar_Armature` slot;
- given `use_fake_user=True`, because an action with no user is dropped when the file is saved;
- keyed with FK only. Any temporary IK used while posing is baked to FK keys and removed before the pre-export save, because 005 §23.4 forbids constraints.

**Checks that need Blender (cannot be settled from the files).** These are implementation-time checks:

1. Blender 5.2.2's `ACTIONS` mode exports both slotted actions with their exact names. If not, fall back to `NLA_TRACKS` (005 §23.6).
2. `Idle` still reads back as 121 keys and 4.0 s.
3. With `keep_anim_armature=False`, a bone held constant at a non-rest value would be dropped, and three.js would show rest instead. This is avoided because every bone starts and ends at rest. The check compares Blender's evaluated pose at sampled frames with the read-back values.

**Size.** The clip adds an estimated **+40 kB, and +80 kB at most**:

- `Idle` is 5,808 B: a 484 B shared time track, plus 1,452 B per translation channel and 1,936 B per rotation channel at 121 keys.
- With about 19 rotation and 2 translation channels, `ready_to_go` comes to about 40 kB. If all 23 joints carried rotation and translation it would be about 78 kB. Add a few kB of JSON.
- The GLB would be about 0.67–0.72 MB, within the 1.5 MB budget (005 §33).

**Paths (proposed).**

| What | Path |
|---|---|
| Source | `assets/blender/feature012/avatar-gear-studio.blend`: a filesystem copy of the 005 `.blend`, made before Blender opens it. The 005 source, evidence, and previews stay frozen as the baseline |
| Evidence | `assets/blender/feature012/evidence/`: the five 005 file types, plus `ready-to-go-checks.json` (per frame: pole-tip heights and travel, foot drift, `Hips` offset, `Spine`/`Chest` angles, end-equals-rest difference, `Idle` equality) |
| Previews | `assets/blender/feature012/previews/<loadout>_<angle>_t<seconds>.png` |
| Output | `Project/Frontend/public/models/avatar/avatar-base.glb`, overwritten in place *(superseded by §14.4–§14.5: new file `avatar-base-ready-to-go.glb`; working source `avatar-gear-studio-ready-to-go.blend`)* |

**K. Edit in place, with a version bump.** Overwrite `avatar-base.glb` under the same name and bump `avatarManifest.version` from 1 to 2. *(Proposal not adopted: the user chose a versioned copy, §14.4.)*

- The model path and `requiredNodes` stay the same.
- AC-24 already forbids extra files under `public/models/`. A versioned name (`avatar-base-v2.glb`) would therefore still mean deleting v1, and would change the path for no gain.
- A separate animation-only GLB would add a request, a failure path, and name-based retargeting to save about 40 kB. I reject it.
- The `?v=` key is global (`loadModel.ts:23`), so the bump also re-downloads the unchanged gear GLBs (about 143 kB) once. That is accepted.
- **Rollback precondition:** the current GLB is untracked (§6.1). Before the export, either the user commits the frozen FEATURE-005 assets (preferred), or the lead approves a byte copy at `assets/blender/feature012/rollback/avatar-base.v1.glb`. That copy would be outside `public/`, never served, and checked against the 005 SHA-256.
- **Drop rule**, following 005 §32: if the clip still fails the gate after one fix, `avatar-base.glb` ships unchanged at version 1, `readyClip` is `null`, and the completion state is static.

### A.4 Runtime notes (only what the 3D side requires)

**Finding the clip.**

- Look the clip up by its exact name, `ready_to_go`, in `gltf.animations`, and keep a reference at `setAvatar`. Today only `Idle` is kept (`AvatarStage.ts:188–200`).
- A missing clip means the static completion, not `avatar-invalid`.
- A mixer must exist even when `Idle` is absent. Today it is created only if `Idle` is found (`:193–194`). Use one mixer on `gltf.scene`.

**Playing it.**

- Set `LoopOnce` and `clampWhenFinished = true`, so the action holds its last frame, which is rest. Call `reset()` before each play, and play once per successful save.
- Fade from `Idle` into `ready_to_go` over **0.25 s** (0.2–0.3 s is fine).
- When the `finished` event fires (check `event.action`), fade back to `Idle` reset to time 0, also over 0.25 s. The poses are equal, so the fade is invisible.

**Frames.**

- `frame()` must keep returning `true` while the action runs, independently of `idlePlaying` (today's condition, `AvatarStage.ts:412`).
- Starting playback must call `invalidate()` once.
- `finished` is not fired while the tab is hidden or the canvas is off-screen (`RuntimeController.tsx:322`), and the clip runs slow below 20 fps. **The business UI must not wait on the event**; it needs a wall-clock fallback.

**Reduced motion and Pause.**

- Under reduced motion the clip is never played, and the avatar shows the rest pose, which is the same as the clip's end pose.
- Whether the Pause control applies to the clip is a product decision. Freezing on any frame is a valid pose.

**What stays the same.**

- No camera move.
- No transform numbers in the frontend.
- No change to how gear is attached, or to visibility, while the clip plays. Equip changes during playback stay safe because the visibility rule is a pure function of the equipped set.
- Disposal already covers a second action.

### A.5 Visual QA checklist

**Loadouts:**

| Code | Equipped |
|---|---|
| `L0` | none |
| `L1` | backpack |
| `L5` | poles |
| `L6` | headlamp |
| `L7` | warm layer + shell + pack, so the collar is visible |
| `L8` | all six |
| `L9` | backpack + poles |

**Frames:** 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, and 4.0 s.

**Angles:**

- `L8` at q3, side, front, and back.
- The others at q3 and side.
- Round-trip renders from the exported GLB of `L8` at 1.0, 2.0, and 4.0 s, at q3.

**In the browser** (lead and QA), at the default angle and after turning the view:

- `L0` and `L8`;
- poles on and poles off;
- reduced motion;
- the same tab, kept visible, through the whole clip.

**Checks:**

1. The hands and arms do not pass through the torso, the hip belt, or the sleeves. The shell cuff does not tear.
2. The backpack stays seated: no gap between the straps or belt and the torso, no belt sinking into the waist, and the pack body does not lift off the back.
3. The poles stay in the fists and the grips do not show through. The tips never go below the ground and do not skate. A pole never crosses a leg, a boot, or the other pole.
4. The headlamp band stays on the head. The chin does not enter the collar or the shell's neck. The hair does not enter the hood.
5. The feet do not slide, the soles do not lift, and the avatar stays at the origin, centred on the ground shadow.
6. There is no snap at the start (crossfade from `Idle`) or at the end (the end pose equals rest). The idle resumes smoothly and repeats.
7. The motion is calm and short, not theatrical.

### A.6 Implementation and QA risks

1. **No rollback for the assets.** The assets are untracked (§6.1). An in-place export destroys the only v1 GLB unless the A.3 precondition is met. *(Closed by §14.4: the original is never written.)*
2. **Gear can look wrong while staying attached.** Rigid gear moving against skinned surfaces (the hip belt, the straps, the pole tips) is the main visual risk. The limits in A.2 are estimates and are confirmed only by the per-frame checks and the renders.
3. **The poles constrain everything.** With tips 2 mm above the ground, every arm or torso motion must lift a tip rather than lower it, so the gesture's amplitude is necessarily small. If it reads as too subtle, the remedy is a product decision (for example a separate pole variant), not a bigger clip.
4. **The exporter may not behave as assumed.** It might drop or rename an action, clip the frame range, or optimise away a channel (A.3). The read-back of both clips decides.
5. **Changes to the FEATURE-005 contract.** Re-exporting a frozen asset reopens five clauses of 005 (A.3). AC-30 and the §27.2 animation row must be amended, or a re-run of the 005 gate fails.
6. **Runtime timing.** The idle-only mixer condition, the missing mixer when there is no `Idle`, `finished` not firing while hidden, and the 1/20 s step cap are all frontend items (A.4). They are listed so that a clip that "never ends" is not routed back to the asset.
7. **Cache.** Only the manifest bump busts the cache. Forgetting it serves the v1 GLB, with no `ready_to_go`, from the browser cache, which looks like a missing clip. *(Closed by §14.4: the new path is a new URL.)*

## Appendix B — frontend Inspection and Proposals

Method: read-only. I read the source under `Project/Frontend/src/`, §6, §7, Appendix A, FC §7, §8, and §10, 011 §13–§17, and the 005 rules cited below. Nothing was built, run, or installed. Paths are relative to `Project/Frontend/src/`.

### B.1 Today's Finish success flow, end to end

1. **Mount.** `GearStudioScreen` renders `FinishPreparation` only in the Studio's `ready` state, as the last child of the gear zone. The props are `trailId`, `tripDate`, `trailName`, `announce`, `chooseDateTo`, and `continueTo="/home"` (`features/loadout/components/GearStudioScreen.tsx:767–787`).
2. **Click.** `finish()` returns early if `savingRef` or `isPending` is set. A past `tripDate` shows `invalid-date` with no request. Otherwise it sets `savingRef` synchronously, sets the phase to `saving`, and calls `announce("status", "Saving your plan.")` (`features/plans/components/FinishPreparation.tsx:80–92`).
3. **Mutation.** `useCreatePlan` is `useMutation({ mutationFn: createPlan, retry: false, networkMode: "always" })` and writes nothing to the cache (`features/plans/hooks/useCreatePlan.ts:11–17`). `createPlan` resolves only on a 2xx, mapping 201 to `"created"` and 200 to `"existing"`; anything else throws a `PlanRequestError` (`features/plans/api/plans.ts:77–96`).
4. **Success detection.** Success is the resolution of `await mutateAsync(...)`, which leads to `setPhase({ kind: "saved", saved })` (`FinishPreparation.tsx:95–96`). This is the only place D-INV-1 is satisfied. A failure becomes `failed`, or `idle` for `no-session` (`:97–102`).
5. **Render.** The `saved` phase replaces the row with `h2` FP7 "Preparation complete" (`tabIndex=-1`, focused once by the effect at `:65–71`), the body FP8/FP9 (with the trail name) or FP10/FP11 (without), and a `Link` to `continueTo` (`:108–133`). Copy is at `features/plans/content.ts:22–35`.

### B.2 Studio ↔ viewer lifecycle and channel; where orchestration lives

**Mounting.** The viewer is mounted only when `wide` (`(min-width: 768px)`, `GearStudioScreen.tsx:87, 159`). Below that width `StudioStage` renders text only, with no viewer and no chunk (`features/loadout/components/StudioStage.tsx:63–78`). `WideStage` owns the viewer `ref`, `reducedMotion` (a media query), and `paused` (local state) (`StudioStage.tsx:104–108, 186–193`). `AvatarViewer` performs these steps:

- the WebGL 2 check, which reports `no-webgl`;
- the one dynamic `import("./runtime/AvatarRuntime")` with a 20 s limit, which reports `viewer-load-failed`;
- an error boundary, which reports `render-error` (`features/avatar/AvatarViewer.tsx:45, 67–107, 225–245`).

The runtime then creates one `RuntimeController`, deferred by one task so that a StrictMode mount-unmount creates nothing (`features/avatar/runtime/AvatarRuntime.tsx:32–50`). The controller loads the avatar, which can fail as `avatar-load-failed` or `avatar-invalid` (`RuntimeController.tsx:120–144`). Unmount calls `controller.dispose()`, which aborts loads, removes listeners, unmounts the root, and calls `stage.dispose()` (`RuntimeController.tsx:219–231`; `AvatarStage.ts:423–459`).

**Channels today.**

- **Business state in:** props. `equipped`, `reducedMotion`, and `paused` pass through to `RuntimeController.setInputs` by content (`AvatarRuntime.tsx:53–56`; `RuntimeController.tsx:179–196`). The 005 contract names this "UI → viewer: motion flags" (005 l. 690).
- **One-off commands:** an imperative handle (`turnLeft`, `turnRight`, `resetView`, `retry`), reachable only from inside `WideStage` (`viewerTypes.ts:43–48`; `AvatarViewer.tsx:163–182`; `StudioStage.tsx:106`).
- **Reports out:** `onStatusChange(AvatarViewerStatus)`, emitted once and then only on a change of content. `composeStatus` builds it from the runtime's `RuntimeState` (`AvatarViewer.tsx:151–196`; `viewerStatus.ts:20–70`; `runtimeTypes.ts:13–21`). The Studio stores it and forwards it to `useAvatarAnnouncer` (`GearStudioScreen.tsx:190–192, 453–459`).

**Proposal: a declarative cue prop with a status report. This is the least change, and it is consistent with the existing channels.**

- **Cue in.** Add `readyCue: number` to `StudioStage`, `AvatarViewerProps` (optional, default 0), `RuntimeProps`, and `ControllerInputs`, and pass it straight through. The runtime plays `ready_to_go` only when the cue **increases after the controller exists**. The controller records its constructor-time cue as already consumed, so a viewer Retry, a remount, or a StrictMode re-run never replays the clip.
- **Why not the imperative handle.** The handle is private to `WideStage`. Lifting it would mean `StudioStage` exposing a ref, which 005 keeps inside the Stage. A cue is also inert when the viewer is absent.
- **Report out.** Add `readyClip: "none" | "available" | "playing"` to `AvatarViewerStatus`, composed in `composeStatus` as follows:
  - `"none"` unless the viewer is drawn, the file has the clip, and `reducedMotion` is false;
  - otherwise `"playing"` while the clip runs (from the start until `finished`, not including the fade-out), else `"available"`.
- **Runtime state for the report.** `RuntimeState` gains `hasReady` and `readyPlaying` (`runtimeTypes.ts:13–21`), mirroring `hasIdle`. These give started (`available → playing`), finished (`playing → available`), and unavailable (`none`, or `state: "unavailable"`) with no new callback. Add `data-avatar-ready={status.readyClip}` beside the existing `data-avatar-state` and `data-avatar-renderer` (`AvatarViewer.tsx:202–207`).
- **Ownership.** Orchestration lives in `features/loadout`, which already imports both `avatar` (`GearStudioScreen.tsx:19`, `StudioStage.tsx:12–17`) and `plans` (`GearStudioScreen.tsx:47`). It is a new hook, `features/loadout/hooks/useReadyToGo.ts`, modelled on `useAvatarAnnouncer`, and exposes:
  - `celebrate(): Promise<void>`;
  - `readyCue`;
  - `onViewerReport(status)`, called from `handleViewerStatus`.
- **FinishPreparation exposes save success with no new import.** It takes a new optional prop `celebrate?: () => Promise<void>`. The prop is plain function types only; `plans` still imports only `services`, `auth`, `planning/tripDate`, and `layout` (FC §10).

### B.3 Trigger point and completion state machine

**Trigger:** immediately after `await mutateAsync(...)` resolves (`FinishPreparation.tsx:95`), before any success copy. That point is reached only on a 2xx, so the clip can never precede or replace a confirmed save (D-INV-1). Nothing else may increment the cue.

```text
FinishPreparation:  idle ─click─▶ saving ─2xx─▶ celebrating ─celebrate() settles─▶ complete
                                    └─error─▶ failed (unchanged, 011 §14.5; no cue is ever sent)
useReadyToGo.celebrate():
  skip → resolve now   if !wide | status.state ∉ {ready, partial} | readyClip ≠ "available"
                          | status.motion = "paused" (U-B1) | document.visibilityState ≠ "visible"
  else  readyCue += 1, then resolve on the FIRST of:
        a. readyClip "playing" → not "playing"           (finished, or reduced motion switched on)
        b. no "playing" report within START_GRACE 1,000 ms (clip refused or missing)
        c. status.state = "unavailable", or the viewer unmounted (width < 768)
        d. status.motion becomes "paused" during the clip (the user asked for stillness)
        e. SAFETY 5,000 ms after the cue (wall clock; clip 4.0 s plus report latency)
        f. hook unmount (timers cleared; resolving is harmless)
FinishPreparation also races celebrate() against its own 6,000 ms ceiling: a plans-side guarantee
that a confirmed save always reaches the static completion, whatever the avatar does.
```

| Case | Behaviour |
|---|---|
| < 768 px, no WebGL 2, chunk/avatar load failed, still loading at save time | Skip: static completion at once. Nothing waits on a viewer that is not drawn |
| GLB without `ready_to_go` (stale cache, A.3 drop rule, `readyClip: null`) | `readyClip` = `"none"`, so skip. Never `avatar-invalid` (A.4) |
| Reduced motion | `readyClip` = `"none"`, so skip. The rest pose equals the clip's end pose (A.2) |
| Tab hidden at save | Skip. Hidden mid-clip: the mixer freezes (`RuntimeController.tsx:322`) and the completion comes from SAFETY. On return the clip resumes, ends on rest, and fades to Idle, which is harmless |
| Navigation or unmount mid-clip | The Plan is already saved. `dispose()` stops all actions (`AvatarStage.ts:424–427`) and the hook clears its timers. During `celebrating` the header and "Back to preparation" stay available, and there is no Continue to activate |
| Equip/Unequip/Add gear during the clip | **Recommendation: do not disable gear controls.** Visibility is a pure function of the equipped set (`visibility.ts:46–63`), attached gear follows its slot bone (§7.2), and a late gear model is added by `slot.add` alone (`AvatarStage.ts:239–258`), so there is no race. Disabling would break the 005 rule "In no state is a gear control disabled, hidden, or delayed by the viewer" (005 l. 940; restated at `StudioStage.tsx:49–50`) for a ≤ 5 s window. The only effect is that an equip announcement replaces the save announcement, which is already accepted (011 §13.7 note 9) |
| Second Finish | Impossible: `savingRef` stays set through `celebrating`, and the button is `aria-disabled` until the row is replaced |

### B.4 Runtime changes (A.4 mapped to code)

| A.4 item | File and change |
|---|---|
| Manifest | `avatarManifest.ts:50, 70`: add `readyClip: 'ready_to_go' \| null` to the schema and the content, not in `requiredNodes`. `:61`: bump `version` 1 → 2 (A.3 K; `loadModel.ts:22–24` re-keys every model URL). *Superseded by §14.4: change `avatar.model` (`:63`) to the versioned GLB; `version` stays 1* |
| Keep a reference; a mixer even without `Idle` | `AvatarStage.setAvatar` (`AvatarStage.ts:188–200`): create one `AnimationMixer(root)` when either clip exists. Keep `this.ready = mixer.clipAction(readyClip)` with `setLoop(LoopOnce, 1)` and `clampWhenFinished = true`. Return `{ hasIdle, hasReady }` instead of a boolean, and update the caller (`RuntimeController.tsx:148`) |
| `reset()`, then play once, with a 0.25 s fade in | New `AvatarStage.playReady(): boolean`. It returns false when there is no `ready` action or reduced motion is on. Otherwise: `ready.reset().play()`; if the idle has started, `idle.crossFadeTo(ready, 0.25, false)`. It sets `readyPhase = "playing"` |
| `finished`, then a 0.25 s fade back to Idle | A mixer `finished` listener (filtered on `event.action === this.ready`): if `idle` exists, `idle.reset().play()` and `ready.crossFadeTo(idle, 0.25, false)`. `readyPhase` = `"settling"` until the fade ends, then `"none"`. With no idle, the clamp holds the rest pose. Remove the listener in `dispose()` |
| `frame()` keeps requesting frames | `AvatarStage.frame` (`:412–416`): advance the mixer when `animate && !paused && (idlePlaying \|\| readyPhase !== "none")`, and return `true` in that case. `RuntimeController.playReady(cue)` calls `invalidate()` once (`RuntimeController.tsx:314–316`) and `emit()`. In `frame()` (`:319–329`) it emits again when `stage.readyPhase` leaves `"playing"`. `emit()` (`:298–308`) adds `hasReady` and `readyPlaying` |
| Reduced motion mid-clip | `applyMotion` (`:305–324`): when reduced motion turns on, `ready.stop()` too, so the pose returns to rest and `readyPhase` = `"none"`. The report then ends `celebrating` (case a) |
| 1/20 s step cap (`:61–62, 413`) | **Keep it; it does not matter for correctness.** It slows the clip only below 20 fps (for example with software WebGL, which `GL_OPTIONS` accepts, `RuntimeController.tsx:18–23`). The completion is wall-clock (SAFETY), and the clip still ends on the rest pose. The cap also protects the on-demand loop's first delta after a quiet period, which would otherwise jump the clip forward |
| Disposal | `stopAllAction`/`uncacheRoot` already cover a second action (`:424–427`). Also null `this.ready` (`:456–458`) |

Pause (A.4 leaves it to the product): with the change above, Pause freezes the clip like the idle, and case d completes the UI at once. The clip is ≤ 5 s, so no Skip control and no Pause control are required for it. When there is no `Idle`, `showMotion` hides Pause (`StudioStage.tsx:169`).

### B.5 Copy, focus, announcements

- **Copy.** New strings go in `plans/content.ts`: the completion heading "Ready for the trail." (replacing FP7 in the complete state) and "Your plan has been saved." I recommend keeping FP8 to FP11 as the body (trail, date, and the honest 200 "is already saved"), with "Your plan has been saved." as their generic form (U-B2). The `celebrating` row needs one label. I propose that the same button stays in place, `aria-disabled`, without the spinner, labelled "Plan saved" (U-B3). No string claims that the loadout is saved (005 Q16; `content.ts:5–6`).
- **Announcer.** The Studio has one announcer, `useTripAnnouncer`, where each `announce()` first calls `silence()` (`components/layout/useTripAnnouncer.ts:28–52`). Changes:
  - On entering `celebrating`, call `announce("status", "Your plan has been saved.")`. This replaces "Saving your plan." on success.
  - Pass `silence` (already returned at `GearStudioScreen.tsx:121`) as a new prop, and call it on failure before the inline `role="alert"` fills. This resolves 011 accepted limitation (B), "Saving your plan." lingering.
  - On a skipped clip, call `silence()` and focus the heading directly.
- **Focus.** During `celebrating`, focus stays on the same button element, so nothing is lost. On `complete`, focus the new heading (`tabIndex=-1`, `trip-focus-target`, as at `FinishPreparation.tsx:65–71`), with `aria-describedby` pointing at the body so that the body is read too. Refinement: move focus only if `document.activeElement` is inside the Finish section or is `body`. A user who started equipping during the clip should not have focus taken from a gear row (U-B4). Continue follows the heading in tab order.

### B.6 Continue destination

`continueTo` is one prop (`FinishPreparation.tsx:22–23`, used only at `:127`), and its one value is the literal at `GearStudioScreen.tsx:784`, commented "D20; D-INV-2: the destination changes here only." FEATURE-013 changes that one line. FEATURE-012 keeps `/home` and must not move or duplicate it.

### B.7 Cleanup, StrictMode, and the QA seam

- **StrictMode.**
  - The cue is incremented from the click handler's continuation, not from an effect, so it is never doubled. Use `setReadyCue(c => c + 1)`: a pure updater, safe when StrictMode invokes it twice.
  - The controller is created after one task (`AvatarRuntime.tsx:35–44`). The constructor-time cue is consumed, so a dev re-mount never plays the clip.
  - Timers live in refs and are cleared in the hook's unmount cleanup.
- **Ordering risk.** `celebrate()` must read the latest `viewerStatus` from a ref, not from a render closure. The save may resolve after several status reports.
- **Late reports.** After the hook resolves, it ignores reports until the next `celebrate()`. A stale `playing → available` from an earlier cue cannot complete a later one; cues are only ever incremented.
- **QA seam.** No production test hooks. Observable attributes: `data-avatar-ready` (B.2), and `data-finish-phase` on the Finish `section` (`idle`, `saving`, `celebrating`, `complete`, `failed`). These are DOM-only and in the style of `data-avatar-state`.

| Simulate | How (Playwright, no code change) | Expected |
|---|---|---|
| Missing clip | `page.route('**/models/avatar/avatar-base-ready-to-go.glb*')` answered with the original `avatar-base.glb` bytes (§14.4) | `data-avatar-ready="none"`; static completion at once |
| Viewer load failure | Abort that route, or abort the `AvatarRuntime-*.js` chunk; or Chrome `--disable-webgl` | Stage unavailable; static completion; no Plan error |
| Plan failure | Stop plan-service (proxy 500 → `unavailable`) or route `**/api/plans` to 503 | `failed` + Try again; `data-avatar-ready` never `playing`; status region empty |
| Reduced motion | `emulateMedia({ reducedMotion: "reduce" })` | No clip; static completion |
| Hidden tab / slow frames | Bring another tab to front mid-clip; CDP `Emulation.setCPUThrottlingRate` | Completion ≤ 5 s after the cue in both |
| Narrow | Viewport < 768 px | No viewer; static completion |

### B.8 Future write scope and size

| File | Change | Est. lines |
|---|---|---|
| `features/plans/components/FinishPreparation.tsx` | `celebrating` phase, `celebrate`/`silence` props, 6 s ceiling, new heading, focus rule, `data-finish-phase` | +50 |
| `features/plans/content.ts` | New strings (B.5) | +6 |
| `features/loadout/hooks/useReadyToGo.ts` (new) | Skip rules, cue, START_GRACE/SAFETY timers, report handling | +100 |
| `features/loadout/components/GearStudioScreen.tsx` | Wire the hook (`handleViewerStatus` `:453–459`), pass `celebrate` and `silence` (`:777–785`) and `readyCue` (`:794–801`) | +15 |
| `features/loadout/components/StudioStage.tsx` | Pass `readyCue` through | +5 |
| `features/avatar/viewerTypes.ts`, `runtimeTypes.ts`, `viewerStatus.ts`, `index.ts` | `readyClip`, `readyCue`, `hasReady`/`readyPlaying`, composition | +25 |
| `features/avatar/AvatarViewer.tsx`, `runtime/AvatarRuntime.tsx` | Pass-through, cue effect, data attribute | +15 |
| `features/avatar/runtime/RuntimeController.tsx` | `playReady(cue)`, consumed-cue rule, emit fields, frame emission | +35 |
| `features/avatar/runtime/AvatarStage.ts` | Mixer for either clip, ready action, crossfades, `finished` listener, frame/motion/dispose | +70 |
| `features/avatar/avatarManifest.ts` | `readyClip`; `avatar.model` → versioned GLB (§14.4; `version` stays 1) | +3 |

That is about 320 lines over 12 files, one of them new. There is no new dependency (`LoopOnce` and `AnimationMixer` come from `three`, already used), no new CSS (existing `.studio-finish` classes, `studio.css:896–912`), no route, and no backend change. The asset is `public/models/avatar/avatar-base-ready-to-go.glb`, a new file exported by `three-d` (§14.4; the original stays untouched). FC §8 and §10 are updated in the same change.

**Contract amendments for the lead** (frontend side, in addition to A.3):

- 005 §16 "Not used" (l. 1104) needs an explicit FEATURE-012 exception for the one post-save clip.
- The 005 viewer interface (§28.3) gains `readyCue` and `readyClip`.
- 011 §14.3 "No animation … or 3D (FEATURE-012)" is superseded.

**Approval items:**

| Item | Question | Recommendation |
|---|---|---|
| U-B1 | Should the clip play when the user has pressed Pause? | No: skip it |
| U-B2 | Completion body copy | Keep FP8 to FP11 |
| U-B3 | Label of the `celebrating` row | "Plan saved" |
| U-B4 | Focus rule on completion | Move focus only from within the Finish section or from `body` |
