import { Module } from "@nestjs/common";
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
} from "./console-delivery.providers";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryWorkerController } from "./delivery-worker.controller";
import { DeliveryWorkerService } from "./delivery-worker.service";
import { RetrySchedulerService } from "./retry-scheduler.service";

@Module({
  controllers: [DeliveryWorkerController],
  providers: [
    DeliveryRepository,
    DeliveryWorkerService,
    RetrySchedulerService,
    ConsoleEmailProvider,
    ConsolePushProvider,
  ],
  exports: [DeliveryWorkerService],
})
export class DeliveryModule {}
