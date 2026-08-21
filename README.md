# Pocket Squad

A lean agent workflow, in your pocket. One `npx` installs five slash commands into
`.agents/`: four take a request from "what I actually want" to a reviewed pull request,
and one explains the project back to you.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # upgrade managed files (never clobbers your edits)
npx pocket-squad status     # managed vs customized files
```

## The workflow

```
/ps-sync                 once per project, and again whenever the rules drift. Sweeps
                         the repo for product and architecture rules already written
                         somewhere — README, CONTRIBUTING, docs, a bloated AGENTS.md —
                         and MOVES them into just two files: .squad/PRODUCT.md
                         (what/who/why) and .squad/ARCHITECTURE.md (stack, commands,
                         conventions, exemplar paths, do-not-touch). Then interviews
                         only the gaps the repo cannot answer. AGENTS.md is emptied
                         down to a pointer — read those two files before answering
                         anything, /ps-* or not. Proposes everything and waits for
                         your confirmation.

/ps-task ["request"]     turns a rough request into ONE refined prompt. Asks only the
                         non-obvious and ambiguous questions, each with a suggested
                         default; investigates the repo read-only; then writes
                         .squad/tasks/<yymmdd-hhmm>.prompt.md — outcome, context
                         (exemplar lines, signatures, verified commands), 1..N steps,
                         scope, verify, forbidden. In the language of the conversation,
                         long enough to be unambiguous and short enough to audit.

/ps-run <id | prompt>    executes that prompt verbatim — no second interview, that is
                         the whole point of the split. Cuts a worktree on task/<slug>,
                         warms it with this checkout's dependencies, then one
                         conventional commit per step, runs the prompt's Verify, and
                         opens ONE PR titled with the task title. Takes the file id, or
                         the prompt text pasted straight in from a fresh session.

/ps-review [pr]          the review, ONCE. Two fresh-context subagents in parallel:
                         `run` executes (the prompt's Outcome and Verify, correctness,
                         security, the seams between steps), `read` compares against the
                         norms and the exemplar (absences, duplication, scope creep,
                         over-engineering) and runs nothing. Both read the task prompt
                         and whatever AGENTS.md mandates — and nothing else about what
                         the change was meant to do. Fresh eyes by construction. The
                         verdict posts on the PR, in the prompt's language, short.
                         Merge is yours (or `sh .agents/ps-check.sh publish <pr>`
                         by hand).
```

Off the chain, and the only command that writes nothing:

```
/ps-teach "question"     explains any part of the project — the product, a decision, a
                         file, a word you did not know — pitched at someone new to it.
                         Reads PRODUCT.md and ARCHITECTURE.md, then the code that
                         actually implements them, and answers with the one-sentence
                         version first, every claim anchored to a real path:line, one
                         analogy with the line where it stops being true, and something
                         you can run to see it happen. Says so when the docs and the
                         code disagree. Use it before /ps-task when the area is new.
```

### The branch shape

```
main                                    ← where you started; the base branch
 └── task/export-csv-column-picker      ← one branch, one worktree, warmed once
      ├── feat(csv): add column parser  ← one conventional commit per step
      ├── feat(ui): add download button
      └── test(csv): cover empty input
 └── PR: task/… → main                  ← reviewed once, then you squash-merge
```

**Why the prompt is a file.** `/ps-task` pays for the questions, the exemplars and the
verified commands exactly once. `/ps-run` reads the result and builds. Re-deriving that
context at execution time, and again at review time, was the single largest avoidable
cost in the loop. The file is committed, so the reviewer can judge the diff against what
was actually asked for.

**Why execution runs in the main chat.** A cold subagent per step pays to rebuild the
context this chat is already holding. Measured across 25 real sessions, subagents
generated 36% of a session's output, up to 79% on a parallel run. The only cold context
left is `/ps-review`, where not knowing what the author intended is the entire point.

**Why one review round.** Two rounds meant the second one re-read a fix nobody disputed.
Blockers and majors are fixed under a bounded contract — only the files the findings
name — and the checks that found them are re-run inline. A further round is your call.

## What gets installed

```
.agents/
  commands/                            ps-sync.md  ps-task.md  ps-run.md
                                       ps-review.md  ps-teach.md
  agents/ps-review.md                  the only subagent, pinning the model and effort
  ps-review.md                         the review prompt, read by that subagent itself
  ps-report.md                         how /ps-task, /ps-run and /ps-review end
  ps-check.sh                          warm, optional publish, sweep
  settings.json                        session permissions (merged on install/update)
  pocket-squad.manifest.json           hashes for non-destructive updates
.squad/
  templates/
    prompt.md  pr.md                   blank shapes /ps-task and /ps-run fill in
```

Why a shell script in a workflow made of markdown: a command is an instruction to a
model, and a model is reliable at deriving, judging and writing — not at running the
same checklist for the fiftieth time. Anything mechanical and repeated is code here,
not a paragraph asking nicely.

`.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/tasks/` aren't shipped — they
are created the first time you run `/ps-sync` and `/ps-task`, same as your project's own
`AGENTS.md`.

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next to
them as `*.new` for manual merge. A file that no longer ships is deleted only if you
never touched it — otherwise it is reported as `! obsolete` and left where it is.
`install` never overwrites anything that exists.

## Where the time goes

This section exists because a single task was taking close to two hours, of which only
~20 minutes was writing code. Everything below was measured, not guessed.

### What the wall-clock actually is

Measured across 25 real sessions, main chat plus every subagent, deduplicated by message
id:

| | |
|---|---|
| output tokens per session | **187,375** — 119k main chat, 68k subagents |
| model messages per session | 151 main, 249 across ~4.5 subagents |
| of that output, visible in the transcript | **31%** — prose 5%, file and command content 26% |
| the other 69% | reasoning that is billed and generated but never shown |
| at ~50 tokens/second | **~62 min of pure generation per session** |

Two fixes follow from that. **First, stop generating the same context twice**: execution
runs in the main chat, and the interview happens once in `/ps-task` instead of again in
`/ps-run`. **Second, stop paying decomposition-grade reasoning to tick a checkbox** —
effort is declared per step instead of inherited from the session:

| where | what | effort |
|---|---|---|
| `commands/ps-task.md` | the interview, the investigation, the prompt | `high` |
| `agents/ps-review.md` | both review lenses — the quality gate | `high` |
| the other four commands | judgment inside boundaries something else drew | `medium` |

### Why a long run stalls, and what actually fixes it

- **`allowed-tools` in a command's frontmatter** grants permission for the turn that
  invoked the command, and the grant clears on your next message.
- **`permissions.allow` in `.agents/settings.json`** lasts the whole session. That file
  is the one `install` and `update` **merge** instead of leaving alone.

Read the rules before you keep them. The `deny` list next to them (force push, hard
reset, `gh release`, `npm publish`) is what makes it defensible. `/ps-run` treats a
refusal as a **park**.

## Migrating from `.claude/` or harness flags

Run `npx pocket-squad` (install) to land files under `.agents/`. Old `.claude/` copies
are yours to delete. Commands are `/ps-*` (flat `commands/ps-<name>.md`). `/ps-publish`
is gone — merge by hand or with `ps-check.sh publish`. Pointer file is `AGENTS.md` only.

## Migrating from v3.0

Run `npx pocket-squad update`, then `/ps-sync`. Stories became `/ps-task`; `/ps:init`
became `/ps-sync`; learnings/debt/`/ps:prune` are gone. Durable rules belong in
`.squad/ARCHITECTURE.md`.
