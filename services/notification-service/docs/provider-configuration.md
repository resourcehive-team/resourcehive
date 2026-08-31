# Provider Configuration

## Kafka

Configure brokers, client ID, consumer group, TLS, and SASL through environment
variables. Development uses a local KRaft broker. Production must use encrypted
transport and topic ACLs.

## Resend

Use separate development and production keys, a verified sending subdomain,
and a webhook signing secret. Automatic retries use the delivery UUID as the
provider idempotency key.

## Firebase Cloud Messaging

Use separate development and production Firebase projects and Application
Default Credentials. Register Android and iOS applications in Firebase. Upload
the APNs authentication key in Firebase; it is not stored by this service.

