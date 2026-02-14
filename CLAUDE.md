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
