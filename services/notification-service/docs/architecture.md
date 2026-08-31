# Notification Service Architecture

The Notification Service owns notification persistence, approved templates,
delivery orchestration, retries, WebSocket fan-out, and integrations with email
and push providers. Domain services own the business decision that a
notification is required.

## Flow

1. A domain service commits its business mutation and an `OutboxEvent` in the
   same database transaction.
2. The producer's outbox publisher sends the versioned event or notification
   command to Kafka.
3. Notification Service validates and deduplicates the message, creates the
   in-app notification and channel delivery rows, then commits the Kafka
   offset.
4. Delivery workers consume delivery IDs and call the configured provider.
5. Retry scheduling and final delivery state remain in Postgres.
6. Resend webhooks update email delivery state. FCM accepts push messages; an
   application acknowledgement is required before calling a push delivered.

The system is at-least-once. Database uniqueness, processed-event records, and
provider idempotency prevent duplicates.

## Boundaries

- Producers publish template keys and typed variables, never arbitrary HTML.
- Provider credentials exist only in Notification Service.
- Identity owns verification and password-reset tokens.
- Kafka payload bodies and token-bearing URLs must never be logged.
- WebSocket failure never rolls back a persisted notification.

