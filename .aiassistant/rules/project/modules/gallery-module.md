# Gallery Module Rules

## Scope
- Community gallery + guild gallery list/detail/create/update/delete
- Like toggle behavior and drag/drop upload flow
- Board and portfolio display modes

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/photo/photo-board.tsx`
  - `frontend/src/pages/guild/guild-gallery.tsx`
  - `frontend/src/pages/guild/guild-page-base.tsx` (guild gallery section)
  - `frontend/src/services/photo-board-service.ts`
  - `frontend/src/services/guild-service.ts` (guild gallery APIs)
  - `frontend/src/services/upload-service.ts`
- Backend:
  - Photo board CRUD/like/upload controllers and services
  - Guild gallery CRUD/like endpoints in guild management controller/service

## Invariants
- Drag-and-drop upload must support:
  - page-level drop to open create flow
  - modal-level drop for create/edit image replacement
- Like interaction may be optimistic on UI but must reconcile with API response.
- Detail modal is source-of-truth for selected post state; list state must sync after update.
- Search/tag filter and view mode should not break pagination state transitions.

## Community <-> Guild Parity Rule
- Community gallery and guild gallery are mirrored UX domains.
- If one side changes its core composition, apply a similar update to the other side in the same change set.
- "Core composition" includes:
  - board/portfolio layout structure
  - card/table metadata arrangement
  - detail viewer controls (navigation/like/edit/delete)
  - tag input/filter UX and interaction conventions
  - loading/empty/error presentation
- Allowed divergence:
  - guild-specific permission and membership constraints
  - guild identity/context-only metadata
- If divergence is intentional, document the reason explicitly in the PR description.

## SEO/Canonical
- Gallery page canonical path remains `/gallery`.
- Gallery detail is modal-based; keep page-level metadata focused on gallery listing context.

## Dependencies
- Shared rules: `../frontend-development-guide.md`
- Related modules:
  - `auth-user-module.md` for owner-only actions
  - `board-module.md` for content sharing style consistency
