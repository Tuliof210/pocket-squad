# Pull request template

The PR is the durable evidence that the requested outcome and applicable protocols were satisfied.
Write it in the request's language. Keep exact commands, paths and SHAs; remove empty optional sections.

```markdown
## Outcome

<What becomes possible or correct after this change, in 2–4 sentences.>

## Context

- Request or plan: <link or `.squad/changes/<id>.prompt.md`; `inline` for a small change>
- Base: `<branch>` at `<base sha>`
- Head reviewed: `<head sha or pending>`
- Risk class: `<small|risk-bearing>`

## Changes

- **<Area or step>** — <what changed and why> — R1

## Protocol evidence

| Protocol | Evidence |
|---|---|
| P002 | `<worktree>` · `<branch>` · base `<sha>` |
| P004 | <why every changed area belongs to the request> |
| P005 | <verification summary> |
| P006 | <commit summary> |
| P007 | <review lens and exact SHA, or `pending`> |
| P009 | <this PR URL, base branch and current head SHA> |

## Verification

- `<command or manual procedure>` — <result> — R1

## Decisions and risk

- <Decision, remaining risk and mitigation.>

## Rollout and rollback

- **Rollout** — <steps or `none`>.
- **Rollback** — <steps or `revert`>.

## Known gaps

- <Deliberately excluded work and what would justify doing it.>
```
