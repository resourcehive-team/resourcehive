# Booking Service

Person B owns this NestJS service for slots, availability, bookings, and
booking-related point transactions.

Implemented domain capabilities include tenant-scoped slots and availability,
atomic booking creation, append-only booking point deductions, and database
conflict handling for competing bookings.

Proposed contracts requiring Person C approval:

- [Booking API](docs/api-contract.md)
- [Booking events](docs/event-contracts.md)

## Local development

The service requires `DATABASE_URL`. From the monorepo root:

```sh
pnpm --filter @resourcehive/database run build
pnpm --filter booking-service run start:dev
```

- Internal port: `3002`
- Readiness: `GET /health`
- Swagger UI: `GET /docs`

Run repository integration tests only against a migrated disposable database:

```sh
TEST_DATABASE_URL=postgresql://... pnpm --filter booking-service run test:integration
```

## Docker

Build from the monorepo root:

```sh
docker build -f services/booking-service/Dockerfile -t resourcehive-booking .
docker run --rm -p 3002:3002 -e DATABASE_URL=postgresql://... resourcehive-booking
```

The public prefixes proposed for Person C's gateway integration are
`/bookings/*` and `/points/*`. Root Compose, Nginx, shared environment files,
CI workflows, and port assignments require Person C approval.

Booking creation is `POST /bookings`. Slot availability also requires the
`/slots/*` and `/resources/:resourceId/slots` routes. No new environment
variables are introduced by atomic booking creation.
