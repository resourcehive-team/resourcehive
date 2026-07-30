import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountDetails } from "@/components/account-details";
import {
  AuthenticationRequiredError,
  getCurrentUser,
  logout,
  type CurrentUserResponse,
} from "@/lib/auth-api";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-api")>();

  return {
    ...actual,
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  };
});

const currentUserMock = vi.mocked(getCurrentUser);
const logoutMock = vi.mocked(logout);

const account: CurrentUserResponse = {
  user: {
    id: "user-1",
    email: "alice@resourcehive.test",
    firstName: "Alice",
    lastName: "Perera",
    displayName: "Alice Perera",
    emailVerified: true,
    status: "ACTIVE",
    platformRole: "USER",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  organizationContext: {
    organizationId: "organization-1",
    role: "member",
  },
};

describe("AccountDetails", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    currentUserMock.mockReset().mockResolvedValue(account);
    logoutMock.mockReset().mockResolvedValue();
  });

  it("loads and displays the current Identity account", async () => {
    render(<AccountDetails />);

    expect(screen.getByLabelText("Loading account details")).toBeDefined();

    const firstName = await screen.findByLabelText("First name");
    const lastName = screen.getByLabelText("Last name");
    const email = screen.getByLabelText("Email address");

    expect((firstName as HTMLInputElement).value).toBe("Alice");
    expect((lastName as HTMLInputElement).value).toBe("Perera");
    expect((email as HTMLInputElement).value).toBe(
      "alice@resourcehive.test",
    );
    expect(screen.getByText("Verified")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Member")).toBeDefined();
    expect(currentUserMock).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("allows the account request to be retried", async () => {
    currentUserMock
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce(account);

    render(<AccountDetails />);

    expect(await screen.findByText("Account could not be loaded")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByLabelText("First name")).toBeDefined();
    expect(currentUserMock).toHaveBeenCalledTimes(2);
  });

  it("clears an invalid session and redirects to login", async () => {
    currentUserMock.mockRejectedValueOnce(
      new AuthenticationRequiredError(),
    );

    render(<AccountDetails />);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(navigation.replace).toHaveBeenCalledWith("/login");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });
});
