# Pocket Squad

Repository governance for coding agents.

Pocket Squad studies a project once, creates a shared product and engineering context, and makes the
repository's working protocols available to every future agent run. Skills orchestrate the work; deterministic
scripts enforce the invariants that should not depend on prompt compliance.

```bash
npx pocket-squad            # install into the current project
npx pocket-squad update     # update untouched managed files
npx pocket-squad status     # show managed and customized files
```

## The governance model

`$ps-start` creates four project files after showing its proposal and receiving confirmation:

```text
AGENTS.md                    small bootstrap loaded by the agent harness
.squad/PRODUCT.md            what the product is, who it serves, and why
.squad/ARCHITECTURE.md       how the software is built
.squad/PROTOCOLS.md          how work must be changed, verified, reviewed, and delivered
```

The split is deliberate:

- Product statements describe observable purpose and domain language.
- Architecture statements describe the system, stack, boundaries, commands, and exemplars.
- Protocols are normative. Each protocol says when it applies, what MUST happen, what evidence proves it,
  how it is enforced, and which exceptions are legitimate.
- `AGENTS.md` points to all three, establishes precedence, and preserves nested instruction overrides.

The canonical files synthesize evidence. They do not delete useful human documentation from README files,
contributing guides, or ADRs.

## Everyday use

```text
$ps-start                     initialize or intentionally refresh governance
$ps-change <request>          implement a governed change in an isolated worktree
$ps-review <PR>               independently review the exact current head SHA
$ps-audit                     find governance drift and unenforced protocols
$ps-teach <question>          explain product, architecture, protocols, or code
```

Skills allow implicit invocation by default. After initialization, a user can normally ask for a fix or feature
without remembering a command; `AGENTS.md` supplies the persistent bootstrap and `$ps-change` supplies the
workflow. Explicit `$ps-*` invocation remains available when the user wants a particular operation.

## Change lifecycle

```text
ordinary change request
        │
        ├─ read PRODUCT + ARCHITECTURE + PROTOCOLS once
        ├─ classify small vs risk-bearing
        ├─ preflight and create recorded worktree
        ├─ write an optional committed plan for risk-bearing work
        ├─ implement, verify incrementally, and commit
        ├─ verify the clean head and open a PR with protocol evidence
        └─ review that exact SHA; fixes require a fresh delta verification
```

Small, reversible changes use a short in-chat plan. Risk-bearing changes — public contracts, authentication,
data, migrations, dependencies, deployment, security, or cross-boundary work — use
`.squad/templates/prompt.md` and commit the filled plan under `.squad/changes/`.

The PR is the durable evidence record. Its template includes the base/head SHA, applicable protocols,
verification results, decisions, risks, rollout, rollback, and known gaps.

## Mechanical enforcement

The portable helper is installed at `.agents/scripts/pocket-squad.js`:

```bash
node .agents/scripts/pocket-squad.js preflight
node .agents/scripts/pocket-squad.js start export-csv
node .agents/scripts/pocket-squad.js check export-csv
node .agents/scripts/pocket-squad.js record-review export-csv <sha> APPROVED
node .agents/scripts/pocket-squad.js status [export-csv]
```

It records run state under the repository's git common directory, not in tracked project files. Worktrees live
under `.squad/worktrees/` and the helper adds that path to `.git/info/exclude`, keeping the main checkout clean
without modifying the project's `.gitignore`.

The helper enforces:

- governance exists before a change starts;
- the main checkout is clean;
- branch and worktree paths are created once and returned as data;
- base branch and SHA remain recorded;
- the task worktree is clean and contains commits before PR creation;
- review results cannot be recorded for a stale SHA.

It deliberately does not share writable dependency or build directories between worktrees. Package-manager
caches may still provide fast installs without cross-branch contamination.

## Independent review

Pocket Squad reviews at a specific SHA, never merely “the current PR.”

- `review_reader` inspects outcomes, scope, architecture, maintainability, and protocols without running code.
- `review_runner` works in the exact recorded worktree and runs behavior and verification checks.
- `fix_verifier` reviews only the delta created to close findings and can approve the new SHA.

A small non-behavioral change may need only the read lens. Behavioral and risk-bearing changes use both lenses
in parallel. Findings do not authorize edits by themselves; `$ps-review` fixes them only when the user explicitly
requests that. No SHA is called approved until an independent reviewer inspected that exact SHA.

## Installed files

```text
.agents/
  skills/
    ps-start/                 initialize or refresh governance
    ps-change/                implement tracked changes
    ps-review/                exact-SHA review
    ps-audit/                 governance drift audit
    ps-teach/                 read-only explanation
  reviewers/
    read.md                   portable static review contract
    run.md                    portable behavioral review contract
    verify-fix.md             portable post-fix delta contract
  scripts/pocket-squad.js     worktree, state, and SHA invariants
  pocket-squad.manifest.json  hashes for non-destructive updates

.squad/templates/
  agents.md
  product.md
  architecture.md
  protocols.md
  prompt.md
  pr.md
  verdict.md

.codex/
  config.toml                 project-scoped agent declarations
  agents/
    review-reader.toml
    review-runner.toml
    fix-verifier.toml
```

`.agents/` is the portable workflow core. `.codex/` is the Codex adapter and uses the native custom-agent
configuration. Other harnesses can add adapters without changing the canonical governance model.

## Non-destructive updates

`install` never overwrites an existing file. `update` compares each destination with the hash saved at install:

- untouched managed files update in place;
- customized files remain untouched and the new version is written as `*.new`;
- files no longer shipped are deleted only when they still match the previous managed hash;
- customized obsolete files are reported and preserved.

If `.codex/config.toml` already exists, merge the generated agent declarations deliberately; Pocket Squad does
not rewrite project-local runtime configuration it does not own.

## Behavioral evaluation

`test/evals/cases.json` is a small routing and policy corpus covering small changes, risk-bearing migrations,
read-only explanations, governance drift, and post-review fixes. A harness can record one result per case with
the selected skill, risk, plan decision, review lenses, protocols, completion, output tokens, and duration.

```bash
npm run eval:score -- path/to/results.json
```

The scorer reports completion, routing accuracy, risk and planning accuracy, reviewer selection, protocol recall,
average output tokens, and average duration. `npm test` separately exercises installation, safe migration,
worktree creation, dirty-checkout refusal, state traversal protection, clean-head verification, and stale-review
rejection without requiring a model or network call.

## Migrating from v4

Run:

```bash
npx pocket-squad update
```

Untouched v4 skills (`ps-sync`, `ps-task`, `ps-run`), Markdown reviewer agents, report prompts, and the old shell
helper are removed. Customized copies are preserved as obsolete files. The old `.agents/settings.json` is always
preserved for manual cleanup because v4 merged Pocket Squad permissions into potentially user-owned settings.

Then run `$ps-start`. It proposes the new governance documents before changing the root `AGENTS.md`.

The v4 prompt files under `.squad/tasks/` remain project history and are never deleted automatically. New
risk-bearing change plans live under `.squad/changes/` and use a versioned schema.
