# Architecture Overview

## Stack
- Backend: Spring Boot 3.x, Java 21, JPA/Hibernate, MySQL
- Frontend: React 18, TypeScript, Vite, SCSS Modules
- Infra: Docker Compose, Nginx, Redis

## Repository Shape
- Monorepo-style backend project with `frontend/` app
- Backend and frontend are versioned together

## Backend Package
Base package: `com.example.mobinogi`

Common package layout:
- `config` - security, CORS, external integrations
- `controller` - API endpoints
- `dto` - request/response contracts
- `entity` - JPA entities
- `repository` - Spring Data repositories
- `service` - business logic
- `filter` - auth and request filters
- `scheduler` - periodic jobs
- `util` - helper utilities

## Frontend Layout
Root: `frontend/src/`

Common layout:
- `components` - reusable UI by domain
- `pages` - route-level screens
- `services` - API client layer
- `contexts` - global context providers
- `hooks` - reusable hooks
- `types` - domain-split TypeScript types
- `config` - runtime config
- `utils` - utility functions
- `styles` - global SCSS and shared styles

## Feature Module Boundaries
Use these modules as the main unit for rule selection.

1. Auth/User module
- Frontend: `pages/auth/*`, `pages/user/profile.tsx`, `pages/user/characters.tsx`
- Backend: auth/profile/user/character related controllers and services
- Rule file: `modules/auth-user-module.md`

2. Board module
- Frontend: `pages/board/*`, `components/board/*`, `utils/board-url.ts`
- Backend: `controller/board/*`, board services/repositories/entities
- Rule file: `modules/board-module.md`

3. Game content module
- Frontend: `pages/game/news.tsx`, `pages/game/events.tsx`, `pages/game/game-items.tsx`
- Backend: news/event/item crawl/sync/query flows
- Rule file: `modules/game-content-module.md`

4. Todo module
- Frontend: `pages/user/todo.tsx`, `components/todo/*`
- Backend: todo/user-character/task related APIs
- Rule file: `modules/todo-module.md`

5. Gallery module
- Frontend: `pages/photo/photo-board.tsx`
- Backend: photo board CRUD/like/upload endpoints
- Rule file: `modules/gallery-module.md`

## Authentication Flow (Summary)
1. Frontend receives OAuth/Kakao user info.
2. Frontend calls backend auth endpoint.
3. Backend issues JWT.
4. Frontend stores token and attaches it via interceptor.
5. Backend validates token for protected APIs.

## API Design Principles
- Public and protected endpoints are clearly separated.
- Response payload shape is consistent across domains.
- Pagination responses use a shared generic type.

## Rule Navigation
- Start with this file for module ownership and boundaries.
- Then read:
  - `backend-development-guide.md`
  - `frontend-development-guide.md`
- Finally load only the module file(s) that match changed paths.
