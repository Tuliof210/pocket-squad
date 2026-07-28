---
description: Unbiased code review of a whole story's PR by fresh-context subagents. Usage - /ps:review [pr-number]
effort: medium
allowed-tools: Task, Agent, Read, Grep, Glob, Bash(gh:*), Bash(glab:*), Bash(git:*)
---

Target: "$ARGUMENTS" is the PR number; empty → the current branch's PR. Neither → list
the open PRs and ask the owner which one.

This reviews a **story** PR — `ps-story/<slug>` into the target branch — once. The task
PRs inside it were merged without review on purpose: reviewing five slices of one
change five times found the same things five times and cost five rounds.

Two rounds exist and no more — **review**, then, only if a blocker or major had to be
fixed, **verification**. A third round is the owner's call, never this command's.

## Fresh eyes rule

You wrote this code — `/ps:run` runs in this same chat. You do NOT review it. The
prompts live in `.claude/ps-review.md` and `.claude/ps-verify.md`, and the subagents
read them themselves. Your dispatch carries the PR number, the repo path and the lens,
and nothing else: no summary, no defense. That omission is the whole mechanism, and it
is the one place in this workflow where a cold context is worth paying for.

## Round 1 — two lenses, one message

Dispatch **two `ps-review` subagents** in a single message:

> Review PR #<n> in <repo path>. Read `.claude/ps-review.md` and follow it for the
> `run` lens.

> Review PR #<n> in <repo path>. Read `.claude/ps-review.md` and follow it for the
> `read` lens.

`run` executes — DoD, correctness, security. `read` compares against the exemplar —
absences, duplication, scope creep, over-engineering — and runs nothing. Disjoint
ground, neither waits on the other, and the suite runs exactly once this round.

The agent type is not interchangeable with `general-purpose`: `ps-review` pins the
effort this step is worth, ships without write tools, and boots with its own small
system prompt.

Merge the two verdicts: `APPROVED` only when both approve; otherwise the union of their
findings, renumbered, each keeping its severity and the head SHA it was found at.

## The fix — a contract, not a free hand

Fix in the story's worktree, on `ps-story/<slug>` directly. Every blocker/major fix is
bounded work:

- **Touch only the files the findings name.** A pre-existing lint, a neighbouring bug, a
  tidy-up you noticed — owner's call or a `debt.md` line, never a quiet commit riding
  along on a review fix.
- **Close each finding by the means that found it.** Found by running the thing, closed
  by running the thing — not by reading the fix and agreeing with it.
- **Prove it before pushing**: the checks those findings name, plus
  `git diff <verdict SHA>..HEAD --name-only`. A file in that list and not in the
  findings means the contract broke — say so before pushing. The full suite is not
  re-run here; round 1 owns it.
- One commit per finding, naming it: `fix(review): #2 <what>`. Never "review fixes".

Minors are never fixed here. They ride on the posted verdict to `/ps:publish`, which
files them in `debt.md`.

## Round 2 — verification

Only when a blocker or major was fixed. One **`ps-verify`** subagent — cheaper on
purpose, because it re-runs named checks rather than forming opinions:

> Verification round on PR #<n> in <repo path>. Read `.claude/ps-verify.md` and follow
> it. The round-1 verdict:
>
> <paste the merged verdict verbatim>

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this machine
has; none → say so and keep it in chat). It is the only searchable record this process
leaves, and what `/ps:publish` distills learnings from. The verification verdict posts
too, so the rounds stay countable.

**The posted comment is written for a junior**, same as the PR body: plain sentences,
exact file names and commands, every term explained the first time. A finding nobody can
act on without asking you what it meant did not get reported, it got mentioned.

Then report it to the owner and **route by severity yourself** — blocker/major already
bought its round, minor is already declined and filed. Stop and ask only for what
severity does not settle: a scope question, or a verdict still not APPROVED after round
two.
