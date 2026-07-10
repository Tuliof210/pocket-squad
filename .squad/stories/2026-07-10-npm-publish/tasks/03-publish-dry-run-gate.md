---
title: Verify publishability via npm publish --dry-run
specialty: qa
tier: pleno   # unbiased verification gate; qa has no junior tier, pleno is the floor for running the checks
complexity: S
depends_on: ["01-license-and-metadata", "02-smoke-test-and-prepublish"]
parallel: false
status: done
---

## Description
Unbiased gate. Do NOT modify source to make checks pass — if a check fails, the task fails
and goes back to the techlead. Run every check yourself:

1. `npm test` (from task 02) exits 0.
2. `npm publish --dry-run` exits 0 (no auth needed for a dry run). Capture the "Tarball
   Contents" listing (equivalently `npm pack --dry-run`).
3. Assert the pack manifest **INCLUDES**: `package.json`, `README.md`, `LICENSE`, every
   file under `bin/`, and every file under `templates/`.
4. Assert the pack manifest **EXCLUDES**: `HANDOFF.md`, `.squad/`, `.claude/`, `test/`, and
   any `*.new` / scratch files.
5. Confirm `package.json` has `repository`, `homepage`, `bugs`, `license`, `files`,
   `keywords`, `bin`, and `engines` — and that `license` value matches the `LICENSE` file.
6. Confirm no `dependencies`/`devDependencies` were introduced (zero-dep invariant).

Do not run a real `npm publish` — dry-run only.

## Definition of Done
- A short PASS/FAIL report listing each of the 6 checks with the observed result.
- All 6 checks PASS; if any fails, mark the task `failed` with the specific check and hand
  back — do not edit source to force a pass.

## Review

Verified as an unbiased gate (did not modify any source). All 6 checks PASS.

1. **`npm test` exits 0 — PASS.**
   `node test/smoke.js` ran via `npm test`, output `smoke test passed`, exit code 0.

2. **`npm publish --dry-run` exits 0 — PASS.**
   Ran with no `--otp`/auth flags needed. Output ended with
   `npm notice Publishing to https://registry.npmjs.org/ with tag latest and default access (dry-run)`
   and `+ pocket-squad@0.1.0`, exit code 0. `prepublishOnly` (the task-02 smoke test) ran
   automatically as part of the dry-run and passed. Cross-checked with
   `npm pack --dry-run --json` (also exit 0) — identical 26-entry file list.

3. **Pack manifest INCLUDES required files — PASS.**
   Tarball contains `package.json`, `README.md`, `LICENSE`, `bin/pocket-squad.js` (the only
   file under `bin/` on disk — matches), and all 22 files under `templates/`
   (`find templates -type f` on disk = 22 files; pack manifest templates/* entries = 22,
   byte-for-byte path match, including the 0B `templates/squad/stories/.gitkeep`). Total
   entryCount 26 = 4 root files + 22 template files.

4. **Pack manifest EXCLUDES scratch/internal files — PASS.**
   `HANDOFF.md`, `.squad/`, `.claude/`, `test/` do not appear anywhere in the 26-entry
   tarball listing. `find . -name "*.new"` (excluding `.git`) returned no matches in the
   repo, and none appear in the pack output either.

5. **`package.json` required fields — PASS.**
   Present: `repository` (`git+https://github.com/Tuliof210/pocket-squad.git`),
   `homepage`, `bugs`, `license: "MIT"`, `files: ["bin","templates","README.md"]`,
   `keywords`, `bin.pocket-squad`, `engines.node: ">=18"`. `LICENSE` file body is the
   standard MIT permission/warranty text, matching `license: "MIT"`.

6. **Zero-dep invariant — PASS.**
   `package.json` has no `dependencies` or `devDependencies` key at all (confirmed by
   reading the full file, 13 lines, no such keys present).

**Housekeeping:** no `*.tgz` was left behind by `npm pack --dry-run --json` /
`npm publish --dry-run` (both dry-run commands don't write a tarball to disk); confirmed
via `find . -maxdepth 2 -name "*.tgz"` returning nothing, and `git status --short` shows
no new untracked `.tgz` file.

**Verdict: APPROVED.**
