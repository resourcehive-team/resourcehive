import { NotificationCommandV1 } from "../../contracts";
import { renderIdentityEmail } from "./identity-email.templates";

describe("Identity email templates", () => {
  it("requires a verification URL", () => {
    const command = {
      template: { key: "identity.verify-email.v1", variables: {} },
    } as unknown as NotificationCommandV1;
    expect(() => renderIdentityEmail(command)).toThrow("verificationUrl");
  });
  it("renders a password-change security notice", () => {
    const command = {
      template: { key: "identity.password-changed.v1", variables: {} },
    } as unknown as NotificationCommandV1;
    expect(renderIdentityEmail(command).type).toBe("PASSWORD_CHANGED");
  });
});
