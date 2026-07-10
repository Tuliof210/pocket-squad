---
title: Zero-dep smoke test + prepublishOnly wiring
specialty: devops
tier: pleno   # small script with local design decisions (temp-dir isolation, assert flow) and no existing test precedent in the repo
complexity: S
depends_on: ["01-license-and-metadata"]
parallel: false
status: todo
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
