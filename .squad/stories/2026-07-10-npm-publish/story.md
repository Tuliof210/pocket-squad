---
title: Make Pocket Squad publishable to npm
complexity: S
status: done
cost: 5   # sum of task tiers (junior=1, pleno=2, senior=3): 01 junior=1 + 02 pleno=2 + 03 qa/pleno=2
---

## Description
Get `pocket-squad` ready for a first public `npm publish`. The npm name `pocket-squad`
is confirmed FREE, so we publish unscoped (no `@scope/` fallback needed). `package.json`
already carries `name`, `version`, `description`, `bin`, `files: ["bin","templates","README.md"]`,
`engines.node >=18`, `keywords`, and `license: MIT` — so the remaining gaps are narrow:
a real LICENSE file, provenance metadata (`repository`/`homepage`/`bugs`), a
publish-time smoke guard, and a verified dry-run.

Note (ponytail): `files` is already an allowlist, so scratch/dev files (`HANDOFF.md`,
`.squad/`, `.claude/`) physically cannot leak into the tarball — no `.npmignore` is
needed and none will be added. npm always includes `LICENSE`, `package.json`, and
`README.md` regardless of `files`.

### Clarifying questions (answered with proposed defaults — planned against these; owner overrides win)
1. **License?** Default: **MIT** (matches the existing `license: MIT` field). If you want
   Apache-2.0/ISC/proprietary, say so and task 01 swaps the LICENSE text + field.
2. **Publish access + version?** Default: **public, unscoped `pocket-squad`, version stays
   `0.1.0`** for the first real publish. If you'd rather cut `1.0.0` or a `0.1.0` beta on a
   dist-tag, say so before `/run`.
3. **`prepublishOnly` guard strength?** Default: run the **node-assert smoke test only**
   (install→status in a temp dir). No lint/build (none exist). Enough to stop a broken
   tarball; not a full CI.
4. **Copyright holder in the LICENSE header?** Default: **`2026 Tulio Ferreira`** (git
   author on this repo). Correct the name/year if it should differ.

## Definition of Done
- A top-level `LICENSE` file exists (MIT unless overridden) and `package.json` `license`
  matches it.
- `package.json` has `repository`, `homepage`, and `bugs` pointing at
  `github.com/Tuliof210/pocket-squad`.
- `npm test` runs a zero-dependency node-assert smoke script that installs into a temp
  dir and asserts `install` then `status` succeed; it exits non-zero on any failure.
- `scripts.prepublishOnly` runs that smoke test.
- `npm publish --dry-run` succeeds and its tarball manifest INCLUDES `bin/`, `templates/`,
  `README.md`, `LICENSE`, `package.json` and EXCLUDES `HANDOFF.md`, `.squad/`, `.claude/`,
  and any scratch files.
- No new runtime or dev dependency is added (zero-dep invariant preserved).

## Completion summary (2026-07-10)
All 3 tasks done, each verified by an unbiased gate (never the implementer):
- **01** (devops/junior) — added root `LICENSE` (MIT, "Copyright (c) 2026 Tulio Ferreira")
  and `repository`/`homepage`/`bugs` to `package.json`. Gate: reviewer-pleno → APPROVE.
- **02** (devops/pleno) — added zero-dep `test/smoke.js` (temp-dir install→status assert)
  and `scripts.test` + `scripts.prepublishOnly`. Gate: qa-pleno ran it + fault-injection → APPROVE.
- **03** (qa/pleno) — `npm publish --dry-run` gate: all 6 checks pass. Tarball = 26 entries,
  includes bin/ + all 22 templates/ + README + LICENSE + package.json; excludes HANDOFF.md,
  .squad/, .claude/, test/, *.new. Zero-dep invariant intact.

**Result:** repo is publish-ready. Remaining human step (not automated by the squad):
`npm publish` with an authenticated npm account. Defaults were taken as stated (MIT, unscoped
`pocket-squad`, version `0.1.0`, smoke-only prepublish guard).
