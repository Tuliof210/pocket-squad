---
name: ps-sync
description: Move every product and architecture rule scattered around the repo into .squad/PRODUCT.md and .squad/ARCHITECTURE.md, then interview to fill what is still missing. Usage - /ps-sync
effort: medium
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(ls:*), Bash(cat:*)
---

## The split

- **AGENTS.md** — **a pointer, not a document.** It holds the mandatory-read rule
  below and nothing else. Every rule it used to carry moves out. Pocket Squad does
  not use `CLAUDE.md`; if that file exists, leave it alone or empty it only when the
  owner confirms the rules already live in PRODUCT/ARCHITECTURE.
- **.squad/PRODUCT.md** — what the product is, who it is for, why it exists, the core
  domain concepts.
- **.squad/ARCHITECTURE.md** — everything about how it is built: stack, the exact
  commands, the conventions to imitate (each with an exemplar file path), the boundaries
  and the do-not-touch list.

Two files, so that everything loaded is either *what* or *how*. A third file saying a
bit of both is the state this skill exists to end.

## 1. Empty AGENTS.md, then fill the other two

**This skill's primary job is a move, not an interview.** Product and architecture
rules are almost never missing — they are scattered. Sweep the repo read-only
(`AGENTS.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `docs/`, `.cursorrules`,
ADRs, long comment blocks) and route every rule you find:

- what the product does, for whom, a domain term → `.squad/PRODUCT.md`
- how the code is built — stack, commands, patterns, boundaries, do-not-touch →
  `.squad/ARCHITECTURE.md`

There is no third bucket. If a line does not fit either, it is not a rule — say so and
drop it.

**Move means the source line is deleted.** A rule living in two files is a rule that
will disagree with itself, and `AGENTS.md` keeping "just the essentials" is how it grew
into a document the first time. The exception is a README paragraph a human reader
needs: that one is quoted, not moved, and you say which you did.

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

`.squad/PRODUCT.md` and `.squad/ARCHITECTURE.md` (≤ ~60 lines each) get everything.

`AGENTS.md` gets **this and nothing else** — replace its entire contents (create it if
missing):

```markdown
## Mandatory first step

Before answering anything in this repository — a `/ps-*` skill or an ordinary
question, every session, every message — read `.squad/PRODUCT.md` and
`.squad/ARCHITECTURE.md`. They are the norm this project is judged against.
```

Show the diff of what left it — the owner is watching a file they wrote get emptied,
and has to be able to see where each line went. Do not create or dual-write `CLAUDE.md`.

## 6. Check what can stop a run

- **`.agents/settings.json`** ships with this package and pre-approves the git / gh /
  test calls the workflow is made of, for the whole session. `install` merges our rules
  into an existing one — confirm they are there. A skill's `allowed-tools` frontmatter
  is not a substitute: it grants only for the turn that invoked the skill.
