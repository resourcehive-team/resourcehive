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
  throw new Error("Unsupported Identity verification template");
}
