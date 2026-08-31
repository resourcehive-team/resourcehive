import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import {
  NOTIFICATION_TOPICS,
  NotificationCommandV1,
  parseNotificationCommand,
} from "../contracts";
import { NotificationTemplateService } from "./notification-template.service";
import { NotificationGateway } from "../websocket/notification.gateway";

const CONSUMER_NAME = "notification-command-consumer-v1";

export interface NotificationProcessingResult {
  duplicate: boolean;
  notificationId?: string;
  notification?: {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: Date;
  };
}

@Injectable()
export class NotificationCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: NotificationTemplateService,
    private readonly gateway: NotificationGateway,
  ) {}

  async process(input: unknown): Promise<NotificationProcessingResult> {
    const command = parseNotificationCommand(input);
    if (!command.recipient.userId) {
      throw new UnauthorizedException(
        "Notification commands currently require a ResourceHive user",
      );
    }
    const result = await this.prisma.$transaction((transaction) =>
      this.processWithinTransaction(command, transaction),
    );
    if (!result.duplicate && result.notification) {
      this.gateway.emitCreated(command.recipient.userId, result.notification);
    }
    return result;
  }

  private async processWithinTransaction(
    command: NotificationCommandV1,
    transaction: Prisma.TransactionClient,
  ): Promise<NotificationProcessingResult> {
    const claimed = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        INSERT INTO processed_events (event_id, consumer_name)
        VALUES (${command.commandId}::uuid, ${CONSUMER_NAME})
        ON CONFLICT (event_id, consumer_name) DO NOTHING
        RETURNING id
      `,
    );
    if (claimed.length === 0) return { duplicate: true };

    const user = await transaction.user.findFirst({
      where: { id: command.recipient.userId, status: "ACTIVE" },
      select: { id: true, email: true },
    });
    if (!user)
      throw new UnauthorizedException("An active recipient is required");

    const rendered = this.templates.render(command);
    const notification = await transaction.notification.create({
      data: {
        userId: user.id,
        type: rendered.type,
        title: rendered.title,
        message: rendered.message,
        data: command.template.variables,
        dedupeKey: command.idempotencyKey,
        sourceEventId: command.commandId,
      },
    });

    const deliveries: Prisma.NotificationDeliveryCreateManyInput[] = [];
    if (command.channels.includes("EMAIL")) {
      deliveries.push({
        notificationId: notification.id,
        channel: "EMAIL",
        provider: "RESEND",
        destination: command.recipient.email ?? user.email,
      });
    }
    if (command.channels.includes("PUSH")) {
      const devices = await transaction.userDevice.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        select: { installationId: true },
      });
      deliveries.push(
        ...devices.map(({ installationId }) => ({
          notificationId: notification.id,
          channel: "PUSH",
          provider: "FCM",
          destination: installationId,
        })),
      );
    }
    for (const delivery of deliveries) {
      const created = await transaction.notificationDelivery.create({
        data: delivery,
      });
      await transaction.outboxEvent.create({
        data: {
          topic: NOTIFICATION_TOPICS.deliveryJobs,
          partitionKey: created.id,
          eventType: "notification.delivery.requested",
          producer: "notification-service",
          correlationId: command.correlationId,
          payload: {
            kind: "notification.delivery-job",
            deliveryId: created.id,
            occurredAt: new Date().toISOString(),
          },
          occurredAt: new Date(),
        },
      });
    }

    return {
      duplicate: false,
      notificationId: notification.id,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
    };
  }
}
