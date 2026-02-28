---
apply: always
---

# Performance Policy

## Objective
- Improve latency and resource usage without changing externally visible behavior.
- Prefer measurable optimizations over speculative micro-tuning.

## Backend Rules
- Avoid loading full entities when summary/list APIs only need a subset of fields.
  Prefer projection queries (interface/DTO) for list responses.
- Keep expensive aggregation in DB when possible (`COUNT`, `GROUP BY`, `DISTINCT`)
  instead of repeated in-memory scans.
- Prevent N+1 query patterns in service loops.
  Use batch queries by IDs and pre-group results in one pass.
- Be explicit with fetch strategy. Do not introduce new `EAGER` relations unless required.
- Keep sort/category ordering logic in one layer. Do not duplicate ordering rules
  across service and repository query `CASE` clauses unless DB-side sort is required.

## Frontend Rules
- Avoid recomputing heavy derived values on every render.
  Use memoization (`useMemo`) or precomputed map structures where needed.
- Keep list rendering stable:
  - Use stable keys
  - Avoid unnecessary re-renders in large lists
- Prefer loading only required data for current view/state.
- For large route-level features, keep code-splitting and chunk boundaries intact.

## Change Discipline
- For performance-related changes, include a short note in PR/commit context:
  - What was reduced (query count, rows loaded, CPU work, bundle size, etc.)
  - Why behavior remains equivalent
- If optimization changes data shape, verify backend DTO and frontend type/service usage together.

## Validation Checklist
- Backend compile: `./mvnw clean compile -DskipTests -q`
- Frontend build: `npm run build`
- For DB-heavy endpoints, log/inspect query count and response time before and after.
- Prefer one representative real endpoint benchmark over synthetic micro-benchmarks.
