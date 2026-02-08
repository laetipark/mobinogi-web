# Mobinogi Web - Architecture Rules

## Project Structure
- Monolithic full-stack: Spring Boot 3.4.5 (Java 21) + React 18 (TypeScript)
- Single WAR deployment with frontend assets bundled via frontend-maven-plugin
- Docker Compose: nginx:80, app:50620, frontend:3000, redis:6379, mysql

## Backend Package: `com.example.mobinogi`
```
config/        # SecurityConfig, CorsConfig, GoogleSheetsConfig
controller/    # REST controllers (auth/, game/, user/, board/, file/)
dto/           # DTOs with static fromEntity(), @Builder
entity/        # JPA entities with Lombok
filter/        # JwtAuthenticationFilter, CorsFilter
repository/    # Spring Data JPA repos
service/       # Business logic (@Transactional)
scheduler/     # @Scheduled tasks (TodoReset, GoogleSheet)
util/          # JwtUtil
```

## Frontend: `frontend/src/`
```
components/    # auth/, board/, common/, game/, layout/, todo/, user/
pages/         # auth/, board/, game/, user/
services/      # API service layer (must export from index.ts)
contexts/      # AuthContext
hooks/         # use-auth, use-kakao-login
types/         # TypeScript definitions
config/        # env.ts
utils/         # Helpers
styles/        # Global SCSS
```

## Auth Flow
1. Kakao OAuth client-side (Kakao SDK) -> get user info
2. POST /api/auth/kakao -> backend creates/finds User, returns JWT
3. New users -> /register/nickname
4. JWT in localStorage, attached via axios interceptor
5. JwtAuthenticationFilter validates on protected endpoints

## Data Sync
- Google Sheets -> GoogleSheetsService -> 6-hour cron (GoogleSheetScheduler)
- Entities: GameItem, GameMonster, GameNpc, GameRegion, LifeBarter, LifeCraft

## API Endpoints
- Public: `/api/items/**`, `/api/barter/**`, `/api/craft/**`, `/api/auth/**`
- Protected (JWT): `/api/auth/me`, `/api/auth/profile`, `/api/user/**`, `/api/todo/**`
