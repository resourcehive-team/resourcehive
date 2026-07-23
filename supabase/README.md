# ResourceHive Supabase schema

The nine ordered migrations define the initial 21-table ResourceHive schema.
They integrate identities with `auth.users`, enforce tenant-scoped relationships,
prevent overlapping active bookings, protect append-only ledgers, and enable a
conservative RLS baseline.

## Local setup

Install the Supabase CLI and initialize the project once:

```powershell
npm install --save-dev supabase
npx supabase init
```

Do not overwrite an existing `supabase/config.toml` after initialization.
With Docker Desktop running, validate only against the disposable local stack:

```powershell
npx supabase start
npx supabase db reset
npx supabase db lint
npx supabase test db
```

`db reset` is destructive to the local Supabase database. Never add `--linked`.
Do not run `db push` until the migrations have been reviewed, tested locally,
merged, and the team has approved deploying them to the shared project.

The existing Prisma schema predates this redesign. After these migrations pass,
introspect the local database and review the generated Prisma model changes
separately rather than using `prisma db push`.
