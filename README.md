# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs six slash commands
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
                         Investigates the repo read-only and bakes what it finds into
                         each task, then saves a story + 1..N tasks under
                         .squad/stories/<date>-<slug>/.

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
                         changes — fresh eyes by construction.

/ps:publish [pr]         squash-merges the PR, returns to the base branch,
                         git pull --rebase, removes that PR's worktree, then sweeps
                         every other pocket-squad worktree whose PR is already
                         merged/closed, and distills one-line learnings into
                         .squad/learnings.md.
```

Why no agents? Implementation runs in the main chat — `/ps:load` warms it with a
story's context, `/ps:run` does the work, one task at a time. The only subagent left
is the reviewer, where a cold start is exactly the point.

## What gets installed

```
.claude/
  commands/ps/                 story.md  load.md  run.md  review.md  publish.md  init.md
  pocket-squad.manifest.json   # hashes for non-destructive updates
.squad/
  learnings.md                 # one-line durable rules, cap 30 — written by
                               # /ps:publish, read by /ps:story
  templates/
    story.md  task.md  pr.md   # blank shapes /ps:story and /ps:run fill in
```

`.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/stories/` aren't shipped —
they're created the first time you run `/ps:init` and `/ps:story`, same as your
project's own `CLAUDE.md`.

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `.squad/` knowledge files are always kept as-is
(learnings, templates and stories diverge by design). `install` never overwrites
anything that exists.

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
