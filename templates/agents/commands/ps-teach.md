---
description: Explain any part of this project - product, architecture, stack, a single file - to someone who is new to it. Usage - /ps-teach "your question"
effort: medium
allowed-tools: Task, Agent, Read, Grep, Glob, Bash(git log:*), Bash(git show:*), Bash(ls:*)
---

The question: "$ARGUMENTS" — may be empty; ask what they want to understand.

**This command changes nothing.** No file is written, no branch, no PR, no fix — even
when you spot something broken while reading. Spotted something? Say it in one line at
the end and let the owner decide. It is the only `/ps-*` command that is pure reading,
and it sits outside the `sync → task → run → review` chain: use it before
`/ps-task` when the area is unfamiliar, or any time someone asks "how does this work?".

Your product is **someone understanding**. Not a summary, not a file tour.

## 1. Read before you explain

`.squad/PRODUCT.md` and `.squad/ARCHITECTURE.md` first — they are the curated answer for
*what* and *how*. Then the code that actually implements it.

**Never explain a file you did not open.** A plausible explanation of code you inferred
is the one failure this command cannot survive: the reader has no way to catch it, and
they will repeat it to someone else. If the docs and the code disagree, **the code wins,
and you say so out loud** — a stale line in `ARCHITECTURE.md` is worth reporting.

For "why is it like this?", the answer is often in history, not in the file:
`git log -S<symbol>`, `git log --oneline -- <path>`, `git show <sha>`.

Read inline. Dispatch `Explore` subagents only when the question genuinely spans the
repo ("how does the whole thing fit together?") — one per angle, in a single message. A
question about one file is one `Read`.

## 2. Aim at a beginner, on purpose

Assume the reader is new: new to this repo, maybe new to the stack. That is the level,
even when the person asking clearly is not — an explanation a novice follows is one an
expert reads in five seconds.

- **Short sentences. One idea each.** If a sentence has two commas and an "although", it
  is two sentences.
- **Every term explained the first time it appears**, in five words, right there — not in
  a glossary at the end. `worktree` is not a word everyone knows.
- **Banned: "simply", "just", "obviously", "of course".** When the reader does not find
  it simple, those words teach them they are stupid instead of teaching them the thing.
- **Concrete beats general.** Trace one real case end to end — one command, one file, one
  run — instead of describing the shape of all of them.
- **Never restate the code in prose.** "This function takes a path and returns a hash" is
  transcription; the reader could have read that. Say *why it exists* and *what breaks
  without it*.

## 3. The shape

Answer in the language the question was asked in. Only the first line is mandatory — a
section with nothing real to put in it is dropped, never padded.

    ── teach · <the question, in one line>

    <THE ANSWER IN ONE SENTENCE — before any detail. If the reader stops here,
    they still learned the main thing.>

    **How it works**
    <the walkthrough, one idea per line, following one real path. Each claim anchored:>
    `bin/pocket-squad.js:42` — <what lives there, quoted when 3..8 lines say it better
    than you can>

    **Think of it like** <one analogy — and the line where it stops being true>

    **See it yourself**
    <one command they can run, or one file to open, that shows the thing happening>

    → <the next question worth asking, or `nothing — that's the whole picture`>

## 4. The two rules that decide if it worked

**One analogy, and you say where it breaks.** An analogy nobody bounds becomes a belief
the reader keeps and acts on later. "A manifest is like a coat check ticket — it proves
which coat was yours. It stops being true here because our ticket also notices when
someone changed the coat." No analogy at all beats a fuzzy one.

**Every claim has an address.** `path:line`, a real command, a real commit. Exact — never
"the parser" when the file is `src/parser/csv.ts`, never a path you did not open. This is
what turns an explanation into something the reader can go check, which is the difference
between them believing you and them knowing.

## 5. Size

Match the question. "What is `ps-check.sh`?" is a paragraph and one reference. "How does
the whole workflow fit together?" is the **spine first** — the four steps, one line each,
and what each one hands the next — then the offer to go deeper on any of them. Never dump
the whole repo because the question was broad; a wall of text teaches nothing, and the
`→` line exists exactly so the reader can pick the next piece.
