import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import {
  CreateNotificationInput,
  NotificationListQuery,
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

  findManyForUser(query: NotificationListQuery): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: query.userId,
        ...(query.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: query.skip ?? 0,
      take: query.take ?? 50,
    });
  }

  async markReadForUser({
    notificationId,
    userId,
  }: NotificationLookup): Promise<NotificationRecord | null> {
    const owned = await this.findByIdForUser({ notificationId, userId });
    if (!owned) return null;
    if (owned.readAt) return owned;
    return this.prisma.notification.update({
      where: { id: owned.id },
      data: { readAt: new Date() },
    });
  }

  async markAllReadForUser(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async isActiveUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(user);
  }
}
