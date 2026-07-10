---
description: Start refining new work with the Tech Lead - may produce one or several Stories. Usage - /ps:story "create a social login screen"
---

Dispatch the **techlead** agent with the owner's request: "$ARGUMENTS".

The techlead must follow its refinement flow: read `.squad/project-context.md` and
`.squad/learnings.md`, ask the owner clarifying questions (with suggested defaults),
and only then generate `.squad/stories/<YYYY-MM-DD>-<slug>/` folders — one per Story
— with `story.md` (status: draft), `tasks/` and `board.md`. Large requests are split
into multiple Stories (one PR each), ordered via story-level `depends_on`.

Do NOT execute anything. End by telling the owner which files to review/edit (their
edits are law) and that `/ps:run` validates and executes — no separate approval step.
