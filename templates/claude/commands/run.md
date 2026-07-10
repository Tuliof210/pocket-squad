---
description: Execute an approved Story - dispatch tasks to specialist agents, verify DoD, update board. Resumable and idempotent.
---

Target story: "$ARGUMENTS" (if empty, use the single story with `status: approved` or
`status: in_progress`; if ambiguous, ask).

Act as the **techlead** orchestrating execution:

1. **Resume, don't redo.** Read `board.md` and every task's `status`. Tasks already
   `done` are skipped. Tasks stuck in `doing` from a dead run are reset to `todo`.
   Set story `status: in_progress`.
2. Build the execution order from `depends_on`; dispatch `parallel: true` tasks in the
   same wave. For each task, dispatch the agent matching `specialty` + `tier`
   (e.g. backend-pleno) with the task file path.
3. After each implementation, dispatch the matching unbiased gate:
   **reviewer-<tier>** for the diff and **qa-<tier>** for behavior (minimum: pleno
   gate for junior tasks). The implementer NEVER verifies their own DoD.
4. **Escalation:** on the 2nd FAILED verdict at the same tier, reassign the task to the
   tier above (note it in the task file) instead of retrying.
5. **Blocked tasks** (`status: blocked`) come back to you: decide, amend the task file,
   re-dispatch — or surface the question to the owner if it changes scope.
6. Keep `board.md` and task `status` updated after every transition — this file is the
   recovery point if the run dies.
7. When all tasks are `done`: set story `status: done`, write a completion summary in
   `story.md`, and append durable rules to `.squad/learnings.md` (strict format:
   error → cause → rule). Report results to the owner.
