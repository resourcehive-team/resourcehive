import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { NotificationCommandV1, parseNotificationCommand } from "../contracts";
import { NotificationTemplateService } from "./notification-template.service";

const CONSUMER_NAME = "notification-command-consumer-v1";

export interface NotificationProcessingResult {
  duplicate: boolean;
  notificationId?: string;
}

@Injectable()
export class NotificationCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: NotificationTemplateService,
  ) {}

  process(input: unknown): Promise<NotificationProcessingResult> {
    const command = parseNotificationCommand(input);
    if (!command.recipient.userId) {
      throw new UnauthorizedException(
        "Notification commands currently require a ResourceHive user",
      );
    }
    return this.prisma.$transaction((transaction) =>
      this.processWithinTransaction(command, transaction),
    );
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
    if (deliveries.length > 0) {
      await transaction.notificationDelivery.createMany({
        data: deliveries,
        skipDuplicates: true,
      });
    }

    return { duplicate: false, notificationId: notification.id };
  }
}
