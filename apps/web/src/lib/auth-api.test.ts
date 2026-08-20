import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentUserPoints,
  login,
  resendVerificationEmail,
} from "@/lib/auth-api";

describe("login client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies an email-verification response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "EMAIL_VERIFICATION_REQUIRED",
            message: "Verify your email address before logging in",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      login({ email: "alex@example.edu", password: "Password123!" }),
    ).rejects.toMatchObject({
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Verify your email address before logging in.",
    });
  });

  it("keeps an ordinary unauthorized response generic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid email or password" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      login({ email: "alex@example.edu", password: "wrong-password" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  });

  it("requests another verification email without retaining extra fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "If an unverified account exists for that email, a verification link has been sent.",
            unexpectedField: "must-not-reach-the-client",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(resendVerificationEmail("alex@example.edu")).resolves.toEqual({
      message:
        "If an unverified account exists for that email, a verification link has been sent.",
    });
  });

  it("loads the authenticated user's projected point balance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            userId: "user-1",
            availablePoints: 75,
            updatedAt: "2026-08-19T10:30:00.000Z",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(getCurrentUserPoints()).resolves.toEqual({
      userId: "user-1",
      availablePoints: 75,
      updatedAt: "2026-08-19T10:30:00.000Z",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me/points"),
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it("rejects an invalid point balance response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            userId: "user-1",
            availablePoints: -10,
            updatedAt: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(getCurrentUserPoints()).rejects.toThrow(
      "The identity service returned an invalid point balance.",
    );
  });
});
