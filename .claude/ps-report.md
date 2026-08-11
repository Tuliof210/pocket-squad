# Report shape

How `/ps:task`, `/ps:run` and `/ps:review` end. Same shape in all three, so that "is it
finished, and is it my turn?" is answered by **position**, not by reading prose.

**The report is the entire final message.** Not a summary appended to an explanation —
the whole thing. No preamble, no recap of what you just did step by step, no offer to
help further, nothing after the last line. Anything worth saying goes *inside* the report,
on one of its lines.

    **<command> · <title>**

    - <one line per unit of work>
    - <...>

    **✓ done** · <what exists now, one line>

    → `/ps:<next command> <arg>`

## The three rules

**1. Exactly one status line, always second-to-last.** Three states, no others, no
inventing a fourth:

    **✓ done** · <what exists now>
    **? decide** · <the question> — default: <what you would do>
    **! stopped** · <what broke, and where it stands now>

`? decide` is only for what the owner alone can settle — a scope call, a trade-off, a
verdict still open. Never a question you could answer by reading the repo. One line per
question, each carrying its default, so a one-word reply unblocks you. More than three
questions means the step was wrong, not the owner.

**2. The `→` line is always last, and always literal.** ``→ `/ps:review 42` ``, never
"review it next". Nothing to run → `→ nothing to run`. It is the only line that says what
happens next, so nothing else in the message may propose a next step.

**3. Write real markdown, not a drawing.** The message is rendered as markdown: hand-drawn
rules, custom glyphs at the start of a line and spaces padded into columns all get
collapsed, re-flowed or wrapped without a hanging indent, and the layout you aligned in
your head lands somewhere else on the owner's screen. Use the three primitives the
renderer already owns:

    - a step that landed, or a check that passed
    - **<attention>** something worth seeing, but not blocking
    - ~~a thing~~ skipped, declined or discarded — <why, short>

The bold attention word follows the task's language — `**note**`, `**atenção**`. Metadata
at the end of an item comes after ` — `: a SHA in backticks, requirement refs bare
(`` — `a1b2c3d` R1 R2 ``). Exact file paths, SHAs, commands and PR numbers; an adjective
about how it went: cut it.

Keep an item to **one line, under ~100 characters**, and the block to **six items**.
Longer than that was two items, or prose that belongs in the prompt file — not a glance.

## What this replaces

Long closings. "I've now completed the implementation and here's a detailed summary of
the changes I made…" tells the owner nothing that `✓ done` and the items do not, and
buries the one line they were looking for. If a fact matters, it is an item; if it is not
an item, it does not go in the message.
