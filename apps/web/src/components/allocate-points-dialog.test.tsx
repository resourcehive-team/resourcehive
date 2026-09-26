import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AllocatePointsDialog } from "@/components/allocate-points-dialog";
import {
  allocateSemesterPoints,
  getRootOrganizationDescendants,
} from "@/lib/resource-service/organization-api";
import { toast } from "sonner";
import type { Organization } from "@/lib/resource-service/types";

vi.mock("@/lib/resource-service/organization-api", () => ({
  allocateSemesterPoints: vi.fn(),
  getRootOrganizationDescendants: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const getDescendantsMock = vi.mocked(getRootOrganizationDescendants);
const allocatePointsMock = vi.mocked(allocateSemesterPoints);

const mockDescendants: Organization[] = [
  {
    id: "org-engineering",
    name: "Faculty of Engineering",
    parentId: "root-org",
    rootOrganizationId: "root-org",
  } as Organization,
  {
    id: "org-cs",
    name: "Department of Computer Science",
    parentId: "org-engineering",
    rootOrganizationId: "root-org",
  } as Organization,
  {
    id: "org-arts",
    name: "Faculty of Arts",
    parentId: "root-org",
    rootOrganizationId: "root-org",
  } as Organization,
];

describe("AllocatePointsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDescendantsMock.mockResolvedValue(mockDescendants);
    allocatePointsMock.mockResolvedValue({ count: 10 });
  });

  it("loads organizations and submits allocation successfully", async () => {
    render(<AllocatePointsDialog rootOrganizationId="root-org" />);

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: "Allocate Semester Points" }));

    // Wait for descendants to load
    await screen.findByText("Faculty of Engineering");

    // "Entire University" should be selected by default and disable children
    const allCheckbox = screen.getByRole("checkbox", { name: "Entire University (All members)" }) as HTMLButtonElement;
    expect(allCheckbox.getAttribute("aria-checked")).toBe("true");

    const engCheckbox = screen.getByRole("checkbox", { name: "Faculty of Engineering" }) as HTMLSpanElement;
    expect(engCheckbox.hasAttribute("data-disabled")).toBe(true);

    // Uncheck "Entire University"
    fireEvent.click(allCheckbox);
    expect(allCheckbox.getAttribute("aria-checked")).toBe("false");
    expect(engCheckbox.hasAttribute("data-disabled")).toBe(false);

    // Check "Faculty of Engineering", should disable "Department of Computer Science"
    fireEvent.click(engCheckbox);
    const csCheckbox = screen.getByRole("checkbox", { name: "Department of Computer Science" }) as HTMLSpanElement;
    expect(engCheckbox.getAttribute("aria-checked")).toBe("true");
    expect(csCheckbox.hasAttribute("data-disabled")).toBe(true);
    expect(csCheckbox.getAttribute("aria-checked")).toBe("true");

    // Check "Faculty of Arts"
    const artsCheckbox = screen.getByRole("checkbox", { name: "Faculty of Arts" }) as HTMLButtonElement;
    fireEvent.click(artsCheckbox);
    expect(artsCheckbox.getAttribute("aria-checked")).toBe("true");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: "Allocate Points" }));

    await waitFor(() => {
      expect(allocatePointsMock).toHaveBeenCalledWith(
        "root-org",
        ["org-engineering", "org-arts"],
        500,
        "Semester-1/2026"
      );
      expect(toast.success).toHaveBeenCalledWith("Successfully allocated points to 10 members!");
    });
  });

  it("shows an error if API call fails", async () => {
    allocatePointsMock.mockRejectedValueOnce(new Error("Allocation failed"));
    render(<AllocatePointsDialog rootOrganizationId="root-org" />);

    fireEvent.click(screen.getByRole("button", { name: "Allocate Semester Points" }));
    await screen.findByText("Faculty of Engineering");

    fireEvent.click(screen.getByRole("button", { name: "Allocate Points" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Allocation failed");
    });
  });

  it("shows an error if no organizations are selected", async () => {
    render(<AllocatePointsDialog rootOrganizationId="root-org" />);

    fireEvent.click(screen.getByRole("button", { name: "Allocate Semester Points" }));
    await screen.findByText("Faculty of Engineering");

    // Uncheck "Entire University" so nothing is selected
    const allCheckbox = screen.getByRole("checkbox", { name: "Entire University (All members)" });
    fireEvent.click(allCheckbox);

    fireEvent.click(screen.getByRole("button", { name: "Allocate Points" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please select at least one target organization");
      expect(allocatePointsMock).not.toHaveBeenCalled();
    });
  });
});
