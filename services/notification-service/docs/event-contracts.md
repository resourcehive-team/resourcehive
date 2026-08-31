# Notification Event Contracts

Topics:

| Topic | Key | Purpose |
| --- | --- | --- |
| `resourcehive.notification.commands.v1` | user ID | General typed notification commands |
| `resourcehive.identity.notification-commands.v1` | user ID | Restricted account-email commands |
| `resourcehive.booking.events.v1` | booking ID | Booking lifecycle events |
| `resourcehive.notification.delivery-jobs.v1` | delivery ID | Provider work references |
| `resourcehive.notification.dlq.v1` | original key | Exhausted or invalid messages |

Every envelope has a UUID event or command ID, version, producer, correlation
ID, occurrence time, and a typed payload. Consumers reject unknown versions.

Approved initial templates:

- `identity.verify-email.v1`
- `identity.password-reset.v1`
- `identity.password-changed.v1`
- `booking.confirmed.v1`
- `booking.cancelled.v1`
- `booking.completed.v1`

