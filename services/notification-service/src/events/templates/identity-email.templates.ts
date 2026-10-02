import { NotificationCommandV1 } from "@resourcehive/notification-client";
import { RenderedNotification } from "../notification-template.service";

function required(command: NotificationCommandV1, name: string): string {
  const value = command.template.variables[name];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Template variable ${name} is required`);
  return value.trim();
}

export function renderIdentityEmail(
  command: NotificationCommandV1,
): RenderedNotification {
  if (command.template.key === "identity.verify-email.v1") {
    const url = required(command, "verificationUrl");
    return {
      type: "EMAIL_VERIFICATION",
      title: "Verify your ResourceHive email",
      message: "Verify your email address to continue using ResourceHive.",
      emailSubject: "Verify your ResourceHive email",
      emailText: `Verify your email by opening this link: ${url}`,
    };
  }
  if (command.template.key === "identity.password-reset.v1") {
    const url = required(command, "resetUrl");
    return {
      type: "PASSWORD_RESET_EMAIL",
      title: "Reset your ResourceHive password",
      message: "Reset your ResourceHive password.",
      emailSubject: "Reset your ResourceHive password",
      emailText: `Reset your password by opening this link: ${url}\n\nIf you did not request this change, you can ignore this email.`,
    };
  }
  if (command.template.key === "identity.password-changed.v1") {
    return {
      type: "PASSWORD_CHANGED_EMAIL",
      title: "Your ResourceHive password was changed",
      message: "Your ResourceHive password was changed.",
      emailSubject: "Your ResourceHive password was changed",
      emailText:
        "Your ResourceHive password was changed. If you did not make this change, contact your organization administrator.",
    };
  }
  throw new Error("Unsupported Identity email template");
}
