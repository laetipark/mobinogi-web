---
apply: always
---

# Frontend Development Guide

## Styling
- Use SCSS Modules (`*.module.scss`) for component-level styles.
- Keep global styles under `frontend/src/styles` and `frontend/src/index.css`.
- Avoid introducing a second styling system unless explicitly approved.

## Type System
- Keep types domain-split (for example: `auth.ts`, `board.ts`, `todo.ts`).
- Re-export all public types from `frontend/src/types/index.ts`.
- Import shared types from `@/types` whenever possible.

## API Service Layer
- Route API calls through service modules under `frontend/src/services`.
- Avoid direct axios usage in page/components when a service module exists.
- Service return types should follow `ApiResponse & { data: T }`.
- Export each new service via `frontend/src/services/index.ts`.

## State and Auth
- Use context/hooks pattern for auth state.
- Keep token handling centralized (interceptor + auth utility).
- Avoid duplicate auth logic in feature components.

## Component Conventions
- Keep files and folders in kebab-case.
- Split large components by feature responsibility.
- Keep side effects isolated in hooks and lifecycle sections.

## Build and Validation
- Type check: `npx tsc --noEmit`
- Build: `npm run build`
- Lint (if configured): `npm run lint`
