import { isISO8601, isUUID } from "class-validator";
import { NotificationContractError } from "./contract-validator";

export type BookingEventType =
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "slot.created";

const BOOKING_LIFECYCLE_EVENT_TYPES: BookingEventType[] = [
  "booking.confirmed",
  "booking.cancelled",
  "booking.completed",
];

export interface BookingEventV1 {
  kind: "booking.event";
  eventId: string;
  eventType: BookingEventType;
  eventVersion: 1;
  producer: "booking-service";
  correlationId: string;
  occurredAt: string;
  payload: {
    bookingId?: string;
    slotId?: string;
    resourceId: string;
    resourceName: string;
    organizationId: string;
    userId?: string;
    email?: string;
    startsAt: string;
    endsAt?: string;
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
    ![
      "booking.confirmed",
      "booking.cancelled",
      "booking.completed",
      "slot.created",
    ].includes(event.eventType)
  ) {
    reject("Unsupported booking event type");
  }

  const payload = event.payload;
  if (
    !payload ||
    !isUUID(payload.resourceId) ||
    !isUUID(payload.organizationId) ||
    !payload.resourceName?.trim() ||
    !payload.startsAt ||
    !isISO8601(payload.startsAt)
  ) {
    reject("Invalid booking event payload");
  }
  if (payload.endsAt !== undefined && !isISO8601(payload.endsAt)) {
    reject("Invalid booking event payload");
  }

  if (BOOKING_LIFECYCLE_EVENT_TYPES.includes(event.eventType)) {
    if (!isUUID(payload.bookingId) || !isUUID(payload.userId)) {
      reject("Booking lifecycle events require bookingId and userId");
    }
  }
  if (event.eventType === "slot.created" && !isUUID(payload.slotId)) {
    reject("Slot creation events require slotId");
  }

  return event as BookingEventV1;
}

function reject(message: string): never {
  throw new NotificationContractError("INVALID_BOOKING_EVENT", message);
}
