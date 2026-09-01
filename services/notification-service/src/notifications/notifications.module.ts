import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { NotificationRepository } from "./notification.repository";
import { NotificationReadService } from "./notification-read.service";
import { NotificationsController } from "./notifications.controller";
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
    NotificationReadService,
    NotificationCommandService,
    NotificationTemplateService,
    BookingEventService,
    DevelopmentPushService,
  ],
  exports: [NotificationReadService],
})
export class NotificationsModule {}
