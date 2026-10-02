import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser, switchActiveUniversity } from "@/lib/auth-api";

const dashboard = vi.hoisted(() => ({
  setAccount: vi.fn(),
  state: {
    status: "loaded",
    account: {
      user: {
        displayName: "Test User",
        email: "user@example.edu",
        avatarUrl: null,
      },
      organizationContext: { rootOrganizationId: "university-a" },
      universities: [
        { rootOrganizationId: "university-a", name: "University A" },
        { rootOrganizationId: "university-b", name: "University B" },
      ],
    },
  },
}));
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/components/dashboard-current-user", () => ({
  useDashboardCurrentUser: () => ({ ...dashboard, setAccount: dashboard.setAccount }),
}));
vi.mock("@/components/nav-main", () => ({ NavMain: () => null }));
vi.mock("@/components/nav-secondary", () => ({ NavSecondary: () => null }));
vi.mock("@/components/nav-user", () => ({ NavUser: () => null }));
vi.mock("@/components/brand", () => ({ Brand: () => null }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/auth-api", () => ({
  getCurrentUser: vi.fn(),
  switchActiveUniversity: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("AppSidebar university selector", () => {
  beforeEach(() => {
    vi.mocked(switchActiveUniversity).mockReset().mockResolvedValue(undefined);
    vi.mocked(getCurrentUser).mockReset().mockResolvedValue({
      organizationContext: { rootOrganizationId: "university-b" },
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    dashboard.setAccount.mockReset();
    navigation.refresh.mockReset();
  });

  it("switches the active university and refreshes the signed-in account", async () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "University" }));
    const universityB = await screen.findByRole("option", { name: "University B" });
    fireEvent.pointerDown(universityB, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(universityB, { button: 0, pointerType: "mouse" });
    fireEvent.click(universityB);

    await waitFor(() =>
      expect(switchActiveUniversity).toHaveBeenCalledWith("university-b"),
    );
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(dashboard.setAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationContext: { rootOrganizationId: "university-b" },
      }),
    );
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error when switching fails", async () => {
    vi.mocked(switchActiveUniversity).mockRejectedValueOnce(new Error("offline"));
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "University" }));
    const universityB = await screen.findByRole("option", { name: "University B" });
    fireEvent.pointerDown(universityB, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(universityB, { button: 0, pointerType: "mouse" });
    fireEvent.click(universityB);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to switch university. Try again.",
    );
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
