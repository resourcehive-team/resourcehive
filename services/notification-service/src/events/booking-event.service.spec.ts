import {
  NotificationContractError,
  parseBookingEvent,
} from "@resourcehive/notification-client";
import { BookingEventService } from "./booking-event.service";
import { NotificationCommandService } from "./notification-command.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

function fakeRealtimeGateway() {
  return { emitBookingEvent: jest.fn() };
}

describe("BookingEventService", () => {
  it("maps confirmation to in-app and push channels", () => {
    const service = new BookingEventService(
      {} as NotificationCommandService,
      fakeRealtimeGateway() as unknown as RealtimeGateway,
    );
    const command = service.toCommand({
      kind: "booking.event",
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "booking.confirmed",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "22222222-2222-4222-8222-222222222222",
      occurredAt: "2026-08-31T12:00:00.000Z",
      payload: {
        rootOrganizationId: "77777777-7777-4777-8777-777777777777",
        bookingId: "33333333-3333-4333-8333-333333333333",
        userId: "44444444-4444-4444-8444-444444444444",
        resourceId: "55555555-5555-4555-8555-555555555555",
        organizationId: "66666666-6666-4666-8666-666666666666",
        resourceName: "Robotics Lab",
        startsAt: "2026-08-31T13:00:00.000Z",
      },
    });
    expect(command.channels).toEqual(["IN_APP", "PUSH"]);
  });

  it("rejects malformed booking events as permanent contract errors", () => {
    expect(() =>
      parseBookingEvent({
        kind: "booking.event",
        producer: "booking-service",
        eventVersion: 1,
      }),
    ).toThrow(NotificationContractError);
  });

  it("ignores slot.created events instead of treating them as notifications", async () => {
    const process = jest.fn();
    const realtime = fakeRealtimeGateway();
    const service = new BookingEventService(
      { process } as unknown as NotificationCommandService,
      realtime as unknown as RealtimeGateway,
    );
    const result = await service.handle({
      kind: "booking.event",
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "slot.created",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "22222222-2222-4222-8222-222222222222",
      occurredAt: "2026-08-31T12:00:00.000Z",
      payload: {
        rootOrganizationId: "77777777-7777-4777-8777-777777777777",
        slotId: "33333333-3333-4333-8333-333333333333",
        resourceId: "55555555-5555-4555-8555-555555555555",
        organizationId: "66666666-6666-4666-8666-666666666666",
        resourceName: "Robotics Lab",
        startsAt: "2026-08-31T13:00:00.000Z",
      },
    });
    expect(result).toBeUndefined();
    expect(process).not.toHaveBeenCalled();
    expect(realtime.emitBookingEvent).toHaveBeenCalled();
  });

  it("fans every booking event out over the realtime gateway", async () => {
    const process = jest.fn().mockResolvedValue(undefined);
    const realtime = fakeRealtimeGateway();
    const service = new BookingEventService(
      { process } as unknown as NotificationCommandService,
      realtime as unknown as RealtimeGateway,
    );
    const event = {
      kind: "booking.event",
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "booking.confirmed",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "22222222-2222-4222-8222-222222222222",
      occurredAt: "2026-08-31T12:00:00.000Z",
      payload: {
        rootOrganizationId: "77777777-7777-4777-8777-777777777777",
        bookingId: "33333333-3333-4333-8333-333333333333",
        userId: "44444444-4444-4444-8444-444444444444",
        resourceId: "55555555-5555-4555-8555-555555555555",
        organizationId: "66666666-6666-4666-8666-666666666666",
        resourceName: "Robotics Lab",
        startsAt: "2026-08-31T13:00:00.000Z",
      },
    };

    await service.handle(event);

    expect(realtime.emitBookingEvent).toHaveBeenCalledWith(event);
    expect(process).toHaveBeenCalled();
  });
});
