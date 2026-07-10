---
description: Start refining a new Story with the Tech Lead. Usage - /story "create a social login screen"
---

Dispatch the **techlead** agent with the owner's request: "$ARGUMENTS".

The techlead must follow its refinement flow: read `.squad/project-context.md` and
`.squad/learnings.md`, ask the owner clarifying questions (with suggested defaults),
and only then generate `.squad/stories/<YYYY-MM-DD>-<slug>/` with `story.md`
(status: draft), `tasks/` and `board.md`.

Do NOT execute anything. End by telling the owner which files to review/edit and that
`/approve` + `/run` start execution.
