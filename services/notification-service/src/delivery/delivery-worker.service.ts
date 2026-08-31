import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ConsolePushProvider } from "./console-delivery.providers";
import { ResendEmailProvider } from "../providers/resend/resend-email.provider";
import { DeliveryProvider } from "./delivery-provider";
import { DeliveryRepository } from "./delivery.repository";
import { decideRetry } from "./retry-policy";

@Injectable()
export class DeliveryWorkerService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly email: ResendEmailProvider,
    private readonly push: ConsolePushProvider,
  ) {}
  async process(id: string): Promise<void> {
    const delivery = await this.repository.claim(id, randomUUID());
    if (!delivery) return;
    const provider = this.providerFor(delivery.channel);
    try {
      const result = await provider.send({
        deliveryId: id,
        destination: delivery.destination,
        title: delivery.notification.title,
        message: delivery.notification.message,
        data: delivery.notification.data as Record<string, unknown>,
      });
      await this.repository.complete(
        id,
        delivery.attemptCount,
        result.status,
        result.providerMessageId,
      );
    } catch (error) {
      await this.repository.fail(
        id,
        delivery.attemptCount,
        decideRetry(error, delivery.attemptCount),
      );
    }
  }
  private providerFor(channel: string): DeliveryProvider {
    if (channel === "EMAIL") return this.email;
    if (channel === "PUSH") return this.push;
    throw new Error(`Unsupported delivery channel ${channel}`);
  }
}
