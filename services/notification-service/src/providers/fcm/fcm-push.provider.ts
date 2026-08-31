import { Injectable } from "@nestjs/common";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { PrismaService } from "@resourcehive/database";
import { ConsolePushProvider } from "../../delivery/console-delivery.providers";
import {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "../../delivery/delivery-provider";
import { classifyFcmError, isInvalidFcmTarget } from "./fcm-error-classifier";

@Injectable()
export class FcmPushProvider implements DeliveryProvider {
  readonly channel = "PUSH" as const;
  constructor(
    private readonly consoleProvider: ConsolePushProvider,
    private readonly prisma: PrismaService,
  ) {}

  async send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
    if (process.env.FCM_ENABLED !== "true")
      return this.consoleProvider.send(message);
    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    try {
      const notificationId =
        typeof message.data.notificationId === "string"
          ? message.data.notificationId
          : message.deliveryId;
      const providerMessageId = await getMessaging().send({
        token: message.destination,
        notification: { title: message.title, body: message.message },
        data: { notificationId },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
      return { providerMessageId, status: "ACCEPTED" };
    } catch (error) {
      if (isInvalidFcmTarget(error)) {
        await this.prisma.userDevice.updateMany({
          where: { installationId: message.destination },
          data: { status: "INVALID", invalidatedAt: new Date() },
        });
      }
      throw classifyFcmError(error);
    }
  }
}
