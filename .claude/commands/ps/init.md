---
description: Investigate the repo and (re)confirm the 3-file split — CLAUDE.md (operational essentials), .squad/PRODUCT.md (what/why), .squad/ARCHITECTURE.md (how it's built) — proposing findings and waiting for approval before writing. Usage - /ps:init
---

## The split

- **CLAUDE.md** — Stack, exact Commands, Do-not-touch: what Claude Code needs
  loaded every session without opening another file. Ends with two pointer
  lines: `Product: see .squad/PRODUCT.md` and `Architecture and conventions:
  see .squad/ARCHITECTURE.md`.
- **.squad/PRODUCT.md** — what the product is, who it's for, why it exists,
  core domain concepts. No stack, no commands.
- **.squad/ARCHITECTURE.md** — the Architecture paragraph and Conventions
  (patterns to imitate, with exemplar file paths).

Read all three first, if they exist. Never rewrite what the owner already
wrote — propose only what's missing. If all three exist and look complete, say
so and change nothing.

## 1. Investigate (read-only)

Inline for small repos, parallel `Explore` subagents for large ones:

- Manifests (package.json / pyproject.toml / go.mod / ...), CI workflows, folder
  layout, test setup → Stack / Commands / Do-not-touch / Architecture.
- README intro, package/CHANGELOG description, docs → Product.

**Every command you write must exist verbatim** in the repo's scripts /
Makefile / CI — confirm with `--help` or a dry run, never invent one.

## 2. Propose — do not write yet

List, file by file, exactly what you plan to write or add, quoting or closely
paraphrasing what you found. Mark anything inferred (not found verbatim) and
ask about it with a suggested default — never silently guess at intent.

## 3. Iterate

The owner will correct, add, or cut items. Keep looping on whatever stays
doubtful until nothing material is open. Converse in the owner's language;
file content in English (repo convention).

## 4. Write — only after confirmation

Write the three files (≤ ~60 lines each) and show the result. CLAUDE.md loads every
session; PRODUCT.md and ARCHITECTURE.md are read on demand by the other commands.
ARCHITECTURE.md is the norm `/ps:review` checks against, so a convention that matters
belongs there, with its exemplar path.
