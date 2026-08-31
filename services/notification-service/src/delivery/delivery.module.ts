import { Module } from "@nestjs/common";
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
} from "./console-delivery.providers";
import { DeliveryDispatcherService } from "./delivery-dispatcher.service";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryWorkerService } from "./delivery-worker.service";
import { ResendEmailProvider } from "../providers/resend/resend-email.provider";
import { ResendWebhookController } from "../providers/resend/resend-webhook.controller";
import { ResendWebhookService } from "../providers/resend/resend-webhook.service";
import { FcmPushProvider } from "../providers/fcm/fcm-push.provider";

@Module({
  controllers: [ResendWebhookController],
  providers: [
    DeliveryRepository,
    DeliveryWorkerService,
    DeliveryDispatcherService,
    ConsoleEmailProvider,
    ConsolePushProvider,
    ResendEmailProvider,
    ResendWebhookService,
    FcmPushProvider,
  ],
  exports: [DeliveryWorkerService],
})
export class DeliveryModule {}
