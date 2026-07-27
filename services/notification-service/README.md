# Notification Service

Person B owns this NestJS service for persistent, real-time, and fallback
notifications.

Week 2 adds validated notification creation persistence and recipient-scoped
repository retrieval. Public read APIs, WebSockets, and email delivery remain
later milestones.

Proposed contracts requiring Person C approval:

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

Run persistence integration tests only against a migrated disposable database:

```sh
TEST_DATABASE_URL=postgresql://... pnpm --filter notification-service run test:integration
```

## Docker

Build from the monorepo root:

```sh
docker build -f services/notification-service/Dockerfile -t resourcehive-notification .
docker run --rm -p 3003:3003 -e DATABASE_URL=postgresql://... resourcehive-notification
```

The public prefix proposed for Person C's gateway integration is
`/notifications/*`. Future real-time delivery will require WebSocket upgrade
support. Root Compose, Nginx, shared environment files, CI workflows, and port
assignments require Person C approval.
