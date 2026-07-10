---
name: ps-backend-security
description: >
  Pocket Squad backend skill: security at trust boundaries. Use when handling
  auth, sessions, tokens, secrets, user input, file uploads, or any code
  reachable by untrusted callers.
---

# Security — Pocket Squad backend skill

Everything that crosses a trust boundary is hostile until validated. Security is the
one place the squad is never lazy.

## Non-negotiables

- **Secrets never in code, diffs, or logs.** Environment/config only. A secret in a
  committed file fails review even if the file is gitignored later.
- **AuthN before authZ before handler.** Every non-public endpoint states who may call
  it, and the check runs server-side on every request — not only in the UI.
- **Authorize the object, not just the route.** `GET /orders/:id` must verify the
  order belongs to the caller (IDOR is the most common squad-level bug).
- **Injection:** parameterized queries, escaped shell args (prefer no shell at all),
  encoded output into HTML/headers. Never concatenate untrusted input into anything
  executable.
- **Passwords/tokens:** use the project's existing hashing/signing helpers; never
  hand-roll crypto. Compare secrets with constant-time comparison.
- **Uploads/deserialization:** allowlist type + size limit + never execute or path-join
  user-supplied names (`../` traversal).
- Rate-limit or lock out repeated auth failures when the task touches login flows.

## When in doubt

A security decision not written in the task file is a techlead decision: set
`status: blocked` and escalate. Auth/security-sensitive stories are CRITICAL — their
PR is left open for the owner to merge manually.

## Definition of done for security-sensitive work

Each rule above that applies is verifiably true (test or demonstrated check), and the
task file's `## Implementation notes` names the trust boundary and how it is guarded.
