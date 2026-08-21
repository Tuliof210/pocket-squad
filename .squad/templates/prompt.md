# Prompt shape

The file `/ps-task` writes to `.squad/tasks/<yymmdd-hhmm>.prompt.md`, and the raw text
`/ps-run` executes. One prompt, one branch, one PR.

It is a **spec**: requirements, design and plan in one file. Three files would mean three
approval rounds and three chances to drift for work that one branch delivers.

**Written in the language of the conversation that produced it** — headings included.
The title is the `# ` line: it becomes the branch (`task/<kebab-case title>`) and the
PR title, so keep it short and imperative.

Every section is mandatory. `## Design` is the only one that may say `none`. Anywhere
else, nothing to say means the interview stopped early.

---

```markdown
# <Short imperative title>

## Outcome
<1..5 numbered criteria. Each observable from outside the code, each acceptable or
rejectable on its own. What becomes true, never how.>
R1. <given/when …, the system …>
R2. <…>

## Context
<Found once, so nobody surveys the repo again. Carry the finding, not its address:>
- **Imitate** `<path/to/exemplar.ext>` — the 3..10 lines from it that matter, quoted,
  so nobody has to guess which part is the pattern.
- **Reuse** `<symbol>` in `<path>` — its signature, verbatim.
- **Watch out for** <the hidden coupling / invariant / edge case the investigation
  turned up>.

## Design
<The decisions that must not be re-taken while coding. `none` when the task only follows
a pattern that already exists — that is the common case, and writing `none` is not a
failure. Never restate what `## Context` already quoted.>
- **Contract** — <the new surface, written out exactly: signature, payload shape,
  table and column names, route, event name, CLI flag. Shapes, never function bodies.>
- **Flow** — <only when order or failure is not obvious from the contract: who calls
  what, what happens when it fails, what has to be atomic.>
- **Chose <X> over <Y>** — <one line of reason. This is what stops the executor from
  redesigning and the reviewer from re-litigating.>

## Steps
1. <one step = one commit. Say the outcome, not the code.> → R1
2. <...> → R2, R3

## Verify
<exact, copy-pasteable commands, confirmed to exist in this repo, one line per criterion.
Plus anything to measure at execution time instead of assuming.>
- R1: `<command>` — <what a pass looks like>
- R2: `<command>` — <...>

## Scope
- In: <paths or areas this may touch>
- Out: <what a reader would assume is included and must not be touched>

## Forbidden
<contracts not to break, patterns not to introduce, files not to touch>
```
