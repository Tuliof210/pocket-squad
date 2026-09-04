---
name: ps-audit
description: Audit Pocket Squad governance for drift, contradictions, unenforced protocols, stale commands, and broken references. Use for an explicit governance or workflow audit; remain read-only unless the user separately asks for fixes.
---

# Audit governance

Read `AGENTS.md`, the three canonical documents, nested instruction files, manifests, CI and representative
code paths. Change nothing.

Check:

- PRODUCT describes current users, capabilities, domain terms and boundaries without architecture rules.
- ARCHITECTURE matches real entry points, dependencies, commands, boundaries and exemplars.
- PROTOCOLS contains unique IDs, objective triggers, mandatory behavior, evidence and enforcement; no rule
  conflicts with user authority, repository tooling or a closer nested instruction.
- AGENTS is a small bootstrap, points to all three files, establishes precedence and preserves nested overrides.
- Every referenced path exists and every declared command is present in a manifest, task runner or CI.
- Mechanically enforceable `MUST` rules have a real script, hook or CI check; prose-only enforcement is named.
- Recent changes since the last governance update introduce no undocumented capability, boundary or protocol.

Run `node .agents/scripts/pocket-squad.js preflight` only if the checkout is expected to be clean; otherwise
report why it could not be used. Rank findings as blocker, major or minor. Each finding names the stale claim,
current evidence, impact and smallest correction. Distinguish observed facts from recommendations.
