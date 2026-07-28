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
> Scope the round before spending on it — decided from the diff, never from anyone's
> account of it:
>
> - **Reference-only** — every entry of `gh pr diff <n> --name-status` is a rename,
>   and the hunks in the files that are not renames change nothing but the paths the
>   renames broke. No new behaviour exists to review: run every executable check,
>   grep the repo for surviving references to the old paths (strings and dynamic
>   lookups no toolchain resolves), confirm the new locations match the layout
>   ARCHITECTURE.md describes — and stop there. The exemplar, duplication, security
>   and over-engineering lenses have nothing to bite on. A single added line that is
>   not a path fix disqualifies the whole PR from this round and it becomes a full one.
> - **Follow-up** — the PR already carries a verdict of yours. Review
>   `git diff <the SHA that verdict names>..HEAD` under every lens below, re-run every
>   executable check against the final state, and close each open finding by the means
>   that found it: one found by running the thing is closed by running the thing, not
>   by reading the fix. Repeat the earlier round's manual inspection only where that
>   incremental diff reaches. It reaches further than the fix claims whenever it leaves
>   the files the findings named, or adds a branch, a loop or a call — either one puts
>   you back in a full round, and the fix's own description never decides this.
> - **Anything else** — full.
>
> Before the diff, load the repo's norms — `CLAUDE.md`, `.squad/ARCHITECTURE.md`
> (conventions, plus the exemplar file paths it names), `.squad/learnings.md` and
> `.squad/debt.md`. You review against those, not against generic good practice.
> A line in `debt.md` is known and already declined: do not raise it again. Do raise
> it when this diff made it worse or copied it to a site it had not reached — say
> which of the two, and treat the new site as a new finding, not as covered. Verify:
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
> How far to go — reading is the default, running is not optional where it triggers.
> The diff settles broken norms, duplication, absences and scope creep. It cannot
> settle what a value becomes at runtime, whether an algorithm terminates on the real
> input, or whether the screen renders. So run it instead of reading it wherever the
> diff:
>
> - adds or changes a branch, a loop or recursion → trace it against real input, the
>   ugliest the repo has, never a sample you invented;
> - touches anything the DoD names as an observable outcome → produce that outcome;
> - parses, or takes data from outside the process → feed it a real file.
>
> None of those fired? Then the diff plus the exemplar is the whole review. Either
> way the verdict says what you ran and what you deliberately did not run — an
> undeclared skip is the single thing that makes a fast round untrustworthy, and it
> is what separates this from guessing quickly.
>
> Verdict — nothing vague ("improve quality" is banned). Open it with the round's
> scope and the head SHA you reviewed (`gh pr view <n> --json headRefOid`): the next
> round diffs from that SHA, so an unnamed one costs it a full re-read.
> - `APPROVED`, with the evidence you gathered, or
> - `FINDINGS`, numbered, each with file:line, severity (blocker/major/minor), and
>   what "fixed" concretely means. When a finding breaks a written norm, quote the
>   norm and where it lives — and when it lives in `.squad/learnings.md`, prefix the
>   finding `REPEAT —`. That rule was already written down and got violated anyway;
>   `/ps:publish` has to do something other than write it again.

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this
machine has; none → say so and keep it in chat). It is the only searchable record
this process leaves, and what `/ps:publish` distills learnings from. Then relay it to
the owner in full and triage together: accepted findings get fixed in the story's
worktree, pushed, and re-reviewed — the re-review posts too, so the rounds stay
countable. A commit answering a finding names it (`fix(review): #2 <what>`), never
"review fixes". The verdict is advisory; the owner decides.
