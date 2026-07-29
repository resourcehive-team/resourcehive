import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { NotificationPersistenceService } from "./notification-persistence.service";
import { NotificationRepository } from "./notification.repository";
import { NotificationReadService } from "./notification-read.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationGateway } from "../websocket/notification.gateway";

@Module({
  imports: [ServiceAuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationPersistenceService,
    NotificationReadService,
    NotificationGateway,
  ],
  exports: [NotificationPersistenceService, NotificationReadService],
})
export class NotificationsModule {}
