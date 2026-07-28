---
description: Unbiased code review of a story PR by fresh-context subagents. Usage - /ps:review [pr-number]
effort: medium
allowed-tools: Task, Agent, Read, Grep, Glob, Bash(gh:*), Bash(glab:*), Bash(git:*)
---

Target: "$ARGUMENTS" is the PR number; empty → the current branch's PR. Neither → list
the open PRs and ask the owner which one.

Two rounds exist and no more — **review**, then, only if a blocker or major had to be
fixed, **verification**. A third round is the owner's call, never this command's.

## Fresh eyes rule

You (the main chat) may have written this code — you do NOT review it. The prompts
live in `.claude/ps-review.md` and `.claude/ps-verify.md`, and the subagents read them
themselves. Your dispatch carries the PR number, the repo path and the lens, and
nothing else: no summary of the changes, no defense of them. That omission is the
whole mechanism — and keeping the prompt in a file the subagent opens, instead of a
blockquote you retype into every dispatch, is what makes it cheap.

## Round 1 — two lenses, one message

Dispatch **two `ps-review` subagents** in a single message. The agent type is not
interchangeable with `general-purpose`: `ps-review` pins the effort this step is worth,
carries no write tools, and boots with its own small system prompt instead of the full
one.

> Review PR #<n> in <repo path>. Read `.claude/ps-review.md` and follow it for the
> `run` lens.

> Review PR #<n> in <repo path>. Read `.claude/ps-review.md` and follow it for the
> `read` lens.

`run` executes — DoD, correctness, security. `read` compares — absences, duplication,
scope creep, over-engineering — and runs nothing. Disjoint ground, neither waits on
the other, and the suite runs exactly once this round.

Merge the two verdicts: `APPROVED` only when both approve; otherwise the union of
their findings, renumbered, each keeping its severity and its head SHA.

## The fix — a contract, not a free hand

Every blocker/major fix is bounded work, and this is the gate the loop lacked: an
unreviewed fix wanders, and the next round pays full price to discover its wandering.
Whoever fixes:

- **Touches only the files the findings name.** A pre-existing lint, a neighbouring
  bug, a tidy-up you noticed — that is the owner's call or a `debt.md` line, never a
  quiet commit riding along on a review fix.
- **Closes each finding by the means that found it.** Found by running the thing,
  closed by running the thing — not by reading the fix and agreeing with it.
- **Proves it before pushing**: the checks those findings name, plus
  `git diff <verdict SHA>..HEAD --name-only`. A file in that list and not in the
  findings means the contract broke — say so to the owner before pushing, do not let
  verification find it. The full suite is **not** re-run here; round 1 owns it, and
  the fix is bounded to files round 1 already read.
- One commit per finding, naming it: `fix(review): #2 <what>`. Never "review fixes".

Minors are never fixed here. They ride on the posted verdict to `/ps:publish`, which
files them in `debt.md`.

## Round 2 — verification (fresh subagent)

Only when a blocker or major was fixed. One **`ps-verify`** subagent — a cheaper agent
than round one on purpose, because it re-runs named checks rather than forming
opinions:

> Verification round on PR #<n> in <repo path>. Read `.claude/ps-verify.md` and follow
> it. The round-1 verdict:
>
> <paste the merged verdict verbatim>

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this
machine has; none → say so and keep it in chat). It is the only searchable record this
process leaves, and what `/ps:publish` distills learnings from. The verification
verdict posts too, so the rounds stay countable.

Then report it to the owner and **route by severity yourself** — blocker/major already
bought its round, minor is already declined and filed. Stop and ask only for what
severity does not settle: a scope question, or a verdict still not APPROVED after
round two. Everything else is already decided, and asking about a decided thing is a
stall, not a gate.
