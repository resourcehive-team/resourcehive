import { BookingEventService } from "./booking-event.service";
import { NotificationCommandService } from "./notification-command.service";

describe("BookingEventService", () => {
  it("maps confirmation to in-app and push channels", () => {
    const service = new BookingEventService({} as NotificationCommandService);
    const command = service.toCommand({
      kind: "booking.event",
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "booking.confirmed",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "22222222-2222-4222-8222-222222222222",
      occurredAt: "2026-08-31T12:00:00.000Z",
      payload: {
        bookingId: "33333333-3333-4333-8333-333333333333",
        userId: "44444444-4444-4444-8444-444444444444",
        resourceName: "Robotics Lab",
      },
    });
    expect(command.channels).toEqual(["IN_APP", "PUSH"]);
  });
});
