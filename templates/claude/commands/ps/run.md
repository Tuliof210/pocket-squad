---
description: Execute one task from a loaded story in an isolated worktree and open a PR back to the branch you started from. Usage - /ps:run <task>
---

Target: "$ARGUMENTS" identifies the task. If a story is already loaded in this
conversation (via `/ps:load`), it's just the task reference (number or
filename) within it. Otherwise it's `<story-slug>/<task-reference>` — load
that story's `story.md` and the one task file yourself before continuing.

## 0. Preconditions

- If you are already inside a pocket-squad task worktree, leave it first
  (`ExitWorktree`, or run the rest from the main checkout's path) — a task
  always branches from the **main checkout's** current branch, never from
  another in-progress task's branch.
- If the task's "Depends on" lists a task whose checkbox isn't checked in
  `story.md`, warn the owner and confirm before continuing — don't hard-block,
  they may know something you don't.

## 1. Isolate

Record the current branch — it is both the worktree's starting point and the
PR's base. Use `EnterWorktree` if available; otherwise:

`git worktree add ../<repo>--ps/<story-slug>--<task-slug> -b ps/<story-slug>/<task-slug>`

## 2. Implement

Load the norms first — `.squad/ARCHITECTURE.md` (conventions, plus the exemplar
file paths it names) and `.squad/learnings.md`. They bound *how* you write; the
task's Description + How-to (plus the story's AC/DoD) bound *what* — that's the
point of the granular context, minimal rediscovery. Imitate the exemplar instead
of inventing: reuse what the repo already has, and keep the auth / validation /
DS steps its neighbours have.

Small commits. Run whatever verification the How-to specifies; if none is
named, fall back to the repo's standard lint/test/build. Never weaken a check
to make it pass.

## 3. Close the loop

As the last commit, check this task's box in `story.md`'s Tasks list — this
rides into the PR so it lands on the base branch when the PR merges.

## 4. PR

Push and open the PR: `gh pr create --base <recorded-branch>`. Body follows
`.squad/templates/pr.md` — self-contained, readable without this chat:
what/why (link back to the story file), decisions and their reasons, and the
DoD items this task covers with how each was verified.

## 5. Report

PR URL, and suggest `/ps:review`.

## Rules

- One task, one worktree, one PR. Never bundle tasks into a single PR.
- A scope decision appearing mid-execution goes to the owner; never invent it.
