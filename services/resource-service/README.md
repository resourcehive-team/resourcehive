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

This service relies on a `.env` file for configuration. Since it shares a monorepo setup, you can either rely on the root `.env` or create a local `.env` inside `services/resource-service`.

**Required environment variables:**
- `PORT` (or `RESOURCE_SERVICE_PORT`): The port this service runs on (defaults to 3004).
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
*(Note: If you have created a local `.env` inside this service's directory, you can simply run `pnpm run test:e2e`)*

## API Documentation

The Resource Service exposes a Swagger UI for its REST endpoints. When running locally, you can view the interactive API documentation at:
- `http://localhost:3004/api/docs` (assuming default port)

Here you will find documentation for Organizations, Memberships, and Resources endpoints. 

## Gateway-Routing Instructions

The Resource Service is not meant to be accessed directly from the frontend. All traffic should route through the central NGINX API Gateway (or API Gateway service). 

- **Internal Port**: 3004
- **Gateway Prefix**: Typically routed under `/resources/`, `/organizations/`, and `/memberships/`. 

Ensure that your NGINX or API Gateway configuration proxies requests targeting resource management directly to this service's internal port. The Gateway handles the cross-origin resource sharing (CORS).
