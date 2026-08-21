---
name: ps-run
description: Execute one refined prompt - a worktree on task/<slug>, one semantic commit per step, one PR. Usage - /ps-run <yymmdd-hhmm | pasted prompt>
effort: medium
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(glab:*), Bash(sh .agents/pocket-squad-check.sh:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*), Bash(make:*), Bash(cargo:*), Bash(go:*), Bash(pytest:*), Bash(uv:*)
---

Whatever follows `/ps-run` in this message is **either** an id matching
`.squad/tasks/<id>.prompt.md` (read that file) **or** the prompt text itself, pasted
straight in — that is the fresh-session path, and it needs no file on disk. Empty → list
`.squad/tasks/` and ask; never guess.

**The prompt is already refined. Do not re-interview.** `/ps-task` paid for the
questions, the exemplars and the verified commands. Re-deriving them here is the one
cost this workflow exists to avoid. Stop only if executing would require inventing a
decision the prompt does not contain.

Everything runs in **this chat**, serially. The only cold context in this workflow is
`/ps-review`, where not knowing what the author intended is the whole point.

## 1. Set up, once

Record the branch you are on — the **target branch**, where this lands.

The title is the prompt's `# ` line; the slug is that title in kebab-case.

    git worktree add ../<repo>--ps/<slug> -b task/<slug>
    sh .agents/pocket-squad-check.sh warm ../<repo>--ps/<slug>

`warm` shares this checkout's installed dependencies instead of installing them again.
**If a step changes a lockfile, delete the link it names and run the project's real
install first** — the directory is shared with the main checkout, so installing through
the link corrupts it.

## 2. Each step, in order

Work inside the worktree, on `task/<slug>`.

1. Implement. The prompt's `## Context` carries the exemplar, the symbol and the
   commands — open what it names, write the code. `## Design`, when it is not `none`, is
   settled: build that contract verbatim, names included, and do not improve it — the
   reviewer was told the same shape. Everything it does not fix is yours to design, with
   the code in front of you.
2. Commit that step, alone, in **conventional-commit** form:
   `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `test(scope): ...`,
   `chore(scope): ...`. One idea per commit, subject in the imperative.

Run every `## Verify` line once, after the last step, and say which criterion each one
proved. A criterion left without a passing check is a parked task, not a finished one. If
the prompt names no command, fall back to the repo's standard lint/test/build. **Never
weaken a check to make it pass.**

Keep one line per step as you go, carrying the criteria it served — this is the detail
block of the final report:

```
▸ 1 add parser entry point        a1b2c3d   R1
▸ 2 wire it into the CLI          e4f5g6h   R2 R3
```

A step that hits a scope decision, or fails verification twice, **parks**. Stash its
half-finished work so the branch stays green, say so in one line, and stop — later steps
usually depend on it:

    git stash push -u -m "parked <slug> step <n>"

Never invent the decision. A refused permission parks the same way and names the exact
refused call.

## 3. Open the PR

    git push -u origin task/<slug>

Then from the main checkout (`ExitWorktree`, or run from its path), open **one PR** into
the target branch you recorded in section 1.

- **Title:** the task title, verbatim.
- **Body:** `.squad/templates/pr.md`, **in the prompt's language**.

## 4. Report

**Follow `.agents/pocket-squad-report.md`. It is the whole final message.** Your lines:

    **run · <title>**

    - 1 <step> — `a1b2c3d` R1
    - 2 <step> — `e4f5g6h` R2 R3
    - <verify command> — <what it printed>

    **✓ done** · <PR url>

    → `/ps-review <pr>`

A parked step ends the run at `! stopped` instead — which step, why, and that the work is
stashed. The branch and its worktree stay until you merge and clean up (or run
`sh .agents/pocket-squad-check.sh publish <pr>` / `sweep` by hand); that is not news and does not
go in the report.
