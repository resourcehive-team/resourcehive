import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceEditForm } from "@/components/resource-edit-form";
import { ApiError } from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import {
  getRootOrganizationDescendants,
} from "@/lib/resource-service/organization-api";
import { getResourceDetails, updateResource } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  Organization,
  Resource,
  ResourceDetails,
} from "@/lib/resource-service/types";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/resource-service/membership-api", () => ({
  getCurrentUserMemberships: vi.fn(),
}));

vi.mock("@/lib/resource-service/organization-api", () => ({
  getRootOrganizationDescendants: vi.fn(),
}));

vi.mock("@/lib/resource-service/resource-api", () => ({
  getResourceDetails: vi.fn(),
  updateResource: vi.fn(),
  uploadResourceImage: vi.fn(),
}));

const membershipsMock = vi.mocked(getCurrentUserMemberships);
const descendantsMock = vi.mocked(getRootOrganizationDescendants);
const getResourceDetailsMock = vi.mocked(getResourceDetails);
const updateResourceMock = vi.mocked(updateResource);

const rootOrganization: Organization = {
  id: "root-organization",
  name: "Demo University",
  type: "UNIVERSITY",
  parentId: null,
  rootOrganizationId: "root-organization",
  joinBonusPoints: 100,
  status: "ACTIVE",
  createdBy: "admin-user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const engineeringOrganization: Organization = {
  ...rootOrganization,
  id: "engineering-organization",
  name: "Faculty of Engineering",
  type: "FACULTY",
  parentId: rootOrganization.id,
  rootOrganizationId: rootOrganization.id,
  joinBonusPoints: 50,
};

const computingOrganization: Organization = {
  ...rootOrganization,
  id: "computing-organization",
  name: "Department of Computer Science",
  type: "DEPARTMENT",
  parentId: engineeringOrganization.id,
  rootOrganizationId: rootOrganization.id,
  joinBonusPoints: 25,
};

const adminMembership: MembershipWithOrganization = {
  id: "membership-1",
  userId: "admin-user",
  organizationId: engineeringOrganization.id,
  role: "ADMIN",
  status: "APPROVED",
  joinedAt: "2026-07-01T00:00:00.000Z",
  reviewedBy: "root-admin",
  reviewedAt: "2026-07-01T00:00:00.000Z",
  reviewNote: null,
  latestAudit: null,
  organization: engineeringOrganization,
};

const existingResourceDetails: ResourceDetails = {
  id: "resource-1",
  name: "Robotics Lab",
  description: "Shared robotics equipment.",
  ownerOrganizationId: engineeringOrganization.id,
  rootOrganizationId: rootOrganization.id,
  createdByUserId: "admin-user",
  status: "ACTIVE",
  pointCost: 25,
  cancellationNoticeMinutes: 0,
  createdAt: "2026-08-04T00:00:00.000Z",
  imageUrl: null,
  allowedOrganizations: [],
  ownerOrganization: engineeringOrganization,
};

describe("ResourceEditForm", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    membershipsMock.mockReset().mockResolvedValue([adminMembership]);
    getResourceDetailsMock.mockReset().mockResolvedValue(existingResourceDetails);
    descendantsMock.mockReset().mockResolvedValue([
      engineeringOrganization,
      computingOrganization,
    ]);
    updateResourceMock.mockReset().mockResolvedValue(null as unknown as Resource);
  });

  it("loads resource details and submits an update for an administered organization", async () => {
    render(<ResourceEditForm organizationId={engineeringOrganization.id} resourceId="resource-1" />);

    // Wait for the form to load
    await screen.findByRole("textbox", { name: /Resource name/ });

    expect(
      (screen.getByRole("textbox", { name: /Resource name/ }) as HTMLInputElement).value
    ).toBe("Robotics Lab");

    fireEvent.change(screen.getByRole("textbox", { name: /Resource name/ }), {
      target: { value: "Advanced Robotics Lab" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Point cost/ }), {
      target: { value: "30" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Minutes" }),
      { target: { value: "30" } },
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Department of Computer Science",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Update resource" }));

    expect(await screen.findByText("Resource updated")).toBeDefined();
    expect(updateResourceMock).toHaveBeenCalledWith(
      engineeringOrganization.id,
      "resource-1",
      {
        name: "Advanced Robotics Lab",
        description: "Shared robotics equipment.",
        pointCost: 30,
        cancellationNoticeMinutes: 30,
        allowedOrganizationIds: [
          computingOrganization.id,
        ],

      },
    );
  });

  it("does not offer resource edit without an approved admin membership", async () => {
    membershipsMock.mockResolvedValueOnce([
      { ...adminMembership, role: "MEMBER" },
    ]);

    render(<ResourceEditForm organizationId={engineeringOrganization.id} resourceId="resource-1" />);

    expect(
      await screen.findByText("Resource edit unavailable"),
    ).toBeDefined();
    expect(getResourceDetailsMock).not.toHaveBeenCalled();
    expect(descendantsMock).not.toHaveBeenCalled();
  });

  it("shows a safe authorization error returned by the Resource Service on update", async () => {
    updateResourceMock.mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(<ResourceEditForm organizationId={engineeringOrganization.id} resourceId="resource-1" />);
    
    // Wait for the form to load
    await screen.findByRole("textbox", { name: /Resource name/ });

    fireEvent.click(screen.getByRole("button", { name: "Update resource" }));

    expect(
      await screen.findByText(
        "You do not have permission to edit this resource.",
      ),
    ).toBeDefined();
  });

  it("rejects an invalid point cost before calling the API", async () => {
    render(<ResourceEditForm organizationId={engineeringOrganization.id} resourceId="resource-1" />);
    
    // Wait for the form to load
    await screen.findByRole("textbox", { name: /Resource name/ });

    fireEvent.change(screen.getByRole("spinbutton", { name: /Point cost/ }), {
      target: { value: "-5" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Update resource" }).closest(
        "form",
      )!,
    );

    expect(
      await screen.findByText(
        "Point cost must be a non-negative whole number.",
      ),
    ).toBeDefined();
    expect(updateResourceMock).not.toHaveBeenCalled();
  });
});
