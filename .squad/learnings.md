# Learnings — managed by Pocket Squad

> Durable rules distilled from mistakes and successes. Every agent reads this before
> working; the techlead appends after each story. STRICT FORMAT — anything that does
> not fit the format does not belong here. No noise: a rule must change future
> behavior, or it is deleted.

Format (one block per learning):

```
## L-NNN: <short rule title>
- error: <what went wrong, one line>
- cause: <root cause, one line>
- rule: <imperative rule agents must follow from now on>
- scope: <specialty or "all"> | added: <date> | story: <slug>
```

Routing learnings use the same format (error = mis-tiered task).

---

## L-001: Implementer must hand off in `review` state, never self-complete
- error: devops-junior finished task 01 but left `status: todo` with no implementation notes; the reviewer had to set `status: done` itself.
- cause: implementer agents don't reliably follow the "set status: review + add implementation notes" handoff step in their role prompt.
- rule: an implementer ends every task at `status: review` with an `## Implementation notes` section listing files changed and how it self-checked the DoD; only the gate sets `done`/`failed`. If an implementer left `todo`, the gate treats it as a process miss but still reviews.
- scope: all | added: 2026-07-10 | story: 2026-07-10-npm-publish

## L-002: DoD for a test/CLI task must include fault injection, not just a green run
- error: n/a (success) — a smoke test that only asserts the happy path can pass while asserting nothing.
- cause: an all-passing test gives false confidence unless you prove it fails on breakage.
- rule: when a task delivers a test or check script, its DoD includes proving the check bites (temporarily break a target → non-zero exit → revert). The gate re-runs the fault injection itself, never trusting the implementer's account.
- scope: qa | added: 2026-07-10 | story: 2026-07-10-npm-publish
