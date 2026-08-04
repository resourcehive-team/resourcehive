import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (!window.PointerEvent) {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    value: MouseEvent,
  });
}

afterEach(() => {
  cleanup();
});
