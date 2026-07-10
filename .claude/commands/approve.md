---
description: Approve a drafted Story after the owner reviewed/edited it. Usage - /approve [story-slug]
---

Target story: "$ARGUMENTS" (if empty, use the single story with `status: draft`; if
multiple drafts exist, ask which one).

1. Re-read `story.md` and every task file — the owner may have edited them. Their edits
   are law.
2. Validate the plan: no dangling `depends_on`, every task has tier + justification +
   verifiable DoD, dependency-defined contracts are specified upstream.
3. Show the owner a one-screen summary: tasks, tiers, estimated relative cost
   (sum of complexity × tier), execution order/parallel groups.
4. On explicit owner confirmation, set `status: approved` in `story.md`.

Never start execution here — that is /run.
