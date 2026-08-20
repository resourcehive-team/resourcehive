import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PointsBalanceCard } from "@/components/points-balance-card";
import { getCurrentUserPoints } from "@/lib/auth-api";

vi.mock("@/lib/auth-api", () => ({
  getCurrentUserPoints: vi.fn(),
}));

const getCurrentUserPointsMock = vi.mocked(getCurrentUserPoints);

describe("PointsBalanceCard", () => {
  beforeEach(() => {
    getCurrentUserPointsMock.mockReset();
  });

  it("shows the current balance returned by Identity", async () => {
    getCurrentUserPointsMock.mockResolvedValue({
      userId: "user-1",
      availablePoints: 75,
      updatedAt: "2026-08-19T10:30:00.000Z",
    });

    render(<PointsBalanceCard />);

    expect(screen.getByText("Loading")).toBeDefined();
    expect(await screen.findByText("75")).toBeDefined();
    expect(screen.getByText("Available")).toBeDefined();
    expect(getCurrentUserPointsMock).toHaveBeenCalledWith(
      expect.any(AbortSignal),
    );
  });

  it("shows an explicit zero balance for a user without transactions", async () => {
    getCurrentUserPointsMock.mockResolvedValue({
      userId: "new-user",
      availablePoints: 0,
      updatedAt: null,
    });

    render(<PointsBalanceCard />);

    expect(await screen.findByText("0")).toBeDefined();
    expect(
      screen.getByText("No points have been issued to this account yet."),
    ).toBeDefined();
  });

  it("shows a stable unavailable state when the request fails", async () => {
    getCurrentUserPointsMock.mockRejectedValue(new Error("offline"));

    render(<PointsBalanceCard />);

    expect(await screen.findByText("Unavailable")).toBeDefined();
    expect(
      screen.getByText(
        "Your current balance could not be loaded. Refresh to try again.",
      ),
    ).toBeDefined();
  });
});
