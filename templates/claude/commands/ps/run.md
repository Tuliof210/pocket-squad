---
description: Validate and execute Stories end-to-end - specialists, unbiased gates, one squash-merged PR per Story. No args = all runnable Stories. Usage - /ps:run [story-slug]
---

Target: "$ARGUMENTS". If empty, run **every** story with `status: draft` or
`status: in_progress`, ordered by story-level `depends_on`, then folder date. If a
slug is given, run only that story.

**You are the Tech Lead** (this conversation — not a subagent). Read `.claude/techlead.md`
first, then act on it. Group stories into waves by story-level `depends_on`: a
story only starts after every story it depends on has MERGED (it builds on that
result). **Independent stories run CONCURRENTLY**, each in its own git worktree —
batch their ready tasks together (one Agent call per task, one single message per
batch), regardless of which story each task belongs to.

## 0. Validate (this replaces the old /approve step)

Re-read `story.md` and every task file — the owner may have edited them; their edits
are law. Check: no dangling `depends_on`, every task has specialty + tier +
justification + verifiable DoD + a `## Context` section (self-contained: exact
commands, files to imitate), contracts consumed downstream are deliverables upstream.
**Audit `express: true`**: it only stands if every task is junior + S, with no
contract deliverables and no auth/security/migration/public-contract surface —
otherwise strip the flag and run the story through the full gates, noting why.
If validation fails: print the findings, skip this story, continue with the
next. A valid story runs without asking for confirmation.

## 1. Worktree (one per story)

The branch `/ps:run` was invoked from is the **target branch** — record it. Give the
story an isolated worktree + branch (reuse both if they already exist: resumability):

    git worktree add ../<repo-name>--squad/<story-slug> -b squad/<story-slug> <target-branch>

Everything the story does — file edits, command runs, commits — happens INSIDE its
worktree, never in the main checkout. While the worktree exists, its copy of
`.squad/stories/<story-slug>/` (task statuses, board) is the source of truth; it
merges back with the PR.

## 2. Execute (resumable, idempotent)

- Read `board.md` + task statuses. Skip `done`; reset orphaned `doing` to `todo`.
  Set story `status: in_progress`.
- Dispatch waves by `depends_on`; `parallel: true` tasks share a wave. Each task goes
  to the agent matching `specialty` + `tier` with its task file path **inside the
  story's worktree** — state the worktree path explicitly in the dispatch; the agent
  works only there, never in the main checkout.
- **Parallel means one message.** Subagents only run concurrently when their Agent
  calls are batched in a SINGLE message — dispatch every task of the wave as one
  message with one Agent call per task. Dispatching one task, waiting, then the next
  is a bug, not a wave.
- After each implementation, dispatch the unbiased gates — batched in one message
  (and gates of different finished tasks batch together). The implementer NEVER
  verifies their own DoD. The gates split, they do not triple:
  - **Full story:** **reviewer-<tier>** (diff + executable DoD: runs lint/test/build
    itself) and **qa-<tier>** (behavior only: exercises each acceptance criterion,
    does not re-run what the reviewer evidences); minimum pleno gate for junior tasks.
  - **Express story (`express: true`):** ONE gate — **reviewer-pleno**, who also
    exercises the behavior (absorbs QA). No separate qa dispatch.
- **Escalation:** 2nd FAILED verdict at the same tier → reassign one tier up (note it
  in the task file). Never a 3rd attempt at the same tier.
- `status: blocked` tasks come back to you: decide, amend the task file, re-dispatch —
  or surface to the owner if it changes scope.
- Commit per task on the story branch (`git -C <worktree>`) — you commit, subagents
  never do (concurrent commits race on the index; worktrees isolate stories from each
  other, not tasks within one story). You are also the ONLY writer of each story's
  `board.md`: subagents report status in their task files; reflect every transition
  on the board yourself — that is the recovery point if the run dies.

## 3. PR + ADR + merge

When all of a story's tasks are `done`:

1. In its worktree: set story `status: done` and write a completion summary in
   `story.md` (they ship with the PR).
2. Push the story branch and open a PR against the target branch (`gh pr create`).
   The PR body is a simple ADR with exactly three sections:
   - **Title** — the story title.
   - **Description** — what was asked, what was done, the key decisions and why.
   - **Final consideration** — tradeoffs accepted, how the DoD was verified, follow-ups.
3. **Critical story?** (destructive migration, auth/security-sensitive, breaks a
   public contract) → leave the PR OPEN, report the URL, and let the owner merge
   manually. Otherwise squash-merge it: `gh pr merge --squash --delete-branch`, then
   in the main checkout `git pull --rebase` on the target branch.
4. No remote or no `gh`? Squash-merge locally into the target branch (`git merge
   --squash` + one commit whose message is the ADR) and note that in the story.
5. Clean up: `git worktree remove` the story's worktree (drop the local branch if
   merged). Only then append durable rules to `.squad/learnings.md` **in the main
   checkout** (error → cause → rule) — parallel stories appending learnings inside
   worktrees would collide at merge.

A merge may unblock dependent stories — start them (each in a fresh worktree). Finish
with a per-story report: PR URL, merged or left open (and why), blockers, learnings
appended.
