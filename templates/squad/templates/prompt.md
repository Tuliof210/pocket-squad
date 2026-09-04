# Change plan template

Use this template only for risk-bearing changes or when materially different implementations remain
possible. Small, localized changes do not need a committed plan.

Write the plan in the language of the conversation. Replace every placeholder and remove guidance
that does not apply.

```markdown
---
schema: pocket-squad/change-plan/v1
id: <yymmdd-hhmm-short-slug>
base_branch: <branch>
base_sha: <sha>
risk_class: risk-bearing
risk_level: <medium|high>
protocols: [P001, P002, ...]
---

# <Short outcome-oriented title>

## Outcome

R1. <Observable, independently acceptable result.>
R2. <Observable result.>

## Context and evidence

- **Imitate** `<path>` — <specific pattern and why it applies>.
- **Reuse** `<symbol>` in `<path>` — `<signature>`.
- **Constraint** — <product, architecture or protocol constraint and its source>.

## Decisions

- **Contract** — <new or changed public shape; omit when none>.
- **Flow** — <ordering, atomicity or failure behavior when not obvious>.
- **Chose X over Y** — <reason that changes implementation>.

## Risks

- **<Risk>** — likelihood: <low|medium|high>; impact: <...>; mitigation: <...>.

## Steps

1. <Reviewable implementation outcome> → R1 · P00X
2. <Reviewable implementation outcome> → R2 · P00Y

## Verification

- R1 · P005: `<exact command or manual procedure>` — <passing evidence>.
- R2 · P005: `<exact command or manual procedure>` — <passing evidence>.

## Rollout and rollback

- **Rollout** — <deployment, migration or activation sequence; `none` when not applicable>.
- **Rollback** — <safe reversal path and data caveat; `revert commits` when sufficient>.

## Scope

- **In** — <paths and behaviors>.
- **Out** — <adjacent work deliberately excluded>.
- **Forbidden** — <contracts, files or approaches that must not change>.
```
