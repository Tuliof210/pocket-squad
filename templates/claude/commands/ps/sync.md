---
description: Move every product and architecture rule scattered around the repo into .squad/PRODUCT.md and .squad/ARCHITECTURE.md, then interview to fill what is still missing. Usage - /ps:sync
effort: medium
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(ls:*), Bash(cat:*)
---

## The split

- **CLAUDE.md** (or `AGENTS.md` — whichever this repo uses) — the mandatory-read rule
  below, Stack, exact Commands, Do-not-touch. Only what has to be loaded before
  anything else.
- **.squad/PRODUCT.md** — what the product is, who it is for, why it exists, the core
  domain concepts. No stack, no commands.
- **.squad/ARCHITECTURE.md** — how it is built: the architecture, and the conventions
  to imitate, each with an exemplar file path.

## 1. Move first, ask second

**This command's primary job is a move, not an interview.** Product and architecture
rules are almost never missing — they are scattered. Sweep the repo read-only
(`CLAUDE.md`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `docs/`, `.cursorrules`,
ADRs, long comment blocks) and route every rule you find:

- describes what the product does, for whom, or a domain term → `.squad/PRODUCT.md`
- describes how the code is built, a pattern to imitate, a boundary → `.squad/ARCHITECTURE.md`
- stack, an exact command, a do-not-touch → stays in `CLAUDE.md`/`AGENTS.md`

**Move means the source line is deleted.** A rule living in two files is a rule that
will disagree with itself. The exception is a README paragraph a human reader needs:
that one is quoted, not moved, and you say which you did.

Never rewrite what the owner already wrote. Same rule, new address.

## 2. Investigate what nobody wrote down

Inline for small repos, parallel `Explore` subagents for large ones: manifests
(`package.json` / `pyproject.toml` / `go.mod` / …), CI workflows, folder layout, test
setup, the entry points.

**Every command you write must exist verbatim** in the repo's scripts / Makefile / CI —
confirm it, never invent one.

## 3. Propose — do not write yet

File by file, list what moves (from where, to where) and what you would add, quoting
what you found. Mark anything inferred and ask about it **with a suggested default**.

## 4. Interview the gaps

Only what the repo genuinely cannot answer — the *why*, the users, the decisions behind
the structure. Never ask what you just read. Converse in the owner's language; file
content in the repo's language.

## 5. Write — only after confirmation

Write the three files (≤ ~60 lines each) and show the result.

`CLAUDE.md`/`AGENTS.md` must **open** with this rule, verbatim, before anything else —
it is what makes the other two files load at all:

```markdown
## Mandatory first step

Before answering anything in this repository — a `/ps:*` command or an ordinary
question, every session, every message — read `.squad/PRODUCT.md` and
`.squad/ARCHITECTURE.md`. They are the norm this project is judged against.
```

If the repo has both `CLAUDE.md` and `AGENTS.md`, the rule goes in both. If it has
neither, create `CLAUDE.md`.

## 6. Check what can stop a run

- **`.claude/settings.json`** ships with this package and pre-approves the git / gh /
  test calls the workflow is made of, for the whole session. `install` merges our rules
  into an existing one — confirm they are there. A command's `allowed-tools` frontmatter
  is not a substitute: it grants only for the turn that invoked the command.
- **`CLAUDE.md` is read by the auto-mode classifier**, not just by Claude. It is what
  tells the classifier that squash-merging a reviewed `task/*` PR and deleting that
  branch is this project's routine terminal step rather than an unrequested irreversible
  action. Propose one line saying exactly that — and let the owner reject it, because it
  is a line that loosens a safety check.
