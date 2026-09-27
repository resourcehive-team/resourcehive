import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listenForWebPush = vi.hoisted(() => vi.fn());

vi.mock("@/lib/web-push", () => ({ listenForWebPush }));

import { WebPushListener } from "@/components/web-push-listener";

describe("WebPushListener", () => {
  beforeEach(() => {
    listenForWebPush.mockReset();
    listenForWebPush.mockResolvedValue(vi.fn());
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "default" },
    });
  });

  it("does not load Firebase until push is permitted", async () => {
    render(<WebPushListener />);
    await act(async () => Promise.resolve());
    expect(listenForWebPush).not.toHaveBeenCalled();

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "granted" },
    });
    await act(async () => {
      window.dispatchEvent(new Event("resourcehive:webpush-enabled"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(listenForWebPush).toHaveBeenCalledTimes(1);
  });
});
