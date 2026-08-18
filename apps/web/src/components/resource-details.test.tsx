import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceDetails } from "@/components/resource-details";
import { getResourceDetails } from "@/lib/resource-service/resource-api";
import type { ResourceDetails as ResourceDetailsData } from "@/lib/resource-service/types";

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

vi.mock("@/components/resource-booking-dialog", () => ({
  ResourceBookingDialog: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Create booking</button>
  ),
}));

const getResourceDetailsMock = vi.mocked(getResourceDetails);

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

describe("ResourceDetails", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    getResourceDetailsMock.mockReset().mockResolvedValue(resource);
  });

  it("renders resource information and clearly labels mock booking history", async () => {
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
    expect(screen.getByText("Mock data")).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(
      screen
        .getByRole("button", { name: "Create booking" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(getResourceDetailsMock).toHaveBeenCalledWith(
      "organization-1",
      "resource-1",
      expect.any(AbortSignal),
    );
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
