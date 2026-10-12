---
name: feature-cycle
description: Run or resume one numbered feature of the Outdoor Trip Companion through the lightweight Lead → Implementation → QA cycle, with a checkpoint file so a fresh session can pick up where the last one stopped. Invoked manually as /feature-cycle followed by a feature id, for example /feature-cycle 002-authentication. Handles exactly one feature and then stops for the user's approval.
argument-hint: "<feature-id, for example 002-authentication>"
disable-model-invocation: true
---

# Feature cycle

You are the Lead for one feature: `$ARGUMENTS`.

This cycle exists because the earlier, heavier workflow spent most of its budget on orchestration: every specialist ran for every feature, three roles repeated the same checks, and when a session hit its usage limit the state lived only in chat history. The rules below all serve three aims: spend tokens on the work, give each check one owner, and keep the state on disk.

`CLAUDE.md` still governs sources of truth, agent ownership, and scope rules. This skill is the procedure for running a feature under them.

The cycle spawns agents and changes files, so it runs only when the user invokes it by name. A request that merely sounds feature-related is not an invocation.

## Paths

| What | Where |
|---|---|
| Feature spec | `docs/features/<feature-id>.md` |
| Checkpoint | `.claude/state/features/<feature-id>.md` |
| Design system | `docs/DESIGN_SYSTEM.md` |
| API and architecture contract | `docs/FRONTEND_CONTEXT.md` |

A feature id looks like `002-authentication`. If the argument is partial (`002`), resolve it against `docs/features/` and `.claude/state/features/`. If there is no argument, list the existing checkpoints with their status and ask which feature to run.

## The flow

```text
Recover → Scope → Implementation → Lead diff review → QA → PASS
                                                        ↓ FAIL
                                         repair (owner) → QA rerun     at most 2 times
                                                        ↓ still failing
                                                      BLOCKED
```

Implementation is done by `frontend` unless the feature meets a specialist's condition (step 3).

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

A phase the checkpoint records as complete is not repeated, unless the files it lists have changed since. Check that with `git status` and file modification times, not by rereading the code.

### 2. Scope

- **Spec exists and is approved:** read its goal, non-goals, and acceptance criteria. Skip design.
- **Spec missing:** write the scope yourself (goal, user flow, non-goals, numbered acceptance criteria) from the PRD and `FRONTEND_CONTEXT.md`. If the feature has user-facing UI, have `ui-ux` add the design section, then approve it or send it back. If scoping needs a product decision the PRD does not settle, ask the user.

Decide now which conditional agents the feature needs (table below) and record the ones you skip, with the reason. Create or update the checkpoint.

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

Realtime 3D feature
  three-d handles the 3D-specific implementation or contract
  → frontend performs the React integration, when required
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

Do not open a browser, take screenshots, or rerun build and lint. If scope is acceptable, go straight to QA.

### 5. QA

Delegate validation to `qa`. The brief should contain:

- the spec path and that its acceptance criteria are the bar;
- the viewports the spec names;
- tooling, in order of preference: the `webapp-testing` skill if it is installed and available to the QA agent; otherwise the locally installed Google Chrome driven by Playwright installed in the session scratch directory. Playwright is never added to `Project/Frontend/package.json` solely for QA, and the cycle does not depend on `webapp-testing` being present. Reuse a running dev server on port 5173 if there is one;
- that build and lint already passed and are not rerun unless code changed after that run;
- any deviation you have already accepted, stated as "verify it, but do not fail on it alone";
- the rules: no edits under `Project/`, `docs/`, or `.claude/`; scripts and screenshots stay in the scratch directory;
- the report: first line `PASS` or `FAIL`; one row per criterion with result and measured evidence; for each `FAIL` the criterion, evidence, expected behaviour, actual behaviour, and responsible agent; a list of what could not be verified and why.

A criterion counts as passed only when QA observed it. "Not verified" items (a real screen reader, iOS Safari) are reported, not assumed.

### 6. Repair

For each `FAIL`, route to the owner:

| Failure | Owner |
|---|---|
| React, TypeScript, CSS, frontend state | `frontend` |
| The spec contradicts itself or the design system | `ui-ux` |
| An API contract is missing or wrong | `backend-api`, after you approve its proposal |
| Realtime 3D | `three-d` |

Continue the agent that already knows the code (SendMessage to the earlier agent) when you can; a cold start has to reread everything. Give it QA's evidence and the suspected cause, ask for the smallest fix, and have it rerun build and lint.

Then send QA back for the failed criteria and the criteria the fix could plausibly touch. Name them yourself from the implementer's description of the change. The full suite is not rerun.

One repair cycle is one fix plus one QA rerun. After two cycles with a failure still open, set the status to `BLOCKED` and report to the user. Do not start a third.

### 7. Close

1. Set the checkpoint to `PASS` or `BLOCKED`, with what was fixed, what remains unverified, and known limitations. QA's screenshots live in a session scratch directory that does not persist, so copy the measurements that matter into the checkpoint.
2. If routes, an API contract, the auth flow, or a frontend architecture decision changed, update `docs/FRONTEND_CONTEXT.md` in the same change.
3. Give the final report (below) and stop.

`PASS` requires all of: implementation complete, build passing, lint passing, QA passing, and every non-goal of the feature respected.

## Conditional agents

The default cycle uses `frontend` and `qa` only. Each agent below costs a full cold start, so call one only when its condition is met. Step 3 gives the order of work when `backend-api` or `three-d` is involved.

| Agent | Call it when |
|---|---|
| `ui-ux` | the spec does not exist, the approved design has a real contradiction, QA reports a design-spec failure, or you want design work for a stated reason |
| `backend-api` | `frontend` cannot build approved behaviour because an API contract is missing or wrong. Convenience is not a reason |
| `three-d` | the feature involves realtime 3D: Three.js or React Three Fiber, the avatar, equipment visualization, environment rendering, scene composition |

Two implementation agents never work on the same files at the same time.

## Who owns which check

Each check has one owner. Running it twice is how the old workflow burned its budget.

| Owner | Owns | Does not do |
|---|---|---|
| Lead | scope, checkpoint, delegation, diff review, routing failures, final status | production code, browser QA, a second build or lint |
| Implementer (`frontend` by default; `backend-api` or `three-d` for their part of a specialist path) | implementation, frontend state, approved API integration, build, lint, and the checks of its own area | redesign, exhaustive browser testing |
| `qa` | browser behaviour, screenshots, responsive checks, interactions, accessibility, console errors, acceptance criteria | editing production code |

## What each role reads

Agents start with no context, so everything they read is paid for again. Point them at sections, not whole documents.

- **Lead:** `CLAUDE.md` (already loaded), the spec, the checkpoint, the relevant diff.
- **`frontend`:** the spec, `DESIGN_SYSTEM.md` when the work is UI, the sections of `FRONTEND_CONTEXT.md` the feature touches, the source files involved.
- **`backend-api`, `three-d`:** the spec, the sections of `FRONTEND_CONTEXT.md` or the 3D contract that the gap concerns, and the source files in their own area.
- **`qa`:** the acceptance criteria, the implementation under test, `DESIGN_SYSTEM.md` only where a visual criterion needs a token value.

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
- **`qa`:** `webapp-testing` is the preferred way to do browser QA.

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

## Interruptions

An agent cut off by an API or session usage limit has not failed. Keep its partial files, mark that phase `INTERRUPTED`, and record the last thing known to be finished. The next session resumes with an audit-first brief: find what is unfinished and complete only that. Starting over throws away paid-for work and risks overwriting it.

## Git

The working tree holds a large amount of unrelated uncommitted work. Do not reset, stash, restore, or discard anything, and do not run `git add .`, commit, or push unless the user asks for it in this session. Tell every agent the same.

## Final report

1. Feature id
2. `PASS` or `BLOCKED`
3. Agents used
4. Agents intentionally skipped, with reasons
5. Files changed
6. Build result
7. Lint result
8. QA result, including what QA could not verify
9. Repair cycles used
10. Known limitations
11. Checkpoint path
12. What the user should review by hand

Then stop. A `PASS` does not start the next feature: the user is the product gate between features, and the next cycle begins only when they ask for it.
