# Report shape

How `/ps:task`, `/ps:run` and `/ps:review` end. Same shape in all three, so that "is it
finished, and is it my turn?" is answered by **position**, not by reading prose.

**The report is the entire final message.** Not a summary appended to an explanation —
the whole thing. No preamble, no recap of what you just did step by step, no offer to
help further, nothing after the last line. Anything worth saying goes *inside* the report,
on one of its lines.

    ── <command> · <title>
    ▸ <one line per unit of work>
    ▸ <...>

    ✓ done · <what exists now, one line>
    → /ps:<next command> <arg>

## The three rules

**1. Exactly one status line, always second-to-last.** Three states, no others, no
inventing a fourth:

    ✓ done · <what exists now>
    ? decide · <the question> — default: <what you would do>
    ! stopped · <what broke, and where it stands now>

`? decide` is only for what the owner alone can settle — a scope call, a trade-off, a
verdict still open. Never a question you could answer by reading the repo. One line per
question, each carrying its default, so a one-word reply unblocks you. More than three
questions means the step was wrong, not the owner.

**2. The `→` line is always last, and always literal.** `→ /ps:review 42`, never "review
it next". Nothing to run → `→ nothing to run`. It is the only line that says what happens
next, so nothing else in the message may propose a next step.

**3. One line per item, no paragraphs.** Anything that does not fit one line was two
items. The glyphs are the workflow's:

    ▸  a step that landed          ·  skipped, unchanged, declined
    ✓  a check that passed         !  needs attention, but not blocking
    ?  an open question

Keep the detail block short enough to take in at a glance — the steps of the task, the
checks that ran, the findings. A file path, a SHA, a command, a PR number: exact. An
adjective about how it went: cut it.

## What this replaces

Long closings. "I've now completed the implementation and here's a detailed summary of
the changes I made…" tells the owner nothing that `✓ done` and the `▸` lines do not, and
buries the one line they were looking for. If a fact matters, it is an item; if it is not
an item, it does not go in the message.
