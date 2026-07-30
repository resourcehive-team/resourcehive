import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RootOrganizationList } from "@/components/root-organization-list";
import {
  ApiAuthenticationError,
  ApiError,
} from "@/lib/api-client";
import { getRootOrganizations } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/resource-service/organization-api", () => ({
  getRootOrganizations: vi.fn(),
}));

const organizationsMock = vi.mocked(getRootOrganizations);

const rootOrganization: Organization = {
  id: "organization-1",
  name: "University of ResourceHive",
  type: "UNIVERSITY",
  parentId: null,
  rootOrganizationId: "organization-1",
  joinBonusPoints: 100,
  status: "ACTIVE",
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("RootOrganizationList", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    organizationsMock.mockReset().mockResolvedValue([rootOrganization]);
  });

  it("shows a loading state while organizations load", () => {
    organizationsMock.mockReturnValueOnce(new Promise(() => undefined));

    render(<RootOrganizationList />);

    expect(screen.getByLabelText("Loading organizations")).toBeDefined();
  });

  it("shows the empty organization state", async () => {
    organizationsMock.mockResolvedValueOnce([]);

    render(<RootOrganizationList />);

    expect(
      await screen.findByText("No organizations available"),
    ).toBeDefined();
  });

  it("renders organization information and a details link", async () => {
    render(<RootOrganizationList />);

    expect(
      await screen.findByText("University of ResourceHive"),
    ).toBeDefined();
    expect(screen.getByText("100 points")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "View details" }).getAttribute("href"),
    ).toBe("/dashboard/organizations/organization-1");
  });

  it("shows an authorization error without a retry action", async () => {
    organizationsMock.mockRejectedValueOnce(new ApiError("Forbidden", 403));

    render(<RootOrganizationList />);

    expect(
      await screen.findByText("Organizations unavailable"),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).toBeNull();
  });

  it("redirects an expired session to login", async () => {
    organizationsMock.mockRejectedValueOnce(
      new ApiAuthenticationError(),
    );

    render(<RootOrganizationList />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });
});
