# Debt — <project>

A place in the code that is knowingly wrong and that nobody is fixing now. Two
sources, no others: a review finding the owner declined, and a shortcut the
implementation took on purpose. Both are decisions someone already made — this file
only stops them from being made again, at full price, every round.

Not learnings. A learning is a rule for code that does not exist yet and points at no
line. Debt points at a line — that is the whole test: **can you name the file, it is
debt; can you not, it is a learning.** Not a task either: what is being fixed is a
task, debt is what was declined. Nothing here has anything scheduled to close it, which
is exactly why each entry has to say what would earn it one.

No cap — debt grows honestly and capping it would only make the file lie. It is kept
short another way: `sh .claude/ps-check.sh` flags an entry whose path no longer
exists (the code went away, the debt went with it) and one with no `until` (a debt
that cannot say what would make it worth paying is a wish, not a debt). An entry
leaves by being fixed, or by the code being deleted — never by being reworded.

Format: `- [<path>:<line-or-symbol>] <what is wrong>, until <what earns it a fix> (YYYY-MM-DD)`

---
