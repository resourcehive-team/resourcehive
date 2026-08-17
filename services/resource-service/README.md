# Resource Service

The Resource Service is responsible for managing organizational hierarchies, memberships, and bookable resources (e.g., conference rooms, desks, equipment) within ResourceHive. It ensures strict tenant isolation and role-based access control (RBAC).

## Setup

1. **Install dependencies**: From the monorepo root, run:
   ```bash
   pnpm install
   ```

2. **Generate Prisma Client**: Ensure the shared `@resourcehive/database` package is built and the Prisma client is generated:
   ```bash
   pnpm --filter @resourcehive/database run build
   ```

## Environment

This service uses the root `.env` during local monorepo development and receives
its production environment from Docker Compose. Do not create service-specific
environment files.

**Required environment variables:**
- `PORT`: The port this service runs on (defaults to 3004).
- `JWT_SECRET`: Used to verify tokens issued by the Identity Service.
- `DATABASE_URL`: Connection string for PostgreSQL.

## Running the Service

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Testing

Ensure that your environment variables (like `DATABASE_URL` and `JWT_SECRET`) are available when testing. You can use `dotenv-cli` to inject them from the root:

```bash
# unit tests
$ npx dotenv-cli -e ../../.env -- pnpm run test

# e2e tests
$ npx dotenv-cli -e ../../.env -- pnpm run test:e2e

# test coverage
$ npx dotenv-cli -e ../../.env -- pnpm run test:cov
```
## API Documentation

The Resource Service exposes a Swagger UI for its REST endpoints. When running locally, you can view the interactive API documentation at:
- `http://localhost:3004/api/docs` (assuming default port)

Here you will find documentation for Organizations, Memberships, and Resources endpoints. 

## Gateway-Routing Instructions

The Resource Service is not meant to be accessed directly from the frontend. All traffic should route through the central Caddy API gateway.

- **Internal Port**: 3004
- **Gateway Prefix**: Typically routed under `/resources/`, `/organizations/`, and `/memberships/`. 

Ensure that the Caddy configuration proxies resource-management requests to the
service's internal port. The NestJS services enforce the configured CORS
allowlist; Caddy only routes requests.
