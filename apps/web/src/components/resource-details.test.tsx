import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceDetails } from "@/components/resource-details";
import {
  completeOrganizationBooking,
  getOrganizationBookings,
} from "@/lib/booking-service/booking-api";
import type { OrganizationBooking } from "@/lib/booking-service/types";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import { getResourceDetails } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  ResourceDetails as ResourceDetailsData,
} from "@/lib/resource-service/types";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/resource-service/resource-api", () => ({
  getResourceDetails: vi.fn(),
}));

vi.mock("@/lib/resource-service/membership-api", () => ({
  getCurrentUserMemberships: vi.fn(),
}));

vi.mock("@/lib/booking-service/booking-api", () => ({
  completeOrganizationBooking: vi.fn(),
  getOrganizationBookings: vi.fn(),
}));

vi.mock("@/components/resource-booking-dialog", () => ({
  ResourceBookingDialog: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Create booking</button>
  ),
}));

vi.mock("@/components/resource-slot-creation-dialog", () => ({
  ResourceSlotCreationDialog: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Create slot</button>
  ),
}));

const getResourceDetailsMock = vi.mocked(getResourceDetails);
const getCurrentUserMembershipsMock = vi.mocked(getCurrentUserMemberships);
const getOrganizationBookingsMock = vi.mocked(getOrganizationBookings);
const completeOrganizationBookingMock = vi.mocked(completeOrganizationBooking);

const resource: ResourceDetailsData = {
  id: "resource-1",
  name: "Main Library Study Room",
  description: "A quiet room for individual and group study.",
  ownerOrganizationId: "organization-1",
  rootOrganizationId: "organization-1",
  createdByUserId: "admin-1",
  status: "ACTIVE",
  pointCost: 10,
  createdAt: "2026-08-10T00:00:00.000Z",
  allowedOrganizations: [
    {
      resourceId: "resource-1",
      organizationId: "organization-1",
      rootOrganizationId: "organization-1",
    },
  ],
  ownerOrganization: {
    id: "organization-1",
    name: "ResourceHive Demo University",
    type: "UNIVERSITY",
    parentId: null,
    rootOrganizationId: "organization-1",
    joinBonusPoints: 50,
    status: "ACTIVE",
    createdBy: "admin-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

const administratorMembership: MembershipWithOrganization = {
  id: "membership-1",
  userId: "admin-1",
  organizationId: "organization-1",
  role: "ADMIN",
  status: "APPROVED",
  joinedAt: "2026-01-01T00:00:00.000Z",
  approvedBy: "admin-1",
  organization: resource.ownerOrganization,
};

const organizationBooking: OrganizationBooking = {
  id: "booking-1",
  resourceSlotId: "slot-1",
  userId: "member-1",
  status: "CONFIRMED",
  createdAt: "2026-08-10T08:00:00.000Z",
  resourceSlot: {
    startsAt: "2026-08-20T09:00:00.000Z",
    endsAt: "2026-08-20T10:00:00.000Z",
    resource: {
      id: "resource-1",
      name: "Main Library Study Room",
      pointCost: 10,
    },
  },
  user: {
    firstName: "Alice",
    lastName: "Perera",
    email: "student.alice@demo.uni",
    status: "ACTIVE",
    emailVerifiedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
};

describe("ResourceDetails", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    getResourceDetailsMock.mockReset().mockResolvedValue(resource);
    getCurrentUserMembershipsMock
      .mockReset()
      .mockResolvedValue([administratorMembership]);
    getOrganizationBookingsMock
      .mockReset()
      .mockResolvedValue([organizationBooking]);
    completeOrganizationBookingMock.mockReset();
  });

  it("shows live booking members and their account details to an administrator", async () => {
    render(
      <ResourceDetails
        organizationId="organization-1"
        resourceId="resource-1"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Main Library Study Room",
      }),
    ).toBeDefined();
    expect(screen.getByText("ResourceHive Demo University")).toBeDefined();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(await screen.findByText("Booking history")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Create booking" })
        .hasAttribute("disabled"),
    ).toBe(false);

    const memberButton = await screen.findByRole("button", {
      name: "Alice Perera",
    });
    expect(screen.queryByText("member-1")).toBeNull();
    fireEvent.click(memberButton);

    expect(await screen.findByText("student.alice@demo.uni")).toBeDefined();
    expect(screen.getByText("Email verification")).toBeDefined();
    expect(getResourceDetailsMock).toHaveBeenCalledWith(
      "organization-1",
      "resource-1",
      expect.any(AbortSignal),
    );
  });

  it("omits organization booking history for a normal member", async () => {
    getCurrentUserMembershipsMock.mockResolvedValueOnce([
      { ...administratorMembership, role: "MEMBER" },
    ]);

    render(
      <ResourceDetails
        organizationId="organization-1"
        resourceId="resource-1"
      />,
    );

    await screen.findByRole("heading", { name: "Main Library Study Room" });
    await waitFor(() => {
      expect(getCurrentUserMembershipsMock).toHaveBeenCalled();
    });

    expect(screen.queryByText("Booking history")).toBeNull();
    expect(getOrganizationBookingsMock).not.toHaveBeenCalled();
  });

  it("lets an administrator mark a confirmed booking as completed", async () => {
    completeOrganizationBookingMock.mockResolvedValue({
      ...organizationBooking,
      status: "COMPLETED",
      completedAt: "2026-08-20T10:00:00.000Z",
    });

    render(
      <ResourceDetails
        organizationId="organization-1"
        resourceId="resource-1"
      />,
    );

    const completeButton = await screen.findByRole("button", {
      name: "Mark as complete",
    });
    expect(
      screen.queryByRole("button", { name: "Download booking receipt" }),
    ).toBeNull();

    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(completeOrganizationBookingMock).toHaveBeenCalledWith(
        organizationBooking.id,
      );
    });
    expect(await screen.findByText("Completed")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Mark as complete" }),
    ).toBeNull();
  });

  it("does not crash when an older booking response lacks member details", async () => {
    getOrganizationBookingsMock.mockResolvedValueOnce([
      {
        ...organizationBooking,
        user: undefined,
      } as unknown as OrganizationBooking,
    ]);

    render(
      <ResourceDetails
        organizationId="organization-1"
        resourceId="resource-1"
      />,
    );

    expect(await screen.findByText("Member details unavailable")).toBeDefined();
  });

  it("disables booking for an inactive resource", async () => {
    getResourceDetailsMock.mockResolvedValueOnce({
      ...resource,
      status: "INACTIVE",
    });

    render(
      <ResourceDetails
        organizationId="organization-1"
        resourceId="resource-1"
      />,
    );

    expect(
      (
        await screen.findByRole("button", { name: "Create booking" })
      ).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText("This resource is not accepting new bookings."),
    ).toBeDefined();
  });
});
