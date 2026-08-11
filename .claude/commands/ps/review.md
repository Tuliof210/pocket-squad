---
description: One-round fresh-eyes review of a task PR against the repo norms and the prompt that produced it. Usage - /ps:review [pr-number]
effort: medium
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(gh:*), Bash(glab:*), Bash(git:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(cargo:*), Bash(go:*), Bash(pytest:*), Bash(uv:*)
---

Target: "$ARGUMENTS" is the PR number; empty → the current branch's PR. Neither → list
the open PRs and ask the owner which one.

**One round. There is no second.** A blocker or major is fixed under the contract below
and the checks that found it are re-run — by you, inline. A further round is the owner's
call, never this command's.

## Fresh eyes rule

You wrote this code — `/ps:run` runs in this same chat. You do NOT review it. The prompt
lives in `.claude/ps-review.md` and the subagents read it themselves. Your dispatch
carries the PR number, the repo path, the lens and the path of the task prompt, and
nothing else: no summary, no defense. That omission is the whole mechanism.

## The dispatch — two lenses, one message

Find the task prompt first: `.squad/tasks/<id>.prompt.md`, the one this PR implements
(the PR body links it; otherwise match the branch `task/<slug>` to the prompt's title).
No file — the prompt was pasted in a fresh session — then paste its text into the
dispatch instead, and say so.

Dispatch **two `ps-review` subagents** in a single message:

> Review PR #\<n> in \<repo path>. The task prompt is `.squad/tasks/<id>.prompt.md`.
> Read `.claude/ps-review.md` and follow it for the `run` lens.

> Review PR #\<n> in \<repo path>. The task prompt is `.squad/tasks/<id>.prompt.md`.
> Read `.claude/ps-review.md` and follow it for the `read` lens.

`run` executes — the prompt's Outcome and Verify, correctness, security. `read` compares
against the norms and the exemplar — absences, duplication, scope creep,
over-engineering — and runs nothing. Disjoint ground, neither waits on the other, and
the suite runs exactly once.

The agent type is not interchangeable with `general-purpose`: `ps-review` pins the
effort this step is worth, ships without write tools, and boots with its own small
system prompt.

Merge the two verdicts: `APPROVED` only when both approve; otherwise the union of their
findings, renumbered, each keeping its severity and the head SHA it was found at.

## The fix — a contract, not a free hand

Fix in the worktree, on `task/<slug>` directly. Every blocker/major fix is bounded:

- **Touch only the files the findings name.** A pre-existing lint, a neighbouring bug, a
  tidy-up you noticed — owner's call, never a quiet commit riding along.
- **Close each finding by the means that found it.** Found by running the thing, closed
  by running the thing — not by reading the fix and agreeing with it.
- **Prove it before pushing**: the checks those findings name, plus
  `git diff <verdict SHA>..HEAD --name-only`. A file in that list and not in the findings
  means the contract broke — say so before pushing.
- One conventional commit per finding: `fix(review): #2 <what>`. Never "review fixes".
  Then `git push` — the verdict you are about to post names findings that must already be
  closed on the PR, not in a worktree only you can see.

Minors are not fixed here. They are recorded in the posted verdict and the owner decides.

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this machine
has; none → say so and keep it in chat). It is the only searchable record this process
leaves.

Post the merged verdict as the subagents wrote it — language, wording and severities are
already settled by `.claude/ps-review.md`. You renumber and unite; you do not rewrite.

## Report

**Follow `.claude/ps-report.md`. It is the whole final message.** The verdict is on the
PR; this is the owner's one-screen version of it, not a second copy:

    ── review · <title>
    ▸ run lens   <APPROVED | n findings>       ✓ <the check that mattered>
    ▸ read lens  <APPROVED | n findings>
    ✓ fixed  #1 <finding>                      f7a8b9c
    ·  minor #3 <finding> — declined, your call

    ✓ done · <PR url> approved at <sha>
    → /ps:publish <pr>

**Route by severity yourself**: blocker and major already bought their fix, minor is
already declined — neither is a question. `? decide` is for what severity does not settle:
a scope question, or a verdict still not APPROVED after the fixes.
