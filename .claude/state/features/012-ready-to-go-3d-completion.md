Feature: 012-ready-to-go-3d-completion
Spec: docs/features/012-ready-to-go-3d-completion.md
Branch: Dev_Frontend
Phase: COMPLETE
Status: PASS / FROZEN
Product Gate: ACCEPTED (user, 2026-10-20)
Updated: 2026-10-20 (Product Gate closeout)

Design: APPROVED (spec frozen for implementation 2026-10-19; U1 = versioned copy, U2–U7 accepted)
Implementation: COMPLETE (three-d assets → frontend, 00:47)
Build: PASS (frontend, exit 0; existing >500 kB chunk warning only)
Lint: PASS (frontend, exit 0)
QA: LEAN PASS (run 1, 2026-10-20 ~01:05; qa, Playwright over CDP with installed Chrome 155, WebGL 2 ANGLE Metal Apple M4; Chrome DevTools MCP unavailable)
  - Journey through the UI (Quarry Rock, 2026-11-02, L9 + rain shell): one POST per activation (double-click, Enter×2 in saving, Enter+Space in celebrating), body {trailId, tripDate}; 201 new / 200 existing.
  - Timings: response end → playing 6–9 ms; playing → complete 4,007–4,035 ms (1440); 1920: 4,019; 1024: 4,009; 4× CPU throttle: 4,072; skip paths complete 1–2 ms after save.
  - Copy/a11y: "Plan saved" aria-disabled during the clip; focus on H2 "Ready for the trail." on complete; announcer "Your plan is saved." once per success, emptied on failure; Continue → /home by keyboard.
  - Failures: plan 503 → 011 copy + Try again, no clip, URL unchanged, then Try again 201 → clip once; missing clip (original bytes) → ready none; GLB abort → viewer unavailable + Retry, static completion; reduced motion; paused at save → skip; Pause mid-clip → UI completes in 19 ms, canvas frozen, Play resumes then idle.
  - No replay: back-nav, reload, viewer Retry (5–5.5 s observed). Equip/unequip mid-clip ok, clip still ends on time. No horizontal scroll at 1920/1024; 390 px static completion.
  - Pixels: gear attached, tips on ground, pack seated, shell shape kept; end frame = pre-Finish frame (idle breathing only); no snap. Perceptibility: head glance at t≈1 s visible; shrug at t≈2 s barely perceptible (product feedback, not a failure).
  - Validated: AC-01, 02 (503), 03, 05 (L9+shell), 06, 07, 08, 09, 10, 11, 16, 21–28, 32. Indirect: AC-12, 13, 15. Gate spot-checks: AC-04, 14, 17–19, 29, 30. Accepted: AC-31. Deferred to Full: AC-05/17 with L8 (account lacks headlamp, warm layer, boots), AC-20 hidden tab, AC-02 other variants (abort, unconfirmed, past date, trail gone), AC-09 without WebGL, AC-33. Not verified: AC-34 (Safari), isolated StrictMode, real screen reader.

3D pipeline: RUN (spec §8 D1 and §14 require Blender production of one `ready_to_go` action and its R3F playback)
Blender production: REQUIRED
3D capability: PASS (2026-10-19 23:30) — earlier FAIL at 23:07 (addon unreachable, Blender not running) cleared after the user started Blender.
  Read: get_addon_status up_to_date true; get_scene_info returned the scene. Session: untitled default scene (Camera, Cube, Light; filepath ''; is_dirty True from startup only, no user work). Save: save_as_mainfile copy=True FINISHED, 97,150 B. Export: one ico sphere, export_scene.gltf GLB FINISHED, 9,168 B, magic glTF. Probe object, mesh, and scratch files removed; scene restored.
Blender: 5.2.2 LTS (build 2026-09-15)
Blender MCP: mcp-for-blender (uvx), addon 1.8, protocol 13, server `blender` in .mcp.json, telemetry off
3D contract: FROZEN (2026-10-19 23:57; spec §9, §14 incl. §14.8, Appendix A.2–A.5 as amended by §14.8)
  2026-10-19 lead amendments after three-d stage B (G1–G10, §14.8): pole rules bind the choreography; W2 withdrawn (W1 only); channels rotation_quaternion + Breath.location, keys at 1 and 121, constant curves deleted; fake user on Idle and ready_to_go; no .blend1 (save_version 0 around each save, restored); manifest version stays 1; checks-json metrics and thresholds (pack seat −8/+5 mm); renders judge A.5 checks 1–5; preview naming; non-animation accessors byte-identical; export and save safeguards; live-session load allowed only over the empty default scene.
Asset production: COMPLETE (three-d, 2026-10-19 23:57; all_pass true per three-d)
Last saved: save 6 after export → assets/blender/feature012/avatar-gear-studio-ready-to-go.blend, 2026-10-19 23:56:36 (432,179 B, sha256 76cbb38e…7201). Saves 1–5: 23:46:15 setup, 23:47:32 blocking, 23:51:01 clip complete, 23:54:04 after previews, 23:56:36 pre-export. Live Blender holds this file, is_dirty False

Rollback record (spec §14.4, user decision U1):
- Original avatar GLB (immutable): Project/Frontend/public/models/avatar/avatar-base.glb, 630,128 B, sha256 50b58cd3e285307c2433a6e78da27aa93f11c0058ea77e32e781e632ff235efb (= 005 Asset Gate)
- Original .blend (immutable): assets/blender/feature005/avatar-gear-studio.blend, 407,104 B, sha256 521e74ad3f46b8ef80655f0a1aedd25c164793010cdd9f4f87abf33086217dc6
- Working Blender copy: assets/blender/feature012/avatar-gear-studio-ready-to-go.blend (copied 2026-10-19 23:03, sha256 at copy = original; final after save 6: 432,179 B, sha256 76cbb38e92e7bedd5e74e63e06ab8481fa5375b3fd1fe72a7ab25e0862977201)
- New exported GLB: Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb, 653,396 B (+23,268), sha256 50cb78a865011fae2d18f94dec5410f1a9c39545d661c5277aec21bcec31f016
- Frontend reference: avatarManifest.avatar.model changed from models/avatar/avatar-base.glb to models/avatar/avatar-base-ready-to-go.glb (frontend, stage E, after the Asset Gate); version stays 1
- Baseline file: assets/blender/feature012/evidence/baseline.json (also gear GLB sha256)
- Rollback = set avatarManifest.avatar.model back to models/avatar/avatar-base.glb. Nothing committed; Git/LFS decision after QA.

Source .blend:
- assets/blender/feature012/avatar-gear-studio-ready-to-go.blend
Exported GLB:
- Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb (653,396 B)
Asset manifest: Project/Frontend/src/features/avatar/avatarManifest.ts (frontend switches it at stage E)
Preview renders: assets/blender/feature012/previews/

Asset gate: PASS (2026-10-20 00:18, run 1; lead-verified on the files)
  - Files: working .blend 432,179 B sha256 76cbb38e…7201 (= three-d save 6); GLB 653,396 B sha256 50cb78a8…f016; no .blend1/.recovered anywhere under feature012 or public/models; 147 previews (16 groups × 9 + 3 RT); evidence: baseline.json (untouched 23:02), blend-inventory, export-log, exporter-options, glb-readback (all_pass), ready-to-go-checks (all_pass; 37 summary metrics, 0 fails; 121 per_frame entries), sha256.txt.
  - Baseline: shasum -c against baseline.json all OK (original GLB, 005 .blend/.blend1, 3 gear GLBs).
  - GLB (lead python read-back vs original, scratch gate_glb.py): header glTF v2, length = size, JSON+BIN chunks; asset, scenes, 40 nodes (TRS), skin (23 joints), 12 materials, 11 meshes identical; no extensions/images/cameras/uris; accessors 85 → 96, all non-animation accessors byte-identical; animations exactly Idle + ready_to_go; Idle identical; ready_to_go 11 channels (Spine, Chest, Neck, Head, Shoulder_L/R, UpperArm_L/R, LowerArm_L/R rotation; Breath translation), all LINEAR, 121 samples 0.0–4.0 s, first/last = rest within 6e-8; no Root/Hips/leg/Slot/scale channel; peaks Spine 2.0°, Chest 0.6°, Neck 4.0°, Head 9.97°, Shoulder 3.49°, UpperArm 3.49° (counter), LowerArm 1.94°, Breath 4.0 mm. Size +23,268 B (≤ +120 kB).
  - Headless Blender: .blend opens (24 objects, F005_Avatar 17, actions Idle + ready_to_go both fake user, Idle active, frame 1, 30 fps 1–121, 23 bones, 0 constraints, nothing hidden, is_dirty False); GLB imports FINISHED (18 objects, actions Idle + ready_to_go, Avatar_Root identity scale 1, 4 slots bone-parented Head/Chest/Hand_L/Hand_R).
  - Previews opened (contact sheets L8 q3/side/back, L9 q3/side, L0 q3 at t0–4): gear attached throughout, tips planted, pack and belt seated, headlamp on, no visible clipping. Motion reads as a calm head glance; the shrug is very subtle at full-body framing — readability to be judged at QA (not a gate failure; the A.2/§14.8 limits bind).
Asset repair cycle: 0/2 (repair cycles total 0/2)
Integration gate: PASS (2026-10-20 00:50; evidence by frontend in scratch e012/, screenshots opened by the lead)
  - Lead diff review (00:48): files newer than cycle start = exactly the 14 §21 files (13 changed + useReadyToGo.ts new), the 012 spec, checkpoint, feature012 assets/evidence, the versioned GLB. Nothing under Project/Backend, public/** other than the new GLB, package.json, docs other than the spec. No asset newer than the gate. No transform offsets (AvatarStage diff: LoopOnce + clampWhenFinished ready action, 0.25 s crossFadeTo both ways, finished listener, mixer advances while ready/settling, reduced motion stops the clip). Manifest: model → avatar-base-ready-to-go.glb, readyClip 'ready_to_go', version 1. Continue still the single /home seam (GearStudioScreen :789). No /plans, Plan reads, storage, or camera code.
  - Evidence: build/lint 0; GLB ?v=1 200, avatar-base.glb never requested; console clean (2 pre-existing warnings); equip/unequip shots; double-click Finish → one POST 201 at 10790 ms → playing 10797 → complete 14816 (4,019 ms); second Finish POST 200 "is already saved", clip once; same canvas + WebGL2 context after a non-visual equip; GLB aborted → unavailable/none, completion 3 ms after save; original bytes on the versioned path → ready=none, completion 2 ms; reduced motion → none, 3 ms; extra: 503 → failed + Try again, no clip, polite region empty; Pause mid-clip completes UI; unequip mid-clip ok; 390 px static completion.
  - Accepted deviations (verify, do not fail alone): flushSync for one "Plan saved" render; no silence() on a skipped clip (single announcement per §16/AC-22); status fed to useReadyToGo from shownStatus; silence required prop; playReady refuses while paused.
Frontend repair cycle: 0/2

Agents completed:
- three-d (stage B contract validation, 23:44; read-only, baseline hashes re-verified equal)
- three-d (stage C asset production, 23:57; 6 saves, 1 export, 147 previews, no .blend1)
- frontend (stage E + F evidence, 00:47; QA account otc-qa-012-d5015c, password only in scratch e012/creds.json)
- qa (Lean run 1, PASS)

Agents skipped:
- ui-ux (no new page; spec approved, completion reuses the Finish row design)
- backend-api (no backend change; spec §21)

Files changed (this cycle):
- docs/FRONTEND_CONTEXT.md (header, §1 row, §8 avatar + Finish preparation, §9 FEATURE-012) and docs/PRODUCT_REQUIREMENTS.md §11.1 last bullet: current state after implementation
- docs/features/012-ready-to-go-3d-completion.md (U1 decision recorded, frozen)
- assets/blender/feature012/avatar-gear-studio-ready-to-go.blend (copy)
- assets/blender/feature012/evidence/baseline.json
- .claude/state/features/012-ready-to-go-3d-completion.md
- Project/Frontend/public/models/avatar/avatar-base-ready-to-go.glb (new) + assets/blender/feature012/{evidence/*, previews/* (147)}
- Project/Frontend/src/features/plans/components/FinishPreparation.tsx, plans/content.ts, loadout/hooks/useReadyToGo.ts (new), loadout/components/GearStudioScreen.tsx, loadout/components/StudioStage.tsx, avatar/avatarManifest.ts, avatar/AvatarViewer.tsx, avatar/viewerTypes.ts, avatar/viewerStatus.ts, avatar/runtimeTypes.ts, avatar/index.ts, avatar/runtime/AvatarRuntime.tsx, avatar/runtime/RuntimeController.tsx, avatar/runtime/AvatarStage.ts

Environment (00:19): listening 5173, 5432, 8180, 8081, 8082, 8083, 8085, 8086.

Product Gate (2026-10-20): ACCEPTED by the user. Current ready_to_go motion accepted as final (visible glance down at gear, subtle shoulder preparation, restrained ready posture, ~4 s); no larger gesture and no other variant. The three-d motion-plan adjustment (pole sliding with larger torso/hip motion; hip shift W2 withdrawn; spec §14.8) is recorded as an implementation constraint, not a defect. Closeout record in spec §25.

Known limitations (accepted):
- The movement is subtle, especially the shoulder adjustment; a first-time viewer may mainly perceive "looks down, checks gear, gets ready" rather than a distinct backpack-strap pull. Accepted; not to be reworked.
- The manifest schema comment still describes `version` as bumped on any GLB change; U1 uses a new path instead (documented in spec §14.4 and the manifest header comment).

Deferred / not run (not passed; FEATURE-012 not reopened for them):
- Every visible equipment combination in the browser (L8 checked in Asset Gate renders only).
- Hidden-tab behavior during the clip.
- Uncommon Plan-save failure variants (network abort, unconfirmed, past date, trail gone).
- Safari; a real screen reader; physical phones.

Asset tracking: no Git/Git LFS decision made at closeout; .glb, .blend, and previews are untracked and uncommitted. Separate repository decision.

Test data left behind: Keycloak/user-service account otc-qa-012-d5015c (QA Daypack 28L, QA Trekking poles, QA Water bottle, QA-012 Rain shell); Quarry Rock Plans 2026-10-23..26, 10-28..30, 11-02..14. Password only in the non-persistent scratch dir. QA data intentionally left in place at closeout; no cleanup required.

Files changed at closeout (docs only): docs/features/012-ready-to-go-3d-completion.md (status, §25), docs/PRODUCT_REQUIREMENTS.md (§11.1 heading, §11.2 rows, §22 rows), docs/FRONTEND_CONTEXT.md (header, §1 rows, §9 FEATURE-012), CLAUDE.md (roadmap), this checkpoint.

Next:
- FEATURE-013 — My Plans & Calendar (NEXT; not started; begins only when the user asks).
