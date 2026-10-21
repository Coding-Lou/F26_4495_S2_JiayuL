Feature: 005-pack-customization-avatar
Spec: docs/features/005-pack-customization-avatar.md
Branch: Dev_Frontend
Phase: CLOSED (closeout 2026-10-14)
Status: PASS / FROZEN
Updated: 2026-10-14 (closeout)

== CLOSEOUT (2026-10-14, by the user's closeout instruction) ==
Status: PASS / FROZEN. The current implementation is the accepted functional baseline. The user reviewed the result and approved moving on to FEATURE-006.
Functional implementation: ACCEPTED.
3D assets: ACCEPTED for the current product baseline.
Future work on FEATURE-005: visual polish only (backlog below).
Reopen rule: FEATURE-005 is NOT reopened for ordinary visual polish. Visual polish runs as a dedicated, targeted 3D polish task.

3D ASSET POLISH BACKLOG (deferred; scope decided later by the user)
Not a failed acceptance criterion, not a blocker, not a FEATURE-005 repair, and not a reason to reopen the feature. Candidate improvements:
- avatar proportions
- face / head shape
- hair
- clothing silhouette
- backpack shape and details
- footwear details
- headlamp details (incl. the forehead band shape accepted in run 2b)
- trekking-pole details (incl. the grip that narrows to a point inside the fist)
- material refinement
- model topology
- clipping cleanup
- idle animation refinement
- overall stylized art quality

Contract stability for any polish task (preserve wherever possible; do not change casually):
- GearCategory semantics; Recommended / Owned / Missing / Equipped semantics
- the loadout state shape (sessionStorage key outdoor-trip-companion.loadout, version 1)
- the asset manifest interface (features/avatar/avatarManifest.ts = spec section 25)
- slot names (Slot_Head, Slot_Back, Slot_Hand_L, Slot_Hand_R) and attachment semantics (slotNode.add(attachNode), identity attach nodes, no frontend offsets)
- node, mesh and material names of spec 24.2 / 24.3, and the GLB paths under Project/Frontend/public/models/
- frontend component APIs (AvatarViewer props / handle of spec 28.3)
Preferred polish workflow: existing .blend → three-d visual refinement → re-export compatible GLBs (same names, paths, slots) → Asset Gate (spec section 27, as reconciled) → targeted visual QA, without rewriting the FEATURE-005 frontend. Bump the manifest `version` only if a GLB changes (cache busting, spec 25.2), which is the one expected frontend touch. A polish that genuinely needs a contract change is an explicit small follow-up task, not a silent change to FEATURE-005.
Source asset workspace (source of truth for refinement; reuse, do not recreate from scratch without a specific approved reason): assets/blender/feature005/avatar-gear-studio.blend, with assets/blender/feature005/previews/ (29) and assets/blender/feature005/evidence/ (5). Build scripts from the cycle lived only in the non-persistent session scratch directory.

Spec reconciliation (closeout): CA1–CA18 are now written into docs/features/005-pack-customization-avatar.md (sections 19, 20.3, 23.3, 23.5, 23.6, 24.2, 24.4, 26.1, 26.2, 26.3, 27.1–27.3, 32, 43.5 and the header Status), each tagged "(CAn)", together with the three asset-contract readings accepted in run 2b (20.3 rule 6 measured from the neck's back surface; the forehead section of the headlamp band; the pole grip shape). No behaviour, requirement, or acceptance criterion was changed. The spec now represents the frozen contract. Pre-closeout copy of the spec kept only in the session scratch directory.
docs/FRONTEND_CONTEXT.md (closeout): section 1 and the section 9 rows "Customize Gear" and "Avatar Update" now state that FEATURE-005 is CURRENT and part of the frontend baseline. docs/PRODUCT_REQUIREMENTS.md not edited.
Closeout wrote only: this checkpoint, docs/features/005-pack-customization-avatar.md, docs/FRONTEND_CONTEXT.md. Nothing under Project/**, assets/**, .gitignore, or package files changed; Blender was not invoked; nothing committed or pushed.
== END CLOSEOUT ==

Design: APPROVED (final specification, product decisions Q1–Q19 final 2026-10-13; the user started the cycle by invoking /feature-cycle 005-pack-customization-avatar on 2026-10-13, which is the start spec section 41 waits for)
Implementation: COMPLETE (frontend; E1 ~19:20, E2 ~19:55 2026-10-14)
Build: PASS (exit 0, frontend, after E2; entry 527.33 / 162.30 kB gzip = +2.16 kB gzip over HEAD; Studio chunk 39.83 / 12.18; 3D chunk AvatarRuntime 802.69 / 212.59 kB gzip of 350 budget; Vite >500 kB warning pre-existing)
Lint: PASS (exit 0, frontend, after E2)
QA: PASS (run 1, 2026-10-14: 54 of 54 PASS, 0 FAIL, nothing blocked by environment; AC-24–31 by Asset Gate with files unchanged; several clauses by emulation, see Not verified)

Security review: COMPLETE — lead read of this feature's diff (no security-guidance plugin output this session; built-in /security-review not run). loadoutStorage.ts: one sessionStorage key, value discarded whole on bad parse / version / owner / shape, identifiers only (owner sub, trip keys, category wire values, UUID item ids, timestamps), entries validated against the 11 categories and the UUID form, past trips dropped, 20-trip cap, write failures swallowed. loadoutStore reads nothing until getAuthenticatedSubject() is non-null and writes nothing without an owner. LoadoutSessionBoundary: registerSessionCleanup(endLoadoutSession) and removal on every no-session status (excluding initializing). gearRequest: only authenticatedApiRequest, failure bodies never read, nothing logged. Item names rendered as JSX text only. No localStorage / history.state / console / innerHTML / dangerouslySetInnerHTML; no keycloak / authSession / token decoding in new code. Runtime: model URLs same-origin /models/...?v=1, no CDN / decoder / Blender / MCP / 9876 reference. No finding.

3D pipeline: RUN (spec header and sections 20–27 require Blender-made GLB assets, a real-time avatar, and a Three.js / React Three Fiber runtime)
Blender production: REQUIRED (no asset exists; assets/blender/ and Project/Frontend/public/models/ do not exist at cycle start)
3D capability: PASS (2026-10-13 19:17; in-session: addon status, scene query, filepath '' and is_dirty False (untouched startup scene: Camera, Cube, Light), save_as_mainfile copy=True FINISHED 97897 bytes, export_scene.gltf GLB use_selection FINISHED 1440 bytes, magic glTF, version 2, declared length = size; throwaway primitive and scratch files removed, session left not dirty)
Blender: 5.2.2 LTS (build 2026-09-15), /Applications/Blender.app
Blender MCP: mcp-for-blender (uvx, version not reported by the tools), addon 1.8, protocol 13 (expected 13, up_to_date true), server `blender` in .mcp.json, `claude mcp get blender` = Connected; asset libraries and generators all off; telemetry off
3D contract: FROZEN 2026-10-13 19:40 (docs/features/005-pack-customization-avatar.md sections 19–27 and 33, AS AMENDED by CA1–CA17 below; three-d validated it: no production blocker, 3 gate blockers, 14 minor; all 17 corrections accepted by the lead. The spec file itself is NOT edited: spec 41.2 gives no agent write access to it outside a ui-ux contradiction. Where the spec text and a CA line differ, the CA line is the contract. Reconciling the spec text is left for the user after the cycle.)
Contract amendments at freeze (three-d's G-number in brackets):
- CA1 [G1] 23.6: add `export_anim_slide_to_zero` = True; key times start at 0.0 s. 27.2 animation row duration clause becomes "first key time 0 within 0.0001; last key time 3.96 to 4.04 s". Pre-approved fallback if P0 shows slide-to-zero does not give a 0 start: key Idle on frames 0–120 and set the scene range to 0–120 (replaces "frames 1 to 121" in 23.2 and section 32).
- CA2 [G2] 24.2 Skins row: skin name `Avatar_Armature` (exporter-defined: the armature object's name).
- CA3 [G3] 27.2 pole row becomes: "each pole's lowest local point plus its slot's world height is in [0.000, 0.010]" (same window as 24.4).
- CA4 [G4] 24.4 headlamp vertical clauses become: "lowest z in [slot z − 0.045, slot z − 0.012]; highest z in [slot z + 0.012, slot z + 0.045]" (slot z = as-built `Slot_Head` world z). x, y and front-most clauses unchanged.
- CA5 [G5] 20.3 rule 7 gains: "Within 16 mm above and below the `Slot_Head` plane the head-and-hair surface is a smooth closed loop (radial variation 4 mm or less, no tuft tip); tufts live above and below that strip."
- CA6 [G6] 26.3 gains: "Engine `BLENDER_EEVEE`. View transform `Standard`, look none, exposure 0, gamma 1. World colour is the background; film not transparent. `Preview_Camera` sensor fit `VERTICAL`. The `RT` process sets the same."
- CA7 [G7] 26.2 P0 runs in a separate background Blender (`--factory-startup`), files in the scratch directory; the shared session is not touched. Its test rig also has: a root Empty above the armature, a two-material cube, one rigid cube parented to the bone-parented Empty and exported by the 23.7 gear recipe, and one background EEVEE render.
- CA8 [G8] 23.6 gains, passed explicitly: `export_hierarchy_full_collections` False; `export_meshopt_compression_enable` False; `export_use_gltfpack` False; `export_influence_nb` 4; `export_merge_animation` 'ACTION'; `export_anim_single_armature` True; `export_bake_animation` False; `export_shared_accessors` False; `export_unused_images` False; `export_unused_textures` False; `export_extra_animations` False; `export_action_filter` False; `will_save_settings` False. Every 23.6 option is always passed explicitly, never inherited (defaults that differ from the contract: check_existing, use_selection, export_apply, export_texcoords, export_vertex_color, export_image_format, export_morph, export_frame_range).
- CA9 [G9] 23.5 gains: "Specular IOR Level 0.5, Specular Tint white, Coat, Sheen and Transmission weights 0, Emission Strength 0 (the Blender defaults)." `use_backface_culling` is set True on all 21 materials (its default is False).
- CA10 [G10] section 32 gains: "Frame 1 and frame 121 (or 0 and 120 under CA1's fallback): every animated channel equals its rest value within 0.0001." 27.2 animation row gains: "first key equals the node's rest transform within 0.0001".
- CA11 [G11] 26.2 S9 writes `exporter-options.txt` as well as `export-log.txt`, `glb-readback.json`, `sha256.txt`.
- CA12 [G12] 26.2 S10 ends with: "pose cleared, frame 1, every exported object visible in viewport and render; save".
- CA13 [G13] 27.1 Triangles gains: "worst loadout (all six equipped, visibility by 29.1) 28,000 or less". 27.1 Primitives becomes: "avatar 20 or less (16 expected); backpack exactly 3; poles exactly 6; headlamp exactly 3".
- CA14 [G14] 23.3 naming rule applies to objects, mesh data, bones, materials, and actions used by an exported or `Preview_` object. 26.1 startup row: "delete only `Cube`, `Light`, `Camera` and purge their orphan data; save at once".
- CA15 [G15] 27.3 row 1: the "armature with 23 bones" clause applies to `avatar-base.glb` only.
- CA16 [G16] section 19 Hair attribute: "Chestnut brown (palette)", i.e. `#8B5E3F`, not "Dark brown".
- CA17 [G17] section 19 value rule gains: "`Gear_Mat_Lamp_Band` and `Gear_Mat_Pack_Trim` are exempt as interior detail; the headlamp is read by its housing and lens."
Pre-approved P0 outcomes (no round trip to the lead needed): skinned mesh nodes at the scene root → 27.2 "Scene roots" reads "`Avatar_Root`, plus the 11 skinned mesh nodes at identity"; constant un-keyed/scale channels → section 32 "Scale channels: none, or constant 1 within 0.0001"; slot Empties needing a compensating local transform so the exported WORLD transform is identity → allowed; importer turns slot nodes into bones → 27.3 reads "23 bones plus the 4 slot nodes"; gear attach nodes not at identity by the 23.7 recipe → export from a temporary unparented duplicate in `F005_Scratch`, deleted afterwards; background EEVEE unavailable → `RT` set uses Workbench. NOT pre-approved (stop and report): slots as bones (27 joints), any other name/count change.
Facts from Stage B introspection (Blender 5.2.2, glTF addon 5.2.40): all 39 option names of 23.6 exist as spelled; engine id is `BLENDER_EEVEE`; scene defaults to override: 24 fps, frames 1–250, view transform AgX; Actions are slotted.
Asset production: COMPLETE (three-d; P0, S1–S10; runs 1, 2 (interrupted), 2b, 3)
Last saved: S10 final (CA12 state) → assets/blender/feature005/avatar-gear-studio.blend, 407,104 bytes, 2026-10-14 18:50:03, FINISHED (S8 pre-export 18:43:40, S9 post-export 18:46:43)

Source .blend:
- assets/blender/feature005/avatar-gear-studio.blend (407,104 bytes, 18:50:03; gitignored .blend1 beside it, verified by git check-ignore)
Exported GLB (all written 2026-10-14 18:44:16; sha256 matches evidence/sha256.txt):
- Project/Frontend/public/models/avatar/avatar-base.glb (630,128 bytes; sha256 50b58cd3…)
- Project/Frontend/public/models/gear/gear-backpack.glb (79,208; 2bcd49ab…)
- Project/Frontend/public/models/gear/gear-trekking-poles.glb (31,824; 89f2da06…)
- Project/Frontend/public/models/gear/gear-headlamp.glb (31,536; 735d3a2d…)
Evidence: assets/blender/feature005/evidence/{blend-inventory.json, exporter-options.txt, export-log.txt, glb-readback.json, sha256.txt}
Asset manifest: typed module in Project/Frontend/src/features/avatar (spec section 25, written by frontend at Stage E)
Preview renders: assets/blender/feature005/previews/ (29 PNGs, 768x1024, exact 26.3 names)

Asset gate: PASS (2026-10-14 18:51, run 1). Lead's own measurements, not three-d's report:
  - 27.1/27.2 by the lead's GLB reader (scratch gate/gate_glb.py, parses JSON + BIN): 151/151 PASS. Headers glTF v2, length = size; sizes 630,128 / 79,208 / 31,824 / 31,536 (total 772,696 <= 1,990,000); triangles avatar 17,616 (default-visible 10,392), backpack 3,368, poles 1,376, headlamp 1,296, worst loadout 18,456; primitives 16 / 3 / 6 / 3; exact node (40), mesh (11), material (12) names; skin Avatar_Armature 23 joints; gear roots = attach nodes at identity; every node scale 1; no images/textures/samplers/cameras, extensionsUsed and extensionsRequired absent; materials exact palette, metallic 0, roughness/doubleSided/alphaMode at glTF defaults; JOINTS_0 on all 11 avatar meshes only. Slots world B: Head (0, 0.015, 1.650), Back (0, 0.105, 1.300), Hand_L (0.4587, -0.0214, 0.874), Hand_R mirrored; rotation 0.000°, scale 1. Facing 24.5 all hold (eye z >= 0.0609, Slot_Back z -0.105, Head y 1.500, lens z >= 0.133). Extents: avatar 0.000–1.7524 (top Hair_Top), x 1.0024 symmetric; backpack x ±0.190, y -0.135..0.318, z 0.933..1.477; poles z 0.002..0.9612, extents 0.056; headlamp z 1.636..1.692 (slot 1.650, CA4), x 0.2217 centred, y 0.269, front -0.125; full loadout height 1.7524, radius 0.5018. Idle: one clip, 3 channels (Breath t 5.15 mm, Neck 0.50°, Head 0.80°), times 0.0–4.0 s, first = last = rest within 1e-4. (One checker artefact fixed: first-key-vs-rest now compared per component at 1e-4 as CA10 states, not via acos.)
  - 27.3 by separate background Blender (gate/gate_blender.py): all four GLBs import FINISHED with disable_bone_shape=True; avatar has one armature of 23 bones, no stray helper; .blend opens with exactly the 23.3 collections and 24 objects, F005_Scratch empty, skinned meshes identity with one Armature modifier, gear parented to slots with identity local and parent-inverse, zero n-gons, no loose vertices, no image node, 21 materials with backface culling, actions ['Idle'], 30 fps 1–121, frame 1, nothing hidden, names match the regex, mesh data <Object>_Mesh. sha256 of the four GLBs equals evidence/sha256.txt.
  - 27.4: the lead opened all 29 previews. No severe clipping in L0–L8 or RT; L7 shows shell, fleece collar in the neck opening, no fleece body, straps over the shell; pack against the back, headlamp housing centred on the forehead and uncovered, band seated, pole grips in the fists with tips at the ground, boots under the hems; L1–L6 at q3 each visibly differ from L0; every gear reads by lightness; RT-L0 / RT-L8 match L0 / L8 in pose, placement, colour; ST-stride nothing torn or detached, gear stays on; style matches section 19.
  - Files: exactly the 7 items of 27.1; only the four GLBs under public/models; no THIRD_PARTY.md; .blend1 is gitignored, no .recovered.blend left. No file newer than the gate under the asset paths.
Asset repair cycle: 0/2
Integration gate: PASS (2026-10-14 ~20:03; evidence by frontend in scratch e2/, screenshots opened by the lead: 06 all equipped, 02 backpack, 09 avatar blocked ST4, 11 backpack blocked partial, 12 narrow 390)
  1 build 0 / lint 0. 2 with all six equipped on reload: avatar-base.glb?v=1, gear-backpack/headlamp/trekking-poles.glb?v=1 each 200 and requested once; ready; data-avatar-renderer 1; one canvas. 3 console: zero page errors, no WebGL error; warnings only: THREE.Clock deprecation (library, R3F 9.8.2 + three 0.186), pre-existing silent-SSO iframe sandbox warning, /favicon.ico 404. 4 equip/unequip backpack and boots: correct pictures, unequip restores base. 5 after failed+corrected Add gear and opening the picker: same canvas instance, renderer stays 1. 6 avatar-base.glb blocked: ST4 + Retry, loadout text, Equip/Unequip/Add gear work; after unblock Retry → ready, renderer 2, focus Reset view, current loadout drawn. gear-backpack.glb blocked: partial, ST2, N4, row still Equipped, no page error. 7 at 390x844: no canvas, no GLB / runtime / three request, ST14, no horizontal scroll.
  Defect found and fixed by frontend inside E2 (not a repair cycle): R3F configure() replaced the whole config on resize (camera reset, blank canvas while DOM said ready); every configure now passes the full config.
  Run on headless Chrome (channel chrome) 1440x900, WebGL 2 via ANGLE Metal (Apple M4). Trip used: Bowen Lookout 44444444-4444-4444-4444-444444444444, 2026-10-15.
Frontend repair cycle: 0/2

Path: 3D feature (A capability check → B contract → C assets → D Asset Gate → E frontend → lead diff review → security review → F Integration Gate → G QA)
Product gate: none mid-cycle (spec 41.1, Q13). The cycle runs A → PASS or BLOCKED; preview renders are lead evidence, not a user approval stop.

Granted write paths (spec section 41.2, quoted limits):
- assets/blender/feature005/** — the .blend source, previews/, evidence/; "The files section 23.1 names"
- Project/Frontend/** — new route, three feature folders (gear, loadout, avatar), Three.js / R3F integration; public/models/** ("only the four GLBs of section 23.1"); package.json and package-lock.json ("only what sections 28.1 and 35 approve": three, @react-three/fiber, @types/three as dev only if needed; NOT drei); the one proxy entry /api/users/me/gear in vite.config.ts; the return-destination pattern; the Gear up call to action on Trip Preparation
- docs/FRONTEND_CONTEXT.md — "What actually changed"; nothing else under docs/ except the spec when a contradiction is routed to ui-ux
- .gitignore — "Restricted to those two Blender backup patterns" (*.blend1, *.blend2); lead writes them before Stage C
By agent: three-d → assets/blender/feature005/** and Project/Frontend/public/models/** only; frontend → rest of Project/Frontend/** and docs/FRONTEND_CONTEXT.md, never a GLB; qa → nothing
Not authorized for any agent: Project/Backend/**, Project/docker/**, Project/docker-compose.yml, Keycloak config/theme, API gateway, infrastructure, docs/PRODUCT_REQUIREMENTS.md, docs/DESIGN_SYSTEM.md

Baseline at cycle start (2026-10-13 19:16:24 PDT):
- git status --short: 8 entries (.DS_Store x3, .claude/agents/three-d.md, .claude/skills/feature-cycle/SKILL.md, CLAUDE.md, .mcp.json untracked, docs/features/005-pack-customization-avatar.md untracked). No Project/Frontend or Project/Backend change pending.
- Newest file under Project/Backend (outside target/): 2026-10-12 20:06:09. Any Backend file newer than 2026-10-13 19:16:24 is a scope failure.
- sha1 (first 8): docs/FRONTEND_CONTEXT.md 90dc26e5, docs/DESIGN_SYSTEM.md e1e819ba, docs/PRODUCT_REQUIREMENTS.md 45711aa3, Project/Frontend/package.json 53cea46c, package-lock.json 6e75be53, vite.config.ts d651428a, Project/docker-compose.yml 775a5708, .gitignore 26f710e3, "Project/Frontend/public/media/img/preparation bg.png" 0e915a2c
- No three / @react-three/* in package.json. No features/gear, features/loadout, features/avatar.
- Listening: 5173 (vite dev), 5432 (Postgres), 8180 (Keycloak), 9876 (Blender addon socket).

Environment risk for Live criteria (not a code issue):
- NOT listening at cycle start: 8081 (user-service), 8082 (trail-service), 8083 (recommendation-service). Live criteria (AC-01..05, 07, 08, 17, 19, 33) and the Integration Gate need them. They are started by the user from IntelliJ; the cycle does not start them. Recheck before Stage E's proxy check, Stage F, and QA; if still down, ask the user to start them (not a BLOCKED of the asset stages).
- QA accounts left by the 004 cycle in Keycloak: otc-qa-ca800418 (owns "QA test boots", FOOTWEAR) and otc-qa-ba46d41f.

Agents completed:
- qa (run 1)
- frontend (E1, E2 + Integration Gate evidence)
- three-d (Stage C runs 1, 2 [interrupted by API usage limit], 2b, 3)
- three-d (Stage B contract validation, read-only; wrote nothing, Blender left untouched: filepath '', not dirty)

Agents skipped:
- ui-ux (specification and design exist and are final; called only if a spec contradiction is routed to it)
- backend-api (no backend change requested; spec 7.2 has no class B gap)

Files changed:
- assets/blender/feature005/{evidence/*, previews/*} (three-d)
- Project/Frontend/public/models/{avatar/avatar-base.glb, gear/gear-backpack.glb, gear/gear-trekking-poles.glb, gear/gear-headlamp.glb} (three-d)
- .gitignore (lead): + *.blend1, + *.blend2
- assets/blender/feature005/avatar-gear-studio.blend (three-d, created)

E2 deviations accepted by the lead (QA: verify, do not fail on these alone):
9. R3F createRoot instead of <Canvas>: the viewer root holds exactly one <canvas>; no R3F event system (no pointer/wheel/raycast listeners on the canvas from R3F).
10. When attached categories are already equipped on mount, their GLBs are requested right after the avatar validates and before the reveal (at most 2.5 s), per 34.1 step 7.
11. MeshLambertMaterial per glTF material, the GLB's own base colour (28.6 allows a built-in material with the same colour; no specular).
12. Lights: key directional at camera-space (-0.5, 0.7, 0.5), intensity 2.4, riding with the camera; ambient fill 1.35 (constants).
13. Runtime creation waits one task (StrictMode dev double-mount fetches nothing twice); data-avatar-renderer is 1 per visit and 2 after a Stage Retry.
14. Studio CSS ships with the lazy Studio chunk; the Suspense fallback is the ink trip base.
15. retry() in partial retries the failed gear; the Stage renders no Retry in partial, per spec.
16. Console warning `THREE.Clock: This module has been deprecated` once per renderer comes from R3F 9.8.2 with three 0.186; a warning, not an error.
Lead diff review: PASS (2026-10-14 ~20:02). Changed files only under Project/Frontend/** and docs/FRONTEND_CONTEXT.md (plus cycle files and three-d's asset paths); package.json gains exactly @react-three/fiber ^9.8.2 and three ^0.186.1 (+ @types/three ^0.186.0 dev, three ships no types); lockfile +269/-2; no Backend/docker file newer than the baseline; no asset newer than the gate; three/fiber imported only in features/avatar/runtime; .glb paths only in the manifest; node and slot names only in features/avatar; no drei / CDN / blender / 9876 / draco / meshopt; transform writes only camera, key light, ground shadow; gear attached by slot.add(node) only.
Test accounts created this cycle (Keycloak; credentials only in the session scratch dir, not persisted): otc-qa-e2-b9da3adf, otc-qa-e2-d3e22f8f (owns QA gear: winter boots, bottle, rain shell, fleece, poles, headlamp, daypack).

QA run 1 detail (qa, webapp-testing skill: Python Playwright in a scratch venv driving installed Chrome headless, WebGL 2 via ANGLE Metal, Apple M4). Trips: Bowen Lookout 4444… on 2026-10-16 (and 10-17), Dog Mountain 3333… . Measurements worth keeping:
- AC-01 Gear up: 44px tall at the end of the 44px date row (row x 81–511, CTA 384–511 at the measured width), paper fill, ink label, radius 12, 16/24/600.
- AC-04 reload: Stage pixel diff 0. AC-11/34/35/36 each unequip pixel diff 0 to the earlier picture; L7 identical in either equip order.
- AC-39 ground-contact centre x ~0.50, y ~0.861 constant 0–330°; min margin 38px (1366, 1024) with the full loadout; 75px drag == Turn right; vertical drag, wheel diff 0.
- AC-42 idle 652 px differ over 1 s; paused diff 0; reduced motion identical 1 s apart, no Pause control.
- AC-52 3D chunk 209 KB gzip in dist; model bytes all equipped 772,696; /home, Trail Detail, Prep request no three/fiber/model.
- AC-54 origins contacted: 5173 and 8180 only; Backend newest still 2026-10-12 20:06:09; compose 775a5708, DESIGN_SYSTEM e1e819ba, PRD 45711aa3; regression of landing, planner turn + New Plan, Trail Detail, Prep OK.
Not verified (carry to the user's manual review): a real screen reader; real Windows forced colors (Chrome emulation + grayscale); iOS Safari / a real phone (emulated 390x844 and 320x568); a real Keycloak session expiry (simulated by refusing refresh and advancing a fake clock 6 min); a real GPU-less browser (WebGL stubbed by an init script); every contrast pair computed in the browser (pixel + token checks only); frame rate; browsers other than Chrome; build/lint not rerun by QA (no src file newer than dist).
QA observations (not failures): (1) AC-03: opening the Studio within 30 s of Trip Preparation reuses the cached trail query (global staleTime 30 s from FEATURE-004), so no GET /api/trails is sent then; on direct entry and reload it is; AC wording could be aligned. (2) gear and pack queries auto-retry once on 5xx, so one S7 Retry press sends two GET gear requests. (3) live counts depend on the forecast (Rain gear became recommended mid-run). (4) console: favicon 404, THREE.Clock deprecation (deviation 16), one warning per failed gear load. (5) the three gear GLBs load after ready even with nothing equipped (by design, 33). (6) at 90° side view the headlamp housing sits slightly proud of the brow (run 2b band deviation).
QA accounts (Keycloak, passwords only in the non-persistent scratch dir): otc-qa-005-004dd91c (user A, owns 11 QA items), otc-qa-005-3515ef4c (user B, B Bottle), otc-qa-005-621b5cf7 (unused).

Unresolved failures:
- (none)

- CA18 (2026-10-13 20:00, after P0) 23.6 gains `export_optimize_animation_keep_anim_armature` = False, so only keyed channels are exported (P0: 2 channels instead of 12). If on the real rig constant channels still appear, the pre-approved reading "none, or constant 1 within 0.0001" stands; either passes the gate.

P0 preflight: PASS (2026-10-13, separate background Blender, `Blender -b --factory-startup --python <scratch>/p0_preflight.py`). Skinned meshes are children of the armature node; one skin named after the armature, all bones joints incl. Root; bone-parented Empties export with exact world transform and no extra node; clip name Idle; slide-to-zero gives 0.0–4.0 s on frames 1–121 (frames stay 1–121); no material extension, extensionsUsed absent; JOINTS_0/WEIGHTS_0 only, no neutral_bone; 23.7 gear recipe gives identity attach nodes; slot nodes re-import as Empties; background EEVEE works, background pixel exactly #18362E; identifiers: view transform `Standard`, look `None`, engines BLENDER_EEVEE / BLENDER_WORKBENCH / CYCLES.
Notes for the lead's Asset Gate reader: material JSON omits roughnessFactor / doubleSided / alphaMode when they equal the glTF defaults (absent = default = pass); import GLBs with `disable_bone_shape=True` or the importer adds an `Icosphere` in `glTF_not_exported`; source sets render.dither_intensity = 0.

S1 measurements (three-d's claim, to be re-measured at the gate): height 1.7524 (top on Avatar_Hair_Top); head 0.2694; shoulder 0.432 at the shoulder point; x extent 1.0024 symmetric; y extent 0.3238; lowest z 0.000; max radius 0.5018; chest front y -0.096 at z 1.30; back y 0.105; trouser hem 0.120; ankle column top 0.165; hair base top 1.6455, hair top bottom 1.6335; CA5 band strip variation 3.1 mm.
S1 deviations accepted by the lead: (1) empty startup collection `Collection` removed; (2) preview world: camera rays see flat #18362E, lighting gets a neutral ambient of 0.28 (the runtime has a fill light; the RT process must use the same); (3) Preview_Camera / Preview_Key / Preview_Fill exist already, lights parented to the camera; (4) custom split normals on the two hair rim loops; (5) shoulder width 0.42 holds at the shoulder point, joints 0.37 apart; (6) headlamp housing will start at about z 1.640 to clear the brows (inside CA4).
S1 style check by the lead (2026-10-13 20:00, renders S1_front / S1_q3 / S1_back opened): proportions, face, hair, hands, palette and silhouette match section 19. SENT BACK on two points before gear is built (in-cycle S1 check, not an Asset Gate repair cycle): (a) pelvis reads as a separate brief-shaped piece with the legs hanging from it as two tubes; (b) sleeve caps stand up as square steps above the shoulder line. Optional (c): a mild chest-to-waist taper if the strap-zone numbers hold.

Production risks three-d flagged (no change requested; it reports at the step if a tolerance cannot be met): pole grip top vs cuff rim at S5 (relief if needed: pole highest z in [0.93, 1.08], needs lead approval); backpack front window fixes torso depth at S1 (base top chest front at y <= -0.094); strap tops vs folded hood share z 1.41–1.48; avatar must stay smooth-shaded with selective sharp edges to fit 1.5 MB at 30k triangles.

Recovery audit 2026-10-14 18:06 (lead):
- On disk: avatar-gear-studio.blend 228,979 bytes, 2026-10-13 19:55:54 (S1 original, known good). No GLB, no previews/evidence.
- Running Blender: that file open, is_dirty reported False BUT the meshes differ from disk (Avatar_Legs 1,352 tris vs 1,280; Avatar_Top_Base 2,048 vs 1,984): the S1 style revision exists only in the session (script edits did not set is_dirty). No armature: S2 had not begun.
- Lead saved the session as a copy: assets/blender/feature005/avatar-gear-studio.recovered.blend, 230,785 bytes, FINISHED (session filepath unchanged). three-d must promote or delete it before the Asset Gate.
- Revision renders S1r_front / S1r_q3 / S1r_back (scratch, 20:03) opened by the lead: (a) pelvis now one continuous garment, no brief shape; (b) shoulder line now slopes into the sleeve with only a slight cap; (c) not visibly done. S1 style check: ACCEPTED on the revised meshes.
- three-d's build scripts in scratch f005/: f005_lib.py, f005_s1.py (revised, 20:03), f005_s1_run1_backup.py, f005_check.py, p0_*.
- Backend services 8081, 8082, 8083 now listening (java).

Run 2b results (three-d's claims; re-measured at the gate): tris default-visible 10,392 / embedded 7,224 / avatar 17,616 / worst loadout 18,456; backpack 3,368, poles 1,376, headlamp 1,296. Max 3 influences, 0 unweighted. Slots world: Head (0, 0.015, 1.650), Back (0, 0.105, 1.300), Hand_L (0.4587, -0.0214, 0.8740), Hand_R mirrored; rotation 0, scale 1. Backpack x ±0.190, y -0.135..0.318, z 0.933..1.477; poles z 0.002..0.9612; headlamp z 1.636..1.692, front -0.125; full loadout height 1.7524, radius 0.5018. Idle: frames 1–121, Breath loc 5.1 mm, Neck 0.5°, Head 0.8°, ends equal rest, no scale channels.
Run 2b deviations ACCEPTED by the lead (2026-10-14 18:44): (1) shell offset 9 mm; (2) boots without a toe rand; (3) pole grip narrows to a point inside the hand above z 0.915, highest pole point 0.9612 hidden in the fist (24.4 met; relief not used); (4) headlamp band over the forehead only: lower edge follows the brow tops + 4.5 mm, band ~22 mm tall there and not centred (rule 7 inner/outer clearances still met, CA4 met); (5) section 20.3 rule 6 "at most 70 mm behind the neck" read as behind the neck's back surface: hood 61 mm (111 mm from the neck axis); (6) correction: visible brow tops z 1.6374, not 1.6335.
Lead look check of run 2b renders (sheets a–d: base, warm, shell, boots, backpack, poles, headlamp, warm+shell+pack, full; q3 and back; stride q3 and side): ACCEPTED. Every category visibly different from base at q3; L7 shows shell, fleece collar, no fleece body, straps over the shell; poles in the fists, tips at the ground; pack against the back; headlamp on the forehead; stride: nothing detached, gear stays on.

E1 report (frontend): proxy check: unauthenticated GET /api/users/me/gear through 5173 → HTTP 401 application/problem+json with code AUTHENTICATION_REQUIRED (user-service answered); /api/users/me still unproxied. Build 0, lint 0; entry 562.97 kB / 171.59 kB gzip vs HEAD baseline 520.64 / 160.14 (+11.45 kB gzip, the Studio itself; no 3D). Manifest mechanically identical to spec 25.2.
E1 files: created features/avatar/{avatarManifest.ts, viewerTypes.ts, AvatarViewer.tsx, index.ts}; features/gear/{types/gear.ts, api/gearRequest.ts, api/gearItems.ts, hooks/useGearItems.ts, index.ts}; features/loadout/{content.ts, studio.css, LoadoutSessionBoundary.tsx, storage/loadoutStorage.ts, state/loadoutStore.ts, model/studioModel.ts, hooks/useAvatarAnnouncer.ts, components/{GearStudioScreen,GearZone,AddGearForm,PackSummary,StudioStage}.tsx}; pages/GearStudioPage.tsx. Modified: vite.config.ts, app/router/routes.tsx, app/providers/AppProviders.tsx, features/auth/returnDestination.ts, features/trails/tripRoutes.ts (gearStudioLocation), features/packing/{components/TripPreparationScreen.tsx, content.ts, packing.css}, index.css, docs/FRONTEND_CONTEXT.md (sections 4, 7, 8, 10).
Lead scope check of E1 (2026-10-14 19:22): only Project/Frontend/** and docs/FRONTEND_CONTEXT.md changed; vite proxy gains exactly /api/users/me/gear → 8081; returnDestination diff is the (?:\/pack)? suffix only; no Backend file newer than the baseline; GLB mtimes still 18:44:16; no localStorage / history.state / console / innerHTML in the new features; package.json unchanged.
Deviations accepted by the lead (QA: verify, do not fail on these alone):
1. A 401 response on Add gear shows AG13 (general failure), a gear-list 401 shows GS8: @/features/auth exports no server-401 hook (same as FEATURE-004 accepted deviation 2). A really ended session is caught by getAccessToken.
2. Stage Retry keeps the unavailable block with Retry in its working state (SH4) while loading, so focus never drops to body; on ready/partial focus goes to Reset view.
3. A 201 whose body cannot be read counts as success (list refetched, announcement uses the typed name).
4. GS7 loading is announced as status on entering S1, including the first render (mirrors FEATURE-004 and AC-23).
5. A failed silent gear-list refresh after Add gear keeps the previous list (same rule as S22 for the pack); pack Retry in S4/S5 also refetches a failed gear list; gear Retry (S7) repeats only the gear request.
6. Pluralisation for a count of 1; TP17 also in S10 with no forecast; Gear up full width only below 480px; tier T Studio gutter 24 while the header keeps 32; in S2 the Stage section is omitted.
7. (lead decision) An unknown "Other gear" category can be equipped in memory only and is not persisted (8.3 storage validation keeps only the 11 wire values); a Missing row with an unknown category has no Add gear. Neither can occur with the current backend enums.
8. (lead decision) The Studio route is lazy-loaded (E2) so entry growth stays under section 33's 5 KB gzip.

Known limitations and open items for the user:
- (Resolved at closeout) CA1–CA18 and the run 2b contract readings are reconciled into the spec text; the spec is the frozen contract.
- Spec 43.3 conflicts C1, C2, C3, C5, C6, C11 remain reported for the user (PRD wording: Equip/Unequip vs Bring/Remove; gear inventory order; mobile 3D; cel-shaded wording).
- Accepted deviations 1–16 above; 1 (a server 401 shows the general failure, not FEATURE-002's session-expired state) recurs from FEATURE-004 and needs an auth export if it should change.
- Loadouts are per tab and end with the sign-in session (Q2, section 7.1); /gear is still a placeholder; added gear cannot be renamed or deleted in the product.
- npm run preview / a deployed build cannot reach the gear, trail, pack, or planner endpoints (dev proxy only).
- The Vite >500 kB warning now also covers the 3D chunk (209–213 KB gzip, under its 350 budget).
- Test accounts left in Keycloak/user-service: otc-qa-e2-b9da3adf, otc-qa-e2-d3e22f8f, otc-qa-005-004dd91c, otc-qa-005-3515ef4c, otc-qa-005-621b5cf7 (plus the 004 cycle's otc-qa-ca800418 and otc-qa-ba46d41f).
- Nothing is committed. No git state was changed by the cycle. The ignored avatar-gear-studio.blend1 backup remains on disk.

Next:
- FEATURE-005 is PASS / FROZEN. Not reopened for visual polish: use a dedicated 3D polish task (see CLOSEOUT above).
- The user approved moving on to FEATURE-006; it starts when the user invokes its cycle.
