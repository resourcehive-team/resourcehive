import { DeliveryProviderError } from "./delivery-provider";
import { decideRetry } from "./retry-policy";

describe("delivery retry policy", () => {
  it("retries transient failures while attempts remain", () => {
    expect(
      decideRetry(new DeliveryProviderError("RATE_LIMITED", true, "Later"), 1)
        .retry,
    ).toBe(true);
  });
  it("does not retry permanent failures", () => {
    expect(
      decideRetry(new DeliveryProviderError("INVALID", false, "Bad"), 1).retry,
    ).toBe(false);
  });
  it("exhausts transient failures", () => {
    expect(
      decideRetry(new DeliveryProviderError("TIMEOUT", true, "Late"), 6).retry,
    ).toBe(false);
  });
});
