import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/login-form";
import {
  login,
  LoginError,
  type RegistrationResponse,
} from "@/lib/auth-api";
import { storeSignupDebugData } from "@/lib/auth-storage";
import { refreshSession } from "@/lib/session-api";

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
    login: vi.fn(),
  };
});

vi.mock("@/lib/session-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-api")>();

  return {
    ...actual,
    refreshSession: vi.fn(),
  };
});

const loginMock = vi.mocked(login);
const refreshSessionMock = vi.mocked(refreshSession);

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const pendingSignup: RegistrationResponse = {
  message: "Account created. Verify your email to continue.",
  verificationRequired: true,
  user: {
    id: "user-1",
    email: "alex@example.edu",
    firstName: "Alex",
    lastName: "Morgan",
    status: "PENDING_VERIFICATION",
    createdAt: "2026-08-18T00:00:00.000Z",
    emailVerified: false,
    organization: {
      id: "organization-1",
      name: "ResourceHive Demo University",
    },
  },
};

describe("LoginForm", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    localStorage.clear();
    sessionStorage.clear();
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    loginMock.mockReset();
    refreshSessionMock.mockReset().mockResolvedValue(false);
  });

  it("redirects a locally known pending signup to verification guidance", async () => {
    storeSignupDebugData(pendingSignup);
    loginMock.mockRejectedValue(
      new LoginError("Email or password is incorrect.", "INVALID_CREDENTIALS"),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Institutional email/), {
      target: { value: "ALEX@example.edu" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "Password123!" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/signup/status");
      expect(navigation.refresh).toHaveBeenCalled();
    });
    expect(screen.queryByText("Email or password is incorrect.")).toBeNull();
  });

  it("keeps the generic error for a login not associated with that signup", async () => {
    storeSignupDebugData(pendingSignup);
    loginMock.mockRejectedValue(
      new LoginError("Email or password is incorrect.", "INVALID_CREDENTIALS"),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Institutional email/), {
      target: { value: "someone-else@example.edu" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "Password123!" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Email or password is incorrect."),
    ).toBeDefined();
    expect(navigation.replace).not.toHaveBeenCalledWith("/signup/status");
  });
});
