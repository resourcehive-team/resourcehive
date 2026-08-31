import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";

@Injectable()
export class DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claim(id: string) {
    const now = new Date();
    const result = await this.prisma.notificationDelivery.updateMany({
      where: {
        id,
        OR: [
          { status: "QUEUED" },
          { status: "RETRY_SCHEDULED", nextAttemptAt: { lte: now } },
        ],
      },
      data: {
        status: "PROCESSING",
        attemptCount: { increment: 1 },
      },
    });
    if (result.count !== 1) return null;
    return this.prisma.notificationDelivery.findUnique({ where: { id } });
  }

  complete(id: string, providerMessageId?: string, scrubContent = false) {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: "SENT",
        providerMessageId,
        nextAttemptAt: null,
        lastError: null,
        ...(scrubContent ? { subject: null, body: null, data: {} } : {}),
      },
    });
  }

  fail(
    id: string,
    decision: ReturnType<typeof import("./retry-policy").decideRetry>,
  ) {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: decision.retry ? "RETRY_SCHEDULED" : "FAILED",
        nextAttemptAt: decision.nextAttemptAt,
        lastError: `${decision.code}: ${decision.message}`.slice(0, 1000),
      },
    });
  }

  findDue(limit = 50) {
    const now = new Date();
    return this.prisma.notificationDelivery.findMany({
      where: {
        OR: [
          { status: "QUEUED" },
          { status: "RETRY_SCHEDULED", nextAttemptAt: { lte: now } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  requeueStale() {
    return this.prisma.notificationDelivery.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      },
      data: { status: "QUEUED" },
    });
  }
}
