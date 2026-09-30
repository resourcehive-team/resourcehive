import { Module } from "@nestjs/common";
import { ConsoleEmailProvider, ConsolePushProvider } from "./delivery-provider";
import {
  DeliveryDispatcherService,
  DeliveryWorkerService,
} from "./delivery-processor.service";
import { DeliveryRepository } from "./delivery.repository";
import { ResendEmailProvider } from "./resend.provider";
import { FcmPushProvider } from "./fcm.provider";

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
