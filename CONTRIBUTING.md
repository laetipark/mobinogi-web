# Contributing Guide

## 1. Branching

- Use short-lived feature branches from `main` (or your integration branch).
- Suggested branch naming:
  - `feature/<topic>`
  - `fix/<topic>`
  - `chore/<topic>`

## 2. Setup

Backend:

```bash
./mvnw -Pbackend-dev spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## 3. Before Opening a PR

Run the minimum checks relevant to your change:

- Frontend build:
  - `cd frontend && npm run build`
- Backend compile:
  - `./mvnw -q -Pbackend-dev -DskipTests compile`

If your change touches tests, run tests as well.

## 4. PR Scope Rules

- Keep PRs focused on one concern.
- Avoid unrelated refactors in the same PR.
- Include migration notes when API/DB behavior changes.
- Update docs when command flow, config, or architecture changes.

## 5. Commit Message Style (Recommended)

- `feat: add guild gallery tag filter`
- `fix: preserve modal route on gallery detail refresh`
- `chore: clean up repository docs and templates`

## 6. Secrets and Sensitive Data

- Never commit real `.env` files or credentials.
- Use sample files (`*.sample`) for shared defaults.
- Keep deployment host/user/token values in GitHub Secrets only.
