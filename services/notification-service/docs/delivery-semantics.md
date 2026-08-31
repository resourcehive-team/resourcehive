# Delivery Semantics

Delivery states are `QUEUED`, `PROCESSING`, `RETRY_SCHEDULED`, `SENT`, and
`FAILED`.

Email and push become `SENT` after their provider accepts the request. The
service does not claim device receipt or track provider webhook history.

Transient failures use delays of 30 seconds, 2 minutes, 10 minutes, 1 hour,
and 6 hours. Permanent errors and exhausted retries remain `FAILED` with the
latest error on the delivery row.

The poller atomically changes due work to `PROCESSING`. Work left processing
for five minutes is returned to `QUEUED` after a presumed worker interruption.
