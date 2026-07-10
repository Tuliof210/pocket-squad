---
title: Zero-dep smoke test + prepublishOnly wiring
specialty: devops
tier: pleno   # small script with local design decisions (temp-dir isolation, assert flow) and no existing test precedent in the repo
complexity: S
depends_on: ["01-license-and-metadata"]
parallel: false
status: done
---

## Description
Add a plain Node smoke test — NO test framework, NO new dependency (ponytail: this repo
has none and must stay zero-dep; a `node:assert` script is enough).

1. **Create `test/smoke.js`** using only built-ins (`node:assert`, `node:fs`, `node:os`,
   `node:path`, `node:child_process`). It must:
   - Make a fresh temp dir (`fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-squad-'))`).
   - Run `node <repo>/bin/pocket-squad.js install` with `cwd` = that temp dir
     (`execFileSync`), assert it exits 0.
   - Assert the install created `.claude/pocket-squad.manifest.json`, at least one file
     under `.claude/agents/`, and `.squad/project-context.md` in the temp dir.
   - Run `node <repo>/bin/pocket-squad.js status` in the temp dir, assert exit 0 and that
     output contains `managed`.
   - Clean up the temp dir (`fs.rmSync(dir, { recursive: true, force: true })`).
   - On any failure, throw / exit non-zero so `npm test` fails loudly.
   Derive the repo root from `__dirname` (`path.resolve(__dirname, '..')`), do not hardcode
   an absolute path.
2. **Edit `package.json` `scripts`** (create the `scripts` object; it does not exist yet):
   ```json
   "scripts": {
     "test": "node test/smoke.js",
     "prepublishOnly": "node test/smoke.js"
   }
   ```
   Do not add `test/` to `files` — the smoke test must NOT ship in the tarball (the `files`
   allowlist already excludes it; leave it that way). Do not touch task 01's keys.

## Deliverable / contract (downstream depends on this)
- `npm test` and `npm run prepublishOnly` both execute `test/smoke.js` and pass on a clean
  checkout. Task 03 runs `npm test` as part of its gate and relies on this exit-code
  contract.

## Definition of Done
- `npm test` exits 0 on the current repo.
- Forcing a failure (temporarily point install at a bad path) makes `npm test` exit
  non-zero — verify the assert actually bites, then revert.
- No entry added to `dependencies`/`devDependencies`; `test/` absent from `files`.

## Implementation notes
Files changed:
- `test/smoke.js` (new) — zero-dep smoke test using `node:assert`/`fs`/`os`/`path`/`child_process`
  only. Derives repo root via `path.resolve(__dirname, "..")`, makes a temp dir with
  `fs.mkdtempSync`, runs `install` then `status` via `execFileSync` (which throws on non-zero
  exit — that's the exit-code assertion), asserts the manifest/agents/project-context.md
  artifacts and the `status` output containing `managed`, and always cleans up the temp dir
  in a `finally` block.
- `package.json` — added the `scripts` object (didn't exist) with `test` and
  `prepublishOnly` both set to `node test/smoke.js`. No other keys touched; `files` left as
  `["bin", "templates", "README.md"]` (test/ not shipped).

DoD verification:
- `npm test` on the clean repo: exits 0, prints "smoke test passed".
- Fault injection: temporarily changed the `execFileSync` call to invoke a nonexistent path
  (`/tmp/definitely-not-a-real-cli.js`) instead of the real CLI, ran `npm test` — it crashed
  with `MODULE_NOT_FOUND` inside the child process, `execFileSync` threw, and the process
  exited with code 1 (verified via `echo $?`), proving the exit-0 assertion actually bites.
  Reverted the change immediately after; `npm test` passes again (exit 0).
- Confirmed `node -e "require('./package.json')"` shows no `dependencies`/`devDependencies`
  keys, and `files` is unchanged (`["bin", "templates", "README.md"]`) — `test/` is absent.

## Review

**APPROVED**

Verified independently (not the implementer), all from a clean checkout:

1. `npm test` → exit 0, `smoke test passed` printed (`echo $?` confirmed `0`).
2. Inspected `test/smoke.js` line by line:
   - Only `require("node:assert")`, `node:fs`, `node:os`, `node:path`,
     `node:child_process` — grepped for `require(` and confirmed no third-party imports.
   - `REPO_ROOT = path.resolve(__dirname, "..")` — no hardcoded absolute path.
   - `fs.mkdtempSync(path.join(os.tmpdir(), "pocket-squad-"))` for the temp dir, cleaned up
     via `fs.rmSync(dir, { recursive: true, force: true })` inside a `finally` block (runs
     on both success and failure paths).
   - Runs `install` then `status` via `execFileSync` with `cwd: dir`.
   - Asserts `.claude/pocket-squad.manifest.json`, at least one file under
     `.claude/agents/`, and `.squad/project-context.md` all exist in the temp dir, and that
     `status` stdout contains `"managed"`.
3. Fault injection, done myself independently of the implementer's own account: edited
   `test/smoke.js` to point `CLI` at `bin/does-not-exist.js` (backed up the original first).
   Ran `npm test` — it threw `MODULE_NOT_FOUND` inside the child process, `execFileSync`
   propagated the failure, and the process exited non-zero (`echo $?` → `1`). Restored the
   original file from the backup, diffed it byte-identical against the pre-edit version, and
   reran `npm test` — exit 0, `smoke test passed` again. Confirms the assertions genuinely
   bite on breakage, not just on paper.
4. `package.json`: `git diff package.json` shows the implementer's only change is the new
   `scripts` key (`{"test": "node test/smoke.js", "prepublishOnly": "node test/smoke.js"}`);
   the `repository`/`homepage`/`bugs`/`license` lines in the diff belong to task 01 (already
   approved), not this task. `files` is unchanged
   (`["bin", "templates", "README.md"]`) — `test/` is not listed. `dependencies` and
   `devDependencies` are both absent (`node -pe` checks on both returned `null`).
5. Cleanliness: after all verification (including two fault-injected `npm test` runs), `git
   status --porcelain` shows only the same pre-existing changes the implementer left
   (`board.md`, `story.md`, both task files, `package.json` modified; `LICENSE` and `test/`
   untracked) — no stray files, and no leftover `pocket-squad-*` temp dirs in `/tmp` or
   `$TMPDIR`.

Scope: only `test/smoke.js` (new) and the `scripts` addition to `package.json` are this
task's footprint — matches the task boundary exactly.
