---
name: ps-backend-api
description: >
  Pocket Squad backend skill: API design and contracts. Use when creating or
  changing HTTP/RPC endpoints, request/response schemas, error formats,
  pagination, versioning, or any contract another module or task consumes.
---

# API design — Pocket Squad backend skill

The contract is the deliverable. Downstream tasks consume it verbatim — write it
first, exactly as the task file specifies, and never change it silently.

## Rules

- **Imitate the neighboring endpoint.** Same router file, same middleware chain, same
  response envelope, same naming. A new style in one endpoint is a defect.
- **Errors are part of the contract.** Use the project's existing error shape and
  status codes (400 validation, 401 unauthenticated, 403 unauthorized, 404 absent,
  409 conflict). Never leak stack traces or internal identifiers in error bodies.
- **Validate at the boundary.** Every input (body, query, params, headers) is
  validated/coerced at the edge with the project's existing validator. Handlers
  receive typed, trusted data only.
- **Idempotency:** GET/PUT/DELETE idempotent always; retried POSTs must not duplicate
  effects where the task says so (use an idempotency key or upsert).
- **Pagination/filtering:** copy the pattern the codebase already uses (cursor or
  offset). Never invent a second pagination style.
- **Breaking change to a published contract?** That is a techlead decision — set
  `status: blocked` and escalate. Additive changes (new optional field) are fine.

## Definition of done for an endpoint

Route + validation + the documented contract (schema in/out and error cases, written
in the task file) + one honest test per behavior branch (success, validation fail,
authz fail).
