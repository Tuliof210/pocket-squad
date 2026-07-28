---
description: Squash-merge a PR, rebase the base branch, sweep pocket-squad worktrees, distill learnings. Usage - /ps:publish [pr-number]
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. Read
`gh pr view <n> --json headRefName,baseRefName,mergeable,url` (or the equivalent).

## Preflight

- The PR must be open and mergeable, checks green where they exist, and the main
  checkout clean — dirty → warn the owner and stop. Never force.
- Run `sh .claude/ps-check.sh`. If this PR's task shows an **OPEN WINDOW**, the task
  that closes it has no PR yet: merging now ships the degradation and nothing
  guarantees the sequel. Stop, show the line, merge only if the owner says so.

## Merge, then home

`gh pr merge <n> --squash --delete-branch`. If you are inside the story's worktree,
leave it (`ExitWorktree`, or run the rest from the main checkout's path); in the main
checkout, `git checkout <baseRefName>` then `git pull --rebase`.

## Cleanup

`sh .claude/ps-check.sh sweep` — it removes the worktrees, local branches and remote
branches of merged PRs and reports what it could not. Quote its `SUMMARY` line
verbatim; a non-zero count is a fact the owner needs, not something to smooth over.

## Learnings

Sources, best first: the review threads on the PR, the commits that answered them,
then the diff. Route every candidate — it lands in exactly one of these:

- A finding the review tagged `REPEAT` → that rule failed as prose: it was in
  `.squad/learnings.md`, loaded before implementing, and violated anyway. Delete the
  line and land its replacement in this same commit — a linter or type-checker rule,
  a test, or a task file. Never re-word it, never re-date it, never mark it extended.
  Nothing automatable exists? Then say exactly that in the report and leave the line:
  the owner is the one who decides to keep paying for a rule on its second life.
- A finding the review filed as minor (declined by default), one the owner declined
  explicitly, or a shortcut the PR's Decisions section says was
  taken on purpose → `.squad/debt.md`, naming file:line and what would earn it a fix.
  Nothing else records a decision not to fix: unwritten, the next review pays full
  price to find it and the owner pays again to decline it.
- Non-derivable fact about this repo/tool that no tool would catch → `.squad/learnings.md`
- A linter/type-checker/test could catch it → change that config now, or file a task
- Missing shared code → a task, not a rule
- Process step, reminder, "always remember to" → nowhere; it has never worked
- Already in ARCHITECTURE.md, or already enforced → nowhere

Then retire one existing rule: has it become code, config, or dead weight? Delete it
in this same commit — leaving the file is what a rule is *for*, and the git log is its
archive. `ps-check.sh` must show learnings under cap; over it, compress or drop the
weakest, never grow a line in place.

Commit as `chore(squad): learnings from PR #<n>` and push best-effort (protected
branch → leave the commit local and tell the owner). Close with a report: PR merged,
base branch updated, the sweep's SUMMARY line, learnings added and retired.
