---
description: Squash-merge a PR, rebase the base branch, sweep pocket-squad worktrees, distill learnings. Usage - /ps:publish [pr-number]
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. Read
`gh pr view <n> --json headRefName,baseRefName,mergeable,url`.

## Preflight

- The PR must be open and mergeable. `gh pr checks <n>` must be green when checks exist.
- Main checkout dirty → warn the owner and stop. Never force.

## Merge

`gh pr merge <n> --squash --delete-branch`

## Back home

If you are inside the story's worktree, leave it first (`ExitWorktree`, or run the
rest from the main checkout's path). In the main checkout:
`git checkout <baseRefName>`, then `git pull --rebase`.

## Cleanup — this PR's worktree, then a sweep

Find the worktree whose branch matches `headRefName` via
`git worktree list --porcelain`, `git worktree remove` that one, `git worktree prune`,
and delete the local branch if it survived.

Then sweep every other pocket-squad worktree (branch prefix `ps/`): check each one's
PR state (`gh pr list --head <branch> --json state`). MERGED or CLOSED → remove it the
same way. OPEN, or no PR yet (mid-task, not pushed) → leave it untouched. Never pass
`--force` to `git worktree remove` — if one has uncommitted changes, let git refuse and
tell the owner instead of overriding it.

## Learnings

Distill durable rules from this PR into `.squad/learnings.md` (create it from the
template if missing): one line per rule, following the file's format, only rules that
change future behavior. Cap: 30 rules — when adding past the cap, delete the weakest.
Commit as `chore(squad): learnings from PR #<n>` and push best-effort (protected
branch → leave the commit local and tell the owner).

Close with a report: PR merged, base branch updated, worktrees swept (N removed),
learnings added.
