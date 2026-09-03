import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { NOTIFICATION_TEMPLATES } from "@resourcehive/notification-client";
import { NotificationCommandService } from "../events/notification-command.service";

@Injectable()
export class DevelopmentPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: NotificationCommandService,
  ) {}

  async queue(userId: string): Promise<{
    notificationId?: string;
    pushDeliveriesQueued: number;
  }> {
    if (process.env.NODE_ENV === "production") {
      throw new NotFoundException();
    }
    if (process.env.FCM_ENABLED !== "true") {
      throw new BadRequestException(
        "FCM_ENABLED must be true to send a local test push",
      );
    }

    const pushDeliveriesQueued = await this.prisma.webPushSubscription.count({
      where: { userId, active: true },
    });
    if (pushDeliveriesQueued === 0) {
      throw new BadRequestException(
        "Enable browser notifications before sending a test push",
      );
    }

    const commandId = randomUUID();
    const result = await this.commands.process({
      kind: "notification.command",
      commandId,
      producer: "notification-service",
      recipient: { userId },
      channels: ["IN_APP", "PUSH"],
      template: {
        key: NOTIFICATION_TEMPLATES.developmentTestPush,
        version: 1,
        variables: {},
      },
      correlationId: commandId,
      occurredAt: new Date().toISOString(),
    });

    return {
      notificationId: result.notificationId,
      pushDeliveriesQueued,
    };
  }
}
