# Pocket Squad

## Stack
- Node.js, `engines.node >= 18`. Plain CommonJS (`require`), no build step.
- ZERO runtime and ZERO dev dependencies by design — Node built-ins only (`fs`,
  `path`, `crypto`). Adding a dependency is a design decision, never casual.
- Distribution: an `npx`-installable CLI. `bin.pocket-squad -> bin/pocket-squad.js`.
- Shipped content: markdown under `templates/` (4 `/ps:*` commands + the
  `.squad/learnings.md` scaffold) copied into a target project.

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
- The repo dogfoods itself: `templates/claude/*` ≡ `.claude/*` and
  `templates/squad/learnings.md` seeds `.squad/learnings.md` (which then diverges —
  it holds real learnings). After editing templates, run
  `node bin/pocket-squad.js update` at the repo root to re-sync the dogfood.
- Console output: plain aligned text with leading glyphs (`+ created`, `^ updated`,
  `! customized`, `· managed`). Imitate when adding output lines.
- `files` allowlist in `package.json` is the packaging contract — only what's listed
  ships to npm. `HANDOFF.md` (human design record) stays out of the tarball.

## Do-not-touch
- `.claude/pocket-squad.manifest.json` — generated; never hand-edit.
- `*.new` files produced by `update` — user-merge artifacts, not source.
- The hash/manifest logic in `bin/pocket-squad.js` (`sha`, `loadManifest`,
  `saveManifest`, the clobber guards) is the fragile safety core — changes there
  must preserve the "never overwrite user edits" invariant.
