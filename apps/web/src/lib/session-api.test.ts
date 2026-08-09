import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchWithSessionRefresh,
  refreshSession,
} from "@/lib/session-api";

describe("session refresh client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares one refresh request between concurrent callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      refreshSession(),
      refreshSession(),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("refreshes once and retries a protected request after a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "resource-id" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithSessionRefresh(
      "http://localhost:8000/resources/resource-id",
      { credentials: "include" },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "resource-id" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns the original 401 when the refresh session is invalid", async () => {
    const unauthorized = new Response(null, { status: 401 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithSessionRefresh(
      "http://localhost:8000/resources/resource-id",
    );

    expect(response).toBe(unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
