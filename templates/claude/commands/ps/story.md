---
description: Interview to refine a story + its tasks (no plan mode, no PR) and save them under .squad/stories/. Usage - /ps:story ["your idea"]
---

The owner's request, if any: "$ARGUMENTS" — may be empty; start the interview
from scratch if so.

**This command's Definition of Done is story + task files saved to disk.**
Nothing is implemented and no PR opens here — that's `/ps:load` + `/ps:run`.

## 1. Context

- CLAUDE.md loads automatically. If missing, suggest `/ps:init` first (you may
  proceed without it).
- Read `.squad/PRODUCT.md` and `.squad/ARCHITECTURE.md` if they exist — ground
  the interview in real product intent and real conventions.
- Read `.squad/learnings.md` if it exists and **apply every rule**.
- Converse in the owner's language. Story/task file content in English.

## 2. Interview

Refine until the story is round and unambiguous:

- Extract what's already clear from the request. Never ask the obvious.
- Every ambiguity becomes a question **with a suggested default** — propose,
  don't interrogate. Never fabricate a decision to avoid asking.
- Cover at minimum: real scope and boundaries, observable acceptance criteria,
  technical constraints, and risk surface (auth / migrations / public
  contracts).
- A request bundling independent deliverables should be split into separate
  stories — propose the split.
- Iterate — several rounds are fine. Stop only when nothing material is open.

## 3. Investigate (read-only)

Dispatch `Explore` subagents **in a single message**, one per angle (a trivial
story collapses to one subagent or a quick inline look):

- **Code map** — where the change lives, neighboring files to imitate,
  existing utilities to reuse.
- **Verification** — the exact lint/test/build commands that exist. Never cite
  a script that doesn't exist; if there is none, pick the closest runnable
  check.
- **Risks** — edge cases, hidden couplings, invariants.

Bake every finding into the task files below — **the point of this step is
that whoever executes a task later needs no further discovery.**

## 4. Decompose into tasks

Split the story into 1..N tasks — each one a self-contained unit of work small
enough to review as its own PR. For each, work out what it depends on (by task
number), if anything, and whether it can run in parallel with another task.

## 5. Write

Slug from the title (kebab-case). Fill `.squad/templates/story.md` once and
`.squad/templates/task.md` per task, saved as:

```
.squad/stories/<YYYY-MM-DD>-<slug>/
  story.md
  tasks/01-<task-slug>.md
  tasks/02-<task-slug>.md
```

Fill every section — no placeholders. A task's Description + How-to must give
enough context that whoever executes it needs no heavy discovery.

## 6. Report

Show the story path, the task list, and suggest: `/ps:load <slug>`.

## Rules

- No project code edits here — this command only writes under
  `.squad/stories/`.
- A scope decision appearing mid-refinement goes to the owner; never invent
  it.
