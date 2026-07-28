---
description: Load a story's context and plan the order to run its tasks. Usage - /ps:load <story-slug>
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*)
---

Target: "$ARGUMENTS" is the story slug (the `.squad/stories/<slug>` directory name, or
enough of it to match one). **Required** — if empty, list the slugs under
`.squad/stories/` and ask which one; never guess.

## 1. Status first

    sh .claude/ps-check.sh status <story-slug>

One call, one network round trip, and it answers what used to take a read of every
file: which tasks are `done` (their PR merged), which are `open` (PR in flight, don't
re-run them) and which are `todo`. Merge state is the source of truth; the checkbox in
`story.md` is only the fallback when no provider CLI is around to ask.

## 2. Load only what is pending

Read `story.md`, then the task files the status call marked `todo` or `open` — those
are the ones this session can act on. A `done` task's file is history; opening it
costs context and buys nothing. Read it only if a pending task's Context points into
it. No project code edits here.

Then run `sh .claude/ps-check.sh` for the `WINDOWS` block: it names the pending tasks
with a degradation window standing open against them.

## 3. Plan the order

From each pending task's "When to run" section (Depends on / Parallel-safe with),
build waves: tasks with no unmet dependency can run now (in parallel with each other
if marked parallel-safe); the rest wait on their dependency being done. A task that
closes someone's window isn't merely next — it's urgent, and the report says so.

## 4. Report

Order **and** risk, e.g.:

```
Story: <title>  (.squad/stories/<slug>/)
2 of 5 done, 0 in flight.

Next:
  1. tasks/03-*.md   (no dependency)
  2. tasks/04-*.md   (parallel-safe with 03) — closes the window opened by 02
  Then: tasks/05-*.md (depends on 03, 04)

Open windows: 02 left the export screen without its button until 04 merges.
```

This command only loads context and plans — it never executes a task. That's
`/ps:run`, and these waves are its running order.
