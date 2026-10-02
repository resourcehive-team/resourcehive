import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { NotificationClientModule } from "@resourcehive/notification-client";
import { BookingNotificationService } from "./booking-notification.service";

@Module({
  imports: [
    PrismaModule,
    NotificationClientModule.register({ producer: "booking-service" }),
  ],
  providers: [BookingNotificationService],
  exports: [BookingNotificationService],
})
export class BookingNotificationsModule {}
