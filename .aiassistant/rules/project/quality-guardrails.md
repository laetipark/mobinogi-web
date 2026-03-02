---
apply: always
---

# Quality Guardrails

## Objective
- Prevent text encoding regressions.
- Prevent unnecessary Unicode escape usage.
- Reduce slow or unstable execution during development and runtime.

## Encoding Guardrails
- Save edited files as UTF-8 only.
- Never re-save tracked files as CP949/EUC-KR/ANSI.
- Keep line endings unchanged unless the task explicitly requires conversion.
- Avoid full-file overwrite commands on existing tracked files.
  Use minimal patch edits for targeted changes.
- If terminal output is garbled, do not copy that text back into source.

## Unicode Literal Guardrails
- Do not add `\uXXXX` literals for user-facing text in Java/TypeScript/JavaScript.
- Prefer readable UTF-8 literals when non-ASCII text is needed.
- Allowed exception:
  - regex/control/protocol escapes where escaping is technically required.

## Execution Guardrails (Backend + Frontend)
- Before broad edits, locate exact files/symbols with fast search (`rg`) and patch only needed areas.
- Parallelize independent reads/checks to reduce turnaround time.
- Keep one focused build/compile at the end of a coherent change set.
- Avoid repeated full builds after each tiny edit.
- For long commands (build/test), use async waiting workflow and report clear status.

## API/Runtime Responsiveness Guardrails
- Avoid synchronous request chains that can exceed client timeout.
- For long work, return quickly and process asynchronously when possible.
- Add deterministic status keys for polling flows (for example Redis status by guild ID).
- Keep retry logic bounded and include clear cooldown/backoff policy.

## Validation Checklist
- Unicode escape scan: `rg -n "\\\\u[0-9a-fA-F]{4}" src frontend`
- Garbled text scan: `rg -n "占? src frontend`
- Backend compile (if backend touched): `./mvnw -q -Pbackend-dev -DskipTests compile`
- Frontend build (if frontend touched): `cd frontend && npm run build`
