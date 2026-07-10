# Project Context — managed by Pocket Squad

> Single-page briefing every squad agent reads FIRST. Kept lean and current by the
> techlead. If this file is still a template, the techlead must investigate the repo
> and fill it in (seeding from CLAUDE.md / AGENTS.md when they exist).

## Stack
- **Language/runtime:** Node.js, `engines.node >= 18`. Plain CommonJS (`require`), no build step.
- **Dependencies:** ZERO runtime and ZERO dev dependencies by design. Uses only Node built-ins (`fs`, `path`, `crypto`). Adding a dependency is a design decision — escalate, don't do it casually.
- **Distribution:** an `npx`-installable CLI. `bin.pocket-squad -> bin/pocket-squad.js`.
- **Content shipped:** markdown templates under `templates/` (Claude Code agents + commands, and the `.squad` workflow scaffold) copied into a target project.

## Commands (exact, copy-pasteable)
- install (deps): none — zero-dependency project, nothing to install.
- dev: none — no build/watch step; edit and run the file directly.
- test: **none yet** — no test framework, no `scripts.test` in `package.json`.
- lint: **none yet** — no linter configured.
- build: **none yet** — pure JS, nothing to compile.
- **Manual smoke test** (the real DoD check today), run from a throwaway dir so it writes `.claude/`/`.squad/` there, NOT into this repo:
  ```bash
  node /abs/path/to/bin/pocket-squad.js install   # creates .claude/ + .squad/ + manifest
  node /abs/path/to/bin/pocket-squad.js status     # lists managed vs customized
  node /abs/path/to/bin/pocket-squad.js update     # non-destructive upgrade
  ```

## Architecture in one paragraph
A single-file CLI (`bin/pocket-squad.js`) with three commands — `install | update | status`.
It walks `templates/` (recursively, `walk()`), maps each template path to a destination in
the target project via `destFor()` (`templates/claude/*` -> `.claude/*`, `templates/squad/*`
-> `.squad/*`), and tracks file identity with SHA-256 hashes recorded in a manifest at
`.claude/pocket-squad.manifest.json`. `install` never clobbers existing files; `update`
upgrades files the user never touched (current hash == manifest hash) in place, and for
files the user customized it writes the new version alongside as `*.new` instead of
overwriting; `status` diffs each managed file's current hash against the manifest. The
shipped content is all markdown under `templates/` — Claude Code agent/command definitions
plus the `.squad` story/task workflow scaffold.

## Conventions
- **CommonJS, Node built-ins only.** No transpilation, no `import`. Match the existing style.
- **Non-destructive by default.** Any file operation must never silently overwrite user
  content — mirror the hash-guarded logic in `install()`/`update()` (exemplar:
  `bin/pocket-squad.js` lines ~55-133). This is the core safety contract of the tool.
- **Story/Task files are written in English**; owner conversation is in the owner's language.
- **Squad content is markdown** under `templates/claude/agents`, `templates/claude/commands`,
  `templates/squad`. Exemplar agent: `templates/claude/agents/techlead.md`. Exemplar
  command: `templates/claude/commands/story.md`.
- **`files` allowlist in `package.json` is the packaging contract** — only what's listed
  ships to npm. Prefer extending it over adding an `.npmignore`.

## Design system (if UI)
N/A — this is a CLI. No UI, no component library, no design tokens. Console output uses
plain aligned text with leading glyphs (`+ created`, `^ updated`, `! customized`,
`· managed`, `★ customized`); imitate that if you add output lines.

## Do-not-touch
- `.claude/pocket-squad.manifest.json` in a target project — generated; never hand-edit.
- `*.new` files produced by `update` — user-merge artifacts, not source.
- The hash/manifest logic in `bin/pocket-squad.js` (`sha`, `loadManifest`, `saveManifest`,
  the clobber guards) is the fragile safety core — changes there are **senior** tier and
  must preserve the "never overwrite user edits" invariant.
- `HANDOFF.md` — human design record; keep it out of the published tarball.
