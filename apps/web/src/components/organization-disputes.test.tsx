import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationDisputes } from "@/components/organization-disputes";
import { getOrganizationDisputes, updateDispute } from "@/lib/booking-service/dispute-api";
import type { Dispute } from "@/lib/booking-service/types";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("@/lib/booking-service/dispute-api", () => ({
  getOrganizationDisputes: vi.fn(),
  updateDispute: vi.fn(),
}));

vi.mock("@/components/review-dispute-dialog", () => ({
  ReviewDisputeDialog: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

const dispute: Dispute = {
  id: "dispute-1",
  bookingId: "booking-1",
  rootOrganizationId: "university-1",
  resolverOrganizationId: "faculty-1",
  submittedByUserId: "student-1",
  reason: "BROKEN",
  description: "The instruments are damaged.",
  evidence: null,
  status: "OPEN",
  resolutionNotes: null,
  reviewedByUserId: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  resolvedAt: null,
  submittedByUser: {
    firstName: "Alex",
    lastName: "Student",
    email: "alex@example.edu",
  },
  booking: {
    id: "booking-1",
    userId: "student-1",
    status: "COMPLETED",
    resourceSlot: {
      startsAt: "2030-01-02T10:00:00.000Z",
      endsAt: "2030-01-02T11:00:00.000Z",
      resource: {
        id: "resource-1",
        name: "Robotics Lab",
        ownerOrganizationId: "faculty-1",
        ownerOrganization: { id: "faculty-1", name: "Faculty of Engineering" },
        unavailableDisputeId: null,
      },
    },
  },
};

describe("OrganizationDisputes", () => {
  beforeEach(() => {
    vi.mocked(getOrganizationDisputes).mockResolvedValue([dispute]);
  });

  it("shows resource, booking, and submitter details and acknowledges an open dispute", async () => {
    vi.mocked(updateDispute).mockResolvedValue({
      ...dispute,
      status: "UNDER_REVIEW",
    });
    render(<OrganizationDisputes />);

    expect(
      (await screen.findByRole("link", { name: "Robotics Lab" })).getAttribute(
        "href",
      ),
    ).toBe("/dashboard/resources/resource-1?organization=faculty-1");
    expect(screen.getByText("Faculty of Engineering")).toBeTruthy();
    expect(screen.getByText(/Submitted by Alex Student/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));

    await waitFor(() =>
      expect(updateDispute).toHaveBeenCalledWith("dispute-1", {
        status: "UNDER_REVIEW",
      }),
    );
    expect((await screen.findByRole("status")).textContent).toContain(
      "Dispute acknowledged and moved to under review.",
    );
    expect(screen.getByText("Under review")).toBeTruthy();
  });

  it("shows errors and keeps the dispute details when acknowledgement fails", async () => {
    vi.mocked(updateDispute).mockRejectedValue(new Error("Permission changed."));
    render(<OrganizationDisputes />);

    fireEvent.click(await screen.findByRole("button", { name: "Acknowledge" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Permission changed.",
    );
    expect(screen.getByRole("link", { name: "Robotics Lab" })).toBeTruthy();
    expect(screen.getByText("The instruments are damaged.")).toBeTruthy();
  });

  it("disables acknowledgement while the request is saving", async () => {
    let resolveUpdate: (result: Dispute) => void = () => undefined;
    vi.mocked(updateDispute).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(<OrganizationDisputes />);

    fireEvent.click(await screen.findByRole("button", { name: "Acknowledge" }));

    const savingButton = screen.getByRole("button", { name: "Acknowledging…" });
    expect((savingButton as HTMLButtonElement).disabled).toBe(true);
    resolveUpdate({ ...dispute, status: "UNDER_REVIEW" });
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});
