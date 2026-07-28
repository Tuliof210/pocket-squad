# PR bodies

Two shapes. Both are written for someone who was not in the room: a new teammate, a
reviewer six weeks from now, you at 3am. Plain sentences. If a sentence only parses
when you already know the answer, rewrite it.

Rules for both:

- Say what changed and why. Not how clever it was.
- Name files and commands exactly — `src/parser/csv.ts`, `npm test` — never "the parser".
- Explain a term the first time you use it, or pick a plainer word.
- Took a shortcut? Say so plainly, and say what would undo it.

---

## Task PR — into the story branch

Small, merged automatically, nobody reviews it. Its only job is a readable record of
one step. Three short sections.

```markdown
## What this does
<1-2 plain sentences. "Adds the CSV column parser that the import screen calls.">

## Why
<1-2 sentences. What was missing or wrong before this.>

## How I checked
<the exact command, and what it printed. "npm test -- csv.spec.ts — 14 passed.">
```

---

## Story PR — into the target branch

The one that gets reviewed and merged, so it carries the whole story. Same plain
language; longer only because it covers more.

```markdown
## What this story does
<2-4 sentences a junior reads once and understands. What someone can do now that they
could not do before.>

## Why
<the problem, and who had it. Links the story: `.squad/stories/<slug>/story.md`>

## What changed, task by task
- **01 <task title>** — <one plain sentence>
- **02 <task title>** — <one plain sentence>

## How to check it yourself
<numbered steps a reviewer can follow. The commands to run and what a passing run looks
like. If part of it is a screen, name the screen and what to click.>

## Decisions worth knowing
<choices a reader would otherwise wonder about, one sentence of reason each. Skip the
section entirely if there were none — never invent entries to fill it.>

## Known gaps
<anything knowingly left undone, and what would earn it a fix. Skip if none.>
```
