---
description: Squash-merge a story PR, rebase the base branch, clean up its worktree, distill learnings. Usage - /ps:publish [pr-number]
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

## Cleanup — this story's worktree only

Find the worktree whose branch matches `headRefName` via
`git worktree list --porcelain`, `git worktree remove` that one, `git worktree prune`,
and delete the local branch if it survived. **Never touch other stories' worktrees**
— other PRs may be in flight.

## Learnings

Distill durable rules from this story into `.squad/learnings.md` (create it from the
template if missing): one line per rule, following the file's format, only rules that
change future behavior. Cap: 30 rules — when adding past the cap, delete the weakest.
Commit as `chore(squad): learnings from PR #<n>` and push best-effort (protected
branch → leave the commit local and tell the owner).

Close with a report: PR merged, base branch updated, worktree removed, learnings added.
