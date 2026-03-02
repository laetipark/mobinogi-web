---
apply: always
---

# Project Rules Index

Shared rules for assistants working on `mobinogi-web`.

## Scope
- This folder is git-safe and intended for commit.
- Do not include private URLs, real tokens, server IPs, usernames, or secret values.
- Keep deploy-server-specific settings in `../local` overlays.

## Module Context
- `mobinogi-web` is a combined backend + frontend module.
- Backend: Spring Boot (`src/`)
- Frontend: React/Vite (`frontend/`)
- Infra/packaging: Docker + Nginx + Maven frontend integration

## Read Order (Global First, Then Area)
1. `architecture-overview.md`
2. `text-encoding-policy.md`
3. `quality-guardrails.md`
4. `performance-policy.md`
