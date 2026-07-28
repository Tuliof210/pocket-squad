# <Task title>

## Outcome
<1..3 bullets: what must be true when this is done, observable from outside the
code. Not how.>

## Context
<Everything the executor needs so it never surveys the repo again. `/ps:story` found
this once, with parallel Explore subagents; re-deriving it per task, and again per
review, was the loop's biggest avoidable cost. Carry the finding, not its address:>
- **Imitate** `<path/to/exemplar.ext>` — and the 3..10 lines from it that matter,
  quoted, so nobody has to guess which part is the pattern.
- **Reuse** `<symbol>` in `<path>` — its signature, verbatim.
- **Verify with** `<exact commands>` — confirmed to exist in this repo.
- **Watch out for** <the hidden coupling / invariant / edge case the investigation
  turned up>.
<Nothing that already lives in CLAUDE.md or ARCHITECTURE.md — both load anyway.>

## Independently shippable
yes
<replace the line above ONLY with the owner's explicit approval, by:>
<window: NN-closing-task-slug — what stays degraded until that task merges>

## Scope
- In: <paths or areas this task may touch>
- Out: <what a reader would assume is included and must not touch>

## When to run
- Depends on: none
- Parallel-safe with: none

## Verify
<exact, copy-pasteable commands that prove the Outcome — plus anything to measure
here at execution time instead of assuming>

## Forbidden
<contracts not to break, patterns not to introduce, files not to touch>
