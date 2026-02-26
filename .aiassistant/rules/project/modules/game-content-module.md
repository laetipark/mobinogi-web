# Game Content Module Rules

## Scope
- News page, events page, items/barter/craft data pages
- Event summary rendering and table sanitization

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/game/news.tsx`
  - `frontend/src/pages/game/events.tsx`
  - `frontend/src/pages/game/game-items.tsx`
- Backend:
  - News/event/item data APIs and related services

## Invariants
- Event summary rendering:
  - If source includes table markup, render as real `<table>` first.
  - Do not replace HTML-table source with card-only UI.
- Event summary sanitizer must remove inline layout attributes from table elements:
  - `style`, `width`, `height` on
    `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `colgroup`, `col`
- Keep events timeline/calendar behavior stable when refactoring.
- Items detail path must remain shareable (`/items/:itemName/detail`) and SEO-friendly.

## SEO/Canonical
- Set page-level SEO per tab/state where meaningful (news type, item detail name).
- Keep canonical paths stable for share URLs.

## Dependencies
- Shared rules: `../frontend-development-guide.md`
- Related modules: `board-module.md` (cross-linking content)

