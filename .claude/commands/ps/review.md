---
description: Unbiased code review of a story PR by a fresh-context subagent. Usage - /ps:review [pr-number]
---

Target: "$ARGUMENTS" is the PR number. If empty, use the current branch's PR
(`gh pr view --json number,url`). If there is none either, run `gh pr list` and ask
the owner which PR to review.

## Fresh eyes rule

You (the main chat) may have written this code — you do NOT review it. Dispatch
exactly ONE `general-purpose` subagent. Its prompt contains ONLY the PR number, the
repo path, and the instructions below. Do NOT include any summary, defense, or
explanation of the changes in the dispatch prompt — that context is exactly what
would bias the review.

## Subagent prompt (self-contained)

> Review PR #<n> in <repo path>. Fetch everything yourself: `gh pr view <n>` (the
> body holds the story and its Definition of Done), `gh pr diff <n>`, and read-only
> access to the repo's files for context. Verify:
>
> - Every DoD item — run the executable checks yourself; never trust the PR's claims.
> - Correctness, broken contracts, regressions in the touched code paths.
> - Security: injection, authorization on objects, secrets in code, unsafe input.
> - Test honesty — do the tests actually bite, or do they pass vacuously?
> - Scope creep vs the PR description; over-engineering (reinvented stdlib,
>   speculative abstraction, unneeded dependency).
>
> Verdict — nothing vague ("improve quality" is banned):
> - `APPROVED`, with the evidence you gathered, or
> - `FINDINGS`, numbered, each with file:line, severity (blocker/major/minor), and
>   what "fixed" concretely means.

## After the verdict

Relay the verdict to the owner in full, then triage together. Findings the owner
accepts: fix in the story's worktree, push, offer a re-review. The verdict is
advisory — the owner decides. Post it as a PR comment (`gh pr comment`) only if asked.
