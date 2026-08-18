import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import SignupStatusPage from "@/app/signup/status/page";
import type { RegistrationResponse } from "@/lib/auth-api";
import { storeSignupDebugData } from "@/lib/auth-storage";

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
      (screen.getByRole("button", {
        name: "Resend verification link",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("offers login once the email has been verified", () => {
    storeSignupDebugData({
      ...signup,
      user: { ...signup.user, emailVerified: true },
    });

    render(<SignupStatusPage />);

    expect(screen.getByText("You’re ready to begin.")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Continue to login" })
        .getAttribute("href"),
    ).toBe("/login");
  });
});
