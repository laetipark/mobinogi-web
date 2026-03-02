# Project Structure

This repository is a full-stack monorepo:

- Backend: Spring Boot (Java 21, Maven)
- Frontend: React + Vite + TypeScript
- Infra: Docker Compose + Nginx + GitHub Actions

## Top-Level Directory Map

```text
.
|-- src/                 # Spring Boot source (controllers/services/repositories/entities)
|-- frontend/            # React app source
|-- nginx/               # Nginx runtime config and sample config
|-- deploy/              # Server deployment helpers (systemd scripts and unit files)
|-- docs/                # Repository documentation
|-- scripts/             # Utility scripts (maintenance / guards)
|-- .github/workflows/   # CI/CD workflows
`-- pom.xml              # Maven project definition (backend + packaging flow)
```

## Backend (`src/`)

- `src/main/java/com/example/mobinogi/`
  - `controller/`: REST API endpoints
  - `service/`: business logic
  - `repository/`: JPA repositories
  - `entity/`: persistence entities
  - `dto/`: API request/response DTOs
- `src/main/resources/`
  - Spring configuration and static resources

## Frontend (`frontend/`)

- `frontend/src/`
  - `pages/`: route-level pages
  - `components/`: reusable UI components
  - `services/`: API clients
  - `types/`: shared type definitions
  - `utils/`, `hooks/`, `contexts/`: app utilities and state helpers

## Infra / Deployment

- `Dockerfile`: app image build
- `docker-compose.yml.sample`: compose baseline example
- `nginx/nginx.conf.sample`: nginx baseline example
- `.github/workflows/deploy-image.yml`: build + push + deploy pipeline

## Local-Only / Ignored by Design

- `.env*` real secret files
- `.run/` IDE run configs
- `.m2/` local Maven cache
- `frontend/node_modules/`, `frontend/dist/`, `target/`
