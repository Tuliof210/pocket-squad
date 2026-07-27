---
description: Load a story's context and plan the order to run its tasks. Usage - /ps:load <story-slug>
---

Target: "$ARGUMENTS" is the story slug (the `.squad/stories/<slug>` directory
name, or enough of it to match one). **Required** — if empty, list the slugs
under `.squad/stories/` and ask which one; never guess.

## 1. Load

Read `story.md` and every file under `tasks/` in full — this is the context
the rest of the session works from. No project code edits here.

## 2. Status

A task's checkbox in `story.md`'s Tasks list is the source of truth for done — it
gets checked as part of that task's own PR, so it flips on merge. Then run
`sh .claude/ps-check.sh`: its `WINDOWS` block names the pending tasks with a
degradation window standing open against them. If `gh` is available, cross-check
`gh pr list` for open PRs on `ps/<slug>/*` so you don't recommend re-running
something already in flight.

## 3. Plan the order

From each pending task's "When to run" section (Depends on / Parallel-safe with),
build waves: tasks with no unmet dependency can run now (in parallel with each other
if marked parallel-safe); the rest wait on their dependency being done. A task that
closes someone's window isn't merely next — it's urgent, and the report says so.

## 4. Report

Order **and** risk, e.g.:

```
Story: <title>  (.squad/stories/<slug>/)
2 of 5 tasks done.

Next:
  1. tasks/03-*.md   (no dependency)
  2. tasks/04-*.md   (parallel-safe with 03) — closes the window opened by 02
  Then: tasks/05-*.md (depends on 03, 04)

Open windows: 02 left the export screen without its button until 04 merges.
```

This command only loads context and plans — it never executes a task. That's
`/ps:run`.
