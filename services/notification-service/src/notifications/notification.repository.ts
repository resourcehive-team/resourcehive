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
        rootOrganizationId: input.rootOrganizationId,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });
  }

  findByIdForUser({
    notificationId,
    userId,
    rootOrganizationId,
  }: NotificationLookup): Promise<NotificationRecord | null> {
    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        rootOrganizationId,
      },
    });
  }

  findManyForUser(query: NotificationListQuery): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: query.userId,
        rootOrganizationId: query.rootOrganizationId,
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
    rootOrganizationId,
  }: NotificationLookup): Promise<NotificationRecord | null> {
    const owned = await this.findByIdForUser({
      notificationId,
      userId,
      rootOrganizationId,
    });
    if (!owned) return null;
    if (owned.readAt) return owned;
    return this.prisma.notification.update({
      where: { id: owned.id },
      data: { readAt: new Date() },
    });
  }

  async markUnreadForUser({
    notificationId,
    userId,
    rootOrganizationId,
  }: NotificationLookup): Promise<NotificationRecord | null> {
    const owned = await this.findByIdForUser({
      notificationId,
      userId,
      rootOrganizationId,
    });
    if (!owned) return null;
    if (!owned.readAt) return owned;
    return this.prisma.notification.update({
      where: { id: owned.id },
      data: { readAt: null },
    });
  }

  async markAllReadForUser(
    userId: string,
    rootOrganizationId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, rootOrganizationId, readAt: null },
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

  registerWebPush(userId: string, rootOrganizationId: string, token: string) {
    return this.prisma.webPushSubscription.upsert({
      where: { rootOrganizationId_token: { rootOrganizationId, token } },
      create: { userId, rootOrganizationId, token },
      update: { userId, active: true },
    });
  }

  listWebPush(userId: string, rootOrganizationId: string) {
    return this.prisma.webPushSubscription.findMany({
      where: { userId, rootOrganizationId, active: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async removeWebPush(
    id: string,
    userId: string,
    rootOrganizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.webPushSubscription.updateMany({
      where: { id, userId, rootOrganizationId },
      data: { active: false },
    });
    return result.count === 1;
  }
}
