# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs eight slash commands
that take an idea from refinement to a merged PR — no agents, no cold starts.

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
                         (what/who/why) and .squad/ARCHITECTURE.md (how it's built,
                         conventions). Shows the plan and waits for your confirmation
                         before writing anything. No-op when all three are complete.

/ps:story ["your idea"]  interview only — no plan mode, no PR. Every ambiguity becomes
                         a question with suggested defaults, until the story is round.
                         Investigates the repo read-only, then saves a story + 1..N
                         tasks under .squad/stories/<date>-<slug>/. A task file is a
                         contract — outcome, scope, and a ## Context section carrying
                         the exemplar's actual lines, the symbol's signature and the
                         verified commands, so nobody surveys the repo again. Never
                         the implementation, never over 120 lines. Every task must
                         ship on its own, and be worth a PR: a slice that only works
                         once the next one lands, or whose diff is a handful of lines,
                         gets merged into its neighbour here.

/ps:load <story-slug>    one ps-check.sh call says which tasks are done (PR merged),
                         in flight, or pending. Reads only the pending ones, then
                         plans the order — dependencies, and what runs in parallel.

/ps:run <task>           executes ONE task: isolates it in a git worktree off the
                         branch you're currently on, WARMS it (shares this checkout's
                         installed dependencies instead of installing them again),
                         implements it from the task's own ## Context with no
                         rediscovery, and opens ONE PR back to that branch.

/ps:review [pr]          unbiased review by TWO fresh-context subagents in parallel:
                         `run` executes (DoD, correctness, security), `read` compares
                         against the exemplar (absences, duplication, scope creep,
                         over-engineering) and runs nothing. Disjoint ground, so the
                         suite runs exactly once. Both read their prompt from
                         .claude/ps-review.md themselves — the dispatch carries a PR
                         number and a lens, no summary of the changes. Fresh eyes by
                         construction. The verdict posts on the PR by default.

/ps:publish [pr]         squash-merges the PR, returns to the base branch,
                         git pull --rebase, then ps-check.sh `sync` (ticks story.md
                         for merged tasks, here, so sibling PRs never conflict on it)
                         and `sweep` (worktrees and branches of merged PRs). Blocks
                         the merge when the task declared a degradation window and the
                         task that closes it has no PR yet. Distills learnings only
                         when that merge takes the story to zero remaining tasks —
                         routing each candidate to .squad/learnings.md, .squad/debt.md,
                         a config change, a task or nowhere, and retiring one rule.

/ps:prune [file]         the deeper pass over .squad/learnings.md and .squad/debt.md
                         that a per-merge retirement doesn't reach: drops what is
                         duplicated, dead or superseded by a check that now exists,
                         and rewrites what grew verbose. Every cut carries its
                         evidence — the empty grep, the check proven to bite — and
                         nothing is written until you approve the list.

/ps:pipe <story-slug>    the four above, unattended: loads the story, runs each wave
                         of tasks in parallel (one subagent per task, its own worktree
                         and PR), reviews every PR — fixing blockers and majors, then
                         one verification round — and publishes them one at a time.
                         Reports one line per transition so you can follow along,
                         parks whatever genuinely needs you, and keeps going.
```

Why no agents? Implementation runs in the main chat — `/ps:load` warms it with a
story's context, `/ps:run` does the work, one task at a time. The only subagents left
are the reviewers, where a cold start is exactly the point.

## What gets installed

```
.claude/
  commands/ps/                 story.md  load.md  run.md  review.md  publish.md
                               init.md  pipe.md  prune.md
  ps-check.sh                  # the mechanical half: task state from PR state,
                               # story.md ticking, worktree warming, open degradation
                               # windows, learnings size, debt to sweep, stale refs.
                               # Run by /ps:load, /ps:run, /ps:publish and /ps:prune —
                               # never read into context, and at most ONE network call
  ps-review.md ps-verify.md    # the review prompts, read by the review subagents
                               # themselves — so the main chat never retypes them
  settings.json                # session-wide pre-approval for the git/gh/test calls
                               # the workflow is made of, plus a deny list for the
                               # destructive ones. Never overwrites yours — see
                               # "Where the time goes" before adopting it
  pocket-squad.manifest.json   # hashes for non-destructive updates
.squad/
  learnings.md                 # durable one-line rules for code not yet written,
                               # capped at 6 KB — written by /ps:publish, read by
                               # /ps:story, /ps:run, /ps:review
  debt.md                      # knowingly-wrong code nobody is fixing now: a declined
                               # finding or a deliberate shortcut, each with file:line
                               # and what would earn it a fix. No cap — swept instead
  templates/
    story.md  task.md  pr.md   # blank shapes /ps:story and /ps:run fill in
```

Why a shell script in a workflow made of markdown: a command is an instruction to a
model, and a model is reliable at deriving, judging and writing — not at running the
same checklist for the fiftieth time. Anything mechanical and repeated (did the sweep
actually leave the remote clean? is there a task shipping a regression on the promise
that another one follows?) is code here, not a paragraph asking nicely.

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

v1.0 exists because a single task was taking close to two hours, and only ~20 minutes
of that was writing code. What the package could fix, it fixed: dependencies are
shared with the worktree instead of reinstalled, the test suite runs twice instead of
four times, `ps-check.sh` makes one network call instead of one per branch, the review
prompts live in files instead of being retyped into every dispatch, and learnings are
distilled once per story instead of once per PR.

### Why a long run stalls, and what actually fixes it

Two different mechanisms, and only one of them lasts:

- **`allowed-tools` in a command's frontmatter grants permission for the turn that
  invoked the command, and the grant clears on your next message.** Useful for a
  one-shot command, useless for `/ps:pipe`, which runs for an hour. Every `/ps:*`
  command declares one, but it is not what keeps a long run going.
- **`permissions.allow` in `.claude/settings.json` lasts the whole session.** That is
  the file doing the work, and this package ships one. In **auto mode** it matters
  twice over: narrow allow rules resolve *before* the safety classifier runs, which is
  what lets `gh pr merge` through. The classifier blocks irreversible actions by
  default, and `/ps:pipe <slug>` is a general request — it is not stated intent to
  merge anything. A broad rule like `Bash(*)` would be suspended in auto mode instead,
  so every rule shipped here is prefixed and specific.

`install` never overwrites an existing `.claude/settings.json`; yours is kept and the
package's lands as `.claude/settings.json.new` to merge by hand. Read the rules before
you take them — they let Claude merge PRs and push branches without asking, which is
the entire point and also a real grant. The `deny` list next to them (force push, hard
reset, `gh release`, `npm publish`) is what makes it defensible.

Two things it still cannot pre-approve: writes to protected paths (`.git` among them),
and anything the classifier hard-blocks. `/ps:pipe` treats a refusal as a **park** — it
reports the exact refused call, leaves that PR open and green, and keeps going, then
publishes the approved PRs in one batch at the end of the run rather than one at a
time in the middle.

### What the wall-clock actually is

Measured across 25 real pocket-squad sessions, deduplicated by message id:

| | |
|---|---|
| output tokens per session | **119,144** |
| model messages per session | 151 (791 tokens each) |
| of that output, visible in the transcript | **31%** — prose 5%, file and command content 26% |
| the other 69% | reasoning that is billed and generated but never shown |
| at ~50 tokens/second | **~40 min of pure generation per session**, 196 min for the worst |

That is the whole answer, and it explains the thing that looks contradictory: the
*visible* output is small — 5% of it is prose — so the run looks cheap while taking
hours. Generation is the slow part of a request, and two thirds of what gets generated
is thinking you never see.

Turn latency is not the problem (2.2 s median) and neither is context (66k–254k, well
under the window). Command length is not it either: every `/ps:*` file put together is
about 2% of what a session generates. Trimming the prompts buys almost nothing.

**So each command declares its own `effort`**, instead of inheriting a session-wide
level that spends decomposition-grade reasoning on ticking a checkbox:

| command | effort | why |
|---|---|---|
| `/ps:story` | `high` | the one step where thinking pays — everything downstream is cheap because this was thorough |
| `/ps:run` `/ps:review` `/ps:publish` `/ps:init` `/ps:prune` `/ps:pipe` | `medium` | real judgment, inside boundaries something else already drew |
| `/ps:load` | `low` | read a status line, sort tasks into waves |

Your session's `effortLevel` in `~/.claude/settings.json` still sets the floor for
anything outside a command, and the model still matters — Opus is the slowest per
token, and a story is a few hundred messages. Both are yours to set; the per-command
levels above are the package's.

## Migrating from v0.5

Run `npx pocket-squad update`. It upgrades the seven commands you never edited, adds
`.claude/ps-review.md`, `.claude/ps-verify.md` and `.claude/settings.json`, and rewrites
`ps-check.sh` with four new modes (`status`, `sync`, `warm`, plus the single-call PR
cache). Customized command files land next to yours as `*.new` — worth merging, since
v1.0's speed lives in them.

**Read `.claude/settings.json` before you keep it.** It is the file that lets a long
`/ps:pipe` run finish, and it does that by pre-approving merges and pushes for the whole
session. If you already had a settings file, yours is untouched and the package's lands
as `settings.json.new`. See "Where the time goes" above.

One behaviour changes for stories already in flight: `/ps:run` no longer ticks a task's
box inside its own PR, and `/ps:publish` ticks it on the base branch after merging.
A PR opened under v0.5 that already carries its tick still merges fine — `sync` is
idempotent and skips a box that is already `[x]`.

Existing task files have no `## Context` section. They keep working — `/ps:run` looks
it up itself, once, and says so in the PR body. New stories get it automatically.

## Migrating from v0.4

Run `npx pocket-squad update` — it adds `/ps:pipe`. Nothing else changes; the six
other commands work exactly as before, and `/ps:pipe` is opt-in by definition, since
it only does what you'd have typed yourself.

## Migrating from v0.3

Run `npx pocket-squad update`. The six commands are managed files: the ones you never
edited upgrade in place, the ones you customized are left alone with the new version
next to them as `*.new`. `.claude/ps-check.sh` is new and just gets added.

The three `.squad/templates/` files and `learnings.md` are knowledge files — untouched
ones move to the new shape; **any you edited stay exactly as they are, silently**. If
you want the contract-shaped task template, delete yours and re-run `update`.

Stories already on disk keep working: `/ps:load` and `/ps:run` read whatever sections
exist, and a task with no `window:` line counts as "none declared" — it never blocks.
Nothing is rewritten. An oversized `learnings.md` doesn't migrate on its own either:
the first `/ps:publish` after the update sees it over the 6 KB cap and triages the
whole file once against the new entry rules (process rules and anything a linter
already catches come out; the rest compresses to one line each), inside the usual
`chore(squad): learnings from PR #<n>` commit.

## Migrating from v0.2

Run `npx pocket-squad update` — it adds `/ps:load`, `/ps:run` and
`.squad/templates/`. Your existing CLAUDE.md keeps working as-is; re-run `/ps:init`
whenever you want it to propose splitting the Architecture/Conventions parts out into
`.squad/ARCHITECTURE.md` and adding a `.squad/PRODUCT.md` — it only proposes, nothing
is rewritten without confirmation. Stories now save to disk under `.squad/stories/`
again (reversing v0.2's "no story files"); `/ps:story` no longer implements or opens a
PR itself — that's now `/ps:load` + `/ps:run`.

## Migrating from v0.1

Run `npx pocket-squad update`. The old squad (agents, techlead, skills, `/ps:status`)
is removed automatically wherever you never touched it; anything you customized is
flagged `obsolete` for manual deletion. Move what you still want from
`.squad/project-context.md` into your `CLAUDE.md` (or just run `/ps:init`), then
delete it. Skills (impeccable, ponytail) are no longer fetched — install them
yourself if you want them.
