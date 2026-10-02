import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma, WorkerPrismaService } from "@resourcehive/database";
import {
  NotificationCommandV1,
  parseNotificationCommand,
} from "@resourcehive/notification-client";
import { NotificationTemplateService } from "./notification-template.service";

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
    private readonly prisma: WorkerPrismaService,
    private readonly templates: NotificationTemplateService,
  ) {}

  async process(input: unknown): Promise<NotificationProcessingResult> {
    const command = parseNotificationCommand(input);
    if (!command.recipient.userId) {
      throw new UnauthorizedException(
        "Notification commands currently require a ResourceHive user",
      );
    }
    if (
      (command.channels.includes("IN_APP") ||
        command.channels.includes("PUSH")) &&
      !command.rootOrganizationId
    ) {
      throw new UnauthorizedException(
        "Tenant notifications require a university context",
      );
    }
    const result = await this.prisma.$transaction((transaction) =>
      this.processWithinTransaction(command, transaction),
    );
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

    if (command.rootOrganizationId) {
      const membership = await transaction.organizationMembership.findFirst({
        where: {
          userId: user.id,
          status: "APPROVED",
          organization: {
            rootOrganizationId: command.rootOrganizationId,
            status: "ACTIVE",
            rootOrganization: { status: "ACTIVE" },
          },
        },
        select: { id: true },
      });
      if (!membership) {
        throw new UnauthorizedException(
          "Recipient is not a member of this university",
        );
      }
    }

    const rendered = this.templates.render(command);
    const createsNotification =
      command.channels.includes("IN_APP") || command.channels.includes("PUSH");
    const notification = createsNotification
      ? await transaction.notification.create({
          data: {
            userId: user.id,
            rootOrganizationId: command.rootOrganizationId ?? null,
            type: rendered.type,
            title: rendered.title,
            message: rendered.message,
            data: command.template.variables,
          },
        })
      : null;

    const deliveries: Prisma.NotificationDeliveryCreateManyInput[] = [];
    if (command.channels.includes("EMAIL")) {
      deliveries.push({
        userId: user.id,
        rootOrganizationId: command.rootOrganizationId ?? null,
        channel: "EMAIL",
        destination: command.recipient.email ?? user.email,
        subject: rendered.emailSubject,
        body: rendered.emailText,
      });
    }
    if (command.channels.includes("PUSH")) {
      const subscriptions = await transaction.webPushSubscription.findMany({
        where: {
          userId: user.id,
          rootOrganizationId: command.rootOrganizationId ?? null,
          active: true,
        },
        select: { token: true },
      });
      deliveries.push(
        ...subscriptions.map(({ token }) => ({
          userId: user.id,
          rootOrganizationId: command.rootOrganizationId ?? null,
          notificationId: notification?.id,
          channel: "PUSH",
          destination: token,
          subject: rendered.title,
          body: rendered.message,
          data: notification ? { notificationId: notification.id } : {},
        })),
      );
    }
    if (deliveries.length > 0) {
      await transaction.notificationDelivery.createMany({ data: deliveries });
    }

    return {
      duplicate: false,
      notificationId: notification?.id,
      notification: notification
        ? {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
          }
        : undefined,
    };
  }
}
