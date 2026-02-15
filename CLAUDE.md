# CLAUDE.md

Mobinogi Web assistant rules entry point.

## Rule Source of Truth
Both Claude and AI Assistant must use:
- `.aiassistant/rules/project`

## Required Rules (Git-safe)
Read in this order:
1. `.aiassistant/rules/project/README.md`
2. `.aiassistant/rules/project/architecture-overview.md`
3. `.aiassistant/rules/project/backend-development-guide.md`
4. `.aiassistant/rules/project/frontend-development-guide.md`

## Optional Local Rules (gitignored)
Use only when local setup or private deployment context is needed:
- `.aiassistant/rules/local/backend-patterns.md`
- `.aiassistant/rules/local/frontend-patterns.md`
- `.aiassistant/rules/local/environment-configuration.md`
- `.aiassistant/rules/local/deployment-secrets.md`

## Quick Build Commands
```bash
# Backend
./mvnw clean compile -DskipTests -q

# Frontend
cd frontend
npx tsc --noEmit
npm run build
```

## Core Conventions
- Backend base package: `com.example.mobinogi`
- Frontend styling: SCSS Modules
- Frontend type import path: `@/types`
- API response base shape: `ApiResponse & { data: T }`
- New frontend services must be exported from `frontend/src/services/index.ts`
- Commit message prefix: `feat:`, `fix:`, `update:`, `refactor:`

## Recent Frontend UI Rules
- Header mobile breakpoint is `940px`:
  `frontend/src/components/layout/header.tsx` and `frontend/src/index.css` must keep hamburger menu behavior aligned to `max-width:940px`.
- Board list page title must use semantic `<h1>`:
  `frontend/src/pages/board/board-list.tsx`.
- Board markdown rendering must support both markdown tables and raw HTML tables:
  keep `rehype-raw` + `rehype-sanitize` in
  `frontend/src/pages/board/board-detail.tsx` and `frontend/src/pages/board/board-write.tsx`.
- Board table visual style should stay image-like:
  dark header (`#393939`), light body (`#dcdcdc`), centered cell text, horizontal overflow wrapper.
  Styles live in:
  `frontend/src/pages/board/board-detail.module.scss`,
  `frontend/src/pages/board/board-write.module.scss`.
- Event summary modal must preserve `<table>` structure instead of converting to card/group blocks when HTML table exists.
  Keep `table.rawHtml` rendering path in:
  `frontend/src/pages/game/events.tsx`.
  Sanitize by stripping inline `style/width/height` from table-related tags
  (`table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `colgroup`, `col`).

## Recent Backend Refactor Rules
- In backend services, normalize optional request params via dedicated helper methods.
- Prefer explicit typed controller responses over `ResponseEntity<?>` when shape is known.
- For repeated map response payloads, use private helper methods to build success/failure responses.
- Replace overly long derived repository method names with readable method names + `@Query` where helpful.
- Do not expose raw internal exception messages in generic server-error responses.
