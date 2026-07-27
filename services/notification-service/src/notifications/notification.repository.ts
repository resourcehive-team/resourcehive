import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import {
  CreateNotificationInput,
  NotificationLookup,
  NotificationRecord,
} from "./notification.types";

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput): Promise<NotificationRecord> {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });
  }

  findByIdForUser({
    notificationId,
    userId,
  }: NotificationLookup): Promise<NotificationRecord | null> {
    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}
