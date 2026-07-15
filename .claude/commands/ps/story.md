---
description: Refine a story in plan mode; on approval implement in an isolated worktree and open a PR. Usage - /ps:story "your idea"
---

The owner's request: "$ARGUMENTS"

You own this story end to end: refine it with the owner in plan mode, then — once the
plan is approved — implement it yourself in THIS conversation. No subagents write
code. **This command's Definition of Done is a created pull request**; merging is
`/ps:publish`'s job.

## 0. Plan mode

Call `EnterPlanMode` now, before anything else. If the tool is unavailable, announce
you are in the planning phase and make no edits until the owner explicitly approves.

## 1. Context

- The project's `CLAUDE.md` loads automatically. If the project has none, suggest
  running `/ps:init` first (you may proceed without it).
- Read `.squad/learnings.md` if it exists and **apply every rule** during refinement
  and implementation.
- Converse in the owner's language. Branch names, commits, and PR content in English.

## 2. Interview

Refine until the story is round and unambiguous:

- Extract what is already clear from the request. Never ask the obvious.
- Every ambiguity becomes a question **with suggested defaults** — propose, don't
  interrogate. Never fabricate a decision to avoid asking.
- Cover at minimum: real scope and boundaries, observable acceptance criteria,
  technical constraints, design expectations (if UI), and risk surface
  (auth / migrations / public contracts).
- Iterate — several rounds are fine. Stop only when nothing material is open.
- A request with independent deliverables should be split: one `/ps:story` cycle =
  one PR. Propose the split.

## 3. Investigate (read-only)

Once the goal is clear, dispatch `Explore` subagents **in a single message**, one per
angle (a trivial request collapses to one subagent or a quick inline look):

- **Code map** — where the change lives, neighboring files to imitate, existing
  utilities to reuse.
- **Verification** — the exact lint/test/build commands that exist. Never cite a
  script that does not exist in the repo; if there is none, pick the closest
  runnable check (an assert script, an exit-code check, a dry run).
- **Risks** — edge cases, hidden couplings, invariants.

## 4. Plan and approval

Write the plan: title, description, implementation steps with file paths, decisions
and risks, and an **executable Definition of Done** — only checks you can actually
run. Present it via `ExitPlanMode`.

Tell the owner: approving **with auto-accept** lets the implementation run hands-off
all the way to the PR. (You cannot switch the mode yourself — it is the owner's
choice in the approval dialog.)

## 5. Execute (only after approval)

1. Record the current branch — it is the PR's target.
2. Isolate: use `EnterWorktree` if available; otherwise
   `git worktree add ../<repo>--ps/<slug> -b ps/<slug>`.
3. Implement inside the worktree only. Small commits — they will be squashed at
   publish time.
4. Run every DoD check until green. Never weaken a test to make it pass.
5. Push and open the PR: `gh pr create --base <target-branch>`. **The PR body is the
   story's record** — self-contained, readable without this chat:
   - `## Story` — what and why.
   - `## Decisions` — choices made and their reasons.
   - `## DoD` — each item and how it was verified.
6. Report the PR URL and suggest `/ps:review`.

## Rules

- No edits of any kind before approval.
- No story files on disk — the PR is the record.
- A scope decision appearing mid-execution goes to the owner; never invent it.
