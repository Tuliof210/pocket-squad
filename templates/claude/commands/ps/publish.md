---
description: Merge an approved task PR and clean up - one deterministic script, with conflict resolution as the only judgement call. Usage - /ps:publish [pr-number]
effort: medium
allowed-tools: Read, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*)
---

Target: "$ARGUMENTS" is the PR number; empty → the current branch's PR.

## Gate

**The PR must be APPROVED by `/ps:review`.** Never publish what nobody reviewed. That is
the only thing you decide here — everything else is the script's.

## Publish

    sh .claude/ps-check.sh publish <n>

One command, and it is the whole job: squash-merge, delete the remote branch, remove the
worktree, delete the local branch, return to the base branch and `git pull --rebase`.
It is deterministic on purpose — there is no version of this you should be improvising.

Read its exit code:

- **0** — done. Quote its `SUMMARY` line verbatim; a non-zero count is a fact the owner
  needs, not something to smooth over.
- **2 — `CONFLICT`.** Nothing was merged. This is the one part that needs you.
- **anything else** — it printed why and stopped. Report it and stop too; never force.

## Resolving a conflict

In the task's worktree, on `task/<slug>`:

    git fetch origin
    git merge origin/<base>

Merge, never rebase: the PR is squash-merged, so the merge commit never reaches the base
branch's history — and a rebase would need a force push, which this package denies.

Resolve each conflict **by keeping both intents**, not by picking the shorter side. The
base moved for a reason and so did this branch. If a resolution needs a decision the
task prompt does not contain, stop and ask — a conflict quietly resolved the wrong way
is a bug nobody reviewed.

    git commit
    git push

Then run the same script again, unchanged:

    sh .claude/ps-check.sh publish <n>

## Report

Plain language, for someone who was not here: what shipped, which branch it landed on,
the `SUMMARY` line, and any conflict you resolved and how.
