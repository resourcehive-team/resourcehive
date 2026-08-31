import { Module } from "@nestjs/common";
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
} from "./console-delivery.providers";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryWorkerController } from "./delivery-worker.controller";
import { DeliveryWorkerService } from "./delivery-worker.service";
import { RetrySchedulerService } from "./retry-scheduler.service";
import { ResendEmailProvider } from "../providers/resend/resend-email.provider";

@Module({
  controllers: [DeliveryWorkerController],
  providers: [
    DeliveryRepository,
    DeliveryWorkerService,
    RetrySchedulerService,
    ConsoleEmailProvider,
    ConsolePushProvider,
    ResendEmailProvider,
  ],
  exports: [DeliveryWorkerService],
})
export class DeliveryModule {}
