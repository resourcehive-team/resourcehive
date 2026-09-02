# Provider Configuration

## Kafka

Configure brokers, client ID, consumer group, TLS, and SASL through environment
variables. Development uses a local KRaft broker. Production must use encrypted
transport and topic ACLs.

Before setting `KAFKA_ENABLED=true`:

1. Provision the three inbound topics and the dead-letter topic listed in
   `event-contracts.md`.
2. Grant the notification client consume access to the inbound topics and
   produce access to the dead-letter topic.
3. Configure `KAFKA_BROKERS`, TLS, and matching SASL credentials.
4. Apply the database migration, then deploy one instance as a smoke test.

Producing services need produce access only to the topic they own. They should
key commands by recipient user ID, key booking events by booking ID, and reuse
the same command/event UUID when retrying a logical message.

## Resend

Use separate development and production keys and a verified sending subdomain.
Automatic retries use the delivery UUID as the provider idempotency key.

Before setting `RESEND_ENABLED=true`, configure `RESEND_API_KEY`,
and `RESEND_FROM_EMAIL`. Resend is used only for email verification. This
version deliberately does not retain webhook event history.

## Firebase Cloud Messaging

Use separate development and production Firebase projects and Application
Default Credentials. Register a Firebase Web App and generate a Web Push
certificate for the browser client.

Before setting `FCM_ENABLED=true`, configure `FIREBASE_PROJECT_ID` and mount a
least-privilege service-account file at `GOOGLE_APPLICATION_CREDENTIALS`.
Set `WEB_APP_URL` so clicking a browser notification opens the notifications
page. For browser setup and a real push smoke test without Booking Service, see
[`web-fcm-local-testing.md`](web-fcm-local-testing.md).

### Production Firebase secret

Production uses the protected GitHub `production` environment as the secret
source. Create a repository environment secret named
`FIREBASE_SERVICE_ACCOUNT_JSON` containing the complete service-account JSON.
The deployment workflow validates the required JSON fields, transfers it over
SSH, and atomically installs it on Linode at:

```text
/home/deploy/resourcehive/secrets/firebase-service-account.json
```

The directory is mode `700`, the file is mode `600`, and Docker Compose mounts
the file read-only into only Notification Service at:

```text
/run/secrets/firebase-service-account.json
```

The JSON must not be added to `.env.production`, the repository, a container
image, or GitHub Actions logs. To rotate the credential, replace the GitHub
environment secret and run the deployment workflow again; the remote file is
replaced atomically before the container is recreated.

## Deployment gate

Provider flags default to `false`. The service uses non-delivering console
adapters while disabled and fails startup when an enabled provider is missing
required configuration. The health response reports active Kafka, email, and
push modes without exposing credentials.

`DELIVERY_POLL_INTERVAL_MS` controls how often queued email and push rows are
checked and defaults to five seconds.
