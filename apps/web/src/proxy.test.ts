import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "@/proxy";

const jwtSecret = "proxy-test-secret";
const jwtVerifyMock = vi.hoisted(() => vi.fn());

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));

function authenticatedRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: {
      cookie: "resourcehive_access_token=valid-token",
    },
  });
}

describe("web proxy", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    jwtVerifyMock.mockReset().mockResolvedValue({
      payload: { sub: "user-id", email: "alex@example.edu" },
    });
  });

  it.each(["/login", "/signup/status", "/verify-email?token=token-value"])(
    "redirects an authenticated request for %s to the dashboard",
    async (pathname) => {
      const response = await proxy(authenticatedRequest(pathname));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/dashboard",
      );
    },
  );

  it("allows an unauthenticated visitor to view signup status", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("Invalid token"));
    const response = await proxy(
      new NextRequest("http://localhost:3000/signup/status"),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
