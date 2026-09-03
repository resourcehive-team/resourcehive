import { classifyFcmError, isInvalidFcmTarget } from "./fcm-error-classifier";

describe("FCM error classification", () => {
  it("retries provider availability errors", () =>
    expect(
      classifyFcmError({ code: "messaging/server-unavailable" }).transient,
    ).toBe(true));
  it("invalidates unregistered targets", () =>
    expect(
      isInvalidFcmTarget({
        code: "messaging/registration-token-not-registered",
      }),
    ).toBe(true));
});
