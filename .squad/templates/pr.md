# PR bodies

One PR per task, and this is its body. It is written for someone who was not in the
room: a new teammate, a reviewer six weeks from now, you at 3am.

**Write it in the task prompt's language** — the same person reads the prompt, this body
and the review verdict.

Rules:

- **Short enough to be read.** A body nobody finishes is a body nobody read. Cut every
  sentence that does not change what the reader does next.
- Say what changed and why. Not how clever it was.
- Name files and commands exactly — `src/parser/csv.ts`, `npm test` — never "the parser".
- Explain a term the first time you use it, or pick a plainer word.
- Took a shortcut? Say so plainly, and say what would undo it.

Title: the task title, verbatim. Same string as the branch's `task/<slug>`.

---

```markdown
## What this does
<2-4 sentences a junior reads once and understands. What someone can do now that they
could not do before.>

## Why
<the problem, and who had it. Links the prompt: `.squad/tasks/<id>.prompt.md`>

## What changed
- **<step 1 title>** — <one plain sentence>
- **<step 2 title>** — <one plain sentence>

## How to check it yourself
<numbered steps a reviewer can follow: the commands to run and what a passing run looks
like. If part of it is a screen, name the screen and what to click.>

## Decisions worth knowing
<choices a reader would otherwise wonder about, one sentence of reason each. Skip the
section entirely if there were none — never invent entries to fill it.>

## Known gaps
<anything knowingly left undone, and what would earn it a fix. Skip if none.>
```
