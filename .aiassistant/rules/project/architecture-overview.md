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
