---
apply: always
---

# AI Assistant Rules Entry

This assistant must use `.aiassistant/rules/project` as the shared rule source.

## Required Rules (Git-safe)
Read in this order:
1. `project/README.md`
2. `project/architecture-overview.md`
3. `project/backend-development-guide.md`
4. `project/frontend-development-guide.md`

## Optional Local Rules (gitignored)
Load only when needed for local environment or private deployment:
- `local/backend-patterns.md`
- `local/frontend-patterns.md`
- `local/environment-configuration.md`
- `local/deployment-secrets.md`

## Execution Policy
- Prefer project rules when conflict exists.
- Never copy private local secrets into project rules.
- Keep project rules generic and commit-safe.
