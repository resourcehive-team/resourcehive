# Notification Event Contracts

Topics:

| Topic                                            | Key        | Purpose                             |
| ------------------------------------------------ | ---------- | ----------------------------------- |
| `resourcehive.notification.commands.v1`          | user ID    | General typed notification commands |
| `resourcehive.identity.notification-commands.v1` | user ID    | Verification email commands only    |
| `resourcehive.booking.events.v1`                 | booking ID | Booking lifecycle events            |

Every envelope has a UUID event or command ID, version, producer, correlation
ID, occurrence time, and a typed payload. Consumers reject unknown versions.

Approved initial templates:

- `identity.verify-email.v1`
- `booking.confirmed.v1`
- `booking.cancelled.v1`
- `booking.completed.v1`

Only `identity.verify-email.v1` may request `EMAIL`, and it must request no
other channel. Booking templates use `IN_APP` and `PUSH`.
