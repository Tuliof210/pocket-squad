---
name: ps-backend-data
description: >
  Pocket Squad backend skill: database access and migrations. Use when writing
  queries, changing schema, adding migrations, indexes, or transactions, or
  touching any persistence code.
---

# Database & migrations — Pocket Squad backend skill

Data outlives code. A wrong migration is the one mistake a redeploy cannot fix.

## Queries

- **Parameterize everything.** String-built SQL is an automatic review fail.
- Use the project's existing data-access layer (repo/ORM/query helper). Never open a
  second path to the database beside the existing one.
- Wrap multi-write operations in a transaction; a half-applied write is corruption.
- N+1s: batch or join when the task touches a list endpoint. Check the query count.

## Migrations

- **One migration per task, reversible.** Write the `down` (or document why it is
  impossible — that makes the story CRITICAL: its PR is not auto-merged).
- Destructive operations (DROP, column removal, type narrowing, mass UPDATE/DELETE)
  are never combined with additive ones in the same migration, and always flag the
  story as critical.
- Expand → migrate → contract: add the new column/table first; remove the old one in
  a later story, after the code no longer reads it.
- New query filters on a large table → add the index in the same migration.

## Definition of done for persistence work

Migration applies AND rolls back cleanly on a fresh database; queries go through the
existing layer, parameterized; behavior covered by an honest test that exercises the
real schema (not a mock of it) where the project's test setup allows.
