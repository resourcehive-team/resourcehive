import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { NotificationRepository } from "./notification.repository";
import { NotificationRecord, NotificationView } from "./notification.types";

@Injectable()
export class NotificationReadService {
  constructor(private readonly repository: NotificationRepository) {}

  async list(
    user: AuthenticatedUser,
    query: ListNotificationsDto,
  ): Promise<NotificationView[]> {
    await this.assertActive(user.userId);
    const notifications = await this.repository.findManyForUser({
      userId: user.userId,
      ...query,
    });
    return notifications.map((notification) => this.toView(notification));
  }

  async findOne(
    notificationId: string,
    user: AuthenticatedUser,
  ): Promise<NotificationView> {
    await this.assertActive(user.userId);
    const notification = await this.repository.findByIdForUser({
      notificationId,
      userId: user.userId,
    });
    if (!notification) throw new NotFoundException("Notification not found");
    return this.toView(notification);
  }

  async markRead(
    notificationId: string,
    user: AuthenticatedUser,
  ): Promise<NotificationView> {
    await this.assertActive(user.userId);
    const notification = await this.repository.markReadForUser({
      notificationId,
      userId: user.userId,
    });
    if (!notification) throw new NotFoundException("Notification not found");
    return this.toView(notification);
  }

  async markAllRead(
    user: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    await this.assertActive(user.userId);
    return {
      updatedCount: await this.repository.markAllReadForUser(user.userId),
    };
  }

  private async assertActive(userId: string): Promise<void> {
    if (!(await this.repository.isActiveUser(userId))) {
      throw new UnauthorizedException("An active account is required");
    }
  }

  private toView(notification: NotificationRecord): NotificationView {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
