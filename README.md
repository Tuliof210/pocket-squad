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

```
/story "create a social login screen"
   └─ techlead refines with you → .squad/stories/<date>-<slug>/
        story.md            title, description, complexity, DoD, cost estimate
        tasks/NN-*.md       specialty, tier + justification, DoD, depends_on, parallel, status
        board.md            todo / doing / done

(you edit anything you want — your edits are law)

/approve      validates the plan, shows cost summary, marks approved
/run          executes: waves by depends_on/parallel, unbiased QA+review per task,
              escalation on double failure, board updated at every step.
              Resumable — if the run dies, /run again picks up where it stopped.
/status       compact report of every story
```

Everything lives in markdown for audit, editing and agent context:

```
.squad/
  project-context.md   # 1-page briefing all agents read first (seeded from CLAUDE.md)
  learnings.md         # strict-format rules: error → cause → rule
  stories/…
.claude/
  agents/  commands/
  pocket-squad.manifest.json   # hashes for non-destructive updates
```

## Updating safely

`update` compares each file against the hash recorded at install: untouched files are
upgraded in place; files you customized are left alone and the new version lands next
to them as `*.new` for manual merge. `install` never overwrites anything that exists.

## Extending

Add your own agents/skills to `.claude/` freely — anything not in the manifest is
yours and will never be touched. Recommended: drop third-party skills (frontend
craft, code-review rubrics, etc.) into `.claude/skills/` and pin their versions —
they run with access to your code, treat them as supply chain.
