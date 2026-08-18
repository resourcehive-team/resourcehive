import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceBookingDialog } from "@/components/resource-booking-dialog";
import {
  createBooking,
  getResourceSlots,
} from "@/lib/booking-service/booking-api";
import type {
  CreatedBooking,
  ResourceSlot,
} from "@/lib/booking-service/types";

vi.mock("@/lib/booking-service/booking-api", () => ({
  createBooking: vi.fn(),
  getResourceSlots: vi.fn(),
}));

const createBookingMock = vi.mocked(createBooking);
const getResourceSlotsMock = vi.mocked(getResourceSlots);

const availableSlot: ResourceSlot = {
  id: "slot-1",
  resourceId: "resource-1",
  startsAt: "2030-08-20T10:00:00.000Z",
  endsAt: "2030-08-20T11:30:00.000Z",
  createdAt: "2030-08-01T10:00:00.000Z",
  available: true,
};

const createdBooking: CreatedBooking = {
  id: "booking-1",
  resourceSlotId: availableSlot.id,
  resourceId: availableSlot.resourceId,
  resourceName: "Study Room",
  userId: "user-1",
  status: "Confirmed",
  startsAt: availableSlot.startsAt,
  endsAt: availableSlot.endsAt,
  pointsDeducted: 10,
  createdAt: "2030-08-18T10:00:00.000Z",
};

describe("ResourceBookingDialog", () => {
  beforeEach(() => {
    createBookingMock.mockReset();
    getResourceSlotsMock.mockReset();
    getResourceSlotsMock.mockResolvedValue([availableSlot]);
  });

  it("loads future slots and presents them as a radio table", async () => {
    render(
      <ResourceBookingDialog
        resourceId="resource-1"
        resourceName="Study Room"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    expect(await screen.findByText("Book Study Room")).toBeDefined();
    expect(await screen.findByRole("radio")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "From" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "To" })).toBeDefined();
    expect(screen.getByText("1 hr 30 min")).toBeDefined();

    expect(getResourceSlotsMock).toHaveBeenCalledWith(
      "resource-1",
      expect.objectContaining({
        startsAtOrAfter: expect.any(Date),
        take: 100,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("books the selected published slot by its ID", async () => {
    createBookingMock.mockResolvedValue(createdBooking);

    render(
      <ResourceBookingDialog
        resourceId="resource-1"
        resourceName="Study Room"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    const slotControl = await screen.findByRole("radio");
    const confirmButton = screen.getByRole("button", {
      name: "Confirm booking",
    });

    expect(confirmButton.hasAttribute("disabled")).toBe(true);

    fireEvent.click(slotControl);

    await waitFor(() =>
      expect(confirmButton.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(confirmButton);

    expect(await screen.findByText("Your slot is reserved.")).toBeDefined();
    expect(createBookingMock).toHaveBeenCalledWith("slot-1");
  });

  it("shows a clear empty state when no future slots are available", async () => {
    getResourceSlotsMock.mockResolvedValue([
      { ...availableSlot, id: "unavailable", available: false },
      {
        ...availableSlot,
        id: "past",
        startsAt: "2020-08-20T10:00:00.000Z",
        endsAt: "2020-08-20T11:30:00.000Z",
      },
    ]);

    render(
      <ResourceBookingDialog
        resourceId="resource-1"
        resourceName="Study Room"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    expect(await screen.findByText("No available slots")).toBeDefined();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Confirm booking" }),
    ).toBeNull();
  });
});
