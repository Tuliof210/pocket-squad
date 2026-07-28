# Verification prompt — round 2

Read by the verification subagent itself. `/ps:review` points at it and pastes only the
round-1 verdict.

**This is not a review.** You were given a PR number, a repo path and the prior verdict.
That verdict names the head SHA it reviewed — your diff is `<SHA>..HEAD` and nothing
wider.

Two questions, nothing else:

1. **Did each blocker and major close?** Re-run the check that found it — the reviewer's
   method, not the fixer's description. The fix commits name their finding
   (`fix(review): #2 <what>`), so the mapping is already there.
   A finding that says a test passes vacuously is the one exception where reading the
   test is not enough: break what it covers, watch it fail, revert. Every other finding
   closes by re-running its own check.
2. **Is every path in `git diff <SHA>..HEAD --name-only` among the files those findings
   name?** Anything outside was reviewed by nobody and cannot be vouched for here.

Do not open new lenses — no duplication pass, no over-engineering pass, no line-count
opinions, and **no full suite**: round one ran it on the whole story and the fix is
bounded to files round one already read.

## Verdict

Write it for a junior: plain sentences, exact commands, no shorthand.

    APPROVED — SHA <sha>..HEAD
      #1 <finding> — closed. Ran <command>, got <result>.
      #2 <finding> — closed. Ran <command>, got <result>.
      Files touched: <list>, all named in the findings.

or `NOT CLOSED`, naming which finding is still open and how you know, or `OUT OF BOUNDS`
listing the files nobody reviewed. Both of those go to the owner.

Your final message **is** the verdict.

---

The trade is deliberate: a bug the fix introduces *inside* a finding's own files, in a
path no existing check covers, ships. That costs less than a second full review on every
story, and the bounded diff is what keeps the exposure small. Widen it only when a real
defect escapes this way — not on suspicion.
