import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { NOTIFICATION_TOPICS } from "../contracts";
import { getNotificationKafkaConfig } from "../kafka/kafka.config";

@Injectable()
export class RetrySchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (!getNotificationKafkaConfig().enabled) return;
    this.timer = setInterval(() => void this.enqueueDue(), 15_000);
    this.timer.unref();
  }

  async enqueueDue(): Promise<void> {
    const due = await this.prisma.notificationDelivery.findMany({
      where: { status: "RETRY_SCHEDULED", nextAttemptAt: { lte: new Date() } },
      select: { id: true, notification: { select: { sourceEventId: true } } },
      take: 50,
    });
    for (const delivery of due) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.notificationDelivery.updateMany({
          where: { id: delivery.id, status: "RETRY_SCHEDULED" },
          data: { status: "QUEUED", nextAttemptAt: null },
        });
        if (claimed.count !== 1) return;
        await tx.outboxEvent.create({
          data: {
            topic: NOTIFICATION_TOPICS.deliveryJobs,
            partitionKey: delivery.id,
            eventType: "notification.delivery.requested",
            producer: "notification-service",
            correlationId: delivery.notification.sourceEventId ?? randomUUID(),
            payload: { deliveryId: delivery.id },
            occurredAt: new Date(),
          },
        });
      });
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
