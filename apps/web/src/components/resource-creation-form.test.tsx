import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceCreationForm } from "@/components/resource-creation-form";
import { ApiError } from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import {
  getOrganizationDetails,
  getRootOrganizationDescendants,
} from "@/lib/resource-service/organization-api";
import { createResource } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  Organization,
  Resource,
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
  getOrganizationDetails: vi.fn(),
  getRootOrganizationDescendants: vi.fn(),
}));

vi.mock("@/lib/resource-service/resource-api", () => ({
  createResource: vi.fn(),
}));

const membershipsMock = vi.mocked(getCurrentUserMemberships);
const organizationDetailsMock = vi.mocked(getOrganizationDetails);
const descendantsMock = vi.mocked(getRootOrganizationDescendants);
const createResourceMock = vi.mocked(createResource);

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

const scienceOrganization: Organization = {
  ...rootOrganization,
  id: "science-organization",
  name: "Faculty of Science",
  type: "FACULTY",
  parentId: rootOrganization.id,
  rootOrganizationId: rootOrganization.id,
  joinBonusPoints: 50,
};

const adminMembership: MembershipWithOrganization = {
  id: "membership-1",
  userId: "admin-user",
  organizationId: engineeringOrganization.id,
  role: "ADMIN",
  status: "APPROVED",
  joinedAt: "2026-07-01T00:00:00.000Z",
  approvedBy: "root-admin",
  organization: engineeringOrganization,
};

const createdResource: Resource = {
  id: "resource-1",
  name: "Robotics Lab",
  description: "Shared robotics equipment.",
  ownerOrganizationId: engineeringOrganization.id,
  rootOrganizationId: rootOrganization.id,
  createdByUserId: "admin-user",
  status: "ACTIVE",
  pointCost: 25,
  createdAt: "2026-08-04T00:00:00.000Z",
  allowedOrganizations: [],
};

describe("ResourceCreationForm", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    membershipsMock.mockReset().mockResolvedValue([adminMembership]);
    organizationDetailsMock.mockReset().mockResolvedValue({
      ...rootOrganization,
      children: [],
    });
    descendantsMock.mockReset().mockResolvedValue([
      engineeringOrganization,
      computingOrganization,
      scienceOrganization,
    ]);
    createResourceMock.mockReset().mockResolvedValue(createdResource);
  });

  it("creates a resource for an administered organization", async () => {
    render(<ResourceCreationForm />);

    expect(
      (
        await screen.findByRole("combobox", {
          name: "Owner organization",
        })
      ).textContent,
    ).toContain("Faculty of Engineering");

    fireEvent.change(screen.getByRole("textbox", { name: /Resource name/ }), {
      target: { value: " Robotics Lab " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "Shared robotics equipment." },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Point cost/ }), {
      target: { value: "25" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Department of Computer Science",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create resource" }));

    expect(await screen.findByText("Resource created")).toBeDefined();
    expect(createResourceMock).toHaveBeenCalledWith(
      engineeringOrganization.id,
      {
        name: "Robotics Lab",
        description: "Shared robotics equipment.",
        pointCost: 25,
        allowedOrganizationIds: [
          engineeringOrganization.id,
          computingOrganization.id,
        ],
      },
    );
  });

  it("does not offer resource creation without an approved admin membership", async () => {
    membershipsMock.mockResolvedValueOnce([
      { ...adminMembership, role: "MEMBER" },
    ]);

    render(<ResourceCreationForm />);

    expect(
      await screen.findByText("Resource creation unavailable"),
    ).toBeDefined();
    expect(organizationDetailsMock).not.toHaveBeenCalled();
    expect(descendantsMock).not.toHaveBeenCalled();
  });

  it("shows a safe authorization error returned by the Resource Service", async () => {
    createResourceMock.mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(<ResourceCreationForm />);
    await screen.findByRole("combobox", { name: "Owner organization" });

    fireEvent.change(screen.getByRole("textbox", { name: /Resource name/ }), {
      target: { value: "Robotics Lab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create resource" }));

    expect(
      await screen.findByText(
        "You do not have permission to create a resource for this organization.",
      ),
    ).toBeDefined();
  });

  it("rejects an invalid point cost before calling the API", async () => {
    render(<ResourceCreationForm />);
    await screen.findByRole("combobox", { name: "Owner organization" });

    fireEvent.change(screen.getByRole("textbox", { name: /Resource name/ }), {
      target: { value: "Robotics Lab" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Point cost/ }), {
      target: { value: "1.5" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Create resource" }).closest(
        "form",
      )!,
    );

    expect(
      await screen.findByText(
        "Point cost must be a non-negative whole number.",
      ),
    ).toBeDefined();
    expect(createResourceMock).not.toHaveBeenCalled();
  });

  it("loads tenant hierarchy data through the gateway modules", async () => {
    render(<ResourceCreationForm />);

    await waitFor(() => {
      expect(organizationDetailsMock).toHaveBeenCalledWith(
        rootOrganization.id,
        expect.any(AbortSignal),
      );
      expect(descendantsMock).toHaveBeenCalledWith(
        rootOrganization.id,
        expect.any(AbortSignal),
      );
    });
  });
});
