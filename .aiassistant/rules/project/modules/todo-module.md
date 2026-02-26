# Todo Module Rules

## Scope
- Character-based daily/weekly todo tracking
- Favorite item management and checklist persistence
- Autosave, reorder, and per-character state transitions

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/user/todo.tsx`
  - `frontend/src/components/todo/*`
  - `frontend/src/components/user/sortable-character-list.tsx`
- Backend:
  - Todo/character related controllers and services under
    `src/main/java/com/example/mobinogi`

## Invariants
- Todo data is character-scoped and must preserve selected character context.
- Autosave debounce behavior must remain stable and avoid duplicate saves.
- Shared-server daily fields must propagate consistently to characters on the same server.
- Reorder mode changes sequence only; do not mutate character ownership or identity fields.

## SEO/Indexing
- `/todo` is a personal page and should remain non-indexable metadata.

## Dependencies
- Shared rules: `../frontend-development-guide.md`, `../backend-development-guide.md`
- Related modules:
  - `auth-user-module.md` for login/session dependency
  - `game-content-module.md` for item/event data references

