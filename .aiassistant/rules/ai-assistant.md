---
apply: always
---

# AI Assistant Rules Entry

This assistant must use `.aiassistant/rules/project` as the shared, commit-safe rule source.

## Required Rules (Git-safe, Always Load)
Read in this order.
1. `project/README.md`
2. `project/architecture-overview.md`
3. `project/backend-development-guide.md`
4. `project/frontend-development-guide.md`
5. Module rule files under `project/modules/*.md` that match the task scope.
6. Pattern guides:
   - `project/backend-patterns.md` when changing backend code
   - `project/frontend-patterns.md` when changing frontend code

## Optional Local Rules (Gitignored, Private Overlay)
Load only when task requires private environment or deployment context.
- `local/README.md`
- `local/environment-configuration.md`
- `local/deployment-secrets.md`
- Other `local/*.md` files that include machine-specific or private operational notes

## Execution Policy
- `project` rules are source-of-truth for shared behavior.
- `local` rules are private overlays and must never be copied into `project`.
- If a rule conflicts, apply in this precedence:
  1. Task-specific module file (`project/modules/*.md`)
  2. Shared project guides
  3. Local private overlays (only for environment/deploy/runtime differences)
