import { Injectable, Logger } from "@nestjs/common";
import {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "./delivery-provider";

@Injectable()
export class ConsoleEmailProvider implements DeliveryProvider {
  readonly channel = "EMAIL" as const;
  private readonly logger = new Logger(ConsoleEmailProvider.name);
  send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
    this.logger.log(
      `Console email accepted for delivery ${message.deliveryId}`,
    );
    return Promise.resolve({
      providerMessageId: `console:${message.deliveryId}`,
    });
  }
}

@Injectable()
export class ConsolePushProvider implements DeliveryProvider {
  readonly channel = "PUSH" as const;
  private readonly logger = new Logger(ConsolePushProvider.name);
  send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
    this.logger.log(`Console push accepted for delivery ${message.deliveryId}`);
    return Promise.resolve({
      providerMessageId: `console:${message.deliveryId}`,
    });
  }
}
