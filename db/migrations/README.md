# Migrations

Rules:
1. Every schema change = new file `NNN_short_description.sql` (e.g. `003_add_pending_approval_status.sql`). Never edit a past migration.
2. NNN is sequential, zero-padded, +1 from the highest existing number. Check `db/migrations/` before opening your PR to avoid clashing numbers with a teammate's in-flight branch.
3. Connect as the `postgres` (owner) role to run migrations — `app_user_role` cannot run DDL by design (that's what keeps RLS honest).
4. Run via `scripts/migrate.sh`, never by pasting into DBeaver's SQL editor directly against the shared RDS instance.
5. `scripts/migrate.sh` uses `POSTGRES_OWNER_URL` and must be run with the owner role.
6. PR must include: the migration file + a one-line note in this README's changelog table below.

## Migrations folder
- Store migration SQL files in `db/migrations/`.
- Each file must be named `NNN_short_description.sql`.
- `db/init/` may contain initial or reference SQL scripts, but live migrations used by `scripts/migrate.sh` must be in `db/migrations/`.

## Changelog
| # | File | Author | What it does |
|---|------|--------|---------------|
| 001 | 01_init.sql | - | initial schema, 14 tables, RLS |
| 002 | 002_rls_and_role_setup.sql | - | app_user_role + RLS policies |
