import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  CancelledBooking,
  CreatedBooking,
  OrganizationBooking,
  ResourceSlot,
  UserBooking,
} from "@/lib/booking-service/types";

export interface CancelBookingOptions {
  makeSlotAvailable?: boolean;
  reason?: string;
}

export interface ResourceSlotListOptions {
  startsAtOrAfter?: Date;
  startsBefore?: Date;
  skip?: number;
  take?: number;
  signal?: AbortSignal;
}

export function getResourceSlots(
  resourceId: string,
  options: ResourceSlotListOptions = {},
): Promise<ResourceSlot[]> {
  const resource = apiPathSegment(resourceId, "Resource ID");
  const query = new URLSearchParams();

  if (options.startsAtOrAfter) {
    query.set(
      "startsAtOrAfter",
      validDate(options.startsAtOrAfter, "Slot start").toISOString(),
    );
  }

  if (options.startsBefore) {
    query.set(
      "startsBefore",
      validDate(options.startsBefore, "Slot end").toISOString(),
    );
  }

  if (options.skip !== undefined) {
    query.set("skip", String(nonNegativeInteger(options.skip, "Skip")));
  }

  if (options.take !== undefined) {
    query.set("take", String(boundedTake(options.take)));
  }

  const queryString = query.toString();

  return apiRequest<ResourceSlot[]>(
    `/resources/${resource}/slots${queryString ? `?${queryString}` : ""}`,
    { signal: options.signal },
  );
}

export function createBooking(resourceSlotId: string): Promise<CreatedBooking> {
  const slotId = resourceSlotId.trim();

  if (!slotId) {
    throw new Error("Resource slot ID is required.");
  }

  return apiRequest<CreatedBooking>("/bookings", {
    method: "POST",
    json: { resourceSlotId: slotId },
  });
}

export function createResourceSlot(
  resourceId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<ResourceSlot> {
  const id = resourceId.trim();
  const start = validDate(startsAt, "Slot start");
  const end = validDate(endsAt, "Slot end");

  if (!id) {
    throw new Error("Resource ID is required.");
  }

  if (end.getTime() <= start.getTime()) {
    throw new Error("Slot end must be later than its start.");
  }

  return apiRequest<ResourceSlot>("/slots", {
    method: "POST",
    json: {
      resourceId: id,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    },
  });
}

export function getMyBookings(signal?: AbortSignal): Promise<UserBooking[]> {
  return apiRequest<UserBooking[]>("/bookings/me", { signal });
}

export function getOrganizationBookings(
  signal?: AbortSignal,
): Promise<OrganizationBooking[]> {
  return apiRequest<OrganizationBooking[]>("/bookings/org", { signal });
}

export function completeOrganizationBooking(
  bookingId: string,
): Promise<OrganizationBooking> {
  const booking = apiPathSegment(bookingId, "Booking ID");

  return apiRequest<OrganizationBooking>(`/bookings/${booking}/complete`, {
    method: "PATCH",
  });
}

export function cancelBooking(
  bookingId: string,
  options: CancelBookingOptions = {},
): Promise<CancelledBooking> {
  const booking = apiPathSegment(bookingId, "Booking ID");
  const reason = options.reason?.trim();

  return apiRequest<CancelledBooking>(`/bookings/${booking}/cancel`, {
    method: "PATCH",
    json: {
      ...(reason ? { reason } : {}),
      ...(options.makeSlotAvailable === undefined
        ? {}
        : { makeSlotAvailable: options.makeSlotAvailable }),
    },
  });
}

function validDate(value: Date, label: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function boundedTake(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Take must be an integer between 1 and 100.");
  }

  return value;
}
