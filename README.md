# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs seven slash commands
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
                         contract — outcome, scope, exemplar to imitate, verification
                         commands — never the implementation, and never over 60 lines.
                         Every task must ship on its own: a slice that only works once
                         the next one lands gets merged, reordered, or flagged.

/ps:load <story-slug>    loads a saved story's full context into the chat and plans
                         the order to run its tasks, respecting each task's
                         dependencies and what can run in parallel.

/ps:run <task>           executes ONE task: isolates it in a git worktree off the
                         branch you're currently on, implements it using only that
                         task's own context (minimal rediscovery by design), and opens
                         ONE PR per task back to that branch.

/ps:review [pr]          unbiased review. Dispatches ONE fresh-context subagent that
                         fetches the PR itself (view + diff), re-runs the DoD checks,
                         and returns APPROVED or numbered findings with file:line and
                         severity. The dispatch prompt carries no summary of the
                         changes — fresh eyes by construction. The verdict is posted
                         on the PR by default: it's the only searchable history the
                         process leaves, and what /ps:publish learns from.

/ps:publish [pr]         squash-merges the PR, returns to the base branch,
                         git pull --rebase, then runs ps-check.sh: it sweeps the
                         worktrees, local and remote branches of merged PRs and
                         reports what it couldn't remove. Blocks the merge when the
                         task declared a degradation window and the task that closes
                         it has no PR yet. Then distills learnings — routing each
                         candidate, and retiring one old rule per merge.

/ps:pipe <story-slug>    the four above, unattended: loads the story, runs each wave
                         of tasks in parallel (one subagent per task, its own worktree
                         and PR), reviews every PR until it's APPROVED — fixing
                         blockers and majors, up to three rounds — then publishes them
                         one at a time. Reports one line per transition so you can
                         follow along, parks whatever needs you, and keeps going.
```

Why no agents? Implementation runs in the main chat — `/ps:load` warms it with a
story's context, `/ps:run` does the work, one task at a time. The only subagent left
is the reviewer, where a cold start is exactly the point.

## What gets installed

```
.claude/
  commands/ps/                 story.md  load.md  run.md  review.md  publish.md
                               init.md  pipe.md
  ps-check.sh                  # the mechanical half: open degradation windows,
                               # learnings size, stale worktrees/branches. Run by
                               # /ps:load and /ps:publish — never read into context
  pocket-squad.manifest.json   # hashes for non-destructive updates
.squad/
  learnings.md                 # durable one-line rules, capped at 6 KB — written by
                               # /ps:publish, read by /ps:story, /ps:run, /ps:review
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
