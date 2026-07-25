# ResourceHive

ResourceHive currently provides a PostgreSQL database baseline, a NestJS
identity API, and a Next.js login page. Signup is intentionally not available
yet.

## Requirements

- Node.js 20 or newer
- pnpm 10.34.5
- An empty PostgreSQL 15 database
- `psql` only when running the database integrity tests

Run all commands from the repository root.

## First-time setup

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create local environment files without overwriting existing ones:

```bash
test -f .env || cp .env.example .env
test -f apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
```

Edit `.env` and set both PostgreSQL connection strings. The database user must
be able to create tables, indexes, triggers, and the `btree_gist` extension.
The provider can be local PostgreSQL, Neon, or another PostgreSQL-compatible
host.

For Neon, use the pooled hostname containing `-pooler` for application queries:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ENDPOINT-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require&connect_timeout=30&pool_timeout=30"
```

Use the direct hostname for migrations:

```env
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@ENDPOINT.REGION.aws.neon.tech/DATABASE?sslmode=require&connect_timeout=30"
```

For local PostgreSQL and providers without pooling, both variables can contain
the same URL. Remove `channel_binding=require` if Neon included it. Keep
`JWT_SECRET` private and replace the development value before deploying.

Apply migrations, build the shared Prisma package, and create the repeatable
demo login:

```bash
pnpm run dev:setup
```

## Run the application

Start the NestJS identity service:

```bash
pnpm run dev:identity
```

In a second terminal, start the Next.js application:

```bash
pnpm run dev:web
```

Open <http://localhost:3000/login> and sign in with:

```text
Email: demo@example.edu
Password: DemoPassword123!
```

Successful login returns to the home page. The demo seed is safe to run again.

## Verify the running service

Check the NestJS service:

```bash
curl http://localhost:3001/
```

Expected response:

```text
Identity Service is running
```

Test login directly:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.edu","password":"DemoPassword123!"}'
```

The response contains `user login successfully` and a JWT.

## Database and test commands

Validate the Prisma schema:

```bash
pnpm run db:validate
```

Check migration status:

```bash
pnpm run db:migrate:status
```

Run identity service tests after `pnpm run dev:setup`:

```bash
pnpm --filter identity-service run test
pnpm --filter identity-service run test:e2e
```

Run database integrity and concurrent-booking tests only against a clean,
disposable PostgreSQL 15 database:

```bash
TEST_DATABASE_URL="postgresql://user:password@host:5432/database" \
bash db/schema/tests/run.sh
```

Create a migration after intentionally changing the Prisma schema:

```bash
pnpm run db:migrate:create
```

Do not use `prisma db push`; committed migrations are the database source of
truth.
