import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DisputeSections } from "@/components/dispute-sections";
import { getCurrentUser } from "@/lib/auth-api";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";

vi.mock("@/components/my-disputes", () => ({
  MyDisputes: () => <div>Report a booking issue</div>,
}));
vi.mock("@/components/organization-disputes", () => ({
  OrganizationDisputes: () => <div>Owner dispute queue</div>,
}));
vi.mock("@/components/request-error-card", () => ({
  RequestErrorCard: () => <div>Request failed</div>,
}));
vi.mock("@/lib/auth-api", () => ({
  AuthenticationRequiredError: class extends Error {},
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/resource-service/membership-api", () => ({
  getCurrentUserMemberships: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("DisputeSections", () => {
  it("lets a university admin report a booking issue and manage owned-resource disputes", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      organizationContext: { rootOrganizationId: "university-1" },
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(getCurrentUserMemberships).mockResolvedValue([
      {
        status: "APPROVED",
        role: "ADMIN",
        organization: {
          id: "university-1",
          parentId: null,
          status: "ACTIVE",
          rootOrganizationId: "university-1",
        },
      },
    ] as Awaited<ReturnType<typeof getCurrentUserMemberships>>);

    render(<DisputeSections />);

    expect(await screen.findByText("Report a booking issue")).toBeTruthy();
    expect(screen.getByText("Owner dispute queue")).toBeTruthy();
  });
});
