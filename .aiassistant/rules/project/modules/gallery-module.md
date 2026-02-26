# Gallery Module Rules

## Scope
- Photo board list/detail/create/update/delete
- Like toggle behavior and drag/drop upload flow
- Board and portfolio display modes

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/photo/photo-board.tsx`
  - `frontend/src/services/photo-board-service.ts`
  - `frontend/src/services/upload-service.ts`
- Backend:
  - Photo board CRUD/like/upload controllers and services

## Invariants
- Drag-and-drop upload must support:
  - page-level drop to open create flow
  - modal-level drop for create/edit image replacement
- Like interaction may be optimistic on UI but must reconcile with API response.
- Detail modal is source-of-truth for selected post state; list state must sync after update.
- Search/tag filter and view mode should not break pagination state transitions.

## SEO/Canonical
- Gallery page canonical path remains `/gallery`.
- Gallery detail is modal-based; keep page-level metadata focused on gallery listing context.

## Dependencies
- Shared rules: `../frontend-development-guide.md`
- Related modules:
  - `auth-user-module.md` for owner-only actions
  - `board-module.md` for content sharing style consistency

