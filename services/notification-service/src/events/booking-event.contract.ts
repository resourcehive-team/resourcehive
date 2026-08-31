import { isISO8601, isUUID } from "class-validator";

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
  )
    throw new Error("Invalid booking event envelope");
  if (
    !event.eventId ||
    !isUUID(event.eventId) ||
    !event.correlationId ||
    !isUUID(event.correlationId) ||
    !event.occurredAt ||
    !isISO8601(event.occurredAt)
  )
    throw new Error("Invalid booking event identity");
  if (
    !event.eventType ||
    !["booking.confirmed", "booking.cancelled", "booking.completed"].includes(
      event.eventType,
    )
  )
    throw new Error("Unsupported booking event type");
  if (
    !event.payload ||
    !isUUID(event.payload.bookingId) ||
    !isUUID(event.payload.userId) ||
    !event.payload.resourceName?.trim()
  )
    throw new Error("Invalid booking event payload");
  return event as BookingEventV1;
}
