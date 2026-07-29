# PR bodies

One shape, one PR per story. It is written for someone who was not in the room: a new
teammate, a reviewer six weeks from now, you at 3am. Plain sentences. If a sentence only
parses when you already know the answer, rewrite it.

Rules:

- Say what changed and why. Not how clever it was.
- Name files and commands exactly — `src/parser/csv.ts`, `npm test` — never "the parser".
- Explain a term the first time you use it, or pick a plainer word.
- Took a shortcut? Say so plainly, and say what would undo it.

---

## Story PR — into the target branch

The only PR a story produces, and the one that gets reviewed and merged, so it carries
the whole story. Each task is one commit on the branch; this body is what a human reads
instead of those commits.

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
