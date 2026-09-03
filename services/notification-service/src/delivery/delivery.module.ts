import { Module } from "@nestjs/common";
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
} from "./console-delivery.providers";
import { DeliveryDispatcherService } from "./delivery-dispatcher.service";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryWorkerService } from "./delivery-worker.service";
import { ResendEmailProvider } from "./resend-email.provider";
import { FcmPushProvider } from "./fcm-push.provider";

@Module({
  providers: [
    DeliveryRepository,
    DeliveryWorkerService,
    DeliveryDispatcherService,
    ConsoleEmailProvider,
    ConsolePushProvider,
    ResendEmailProvider,
    FcmPushProvider,
  ],
  exports: [DeliveryWorkerService],
})
export class DeliveryModule {}
