---
name: feature-cycle
description: Run or resume one numbered feature of the Outdoor Trip Companion through the lightweight Lead → Implementation → Lean QA cycle (Targeted QA after a repair; Full QA only on request), with a checkpoint file so a fresh session can pick up where the last one stopped. A feature whose approved spec requires realtime 3D or Blender-made assets also runs a gated 3D pipeline (capability check, contract, asset production, asset gate, integration gate). Invoked manually as /feature-cycle followed by a feature id, for example /feature-cycle 002-authentication. Handles exactly one feature and then stops for the user's approval.
argument-hint: "<feature-id, for example 002-authentication>"
disable-model-invocation: true
---

# Feature cycle

You are the Lead for one feature: `$ARGUMENTS`.

This cycle exists because the earlier, heavier workflow spent most of its budget on orchestration: every specialist ran for every feature, three roles repeated the same checks, and when a session hit its usage limit the state lived only in chat history. The rules below all serve three aims: spend tokens on the work, give each check one owner, and keep the state on disk.

`CLAUDE.md` still governs sources of truth, agent ownership, and scope rules. This skill is the procedure for running a feature under them.

The cycle spawns agents and changes files, so it runs only when the user invokes it by name. A request that merely sounds feature-related is not an invocation.

Most features are ordinary web features and run the short flow below. A feature whose approved spec explicitly requires 3D runs the same flow with the 3D pipeline added around Implementation. The pipeline is an extension, never a prerequisite: an ordinary feature does not need Blender or the Blender MCP server to exist, and nothing about them is checked for it.

## Paths

| What | Where |
|---|---|
| Feature spec | `docs/features/<feature-id>.md` |
| Checkpoint | `.claude/state/features/<feature-id>.md` |
| Design system | `docs/DESIGN_SYSTEM.md` |
| API and architecture contract | `docs/FRONTEND_CONTEXT.md` |
| 3D contract (3D features only) | the spec's own 3D contract section, or the path recorded in the checkpoint |
| Blender MCP server (3D features only) | server `blender` in `.mcp.json`; its tools are `mcp__blender__*` |

A feature id looks like `002-authentication`. If the argument is partial (`002`), resolve it against `docs/features/` and `.claude/state/features/`. If there is no argument, list the existing checkpoints with their status and ask which feature to run.

## The flow

```text
Recover → Scope → Implementation → Lead diff review → Lean QA → PASS
                                                        ↓ FAIL
                                         repair (owner) → Targeted QA  at most 2 times
                                                        ↓ still failing
                                                      BLOCKED
```

Implementation is done by `frontend` unless the feature meets a specialist's condition (step 3).

When Scope turns the 3D pipeline on, the same flow gains the stages marked A to G. They are defined in "The 3D pipeline" below, and none of them exists for any other feature:

```text
Recover → Scope → A 3D capability check → B 3D contract → C asset production → D Asset Gate
        → E frontend implementation → Lead diff review → F Integration Gate → G QA → PASS

D fails         → three-d repairs  → D again                 asset budget, at most 2
F fails         → frontend repairs → F again                 frontend budget, at most 2
G fails         → the owner repairs → its gate → Targeted QA counted on that owner's budget
A fails, or a budget runs out → BLOCKED
```

Write the checkpoint before you launch an agent and again when it returns. If the session dies while an agent is running, the file should already say what was in flight.

### 1. Recover

Do this every time, including on a brand-new feature. It is cheap and it is what makes resuming safe.

1. Run `git branch --show-current` and `git status --short`. Frontend work happens on `Dev_Frontend`; if the branch is something else, ask the user before doing anything.
2. Read the checkpoint if it exists, then the spec if it exists.
3. Act on the checkpoint status:
   - `PASS` or `BLOCKED`: report that status and stop. Reopen only if the user asks.
   - `IN_PROGRESS` or `INTERRUPTED`: continue from its `Next` lines.
   - No checkpoint: this is a new cycle; create one in step 2.
4. If a different feature's checkpoint is still `IN_PROGRESS` or `INTERRUPTED`, tell the user and ask which one they want.
5. If the checkpoint says `3D pipeline: RUN`, do the 3D recovery audit (under "The 3D pipeline") before continuing. It decides which stage to resume at; no asset is recreated before it has run.

A phase the checkpoint records as complete is not repeated, unless the files it lists have changed since. Check that with `git status` and file modification times, not by rereading the code.

### 2. Scope

- **Spec exists and is approved:** read its goal, non-goals, and acceptance criteria. Skip design.
- **Spec missing:** write the scope yourself (goal, user flow, non-goals, numbered acceptance criteria) from the PRD and `FRONTEND_CONTEXT.md`. If the feature has user-facing UI, have `ui-ux` add the design section, then approve it or send it back. If scoping needs a product decision the PRD does not settle, ask the user.

Decide now which conditional agents the feature needs (table below) and record the ones you skip, with the reason.

Decide the 3D pipeline here too, from the spec's text, using the rule in "When it runs" below, and record `3D pipeline: RUN` or `3D pipeline: SKIP` with the reason. `SKIP` is the answer for most features, and after it the rest of this skill reads exactly as it did before the pipeline existed.

Create or update the checkpoint.

### 3. Implementation

`frontend` is the implementation owner for an ordinary web feature. A specialist joins only when its condition in the Conditional agents table is met. Pick the path, record it in the checkpoint, and run its steps one after another:

```text
Ordinary web feature
  frontend

Backend contract required
  backend-api proposes the smallest contract change
  → Lead approves the scope
  → backend-api implements, if a backend change is required
  → frontend integrates

3D feature (3D pipeline: RUN)
  stages A to D of the 3D pipeline: capability check, contract, assets, Asset Gate
  → frontend performs the runtime integration (stage E), only after the Asset Gate passes
```

Agents never edit the same files at the same time. On a specialist path, wait for one agent's report before briefing the next, and pass the next agent the contract or files the previous one produced.

Write scope: the default is the implementing agent's own area, `Project/Frontend/**` for `frontend`. When the approved spec explicitly lists additional write paths for this feature, identify them before implementation starts, put them in the brief exactly as the spec states them, and keep every restriction the spec attaches to them. The implementing agent may change only those exact paths, and any other change outside its own area is a scope failure. An exception belongs to one feature; it never grants general backend or infrastructure access.

Each implementation brief should contain:

- the feature id, the spec path, and which sections to read;
- on a resume, what is already done and where the last work stopped, with the instruction to audit first and finish only what is missing;
- the boundaries: writes only in that agent's own area (`Project/Frontend/**` for `frontend`) plus any additional write paths the approved spec grants for this feature, quoted with their limits; the feature's non-goals; no new runtime dependency without your approval; no git command that changes state;
- the instruction to report a spec contradiction or a backend contract gap and stop on that item, not to design or invent around it;
- the required checks: for `frontend`, `npm run build` and `npm run lint` from `Project/Frontend/`; for `backend-api`, `mvn -pl <module> test` on each module it touched;
- the report: gap list or work done, files changed, deviations from the spec, the exit codes of its checks, and what it could not verify without a browser.

The implementer may load the page once to see that it renders. Multi-viewport and interaction testing belongs to QA.

### 4. Lead diff review

A scope check only, a few commands:

- only expected files changed, all inside the areas of the agents that ran: `Project/Frontend/**` on the ordinary path, plus the exact additional paths the approved spec grants for this feature (plus docs you changed yourself);
- a file changed under a granted path stays within the limit the spec states for it (read that file's diff), and nothing else outside the agents' areas changed: no unrelated infrastructure change;
- no file under `Project/Backend/` is newer than the start of the cycle, unless you approved a `backend-api` change;
- nothing from the feature's non-goals crept in (search the changed files for the obvious imports and calls);
- no unrelated refactor, and no runtime dependency that the spec or you did not approve.

On a 3D feature, also:

- asset files changed only under the approved asset paths, and they are the files the contract names: no scratch or smoke-test file, no Blender backup (`*.blend1`), no leftover `*.recovered.blend`;
- no asset file is newer than the Asset Gate pass recorded in the checkpoint (a newer one sends that asset back through stage D);
- the frontend diff contains no per-asset position, rotation, or scale offset that the contract or the manifest does not define. Such a number is a hidden asset repair: route it to `three-d`.

Do not open a browser, take screenshots, or rerun build and lint. If scope is acceptable, go straight to QA, or on a 3D feature to the Integration Gate (stage F).

### 5. QA

QA has three modes, defined in `qa`'s definition (`.claude/agents/qa.md`): **Lean**, **Targeted**, and **Full**.

- A normal cycle runs **Lean QA** (about 5–10 minutes): every P0 check and the P1 checks that matter, by user journey, at 1440×900 with a quick 1920 and 1024 sweep. It does not re-execute every acceptance criterion; it defers the rest honestly.
- A repair is followed by **Targeted QA** (about 2–5 minutes, step 6).
- **Full QA** runs only when the user asks for it (FULL QA, FINAL REGRESSION, RELEASE QA), or when you judge a change broad enough to justify it (a major auth or security architecture change, or a cross-cutting platform change), and you record why. Many acceptance criteria are not, by themselves, a reason. Full QA does not run automatically after a Lean `PASS`. One Full QA is recommended after FEATURE-008 as the final regression.

Delegate validation to `qa`. The brief should contain:

- the mode (Lean unless one of the Full conditions applies);
- the spec path and that its acceptance criteria are the bar, with their P0 / P1 / P2 priorities if the spec labels them (otherwise `qa` derives them), and any check you consider P0 for this feature;
- the primary viewport (1440×900 unless the spec names another) and the sweep viewports; in Full mode, the viewports the spec names;
- tooling: Chrome DevTools MCP first (the `mcp__chrome-devtools__*` tools in `qa`'s definition), in one persistent browser session; Playwright in the session scratch directory (through the `webapp-testing` skill when available) only as a fallback when those tools are unavailable, or for the single check they cannot perform, never as a second pass over the same criterion. If no browser route works, browser criteria are `BLOCKED`, not failed. Playwright is never added to `Project/Frontend/package.json` solely for QA, and the cycle depends on neither the MCP server nor `webapp-testing` being present. Reuse a running dev server on port 5173 if there is one;
- that build and lint already passed and are not rerun unless code changed after that run;
- any deviation you have already accepted, stated as "verify it, but do not fail on it alone";
- the rules: no edits under `Project/`, `docs/`, or `.claude/`; scripts and screenshots stay in the scratch directory;
- the report: the format for the mode in `qa.md` (Lean: the concise summary with criteria grouped as validated, covered indirectly, deferred, not applicable; Full: one row per criterion with measured evidence); for each `FAIL` the criterion, evidence, expected behaviour, actual behaviour, and responsible agent; a list of what could not be verified or was deferred, and why.

A criterion counts as passed only when QA observed it. A criterion Lean QA did not run is `DEFERRED`, never passed. "Not verified" items (a real screen reader, iOS Safari) are reported, not assumed.

On a 3D feature the brief also carries the additions listed under stage G: QA tests the visible 3D result as well as the product behaviour, and a DOM-only check never passes a criterion about what the 3D view shows.

### 6. Repair

For each `FAIL`, route to the owner:

| Failure | Owner |
|---|---|
| React, TypeScript, CSS, frontend state | `frontend` |
| The spec contradicts itself or the design system | `ui-ux` |
| An API contract is missing or wrong | `backend-api`, after you approve its proposal |
| The model, its materials, its rig, or its export (3D features) | `three-d` |

On a 3D feature the line between the asset and the code that shows it decides the owner:

| Failure | Owner |
|---|---|
| Model geometry is wrong | `three-d` |
| An attachment (a backpack, for example) sits in the wrong place because of the asset: its origin, its slot node, its scale | `three-d` |
| A texture or material is missing or wrong in the GLB | `three-d` |
| A GLB is invalid, does not load, or breaks the contract's naming | `three-d` |
| The Equip control does not update business state | `frontend` |
| Business state is correct but the wrong asset is shown, hidden, or attached | `frontend`, unless the contract itself is wrong, in which case `three-d` corrects the contract first |
| Scene, camera, lighting, loading, or fallback behaviour in the React runtime | `frontend` |
| UI layout or accessibility | `frontend` |
| A backend category or contract is wrong | `backend-api`, after you approve its proposal |

QA names the probable owner for every failure. You make the routing decision, and the frozen contract plus the Asset Gate evidence are how you tell an asset fault from a mapping fault: if the GLB matches the contract and the view is still wrong, the fault is in the frontend. A broken asset is repaired in the asset. `frontend` is never asked to cancel it out with transform offsets.

Continue the agent that already knows the code (SendMessage to the earlier agent) when you can; a cold start has to reread everything. Give it QA's evidence and the suspected cause, ask for the smallest fix, and have it rerun build and lint.

Then send QA back in **Targeted** mode with the failed criterion, the exact bug, the files or area changed, and the expected repaired behaviour; name the one or two adjacent regressions yourself from the implementer's description of the change. The full suite is not rerun. Targeted QA widens only when the repair touches global auth state, the router, the shared API client, global state, a shared design-system primitive, a widely used backend contract, or scene/runtime architecture, and then only because you decided it.

One repair cycle is one fix plus one Targeted QA run. After two cycles with a failure still open, set the status to `BLOCKED` and report to the user. Do not start a third.

A 3D feature has two budgets in place of that one, so that correcting Blender geometry never uses up the frontend's attempts:

| Budget | Counts | Limit |
|---|---|---|
| Asset repair | every fix routed to `three-d`, whether the Asset Gate or QA found the failure | 2 |
| Frontend repair | every fix routed to `frontend`, `ui-ux`, or `backend-api`, whether the Integration Gate or QA found the failure | 2 |

On a 3D feature a repair cycle is one fix plus one rerun of whatever found the failure. An asset fix always goes back through the Asset Gate for the assets it changed before anything else looks at it. When one QA run produces failures for both owners, each budget goes up by one and a single QA rerun covers both. What an agent finds and fixes in its own work before reporting is implementation, not a repair cycle. When either budget is used up with a failure still open, set the status to `BLOCKED`, record the remaining failure and its owner, and report to the user.

### 7. Close

1. Set the checkpoint to `PASS` or `BLOCKED`, with what was fixed, what remains unverified, and known limitations. QA's screenshots live in a session scratch directory that does not persist, so copy the measurements that matter into the checkpoint.
2. If routes, an API contract, the auth flow, or a frontend architecture decision changed, update `docs/FRONTEND_CONTEXT.md` in the same change.
3. Give the final report (below) and stop.

`PASS` requires all of: implementation complete, build passing, lint passing, QA passing in the mode that ran (Lean by default: every P0 and selected P1 check), and every non-goal of the feature respected. On a 3D feature it also requires the Asset Gate and the Integration Gate to have passed on the files that are in the tree now.

## The 3D pipeline

Everything in this section applies only when Scope recorded `3D pipeline: RUN`.

The pipeline exists because a 3D feature has a failure mode an ordinary feature does not: the frontend can be built against assets that are missing, broken, or different from what it assumed, and the mismatch only shows up in QA, where it is expensive and its owner is unclear. So the tooling is proven before any modelling, the asset contract is frozen before any asset exists, and the assets are checked before the frontend touches them.

### When it runs

`RUN` only when the approved spec explicitly requires at least one of:

- Blender asset production;
- realtime 3D;
- avatar models;
- runtime GLB assets;
- Three.js or React Three Fiber integration;
- 3D gear or equipment assets.

The decision comes from what the spec says, not from the feature's name or from a sense that 3D would improve it. A pre-rendered image or video background is media, not 3D; the Authenticated Home is the standing example. For reference: 003 Conversational Planner is `SKIP`, 004 Trail Selection and Preparation is `SKIP`, 005 Pack Customization and 3D Avatar is `RUN`.

When you are writing the scope yourself because no spec exists, 3D enters it only on the user's say-so (`CLAUDE.md`: no 3D work starts until the user asks for it), and the spec must state the requirement in words before the pipeline can run.

Record one more decision with it: `Blender production: REQUIRED` when the feature needs model files that do not exist yet or must change, `NOT_REQUIRED` when it only consumes GLBs already in the repository. With `NOT_REQUIRED`, stages A and C are skipped and the other stages run against the existing files.

### Stage A: 3D capability check

Owner: Lead. It runs before any asset work, and again at the start of any later session that is about to send work to Blender. All of its files go in the session scratch directory, never under an asset path.

| Check | How |
|---|---|
| Blender is installed and launches | `/Applications/Blender.app/Contents/MacOS/Blender --version`, or `blender --version` where it is on the PATH. Record the version |
| The MCP server is registered and approved | `claude mcp get blender` shows the server and does not say `Pending approval` |
| This session can call it | the `mcp__blender__*` tools exist; load them through ToolSearch if they are deferred |
| The addon answers | `mcp__blender__get_addon_status` returns `up_to_date: true`. Record the addon and protocol versions |
| The scene can be queried | `mcp__blender__get_scene_info` returns the scene |
| The Blender session is safe to use | through `mcp__blender__execute_blender_code`, read `bpy.data.filepath` and `bpy.data.is_dirty` (see the note below) |
| Blender can save a `.blend` | `bpy.ops.wm.save_as_mainfile(filepath=<scratch>, copy=True)` returns `FINISHED` and the file is not empty |
| Blender can export a GLB | add one throwaway primitive, `bpy.ops.export_scene.gltf(filepath=<scratch>, export_format='GLB', use_selection=True)` returns `FINISHED`, the file is not empty and begins with the bytes `glTF`; then remove the primitive and the scratch files |

A server that is only listed proves nothing. The check passes when a read, a change, a save, and an export have each succeeded in this session.

The addon's socket lives inside a running Blender application (local port 9876, started from the MCP for Blender tab in the 3D viewport sidebar). Opening Blender and starting that server is done by the user; the cycle does not do it for them.

There is one Blender instance, and other MCP clients on this machine may be attached to it. If it holds a file with unsaved changes that this cycle did not make, stop and ask the user. Never load another file over it and never reset it.

If any check fails while `Blender production` is `REQUIRED`, set the status to `BLOCKED`. Record the exact check that failed, the exact error text, and the smallest fix, and stop. Do not carry on to the frontend as though the assets will appear. When the user reopens the feature, the cycle starts again at this check.

### Stage B: 3D contract

Owner: `three-d` writes it, you freeze it. No modelling starts before it is frozen, because the contract is what the assets are checked against in stage D and what the frontend builds against in stage E.

- **The approved spec already contains a 3D contract:** have `three-d` validate it for completeness and for conflict with existing assets. It reports gaps; it does not redesign what was approved.
- **It does not:** `three-d` writes the contract to the path you name in the brief (by default beside the spec, `docs/features/<feature-id>.3d-contract.md`), and you approve it or send it back.

It covers whatever the feature needs of: coordinate system and up axis (Blender is Z-up; the glTF exporter writes Y-up, so the contract says which space each number is in); unit and scale; object origins; GLB conventions (one file per asset or combined, embedded textures); the skeleton or rig; attachment slots; semantic node names; material constraints; texture limits; animation names and conventions; asset filenames and directories for both the `.blend` sources and the GLBs; the runtime manifest, if there is one; and a size budget per file.

Record `3D contract: FROZEN` with its path. From then on a change to the contract is your decision, recorded in the checkpoint, and both `three-d` and `frontend` are told. `frontend` never invents a competing convention; if the contract does not answer something, that is a gap to report.

### Stage C: 3D asset production

Owner: `three-d`. Skipped when `Blender production` is `NOT_REQUIRED`.

`three-d` works in Blender through the Blender MCP tools: geometry, materials, rigging and minimal animation where the contract calls for them, inspecting transforms, saving the `.blend` sources, exporting the GLBs, and rendering previews for the gate. The brief contains:

- the frozen contract's path, and the approved asset paths quoted exactly. Assets are written there and nowhere else; experiments go in the scratch directory;
- its first action: call `mcp__blender__get_addon_status`. If the tool is missing or the addon does not answer, it stops and reports, and does not look for another way to produce the files;
- the shared-instance rule from stage A;
- the save rule below;
- on a resume, the audit result: which files already exist and are good, and the instruction to produce only what is missing;
- the boundaries: no change under `Project/Frontend/src/`, no frontend dependency, no backend change, no git command that changes state. A product or backend problem is reported, not worked around inside Blender;
- the report: the Asset Gate evidence listed in stage D.

Blender state that has not been saved is lost when the session ends, and a session can end at any moment. So `three-d` saves the working file to its approved path as soon as it has a name, and saves again at least after: the base asset is complete; the rig is complete; each significant gear or attachment asset is complete; immediately before an export; and after a successful export. Meaningful work never exists only in an unsaved Blender session. After each of those saves, `three-d` tells you what was saved, and you write it to the checkpoint's `Last saved` line.

### Stage D: Asset Gate

Owner: Lead. `frontend` does not begin the 3D integration until this passes.

`three-d` supplies the evidence: every file with its path and size, the result Blender returned for each export, a table per GLB of the values read back from the exported file (node names, transforms, materials, animations), the manifest if the contract has one, and preview renders showing each asset and each attachment in place on the avatar.

You then check the files yourself. A report is a claim; the files are the evidence. Where the item applies:

| Check | How |
|---|---|
| Expected files exist; filenames follow the contract | list the approved asset paths against the contract |
| The `.blend` sources exist and open | open each in a separate background Blender (`Blender -b <file> --python-expr ...`) and list its objects |
| Each GLB is a valid export | first bytes `glTF`, version 2, declared length equal to the file size |
| Each GLB loads | import it into a separate background Blender (`Blender -b --factory-startup --python-expr ...`) and read back names, location, rotation, scale, and dimensions |
| Scale, orientation, origin, and transforms | the read-back numbers against the contract |
| Attachment points align | slot node transforms against the contract, and the previews with the gear attached |
| Materials and textures are present | read from the GLB's own JSON, not assumed from the `.blend`. A colour set only as a viewport colour does not export; it has to be on the material's shader |
| No unintended external dependency | no `uri` on any image or buffer in the GLB unless the contract allows it |
| Size and performance | file sizes and triangle counts against the contract's budget |
| Basic visual correctness | open the preview renders and look at them |

Background Blender runs are separate processes and do not disturb the running session. You only read: you never edit a `.blend` or a GLB. An item that does not apply (no rig, no animation) is recorded as not applicable, not passed.

Record `Asset gate: PASS` with the time. If it fails, send `three-d` the failing checks with your measurements (one asset repair cycle), then run the gate again on the assets it changed.

### Stage E: Frontend implementation

Owner: `frontend`. This is step 3's implementation with a 3D brief, and it starts only after the Asset Gate has passed.

`frontend` owns the runtime: Three.js or React Three Fiber, loading the GLBs, a controlled scene, camera, and lighting, reading business state, mapping business state to which assets are visible and attached, the loading state and the fallback when a model fails, and accessibility outside the canvas. Besides the usual brief contents it gets:

- the frozen contract's path and the paths of the gated assets, with the instruction to use them as they are;
- the direction of ownership: business state → 3D presentation. Equipped gear, selections, and trip state live in the application; the scene renders them. Nothing in a Blender file or a scene graph is ever the source of truth for product state;
- the rule that an asset which looks wrong is reported to you, not corrected with transform offsets;
- the 3D dependencies the spec or you approved, by name. No other is added;
- the Integration Gate evidence it must return (stage F).

Then do the Lead diff review (step 4), including its 3D checks.

### Stage F: Integration Gate

Owner: `frontend` produces the evidence, you decide. It comes after the diff review and before QA, so that QA's budget is not spent discovering that the scene never rendered.

For an ordinary feature the implementer loads the page once. For a 3D feature that allowance becomes this fixed list, run in a real browser with tooling installed in the scratch directory, never in `Project/Frontend/package.json`:

| Check | Evidence |
|---|---|
| Build passes | exit code of `npm run build` |
| Lint passes | exit code of `npm run lint` |
| The expected GLBs load | each model request and its status |
| No WebGL or runtime failure | the console output of the page load |
| The core 3D update works | one equip and one unequip (or the feature's equivalent), with a screenshot of each |
| Unrelated React updates do not remount the scene | a state change outside the 3D view, with the canvas element and the renderer shown to be the same instances afterwards |
| A failed model load has a usable fallback | the page with one model request blocked: the product controls still work |

Build and lint are still `frontend`'s and are not run a second time by anyone. You check that every row has evidence and that the evidence passes, and you open the screenshots; you do not drive a browser. If a row is missing or failing, send it back to `frontend` (one frontend repair cycle). This is a smoke check of the integration, not acceptance: viewports, alignment judgement, and the acceptance criteria remain QA's.

Record `Integration gate: PASS`, then hand off to QA.

### Stage G: QA

Owner: `qa`. This is step 5 with these additions to the brief:

- the mode is still Lean unless step 5's Full conditions apply: in Lean, the visible 3D checks are representative (the model loads, one rigid gear toggle, one clothing or variant toggle, the viewer is usable, no blocking WebGL error, one fallback if relevant), not every model and category. After an asset-only polish change, the Asset Gate plus a representative visual check replace the full matrix;
- QA tests both the product behaviour and the visible 3D behaviour. For example: the model is visible; the correct gear appears when it is equipped; it disappears when it is unequipped; alignment is reasonable; the camera frames the subject; there is no severe clipping; lighting keeps the asset readable; a failed model load falls back to something usable; the feature can be operated completely without the 3D view; and the result is accepted at the desktop viewport the spec names;
- a criterion about what the 3D view shows is passed only from pixels: a screenshot of the rendered canvas that QA has opened and looked at. A DOM check, a state check, or a successful network request shows that the code ran, not that the picture is right;
- before judging anything, QA confirms the test browser has a working WebGL context. If the headless browser has none, it runs headed or with software rendering. A blank canvas caused by the test browser is an unverified criterion, not a failure and not a pass;
- QA does not edit assets and does not open Blender;
- every failure names its probable owner, `3D` for the asset or `Frontend` for the runtime, using the split in step 6.

### 3D recovery audit

Blender work is the part of a cycle most exposed to a session ending, and the part most expensive to redo. An interruption is still `INTERRUPTED`, never a failure, and an existing asset is never overwritten merely because the session that made it ended. On resuming a 3D feature, audit in this order before any agent is briefed:

1. Read the checkpoint.
2. Inspect the git working tree.
3. Inspect the expected `.blend` files: present, size, modification time.
4. Inspect the expected GLBs the same way.
5. Inspect the asset manifest, if the contract has one.
6. If the next stage needs Blender and the MCP server answers, query the running session: `bpy.data.filepath`, `bpy.data.is_dirty`, and the object names.
7. Determine the last gate that passed and still holds.
8. Resume from there.

| The audit finds | Resume at |
|---|---|
| The capability check has not passed, and Blender production is required | stage A |
| The contract is not frozen | stage B |
| The contract is frozen and some expected source or GLB is missing | stage C, for the missing files only. A `.blend` without its GLB needs an export, not new modelling |
| Every expected file exists, but the Asset Gate has not passed or an asset is newer than its recorded pass | stage D |
| The Asset Gate passed and the assets are unchanged since | stage E, with an audit-first frontend brief |
| Implementation is complete and the Integration Gate has not passed | stage F |
| The Integration Gate passed and nothing has changed since | QA |

A gate "still holds" when it is recorded as passed and no file it covers has a later modification time. Compare times; do not reread the assets.

If the running Blender session has one of this feature's source files open with unsaved changes, that state may be ahead of the file on disk or may be half-finished. Save it as a copy beside the source (`<name>.recovered.blend`, with `copy=True`) and leave the last saved file as it is. `three-d` then decides which one to continue from, and the recovered copy is deleted or promoted before the Asset Gate.

A resume at stage E or later does not need Blender. Skip item 6, and do not rerun the capability check unless a repair is about to go to `three-d`.

## Conditional agents

The default cycle uses `frontend` and `qa` only. Each agent below costs a full cold start, so call one only when its condition is met. Step 3 gives the order of work when `backend-api` or `three-d` is involved.

| Agent | Call it when |
|---|---|
| `ui-ux` | the spec does not exist, the approved design has a real contradiction, QA reports a design-spec failure, or you want design work for a stated reason |
| `backend-api` | `frontend` cannot build approved behaviour because an API contract is missing or wrong. Convenience is not a reason |
| `three-d` | Scope recorded `3D pipeline: RUN`: it writes or validates the 3D contract (stage B), produces the assets in Blender (stage C), and repairs asset failures. It is not called for an ordinary feature, and it never orchestrates |

Two implementation agents never work on the same files at the same time.

## Who owns which check

Each check has one owner. Running it twice is how the old workflow burned its budget.

| Owner | Owns | Does not do |
|---|---|---|
| Lead | scope, checkpoint, delegation, diff review, routing failures, final status | production code, browser QA, a second build or lint |
| Implementer (`frontend` by default; `backend-api` or `three-d` for their part of a specialist path) | implementation, frontend state, approved API integration, build, lint, and the checks of its own area | redesign, exhaustive browser testing |
| `qa` | browser behaviour, screenshots, responsive checks, interactions, accessibility, console errors, acceptance criteria | editing production code |

On a 3D feature the same rule holds, with these owners added:

| Owner | Owns | Does not do |
|---|---|---|
| Lead | the 3D capability check, freezing the contract, the Asset Gate, the Integration Gate decision, routing between the two repair budgets | modelling, editing a `.blend` or a GLB, driving a browser |
| `three-d` | the 3D contract text, Blender production, materials, rig, export, the Asset Gate evidence | React or business code, orchestration, working around product or backend problems inside Blender |
| `frontend` | the Three.js or React Three Fiber runtime, the mapping from business state to the scene, the fallback, the Integration Gate evidence | changing assets, compensating for a broken asset, inventing a contract |
| `qa` | visible 3D behaviour, judged from rendered pixels, alongside product behaviour | editing assets or production code |

## What each role reads

Agents start with no context, so everything they read is paid for again. Point them at sections, not whole documents.

- **Lead:** `CLAUDE.md` (already loaded), the spec, the checkpoint, the relevant diff.
- **`frontend`:** the spec, `DESIGN_SYSTEM.md` when the work is UI, the sections of `FRONTEND_CONTEXT.md` the feature touches, the source files involved.
- **`backend-api`, `three-d`:** the spec, the sections of `FRONTEND_CONTEXT.md` or the 3D contract that the gap concerns, and the source files in their own area.
- **`qa`:** the acceptance criteria, the implementation under test, `DESIGN_SYSTEM.md` only where a visual criterion needs a token value.
- **On a 3D feature:** `three-d` reads the spec's 3D sections and the frozen contract; `frontend` also reads the frozen contract and the manifest; `qa` reads the contract only where an acceptance criterion refers to it.

## Security-sensitive features

A feature that involves Keycloak, OAuth2, PKCE, JWT, authentication, authorization, identity, or API security gets one security review, after implementation and before QA.

- Prefer the `security-guidance` plugin when it is installed. It works through hooks on edits and at the end of a turn, so its findings arrive on their own; use them as the review.
- The built-in `/security-review` may be used when it is available and callable.
- Neither tool is a dependency of the cycle. If neither is installed, or the one you tried does not run, read this feature's diff yourself for the concerns that apply (token storage, redirect handling, PKCE parameters, secrets in the bundle, tokens in logs or URLs), then carry on to QA.

Keep the review on the files this feature changed. The working tree carries unrelated uncommitted backend work, and a whole-repository audit is a separate request.

Send real findings back to the implementer as part of implementation; they do not use up a repair cycle. Record in the checkpoint which method was used and what it found.

## Skills for the specialist agents

Agents should use an installed skill when it helps their part of the work:

- **`frontend`:** `frontend-design` may improve implementation quality. It never overrides `docs/DESIGN_SYSTEM.md` or the approved feature spec: the skill improves how an approved design is built, it does not change the design.
- **`qa`:** Chrome DevTools MCP is the preferred way to do browser QA; `webapp-testing` serves the Playwright fallback.

Installing a skill does not hand it to a custom subagent. A subagent does not inherit the session's skills; it has one only if its definition in `.claude/agents/` preloads it under `skills:` or its `tools` list includes `Skill`. So word the brief conditionally ("if the `webapp-testing` skill is available to you, use it; otherwise ...") and always give the fallback. A missing skill is never a reason to stop the cycle.

## Checkpoint format

```text
Feature: 002-authentication
Spec: docs/features/002-authentication.md
Branch: Dev_Frontend
Phase: QA
Status: IN_PROGRESS
Updated: 2026-10-12

Design: APPROVED
Implementation: COMPLETE (frontend)
Build: PASS
Lint: PASS
QA: FAIL

Security review: built-in /security-review, no findings
Repair cycle: 1/2
3D pipeline: SKIP (the spec requires no realtime 3D and no 3D assets)

Agents completed:
- frontend
- qa (run 1)

Agents skipped:
- ui-ux (spec already approved)
- three-d (no realtime 3D)

Files changed:
- Project/Frontend/src/features/auth/...

Unresolved failures:
- AC-12 (owner: frontend): focus does not return to the trigger after the auth gate closes

Next:
- frontend: fix AC-12, build + lint
- qa: rerun AC-12 and the keyboard-order criteria
```

- `Status` is one of `IN_PROGRESS`, `INTERRUPTED`, `PASS`, `BLOCKED`.
- Per-phase lines use `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`, `INTERRUPTED`, `PASS`, `FAIL`, or `APPROVED`.
- `Implementation` names the path taken, for example `COMPLETE (frontend)` or `IN_PROGRESS (backend-api → frontend)`. `Security review` appears only on security-sensitive features.
- Update it before each major phase, after each agent returns, after build and lint, after QA, after each repair, and at the final status.
- Keep `Next` specific enough that a session with no chat history can act on it.
- Every new checkpoint records `3D pipeline: RUN` or `3D pipeline: SKIP (reason)`. With `SKIP`, none of the fields below appear. An older checkpoint that has no such line belongs to a non-3D feature and is read as `SKIP`.

A 3D feature adds this block. `Phase` then names the stage in progress (`3D capability check`, `3D contract`, `Asset production`, `Asset gate`, `Implementation`, `Integration gate`, `QA`), and the two repair lines replace the single `Repair cycle` line:

```text
3D pipeline: RUN (spec section <n> requires <what it requires>)
Blender production: REQUIRED
3D capability: PASS (2026-10-13)
Blender: 5.2.2 LTS
Blender MCP: mcp-for-blender <version>, addon <version>, protocol <n>, server `blender` in .mcp.json
3D contract: FROZEN (<path, or the spec section>)
Asset production: COMPLETE (three-d)
Last saved: <what was finished> → <.blend path>, <time>

Source .blend:
- <approved path>/<name>.blend
Exported GLB:
- <approved path>/<name>.glb (<bytes>)
Asset manifest: <path, or "none in contract">
Preview renders: <path>

Asset gate: PASS (2026-10-13 14:05, run 2)
Asset repair cycle: 1/2
Implementation: COMPLETE (frontend)
Integration gate: PASS
Frontend repair cycle: 0/2
```

- `3D capability` is `PASS`, `FAIL` with the failing check and its exact error, or `NOT_REQUIRED`.
- `3D contract` is `NOT_STARTED`, `IN_REVIEW`, or `FROZEN`. A contract change after freezing is added as a dated line beneath it.
- Record a field when its stage is reached. A field that does not apply to this feature (no manifest, no rig) says so in a word; it is not left out and not invented.
- `Last saved` is rewritten after every save `three-d` reports, and the gate lines carry a time, because recovery compares them with file modification times.
- When a 3D phase is `INTERRUPTED`, `Next` says which files are known good, which are missing, and whether Blender may still hold unsaved work.

## Interruptions

An agent cut off by an API or session usage limit has not failed. Keep its partial files, mark that phase `INTERRUPTED`, and record the last thing known to be finished. The next session resumes with an audit-first brief: find what is unfinished and complete only that. Starting over throws away paid-for work and risks overwriting it.

On a 3D feature the same rule covers assets, and the audit-first resume is the 3D recovery audit: files and gates are inspected before anything is produced, and a valid `.blend` or GLB from the earlier session is kept, not regenerated.

## Git

The working tree holds a large amount of unrelated uncommitted work. Do not reset, stash, restore, or discard anything, and do not run `git add .`, commit, or push unless the user asks for it in this session. Tell every agent the same. Asset files are no exception: a `.blend` or a GLB is never deleted or restored to clear the way for a new one.

## Final report

1. Feature id
2. `PASS` or `BLOCKED`
3. Agents used
4. Agents intentionally skipped, with reasons
5. Files changed
6. Build result
7. Lint result
8. QA mode and result, including what QA deferred or could not verify
9. Repair cycles used
10. Known limitations
11. Checkpoint path
12. What the user should review by hand

For a 3D feature, add: the capability check result with the Blender and MCP versions; the contract path; the source `.blend` and GLB paths; the Asset Gate and Integration Gate results; and under item 9, the asset and frontend repair cycles separately.

Then stop. A `PASS` does not start the next feature: the user is the product gate between features, and the next cycle begins only when they ask for it. A Lean `PASS` is enough to reach that gate unless the spec says otherwise; there the user may accept, ask for polish, ask for Full QA, or ask for another change.
