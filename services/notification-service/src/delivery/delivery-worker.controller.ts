import { Controller } from "@nestjs/common";
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from "@nestjs/microservices";
import { isUUID } from "class-validator";
import { NOTIFICATION_TOPICS } from "../contracts";
import { DeliveryWorkerService } from "./delivery-worker.service";

@Controller()
export class DeliveryWorkerController {
  constructor(private readonly worker: DeliveryWorkerService) {}
  @EventPattern(NOTIFICATION_TOPICS.deliveryJobs)
  async handle(@Payload() value: unknown, @Ctx() context: KafkaContext) {
    const id = (value as { payload?: { deliveryId?: unknown } })?.payload
      ?.deliveryId;
    if (typeof id !== "string" || !isUUID(id))
      throw new Error("Delivery job requires a UUID deliveryId");
    await this.worker.process(id);
    await context.getConsumer().commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: (BigInt(context.getMessage().offset) + 1n).toString(),
      },
    ]);
  }
}
