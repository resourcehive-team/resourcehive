import { NotificationCommandV1 } from "../../contracts";
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
      type: "PASSWORD_RESET",
      title: "Reset your ResourceHive password",
      message: "A password reset was requested for your account.",
      emailSubject: "Reset your ResourceHive password",
      emailText: `Reset your password by opening this link: ${url}\n\nIf you did not request this change, ignore this email.`,
    };
  }
  if (command.template.key === "identity.password-changed.v1") {
    const text =
      "Your ResourceHive password was changed. If you did not make this change, contact your organization administrator.";
    return {
      type: "PASSWORD_CHANGED",
      title: "Your ResourceHive password was changed",
      message: text,
      emailSubject: "Your ResourceHive password was changed",
      emailText: text,
    };
  }
  throw new Error("Unsupported Identity template");
}
