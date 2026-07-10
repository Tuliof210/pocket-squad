---
title: Verify publishability via npm publish --dry-run
specialty: qa
tier: pleno   # unbiased verification gate; qa has no junior tier, pleno is the floor for running the checks
complexity: S
depends_on: ["01-license-and-metadata", "02-smoke-test-and-prepublish"]
parallel: false
status: todo
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
