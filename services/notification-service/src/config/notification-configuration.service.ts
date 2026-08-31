import { Injectable, OnModuleInit } from "@nestjs/common";
import { getNotificationKafkaConfig } from "../kafka/kafka.config";

@Injectable()
export class NotificationConfigurationService implements OnModuleInit {
  onModuleInit(): void {
    getNotificationKafkaConfig();
    if (process.env.RESEND_ENABLED === "true") {
      this.require("RESEND_API_KEY");
      this.require("RESEND_FROM_EMAIL");
      this.require("RESEND_WEBHOOK_SECRET");
    }
    if (process.env.FCM_ENABLED === "true") {
      this.require("FIREBASE_PROJECT_ID");
      this.require("GOOGLE_APPLICATION_CREDENTIALS");
    }
  }

  modes(): {
    kafka: "enabled" | "disabled";
    email: "resend" | "console";
    push: "fcm" | "console";
  } {
    return {
      kafka: getNotificationKafkaConfig().enabled ? "enabled" : "disabled",
      email: process.env.RESEND_ENABLED === "true" ? "resend" : "console",
      push: process.env.FCM_ENABLED === "true" ? "fcm" : "console",
    };
  }

  private require(name: string): void {
    if (!process.env[name]?.trim()) {
      throw new Error(`${name} is required when its provider is enabled`);
    }
  }
}
