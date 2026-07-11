# Pocket Squad

A full dev squad for Claude Code, in your pocket. One `npx` installs agents, commands
and a story/task workflow into any project.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # upgrade managed files (never clobbers your edits)
npx pocket-squad status     # managed vs customized files
```

## The squad

| Role | Tiers → model |
|---|---|
| techlead (owner's single interface) | opus |
| backend / frontend / devops | junior → haiku · pleno → sonnet · senior → opus |
| qa / reviewer (unbiased gates) | pleno → sonnet · senior → opus |
| designer | sonnet |

The techlead routes each task by a written rubric (junior = mechanical & fully
specified; pleno = feature within existing patterns; senior = new module / contract
change / hard debugging) and records the justification for audit. Juniors are
forbidden to improvise — they block and escalate. Two failed reviews at the same tier
auto-escalate the task to the tier above.

## The workflow

All commands are namespaced under `ps:` to avoid clashing with other tooling.

```
/ps:story "create a social login screen"
   └─ techlead refines with you → one or MORE .squad/stories/<date>-<slug>/
      (big requests split into multiple Stories, ordered by story-level depends_on)
        story.md            title, description, complexity, DoD, cost, depends_on
        tasks/NN-*.md       specialty, tier + justification, DoD, depends_on, parallel, status
        board.md            todo / doing / done

(you edit anything you want — your edits are law; no approval ceremony)

/ps:run [slug]  validates the plan (the old /approve, folded in), then executes.
                No slug = ALL runnable stories. Each story gets its OWN git worktree
                on branch squad/<slug> (cut from the current branch), so independent
                stories run in parallel; depends_on waits for the merge. Per story:
                waves by depends_on/parallel, unbiased QA+review per task, escalation
                on double failure → PR with a 3-section ADR (title / description /
                final consideration) → squash-merge, worktree removed, target branch
                git pull --rebase. Critical stories (destructive migration, security,
                contract break) leave the PR open for manual merge.
                Resumable — if the run dies, /ps:run picks up where it stopped.
/ps:status      compact report of every story
```

Everything lives in markdown for audit, editing and agent context:

```
.squad/
  project-context.md   # 1-page briefing all agents read first (seeded from CLAUDE.md)
  learnings.md         # strict-format rules: error → cause → rule
  stories/…
.claude/
  agents/  commands/ps/
  skills/
    ps-backend-api/      # Pocket Squad backend skills: contracts,
    ps-backend-data/     #   queries/migrations,
    ps-backend-security/ #   trust boundaries
  pocket-squad.manifest.json   # hashes for non-destructive updates
```

Two third-party skills the squad relies on — [impeccable](https://impeccable.style)
(designer/frontend craft) and [ponytail](https://github.com/DietrichGebert/ponytail)'s
`ponytail-review` (reviewers' over-engineering pass) — are NOT bundled. The install
checks whether they already exist on your machine (project or global, plugin included)
and only when absent fetches a pinned version into the project's `.claude/skills/`.
Needs network; skip with `POCKET_SQUAD_SKIP_SKILLS=1` and install them yourself later
(`npx impeccable install` / the ponytail plugin).

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `install` never overwrites anything that exists.

## Extending

Add your own agents/skills to `.claude/` freely — anything not in the manifest is
yours and will never be touched. The squad's agents already know their tools:
reviewers invoke **ponytail-review**, designer and frontend tiers invoke
**impeccable** (both ensured at install, see above), and backend tiers invoke the
bundled **ps-backend-*** skills (plus anything else you drop in `.claude/skills/`).
Pin versions on anything you add — skills run with access to your code, treat them
as supply chain.
