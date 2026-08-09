# Notification Service

Person B owns this NestJS service for persistent, real-time, and fallback
notifications.

The service currently provides persistent notification creation,
recipient-scoped read APIs, and the authenticated WebSocket connection
foundation. Business-event delivery and email fallback remain later
milestones.

Approved contracts:

- [Notification API](docs/api-contract.md)
- [Consumed booking events](docs/event-contracts.md)

## Local development

The service requires `DATABASE_URL`. From the monorepo root:

```sh
pnpm --filter @resourcehive/database run build
pnpm --filter notification-service run start:dev
```

- Internal port: `3003`
- Readiness: `GET /health`
- Swagger UI: `GET /docs`
- Socket.IO namespace: `/notifications`
- Socket.IO path: `/notifications/socket.io`
- Socket authentication: `handshake.auth.token`

Run persistence integration tests only against a migrated disposable database:

```sh
TEST_DATABASE_URL=postgresql://... pnpm --filter notification-service run test:integration
TEST_DATABASE_URL=postgresql://... pnpm --filter notification-service run test:concurrency
```

`test:integration` and `test:concurrency` fail immediately when
`TEST_DATABASE_URL` is missing, preventing CI from treating skipped database
coverage as successful. The concurrency suite verifies that simultaneous
mark-read requests remain idempotent and preserve a single notification row.

The service-owned CI command set is:

```sh
pnpm --filter notification-service run lint
pnpm --filter notification-service run build
pnpm --filter notification-service run test
pnpm --filter notification-service run test:e2e
pnpm --filter notification-service run test:integration
pnpm --filter notification-service run test:concurrency
```

## Docker

Build from the monorepo root:

```sh
docker build -f services/notification-service/Dockerfile -t resourcehive-notification .
docker run --rm -p 3003:3003 -e DATABASE_URL=postgresql://... resourcehive-notification
```

The public HTTP prefix is `/notifications/*`. Person C's gateway integration
must proxy `/notifications/socket.io` to this service with HTTP/1.1 WebSocket
upgrade headers and long-lived connection timeouts. Root Compose, Nginx, shared
environment files, CI workflows, and port assignments remain Person C-owned.

Redis is not required for the single-instance authentication foundation. An
approved Socket.IO adapter or Redis coordination is required before relying on
rooms across multiple Notification Service instances.
