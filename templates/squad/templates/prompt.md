# Prompt shape

The file `/ps:task` writes to `.squad/tasks/<yymmdd-hhmm>.prompt.md`, and the raw text
`/ps:run` executes. One prompt, one branch, one PR.

**Written in the language of the conversation that produced it** — headings included.
The title is the `# ` line: it becomes the branch (`task/<kebab-case title>`) and the
PR title, so keep it short and imperative.

Every section is mandatory. A section with nothing to say is a sign the interview
stopped early, not a section to drop.

---

```markdown
# <Short imperative title>

## Outcome
<1..3 bullets: what must be true when this is done, observable from outside the code.
Not how.>

## Context
<Found once, so nobody surveys the repo again. Carry the finding, not its address:>
- **Imitate** `<path/to/exemplar.ext>` — the 3..10 lines from it that matter, quoted,
  so nobody has to guess which part is the pattern.
- **Reuse** `<symbol>` in `<path>` — its signature, verbatim.
- **Watch out for** <the hidden coupling / invariant / edge case the investigation
  turned up>.

## Steps
1. <one step = one commit. Say the outcome, not the code.>
2. <...>

## Scope
- In: <paths or areas this may touch>
- Out: <what a reader would assume is included and must not be touched>

## Verify
<exact, copy-pasteable commands that prove the Outcome — confirmed to exist in this
repo — plus anything to measure at execution time instead of assuming>

## Forbidden
<contracts not to break, patterns not to introduce, files not to touch>
```
