---
description: Turn a rough request into one refined, self-contained prompt saved at .squad/tasks/<yymmdd-hhmm>.prompt.md. Usage - /ps:task ["your request"]
effort: high
allowed-tools: Task, Agent, Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(date:*), Bash(mkdir:*)
---

The owner's request: "$ARGUMENTS" — may be empty; ask for it if so.

**This command produces one file and nothing else.** Nothing is implemented, no branch
is cut, no PR opens — that is `/ps:run`.

Your product is a **spec**: one file carrying the requirements, the design decisions and
the plan. Everything found here is written down once and read by two agents that would
otherwise re-derive it: the executor and the reviewer.

## 1. Context

Read what `CLAUDE.md` / `AGENTS.md` mandates — `.squad/PRODUCT.md` and
`.squad/ARCHITECTURE.md`. Missing → suggest `/ps:sync` first; you may proceed without.

## 2. Ask only what is not obvious

- Extract everything the request already settles. **Never ask the obvious.**
- Every genuine ambiguity becomes one question **with a suggested default** — propose,
  do not interrogate. Never fabricate a decision to avoid asking.
- Cover at minimum: real scope and boundaries, the observable outcome, technical
  constraints, risk surface (auth / migrations / public contracts).
- **Does this task create surface that does not exist yet** — a route, a table, a public
  signature, a payload, a CLI flag, a component API? Then its shape is a decision, and
  the owner gets it as a proposal before it is code. Propose one shape, name the
  alternative you are not taking. This is the only design gate in the workflow; after
  this the executor codes against what you wrote.
- A request bundling independent deliverables becomes separate prompts — propose the
  split. Iterate; stop when nothing material is open.

## 3. Investigate (read-only)

Dispatch `Explore` subagents **in a single message**, one per angle (a trivial request
collapses to one inline look):

- **Code map** — where the change lives, neighbours to imitate, utilities to reuse.
- **Verification** — the exact lint/test/build commands that exist. Never cite a script
  that does not exist.
- **Risks** — edge cases, hidden couplings, invariants.

Ask each subagent for the finding *and its substance*: the exemplar's path **plus the
lines that make it the exemplar**, the symbol **plus its signature**, the command **plus
proof it runs**. An address alone forces the executor to re-open the repo and the
reviewer to do it a second time — which is the cost this step exists to pay once.

## 4. Write the prompt

    mkdir -p .squad/tasks
    date +%y%m%d-%H%M

That timestamp is the filename: `.squad/tasks/<yymmdd-hhmm>.prompt.md`. Fill
`.squad/templates/prompt.md`.

**Write it in the language this conversation is happening in** — headings included. The
PR body and the review verdict will follow the same language, because they are read by
the same person.

Two sections carry the spec and both fail in a specific way:

- **`## Outcome` is numbered `R1..Rn`**, and every step and every `## Verify` line cites
  the criteria it serves. A criterion nothing cites is untested or was never a criterion;
  a step that cites nothing is scope creep with a commit message attached. Fix the thread,
  not the numbering.
- **`## Design` is where a spec earns its name, and where it rots into a document nobody
  reads.** Write it only for surface that does not exist yet — the exact contract, the
  flow when failure or ordering is not obvious from that contract, and one line per
  alternative ruled out. A task that follows a pattern already in the repo writes `none`;
  that is the common case and it is not a weaker spec. `## Context` already quoted the
  exemplar — restating it here is the rot.

Length is a correctness property, in both directions:

- **Too verbose** and it buries the contract in prose: the executor loses the thread and
  a human cannot audit it. Every sentence must change what gets built.
- **Too terse** and every gap becomes an invention. If a reader could reasonably build
  two different things, it is not finished.

The test is scope, never line count. Check the prompt against these — **any one that
holds is a decomposition error**: go back to step 2 and split the request.

- Two observable outcomes a reviewer could accept or reject independently.
- A step that can only start once another step's result has been *reviewed* — a
  migration and the code that depends on the new shape.
- Two verification recipes that never overlap: different suites, different surfaces.
- More steps than one branch can carry as readable conventional commits.

None holds → the prompt is one task and is exactly as long as its contract requires. A
long prompt made of *contract* — signatures, payload shapes, edge cases, exact commands,
file paths — is correct and must not be trimmed. A long prompt made of prose —
restatement, rationale, encouragement, anything already in `.squad/ARCHITECTURE.md` — is
the actual defect: cut the prose, keep every line that changes what gets built.

What does **not** belong in the file:

- Implementation code. A snippet is allowed only when it *is* the contract — a
  signature, a payload shape — never a function body, markup or styles.
- A hand-measured number. If a decision depends on a measurement, name the command that
  takes it at execution time.
- Anything already in `.squad/PRODUCT.md` or `.squad/ARCHITECTURE.md` — both load
  anyway, on every message.

## 5. Commit it

    git add .squad/tasks/<id>.prompt.md
    git commit -m "chore(task): <id> <title>"

The prompt has to exist in git history: `/ps:run` cuts a worktree from here and
`/ps:review` reads the file to judge against it. Push best-effort — a protected branch
leaves the commit local, which is fine; say so.

## 6. Report

The file path, the title, the steps in one line each, and `/ps:run <id>` as the next
step. Any contract `## Design` settles goes in the report too — the owner should see the
shape they are about to get without opening the file. A scope decision that surfaced goes
to the owner — never invent it.
