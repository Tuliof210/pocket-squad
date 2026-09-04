# Protocols

> Normative rules for changing this repository. `MUST` rules are mandatory. When a
> protocol cannot be followed, stop and report the exception instead of silently bypassing it.

## Change classes

- **Read-only** — explanation, diagnosis or review that changes no repository or external state.
- **Small change** — localized, reversible change with no public contract, dependency or data impact.
- **Risk-bearing change** — affects auth, data, migrations, dependencies, public contracts,
  deployment, security, multiple architectural boundaries or an irreversible operation.

## P001 — Read governance before work

- **Applies when:** any task starts in this repository.
- **MUST:** read `PRODUCT.md`, `ARCHITECTURE.md` and this file once for the current run.
- **Evidence:** decisions and verification use the vocabulary, commands and constraints they define.
- **Enforced by:** `AGENTS.md`; `$ps-audit` checks drift.

## P002 — Isolate repository changes

- **Applies when:** source, tests, dependencies, migrations, configuration or tracked docs will change.
- **MUST:** run `node .agents/scripts/pocket-squad.js preflight`, then create the task with
  `node .agents/scripts/pocket-squad.js start <slug>` before the first modification.
- **Evidence:** recorded worktree, `task/<slug>` branch, base branch and base SHA.
- **Exception:** initial governance creation or an explicitly confirmed governance refresh through `$ps-start`;
  otherwise only an explicit owner instruction may authorize work in the current checkout.
- **Enforced by:** the Pocket Squad script and the pre-PR check.

## P003 — Plan in proportion to risk

- **Applies when:** a change is risk-bearing or still permits materially different implementations.
- **MUST:** write `.squad/changes/<id>.prompt.md` from the prompt template before implementation;
  resolve blocking decisions with the owner.
- **Small change:** a short in-chat plan is sufficient.
- **Evidence:** committed plan path for risk-bearing work, or PR explanation for a small change.

## P004 — Preserve scope and user work

- **Applies when:** any mutation is made.
- **MUST:** preserve unrelated changes, avoid destructive commands, and touch only what the requested
  outcome or a necessary dependency requires.
- **Evidence:** focused diff; every changed file is explained in the PR.

## P005 — Verify incrementally and finally

- **Applies when:** any behavior or contract changes.
- **MUST:** run the narrowest meaningful check while implementing and all applicable verified commands
  before the PR. Never weaken a check to obtain a pass.
- **Evidence:** exact commands, results and requirement mapping in the PR.
- **On failure:** diagnose and continue while a safe path exists; stop only for a real decision,
  permission boundary or unrecoverable external failure.

## P006 — Keep history reviewable

- **Applies when:** changes are committed.
- **MUST:** use focused conventional commits whose subjects describe the outcome.
- **Evidence:** commit list; no unrelated changes hidden in a commit.

## P007 — Review the current head

- **Applies when:** a code-change PR is ready.
- **MUST:** review the exact head SHA in its recorded worktree. Findings fixed on a newer SHA require
  a fresh, targeted review of the delta before approval.
- **Evidence:** reviewer, lens, command results and reviewed SHA.
- **Enforced by:** `record-review`, which rejects stale SHAs.

## P008 — Make external mutations explicit

- **Applies when:** pushing, opening or updating a PR, publishing, deploying or changing external data.
- **MUST:** stay within the authority granted by the request and report the resulting URL or identifier.
- **Evidence:** external operation and result recorded in the PR or final report.

## P009 — Deliver code through a pull request

- **Applies when:** a tracked code change is verified and ready for review.
- **MUST:** push the recorded task branch and open one PR into its recorded base branch before calling the change
  delivered. If provider access or authorization is unavailable, stop at the verified local branch and name the
  exact remaining action.
- **Evidence:** PR URL, base branch and current head SHA.
- **Enforced by:** `$ps-change` and the review precondition.

## Repository-specific protocols

<Add protocols discovered or decided during `$ps-start`, continuing the ID sequence. Each needs
Applies when, MUST, Evidence, Enforced by or a stated human-only check, Exceptions, and On failure.>
