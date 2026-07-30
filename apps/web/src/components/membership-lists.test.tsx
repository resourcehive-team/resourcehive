import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurrentMembershipList } from "@/components/current-membership-list";
import { OrganizationMemberList } from "@/components/organization-member-list";
import { ApiError } from "@/lib/api-client";
import {
  getCurrentUserMemberships,
  getOrganizationMembers,
} from "@/lib/resource-service/membership-api";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import type {
  MembershipWithOrganization,
  OrganizationDetails,
  OrganizationMember,
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
  getOrganizationMembers: vi.fn(),
}));

vi.mock("@/lib/resource-service/organization-api", () => ({
  getOrganizationDetails: vi.fn(),
}));

const currentMembershipsMock = vi.mocked(getCurrentUserMemberships);
const organizationMembersMock = vi.mocked(getOrganizationMembers);
const organizationDetailsMock = vi.mocked(getOrganizationDetails);

const organization: OrganizationDetails = {
  id: "organization-1",
  name: "Engineering Faculty",
  type: "FACULTY",
  parentId: null,
  rootOrganizationId: "organization-1",
  joinBonusPoints: 50,
  status: "ACTIVE",
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  children: [],
};

const adminMembership: MembershipWithOrganization = {
  id: "membership-1",
  userId: "user-1",
  organizationId: "organization-1",
  role: "ADMIN",
  status: "APPROVED",
  joinedAt: "2026-07-01T00:00:00.000Z",
  approvedBy: "admin-2",
  organization,
};

const organizationMember: OrganizationMember = {
  userId: "user-2",
  organizationId: "organization-1",
  role: "MEMBER",
  status: "APPROVED",
  joinedAt: "2026-07-10T00:00:00.000Z",
  user: {
    id: "user-2",
    firstName: "Nimal",
    lastName: "Perera",
    email: "nimal@example.edu",
    status: "ACTIVE",
  },
};

describe("membership lists", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    currentMembershipsMock
      .mockReset()
      .mockResolvedValue([adminMembership]);
    organizationDetailsMock.mockReset().mockResolvedValue(organization);
    organizationMembersMock
      .mockReset()
      .mockResolvedValue([organizationMember]);
  });

  it("shows the empty current-memberships state", async () => {
    currentMembershipsMock.mockResolvedValueOnce([]);

    render(<CurrentMembershipList />);

    expect(await screen.findByText("No memberships yet")).toBeDefined();
  });

  it("shows member management navigation only for an approved administrator", async () => {
    const { unmount } = render(<CurrentMembershipList />);

    const adminLink = await screen.findByRole("link", {
      name: "View members",
    });
    expect(adminLink.getAttribute("href")).toBe(
      "/dashboard/organizations/organization-1/members",
    );

    unmount();
    currentMembershipsMock.mockResolvedValueOnce([
      { ...adminMembership, role: "MEMBER" },
    ]);
    render(<CurrentMembershipList />);
    await screen.findByText("Engineering Faculty");

    expect(
      screen.queryByRole("link", { name: "View members" }),
    ).toBeNull();
  });

  it("renders the safe organization-member summary", async () => {
    render(
      <OrganizationMemberList organizationId="organization-1" />,
    );

    expect(await screen.findByText("Nimal Perera")).toBeDefined();
    expect(screen.getByText("nimal@example.edu")).toBeDefined();
    expect(
      screen.getByRole("cell", { name: "Member" }),
    ).toBeDefined();
    expect(screen.queryByText("passwordHash")).toBeNull();
  });

  it("shows a forbidden member list without retrying", async () => {
    organizationMembersMock.mockRejectedValueOnce(
      new ApiError("Forbidden", 403),
    );

    render(
      <OrganizationMemberList organizationId="organization-1" />,
    );

    expect(
      await screen.findByText("Organization members unavailable"),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).toBeNull();
  });
});
