import { deliveryStatusForResendEvent } from "./resend-webhook.service";

describe("Resend webhook status mapping", () => {
  it("maps delivery feedback", () =>
    expect(deliveryStatusForResendEvent("email.delivered")).toBe("DELIVERED"));
  it("ignores unknown event types", () =>
    expect(deliveryStatusForResendEvent("domain.updated")).toBeUndefined());
});
