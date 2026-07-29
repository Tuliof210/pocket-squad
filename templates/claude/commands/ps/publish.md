---
description: Squash-merge an approved story PR, sweep its worktree, and distill learnings. Usage - /ps:publish [pr-number]
effort: medium
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*)
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. Read
`gh pr view <n> --json headRefName,baseRefName,mergeable,url` — `headRefName` is
`ps-story/<story-slug>`, which is where the story slug comes from below.

This publishes a **story**, once. There is nothing smaller to publish: `/ps:run`
committed each task straight onto the story branch, so this PR is the only one there
ever was.

## Preflight

- The PR must be open and mergeable, checks green where they exist, and the main
  checkout clean — dirty → warn the owner and stop. Never force.
- **The PR must be APPROVED by `/ps:review`.** Never publish a story nobody reviewed;
  no task in it was reviewed on its own, on the promise that this one would be.

## Merge

    gh pr merge <n> --squash --delete-branch

Squash on purpose: the target branch gets one commit per story. The per-task commits
lived on the story branch and their record stays in this PR's commit list — the target
branch's history is a list of stories, not of steps.

Then go home: if you are inside the story's worktree, leave it (`ExitWorktree`, or run
the rest from the main checkout's path); in the main checkout,
`git checkout <baseRefName>` then `git pull --rebase`.

## Sweep

    sh .claude/ps-check.sh sweep

It removes the story worktree and its branch, and reports what it could not. Quote its
`SUMMARY` line verbatim; a non-zero count is a fact the owner needs, not something to
smooth over.

Nothing needs ticking here: `/ps:run` commits each box with the work it claims, so an
unticked task is one that parked, and it should stay unticked. Its half-finished work is
in a stash named `parked <story-slug> ...`, which survives the worktree removal — list
`git stash list` and name any that are left, so they do not rot unnoticed.

## Learnings

Sources, best first: the review threads on this PR, the commits that answered them, then
the diff. Route every candidate — it lands in exactly one of these:

- A finding the review tagged `REPEAT` → that rule failed as prose: it was in
  `.squad/learnings.md`, loaded before implementing, and violated anyway. Delete the line
  and land its replacement in this same commit — a linter or type-checker rule, a test,
  or a task file. Never re-word it, never re-date it, never mark it extended. Nothing
  automatable exists? Say exactly that in the report and leave the line: the owner
  decides whether to keep paying for a rule on its second life.
- A finding the review filed as minor (declined by default), one the owner declined
  explicitly, or a shortcut the PR body's "Known gaps" section names → `.squad/debt.md`,
  naming file:line and what would earn it a fix. Nothing else records a decision not to
  fix: unwritten, the next review pays full price to find it and the owner pays again to
  decline it.
- Non-derivable fact about this repo/tool that no tool would catch → `.squad/learnings.md`
- A linter/type-checker/test could catch it → change that config now, or file a task
- Missing shared code → a task, not a rule
- Process step, reminder, "always remember to" → nowhere; it has never worked
- Already in ARCHITECTURE.md, or already enforced → nowhere

Then retire one existing rule: has it become code, config, or dead weight? Delete it in
this same commit — leaving the file is what a rule is *for*, and the git log is its
archive. `ps-check.sh` must show learnings under cap; over it, compress or drop the
weakest, never grow a line in place.

Commit as `chore(squad): learnings from <story-slug>` and push best-effort (protected
branch → leave the commit local and tell the owner).

## Report

Plain language, for someone who was not here: what shipped, which branch it landed on,
the `sweep` SUMMARY line, any parked stash still around, and what went into learnings
and debt.
