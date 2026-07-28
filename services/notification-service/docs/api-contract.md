# Notification Service API Contract Proposal

Status: **approved by Person C for Week 3 implementation.**

Week 2 implemented persistence. Week 3 implements the approved read endpoints.

## Common rules

- Base URL: the approved public Nginx gateway.
- Authentication: `Authorization: Bearer <JWT>`.
- The service validates the agreed JWT locally.
- Recipient identity is derived from validated authentication.
- Public requests never select a notification recipient by submitting a user
  ID.
- IDs are UUIDs and timestamps are ISO 8601 UTC strings.
- Users can read or change only their own notifications.

## Proposed endpoints

| Method | Path | Purpose | Planned implementation |
| --- | --- | --- | --- |
| `GET` | `/notifications` | List the authenticated user's notifications | Week 3 |
| `GET` | `/notifications/{notificationId}` | Read one owned notification | Week 3 |
| `PATCH` | `/notifications/{notificationId}/read` | Mark one owned notification read | Week 3 |
| `PATCH` | `/notifications/read-all` | Mark the user's notifications read | Week 3 proposal |

No public notification-create endpoint is proposed. Notifications originate
from trusted internal domain events or application use cases.

## Notification list proposal

`GET /notifications`

Proposed query parameters:

| Parameter | Required | Rule |
| --- | --- | --- |
| `unreadOnly` | no | boolean, default `false` |
| `skip` | no | integer, minimum `0`, default `0` |
| `take` | no | integer, `1..100`, default `50` |

Results are ordered newest first with a stable ID tie-breaker.

Expected responses: `200`, `400`, `401`, `500`.

## Owned-notification behavior

For single-notification read/update operations, the database predicate includes
both notification ID and authenticated recipient ID. The contract must not
reveal whether an inaccessible notification exists.

Expected responses: `200`, `401`, `404`, `500`.

## Notification representation proposal

```json
{
  "id": "uuid",
  "type": "BOOKING_CREATED",
  "title": "Booking confirmed",
  "message": "Your booking was confirmed.",
  "readAt": null,
  "createdAt": "2026-08-01T09:55:00.000Z"
}
```

The public representation does not need to return the recipient user ID.

`PATCH /notifications/read-all` returns the number of records changed.
Inaccessible records return `404` without revealing whether another user owns
the supplied identifier.
