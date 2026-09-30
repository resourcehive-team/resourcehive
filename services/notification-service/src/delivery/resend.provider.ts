import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import {
  ConsoleEmailProvider,
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderError,
  DeliveryProviderResult,
} from "./delivery-provider";

export function classifyResendError(error: unknown): DeliveryProviderError {
  const value = (error ?? {}) as {
    name?: string;
    message?: string;
    statusCode?: number;
  };
  const code = value.name ?? `HTTP_${value.statusCode ?? "UNKNOWN"}`;
  const transient =
    value.statusCode === 429 ||
    (value.statusCode ?? 0) >= 500 ||
    code === "concurrent_idempotent_requests";
  return new DeliveryProviderError(
    code,
    transient,
    value.message ?? "Resend rejected the email",
  );
}

@Injectable()
export class ResendEmailProvider implements DeliveryProvider {
  readonly channel = "EMAIL" as const;
  private client?: Resend;
  constructor(private readonly consoleProvider: ConsoleEmailProvider) {}

  async send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
    if (process.env.RESEND_ENABLED !== "true")
      return this.consoleProvider.send(message);
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from)
      throw classifyResendError({
        name: "RESEND_NOT_CONFIGURED",
        message: "RESEND_API_KEY and RESEND_FROM_EMAIL are required",
      });
    this.client ??= new Resend(apiKey);
    const { data, error } = await this.client.emails.send(
      {
        from,
        to: message.destination,
        subject: message.subject,
        text: message.body,
      },
      { idempotencyKey: message.deliveryId },
    );
    if (error) throw classifyResendError(error);
    if (!data?.id)
      throw classifyResendError({
        name: "EMPTY_RESPONSE",
        message: "Resend returned no email ID",
      });
    return { providerMessageId: data.id };
  }
}
