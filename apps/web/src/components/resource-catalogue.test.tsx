import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceCatalogue } from "@/components/resource-catalogue";
import {
  ApiAuthenticationError,
  ApiError,
} from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import { getAccessibleResources } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  PaginatedResources,
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

vi.mock("@/lib/resource-service/resource-api", () => ({
  getAccessibleResources: vi.fn(),
}));

const membershipsMock = vi.mocked(getCurrentUserMemberships);
const resourcesMock = vi.mocked(getAccessibleResources);

const approvedMembership: MembershipWithOrganization = {
  id: "membership-1",
  userId: "user-1",
  organizationId: "organization-1",
  role: "MEMBER",
  status: "APPROVED",
  joinedAt: "2026-07-01T00:00:00.000Z",
  approvedBy: "admin-1",
  organization: {
    id: "organization-1",
    name: "Engineering Faculty",
    type: "FACULTY",
    parentId: null,
    rootOrganizationId: "organization-1",
    joinBonusPoints: 50,
    status: "ACTIVE",
    createdBy: "admin-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

const firstPage: PaginatedResources = {
  data: [
    {
      id: "resource-1",
      name: "Electronics Laboratory",
      description: "Shared electronics workspace.",
      ownerOrganizationId: "organization-1",
      rootOrganizationId: "organization-1",
      createdByUserId: "admin-1",
      status: "ACTIVE",
      pointCost: 25,
      createdAt: "2026-07-10T00:00:00.000Z",
      allowedOrganizations: [],
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
  totalPages: 1,
};

describe("ResourceCatalogue", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    membershipsMock.mockReset().mockResolvedValue([approvedMembership]);
    resourcesMock.mockReset().mockResolvedValue(firstPage);
  });

  it("shows the catalogue loading state while memberships load", () => {
    const memberships = deferred<MembershipWithOrganization[]>();
    membershipsMock.mockReturnValueOnce(memberships.promise);

    render(<ResourceCatalogue />);

    expect(
      screen.getByLabelText("Loading resource catalogue"),
    ).toBeDefined();
    expect(resourcesMock).not.toHaveBeenCalled();
  });

  it("shows an empty state without requesting resources when no membership is approved", async () => {
    membershipsMock.mockResolvedValueOnce([
      { ...approvedMembership, status: "PENDING" },
    ]);

    render(<ResourceCatalogue />);

    expect(
      await screen.findByText("No approved memberships"),
    ).toBeDefined();
    expect(resourcesMock).not.toHaveBeenCalled();
  });

  it("renders the combined catalogue with All organizations selected", async () => {
    render(<ResourceCatalogue />);

    expect(
      await screen.findByText("Electronics Laboratory"),
    ).toBeDefined();
    expect(screen.getByRole("combobox").textContent).toContain(
      "All organizations",
    );
    expect(screen.getByRole("combobox").textContent).not.toContain(
      "organization-1",
    );
    expect(screen.getByText("25 points")).toBeDefined();
    expect(screen.getByText("Owned by Engineering Faculty")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Electronics Laboratory" }).getAttribute(
        "href",
      ),
    ).toBe(
      "/dashboard/resources/resource-1?organization=organization-1",
    );
    expect(
      screen.queryByRole("button", { name: "Create resource" }),
    ).toBeNull();
    expect(resourcesMock).toHaveBeenCalledWith("organization-1", {
      page: 1,
      limit: 100,
      search: "",
      signal: expect.any(AbortSignal),
    });
  });

  it("links approved administrators to resource creation", async () => {
    membershipsMock.mockResolvedValueOnce([
      { ...approvedMembership, role: "ADMIN" },
    ]);

    render(<ResourceCatalogue />);
    await screen.findByText("Electronics Laboratory");

    expect(
      screen.getByRole("link", { name: "Create resource" }).getAttribute(
        "href",
      ),
    ).toBe("/dashboard/resources/new");
  });

  it("shows an understandable authorization failure", async () => {
    resourcesMock.mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(<ResourceCatalogue />);

    expect(await screen.findByText("Resources unavailable")).toBeDefined();
    expect(
      screen.getByText(
        "Your account does not have permission to view this information.",
      ),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).toBeNull();
  });

  it("redirects to login when the catalogue session has expired", async () => {
    resourcesMock.mockRejectedValueOnce(new ApiAuthenticationError());

    render(<ResourceCatalogue />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });

  it("applies a trimmed name search and displays its empty state", async () => {
    resourcesMock
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

    render(<ResourceCatalogue />);
    await screen.findByText("Electronics Laboratory");

    fireEvent.change(screen.getByLabelText("Search resources"), {
      target: { value: "  microscope  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No matching resources")).toBeDefined();
    expect(resourcesMock).toHaveBeenLastCalledWith("organization-1", {
      page: 1,
      limit: 100,
      search: "microscope",
      signal: expect.any(AbortSignal),
    });
  });

  it("paginates combined organization results in the frontend", async () => {
    resourcesMock.mockResolvedValue({
      ...firstPage,
      data: Array.from({ length: 11 }, (_, index) => ({
        ...firstPage.data[0],
        id: `resource-${index + 1}`,
        name:
          index === 10
            ? "Zoology Laboratory"
            : `Laboratory ${String(index + 1).padStart(2, "0")}`,
      })),
      total: 11,
    });

    render(<ResourceCatalogue />);
    await screen.findByText("Laboratory 01");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Zoology Laboratory")).toBeDefined();
    expect(resourcesMock).toHaveBeenLastCalledWith("organization-1", {
      page: 1,
      limit: 100,
      search: "",
      signal: expect.any(AbortSignal),
    });
  });
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
