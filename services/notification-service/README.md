# Notification Service

Person B owns this NestJS service for persistent, real-time, and fallback
notifications. Week 1 provides infrastructure only; persistence, WebSockets,
and email delivery are scheduled for later weeks.

## Local development

The service requires `DATABASE_URL`. From the monorepo root:

```sh
pnpm --filter @resourcehive/database run build
pnpm --filter notification-service run start:dev
```

- Internal port: `3003`
- Readiness: `GET /health`
- Swagger UI: `GET /docs`

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
