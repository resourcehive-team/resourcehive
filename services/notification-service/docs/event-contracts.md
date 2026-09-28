# Notification Event Contracts

Topics:

| Topic                                            | Key        | Purpose                             |
| ------------------------------------------------ | ---------- | ----------------------------------- |
| `resourcehive.notification.commands.v1`          | user ID    | General typed notification commands |
| `resourcehive.identity.notification-commands.v1` | user ID    | Verification email commands only    |
| `resourcehive.booking.events.v1`                 | booking ID | Booking lifecycle events            |
| `resourcehive.notification.dead-letter.v1`       | source key | Permanently rejected input records  |

Every envelope has a UUID event or command ID, version, producer, correlation
ID, occurrence time, and a typed payload. Consumers reject unknown versions.
Application services should create these envelopes through
`@resourcehive/notification-client` instead of duplicating this JSON manually.

Approved initial templates:

- `identity.verify-email.v1`
- `identity.password-reset.v1`
- `identity.password-changed.v1`
- `booking.confirmed.v1`
- `booking.cancelled.v1`
- `booking.completed.v1`
- `notification.message.v1`

Only Identity Service templates may request `EMAIL`, and they must request no
other channel. Booking templates use `IN_APP` and `PUSH`.
`notification.message.v1` lets Identity, Booking, and Resource services send
plain-text in-app and browser push messages. It requires `title` and `message`
variables and cannot request email.

## General push command

Publish this JSON to `resourcehive.notification.commands.v1`, keyed by the
recipient user ID:

```json
{
  "kind": "notification.command",
  "commandId": "11111111-1111-4111-8111-111111111111",
  "producer": "resource-service",
  "recipient": {
    "userId": "22222222-2222-4222-8222-222222222222"
  },
  "channels": ["IN_APP", "PUSH"],
  "template": {
    "key": "notification.message.v1",
    "version": 1,
    "variables": {
      "title": "Resource updated",
      "message": "Robotics Lab hours changed."
    }
  },
  "correlationId": "33333333-3333-4333-8333-333333333333",
  "occurredAt": "2026-09-02T08:00:00.000Z"
}
```

Generate `commandId` once and reuse the same UUID when retrying the same
logical command. Notification Service stores that UUID in `processed_events`,
so Kafka redelivery cannot create duplicate notifications or deliveries.

## Verification email command

Identity Service publishes identity email templates to
`resourcehive.identity.notification-commands.v1`. Each command must contain a
ResourceHive `userId`, may contain the destination `email`, and must use only
the `EMAIL` channel. Verification commands require `verificationUrl`; password
reset commands require `resetUrl`; password-changed commands contain no token
or URL variables.

## Rejections and retries

Notification Service commits an offset only after the database transaction
succeeds. Database and other transient failures are thrown without a manual
commit so Kafka can redeliver the record.

Invalid contracts and permanently invalid recipients are published to
`resourcehive.notification.dead-letter.v1` before their source offset is
committed. Dead-letter records contain source coordinates, message ID, and the
error, but deliberately omit the original payload so verification tokens and
other private content are not duplicated.
