import { Injectable } from "@nestjs/common";
import {
  NOTIFICATION_TEMPLATES,
  NotificationCommandV1,
} from "@resourcehive/notification-client";
import { BookingEventV1, parseBookingEvent } from "./booking-event.contract";
import { NotificationCommandService } from "./notification-command.service";

@Injectable()
export class BookingEventService {
  constructor(private readonly commands: NotificationCommandService) {}
  handle(input: unknown) {
    const event = parseBookingEvent(input);
    return this.commands.process(this.toCommand(event));
  }
  toCommand(event: BookingEventV1): NotificationCommandV1 {
    const key =
      event.eventType === "booking.confirmed"
        ? NOTIFICATION_TEMPLATES.bookingConfirmed
        : event.eventType === "booking.cancelled"
          ? NOTIFICATION_TEMPLATES.bookingCancelled
          : NOTIFICATION_TEMPLATES.bookingCompleted;
    return {
      kind: "notification.command",
      commandId: event.eventId,
      producer: "booking-service",
      recipient: { userId: event.payload.userId, email: event.payload.email },
      channels: ["IN_APP", "PUSH"],
      template: { key, version: 1, variables: { ...event.payload } },
      correlationId: event.correlationId,
      occurredAt: event.occurredAt,
    };
  }
}
