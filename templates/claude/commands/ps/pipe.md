---
description: Run a whole story end to end - load, then run/review/publish every pending task until nothing is left. Usage - /ps:pipe <story-slug> [task refs]
---

Target: "$ARGUMENTS" is the story slug, optionally followed by task references to
limit the run. Empty → list `.squad/stories/` and ask; never guess.

Every step **is** the existing command: invoke `/ps:load`, `/ps:run`, `/ps:review`,
`/ps:publish`, or read `.claude/commands/ps/<name>.md` and follow it verbatim. This
file is a conductor, never a fifth copy of the rules.

For this run you are authorized to proceed without asking between steps, to run tasks
in parallel, and to carry each PR through review → fix → verification once. You are not
authorized to skip a gate, weaken a check, settle a scope question, or open a third
round.

## Report as you go

The owner is watching, not driving. One line per transition, no prose between them:

```
▸ load — 5 tasks, 2 done | waves: [03 04] [05]
▸ wave 1/2 — dispatching 03, 04 in parallel
  ✓ 03 → PR #41    ✓ 04 → PR #42
▸ review #41 — 1 blocker, 1 minor → fixing blocker, minor to debt
▸ verify #41 — APPROVED
▸ publish #41 — merged | SUMMARY  open windows: 0 | needs attention: 0
▸ parked 05 — scope question: <one line>
```

A failure is one line too, and the run continues without it.

## 1. Load

Follow `load.md`. Its waves are the plan for the rest of this run.

## 2. Each wave — tasks in parallel

One `general-purpose` subagent per pending task of the wave, dispatched in a single
message, at most 4 in flight. Each prompt carries only the task reference, the story
slug, the repo path, the base branch and "follow .claude/commands/ps/run.md" — the
task file is a self-contained contract, so nothing else belongs there. Each returns
its PR URL. A subagent that hits a scope decision or fails its own verification
**parks** that task: report the line, drop it, keep the rest moving.

## 3. Each PR — review, fix, verify

Dispatch every PR's review in one message (`review.md` runs them as subagents, so
they parallelize for free), then work the findings PR by PR:

- blocker or major → fix in that PR's worktree under `review.md`'s fix contract, push,
  then its verification round. Only these two severities buy a round.
- minor → not fixed here. It rides on the posted verdict to `/ps:publish`, which files
  it in `debt.md`.
- Verification not APPROVED → stop that PR, report why, leave it open for the owner.
  Never open a third round on your own.

Never publish a PR that is not APPROVED.

## 4. Publish — strictly one at a time

Follow `publish.md` serially: it rebases the base branch and sweeps worktrees, and
two of those at once corrupt each other. A task that opened a `window:` publishes
immediately before the task that closes it. If a squash-merge conflicts on
`story.md`'s Tasks list, both sides are right — keep both checkboxes.

## 5. Between waves, and at the end

Re-run `/ps:load` before each next wave — merges flip checkboxes and a parked task may
have blocked its dependents. When no wave remains, close with: PRs merged, PRs left
open and why, tasks parked and why, and the final `ps-check.sh` SUMMARY.
