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

## Recent Frontend Guardrails
- Keep header mobile behavior at `940px` breakpoint.
  Reference implementation:
  `frontend/src/components/layout/header.tsx`,
  `frontend/src/index.css`.
- Keep board list heading semantic as `<h1>`.
  Reference:
  `frontend/src/pages/board/board-list.tsx`.
- Do not remove raw HTML table support from board markdown rendering.
  Keep `rehype-raw` and `rehype-sanitize` usage in:
  `frontend/src/pages/board/board-detail.tsx`,
  `frontend/src/pages/board/board-write.tsx`.
- Preserve board table styling (dark header + light body + centered text + horizontal scroll wrapper).
  Reference:
  `frontend/src/pages/board/board-detail.module.scss`,
  `frontend/src/pages/board/board-write.module.scss`.
- In event summary modal, prefer rendering detected HTML tables as real `<table>` blocks.
  Do not refactor into card/group summary UI when source contains table markup.
  Reference:
  `frontend/src/pages/game/events.tsx`.
- Keep table sanitizer in event summary strict for layout stability:
  remove inline `style/width/height` from
  `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `colgroup`, `col`.

## Recent Backend Guardrails
- Keep backend readability refactors behavior-preserving:
  extract normalization/validation helpers in services, avoid deep inline branching.
- Prefer explicit response types in controllers (`ResponseEntity<Map<String, Object>>` etc.) when schema is fixed.
- Avoid repeated response-map assembly in controllers; centralize via private helper methods.
- When soft-delete query method names become too verbose, switch to readable repository method names with `@Query`.
- For generic server errors, return stable client-safe messages and log details server-side.
