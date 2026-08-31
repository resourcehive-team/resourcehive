import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { NotificationConfigurationModule } from "./config/notification-configuration.module";
import { HealthModule } from "./health/health.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { DeviceModule } from "./devices/device.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    PrismaModule,
    ServiceAuthModule,
    NotificationConfigurationModule,
    HealthModule,
    DeliveryModule,
    DeviceModule,
    NotificationsModule,
  ],
})
export class AppModule {}
