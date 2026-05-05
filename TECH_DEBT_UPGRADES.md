# Tech-Debt Upgrades (2026-05)

This document summarizes the changes made to reduce the “known technical debt” listed in `claude.md`, and explains what changed in day-to-day workflow.

## TL;DR (if you mostly “vibe code”)
- **Fewer random logouts**: parallel API calls won’t spam `/api/refresh` anymore (single-flight refresh).
- **Less “it breaks after restart”**: rate limits, login lockouts, and Spotify OAuth state can persist via Redis.
- **Schema changes stop being scary**: migrations exist now, so you don’t have to rely on `down -v` / manual ALTERs.
- **Safer refactors**: minimal tests are in place so changes are less blind (even without CI).
- **Less proxy/URL weirdness**: the frontend uses one Vite-correct backend URL rule (`VITE_BACKEND_URL` or same-origin).

## 1) Tests (Backend + Frontend)

### What changed
- **Backend**: pytest bootstrapped.
  - Added: `pytest`, `pytest-asyncio`
  - Added test scaffolding: `backend/pytest.ini`, `backend/tests/conftest.py`
  - Added example tests (small, dependency-overridden / mocked):
    - `backend/tests/test_integrations_health.py`
    - `backend/tests/test_spotify_oauth_state.py`
- **Frontend**: vitest + Testing Library bootstrapped.
  - Added: `vitest`, `jsdom`, `@testing-library/*`, `@testing-library/jest-dom`
  - Added: `frontend/vitest.config.js`, `frontend/src/test/setupTests.js`
  - Added example tests:
    - `frontend/src/test/PageHeader.test.jsx`
    - `frontend/src/test/authenticatedFetch.test.js`

### Why it matters
- You can now change fragile areas (auth/spotify/proxmox) with less risk.
- We have a foundation for CI later, even if you keep deploying manually.

### How to use
- Backend (inside container or local venv):
  - Run: `pytest`
- Frontend:
  - Run: `npm run test`

## 2) DB migrations (Alembic baseline)

### What changed
- Introduced **Alembic** for DB schema versioning (even though we still use raw SQL).
- Added:
  - `backend/alembic.ini`
  - `backend/migrations/` + `backend/migrations/versions/0001_baseline.py`

### Why it matters
- Previously: schema changes were “manual” (edit `db/init.sql` and often require `down -v` or manual ALTER TABLE).
- Now: schema changes can be tracked and applied incrementally on existing databases.

### New workflow
- Keep `db/init.sql` for **fresh volumes only**.
- For schema changes, create a migration in `backend/migrations/versions/…` and run:
  - `alembic upgrade head`

### Docker Compose usage (optional migration job)
- Dev compose: `docker compose --profile migrations run --rm migrate`
- Production compose: same, using the production compose file.

## 3) Auth refresh: single-flight `/api/refresh`

### What changed
- `frontend/src/utils/auth.js`: refresh is now **single-flight**.
  - If multiple requests get a 401 at once, only **one** `/api/refresh` is sent.
  - Others wait for the same refresh promise.

### Why it matters
- Prevents refresh storms and reduces “session expired” errors under parallel load.

## 4) Persistent rate limiting (Redis)

### What changed
- Added Redis support for:
  - **slowapi** storage (`backend/core/limiter.py` uses `REDIS_URL` if set)
  - failed login lockout tracking (`backend/core/rate_limiting.py`)
- Added Redis service to compose (`docker-compose.yml`, `docker-compose.production.yml`) and wired `REDIS_URL`.

### Why it matters
- Previously: lockouts and rate limiting reset on backend restart.
- Now: rate limits survive restarts (and are usable with multiple backend instances).

## 5) Spotify OAuth state persistence (Redis + TTL)

### What changed
- OAuth CSRF `state` is no longer stored in an in-memory dict (`_oauth_states`).
- Added `backend/core/oauth_state_store.py`:
  - Redis-backed state storage with TTL (fallback in-memory for dev)
- Updated `backend/routers/spotify.py` to use `put_state` / `pop_state`.

### Why it matters
- OAuth callback continues to work across backend restarts / scaling.

## 6) DB driver modernization (incremental)

### What changed
- Added an **opt-in** path to switch the connection pool to psycopg3:
  - `backend/config/database.py` checks `USE_PSYCOPG3=true`
  - Added deps: `psycopg[binary]`, `psycopg-pool`

### Why it matters
- This is a stepping stone to a more async-friendly DB layer, without forcing an immediate rewrite.

## 7) Backend URL configuration (Vite-correct)

### What changed
- Introduced `frontend/src/utils/backendUrl.js`:
  - Uses `import.meta.env.VITE_BACKEND_URL` (Vite-correct)
  - Fallback: same-origin (nginx reverse proxy)
- Replaced scattered `process.env.REACT_APP_BACKEND_URL` usage across the frontend.

### Why it matters
- The previous approach was fragile and also not ideal under Vite.
- This standardizes the rule: **set `VITE_BACKEND_URL` if needed; otherwise same-origin**.

## Summary: “Old vs New” workflow

- **Old**: no tests → risky refactors; schema changes via `init.sql` / manual ALTER; in-memory rate limit; OAuth state in-memory; refresh storms possible.\n
- **New**: tests baseline exists; migrations are versioned; rate limits and OAuth state can persist via Redis; refresh is single-flight; backend URL config is standardized for Vite.

