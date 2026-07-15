# Pocket Squad

A lean Claude Code workflow, in your pocket. One `npx` installs four slash commands
that take an idea from refinement to a merged PR — no agents, no cold starts.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # upgrade managed files (never clobbers your edits)
npx pocket-squad status     # managed vs customized files
```

## The workflow

```
/ps:init                 once per project — investigates the repo and writes CLAUDE.md
                         (stack, exact commands, architecture, conventions). Claude Code
                         loads it automatically in every session. No-op when complete.

/ps:story "your idea"    the entrypoint. Enters plan mode and interviews you — every
                         ambiguity becomes a question with suggested defaults — until
                         the story is round. Approve the plan (with auto-accept for a
                         hands-off run) and the SAME chat implements it in an isolated
                         git worktree and opens a PR. The PR body is the story's
                         record: what/why, decisions, DoD and how it was verified.

/ps:review [pr]          unbiased review. Dispatches ONE fresh-context subagent that
                         fetches the PR itself (view + diff), re-runs the DoD checks,
                         and returns APPROVED or numbered findings with file:line and
                         severity. The dispatch prompt carries no summary of the
                         changes — fresh eyes by construction.

/ps:publish [pr]         squash-merges the PR, returns to the base branch,
                         git pull --rebase, removes that story's worktree (only that
                         one), and distills one-line learnings into .squad/learnings.md.
```

Why no agents? Implementation runs in the main chat, already warm with all the
refinement context — zero cold starts. The only subagent left is the reviewer, where a
cold start is exactly the point.

## What gets installed

```
.claude/
  commands/ps/                 story.md  review.md  publish.md  init.md
  pocket-squad.manifest.json   # hashes for non-destructive updates
.squad/
  learnings.md                 # one-line durable rules, cap 30 — written by
                               # /ps:publish, read by /ps:story
```

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `.squad/` knowledge files are always kept as-is
(learnings diverge by design). `install` never overwrites anything that exists.

## Migrating from v0.1

Run `npx pocket-squad update`. The old squad (agents, techlead, skills, `/ps:run`,
`/ps:status`) is removed automatically wherever you never touched it; anything you
customized is flagged `obsolete` for manual deletion. Move what you still want from
`.squad/project-context.md` into your `CLAUDE.md` (or just run `/ps:init`), then
delete it. v0.2 no longer fetches external skills (impeccable, ponytail) — install
them yourself if you want them.
