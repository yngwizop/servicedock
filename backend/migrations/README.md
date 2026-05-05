# DB migrations (Alembic)

This project historically relied on `db/init.sql` (fresh volumes only) and manual `ALTER TABLE`.

From now on, schema changes should be captured as Alembic migrations under `backend/migrations/versions/`.

## Run (local)

```bash
cd backend
export DATABASE_URL="postgresql://..."
alembic upgrade head
```

## Baseline

The current schema is represented by an initial **baseline** migration which creates the Alembic version table but does not modify existing tables.

