import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationDetailsView } from "@/components/organization-details-view";
import {
  AuthenticationRequiredError,
  getCurrentUser,
  type CurrentUserResponse,
} from "@/lib/auth-api";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import type {
  MembershipWithOrganization,
  OrganizationDetails,
} from "@/lib/resource-service/types";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-api")>();

  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

vi.mock("@/lib/resource-service/membership-api", () => ({
  getCurrentUserMemberships: vi.fn(),
  requestOrganizationMembership: vi.fn(),
}));

vi.mock("@/lib/resource-service/organization-api", () => ({
  getOrganizationDetails: vi.fn(),
}));

vi.mock("@/components/allocate-points-dialog", () => ({
  AllocatePointsDialog: () => (
    <button type="button">Allocate Semester Points</button>
  ),
}));

const currentUserMock = vi.mocked(getCurrentUser);
const currentMembershipsMock = vi.mocked(getCurrentUserMemberships);
const organizationDetailsMock = vi.mocked(getOrganizationDetails);

const organization: OrganizationDetails = {
  id: "organization-1",
  name: "ResourceHive Demo University",
  type: "UNIVERSITY",
  parentId: null,
  rootOrganizationId: "organization-1",
  joinBonusPoints: 50,
  status: "ACTIVE",
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  children: [],
};

const account = (platformRole = "USER"): CurrentUserResponse => ({
  user: {
    id: "user-1",
    email: "member@example.edu",
    firstName: "Member",
    lastName: "User",
    displayName: "Member User",
    emailVerified: true,
    status: "ACTIVE",
    platformRole,
    createdAt: "2026-01-01T00:00:00.000Z",
    avatarUrl: null,
    authenticationMethods: {
      password: true,
      google: {
        enabled: false,
        connected: false,
        email: null,
        connectedAt: null,
      },
    },
  },
  organizationContext: {
    organizationId: null,
    role: null,
  },
});

function membership(
  status: string,
  role = "MEMBER",
  reviewNote: string | null = null,
  organizationId = organization.id,
): MembershipWithOrganization {
  return {
    id: `membership-${status.toLowerCase()}`,
    userId: "user-1",
    organizationId,
    role,
    status,
    joinedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote,
    latestAudit: null,
    organization: { ...organization, id: organizationId },
  };
}

describe("OrganizationDetailsView", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    currentUserMock.mockReset().mockResolvedValue(account());
    currentMembershipsMock.mockReset().mockResolvedValue([]);
    organizationDetailsMock.mockReset().mockResolvedValue(organization);
  });

  it("shows the request action for a regular user without a membership", async () => {
    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(
      await screen.findByRole("button", { name: "Request membership" }),
    ).toBeDefined();
    expect(screen.queryByText("Semester Points")).toBeNull();
  });

  it("shows a membership summary instead of a duplicate request action", async () => {
    currentMembershipsMock.mockResolvedValueOnce([membership("APPROVED")]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(await screen.findByText("Your membership")).toBeDefined();
    expect(screen.getByText("Approved")).toBeDefined();
    expect(screen.getByText("Member")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Request membership" }),
    ).toBeNull();
    expect(screen.queryByText("Semester Points")).toBeNull();
  });

  it.each([
    ["PENDING", "Your request is waiting for an organization administrator"],
    ["REJECTED", "Self-service resubmission is closed"],
    ["SUSPENDED", "This membership is not currently active"],
  ])("renders the %s membership state", async (status, description) => {
    currentMembershipsMock.mockResolvedValueOnce([membership(status)]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(await screen.findByText("Your membership")).toBeDefined();
    expect(screen.getByText(new RegExp(description))).toBeDefined();
  });

  it("shows a rejected membership reason safely", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("REJECTED", "MEMBER", "Please contact the faculty office."),
    ]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(
      await screen.findByText("Please contact the faculty office."),
    ).toBeDefined();
  });

  it("switches to the pending summary after submitting a request", async () => {
    const { requestOrganizationMembership } = await import(
      "@/lib/resource-service/membership-api"
    );
    vi.mocked(requestOrganizationMembership).mockResolvedValueOnce(
      membership("PENDING"),
    );

    render(<OrganizationDetailsView organizationId={organization.id} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Request membership" }),
    );

    expect(await screen.findByText("Your membership")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Request membership" }),
    ).toBeNull();
  });

  it("shows semester points only to an approved administrator of the root", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("APPROVED", "ADMIN"),
    ]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(
      await screen.findByRole("button", { name: "Allocate Semester Points" }),
    ).toBeDefined();
  });

  it("does not show semester points for an ordinary member or a different organization", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("APPROVED", "MEMBER", null, "other-organization"),
    ]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(
      await screen.findByRole("button", { name: "Request membership" }),
    ).toBeDefined();
    expect(screen.queryByText("Semester Points")).toBeNull();
  });

  it("does not show organization actions to a platform administrator", async () => {
    currentUserMock.mockResolvedValueOnce(account("PLATFORM_ADMIN"));

    render(<OrganizationDetailsView organizationId={organization.id} />);

    await waitFor(() => expect(screen.getByText(organization.name)).toBeDefined());
    expect(screen.queryByRole("button", { name: "Request membership" })).toBeNull();
    expect(screen.queryByText("Semester Points")).toBeNull();
  });

  it("keeps the organization profile visible when viewer state fails", async () => {
    currentUserMock.mockRejectedValueOnce(new Error("Identity unavailable"));

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(await screen.findByText(organization.name)).toBeDefined();
    expect(
      await screen.findByText("Membership status could not be loaded"),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Request membership" })).toBeNull();
  });

  it("redirects to login when the viewer session has expired", async () => {
    currentUserMock.mockRejectedValueOnce(new AuthenticationRequiredError());

    render(<OrganizationDetailsView organizationId={organization.id} />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });
});
