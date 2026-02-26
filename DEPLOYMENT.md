# Docker Image Deployment (Method 2)

This project deploys by building/pushing a Docker image in GitHub Actions, then pulling that image on the server with `docker compose`.
No `target` folder upload is required.

## 1) Required GitHub Actions Secrets

Add these in Repository Settings > Secrets and variables > Actions:

- `DEPLOY_HOST`: deployment server host
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: private key (PEM)
- `DEPLOY_PATH`: server path containing `docker-compose.deploy.yml`
- `GHCR_USERNAME`: GHCR username
- `GHCR_TOKEN`: token with `read:packages`

## 2) Deployment Trigger

- Push to `master` (or run workflow manually).
- Workflow file: `.github/workflows/deploy-image.yml`
- Flow:
1. Build Docker image
2. Push to GHCR (`ghcr.io/<owner>/mobinogi-web:<commit_sha>` and `:latest`)
3. SSH to server, then run `docker compose -f docker-compose.deploy.yml pull app` and `docker compose -f docker-compose.deploy.yml up -d app nginx`

## 3) Server Prerequisites

The server deploy directory should contain:

- `docker-compose.deploy.yml`
- `nginx/nginx.conf`
- `.env.production`
- `credentials/` (runtime credential files)

## 4) Optional Local Check

```bash
docker build -t mobinogi-web:latest .
docker compose -f docker-compose.deploy.yml up -d
```
