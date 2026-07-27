---
description: Interview to refine a story + its tasks (no plan mode, no PR) and save them under .squad/stories/. Usage - /ps:story ["your idea"]
---

The owner's request, if any: "$ARGUMENTS" — may be empty; start the interview
from scratch if so.

**This command's Definition of Done is story + task files saved to disk.**
Nothing is implemented and no PR opens here — that's `/ps:load` + `/ps:run`.

## 1. Context

- CLAUDE.md loads automatically; if missing, suggest `/ps:init` first (you may
  proceed without it). Read `.squad/PRODUCT.md` and `.squad/ARCHITECTURE.md` if they
  exist, and apply every rule in `.squad/learnings.md`.
- Converse in the owner's language. Story/task file content in English.

## 2. Interview

Refine until the story is round and unambiguous:

- Extract what's already clear from the request. Never ask the obvious.
- Every ambiguity becomes a question **with a suggested default** — propose, don't
  interrogate. Never fabricate a decision to avoid asking.
- Cover at minimum: real scope and boundaries, observable acceptance criteria,
  technical constraints, risk surface (auth / migrations / public contracts).
- A request bundling independent deliverables becomes separate stories — propose the
  split. Iterate; stop only when nothing material is open.

## 3. Investigate (read-only)

Dispatch `Explore` subagents **in a single message**, one per angle (a trivial story
collapses to one subagent or a quick inline look):

- **Code map** — where the change lives, neighbours to imitate, utilities to reuse.
- **Verification** — the exact lint/test/build commands that exist. Never cite a
  script that doesn't exist; if there is none, pick the closest runnable check.
- **Risks** — edge cases, hidden couplings, invariants.

What reaches a task file is the *address* of each finding — the exemplar's path, the
symbol to reuse, the command to run — never the finding transcribed. "No further
discovery" means the executor doesn't re-derive the norms or re-map the code; it does
**not** mean they don't decide the implementation. They decide it with the repo open
in front of them, which is not how you have it now.

## 4. Decompose into tasks

Split into 1..N tasks. Two criteria, equal weight:

- **Reviewable alone** — small enough to be one PR.
- **Shippable alone** — merged by itself, with no other task of this story, the
  product still works. No capability removed now to be restored by a later task, no
  route to a screen that isn't there yet. If slice A only makes sense once B lands:
  make them one task, invert the order, or put A behind a flag.

A degradation window is not a planning tool. If you ask the owner directly and they
accept one anyway, it goes in that task's `window:` field — `/ps:publish` gates on it.
Record, per task, what it depends on (by number) and what it is parallel-safe with.

## 5. Write

Slug from the title (kebab-case). Fill `.squad/templates/story.md` once and
`.squad/templates/task.md` per task, into
`.squad/stories/<YYYY-MM-DD>-<slug>/{story.md, tasks/NN-<task-slug>.md}`.

A task file is a **contract**, not a solution:

- No implementation code. A snippet is allowed only when it *is* the contract — a
  signature, a payload shape — never a function body, markup, or styles.
- No hand-measured number. If a decision depends on a measurement, name the command
  that takes it at execution time.
- Nothing that already lives in `CLAUDE.md` or `.squad/ARCHITECTURE.md` — both load
  anyway. Every section filled, no placeholders.

Then `wc -l` what you wrote: a story over 40 lines or a task over 60 is a
decomposition error, not a formatting one — go back to step 4.

## 6. Report

Story path, task list, and suggest `/ps:load <slug>`. A scope decision appearing
mid-refinement goes to the owner — never invent it.
