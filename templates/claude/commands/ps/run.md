---
description: Execute one task from a loaded story in an isolated worktree and open a PR back to the branch you started from. Usage - /ps:run <task>
---

Target: "$ARGUMENTS" identifies the task. If a story is already loaded in this
conversation (via `/ps:load`), it's just the task reference (number or
filename) within it. Otherwise it's `<story-slug>/<task-reference>` — load
that story's `story.md` and the one task file yourself before continuing.

## 0. Preconditions

- Already inside a pocket-squad worktree? Leave it first (`ExitWorktree`, or run from
  the main checkout's path) — a task always branches from the **main checkout's**
  current branch, never from another in-progress task's branch.
- If the task's "Depends on" lists a task whose checkbox isn't checked in
  `story.md`, warn the owner and confirm before continuing — don't hard-block.

## 1. Isolate

Record the current branch — the worktree's starting point and the PR's base. Use
`EnterWorktree` if available; otherwise
`git worktree add ../<repo>--ps/<story-slug>--<task-slug> -b ps/<story-slug>/<task-slug>`

## 2. Implement

Load the norms first — `.squad/ARCHITECTURE.md` (conventions, plus the exemplar paths
it names) and `.squad/learnings.md`, where the rules whose scope touches this task are
binding and the rest is background. Those bound *how* you write; the task file bounds
*what*. It is a contract, not a transcript: it states the outcome, what to imitate,
what is off limits — designing the implementation is your job, here, with the code in
front of you. Imitate the exemplar instead of inventing, reuse what the repo already
has, and keep the auth / validation / DS steps its neighbours have.

Small commits. Run the task's `Verify` commands; if it names none, fall back to the
repo's standard lint/test/build. Never weaken a check to make it pass. Anything the
task told you to measure gets measured now, not assumed.

## 3. Close the loop

As the last commit, check this task's box in `story.md`'s Tasks list — it rides into
the PR and lands on the base branch when the PR merges.

## 4. PR

Push and open the PR against the recorded branch (`gh pr create --base <branch>`, or
the equivalent). The title is exactly this and nothing else:

    <story-slug> 3/5 — <task title>

`3` is the task filename's `NN` stem, `5` is how many tasks `story.md` lists, and the
title is that task file's heading. A squash-merge makes this line the base branch's
commit subject, so where the repo has a commit convention it goes in front —
`feat: export-csv 3/5 — recursive column parser`.

Body follows `.squad/templates/pr.md` — self-contained, readable without this chat.
If the task declares a `window:`, copy that line into the body: whoever publishes it
has to see it.

## 5. Report

PR URL, and suggest `/ps:review`. One task, one worktree, one PR — never bundle
tasks. A scope decision appearing mid-execution goes to the owner; never invent it.
