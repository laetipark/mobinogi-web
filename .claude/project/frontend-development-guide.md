# Frontend Development Rules

## Styling
- SCSS Modules (`.module.scss`) — Tailwind, CSS-in-JS 금지
- 컴포넌트마다 `.module.scss` 파일 생성

## Path Aliases
- `@/components`, `@/pages`, `@/services`, `@/hooks`, `@/contexts`, `@/types`, `@/config`, `@/utils`, `@/styles`
- 설정: `tsconfig.app.json` + `vite.config.ts`

## Types
- 도메인별 분리: `types/common.ts`, `auth.ts`, `game-item.ts`, `board.ts` 등
- `types/index.ts`가 barrel re-export → 항상 `@/types`에서 import
- `PageResponse<T>` — 페이지네이션 제네릭
- `ApiResponse` — `{success, message?}` 베이스
- 새 타입 추가 시: 도메인 파일에 작성 → `index.ts` barrel에 export 추가

## API Service
- `apiService` 래퍼 사용 (axios 직접 호출 금지)
- 응답 타입: `ApiResponse & {data: T}` intersection
- 새 서비스는 반드시 `services/index.ts`에서 export

## State Management
- `AuthContext` + `useAuth()` hook — 외부 상태 라이브러리 없음
- JWT: `localStorage`에 저장, axios interceptor로 자동 첨부

## Conventions
- 파일명: kebab-case (`daily-task-section.tsx`)
- 아이콘: `lucide-react`
- 마크다운: `react-markdown`
- 커밋: 한국어, prefix (`feat:`, `fix:`, `update:`, `refactor:`)
