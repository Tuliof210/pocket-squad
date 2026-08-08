# Pocket Squad

## Stack
- Node.js, `engines.node >= 18`. Plain CommonJS (`require`), no build step.
- ZERO runtime and ZERO dev dependencies by design — Node built-ins only (`fs`,
  `path`, `crypto`). Adding a dependency is a design decision, never casual.
- Distribution: an `npx`-installable CLI. `bin.pocket-squad -> bin/pocket-squad.js`.
- Shipped content, copied into a target project: markdown under `templates/` — 5
  `/ps:*` commands, the review subagent (`.claude/agents/ps-review.md`), the review
  prompt (`.claude/ps-review.md`), `.claude/settings.json` and the
  `.squad/templates/{prompt,pr}.md` scaffolds — plus `templates/claude/ps-check.sh`,
  the one executable in the package.

## Commands
- test: `npm test` — zero-dep smoke test (`node test/smoke.js`), also runs on
  `prepublishOnly`. No lint, no build.
- Manual check, from a throwaway dir (never this repo):
  ```bash
  node /abs/path/to/bin/pocket-squad.js install
  node /abs/path/to/bin/pocket-squad.js status
  node /abs/path/to/bin/pocket-squad.js update
  ```

## Architecture
A single-file CLI (`bin/pocket-squad.js`) with three commands — `install | update |
status`. It walks `templates/`, maps each path via `destFor()` (`templates/claude/*`
→ `.claude/*`, `templates/squad/*` → `.squad/*`), and tracks file identity with
SHA-256 hashes in `.claude/pocket-squad.manifest.json`. `install` never clobbers;
`update` upgrades untouched files in place, writes `*.new` next to customized ones, and
deletes managed-but-no-longer-shipped files when untouched (a customized one is reported
as `! obsolete` and left alone); `status` diffs hashes.
`.claude/settings.json` is the single exception to the copy-or-skip rule: `mergeSettings()`
unions our `permissions.allow`/`deny` lists into an existing file and leaves every other
key alone, because a project that already had settings would otherwise run the whole
workflow with none of its permissions.

## The workflow it ships (v4)
`/ps:sync` → `/ps:task` → `/ps:run` → `/ps:review` → `/ps:publish`. One request becomes
one prompt file, one branch, one PR, one review round.

## Conventions
- CommonJS, Node built-ins only. No transpilation, no `import`.
- Non-destructive by default: no file operation may silently overwrite user content —
  mirror the hash-guarded logic in `install()`/`update()`.
- Command templates live in `templates/claude/commands/ps/` so they surface as
  namespaced `/ps:*` slash commands. Exemplar: `templates/claude/commands/ps/task.md`.
  Every command declares `allowed-tools` in its frontmatter — a missing one means a
  permission prompt mid-run, which is a stall, not a safety feature.
- Anything mechanical and repeated belongs in `ps-check.sh`, never in a command's
  prose: a markdown command is reliable at deriving, judging and writing, and not at
  running the same checklist for the fiftieth time. The script costs at most ONE
  network call per invocation — keep it that way (`$PRS` is the cache).
- A subagent prompt lives in its own file (`templates/claude/ps-review.md`) and the
  command points at it. Never inline one as a blockquote the main chat has to retype
  into a dispatch — that regenerates the whole prompt as output tokens every time.
- Every step declares its cost. A command sets `effort` in its own frontmatter; a
  **subagent's** cost can only be set in its `templates/claude/agents/*.md` definition,
  because a command's frontmatter never reaches an agent it dispatches. A dispatch that
  names `general-purpose` instead of `ps-review` is a silent cost regression. The smoke
  test fails on a missing `effort`.
- Execution runs in the main chat, serially. Subagents exist for **review only**, where
  a cold context is the feature — measured, a cold subagent per task spent 36% of a
  task's output rebuilding what the chat already held. Adding an execution subagent
  back needs that number to have changed.
- One branch per task, `task/<kebab-case title>`, one conventional commit per step, one
  PR whose title is the task title. `ps-check.sh` matches `task/*` in `publish` and
  `sweep`, so renaming the scheme breaks both.
- The unit of work is one refined prompt at `.squad/tasks/<yymmdd-hhmm>.prompt.md`,
  written by `/ps:task` in the conversation's language and executed verbatim by
  `/ps:run`. `/ps:run` never re-interviews: paying twice for the same questions is the
  cost this split exists to avoid.
- **No learnings file, no debt ledger.** Both existed up to v3 and both were removed:
  a rule read alongside CLAUDE.md and ARCHITECTURE.md was a third voice saying almost
  the same thing, and a debt ledger was a place to defer a fix to instead of fixing it.
  A durable rule goes in `.squad/ARCHITECTURE.md`; anything else goes in the prompt.
- Prompts, PR bodies and review verdicts follow the **task's language**, are written for
  a junior — plain sentences, exact file and command names — and are **short enough to
  be read**. `.squad/templates/{prompt,pr}.md` are the shapes; `ps-review.md` carries
  the verdict format.
- The repo dogfoods itself: `templates/claude/*` ≡ `.claude/*`. After editing templates,
  run `node bin/pocket-squad.js update` at the repo root to re-sync the dogfood.
- `.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/tasks/` are never shipped
  templates — `/ps:sync` and `/ps:task` create them per-project at runtime, same as a
  target project's own `CLAUDE.md`.
- Console output: plain aligned text with leading glyphs (`+ created`, `^ updated`,
  `! customized`, `· managed`). Imitate when adding output lines.
- `files` allowlist in `package.json` is the packaging contract — only what's listed
  ships to npm. `HANDOFF.md` (human design record) stays out of the tarball.
- Squash-merging a `task/*` pull request into the branch it was cut from, and deleting
  that branch, is the routine terminal step of `/ps:publish` — the intended end of
  every task in this repo's own workflow, not an unrequested irreversible action.
  Force pushes, hard resets, `gh release` and `npm publish` are none of that and stay
  denied in `.claude/settings.json`.

## Do-not-touch
- `.claude/pocket-squad.manifest.json` — generated; never hand-edit.
- `*.new` files produced by `update` — user-merge artifacts, not source.
- The hash/manifest logic in `bin/pocket-squad.js` (`sha`, `loadManifest`,
  `saveManifest`, the clobber guards) is the fragile safety core — changes there
  must preserve the "never overwrite user edits" invariant.
