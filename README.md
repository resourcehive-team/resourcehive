# ResourceHive

ResourceHive is a monorepo containing:

- a Next.js frontend;
- an Nginx API gateway;
- Identity, Resource, Booking, and Notification services;
- a shared Prisma database package;
- a shared service authentication package.

The backend services and API gateway run with Docker Compose. The frontend runs
locally with pnpm.

## Requirements

Install these before starting:

- Node.js 20 or newer;
- pnpm 10.34.5;
- Docker with Docker Compose;
- access to a PostgreSQL 15 database.

Run all commands from the repository root.

## First-time setup

Install the workspace dependencies:

```bash
pnpm install --frozen-lockfile
```

Create the local environment files without replacing existing files:

```bash
test -f .env || cp .env.example .env
test -f apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
```

Open `.env` and configure:

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLED_HOST:5432/DATABASE?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-private-secret"
```

`DATABASE_URL` is used by the running services. `DATABASE_URL_UNPOOLED` is used
for migrations. They may contain the same URL when the PostgreSQL provider does
not offer separate pooled and direct connections.

For Neon, use the hostname containing `-pooler` for `DATABASE_URL` and the
direct hostname for `DATABASE_URL_UNPOOLED`.

Open `apps/web/.env.local` and confirm:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
JWT_SECRET=replace-with-the-same-secret-used-in-the-root-env
```

The `JWT_SECRET` value must match in `.env` and `apps/web/.env.local`.

Initialize the database and create the repeatable demo account:

```bash
pnpm run dev:setup
```

## Run the application

Start all backend services and the Nginx API gateway:

First Time:
```bash
docker compose up --build -d
```
Later:
```bash
docker compose up -d
```

Confirm that the containers are running:

```bash
docker compose ps
```

The backend is now available through:

| Component | Address |
| --- | --- |
| Nginx API gateway | `http://localhost:8000` |
| Next.js frontend | `http://localhost:3000` |

The Identity, Resource, Booking, and Notification services are private Docker
services. Browser requests reach every backend service through the API gateway
instead of their internal ports.

In a separate terminal, start the frontend:

```bash
pnpm run dev:web
```

Open:

```text
http://localhost:3000
```

Use the demo account:

```text
Email: demo@example.edu
Password: DemoPassword123!
```

The demo seed creates a user, an approved membership, and a demo organization.
It does not create resources, so the resource catalogue may correctly display
an empty state.

## View backend logs

Follow the gateway and Resource Service logs:

```bash
docker compose logs -f api-gateway resource-service
```

Follow all backend logs:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop following logs. This does not stop the containers.

## Rebuild after backend changes

When backend source code or backend dependencies change, rebuild the services:

```bash
docker compose up --build -d
```

Frontend source changes are handled automatically by the Next.js development
server.

## Stop the application

Stop and remove the application containers:

```bash
docker compose down
```

This command does not delete the configured PostgreSQL database.

Stop the frontend by pressing `Ctrl+C` in its terminal.

## Useful database commands

Validate the Prisma schema:

```bash
pnpm run db:validate
```

Check migration status:

```bash
pnpm run db:migrate:status
```

Apply existing migrations and build the database package:

```bash
pnpm run db:init
```

Create a migration after intentionally changing the Prisma schema:

```bash
pnpm run db:migrate:create
```

Do not use `prisma db push`. Committed migrations are the database source of
truth.

## Tests

Run the frontend component tests:

```bash
pnpm run test:web
```

Run Identity Service tests:

```bash
pnpm --filter identity-service run test
pnpm --filter identity-service run test:e2e
```

Run Resource Service end-to-end tests:

```bash
pnpm --filter resource-service run test:e2e
```

Run database integrity and concurrent-booking tests only against a clean,
disposable PostgreSQL 15 database:

```bash
TEST_DATABASE_URL="postgresql://user:password@host:5432/database" \
bash db/schema/tests/run.sh
```
