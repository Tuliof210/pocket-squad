---
description: Unbiased code review of a story PR by a fresh-context subagent. Usage - /ps:review [pr-number]
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. If there is
none either, list the open PRs and ask the owner which one.

## Fresh eyes rule

You (the main chat) may have written this code — you do NOT review it. Dispatch ONE
`general-purpose` subagent whose prompt carries ONLY the PR number, the repo path and
the instructions below: no summary, no defense of the changes. That omission is the
whole mechanism.

## Subagent prompt (self-contained)

> Review PR #<n> in <repo path>. Fetch everything yourself: `gh pr view <n>` (the
> body holds the story and its Definition of Done), `gh pr diff <n>`, and read-only
> access to the repo's files for context.
>
> Before the diff, load the repo's norms — `CLAUDE.md`, `.squad/ARCHITECTURE.md`
> (conventions, plus the exemplar file paths it names) and `.squad/learnings.md`.
> You review against those, not against generic good practice. Verify:
>
> - Every DoD item — run the executable checks yourself, never trust the PR's claims,
>   and count a test that passes vacuously as a missing test.
> - Correctness, broken contracts, regressions in the touched code paths.
> - Security: injection, authorization on objects, secrets in code, unsafe input.
> - Absences — what the norms require and this diff omits: the auth / validation /
>   scoping step every sibling call site has, a design-system token replaced by a raw
>   value. A diff shows what was written; open the nearest exemplar named in
>   ARCHITECTURE.md and compare against what wasn't.
> - Duplication — does this reimplement something the repo already has (grep before
>   assuming), or repeat a block that belongs in shared code? Name the symbol.
> - Scope creep vs the PR description; over-engineering (reinvented stdlib,
>   speculative abstraction, unneeded dependency).
>
> Verdict — nothing vague ("improve quality" is banned):
> - `APPROVED`, with the evidence you gathered, or
> - `FINDINGS`, numbered, each with file:line, severity (blocker/major/minor), and
>   what "fixed" concretely means. When a finding breaks a written norm, quote the
>   norm and where it lives.

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this
machine has; none → say so and keep it in chat). It is the only searchable record
this process leaves, and what `/ps:publish` distills learnings from. Then relay it to
the owner in full and triage together: accepted findings get fixed in the story's
worktree, pushed, and re-reviewed — the re-review posts too, so the rounds stay
countable. A commit answering a finding names it (`fix(review): #2 <what>`), never
"review fixes". The verdict is advisory; the owner decides.
