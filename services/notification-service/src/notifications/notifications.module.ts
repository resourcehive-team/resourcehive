import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { NotificationPersistenceService } from "./notification-persistence.service";
import { NotificationRepository } from "./notification.repository";
import { NotificationReadService } from "./notification-read.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationGateway } from "../websocket/notification.gateway";
import { NotificationCommandService } from "../events/notification-command.service";
import { NotificationEventController } from "../events/notification-event.controller";
import { NotificationTemplateService } from "../events/notification-template.service";
import { BookingEventService } from "../events/booking-event.service";
import { DevelopmentPushService } from "./development-push.service";

@Module({
  imports: [ServiceAuthModule],
  controllers: [NotificationsController, NotificationEventController],
  providers: [
    NotificationRepository,
    NotificationPersistenceService,
    NotificationReadService,
    NotificationGateway,
    NotificationCommandService,
    NotificationTemplateService,
    BookingEventService,
    DevelopmentPushService,
  ],
  exports: [NotificationPersistenceService, NotificationReadService],
})
export class NotificationsModule {}
