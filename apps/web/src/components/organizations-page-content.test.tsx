import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationsPageContent } from "@/components/organizations-page-content";
import { createPlatformUniversity } from "@/lib/auth-api";

const dashboard = vi.hoisted(() => ({
  state: {
    status: "loaded" as string,
    account: {
      user: { platformRole: "PLATFORM_ADMIN" },
      universities: [],
      organizationContext: { rootOrganizationId: null },
    },
  },
}));

vi.mock("@/components/dashboard-current-user", () => ({
  useDashboardCurrentUser: () => ({ state: dashboard.state }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/resource-service/organization-api", () => ({
  getRootOrganizations: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/auth-api", () => ({
  createPlatformUniversity: vi.fn(),
}));

describe("OrganizationsPageContent", () => {
  beforeEach(() => {
    dashboard.state.status = "loaded";
    dashboard.state.account.user.platformRole = "PLATFORM_ADMIN";
    vi.mocked(createPlatformUniversity).mockReset();
  });

  it("lets a platform admin create a university and confirms its assigned admin", async () => {
    vi.mocked(createPlatformUniversity).mockResolvedValue({
      university: { id: "university-id", name: "New University" },
      administrator: { email: "admin@example.edu" },
    });
    render(<OrganizationsPageContent />);

    fireEvent.change(screen.getByLabelText("University name"), {
      target: { value: "New University" },
    });
    fireEvent.change(screen.getByLabelText("Admin email"), {
      target: { value: "admin@example.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create university" }));

    await waitFor(() =>
      expect(createPlatformUniversity).toHaveBeenCalledWith(
        "New University",
        "admin@example.edu",
      ),
    );
    expect((await screen.findByRole("status")).textContent).toContain(
      "New University was created. admin@example.edu is its university admin.",
    );
    expect(
      (screen.getByLabelText("University name") as HTMLInputElement).value,
    ).toBe("");
  });

  it("keeps the form values and displays the error when creation fails", async () => {
    vi.mocked(createPlatformUniversity).mockRejectedValue(
      new Error("That account is not eligible."),
    );
    render(<OrganizationsPageContent />);
    fireEvent.change(screen.getByLabelText("University name"), {
      target: { value: "New University" },
    });
    fireEvent.change(screen.getByLabelText("Admin email"), {
      target: { value: "admin@example.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create university" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "That account is not eligible.",
    );
    expect(
      (screen.getByLabelText("University name") as HTMLInputElement).value,
    ).toBe("New University");
    expect(
      (screen.getByLabelText("Admin email") as HTMLInputElement).value,
    ).toBe("admin@example.edu");
  });

  it("shows the regular organization view to non-platform users", () => {
    dashboard.state.account.user.platformRole = "USER";
    render(<OrganizationsPageContent />);
    expect(screen.queryByRole("button", { name: "Create university" })).toBeNull();
  });
});
