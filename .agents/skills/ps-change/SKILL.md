---
name: ps-change
description: Implement, fix, refactor, test, configure, migrate, or otherwise modify a governed repository. Use automatically for requests that change tracked project files; do not use for read-only explanation, diagnosis, review, or governance initialization.
---

# Change a governed repository

Carry the requested change through an isolated worktree, verification and a reviewable PR.

## Establish the contract

Read `AGENTS.md` and the three canonical `.squad` documents once. Extract the observable outcome,
scope and applicable protocol IDs from the request. Ask only when a missing decision would produce
materially different results or exceed the user's authority.

Classify the work using `PROTOCOLS.md`:

- Small change: keep a short plan in the conversation.
- Risk-bearing or materially ambiguous change: fill `.squad/templates/prompt.md` and commit it as
  `.squad/changes/<yymmdd-hhmm-slug>.prompt.md` in the task branch before implementation.

## Start safely

Before editing:

```text
node .agents/scripts/pocket-squad.js preflight
node .agents/scripts/pocket-squad.js start <kebab-case-slug>
```

Use the returned `worktree`, `branch`, `baseBranch`, `baseSha` and optional remote verbatim. Never reconstruct the path.
All task edits and commands run inside that worktree. Do not share writable dependency or build trees
with another checkout; use the project's normal install command or package-manager cache.

## Implement and prove

- Follow the requested outcome, architecture exemplars and applicable protocols without unrelated cleanup.
- Run a narrow meaningful check after each behavioral unit; fix failures while a safe path remains.
- Make focused conventional commits. A commit need not mirror a planning step when a cleaner history
  requires a different boundary.
- Run every applicable final verification from `ARCHITECTURE.md` and the change plan.
- Run `node .agents/scripts/pocket-squad.js check <slug>`; it must return the exact head SHA and a clean worktree.

## Open the PR

Detect the provider from the recorded remote URL instead of assuming `origin` or GitHub. Push the recorded
branch and open one PR into the recorded base branch using `.squad/templates/pr.md`. Include outcome,
protocol evidence, exact commands and results, base/head SHA, risk, rollback and known gaps. P007 remains
`pending` until an independent review covers that head SHA.

If an external write is not authorized or no provider client is available, stop after the verified local branch
and report the exact command or user action still required. Do not call the work complete without saying so.

Report the worktree, commits, verification, PR or local branch, and recommend `$ps-review <PR>`.
