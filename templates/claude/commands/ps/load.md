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

A task's checkbox in `story.md`'s Tasks list is the source of truth for done —
it gets checked as part of that task's own PR, so it flips on merge.
Optionally, if `gh` is available, cross-check `gh pr list` for open PRs on
this story's branches (`ps/<slug>/*`) so you don't recommend re-running
something already in flight.

## 3. Plan the order

From each pending task's "When to run" section (Depends on / Parallel-safe
with), build waves: tasks with no unmet dependency can run now (in parallel
with each other if marked parallel-safe); the rest wait on their dependency's
task being done.

## 4. Report

Show the story title, path, and the ordered plan, e.g.:

```
Story: <title>  (.squad/stories/<slug>/)
2 of 5 tasks done.

Next:
  1. tasks/03-*.md   (no dependency)
  2. tasks/04-*.md   (no dependency — parallel-safe with 03)
  Then: tasks/05-*.md (depends on 03, 04)

Run /ps:run 03 to start.
```

This command only loads context and plans — it never executes a task. That's
`/ps:run`.
