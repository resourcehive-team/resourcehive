import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipRequestCard } from "@/components/membership-request-card";
import {
  ApiAuthenticationError,
  ApiError,
} from "@/lib/api-client";
import { requestOrganizationMembership } from "@/lib/resource-service/membership-api";
import type { Membership } from "@/lib/resource-service/types";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/resource-service/membership-api", () => ({
  requestOrganizationMembership: vi.fn(),
}));

const requestMembershipMock = vi.mocked(requestOrganizationMembership);

const pendingMembership: Membership = {
  id: "membership-1",
  userId: "user-1",
  organizationId: "organization-1",
  role: "MEMBER",
  status: "PENDING",
  joinedAt: "2026-07-30T00:00:00.000Z",
  approvedBy: null,
};

describe("MembershipRequestCard", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    requestMembershipMock
      .mockReset()
      .mockResolvedValue(pendingMembership);
  });

  it("submits only the organization context and shows the returned status", async () => {
    render(
      <MembershipRequestCard
        organizationId="organization-1"
        organizationName="Engineering Faculty"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Request membership" }),
    );

    expect(
      await screen.findByText("Membership request submitted"),
    ).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(requestMembershipMock).toHaveBeenCalledWith(
      "organization-1",
      expect.any(AbortSignal),
    );
    expect(requestMembershipMock.mock.calls[0]).toHaveLength(2);
  });

  it("disables repeated submission while the request is pending", async () => {
    const request = deferred<Membership>();
    requestMembershipMock.mockReturnValueOnce(request.promise);

    render(
      <MembershipRequestCard
        organizationId="organization-1"
        organizationName="Engineering Faculty"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Request membership" }),
    );

    const pendingButton = await screen.findByRole("button", {
      name: "Submitting request",
    });
    expect(pendingButton.hasAttribute("disabled")).toBe(true);

    request.resolve(pendingMembership);
    expect(
      await screen.findByText("Membership request submitted"),
    ).toBeDefined();
  });

  it("explains a duplicate membership without offering a retry", async () => {
    requestMembershipMock.mockRejectedValueOnce(
      new ApiError("Membership already exists", 409),
    );

    render(
      <MembershipRequestCard
        organizationId="organization-1"
        organizationName="Engineering Faculty"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request membership" }),
    );

    expect(
      await screen.findByText("Membership already exists"),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Try request again" }),
    ).toBeNull();
  });

  it("redirects to login when the request session has expired", async () => {
    requestMembershipMock.mockRejectedValueOnce(
      new ApiAuthenticationError(),
    );

    render(
      <MembershipRequestCard
        organizationId="organization-1"
        organizationName="Engineering Faculty"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request membership" }),
    );

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
