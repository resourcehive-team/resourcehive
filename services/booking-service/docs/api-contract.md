# Booking Service API Contract Proposal

Status: **proposed; Person C approval is required before these public paths or
response conventions are implemented.**

This document defines the intended HTTP surface. Week 2 implements only the
slot data-access layer; it does not expose placeholder business endpoints.

## Common rules

- Base URL: the approved public Nginx gateway.
- Authentication: `Authorization: Bearer <JWT>`.
- The service must validate the agreed JWT locally.
- User, role, tenant, and organization values supplied in request bodies or
  query strings are never trusted as authorization facts.
- Identifiers are UUIDs and timestamps are ISO 8601 UTC strings.
- JSON error responses use an approved common error envelope.
- List endpoints use an approved cursor or offset pagination envelope.
- Exact JWT claims, pagination shape, and error envelope remain dependencies on
  Person C's protected shared contracts.

## Proposed endpoints

| Method | Path | Purpose | Planned implementation |
| --- | --- | --- | --- |
| `GET` | `/resources/{resourceId}/slots` | List tenant-visible slots in a time window | Week 3 |
| `GET` | `/slots/{slotId}` | Read one tenant-visible slot | Week 3 |
| `POST` | `/slots` | Create a slot for an authorized resource | Week 3 |
| `POST` | `/bookings` | Atomically book a slot and deduct points | Week 5 |
| `GET` | `/bookings` | List the authenticated user's bookings | Later booking-history work |
| `GET` | `/bookings/{bookingId}` | Read an authorized booking | Later booking-history work |
| `POST` | `/bookings/{bookingId}/cancel` | Cancel and apply an eligible refund | Week 6 |
| `POST` | `/bookings/{bookingId}/complete` | Complete/return a booking | Week 7 |
| `GET` | `/points/balance` | Read the authenticated user's balance | Later points work |
| `GET` | `/points/history` | Read append-only point history | Later points work |

## Slot list proposal

`GET /resources/{resourceId}/slots`

Proposed query parameters:

| Parameter | Required | Rule |
| --- | --- | --- |
| `startsAtOrAfter` | no | ISO 8601 timestamp, inclusive |
| `startsBefore` | no | ISO 8601 timestamp, exclusive |
| `skip` | no | integer, minimum `0`, default `0` |
| `take` | no | integer, `1..100`, default `50` |

The service derives the tenant from validated authentication and applies it to
the related Resource query. A client-provided resource ID alone never grants
access. Results are ordered by `startsAt`, then slot ID.

Expected responses: `200`, `400`, `401`, `403`, `404`, `500`.

## Slot create proposal

`POST /slots`

```json
{
  "resourceId": "uuid",
  "startsAt": "2026-08-01T10:00:00.000Z",
  "endsAt": "2026-08-01T11:00:00.000Z"
}
```

Rules:

- authenticated active user;
- approved administrator authority for the resource organization;
- resource must be active and in the authenticated root tenant;
- `endsAt` must be later than `startsAt`;
- database overlap protection remains authoritative.

Expected responses: `201`, `400`, `401`, `403`, `404`, `409`, `500`.

## Booking create proposal

`POST /bookings`

```json
{
  "resourceSlotId": "uuid",
  "idempotencyKey": "client-generated-value"
}
```

The user ID and tenant are never accepted in the body. Booking creation and
point deduction must be one PostgreSQL transaction. The active-slot uniqueness
constraint remains the final concurrency protection.

Expected responses: `201`, `400`, `401`, `403`, `404`, `409`, `422`, `500`.

## Approval questions

Person C must approve:

- `/slots` as a Booking Service public prefix in addition to `/bookings` and
  `/points`;
- the common error and pagination envelopes;
- the JWT claims used for user and root-tenant identity;
- the idempotency-key convention;
- whether cancellation/completion use action endpoints or status updates.
