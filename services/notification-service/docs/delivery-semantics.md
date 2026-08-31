# Delivery Semantics

Delivery states are `QUEUED`, `PROCESSING`, `RETRY_SCHEDULED`, `ACCEPTED`,
`SENT`, `DELIVERED`, `FAILED`, `BOUNCED`, `COMPLAINED`, and `SUPPRESSED`.

Email is `SENT` after Resend accepts it and `DELIVERED` after a verified
provider webhook. Push is `ACCEPTED` after FCM accepts it; it is not considered
delivered without an application acknowledgement.

Transient failures use delays of 30 seconds, 2 minutes, 10 minutes, 1 hour,
and 6 hours. Permanent errors fail immediately. Exhausted work is recorded as
failed and copied to the dead-letter topic.

