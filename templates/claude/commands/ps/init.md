---
description: Create the project's CLAUDE.md by investigating the repo (no-op when already complete). Usage - /ps:init
---

## If CLAUDE.md exists at the repo root

Read it and compare against the structure below. Propose only what is missing —
never rewrite what the owner wrote. Nothing missing → say so and change nothing.

## If it is missing

Investigate the repo — inline for small repos, parallel `Explore` subagents for
large ones: manifests (package.json / pyproject.toml / go.mod / ...), README, CI
workflows, folder layout, test setup.

**Every command you write must exist verbatim** in the repo's scripts / Makefile /
CI. When in doubt, confirm with `--help` or a dry run. Never invent one.

Write `CLAUDE.md` (≤ ~60 lines):

- **Stack** — language, runtime, framework, package manager.
- **Commands** — install, dev, test, lint, build. Exact and copy-pasteable; omit
  the ones that do not exist.
- **Architecture** — ONE paragraph.
- **Conventions** — patterns to imitate, with paths to exemplar files.
- **Do-not-touch** — generated files, vendored code, fragile areas.

Show the result and remind the owner that Claude Code loads CLAUDE.md automatically
in every session.
