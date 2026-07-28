---
description: Execute one task from a loaded story in an isolated worktree and open a PR back to the branch you started from. Usage - /ps:run <task>
effort: medium
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(cargo:*), Bash(go:*), Bash(pytest:*), Bash(uv:*)
---

Target: "$ARGUMENTS" identifies the task. If a story is already loaded in this
conversation (via `/ps:load`), it's just the task reference (number or filename)
within it. Otherwise it's `<story-slug>/<task-reference>` — read that one task file
yourself before continuing. You do not need `story.md` to execute: the task file is
self-contained by construction.

## 1. Isolate

Already inside a pocket-squad worktree? Leave it first (`ExitWorktree`, or run from
the main checkout's path) — a task always branches from the **main checkout's**
current branch, never from another in-progress task's branch. Record that branch: it
is the worktree's starting point and the PR's base.

    git worktree add ../<repo>--ps/<story-slug>--<task-slug> -b ps/<story-slug>/<task-slug>
    sh .claude/ps-check.sh warm ../<repo>--ps/<story-slug>--<task-slug>

`warm` shares this checkout's already-installed dependencies with the fresh worktree
instead of installing them again — a per-task install was the single largest fixed
cost in this loop. It prints what it linked. **If this task changes a lockfile, delete
the link it names and run the project's real install first** — the directory is shared
with the main checkout, so installing through the link corrupts it. Nothing to share →
it says so, and you run the project's install once.

The branch name is not cosmetic: `ps-check.sh` derives this task's state from the PR
on `ps/<story-slug>/<task-slug>`. Rename it and the task reads as never started.

## 2. Implement

The task file carries its own `## Context` — the exemplar to imitate, the symbol to
reuse, the exact commands to run, all found once at plan time by `/ps:story`. **Do not
re-derive it**: no repo survey, no norm hunt, no second opinion on where the code
lives. Open what Context names, read `.squad/learnings.md` (rules only, 6 KB), and
write the code. Context missing or stale on an older story → look it up yourself,
once, and say so in the PR body.

The task is a contract, not a transcript: it states the outcome, what to imitate, what
is off limits — designing the implementation is still your job, here, with the code in
front of you. Imitate the exemplar instead of inventing, reuse what the repo already
has, and keep the auth / validation / DS steps its neighbours have.

Small commits. Run the task's `Verify` commands once, when the work is done; if it
names none, fall back to the repo's standard lint/test/build. The review runs them
again from cold and that second run is the one that counts — two runs is the whole
budget, and re-running the suite after every commit is how an afternoon disappears.
Never weaken a check to make it pass. Anything the task told you to measure gets
measured now, not assumed.

## 3. PR

Push and open the PR against the recorded branch (`gh pr create --base <branch>`, or
the equivalent). The title is exactly this and nothing else:

    <story-slug> 3/5 — <task title>

`3` is the task filename's `NN` stem, `5` is how many tasks the story lists, and the
title is that task file's heading. A squash-merge makes this line the base branch's
commit subject, so where the repo has a commit convention it goes in front —
`feat: export-csv 3/5 — recursive column parser`.

Body follows `.squad/templates/pr.md` — self-contained, readable without this chat.
If the task declares a `window:`, copy that line into the body: whoever publishes it
has to see it.

Do **not** tick this task's box in `story.md`. `/ps:publish` does that on the base
branch, after the merge that made it true — a box ticked inside the PR makes every
pair of sibling PRs conflict on the same file, and one conflict per task is a cost
nobody chose.

## 4. Report

PR URL, and suggest `/ps:review`. One task, one worktree, one PR — never bundle tasks.
A task too small to deserve a PR is a decomposition error, and it gets fixed in
`/ps:story`, never here.

A scope decision appearing mid-execution **parks** the task: say so in one line, leave
the worktree and branch in place, and hand it to the owner. Never invent the decision,
and never sit blocked on it while other work could be moving.
