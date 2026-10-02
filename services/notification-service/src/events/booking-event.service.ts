import { Injectable } from "@nestjs/common";
import {
  BookingEventV1,
  NOTIFICATION_TEMPLATES,
  NotificationCommandV1,
  parseBookingEvent,
} from "@resourcehive/notification-client";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationCommandService } from "./notification-command.service";

@Injectable()
export class BookingEventService {
  constructor(
    private readonly commands: NotificationCommandService,
    private readonly realtime: RealtimeGateway,
  ) {}
  async handle(input: unknown) {
    const event = parseBookingEvent(input);
    this.realtime.emitBookingEvent(event);
    if (event.eventType === "slot.created") {
      // Slot creation drives live calendar sync only; it has no
      // recipient user and is not a push/in-app notification.
      return undefined;
    }
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
      rootOrganizationId: event.payload.rootOrganizationId,
      channels: ["IN_APP", "PUSH"],
      template: { key, version: 1, variables: { ...event.payload } },
      correlationId: event.correlationId,
      occurredAt: event.occurredAt,
    };
  }
}
