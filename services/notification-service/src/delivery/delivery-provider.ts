export interface DeliveryMessage {
  deliveryId: string;
  destination: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
}

export interface DeliveryProviderResult {
  providerMessageId?: string;
  status: "ACCEPTED" | "SENT";
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
