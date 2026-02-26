# Board Module Rules

## Scope
- Board list/detail/write/edit flows
- Comments, wiki history, external synced posts
- Board URL slug policy

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/board/board-list.tsx`
  - `frontend/src/pages/board/board-detail.tsx`
  - `frontend/src/pages/board/board-write.tsx`
  - `frontend/src/components/board/*`
  - `frontend/src/utils/board-url.ts`
- Backend:
  - `controller/board/*`
  - `service/board/*`
  - `repository/*` for board entities

## Invariants
- User post route must use slug path:
  - `/board/:postSlug`
- Slug normalization must keep the same rule on FE/BE:
  - trim
  - convert non-letter/non-number sequences to `-`
  - collapse repeated `-`
  - trim edge `-`
- Keep markdown raw-table support for board content:
  - `rehype-raw` + `rehype-sanitize` must stay enabled for board detail/write rendering.
- Preserve board table visual readability:
  - horizontal scroll wrapper
  - strong header/body contrast
  - centered table text
- External synced posts are read-only in board detail.

## SEO/Canonical
- Canonical for user posts should be slug path generated from title.
- For external synced posts, prefer non-indexable metadata where duplication risk exists.

## Dependencies
- Shared rules: `../frontend-development-guide.md`, `../backend-development-guide.md`
- Related modules: `auth-user-module.md` (author identity), `game-content-module.md` (content references)

