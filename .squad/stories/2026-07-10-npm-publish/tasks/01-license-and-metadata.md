---
title: Add LICENSE + repository/homepage/bugs metadata
specialty: devops
tier: junior   # mechanical, fully specified: drop a standard MIT file + add fixed package.json keys, zero design decisions
complexity: S
depends_on: []
parallel: false
status: todo
---

## Description
Two mechanical edits, no logic:

1. **Create `LICENSE`** at the repo root — the standard MIT License text (default per
   story; owner may override the license choice). Header line:
   `Copyright (c) 2026 Tulio Ferreira` (git author). Use the canonical MIT text verbatim.
2. **Edit `package.json`** — add these three keys (keep the existing keys/order otherwise;
   `license: "MIT"` already present, leave it). Repo remote is
   `https://github.com/Tuliof210/pocket-squad.git`:
   ```json
   "repository": { "type": "git", "url": "git+https://github.com/Tuliof210/pocket-squad.git" },
   "homepage": "https://github.com/Tuliof210/pocket-squad#readme",
   "bugs": { "url": "https://github.com/Tuliof210/pocket-squad/issues" }
   ```
   Do NOT touch `files`, `bin`, `keywords`, `engines`, or `version`. Do NOT add any
   dependency. `LICENSE` does not need to be added to `files` — npm ships it automatically.

## Deliverable / contract (downstream depends on this)
- A root `LICENSE` file and a `package.json` that still parses as valid JSON and keeps the
  existing `files` allowlist intact. Task 03 asserts `LICENSE` appears in the pack manifest.

## Definition of Done
- `node -e "require('./package.json')"` exits 0 (valid JSON) and prints/contains the new
  `repository`, `homepage`, `bugs` keys.
- `LICENSE` exists at repo root with MIT text and the copyright header.
- `git diff --stat` shows only `LICENSE` (new) and `package.json` changed.
