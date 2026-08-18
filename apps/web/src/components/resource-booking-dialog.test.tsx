import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceBookingDialog } from "@/components/resource-booking-dialog";
import {
  createBooking,
  getResourceSlots,
} from "@/lib/booking-service/booking-api";

vi.mock("@/lib/booking-service/booking-api", () => ({
  createBooking: vi.fn(),
  getResourceSlots: vi.fn(),
}));

const createBookingMock = vi.mocked(createBooking);
const getResourceSlotsMock = vi.mocked(getResourceSlots);

describe("ResourceBookingDialog", () => {
  beforeEach(() => {
    createBookingMock.mockReset();
    getResourceSlotsMock.mockReset();
  });

  it("opens the booking form with separate From and To controls", async () => {
    render(
      <ResourceBookingDialog
        resourceId="resource-1"
        resourceName="Study Room"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));

    expect(await screen.findByText("Book Study Room")).toBeDefined();
    expect(screen.getByText("From")).toBeDefined();
    expect(screen.getByText("To")).toBeDefined();
    expect(screen.getByRole("combobox", { name: "From hour" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "From minute" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "To hour" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "To minute" })).toBeDefined();
    expect(document.querySelector('input[type="time"]')).toBeNull();
  });

  it("does not call booking APIs until both dates are selected", async () => {
    render(
      <ResourceBookingDialog
        resourceId="resource-1"
        resourceName="Study Room"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create booking" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirm booking" }),
    );

    expect(
      await screen.findByText("Choose both a date and time for From and To."),
    ).toBeDefined();
    expect(getResourceSlotsMock).not.toHaveBeenCalled();
    expect(createBookingMock).not.toHaveBeenCalled();
  });
});
