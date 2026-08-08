# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs five slash commands that
take a request from "what I actually want" to a merged, reviewed pull request.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # upgrade managed files (never clobbers your edits)
npx pocket-squad status     # managed vs customized files
```

## The workflow

```
/ps:sync                 once per project, and again whenever the rules drift. Sweeps
                         the repo for product and architecture rules already written
                         somewhere — README, CONTRIBUTING, docs, a bloated CLAUDE.md —
                         and MOVES them into .squad/PRODUCT.md (what/who/why) and
                         .squad/ARCHITECTURE.md (how it is built, conventions, exemplar
                         paths). Then interviews only the gaps the repo cannot answer.
                         Writes into CLAUDE.md/AGENTS.md a mandatory first rule: read
                         those two files before answering anything, /ps:* or not.
                         Proposes everything and waits for your confirmation.

/ps:task ["request"]     turns a rough request into ONE refined prompt. Asks only the
                         non-obvious and ambiguous questions, each with a suggested
                         default; investigates the repo read-only; then writes
                         .squad/tasks/<yymmdd-hhmm>.prompt.md — outcome, context
                         (exemplar lines, signatures, verified commands), 1..N steps,
                         scope, verify, forbidden. In the language of the conversation,
                         long enough to be unambiguous and short enough to audit.

/ps:run <id | prompt>    executes that prompt verbatim — no second interview, that is
                         the whole point of the split. Cuts a worktree on task/<slug>,
                         warms it with this checkout's dependencies, then one
                         conventional commit per step, runs the prompt's Verify, and
                         opens ONE PR titled with the task title. Takes the file id, or
                         the prompt text pasted straight in from a fresh session.

/ps:review [pr]          the review, ONCE. Two fresh-context subagents in parallel:
                         `run` executes (the prompt's Outcome and Verify, correctness,
                         security, the seams between steps), `read` compares against the
                         norms and the exemplar (absences, duplication, scope creep,
                         over-engineering) and runs nothing. Both read the task prompt
                         and whatever CLAUDE.md mandates — and nothing else about what
                         the change was meant to do. Fresh eyes by construction. The
                         verdict posts on the PR, in the prompt's language, short.

/ps:publish [pr]         one deterministic script: squash-merge, delete the remote
                         branch, remove the worktree, delete the local branch, go back
                         to the base branch, git pull --rebase. The only judgement it
                         asks of you is whether the review approved — and a merge
                         conflict, which you resolve on the branch before running the
                         same script again.
```

### The branch shape

```
main                                    ← where you started; the base branch
 └── task/export-csv-column-picker      ← one branch, one worktree, warmed once
      ├── feat(csv): add column parser  ← one conventional commit per step
      ├── feat(ui): add download button
      └── test(csv): cover empty input
 └── PR: task/… → main                  ← reviewed once, then squashed into main
```

**Why the prompt is a file.** `/ps:task` pays for the questions, the exemplars and the
verified commands exactly once. `/ps:run` reads the result and builds. Re-deriving that
context at execution time, and again at review time, was the single largest avoidable
cost in the loop. The file is committed, so the reviewer can judge the diff against what
was actually asked for.

**Why execution runs in the main chat.** A cold subagent per step pays to rebuild the
context this chat is already holding. Measured across 25 real sessions, subagents
generated 36% of a session's output, up to 79% on a parallel run. The only cold context
left is `/ps:review`, where not knowing what the author intended is the entire point.

**Why one review round.** Two rounds meant the second one re-read a fix nobody disputed.
Blockers and majors are fixed under a bounded contract — only the files the findings
name — and the checks that found them are re-run inline. A further round is your call.

## What gets installed

```
.claude/
  commands/ps/                 sync.md  task.md  run.md  review.md  publish.md
  agents/ps-review.md          the only subagent, pinning the model and effort of the
                               one step worth paying for
  ps-review.md                 the review prompt, read by that subagent itself — so the
                               main chat never retypes it into a dispatch
  ps-check.sh                  the mechanical half: worktree warming, the deterministic
                               publish, sweeping stale refs. Never read into context,
                               and at most ONE network call per invocation
  settings.json                session-wide pre-approval for the git/gh/test calls the
                               workflow is made of, plus a deny list for the destructive
                               ones. The one merged file: if you already have one, our
                               rules are added and yours are kept — see "Where the time
                               goes" before adopting it
  pocket-squad.manifest.json   hashes for non-destructive updates
.squad/
  templates/
    prompt.md  pr.md           blank shapes /ps:task and /ps:run fill in
```

Why a shell script in a workflow made of markdown: a command is an instruction to a
model, and a model is reliable at deriving, judging and writing — not at running the
same checklist for the fiftieth time. Anything mechanical and repeated is code here,
not a paragraph asking nicely.

`.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/tasks/` aren't shipped — they
are created the first time you run `/ps:sync` and `/ps:task`, same as your project's own
`CLAUDE.md`.

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next to
them as `*.new` for manual merge. A file that no longer ships is deleted only if you
never touched it — otherwise it is reported as `! obsolete` and left where it is.
`install` never overwrites anything that exists.

## Where the time goes

This section exists because a single task was taking close to two hours, of which only
~20 minutes was writing code. Everything below was measured, not guessed, and two of the
early guesses turned out to be wrong.

### What the wall-clock actually is

Measured across 25 real sessions, main chat plus every subagent, deduplicated by message
id — without the dedup the same message's usage repeats once per streaming record and
the totals inflate about 3x:

| | |
|---|---|
| output tokens per session | **187,375** — 119k main chat, 68k subagents |
| model messages per session | 151 main, 249 across ~4.5 subagents |
| of that output, visible in the transcript | **31%** — prose 5%, file and command content 26% |
| the other 69% | reasoning that is billed and generated but never shown |
| at ~50 tokens/second | **~62 min of pure generation per session** |

That is the whole answer, and it explains the part that looks contradictory: the
*visible* output is tiny — 5% of it is prose — so a run looks cheap while taking hours.
Generation is the slow part of a request, and two thirds of what gets generated is
thinking nobody sees.

Three things measured and **ruled out**: turn latency (2.2 s median), context size
(66k–254k, nowhere near the window), and command length — every `/ps:*` file put
together is about 2% of what a session generates, so trimming prompts buys nothing.

Two fixes follow from that. **First, stop generating the same context twice**: execution
runs in the main chat, and the interview happens once in `/ps:task` instead of again in
`/ps:run`. **Second, stop paying decomposition-grade reasoning to tick a checkbox** —
effort is declared per step instead of inherited from the session:

| where | what | effort |
|---|---|---|
| `commands/ps/task.md` | the interview, the investigation, the prompt | `high` |
| `agents/ps-review.md` | both review lenses — the quality gate | `high` |
| the other four commands | judgment inside boundaries something else drew | `medium` |

A command's frontmatter never reaches a subagent it dispatches, so the review agent
carries its own. That is why `/ps:review` dispatches `ps-review` by name instead of
`general-purpose`: a named agent also boots with its own small system prompt rather than
the full one, and `ps-review` ships without write tools, since a reviewer that fixes what
it finds stops being able to report it.

Everything else was made cheap so that review could stay expensive. Your session's
`effortLevel` still sets the floor outside these steps, and the model still matters —
Opus is the slowest per token and a task is a few hundred messages.

### Why a long run stalls, and what actually fixes it

Two different mechanisms, and only one of them lasts:

- **`allowed-tools` in a command's frontmatter grants permission for the turn that
  invoked the command, and the grant clears on your next message.** Useful for a
  one-shot command, useless for a `/ps:run` that works through five steps. Every `/ps:*`
  command declares one, but it is not what keeps a long run going.
- **`permissions.allow` in `.claude/settings.json` lasts the whole session.** That is
  the file doing the work, and this package ships one. In **auto mode** it matters twice
  over: narrow allow rules resolve *before* the safety classifier runs, which is what
  lets `gh pr merge` through. The classifier blocks irreversible actions by default, and
  `/ps:run <id>` is a general request — not stated intent to merge anything. A broad rule
  like `Bash(*)` would be suspended in auto mode instead, so every rule shipped here is
  prefixed and specific.

`.claude/settings.json` is the one file `install` and `update` **merge** instead of
leaving alone: every rule above is added to whatever you already have, every rule and
setting of yours is kept, nothing is ever removed, and running it twice changes nothing
the second time. Skipping the file — the rule for every other file here — meant the
workflow arrived with none of its permissions in exactly the projects that already used
Claude Code. If your settings file is not valid JSON it is reported and left untouched.

Read the rules before you keep them — they let Claude merge PRs and push branches without
asking, which is the entire point and also a real grant. The `deny` list next to them
(force push, hard reset, `gh release`, `npm publish`) is what makes it defensible; delete
any `allow` line you would rather approve by hand, and it stays deleted until you run
`install` or `update` again.

Two things it still cannot pre-approve: writes to protected paths (`.git` and `.claude`
among them), and anything the classifier hard-blocks. `/ps:run` treats a refusal as a
**park** — it reports the exact refused call, stashes the half-finished work and stops.

## Migrating from v3.0

Run `npx pocket-squad update`, then `/ps:sync`. This is a breaking change to the
workflow, not just to the files.

**Stories are gone; the unit is one task.** `/ps:story` became `/ps:task` and produces a
single prompt file instead of a story directory with numbered tasks. A request that used
to be one story is now several `/ps:task` runs — the split you used to make between tasks
you now make between prompts. `/ps:run` takes a prompt id (or the pasted prompt text),
not a story slug.

**`/ps:init` became `/ps:sync`**, and its job flipped. It no longer mainly interviews you
— it moves product and architecture rules that already exist in the repo into
`.squad/PRODUCT.md` and `.squad/ARCHITECTURE.md`, and only then asks about what is left.
It also writes the mandatory-first-read rule into `CLAUDE.md`/`AGENTS.md`. Run it once
after updating.

**Branch names changed** from `ps-story/<slug>` to `task/<slug>`, and commits are
conventional (`feat(scope): …`) instead of `<slug> NN/N — <title>`. `ps-check.sh sweep`
still matches the old namespaces, so branches left over from v3 get swept.

**`.squad/learnings.md`, `.squad/debt.md` and `/ps:prune` are gone.** A learnings file
read alongside `CLAUDE.md` and `ARCHITECTURE.md` was a third voice saying almost the same
thing, and a debt ledger turned out to be a place to defer a fix to during a task instead
of fixing it. Durable rules belong in `.squad/ARCHITECTURE.md`; anything else belongs in
the prompt. `update` leaves your existing files alone (they are yours — it reports them
as `! obsolete`); move anything worth keeping into `ARCHITECTURE.md` and delete them.

**The second review round is gone**, with `ps-verify`. Blockers and majors are fixed
under the same bounded contract and their checks re-run inline.

**`ps-check.sh` modes changed**: `report` and `status` are gone (there are no boxes to
read and no learnings to size), `publish <pr>` is new and does the whole terminal step,
`warm` and `sweep` are unchanged.

**Finish stories already in flight under v3.0 before updating**, or finish them by hand.
Nothing here deletes a story directory or an open PR, but no v4 command knows how to
continue one.

Older versions: the migration notes for v2.0 and earlier were removed in v4.0. The git
log of this file is their archive, and the path forward from any of them is the same —
`npx pocket-squad update`, then read the two sections above.
