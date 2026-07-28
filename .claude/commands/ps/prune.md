---
description: Prune .squad/learnings.md and .squad/debt.md - drop what is duplicated, dead or verbose. Usage - /ps:prune [learnings|debt]
effort: medium
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(sh .claude/ps-check.sh:*)
---

Target: "$ARGUMENTS" narrows this to one file. Empty → both.

Deleting here is the point, not a loss: `learnings.md` says every rule is trying to
leave, and `debt.md` says an entry leaves by being fixed or by its code being
deleted. The git log of both files is the archive, so nothing you cut is lost — which
is exactly why a cut still needs evidence, never an impression.

## 1. The mechanical half is already done

Run `sh .claude/ps-check.sh`. It names what is provably dead without any judgement —
a debt entry whose path is gone, one with no `until`, a learning grown in place, the
cap. Those lines open your proposal and need no argument beyond the script's output.

## 2. Read both files, then the repo they describe

An entry is a claim about this codebase. You cannot rule on it from the file alone —
open what it points at. `debt.md` gives you file:line; a learning gives you an area,
so grep it.

## 3. The four cuts

Each one names its evidence in the proposal. No evidence, no cut.

- **Duplicated** — two entries whose *action* is the same, however different the
  wording. Keep the one whose condition is narrower and checkable; a rule you cannot
  tell you are breaking has never fired. Both broad → rewrite as one line and keep
  the **older** date: how long it has survived is the fact worth carrying, and one
  date per line is what `ps-check.sh` accepts.
- **Dead** — the path, tool or behaviour it warns about no longer exists. Evidence is
  the grep that comes back empty, quoted.
- **Superseded** — a lint rule, a type, a test or a shared function now fails when
  this is broken. Name it, and prove it bites: break the target on purpose, see the
  non-zero exit, revert. A check nobody proved is not a reason to delete a rule.
  For a debt entry, the equivalent is its `until` having already come true — that one
  is not deleted, it becomes a task, and you say so.
- **Verbose** — the fact and the action fit `- [<area>] <fact>, so <what to do> (date)`
  and do not. Rewrite, never delete: this cut changes the line, not the ledger.

## 4. What stays, however tempting

- Anything you could not disprove. Not remembering why a rule exists is not evidence
  that it is dead — it is evidence that it is doing its job silently.
- Debt that is merely old. Age is not repayment.
- The entry that keeps being inconvenient. That is the one the file exists for.

## 5. Propose, then write

**Never edit before the owner approves** — one line per entry: the entry, the cut,
the evidence, and for a rewrite the new text. Group by file, dead ones first.

On approval, apply it in one commit — `chore(squad): prune learnings + debt` — then
re-run `sh .claude/ps-check.sh` and quote its `SUMMARY` verbatim. Close by reporting
what left each file, what was rewritten, and anything you refused to cut and why.
