import { Injectable, OnModuleInit } from "@nestjs/common";
import { existsSync } from "node:fs";
import { getNotificationKafkaConfig } from "../kafka/kafka.config";

@Injectable()
export class NotificationConfigurationService implements OnModuleInit {
  onModuleInit(): void {
    getNotificationKafkaConfig();
    const pollInterval = Number(process.env.DELIVERY_POLL_INTERVAL_MS ?? 5_000);
    if (!Number.isFinite(pollInterval) || pollInterval < 1_000) {
      throw new Error("DELIVERY_POLL_INTERVAL_MS must be at least 1000");
    }
    if (process.env.RESEND_ENABLED === "true") {
      this.require("RESEND_API_KEY");
      this.require("RESEND_FROM_EMAIL");
    }
    if (process.env.FCM_ENABLED === "true") {
      this.require("FIREBASE_PROJECT_ID");
      const credentialsPath = this.require("GOOGLE_APPLICATION_CREDENTIALS");
      if (!existsSync(credentialsPath)) {
        throw new Error(
          `GOOGLE_APPLICATION_CREDENTIALS does not point to an existing file: ${credentialsPath}`,
        );
      }
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

  private require(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new Error(`${name} is required when its provider is enabled`);
    }
    return value;
  }
}
