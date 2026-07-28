---
description: Squash-merge a PR, tick the story, sweep worktrees, and distill learnings when the story closes. Usage - /ps:publish [pr-number]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*)
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. Read
`gh pr view <n> --json headRefName,baseRefName,mergeable,url` (or the equivalent) —
`headRefName` is `ps/<story-slug>/<task-slug>`, which is where the story slug comes
from for the rest of this command.

## Preflight

- The PR must be open and mergeable, checks green where they exist, and the main
  checkout clean — dirty → warn the owner and stop. Never force.
- Run `sh .claude/ps-check.sh`. If this PR's task shows an **OPEN WINDOW**, the task
  that closes it has no PR yet: merging now ships the degradation and nothing
  guarantees the sequel. Stop, show the line, merge only if the owner says so. This is
  the one gate here that is genuinely the owner's call — everything else this command
  decides on its own.

## Merge, then home

`gh pr merge <n> --squash --delete-branch`. If you are inside the story's worktree,
leave it (`ExitWorktree`, or run the rest from the main checkout's path); in the main
checkout, `git checkout <baseRefName>` then `git pull --rebase`.

## Tick and sweep

    sh .claude/ps-check.sh sync <story-slug>
    sh .claude/ps-check.sh sweep

`sync` ticks `story.md` for every task whose PR is merged — here, on the base branch,
which is why the task's own PR never touches that file and sibling PRs never conflict
on it. It is idempotent, so a task merged by someone else gets picked up too. Commit
whatever it changed.

`sweep` removes the worktrees, local branches and remote branches of merged PRs and
reports what it could not. Quote its `SUMMARY` line verbatim; a non-zero count is a
fact the owner needs, not something to smooth over.

`sync`'s own `SUMMARY` ends with `remaining: N`. **That number decides the next
section.**

## Learnings — only when the story closes

`remaining: 0` → the story is done and you distill now. Anything else → stop here and
report; there is nothing to learn from one task of an unfinished story that will not
be truer, and cheaper, once its siblings have landed too. Doing this per PR was
costing a full pass on every merge.

Sources, best first: the review threads on the story's PRs, the commits that answered
them, then the diffs. Route every candidate — it lands in exactly one of these:

- A finding a review tagged `REPEAT` → that rule failed as prose: it was in
  `.squad/learnings.md`, loaded before implementing, and violated anyway. Delete the
  line and land its replacement in this same commit — a linter or type-checker rule, a
  test, or a task file. Never re-word it, never re-date it, never mark it extended.
  Nothing automatable exists? Say exactly that in the report and leave the line: the
  owner decides whether to keep paying for a rule on its second life.
- A finding a review filed as minor (declined by default), one the owner declined
  explicitly, or a shortcut a PR's Decisions section says was taken on purpose →
  `.squad/debt.md`, naming file:line and what would earn it a fix. Nothing else records
  a decision not to fix: unwritten, the next review pays full price to find it and the
  owner pays again to decline it.
- Non-derivable fact about this repo/tool that no tool would catch → `.squad/learnings.md`
- A linter/type-checker/test could catch it → change that config now, or file a task
- Missing shared code → a task, not a rule
- Process step, reminder, "always remember to" → nowhere; it has never worked
- Already in ARCHITECTURE.md, or already enforced → nowhere

Then retire one existing rule: has it become code, config, or dead weight? Delete it
in this same commit — leaving the file is what a rule is *for*, and the git log is its
archive. `ps-check.sh` must show learnings under cap; over it, compress or drop the
weakest, never grow a line in place.

Commit as `chore(squad): learnings from <story-slug>` and push best-effort (protected
branch → leave the commit local and tell the owner).

## Report

PR merged, base branch updated, the `sync` and `sweep` SUMMARY lines, and — when the
story closed — learnings added and retired.
