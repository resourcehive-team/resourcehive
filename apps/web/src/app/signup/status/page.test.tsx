import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SignupStatusPage from "@/app/signup/status/page";
import type { RegistrationResponse } from "@/lib/auth-api";
import { storeSignupDebugData } from "@/lib/auth-storage";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

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

const signup: RegistrationResponse = {
  message: "Account created. Verify your email to continue.",
  verificationRequired: true,
  user: {
    id: "user-1",
    email: "alex@example.edu",
    firstName: "Alex",
    lastName: "Morgan",
    status: "ACTIVE",
    createdAt: "2026-08-18T00:00:00.000Z",
    emailVerified: false,
    organization: {
      id: "organization-1",
      name: "ResourceHive Demo University",
    },
  },
};

describe("SignupStatusPage", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  it("explains the required verification steps for a pending signup", () => {
    storeSignupDebugData(signup);

    render(<SignupStatusPage />);

    expect(screen.getByText("Check your inbox.")).toBeDefined();
    expect(screen.getByText("alex@example.edu")).toBeDefined();
    expect(screen.getByText("You cannot log in yet")).toBeDefined();
    expect(screen.getByText("How to verify your email")).toBeDefined();
    expect(
      (
        screen.getByRole("button", {
          name: "Resend verification link",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("redirects to login once the email has been verified", async () => {
    storeSignupDebugData({
      ...signup,
      user: { ...signup.user, emailVerified: true },
    });

    render(<SignupStatusPage />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("How to verify your email")).toBeNull();
  });
});
