# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs six slash commands that
take an idea from refinement to a merged, reviewed pull request.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # upgrade managed files (never clobbers your edits)
npx pocket-squad status     # managed vs customized files
```

## The workflow

```
/ps:init                 once per project — investigates the repo and proposes a
                         3-way split: CLAUDE.md (stack, exact commands, do-not-touch —
                         what Claude Code needs every session), .squad/PRODUCT.md
                         (what/who/why) and .squad/ARCHITECTURE.md (how it is built,
                         conventions). Shows the plan and waits for your confirmation
                         before writing anything. No-op when all three are complete.

/ps:story ["your idea"]  interview only — no plan mode, no PR. Every ambiguity becomes
                         a question with suggested defaults, until the story is round.
                         Investigates the repo read-only, then saves a story + 1..N
                         tasks under .squad/stories/<date>-<slug>/, numbered in the
                         order they will run. A task file is a contract — outcome,
                         scope, and a ## Context section carrying the exemplar's actual
                         lines, the symbol's signature and the verified commands, so
                         nobody surveys the repo again.

/ps:run <story-slug>     runs the whole story, in this chat, one task at a time. Cuts
                         ONE worktree on a story branch, warms it once, then per task:
                         reads that task file, implements, verifies, and commits onto
                         the story branch — one commit per task, no PR and no review at
                         this level. Ends by opening ONE PR from the story branch back
                         to where you started.

/ps:review [pr]          the review, once, on that story PR. Two fresh-context
                         subagents in parallel: `run` executes (DoD, correctness,
                         security, and the seams between tasks), `read` compares
                         against the exemplar (absences, duplication, scope creep,
                         over-engineering) and runs nothing. Neither is told what the
                         changes were meant to do — fresh eyes by construction. The
                         verdict posts on the PR, written so a junior can act on it.

/ps:publish [pr]         squash-merges the approved story PR, returns to the base
                         branch, git pull --rebase, then ps-check.sh `sweep` (the story
                         worktree and its branch).
                         Then distills learnings — routing each candidate to
                         .squad/learnings.md, .squad/debt.md, a config change, a task
                         or nowhere, and retiring one rule.

/ps:prune [file]         the deeper pass over .squad/learnings.md and .squad/debt.md
                         that a per-story retirement does not reach: drops what is
                         duplicated, dead or superseded by a check that now exists, and
                         rewrites what grew verbose. Every cut carries its evidence —
                         the empty grep, the check proven to bite — and nothing is
                         written until you approve the list.
```

### The branch shape

```
main                                    ← where you started; the target branch
 └── ps-story/export-csv                ← one branch, one worktree, warmed once
      ├── commit: 01 column-parser      ← one commit per task, no PR, no review
      ├── commit: 02 download-button
      └── commit: 03 empty-state
 └── PR: ps-story/export-csv → main     ← reviewed here, then squashed into main
```

One branch, because a task branch squash-merged into the story left exactly one commit
behind anyway. Committing straight to the story branch lands the same history and skips
a push, a PR body and a merge per task — for a PR that nobody, by design, ever read.

**Why review only at the story level.** Reviewing five slices of one change found the
same things five times and cost five rounds. It also could not see the defect that
matters most: task 04 quietly breaking what task 02 built. The story PR is the first
place that seam is visible at all.

**Why everything runs in the main chat.** A cold subagent per task pays to rebuild the
context this chat is already holding. Measured across 25 real sessions, subagents
generated 36% of a story's output, up to 79% on a parallel run. The only cold context
left is `/ps:review`, where not knowing what the author intended is the entire point.

**What that costs, and what it buys.** You lose parallelism. You gain: no sibling PRs
conflicting on `story.md`, one worktree and one dependency install per story instead of
per task, no publish ordering to get right, and no "would this task break main on its
own" question — only whole stories reach the target branch, so an intermediate state
cannot be a regression there. The degradation-window machinery that existed to police
that question is gone entirely.

## What gets installed

```
.claude/
  commands/ps/                 story.md  run.md  review.md  publish.md
                               init.md  prune.md
  agents/                      ps-review.md  ps-verify.md — the only subagents left,
                               each pinning the model and effort of its step
  ps-review.md ps-verify.md    the review prompts, read by those subagents themselves
                               — so the main chat never retypes them into a dispatch
  ps-check.sh                  the mechanical half: task state from PR state, story.md
                               ticking, worktree warming, learnings size, debt to
                               sweep, stale refs. Never read into context, and at most
                               ONE network call per invocation
  settings.json                session-wide pre-approval for the git/gh/test calls the
                               workflow is made of, plus a deny list for the
                               destructive ones. The one merged file: if you already
                               have one, our rules are added and yours are kept —
                               see "Where the time goes" before adopting it
  pocket-squad.manifest.json   hashes for non-destructive updates
.squad/
  learnings.md                 durable one-line rules for code not yet written, capped
                               at 6 KB — written by /ps:publish, read by /ps:story,
                               /ps:run and /ps:review
  debt.md                      knowingly-wrong code nobody is fixing now: a declined
                               finding or a deliberate shortcut, each with file:line
                               and what would earn it a fix. No cap — swept instead
  templates/
    story.md  task.md  pr.md   blank shapes /ps:story and /ps:run fill in
```

Why a shell script in a workflow made of markdown: a command is an instruction to a
model, and a model is reliable at deriving, judging and writing — not at running the
same checklist for the fiftieth time. Anything mechanical and repeated is code here,
not a paragraph asking nicely.

`.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/stories/` aren't shipped —
they're created the first time you run `/ps:init` and `/ps:story`, same as your
project's own `CLAUDE.md`.

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `.squad/` knowledge files are always kept as-is
(learnings, templates and stories diverge by design). `install` never overwrites
anything that exists.
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

Two fixes follow from that. **First, stop generating the same context twice**: v2.0
moved execution into the main chat, because a cold subagent per task rebuilds what the
chat already holds, and review moved to once per story instead of once per task.
**Second, stop paying decomposition-grade reasoning to tick a checkbox** — effort is now
declared per step instead of inherited from the session:

| where | what | effort |
|---|---|---|
| `commands/ps/story.md` | the interview, investigation and decomposition | `high` |
| `agents/ps-review.md` | both review lenses — the quality gate | `high` |
| the other four commands | judgment inside boundaries something else drew | `medium` |
| `agents/ps-verify.md` | re-run named checks, diff against a SHA | `low`, on Sonnet |

A command's frontmatter never reaches a subagent it dispatches, so the two review agents
carry their own. That is why `/ps:review` dispatches `ps-review` and `ps-verify` by name
instead of `general-purpose`: a named agent also boots with its own small system prompt
rather than the full one, and `ps-review` ships without write tools, since a reviewer
that fixes what it finds stops being able to report it.

Everything else was made cheap so that review could stay expensive. Your session's
`effortLevel` still sets the floor outside these steps, and the model still matters —
Opus is the slowest per token and a story is a few hundred messages.

### Why a long run stalls, and what actually fixes it

Two different mechanisms, and only one of them lasts:

- **`allowed-tools` in a command's frontmatter grants permission for the turn that
  invoked the command, and the grant clears on your next message.** Useful for a
  one-shot command, useless for a `/ps:run` that works through five tasks. Every `/ps:*`
  command declares one, but it is not what keeps a long run going.
- **`permissions.allow` in `.claude/settings.json` lasts the whole session.** That is
  the file doing the work, and this package ships one. In **auto mode** it matters twice
  over: narrow allow rules resolve *before* the safety classifier runs, which is what
  lets `gh pr merge` through. The classifier blocks irreversible actions by default, and
  `/ps:run <slug>` is a general request — not stated intent to merge anything. A broad
  rule like `Bash(*)` would be suspended in auto mode instead, so every rule shipped here
  is prefixed and specific.

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
**park** — it reports the exact refused call, leaves that task's branch alone, and moves
to the next task.

## Migrating from v2.0

Run `npx pocket-squad update`.

**Task branches and task PRs are gone.** `/ps:run` now commits each task straight onto
`ps-story/<slug>`, one commit per task. The story branch ends up with the same history
it had before — a task branch squash-merged into it always left exactly one commit — so
nothing about `/ps:review` or `/ps:publish` changes. What you stop paying is a push, a
PR body and a merge for every task.

**`ps-check.sh sync` is gone**, and `status` no longer calls a provider: a task is done
when its box is ticked, and `/ps:run` commits that box in the same commit as the work it
claims. Mid-story the boxes only exist on the story branch, so `status` reads `story.md`
from there. `/ps:publish` no longer runs `sync`; an unticked task after a run is one that
parked, and it is supposed to stay unticked.

**A parked task now stashes** instead of leaving a branch behind:
`git stash push -u -m "parked <story-slug> NN-<task-slug>"`. The stash survives `sweep`,
so check `git stash list` when a story ends with one.

**Finish stories already in flight under v2.0 before updating.** A story with open task
PRs still merges them fine — nothing here deletes anything — but `status` reads boxes
now, so tick `story.md` for tasks whose PR already merged before running `/ps:run` again,
or it will run them a second time.

## Migrating from v1.0

Run `npx pocket-squad update`. This is a breaking change to the workflow, not just to
the files.

**`/ps:load` and `/ps:pipe` are gone**, and so is the `ps-task` subagent. `update`
deletes them wherever you never edited them; anything you customized is flagged
`obsolete` for you to delete. `/ps:run` now takes a **story slug**, not a task, and does
what `load` + `run` + `pipe` used to do between them.

**Branch names changed.** Stories live on `ps-story/<slug>`. v2.0 also put each task on
`ps/<slug>/<task-slug>`; from v3.0 tasks are commits on the story branch and that second
namespace is gone — see the v2.0 notes above.

**The `window:` field is gone**, with the `Independently shippable` section, the
`WINDOWS` block in `ps-check.sh` and the publish gate that read it. Only whole stories
reach the target branch now, so an intermediate state cannot be a regression there.
Existing task files that still carry a `window:` line are simply ignored.

**Finish stories already in flight under v1.0 before updating**, or finish them by hand:
a story whose tasks each have their own open PR to `main` does not fit the new topology,
and nothing here migrates it for you.

Task files written by v1.0 keep working. `Depends on` and `Parallel-safe with` are now
ignored — `/ps:run` executes in filename order, so the `NN` prefix is the only ordering
that matters.

## Migrating from v0.5

Run `npx pocket-squad update`. It upgrades the seven commands you never edited, adds
`.claude/ps-review.md`, `.claude/ps-verify.md` and `.claude/settings.json`, and rewrites
`ps-check.sh` with new modes (`status`, `warm`, plus the single-call PR cache).
Customized command files land next to yours as `*.new` — worth merging, since v1.0's
speed lives in them.

**Read `.claude/settings.json` before you keep it.** It is the file that lets a long
`/ps:run` finish, and it does that by pre-approving merges and pushes for the whole
session. If you already had a settings file, its rules and yours are merged into it —
nothing of yours is removed. See "Where the time goes" above.

Existing task files have no `## Context` section. They keep working — `/ps:run` looks
it up itself, once, and says so in the PR body. New stories get it automatically.

Older versions: the migration notes for v0.4 and earlier were removed in v2.0.
The git log of this file is their archive, and the path forward from any of them
is the same — `npx pocket-squad update`, then read the two sections above.
