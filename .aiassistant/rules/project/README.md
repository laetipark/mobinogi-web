# Project Rules Index

Shared rules for assistants working on `mobinogi-web`.

## Scope
- This folder is git-safe and intended for commit.
- Do not include private URLs, real tokens, server IPs, usernames, or secret values.
- Keep deploy-server-specific settings in `../local` overlays.

## Module Context
- `mobinogi-web` is a combined backend + frontend module.
- Backend: Spring Boot (`src/`)
- Frontend: React/Vite (`frontend/`)
- Infra/packaging: Docker + Nginx + Maven frontend integration

## Read Order (Global First, Then Area)
1. `architecture-overview.md`
2. `text-encoding-policy.md`
3. `performance-policy.md`
4. `backend-development-guide.md` (if backend change)
5. `frontend-development-guide.md` (if frontend change)
6. Relevant module file(s) in `modules/`
7. Relevant implementation patterns:
   - `backend-patterns.md`
   - `frontend-patterns.md`

## Module Rules Map
- `modules/auth-user-module.md`
  - Login, nickname registration, Discord callback/link, profile, character management.
- `modules/board-module.md`
  - Board list/detail/write/comments/history, slug URL policy, markdown/table rendering.
- `modules/game-content-module.md`
  - News, events, items/barter/craft pages and related rendering/ordering guardrails.
- `modules/todo-module.md`
  - Character-scoped todo workflow, autosave and checklist behavior.
- `modules/gallery-module.md`
  - Photo board CRUD, likes, drag/drop upload flow.

## Working Rules
- If API shape/DTO changes, verify frontend types/service usage in the same change.
- If frontend filtering/sorting behavior changes, check backend query/sort rules for consistency.
- Prefer backend+frontend build/compile verification after cross-cutting changes.
- Keep URL slug policy and item detail modal/page routing behavior backward compatible unless requested.

## How Rules Connect
- `architecture-overview.md` defines domain boundaries.
- Backend/frontend guides define cross-cutting coding standards.
- Module files define feature-specific behavior and invariants.
- Pattern files provide implementation templates to keep style consistent.

## Maintenance Rules
- Keep module rules behavior-oriented and code-path specific.
- Keep examples generic and reusable.
- Move private setup/deployment/internal values to `../local`.
- If conventions change, update this folder first, then local overlays.
