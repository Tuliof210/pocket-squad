---
description: Unbiased code review of a story PR by a fresh-context subagent. Usage - /ps:review [pr-number]
---

Target: "$ARGUMENTS" is the PR number; if empty, the current branch's PR. If there is
none either, list the open PRs and ask the owner which one.

Two rounds exist and no more — **review**, then, only if a blocker or major had to be
fixed, **verification**. Round two is not a second review: it asks whether the named
findings closed and whether the fix stayed where it was told, and nothing else. A third
round is the owner's call, never this command's.

## Fresh eyes rule

You (the main chat) may have written this code — you do NOT review it. Dispatch ONE
`general-purpose` subagent whose prompt carries ONLY the PR number, the repo path and
the instructions below: no summary, no defense of the changes. That omission is the
whole mechanism. The verification round is a second, equally fresh subagent.

## Round 1 — review (subagent prompt, self-contained)

> Review PR #<n> in <repo path>. Fetch everything yourself: `gh pr view <n>` (the
> body holds the story and its Definition of Done), `gh pr diff <n>`, and read-only
> access to the repo's files for context.
>
> First, one shortcut: is every entry of `gh pr diff <n> --name-status` a rename, with
> the remaining hunks changing nothing but the paths those renames broke? Then no new
> behaviour exists to review — run every executable check, grep the repo for surviving
> references to the old paths (strings and dynamic lookups no toolchain resolves),
> confirm the new locations match the layout ARCHITECTURE.md describes, and stop there.
> One added line that is not a path fix and the shortcut is off.
>
> Otherwise, load the repo's norms first — `CLAUDE.md`, `.squad/ARCHITECTURE.md`
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
> Verdict — nothing vague ("improve quality" is banned). Open it with the head SHA you
> reviewed (`gh pr view <n> --json headRefOid`): verification diffs from that SHA.
> - `APPROVED`, with the evidence you gathered, or
> - `FINDINGS`, numbered, each with file:line, severity, and what "fixed" concretely
>   means. Severity decides who pays: **blocker/major buys a fix round; minor does
>   not** — it is recorded, declined by default, and `/ps:publish` files it in
>   `debt.md`. Raise minors freely; they cost a line, not a round. When a finding
>   breaks a written norm, quote the norm and where it lives — and when it lives in
>   `.squad/learnings.md`, prefix the finding `REPEAT —`. That rule was already written
>   down and got violated anyway; `/ps:publish` has to do something other than write it
>   again.

## The fix — a contract, not a free hand

Every blocker/major fix is bounded work, and this is the gate the loop lacked: an
unreviewed fix wanders, and the next round pays full price to discover its wandering.
Whoever fixes:

- **Touches only the files the findings name.** A pre-existing lint, a neighbouring
  bug, a tidy-up you noticed — that is the owner's call or a `debt.md` line, never a
  quiet commit riding along on a review fix.
- **Closes each finding by the means that found it.** Found by running the thing,
  closed by running the thing — not by reading the fix and agreeing with it.
- **Proves it before pushing**: the repo's standard lint/test/build, plus
  `git diff <verdict SHA>..HEAD --name-only`. Files in that list and not in the
  findings mean the contract broke — say so to the owner before pushing, do not let
  verification find it.
- One commit per finding, naming it: `fix(review): #2 <what>`. Never "review fixes".

## Round 2 — verification (fresh subagent)

> Verification round on PR #<n> in <repo path>. This is not a review. The prior
> verdict is below; it names the head SHA it reviewed — your diff is `<SHA>..HEAD`.
>
> <paste the round-1 verdict verbatim>
>
> Two questions, nothing else:
> 1. Did each blocker and major close? Re-run the check that found it, the reviewer's
>    method and not the fixer's description. A finding about a missing test closes only
>    if that test fails when you break what it covers — mutate the code and watch.
> 2. Is every path in `git diff <SHA>..HEAD --name-only` among the files those findings
>    name? Anything outside was reviewed by nobody and cannot be vouched for here.
>
> Then run the repo's standard lint/test/build. Do not open new lenses on the fix —
> no duplication pass, no over-engineering pass, no line-count opinions. Those bite on
> the story's code and round one already had its turn.
>
> Verdict: `APPROVED`, or `NOT CLOSED` naming which finding is still open and how you
> know, or `OUT OF BOUNDS` listing the files. The last two go to the owner.

The trade is deliberate: a bug the fix introduces *inside* the finding's own files, in
a path no existing check covers, ships. That costs less than a second full review on
every PR, and the bounded diff is what keeps the exposure small. Widen it only when a
real defect escapes this way — not on suspicion.

## After the verdict

**Post it on the PR. That is the default, not an option** — one call
(`gh pr review <n> --comment -F -`, `glab mr note <n> -F -`, whichever CLI this
machine has; none → say so and keep it in chat). It is the only searchable record this
process leaves, and what `/ps:publish` distills learnings from. The verification
verdict posts too, so the rounds stay countable. Then relay it to the owner in full and
triage together. The verdict is advisory; the owner decides — including deciding to fix
a minor, or to open the third round this command will not open by itself.
