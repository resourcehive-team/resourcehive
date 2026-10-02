import { NotificationCommandV1 } from "@resourcehive/notification-client";
import { renderIdentityEmail } from "./identity-email.templates";

describe("Identity email templates", () => {
  it("requires a verification URL", () => {
    const command = {
      template: { key: "identity.verify-email.v1", variables: {} },
    } as unknown as NotificationCommandV1;
    expect(() => renderIdentityEmail(command)).toThrow("verificationUrl");
  });

  it("renders a password reset email with the reset URL", () => {
    const command = {
      template: {
        key: "identity.password-reset.v1",
        variables: { resetUrl: "https://app.example/reset-password?token=x" },
      },
    } as unknown as NotificationCommandV1;

    const rendered = renderIdentityEmail(command);
    expect(rendered.type).toBe("PASSWORD_RESET_EMAIL");
    expect(rendered.emailSubject).toBe("Reset your ResourceHive password");
    expect(rendered.emailText).toContain(
      "https://app.example/reset-password?token=x",
    );
  });

  it("renders a password changed email without token content", () => {
    const command = {
      template: {
        key: "identity.password-changed.v1",
        variables: {},
      },
    } as unknown as NotificationCommandV1;

    const rendered = renderIdentityEmail(command);
    expect(rendered.type).toBe("PASSWORD_CHANGED_EMAIL");
    expect(rendered.emailText).not.toContain("token");
    expect(rendered.emailText).toContain(
      "contact your organization administrator",
    );
  });
});
