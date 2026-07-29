---
description: Run a whole story - one worktree, tasks in order, each merged into the story branch, ending in one PR to review. Usage - /ps:run <story-slug>
effort: medium
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(cargo:*), Bash(go:*), Bash(pytest:*), Bash(uv:*)
---

Target: "$ARGUMENTS" is the story slug (the `.squad/stories/<slug>` directory name, or
enough of it to match one). Empty → list the slugs and ask; never guess.

Everything here runs in **this chat**, in order, one task at a time. That is the design,
not a limitation: you are already warm with the story's context, and a cold subagent per
task pays to rebuild what you are holding. The only cold context in this workflow is
`/ps:review`, where not knowing what the author intended is the whole point.

## 1. Set up, once

Record the branch you are on — the **target branch**, where this story eventually lands.

    sh .claude/ps-check.sh sync <story-slug>     # reconcile story.md with reality first

Read `story.md`, then the task files still open. A task whose PR is already merged is
history — skip its file. If every task is done, say so and stop; the story PR may
already be waiting for `/ps:review`.

Then one worktree for the whole story:

    git worktree add ../<repo>--ps/<story-slug> -b ps-story/<story-slug>
    sh .claude/ps-check.sh warm ../<repo>--ps/<story-slug>

`warm` shares this checkout's installed dependencies instead of installing them again.
Once per story now, not once per task. **If a task changes a lockfile, delete the link
it names and run the project's real install first** — the directory is shared with the
main checkout, so installing through the link corrupts it.

The story branch is `ps-story/<slug>` and task branches are `ps/<slug>/<task-slug>`.
Two namespaces on purpose: git cannot hold `ps/<slug>` and `ps/<slug>/<task>` at the
same time, and `ps-check.sh` derives each task's state from its own branch name.

## 2. Each task, in filename order

Work inside the worktree. For task `NN-<task-slug>.md`:

1. **Read that task file now**, not earlier. One task's contract at a time is what
   keeps this chat from carrying five tasks' worth of detail it does not need yet.
2. `git switch -c ps/<story-slug>/<task-slug>` from the story branch.
3. Implement. The task carries its own `## Context` — the exemplar, the symbol, the
   commands, found once at plan time. **Do not re-derive it**: no repo survey, no norm
   hunt. Open what Context names, apply `.squad/learnings.md`, write the code. It states
   the outcome and the boundaries; designing the implementation is still your job, with
   the code in front of you.
4. Run the task's `Verify` commands once, at the end. If it names none, fall back to the
   repo's standard lint/test/build. Never weaken a check to make it pass.
5. Tick this task's box in `story.md` and commit it with the work. Safe now — tasks are
   serial, so no two branches touch that file at once.
6. Push, and open a PR **into `ps-story/<story-slug>`**, body per `.squad/templates/pr.md`
   ("Task PR"). Title: `<story-slug> NN/N — <task title>`.
7. Squash-merge it immediately: `gh pr merge <n> --squash --delete-branch`. **No review
   here** — the review happens once, on the whole story, in section 4.
8. `git switch ps-story/<story-slug> && git pull` before the next task.

Report one line per task and keep moving:

```
▸ 01 pending → PR #71 → merged into ps-story/export-csv
▸ 02 pending → PR #72 → merged
! 03 parked — scope question: <one line>
```

A task that hits a scope decision, or fails its own verification twice, **parks**: say
so in one line, leave its branch alone, and go to the next task. Never invent the
decision. A refused permission parks the same way and names the exact refused call.

## 3. When the tasks are done

From the main checkout (`ExitWorktree`, or run from its path), open **one PR** from
`ps-story/<story-slug>` to the target branch you recorded in section 1. Body per
`.squad/templates/pr.md` ("Story PR") — this is the one a human reads, so write it for
someone who was not here.

Title: `<story-slug> — <story title>`, with the repo's commit convention in front where
it has one.

## 4. Report

The story PR's URL, the tasks that parked and why, and `/ps:review <pr>` as the next
step. The story branch and its worktree stay until `/ps:publish` sweeps them.
