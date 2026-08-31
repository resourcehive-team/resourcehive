import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";

@Injectable()
export class DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claim(id: string, workerId: string) {
    const result = await this.prisma.notificationDelivery.updateMany({
      where: {
        id,
        status: { in: ["QUEUED", "RETRY_SCHEDULED"] },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: new Date() } }],
      },
      data: {
        status: "PROCESSING",
        leaseOwner: workerId,
        leaseExpiresAt: new Date(Date.now() + 60_000),
        attemptCount: { increment: 1 },
      },
    });
    if (result.count !== 1) return null;
    return this.prisma.notificationDelivery.findUnique({
      where: { id },
      include: { notification: true },
    });
  }

  async complete(
    id: string,
    attempt: number,
    status: "ACCEPTED" | "SENT",
    providerMessageId?: string,
  ) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.notificationDelivery.update({
        where: { id },
        data: {
          status,
          providerMessageId,
          leaseOwner: null,
          leaseExpiresAt: null,
          nextAttemptAt: null,
          acceptedAt: now,
          ...(status === "SENT" ? { sentAt: now } : {}),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      }),
      this.prisma.notificationDeliveryAttempt.create({
        data: {
          deliveryId: id,
          attemptNumber: attempt,
          outcome: status,
          providerResponseCode: providerMessageId,
          finishedAt: now,
        },
      }),
    ]);
  }

  async fail(
    id: string,
    attempt: number,
    decision: ReturnType<typeof import("./retry-policy").decideRetry>,
  ) {
    await this.prisma.$transaction([
      this.prisma.notificationDelivery.update({
        where: { id },
        data: {
          status: decision.retry ? "RETRY_SCHEDULED" : "FAILED",
          nextAttemptAt: decision.nextAttemptAt,
          lastErrorCode: decision.code,
          lastErrorMessage: decision.message.slice(0, 1000),
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      }),
      this.prisma.notificationDeliveryAttempt.create({
        data: {
          deliveryId: id,
          attemptNumber: attempt,
          outcome: decision.retry ? "RETRY_SCHEDULED" : "FAILED",
          errorMessage: decision.message.slice(0, 1000),
          providerResponseCode: decision.code,
          finishedAt: new Date(),
        },
      }),
    ]);
  }
}
