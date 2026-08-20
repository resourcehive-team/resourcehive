import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BookingHistory } from "@/components/booking-history";
import { cancelBooking } from "@/lib/booking-service/booking-api";
import type {
  CancelledBooking,
  UserBooking,
} from "@/lib/booking-service/types";

vi.mock("@/lib/booking-service/booking-api", () => ({
  cancelBooking: vi.fn(),
  completeOrganizationBooking: vi.fn(),
}));

const cancelBookingMock = vi.mocked(cancelBooking);

const booking: UserBooking = {
  id: "booking-1",
  resourceSlotId: "slot-1",
  userId: "user-1",
  status: "CONFIRMED",
  createdAt: "2030-08-01T10:00:00+05:30",
  resourceSlot: {
    startsAt: "2030-08-20T13:00:00+05:30",
    endsAt: "2030-08-21T13:00:00+05:30",
    resource: {
      id: "resource-1",
      name: "Engineering Robotics Lab",
      pointCost: 25,
    },
  },
};

describe("BookingHistory", () => {
  it("shows both dates for a multi-day booking and lets its user cancel", async () => {
    const onBookingUpdated = vi.fn();
    const cancelledBooking: CancelledBooking = {
      ...booking,
      status: "CANCELLED",
      cancelledAt: "2030-08-10T10:00:00+05:30",
      refundPoints: 13,
      slotStatus: "PUBLISHED",
      user: {
        firstName: "Alice",
        lastName: "Perera",
        email: "alice@example.edu",
        status: "ACTIVE",
        emailVerifiedAt: "2030-07-01T00:00:00+05:30",
        createdAt: "2030-06-01T00:00:00+05:30",
      },
    };
    cancelBookingMock.mockReset().mockResolvedValue(cancelledBooking);

    render(
      <BookingHistory
        bookings={[booking]}
        mode="personal"
        onBookingUpdated={onBookingUpdated}
        resourceOrganizationIds={{ "resource-1": "organization-1" }}
      />,
    );

    expect(
      screen.getByText(
        (content) =>
          content.includes("Aug 20, 2030") && content.includes("Aug 21, 2030"),
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    expect(await screen.findByText("50% points refund")).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: "No longer needed" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    await waitFor(() => {
      expect(cancelBookingMock).toHaveBeenCalledWith("booking-1", {
        reason: "No longer needed",
      });
    });
    expect(onBookingUpdated).toHaveBeenCalledWith(cancelledBooking);
  });
});
