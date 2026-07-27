# Booking Event Contract Proposal

Status: **proposed; Person C approval is required before this becomes a shared
contract.**

The contract is transport-neutral. Week 2 does not add Redis, a message broker,
WebSockets, or delivery infrastructure.

## Envelope

```ts
interface DomainEvent<TType extends string, TPayload> {
  eventId: string;
  eventType: TType;
  eventVersion: 1;
  occurredAt: string;
  correlationId: string;
  rootOrganizationId: string;
  actorUserId: string;
  payload: TPayload;
}
```

Rules:

- IDs are UUIDs.
- `occurredAt` is an ISO 8601 UTC timestamp.
- `eventId` is stable across retries.
- consumers must tolerate duplicate delivery by `eventId`.
- producers do not include passwords, tokens, email credentials, or other
  secrets.
- adding optional fields is backward-compatible; removing or changing required
  fields requires a new event version.

## `booking.created.v1`

Producer: Booking Service. Intended consumer: Notification Service.

```json
{
  "eventId": "uuid",
  "eventType": "booking.created.v1",
  "eventVersion": 1,
  "occurredAt": "2026-08-01T09:55:00.000Z",
  "correlationId": "uuid",
  "rootOrganizationId": "uuid",
  "actorUserId": "uuid",
  "payload": {
    "bookingId": "uuid",
    "recipientUserId": "uuid",
    "resourceId": "uuid",
    "resourceSlotId": "uuid",
    "startsAt": "2026-08-01T10:00:00.000Z",
    "endsAt": "2026-08-01T11:00:00.000Z"
  }
}
```

## Reserved future events

- `booking.cancelled.v1`
- `booking.completed.v1`

Their payloads will be finalized with the corresponding business rules.

## Failure boundary

The booking transaction must not depend on real-time or email delivery.
Persistence/delivery failures are recorded and retried by the notification
workflow when that workflow is implemented.

## Approval questions

Person C must approve the shared event location, correlation convention, JWT
identity mapping, transport choice, retry ownership, and retention policy.
