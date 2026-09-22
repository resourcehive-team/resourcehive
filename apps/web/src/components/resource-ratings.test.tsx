import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceRatingsList } from "@/components/resource-ratings";
import { ApiError } from "@/lib/api-client";
import {
  getResourceRatings,
  submitResourceRating,
} from "@/lib/resource-service/resource-api";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/resource-service/resource-api", () => ({
  getResourceRatings: vi.fn(),
  submitResourceRating: vi.fn(),
}));

const getRatingsMock = vi.mocked(getResourceRatings);
const submitRatingMock = vi.mocked(submitResourceRating);

const mockRatingsSummary = {
  average: 4.5,
  total: 2,
  ratings: [
    {
      id: "rating-1",
      resourceId: "resource-1",
      userId: "user-1",
      rating: 5,
      comment: "Excellent resource!",
      createdAt: "2026-09-20T10:00:00.000Z",
    },
    {
      id: "rating-2",
      resourceId: "resource-1",
      userId: "user-2",
      rating: 4,
      comment: null,
      createdAt: "2026-09-21T11:00:00.000Z",
    },
  ],
};

describe("ResourceRatingsList", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    getRatingsMock.mockReset().mockResolvedValue(mockRatingsSummary);
    submitRatingMock.mockReset().mockResolvedValue(mockRatingsSummary.ratings[0]);
  });

  it("fetches and displays ratings on load", async () => {
    render(
      <ResourceRatingsList
        organizationId="org-1"
        resourceId="res-1"
        isActive={true}
      />,
    );

    expect(await screen.findByText("4.5")).toBeDefined();
    expect(screen.getByText("(2 reviews)")).toBeDefined();
    expect(screen.getByText("Excellent resource!")).toBeDefined();

    expect(getRatingsMock).toHaveBeenCalledWith(
      "org-1",
      "res-1",
      expect.any(AbortSignal),
    );
  });

  it("displays empty state when no ratings exist", async () => {
    getRatingsMock.mockResolvedValueOnce({
      average: 0,
      total: 0,
      ratings: [],
    });

    render(
      <ResourceRatingsList
        organizationId="org-1"
        resourceId="res-1"
        isActive={true}
      />,
    );

    expect(await screen.findByText("Unrated")).toBeDefined();
    expect(screen.getByText("(0 reviews)")).toBeDefined();
    expect(
      screen.getByText("No ratings have been submitted yet. Be the first to review!"),
    ).toBeDefined();
  });

  it("allows submitting a rating when active", async () => {
    render(
      <ResourceRatingsList
        organizationId="org-1"
        resourceId="res-1"
        isActive={true}
      />,
    );

    // Wait for load
    await screen.findByText("4.5");

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: "Leave a review" }));

    // Dialog should be open
    expect(await screen.findByRole("dialog")).toBeDefined();

    // Select 4 stars
    const starButtons = screen.getAllByRole("button", { name: /stars/i });
    fireEvent.click(starButtons[3]!); // 4th star

    // Add comment
    fireEvent.change(screen.getByRole("textbox", { name: /Comment/i }), {
      target: { value: "Pretty good!" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    await waitFor(() => {
      expect(submitRatingMock).toHaveBeenCalledWith("org-1", "res-1", {
        rating: 4,
        comment: "Pretty good!",
      });
    });

    // Should refresh ratings
    expect(getRatingsMock).toHaveBeenCalledTimes(2);
  });

  it("disables the leave review button when not active", async () => {
    render(
      <ResourceRatingsList
        organizationId="org-1"
        resourceId="res-1"
        isActive={false}
      />,
    );

    // Wait for load
    await screen.findByText("4.5");

    const button = screen.getByRole("button", { name: "Leave a review" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
