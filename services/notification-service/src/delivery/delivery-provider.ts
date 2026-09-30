import { Injectable, Logger } from "@nestjs/common";

export interface DeliveryMessage {
  deliveryId: string;
  destination: string;
  subject: string;
  body: string;
  data: Record<string, unknown>;
}

export interface DeliveryProviderResult {
  providerMessageId?: string;
}

export interface DeliveryProvider {
  readonly channel: "EMAIL" | "PUSH";
  send(message: DeliveryMessage): Promise<DeliveryProviderResult>;
}

export class DeliveryProviderError extends Error {
  constructor(
    readonly code: string,
    readonly transient: boolean,
    message: string,
  ) {
    super(message);
    this.name = "DeliveryProviderError";
  }
}

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
