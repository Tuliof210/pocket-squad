# Pocket Squad

## Stack
- Node.js, `engines.node >= 18`. Plain CommonJS (`require`), no build step.
- ZERO runtime and ZERO dev dependencies by design — Node built-ins only (`fs`,
  `path`, `crypto`). Adding a dependency is a design decision, never casual.
- Distribution: an `npx`-installable CLI. `bin.pocket-squad -> bin/pocket-squad.js`.
- Shipped content, copied into a target project: markdown under `templates/` — 6
  `/ps:*` commands, 2 review subagents (`.claude/agents/ps-{review,verify}.md`), the
  two review prompts (`.claude/ps-{review,verify}.md`), `.claude/settings.json`, the
  `.squad/{learnings,debt}.md` and `.squad/templates/{story,task,pr}.md` scaffolds —
  plus `templates/claude/ps-check.sh`, the one executable in the package.

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
`update` upgrades untouched files in place, writes `*.new` next to customized ones
(except `.squad/` knowledge files, which are always kept as-is), and deletes
managed-but-no-longer-shipped files when untouched; `status` diffs hashes.

## Conventions
- CommonJS, Node built-ins only. No transpilation, no `import`.
- Non-destructive by default: no file operation may silently overwrite user content —
  mirror the hash-guarded logic in `install()`/`update()`.
- Command templates live in `templates/claude/commands/ps/` so they surface as
  namespaced `/ps:*` slash commands. Exemplar: `templates/claude/commands/ps/story.md`.
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
  names `general-purpose` instead of `ps-review`/`ps-verify` is a silent cost
  regression. The smoke test fails on a missing `effort`.
- Execution runs in the main chat, serially. Subagents exist for **review only**, where
  a cold context is the feature — measured, a cold subagent per task spent 36% of a
  story's output rebuilding what the chat already held. Adding an execution subagent
  back needs that number to have changed.
- Branch namespaces: stories on `ps-story/<slug>`, tasks on `ps/<slug>/<task-slug>`.
  Git cannot hold `ps/<slug>` and `ps/<slug>/<task>` at once — the same name would have
  to be a file and a directory in the ref store. `ps-check.sh` derives task state from
  the task branch name, so renaming either scheme breaks `status`, `sync` and `sweep`.
- PR bodies, review verdicts and posted comments are written for a junior: plain
  sentences, exact file and command names, every term explained the first time.
  `.squad/templates/pr.md` is the shape; `ps-review.md` carries the verdict format.
- The repo dogfoods itself: `templates/claude/*` ≡ `.claude/*` and
  `templates/squad/learnings.md` seeds `.squad/learnings.md` (which then diverges —
  it holds real learnings). After editing templates, run
  `node bin/pocket-squad.js update` at the repo root to re-sync the dogfood.
- `.squad/PRODUCT.md`, `.squad/ARCHITECTURE.md` and `.squad/stories/` are never
  shipped templates — `/ps:init` and `/ps:story` create them per-project at
  runtime, same as a target project's own `CLAUDE.md`.
- Console output: plain aligned text with leading glyphs (`+ created`, `^ updated`,
  `! customized`, `· managed`). Imitate when adding output lines.
- `files` allowlist in `package.json` is the packaging contract — only what's listed
  ships to npm. `HANDOFF.md` (human design record) stays out of the tarball.
- Squash-merging a `ps/*` pull request into the branch it was cut from, and deleting
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
