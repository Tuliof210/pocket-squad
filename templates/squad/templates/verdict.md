# Review verdict template

Review only the recorded worktree and exact head SHA. Findings corrected on another SHA invalidate
approval until the delta is reviewed.

```markdown
## Review · <lens>

- PR: <number or URL>
- Base: `<base sha>`
- Reviewed head: `<head sha>`
- Plan: <path or `inline PR contract`>
- Protocols checked: <P00X, ...>

### Verification

- `<command or inspection>` — <result and requirement/protocol proved>
- **Not run:** <check> — <specific reason>

### Findings

1. **[blocker|major|minor] `<path>:<line>` · Rn · P00X** — <observable problem>.
   - Impact: <what breaks>.
   - Fixed when: <observable closure condition>.
   - Verify with: `<command or inspection>`.

### Verdict

`APPROVED at <head sha>`

or

`FINDINGS at <head sha>`
```
