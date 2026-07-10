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
                No slug = ALL runnable stories, one full cycle each:
                branch squad/<slug> from the current branch → waves by
                depends_on/parallel, unbiased QA+review per task, escalation on
                double failure → PR with a 3-section ADR (title / description /
                final consideration) → squash-merge + git pull --rebase.
                Critical stories (destructive migration, security, contract break)
                leave the PR open for manual merge.
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
    ponytail-review/     # vendored (MIT) — reviewers' over-engineering pass
    ps-backend-api/      # Pocket Squad backend skills: contracts,
    ps-backend-data/     #   queries/migrations,
    ps-backend-security/ #   trust boundaries
    impeccable/          # fetched at install (pinned) — designer/frontend craft
  pocket-squad.manifest.json   # hashes for non-destructive updates
```

The install also fetches the [impeccable](https://impeccable.style) frontend skills
(pinned version, project scope, Claude only) — needs network; skip with
`POCKET_SQUAD_SKIP_IMPECCABLE=1` and run `npx impeccable install` yourself later.

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `install` never overwrites anything that exists.

## Extending

Add your own agents/skills to `.claude/` freely — anything not in the manifest is
yours and will never be touched. The squad ships its skills batteries-included:
reviewers invoke the bundled **ponytail-review** over-engineering pass, designer and
frontend tiers invoke **impeccable**, and backend tiers invoke the **ps-backend-***
skills (plus anything else you drop in `.claude/skills/`). Pin versions on anything
you add — skills run with access to your code, treat them as supply chain.
