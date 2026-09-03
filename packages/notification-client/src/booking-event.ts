import { isISO8601, isUUID } from "class-validator";
import { NotificationContractError } from "./contract-validator";

export type BookingEventType =
  "booking.confirmed" | "booking.cancelled" | "booking.completed";

export interface BookingEventV1 {
  kind: "booking.event";
  eventId: string;
  eventType: BookingEventType;
  eventVersion: 1;
  producer: "booking-service";
  correlationId: string;
  occurredAt: string;
  payload: {
    bookingId: string;
    userId: string;
    email?: string;
    resourceName: string;
    refundPoints?: number;
  };
}

export function parseBookingEvent(input: unknown): BookingEventV1 {
  const event = input as Partial<BookingEventV1>;
  if (
    event.kind !== "booking.event" ||
    event.producer !== "booking-service" ||
    event.eventVersion !== 1
  ) {
    reject("Invalid booking event envelope");
  }
  if (
    !event.eventId ||
    !isUUID(event.eventId) ||
    !event.correlationId ||
    !isUUID(event.correlationId) ||
    !event.occurredAt ||
    !isISO8601(event.occurredAt)
  ) {
    reject("Invalid booking event identity");
  }
  if (
    !event.eventType ||
    !["booking.confirmed", "booking.cancelled", "booking.completed"].includes(
      event.eventType,
    )
  ) {
    reject("Unsupported booking event type");
  }
  if (
    !event.payload ||
    !isUUID(event.payload.bookingId) ||
    !isUUID(event.payload.userId) ||
    !event.payload.resourceName?.trim()
  ) {
    reject("Invalid booking event payload");
  }
  return event as BookingEventV1;
}

function reject(message: string): never {
  throw new NotificationContractError("INVALID_BOOKING_EVENT", message);
}
