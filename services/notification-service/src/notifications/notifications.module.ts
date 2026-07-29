import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { NotificationPersistenceService } from "./notification-persistence.service";
import { NotificationRepository } from "./notification.repository";
import { NotificationReadService } from "./notification-read.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [ServiceAuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationPersistenceService,
    NotificationReadService,
  ],
  exports: [NotificationPersistenceService, NotificationReadService],
})
export class NotificationsModule {}
