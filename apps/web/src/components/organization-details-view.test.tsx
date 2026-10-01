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
import {
  getCurrentUserMemberships,
  getOrganizationMembers,
} from "@/lib/resource-service/membership-api";
import {
  createChildOrganization,
  getOrganizationDetails,
  getOrganizationEmailDomains,
  updateOrganizationEmailDomain,
} from "@/lib/resource-service/organization-api";
import { getAccessibleResources } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  OrganizationDetails,
  PaginatedResources,
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
  getOrganizationMembers: vi.fn(),
  requestOrganizationMembership: vi.fn(),
}));

vi.mock("@/lib/resource-service/organization-api", () => ({
  getOrganizationDetails: vi.fn(),
  getRootOrganizationDescendants: vi.fn().mockResolvedValue([]),
  createChildOrganization: vi.fn(),
  getOrganizationEmailDomains: vi.fn().mockResolvedValue([]),
  addOrganizationEmailDomain: vi.fn(),
  updateOrganizationEmailDomain: vi.fn(),
  removeOrganizationEmailDomain: vi.fn(),
  getOrganizationAllowlist: vi.fn().mockResolvedValue([]),
  addOrganizationAllowlistEmail: vi.fn(),
  removeOrganizationAllowlistEmail: vi.fn(),
}));

vi.mock("@/lib/resource-service/resource-api", () => ({
  getAccessibleResources: vi.fn(),
}));

vi.mock("@/components/allocate-points-dialog", () => ({
  AllocatePointsDialog: () => (
    <button type="button">Allocate Semester Points</button>
  ),
}));

const currentUserMock = vi.mocked(getCurrentUser);
const currentMembershipsMock = vi.mocked(getCurrentUserMemberships);
const organizationDetailsMock = vi.mocked(getOrganizationDetails);
const createChildMock = vi.mocked(createChildOrganization);
const domainsMock = vi.mocked(getOrganizationEmailDomains);
const updateDomainMock = vi.mocked(updateOrganizationEmailDomain);
const organizationMembersMock = vi.mocked(getOrganizationMembers);
const accessibleResourcesMock = vi.mocked(getAccessibleResources);

const emptyResourcePage: PaginatedResources = {
  data: [],
  total: 0,
  page: 1,
  limit: 100,
  totalPages: 0,
};

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
    rootOrganizationId: null,
    role: null,
  },
  universities: [],
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
    createChildMock.mockReset();
    domainsMock.mockReset().mockResolvedValue([]);
    updateDomainMock.mockReset();
    organizationMembersMock.mockReset().mockResolvedValue([]);
    accessibleResourcesMock.mockReset().mockResolvedValue(emptyResourcePage);
  });

  it("shows the request action for a regular user without a membership", async () => {
    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(
      await screen.findByRole("button", { name: "Request membership" }),
    ).toBeDefined();
    expect(screen.queryByText("Semester Points")).toBeNull();
    expect(screen.queryByLabelText("Child organization name")).toBeNull();
    expect(screen.queryByText("Email domains")).toBeNull();
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

  it("lets an approved organization admin create a child and assigns its first admin", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("APPROVED", "ADMIN"),
    ]);
    createChildMock.mockResolvedValueOnce({
      organization: {
        ...organization,
        id: "faculty-1",
        name: "Faculty of Engineering",
        type: "FACULTY",
        parentId: organization.id,
      },
      administrator: { email: "admin@example.edu" },
    });

    render(<OrganizationDetailsView organizationId={organization.id} />);
    fireEvent.change(await screen.findByLabelText("Child organization name"), {
      target: { value: "Faculty of Engineering" },
    });
    fireEvent.change(screen.getByLabelText("First admin email"), {
      target: { value: "admin@example.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Faculty of Engineering created; admin@example.edu is its admin.",
    );
    expect(createChildMock).toHaveBeenCalledWith(organization.id, {
      name: "Faculty of Engineering",
      type: "FACULTY",
      adminEmail: "admin@example.edu",
    });
  });

  it("keeps child organization inputs when creation fails", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("APPROVED", "ADMIN"),
    ]);
    createChildMock.mockRejectedValueOnce(new Error("Admin is not in this university"));

    render(<OrganizationDetailsView organizationId={organization.id} />);
    const name = await screen.findByLabelText("Child organization name");
    const email = screen.getByLabelText("First admin email");
    fireEvent.change(name, { target: { value: "Faculty of Science" } });
    fireEvent.change(email, { target: { value: "outside@example.edu" } });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Admin is not in this university",
    );
    expect((name as HTMLInputElement).value).toBe("Faculty of Science");
    expect((email as HTMLInputElement).value).toBe("outside@example.edu");
  });

  it("shows domain rules and lets admins change automatic approval", async () => {
    currentMembershipsMock.mockResolvedValueOnce([
      membership("APPROVED", "ADMIN"),
    ]);
    domainsMock.mockResolvedValueOnce([
      {
        id: "domain-rule-1",
        organizationId: organization.id,
        domain: "uom.lk",
        autoJoin: false,
      },
    ]);

    render(<OrganizationDetailsView organizationId={organization.id} />);

    expect(await screen.findByText("uom.lk")).toBeDefined();
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    await waitFor(() => {
      expect(updateDomainMock).toHaveBeenCalledWith(
        organization.id,
        "domain-rule-1",
        true,
      );
    });
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
