import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { Resend } from "resend";

const statusByEvent: Record<string, string> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "SENT",
  "email.failed": "FAILED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  "email.suppressed": "SUPPRESSED",
};
const terminal = new Set([
  "DELIVERED",
  "FAILED",
  "BOUNCED",
  "COMPLAINED",
  "SUPPRESSED",
]);

export function deliveryStatusForResendEvent(type: string): string | undefined {
  return statusByEvent[type];
}

@Injectable()
export class ResendWebhookService {
  private readonly resend = new Resend(
    process.env.RESEND_API_KEY ?? "re_webhook_verifier",
  );
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    rawBody: Buffer,
    headers: { id: string; timestamp: string; signature: string },
  ) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret)
      throw new UnauthorizedException("Resend webhook is not configured");
    let verified: unknown;
    try {
      verified = this.resend.webhooks.verify({
        payload: rawBody.toString("utf8"),
        headers,
        webhookSecret: secret,
      });
    } catch {
      throw new UnauthorizedException("Invalid Resend webhook signature");
    }
    const event = verified as {
      type: string;
      created_at: string;
      data?: { email_id?: string };
    };
    const providerMessageId = event.data?.email_id;
    const status = deliveryStatusForResendEvent(event.type);
    await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.providerWebhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: "RESEND",
            providerEventId: headers.id,
          },
        },
      });
      if (duplicate) return;
      await tx.providerWebhookEvent.create({
        data: {
          provider: "RESEND",
          providerEventId: headers.id,
          providerMessageId,
          eventType: event.type,
          occurredAt: new Date(event.created_at),
        },
      });
      if (!providerMessageId || !status) return;
      const delivery = await tx.notificationDelivery.findFirst({
        where: { provider: "RESEND", providerMessageId },
      });
      if (!delivery || terminal.has(delivery.status)) return;
      await tx.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          ...(status === "SENT" ? { sentAt: new Date(event.created_at) } : {}),
          ...(status === "DELIVERED"
            ? { deliveredAt: new Date(event.created_at) }
            : {}),
        },
      });
    });
    return { received: true };
  }
}
