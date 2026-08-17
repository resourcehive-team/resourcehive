# Booking Service API Contract Proposal

Status: **Week 3 contract approved; Week 5 booking creation implemented against
the approved database baseline.**

This document defines the agreed HTTP surface. Slot endpoints and atomic booking
creation are implemented while booking history, cancellation, completion, and
public points endpoints remain scheduled for their stated milestones.

## Common rules

- Base URL: the approved public Caddy gateway.
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
| `POST` | `/bookings` | Atomically book a slot and deduct points | Implemented |
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

Each returned slot includes an `available` boolean. It is `true` only when the
resource is active, the slot has not ended, and no non-cancelled booking exists.

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
  "resourceSlotId": "uuid"
}
```

The user ID and tenant are never accepted in the body. Booking creation and
point deduction must be one PostgreSQL transaction. The active-slot uniqueness
constraint remains the final concurrency protection.

Rules:

- the authenticated account and selected organization membership must be active
  and approved;
- the slot and active resource must belong to the authenticated root tenant;
- the user must have approved access through the owner or an allowed
  organization;
- the slot must be in the future and have no active booking;
- the server-owned resource point cost must be valid;
- the user's append-only balance must cover the complete point cost;
- validation, booking insertion, and point deduction run in one serializable
  PostgreSQL transaction;
- serialization failures are retried up to three times;
- the database `bookings_active_slot_unique` index remains authoritative and a
  competing request receives `409`;
- a zero-cost booking creates no zero-value ledger row.

Successful response:

```json
{
  "id": "uuid",
  "resourceSlotId": "uuid",
  "resourceId": "uuid",
  "resourceName": "Projector",
  "userId": "uuid",
  "status": "CONFIRMED",
  "startsAt": "2030-08-01T10:00:00.000Z",
  "endsAt": "2030-08-01T11:00:00.000Z",
  "pointsDeducted": 25,
  "createdAt": "2026-08-01T09:00:00.000Z"
}
```

Expected responses: `201`, `400`, `401`, `403`, `404`, `409`, `500`.

An idempotency key is not accepted in this milestone because the approved
database baseline has no durable idempotency-key field. Adding one would require
Person C's schema-change approval. Database uniqueness and serializable
transactions provide concurrency correctness but do not provide replayable
idempotency semantics.

## Booking validation boundary

Week 4 adds an internal validation use case without creating a booking or
writing a point transaction. It derives the user and tenant from authenticated
server context, then verifies:

- the account and selected organization membership remain active and approved;
- the slot belongs to the authenticated root tenant;
- the resource is active and accessible to an approved user organization;
- the slot has not started;
- no non-cancelled booking currently occupies the slot;
- the server-owned resource point cost is a non-negative integer;
- the authenticated user's append-only ledger balance is sufficient.

Successful validation returns a server-derived context containing the user,
tenant, resource, slot, time range, and point cost. Booking creation repeats
these checks inside its serializable transaction because validation alone is
not a concurrency guarantee.

## Week 3 internal point ledger boundary

Week 3 adds no public points endpoint. Booking Service provides an internal
append-only ledger abstraction that can calculate a user's balance, assert
sufficient points, and append a booking deduction using a caller-supplied
Prisma transaction client. Week 5 booking creation will use that client so the
booking and deduction share one PostgreSQL transaction.
