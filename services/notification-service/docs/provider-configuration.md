# Provider Configuration

## Kafka

Configure brokers, client ID, consumer group, TLS, and SASL through environment
variables. Development uses a local KRaft broker. Production must use encrypted
transport and topic ACLs.

Before setting `KAFKA_ENABLED=true`:

1. Provision the three inbound topics listed in `event-contracts.md`.
2. Grant the notification client only the required producer/consumer ACLs.
3. Configure `KAFKA_BROKERS`, TLS, and matching SASL credentials.
4. Apply the database migration, then deploy one instance as a smoke test.

## Resend

Use separate development and production keys and a verified sending subdomain.
Automatic retries use the delivery UUID as the provider idempotency key.

Before setting `RESEND_ENABLED=true`, configure `RESEND_API_KEY`,
and `RESEND_FROM_EMAIL`. Resend is used only for email verification. This
version deliberately does not retain webhook event history.

## Firebase Cloud Messaging

Use separate development and production Firebase projects and Application
Default Credentials. Register Android and iOS applications in Firebase. Upload
the APNs authentication key in Firebase; it is not stored by this service.

Before setting `FCM_ENABLED=true`, configure `FIREBASE_PROJECT_ID` and mount a
least-privilege service-account file at `GOOGLE_APPLICATION_CREDENTIALS`.

## Deployment gate

Provider flags default to `false`. The service uses non-delivering console
adapters while disabled and fails startup when an enabled provider is missing
required configuration. The health response reports active Kafka, email, and
push modes without exposing credentials.

`DELIVERY_POLL_INTERVAL_MS` controls how often queued email and push rows are
checked and defaults to five seconds.
