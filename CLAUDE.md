# Pocket Squad

## Stack
- Node.js, `engines.node >= 18`. Plain CommonJS (`require`), no build step.
- ZERO runtime and ZERO dev dependencies by design — Node built-ins only (`fs`,
  `path`, `crypto`). Adding a dependency is a design decision, never casual.
- Distribution: an `npx`-installable CLI. `bin.pocket-squad -> bin/pocket-squad.js`.
- Shipped content, copied into a target project: markdown under `templates/` — 5
  `/ps-*` commands, the review subagent (`.agents/agents/ps-review.md`), the review
  prompt (`.agents/ps-review.md`), the report shape (`.agents/ps-report.md`),
  `.agents/settings.json` and the `.squad/templates/{prompt,pr}.md` scaffolds — plus
  `templates/agents/ps-check.sh`, the one executable in the package.

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
status`. It walks `templates/`, maps each path via `destFor()` (`templates/agents/*`
→ `.agents/*`, `templates/squad/*` → `.squad/*`), and tracks file identity with
SHA-256 hashes in `.agents/pocket-squad.manifest.json`. `install` never clobbers;
`update` upgrades untouched files in place, writes `*.new` next to customized ones, and
deletes managed-but-no-longer-shipped files when untouched (a customized one is reported
as `! obsolete` and left alone); `status` diffs hashes.
`.agents/settings.json` is the single exception to the copy-or-skip rule: `mergeSettings()`
unions our `permissions.allow`/`deny` lists into an existing file and leaves every other
key alone.

## The workflow it ships
`/ps-sync` → `/ps-task` → `/ps-run` → `/ps-review`. One request becomes one prompt file,
one branch, one PR, one review round. Merge is manual (or `ps-check.sh publish` by hand).
`/ps-teach` sits outside the chain: it explains the project to someone new to it and is
the one command that writes nothing.

In a project that ran `/ps-sync`, `AGENTS.md` is a **pointer and nothing else**: every
rule lives in `.squad/PRODUCT.md` (what/who/why) or `.squad/ARCHITECTURE.md` (stack,
commands, conventions, do-not-touch). Pocket Squad does not create or dual-write
`CLAUDE.md`. This repo's own `CLAUDE.md` is still the package architecture document (not
a synced pointer).

## Conventions
- CommonJS, Node built-ins only. No transpilation, no `import`.
- Non-destructive by default: no file operation may silently overwrite user content —
  mirror the hash-guarded logic in `install()`/`update()`.
- Command templates live in `templates/agents/commands/ps-*.md` so they surface as
  `/ps-*` slash commands. Exemplar: `templates/agents/commands/ps-task.md`.
  Every command declares `allowed-tools` in its frontmatter — a missing one means a
  permission prompt mid-run, which is a stall, not a safety feature.
- Anything mechanical and repeated belongs in `ps-check.sh`, never in a command's
  prose. The script costs at most ONE network call per invocation (`$PRS` is the cache).
- A subagent prompt lives in its own file (`templates/agents/ps-review.md`) and the
  command points at it. Never inline one as a blockquote the main chat has to retype
  into a dispatch.
- Every step declares its cost. A command sets `effort` in its own frontmatter; a
  **subagent's** cost can only be set in its `templates/agents/agents/*.md` definition.
  A dispatch that names `general-purpose` instead of `ps-review` is a silent cost
  regression. The smoke test fails on a missing `effort`.
- Execution runs in the main chat, serially. Subagents exist for **review only**.
- One branch per task, `task/<kebab-case title>`, one conventional commit per step, one
  PR whose title is the task title. `ps-check.sh` matches `task/*` in `publish` and
  `sweep`, so renaming the scheme breaks both.
- The unit of work is one refined prompt at `.squad/tasks/<yymmdd-hhmm>.prompt.md`,
  written by `/ps-task` and executed verbatim by `/ps-run`.
- **No learnings file, no debt ledger.** A durable rule goes in `.squad/ARCHITECTURE.md`;
  anything else goes in the prompt.
- Prompts, PR bodies and review verdicts follow the **task's language**, written for a
  junior — plain sentences, exact file and command names — and **short enough to be
  read**.
- How `/ps-task`, `/ps-run` and `/ps-review` **end** is `ps-report.md`: a detail block,
  exactly one status line (`✓ done` / `? decide` / `! stopped`), then the literal `→`
  line(s). **The shape reports the work and never decides it.**
- The repo dogfoods itself: `templates/agents/*` ≡ `.agents/*`. After editing templates,
  run `node bin/pocket-squad.js update` at the repo root to re-sync the dogfood.
- `.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/tasks/` are never shipped
  templates — `/ps-sync` and `/ps-task` create them per-project at runtime, same as a
  target project's own `AGENTS.md`.
- Console output: plain aligned text with leading glyphs (`+ created`, `^ updated`,
  `! customized`, `· managed`).
- `files` allowlist in `package.json` is the packaging contract — only what's listed
  ships to npm. `HANDOFF.md` stays out of the tarball.
- Squash-merging a `task/*` PR remains available as `ps-check.sh publish`, but is no
  longer a slash command. Force pushes, hard resets, `gh release` and `npm publish`
  stay denied in `.agents/settings.json`.

## Do-not-touch
- `.agents/pocket-squad.manifest.json` — generated; never hand-edit.
- `*.new` files produced by `update` — user-merge artifacts, not source.
- The hash/manifest logic in `bin/pocket-squad.js` (`sha`, `loadManifest`,
  `saveManifest`, the clobber guards) is the fragile safety core — changes there
  must preserve the "never overwrite user edits" invariant.
