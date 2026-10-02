import { classifyResendError } from "./resend-error-classifier";

describe("Resend error classification", () => {
  it("retries rate limits", () =>
    expect(classifyResendError({ statusCode: 429 }).transient).toBe(true));
  it("does not retry invalid recipients", () =>
    expect(classifyResendError({ statusCode: 422 }).transient).toBe(false));
});
