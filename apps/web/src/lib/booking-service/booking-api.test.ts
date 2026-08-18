import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api-client";
import {
  createBooking,
  getResourceSlots,
} from "@/lib/booking-service/booking-api";
import type {
  CreatedBooking,
  ResourceSlot,
} from "@/lib/booking-service/types";

vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe("booking API", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("lists tenant-visible slots in the requested time window", async () => {
    const slots: ResourceSlot[] = [];
    const signal = new AbortController().signal;
    apiRequestMock.mockResolvedValueOnce(slots);

    await expect(
      getResourceSlots(" resource/one ", {
        startsAtOrAfter: new Date("2030-08-01T10:00:00.000Z"),
        startsBefore: new Date("2030-08-01T12:00:00.000Z"),
        skip: 0,
        take: 100,
        signal,
      }),
    ).resolves.toBe(slots);

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/resources/resource%2Fone/slots?startsAtOrAfter=2030-08-01T10%3A00%3A00.000Z&startsBefore=2030-08-01T12%3A00%3A00.000Z&skip=0&take=100",
      { signal },
    );
  });

  it("creates a booking using only the server-issued slot ID", async () => {
    const booking = { id: "booking-1" } as CreatedBooking;
    apiRequestMock.mockResolvedValueOnce(booking);

    await expect(createBooking(" slot-1 ")).resolves.toBe(booking);
    expect(apiRequestMock).toHaveBeenCalledWith("/bookings", {
      method: "POST",
      json: { resourceSlotId: "slot-1" },
    });
  });

  it.each([
    ["an invalid date", () => getResourceSlots("resource-1", { startsAtOrAfter: new Date("invalid") }), "Slot start must be a valid date."],
    ["a negative skip", () => getResourceSlots("resource-1", { skip: -1 }), "Skip must be a non-negative integer."],
    ["an excessive take", () => getResourceSlots("resource-1", { take: 101 }), "Take must be an integer between 1 and 100."],
    ["an empty slot ID", () => createBooking(" "), "Resource slot ID is required."],
  ])("rejects %s", (_name, request, message) => {
    expect(request).toThrow(message);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
