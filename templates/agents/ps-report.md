# Report shape

How `/ps-task`, `/ps-run` and `/ps-review` end. The same shape in all three, so that "is
it finished, and is it my turn?" is answered by **position**, not by reading prose.

## The rule above every other rule

**The shape reports the work. It never decides it.** Three prompts instead of one, nine
steps instead of six, a decision that needs its alternatives spelled out — the report
grows to hold what happened. Cutting the *work*, or dropping a fact, to fit the *layout*
is the one failure this file exists to prevent, and it is worse than any layout it
protects. When the two conflict, the layout yields and you say so in an item.

## The shape

    **<command> · <title>**

    - <one line per unit of work>
    - <...>

    **✓ done** · <what exists now>

    → `/ps-<next command> <arg>`

Only the ending is fixed: **one status line, then the `→` line or lines, in that order,
at the end.** Everything above them is as long as the work was.

## 1. The detail block

One line per unit of work — a step, a check, an artifact, a finding. Nine steps means
nine lines; the block is a record, not a budget. Keep each line under ~100 characters and
free of prose: exact file paths, SHAs, commands, PR numbers, and no adjective about how
it went.

Three primitives, all of them plain markdown:

    - a step that landed, or a check that passed
    - **<attention>** something worth seeing, but not blocking
    - ~~a thing~~ skipped, declined or discarded — <why, short>

The bold attention word follows the task's language — `**note**`, `**atenção**`. Metadata
comes at the end of the item, after ` — `: a SHA in backticks, requirement refs bare
(`` — `a1b2c3d` R1 R2 ``).

**Write markdown, do not draw.** Hand-made rules, custom glyphs starting a line and
spaces padded into columns are collapsed or re-wrapped by the renderer, and the layout
you aligned in your head lands somewhere else on the owner's screen.

## 2. The status line — exactly one, immediately before `→`

Three states, no fourth:

    **✓ done** · <what exists now>
    **? decide** · <the question> — default: <what you would do>
    **! stopped** · <what broke, and where it stands now>

It answers whose turn it is and nothing else. `✓ done` with a caveat is still `✓ done` —
the caveat is a `**note**` item. Work that ended half-finished is `! stopped`, and the
line says where the unfinished part is right now (stashed, pushed, left on the branch).

`? decide` is for what the owner alone can settle and what **blocks** you: a scope call, a
trade-off, a verdict still open. Never a question you could answer by reading the repo.

**A question that does not block does not become a status.** Work that finished and still
leaves the owner a call — a deliverable you deliberately did not create, scope you left
out, a follow-up worth its own task — is `✓ done` *plus* a question line directly above
the status:

    **? <the question>** — default: <what you would do>

Every question, blocking or not, carries its default, so a one-word reply unblocks you.
More than three open at once means the step was wrong, not the owner. Never drop a
question because the status was already chosen — that silence is how a suggestion you
made yourself becomes work the owner has to ask for twice.

A decision that cannot be understood from one line — a contract to approve, a trade-off
with real alternatives — is raised **before** the report, in its own message, while it can
still change the work. It reaches the report only as the one-line question pointing at it.

## 3. The `→` line — always last, always literal

``→ `/ps-review 42` ``, never "review it next". It is the only line that says what happens
next, so nothing else in the message may propose a step.

- **More than one artifact → one `→` line each**, in the order they should run. Two
  prompts written means two `→` lines, not a choice between them.
- **Nothing to run** → `→ nothing to run`.
- **The next move is the owner's** (`? decide`, or a question above a `✓ done`) → the
  `→` line names that instead of a command: `→ answer above, then `/ps-run <id>``.

## 4. Everything else in the message

The report is the **end** of the message, and for routine work the whole of it: no
preamble, no step-by-step recap, no summary of what the items already say, no offer to
help further, nothing after the last `→` line.

What that kills is **restatement** — "I've now completed the implementation and here's a
detailed summary…" tells the owner nothing the status line and the items do not, and
buries the one line they were looking for. It does not kill **substance**. A contract to
approve, a design proposal, a conflict you resolved by judgement: that belongs above the
report, in full, with a question line pointing at it. Losing it is not concision.

None of this governs the messages before the last one. Interview questions, proposals and
progress have their own shape and their own length; this file is for the message that
ends the command.
