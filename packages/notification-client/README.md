# ResourceHive Notification Client

Shared notification contracts and Kafka producer for ResourceHive NestJS
services. Import `NotificationClientModule.register(...)` once in a service and
inject `NotificationClientService` where a notification must be published.

```ts
NotificationClientModule.register({ producer: "resource-service" });

await notifications.send({
  recipientUserId: userId,
  title: "Resource updated",
  message: "Robotics Lab hours changed.",
});
```

Booking Service uses `publishBookingEvent(...)` after confirmed, cancelled,
completed, and slot-created state changes. Notification Service maps the
booking lifecycle events to in-app/browser-push messages for the booking
user; `slot.created` carries no recipient and is only used for live
calendar/availability sync by other consumers of the
`resourcehive.booking.events.v1` topic.

Identity Service alone may call the identity email methods. Provider
credentials, rendering, persistence, retries, Resend, and Firebase remain
owned by Notification Service.

The client uses `KAFKA_ENABLED`, `KAFKA_BROKERS`, `KAFKA_SSL`,
`KAFKA_SASL_USERNAME`, and `KAFKA_SASL_PASSWORD`. It derives a distinct Kafka
client ID from the registered producer. Calls fail clearly when publishing is
disabled. Supply a stable `commandId` when retrying the same logical operation;
Notification Service uses it for deduplication.
