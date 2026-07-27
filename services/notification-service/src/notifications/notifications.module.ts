import { Module } from "@nestjs/common";
import { NotificationPersistenceService } from "./notification-persistence.service";
import { NotificationRepository } from "./notification.repository";

@Module({
  providers: [NotificationRepository, NotificationPersistenceService],
  exports: [NotificationPersistenceService],
})
export class NotificationsModule {}
