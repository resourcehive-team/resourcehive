# Booking Service

Person B owns this NestJS service for slots, availability, bookings, and
booking-related point transactions. Week 1 provides infrastructure only; no
business endpoints are implemented yet.

## Local development

The service requires `DATABASE_URL`. From the monorepo root:

```sh
pnpm --filter @resourcehive/database run build
pnpm --filter booking-service run start:dev
```

- Internal port: `3002`
- Readiness: `GET /health`
- Swagger UI: `GET /docs`

## Docker

Build from the monorepo root:

```sh
docker build -f services/booking-service/Dockerfile -t resourcehive-booking .
docker run --rm -p 3002:3002 -e DATABASE_URL=postgresql://... resourcehive-booking
```

The public prefixes proposed for Person C's gateway integration are
`/bookings/*` and `/points/*`. Root Compose, Nginx, shared environment files,
CI workflows, and port assignments require Person C approval.
