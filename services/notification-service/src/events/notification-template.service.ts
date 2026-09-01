import { Injectable } from "@nestjs/common";
import {
  NOTIFICATION_TEMPLATES,
  NotificationCommandV1,
  NotificationTemplateKey,
  TemplateVariables,
} from "../contracts";
import { renderIdentityEmail } from "./templates/identity-email.templates";
import { renderBooking } from "./templates/booking.templates";

export interface RenderedNotification {
  type: string;
  title: string;
  message: string;
  emailSubject: string;
  emailText: string;
}

@Injectable()
export class NotificationTemplateService {
  render(command: NotificationCommandV1): RenderedNotification {
    if (command.template.key === NOTIFICATION_TEMPLATES.developmentTestPush) {
      return {
        type: "DEVELOPMENT_TEST_PUSH",
        title: "ResourceHive test notification",
        message: "Local Firebase Cloud Messaging is configured correctly.",
        emailSubject: "",
        emailText: "",
      };
    }
    if (command.template.key.startsWith("identity.")) {
      return renderIdentityEmail(command);
    }
    if (command.template.key.startsWith("booking.")) {
      return renderBooking(command);
    }
    const title = this.defaultTitle(command.template.key);
    const message = this.text(command.template.variables, "message") ?? title;
    return {
      type: command.template.key.toUpperCase().replaceAll(".", "_"),
      title,
      message,
      emailSubject: title,
      emailText: message,
    };
  }

  private defaultTitle(key: NotificationTemplateKey): string {
    return key
      .replace(/\.v\d+$/, "")
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private text(variables: TemplateVariables, key: string): string | undefined {
    const value = variables[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}
