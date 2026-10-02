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
