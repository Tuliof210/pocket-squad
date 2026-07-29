---
description: Run a whole story - one worktree, tasks in order, one commit each on the story branch, ending in one PR to review. Usage - /ps:run <story-slug>
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

    sh .claude/ps-check.sh status <story-slug>   # what is already done, if this is a resume

Read `story.md`, then the task files still open. A task `status` reports as done is
history — skip its file. If every task is done, say so and stop; the story PR may
already be waiting for `/ps:review`.

Then one worktree for the whole story:

    git worktree add ../<repo>--ps/<story-slug> -b ps-story/<story-slug>
    sh .claude/ps-check.sh warm ../<repo>--ps/<story-slug>

`warm` shares this checkout's installed dependencies instead of installing them again.
Once per story now, not once per task. **If a task changes a lockfile, delete the link
it names and run the project's real install first** — the directory is shared with the
main checkout, so installing through the link corrupts it.

One branch for the whole story, `ps-story/<slug>`, and one commit per task on it. There
are no task branches and no task PRs: a task branch squash-merged into the story left
exactly one commit behind, so committing straight to the story branch lands the same
history without the push, the PR body and the merge that nobody read.

## 2. Each task, in filename order

Work inside the worktree, on `ps-story/<story-slug>`. For task `NN-<task-slug>.md`:

1. **Read that task file now**, not earlier. One task's contract at a time is what
   keeps this chat from carrying five tasks' worth of detail it does not need yet.
2. Implement. The task carries its own `## Context` — the exemplar, the symbol, the
   commands, found once at plan time. **Do not re-derive it**: no repo survey, no norm
   hunt. Open what Context names, apply `.squad/learnings.md`, write the code. It states
   the outcome and the boundaries; designing the implementation is still your job, with
   the code in front of you.
3. Run the task's `Verify` commands once, at the end. If it names none, fall back to the
   repo's standard lint/test/build. Never weaken a check to make it pass.
4. Tick this task's box in `story.md` and commit it **with the work, in one commit**:
   `<story-slug> NN/N — <task title>`, with the repo's commit convention in front where
   it has one. One commit, so the tick and the code it claims can never disagree — a run
   that dies leaves either both or neither.

Report one line per task and keep moving:

```
▸ 01 pending → committed 3f2a1c9
▸ 02 pending → committed 8b40e77
! 03 parked — scope question: <one line>
```

A task that hits a scope decision, or fails its own verification twice, **parks**. Its
half-finished work must not ride along in the next task's commit, so stash it — named,
so it can be found later — and leave the story branch green:

    git stash push -u -m "parked <story-slug> NN-<task-slug>"

Then say so in one line and go to the next task. Never invent the decision. A refused
permission parks the same way and names the exact refused call.

## 3. When the tasks are done

Push the story branch — once, now, not once per task:

    git push -u origin ps-story/<story-slug>

Then from the main checkout (`ExitWorktree`, or run from its path), open **one PR** from
`ps-story/<story-slug>` to the target branch you recorded in section 1. Body per
`.squad/templates/pr.md` ("Story PR") — this is the one a human reads, so write it for
someone who was not here.

Title: `<story-slug> — <story title>`, with the repo's commit convention in front where
it has one.

## 4. Report

The story PR's URL, the tasks that parked and why, and `/ps:review <pr>` as the next
step. The story branch and its worktree stay until `/ps:publish` sweeps them.
