import { Injectable } from "@nestjs/common";
import { ResendEmailProvider } from "./resend-email.provider";
import { FcmPushProvider } from "./fcm-push.provider";
import { DeliveryProvider } from "./delivery-provider";
import { DeliveryRepository } from "./delivery.repository";
import { decideRetry } from "./retry-policy";

@Injectable()
export class DeliveryWorkerService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly email: ResendEmailProvider,
    private readonly push: FcmPushProvider,
  ) {}
  async process(id: string): Promise<void> {
    const delivery = await this.repository.claim(id);
    if (!delivery) return;
    const provider = this.providerFor(delivery.channel);
    try {
      if (!delivery.subject || !delivery.body) {
        throw new Error("Delivery content is missing");
      }
      const result = await provider.send({
        deliveryId: id,
        destination: delivery.destination,
        subject: delivery.subject,
        body: delivery.body,
        data: delivery.data as Record<string, unknown>,
      });
      await this.repository.complete(
        id,
        result.providerMessageId,
        delivery.channel === "EMAIL",
      );
    } catch (error) {
      await this.repository.fail(id, decideRetry(error, delivery.attemptCount));
    }
  }
  private providerFor(channel: string): DeliveryProvider {
    if (channel === "EMAIL") return this.email;
    if (channel === "PUSH") return this.push;
    throw new Error(`Unsupported delivery channel ${channel}`);
  }
}
