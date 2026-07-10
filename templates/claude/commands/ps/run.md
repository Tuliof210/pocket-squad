---
description: Validate and execute Stories end-to-end - specialists, unbiased gates, one squash-merged PR per Story. No args = all runnable Stories. Usage - /ps:run [story-slug]
---

Target: "$ARGUMENTS". If empty, run **every** story with `status: draft` or
`status: in_progress`, ordered by story-level `depends_on`, then folder date. If a
slug is given, run only that story.

Act as the **techlead**. Run each story through the FULL cycle below before starting
the next — later stories build on the merged result of earlier ones.

## 0. Validate (this replaces the old /approve step)

Re-read `story.md` and every task file — the owner may have edited them; their edits
are law. Check: no dangling `depends_on`, every task has specialty + tier +
justification + verifiable DoD, contracts consumed downstream are deliverables
upstream. If validation fails: print the findings, skip this story, continue with the
next. A valid story runs without asking for confirmation.

## 1. Branch

The branch `/ps:run` was invoked from is the **target branch** — record it. Create
`squad/<story-slug>` from it (reuse the branch if it exists: resumability).

## 2. Execute (resumable, idempotent)

- Read `board.md` + task statuses. Skip `done`; reset orphaned `doing` to `todo`.
  Set story `status: in_progress`.
- Dispatch waves by `depends_on`; `parallel: true` tasks share a wave. Each task goes
  to the agent matching `specialty` + `tier` with its task file path.
- After each implementation, dispatch the unbiased gates: **reviewer-<tier>** (diff)
  and **qa-<tier>** (behavior); minimum pleno gate for junior tasks. The implementer
  NEVER verifies their own DoD.
- **Escalation:** 2nd FAILED verdict at the same tier → reassign one tier up (note it
  in the task file). Never a 3rd attempt at the same tier.
- `status: blocked` tasks come back to you: decide, amend the task file, re-dispatch —
  or surface to the owner if it changes scope.
- Commit per task on the story branch. Keep `board.md` and task `status` updated after
  every transition — that is the recovery point if the run dies.

## 3. PR + ADR + merge

When all tasks are `done`:

1. Set story `status: done`, write a completion summary in `story.md`, append durable
   rules to `.squad/learnings.md` (error → cause → rule).
2. Push the story branch and open a PR against the target branch (`gh pr create`).
   The PR body is a simple ADR with exactly three sections:
   - **Title** — the story title.
   - **Description** — what was asked, what was done, the key decisions and why.
   - **Final consideration** — tradeoffs accepted, how the DoD was verified, follow-ups.
3. **Critical story?** (destructive migration, auth/security-sensitive, breaks a
   public contract) → leave the PR OPEN, report the URL, and let the owner merge
   manually. Otherwise squash-merge it: `gh pr merge --squash --delete-branch`, then
   `git checkout <target-branch> && git pull --rebase`.
4. No remote or no `gh`? Squash-merge locally (`git merge --squash` + one commit whose
   message is the ADR) and note that in the story.

Then move to the next runnable story. Finish with a per-story report: PR URL, merged
or left open (and why), blockers, learnings appended.
