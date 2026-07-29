# Notification Event Consumption Proposal

Status: **approved by Person C.**

The Notification Service is the intended consumer of the versioned Booking
events documented by the Booking Service. Week 2 implements only the
notification persistence boundary.

## Initial mapping

| Event | Notification type | Recipient |
| --- | --- | --- |
| `booking.created.v1` | `BOOKING_CREATED` | `payload.recipientUserId` |
| `booking.cancelled.v1` | `BOOKING_CANCELLED` | `payload.recipientUserId` |
| `booking.completed.v1` | `BOOKING_COMPLETED` | `payload.recipientUserId` |

Only `booking.created.v1` has a proposed full payload in Week 2.

## Persistence rules

- Validate event name, version, identifiers, and timestamps before persistence.
- Store one notification for the intended recipient.
- New notifications always have `readAt = null`.
- Do not trust an arbitrary recipient added by a public HTTP caller.
- Do not mark the originating booking transaction failed because downstream
  real-time or email delivery failed.
- Duplicate-event handling must be finalized before event transport is enabled.

## Current limitation

The approved Notification schema has no event ID/deduplication field. Week 2
does not modify the schema. Before at-least-once delivery is implemented, Person
C must decide whether deduplication belongs in a new notification-event receipt
table, an approved field/index, or the chosen transport.

## Future delivery

WebSocket and email delivery are later milestones. Redis will be added only if
its coordination/pub-sub role is justified and approved; it will not replace
PostgreSQL persistence.
