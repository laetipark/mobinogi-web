# CLAUDE.md

Mobinogi Web — 마비노기 게임 도우미 풀스택 앱 (Spring Boot + React).

## Rules

상세 개발 규칙은 `.claude/` 참조:

### Project Rules (공유, git 추적)

- **[architecture-overview.md](.claude/project/architecture-overview.md)** — 프로젝트 구조, 패키지 레이아웃, 인증 흐름, API 엔드포인트
- **[backend-development-guide.md](.claude/project/backend-development-guide.md)** —
  Entity/DTO/Controller/Service/Repository 패턴, 빌드 명령어
- **[frontend-development-guide.md](.claude/project/frontend-development-guide.md)** — SCSS Modules, 타입 구조, API 서비스 패턴,
  컴포넌트 패턴

### Local Rules (개인, gitignored)

- **[backend-patterns.md](.claude/local/backend-patterns.md)** — Entity/DTO/Controller/Service/Repository 코드 예제
- **[frontend-patterns.md](.claude/local/frontend-patterns.md)** — 컴포넌트/서비스/타입 코드 예제, Auth Flow
- **[environment-configuration.md](.claude/local/environment-configuration.md)** — 환경변수 설정, DB/OAuth/JWT 구성, Docker 로컬 설정
- **[deployment-secrets.md](.claude/local/deployment-secrets.md)** — 프로덕션 배포 설정, SSL/TLS, 보안 강화, 모니터링

## Quick Reference

### Tech Stack

- **Backend**: Spring Boot 3.4.5, Java 21, JPA/Hibernate, MySQL
- **Frontend**: React 18, TypeScript, Vite 5, SCSS Modules
- **Infra**: Docker Compose, Nginx, Redis

### Build Commands

```bash
# Backend
export JAVA_HOME="/c/Users/laeti/.jdks/ms-21.0.9"
cd /d/Mobinogi/mobinogi-web && ./mvnw clean compile -DskipTests -q

# Frontend
cd /d/Mobinogi/mobinogi-web/frontend
npx tsc --noEmit     # Type check
npm run build        # Production build
```

### Key Conventions

- Backend base package: `com.example.mobinogi`
- Frontend styling: SCSS Modules (NOT Tailwind)
- Frontend types: domain-split under `types/`, barrel re-export via `types/index.ts` → import from `@/types`
- API responses: `ApiResponse & {data: T}` intersection pattern
- Paginated responses: `PageResponse<T>` generic
- New services must be exported from `services/index.ts`
- Commit messages: Korean, prefixed (`feat:`, `fix:`, `update:`, `refactor:`)
