---
title: Add LICENSE + repository/homepage/bugs metadata
specialty: devops
tier: junior   # mechanical, fully specified: drop a standard MIT file + add fixed package.json keys, zero design decisions
complexity: S
depends_on: []
parallel: false
status: done
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

## Review

**APPROVED**

Verified independently (not the implementer):

1. `node -e "require('./package.json')"` — exit 0. Printed `repository`, `homepage`,
   `bugs` and all three match the task spec verbatim, including the remote
   `git+https://github.com/Tuliof210/pocket-squad.git`.
2. `LICENSE` exists at repo root, 19 lines, canonical MIT body text verified word-for-word
   against the standard template, header line is exactly
   `Copyright (c) 2026 Tulio Ferreira` as the task specified (task explicitly defines the
   header as the copyright line, not an `MIT License` title line — matches spec).
3. `git diff package.json` — only the three new keys added, appended after the existing
   `license` key; `name`, `version`, `description`, `bin`, `files`, `engines`, `keywords`,
   `license` are byte-identical to `HEAD`. No dependency fields added (none existed
   before, none now).
4. `git status --porcelain` also shows `.squad/stories/2026-07-10-npm-publish/board.md`
   and `story.md` modified (todo→doing board move, draft→in_progress story status). These
   are mandated by the squad orchestration itself (techlead's `/run` sets
   `story: in_progress` on dispatch; `devops-junior.md` step 4 requires updating
   `board.md` before starting work) — not implementer scope creep. Task-owned files
   (`LICENSE`, `package.json`) are exactly the two touched; no application code, no other
   config.

Process note (non-blocking): the implementer did not set `status: review` or add an
`## Implementation notes` section as required by `devops-junior.md`'s handoff step —
setting `status: done` directly here since the technical work is verified correct. Worth
a nudge for the next junior task so the handoff trail stays complete.
