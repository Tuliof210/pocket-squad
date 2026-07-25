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
> access to the repo's files for context.
>
> Before the diff, load the repo's norms — `CLAUDE.md`, `.squad/ARCHITECTURE.md`
> (conventions, plus the exemplar file paths it names) and `.squad/learnings.md`.
> You review against those, not against generic good practice. Verify:
>
> - Every DoD item — run the executable checks yourself; never trust the PR's claims.
> - Correctness, broken contracts, regressions in the touched code paths.
> - Security: injection, authorization on objects, secrets in code, unsafe input.
> - Absences — what the norms require and this diff omits: the auth / validation /
>   scoping step every sibling call site has, a design-system token replaced by a
>   raw value. A diff shows what was written; open the nearest exemplar named in
>   ARCHITECTURE.md and compare against what wasn't.
> - Duplication — does the diff reimplement something the repo already has (grep
>   before assuming it doesn't), or repeat a block enough that it belongs in shared
>   code? Name the existing symbol or the extraction target.
> - Test honesty — do the tests actually bite, or do they pass vacuously?
> - Scope creep vs the PR description; over-engineering (reinvented stdlib,
>   speculative abstraction, unneeded dependency).
>
> Verdict — nothing vague ("improve quality" is banned):
> - `APPROVED`, with the evidence you gathered, or
> - `FINDINGS`, numbered, each with file:line, severity (blocker/major/minor), and
>   what "fixed" concretely means. When a finding breaks a written norm, quote the
>   norm and where it lives.

## After the verdict

Relay the verdict to the owner in full, then triage together. Findings the owner
accepts: fix in the story's worktree, push, offer a re-review. The verdict is
advisory — the owner decides. Post it as a PR comment (`gh pr comment`) only if asked.
