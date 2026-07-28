---
description: Run a whole story end to end - load, then run/review/publish every pending task until nothing is left. Usage - /ps:pipe <story-slug> [task refs]
effort: medium
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .claude/ps-check.sh:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(cargo:*), Bash(go:*), Bash(pytest:*), Bash(uv:*)
---

Target: "$ARGUMENTS" is the story slug, optionally followed by task references to
limit the run. Empty → list `.squad/stories/` and ask; never guess.

Every step **is** the existing command: invoke `/ps:load`, `/ps:run`, `/ps:review`,
`/ps:publish`, or read `.claude/commands/ps/<name>.md` and follow it verbatim. This
file is a conductor, never a fifth copy of the rules.

For this run you are authorized to proceed without asking between steps, to run tasks
in parallel, and to carry each PR through review → fix → verification once. You are
not authorized to skip a gate, weaken a check, settle a scope question, or open a
third round. Anything you are not authorized to decide **parks** its task — one line
in the report, and the queue keeps moving.

**A denied permission is a park, never a stop.** A tool call refused by the permission
system or the auto-mode classifier ends *that step*, not this run: report the line,
leave the PR open, move to the next item. The queue is the point — a pipe that halts on
the first refusal has thrown away every task behind it in exchange for nothing.
`.claude/settings.json` pre-approves the calls this workflow is made of, so a refusal
means something outside that list; the closing report names it and the owner decides.

## Report as you go

The owner is watching, not driving. One line per transition, no prose between them:

```
▸ load — 5 tasks, 2 done | waves: [03 04] [05]
▸ wave 1/2 — dispatching 03, 04 in parallel
  ✓ 03 → PR #41    ✓ 04 → PR #42
▸ review #41 — 1 blocker, 1 minor → fixing blocker, minor to debt
▸ verify #41 — APPROVED, held for the publish batch
▸ parked 05 — scope question: <one line>
▸ publishing 2 approved PRs
  ✓ #41 merged | remaining: 2
  ! #42 parked — refused: `gh pr merge --squash` (classifier). PR is green, merge it
```

A failure is one line too, and the run continues without it.

## 1. Load

Follow `load.md`. Its waves are the plan for the rest of this run.

## 2. Each wave — tasks in parallel

One **`ps-task`** subagent per pending task of the wave, dispatched in a single
message, at most 4 in flight. Each prompt carries only the task reference, the story
slug, the repo path and the base branch — `ps-task` already knows to follow
`run.md`, and the task file is a self-contained contract carrying its own `## Context`,
so nothing else belongs there.

Use `ps-task`, not `general-purpose`. A command's frontmatter does not reach a subagent
you dispatch — the agent definition is the only place the effort and model of this
step can be set, and this step is most of what a story generates. Each returns its PR URL. A subagent that hits a scope decision or fails
its own verification **parks** that task: report the line, drop it, keep the rest
moving.

## 3. Each PR — review, fix, verify

Dispatch every PR's round 1 in one message. `review.md` uses two `ps-review` subagents
per PR (`run` and `read`), so four PRs is eight subagents and they all parallelize —
the review stage costs one PR's wall-clock, not four. Then work the findings PR by PR:

- blocker or major → fix in that PR's worktree under `review.md`'s fix contract, push,
  then its verification round. Only these two severities buy a round.
- minor → not fixed here. It rides on the posted verdict to `/ps:publish`, which files
  it in `debt.md` when the story closes.
- Verification not APPROVED → stop that PR, report why, leave it open for the owner.
  Never open a third round on your own.

Never publish a PR that is not APPROVED.

## 4. Between waves

Re-run `/ps:load` before each next wave. A parked task may have blocked its dependents,
and `ps-check.sh status` reads task state off the PRs — which at this point are open,
not merged, so a wave whose dependency is merely *approved* still counts as unmet.
Treat an approved-and-held PR as done for ordering purposes; it is the only reason a
later wave can start before section 5 runs.

## 5. Publish — last, and strictly one at a time

Hold the approved PRs and publish them **at the end of the run**, not as each one turns
green. Merging is the one irreversible step in this pipe, so it is also the one most
likely to be refused — and a refusal that lands after every task has been run and
reviewed costs the owner a `gh pr merge`, where the same refusal in the middle would
have stranded every task behind it.

Then follow `publish.md` serially: it rebases the base branch and sweeps worktrees, and
two of those at once corrupt each other. Serial is cheap now — each publish is a merge,
a `sync`, a `sweep`, and the learnings pass fires only on the one that takes the story
to `remaining: 0`. Do not hoist that pass up here; `publish.md` already gates it.

Order within the batch is not free choice: a task that opened a `window:` publishes
immediately before the task that closes it.

## 6. Close

PRs merged, PRs left open and why, tasks parked and why (a permission refusal names the
exact call that was refused, so the owner can add it to `.claude/settings.json` or run
that one step themselves), the learnings the final publish distilled, and the last
`ps-check.sh` SUMMARY.
