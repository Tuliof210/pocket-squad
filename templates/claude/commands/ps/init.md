---
description: Investigate the repo and (re)confirm the 3-file split — CLAUDE.md (operational essentials), .squad/PRODUCT.md (what/why), .squad/ARCHITECTURE.md (how it's built) — proposing findings and waiting for approval before writing. Usage - /ps:init
effort: medium
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(ls:*), Bash(cat:*)
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

## 5. Check what can stop a run

Two things decide whether `/ps:pipe` finishes or stalls halfway. Report both; change
neither without saying what you are changing and why.

- **`.claude/settings.json`** ships with this package and pre-approves the git / gh /
  test calls the workflow is made of, for the whole session. If the project already had
  one, `install` kept it and the pocket-squad rules are in `.claude/settings.json.new` —
  say so, and show the owner which rules are missing from theirs. A command's
  `allowed-tools` frontmatter is not a substitute: it grants only for the turn that
  invoked the command and clears on the owner's next message.
- **CLAUDE.md is read by the auto-mode classifier**, not just by Claude. It is what
  tells the classifier that squash-merging a `ps/*` PR into the branch it was cut from
  is this project's routine terminal step rather than an unrequested irreversible
  action. If the repo uses `/ps:pipe`, propose one line saying exactly that — and let
  the owner reject it, because it is a line that loosens a safety check.

Neither of these makes a merge unconditional: writes to `.git` and the other protected
paths are never pre-approved by settings, and a refusal parks that task instead of
ending the run.
