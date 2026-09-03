# Notification Service

This NestJS service persists in-app notifications and delivers verification
email and browser push notifications.

Domain events arrive through Kafka, in-app notifications are exposed through
recipient-scoped REST APIs, and queued delivery work is sent through Resend or
Firebase Cloud Messaging.

Architecture and contracts:

- [Architecture](docs/architecture.md)
- [Notification API](docs/api-contract.md)
- [Consumed booking events](docs/event-contracts.md)
- [Delivery semantics](docs/delivery-semantics.md)
- [Provider configuration](docs/provider-configuration.md)

## Local development

The service requires `DATABASE_URL`. From the monorepo root:

```sh
pnpm --filter @resourcehive/database run build
pnpm --filter notification-service run start:dev
```

Firebase web setup and the development-only push smoke test are documented in
[`docs/web-fcm-local-testing.md`](docs/web-fcm-local-testing.md).

- Internal port: `3003`
- Readiness: `GET /health`
- Swagger UI: `GET /docs`

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

The public HTTP prefix is `/notifications/*`. Browser push uses Firebase Cloud
Messaging and does not require WebSocket proxying or Redis coordination.
