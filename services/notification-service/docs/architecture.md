# Notification Service Architecture

The Notification Service owns notification persistence, approved templates,
delivery retries, verification email, and browser push delivery.
Domain services own the business decision that a notification is required.
They use `@resourcehive/notification-client`; its simple TypeScript methods
validate and publish commands to Kafka. There is no second internal HTTP API.

## Flow

1. A domain service publishes a versioned event or notification command to
   Kafka after its business mutation succeeds.
2. Notification Service validates and deduplicates the message using
   `processed_events`.
3. In-app and push commands create notification history. Verification email
   creates only a delivery row, so its URL never enters notification history.
4. A database poller claims queued delivery rows and calls Resend or FCM.
5. Transient failures remain on the delivery row with the next retry time.
6. Successful email rows have their subject, body, and data scrubbed.

Kafka consumption is at-least-once. Processed-event uniqueness prevents a
command from creating duplicate database work. Resend also receives the
delivery UUID as its idempotency key.

Offsets are committed after successful transactional processing. Invalid
contracts and inactive recipients are written to the notification dead-letter
topic before being committed; transient failures remain uncommitted for Kafka
redelivery.

## Boundaries

- Producers publish template keys and typed variables, never arbitrary HTML.
- Provider credentials exist only in Notification Service.
- Identity owns verification tokens and is the only email-command producer.
- Email is restricted to `identity.verify-email.v1`.
- Booking and other application events use in-app and web push channels.
- Internal services can use `notification.message.v1` for bounded plain-text
  in-app and browser push messages.
- Booking Service publishes a general in-app and push command to each approved
  administrator of the resource-owning organization after booking creation.
- Kafka payload bodies and token-bearing URLs must never be logged.
- In-app notifications are read through REST; browser alerts are delivered by FCM.
