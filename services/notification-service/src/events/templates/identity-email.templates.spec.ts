import { NotificationCommandV1 } from "@resourcehive/notification-client";
import { renderIdentityEmail } from "./identity-email.templates";

describe("Identity email templates", () => {
  it("requires a verification URL", () => {
    const command = {
      template: { key: "identity.verify-email.v1", variables: {} },
    } as unknown as NotificationCommandV1;
    expect(() => renderIdentityEmail(command)).toThrow("verificationUrl");
  });
});
