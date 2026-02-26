# Auth/User Module Rules

## Scope
- Login, OAuth callback, nickname registration
- Profile and character management
- Discord account linking

## Main Entrypoints
- Frontend:
  - `frontend/src/pages/auth/login.tsx`
  - `frontend/src/pages/auth/register-nickname.tsx`
  - `frontend/src/pages/auth/discord-callback.tsx`
  - `frontend/src/pages/user/profile.tsx`
  - `frontend/src/pages/user/characters.tsx`
- Backend:
  - Auth/profile/user/character controllers and services under
    `src/main/java/com/example/mobinogi`

## Invariants
- Keep token/auth state logic centralized in auth context/hooks.
- Do not duplicate login-state checks across feature pages when shared auth guards exist.
- OAuth callback pages are process pages; keep `noindex` metadata.
- Never hardcode OAuth secrets or internal callback URLs in project rules/code.

## Dependencies
- Shared rules: `../frontend-development-guide.md`, `../backend-development-guide.md`
- Private overlays: `../../local/environment-configuration.md`, `../../local/deployment-secrets.md`

