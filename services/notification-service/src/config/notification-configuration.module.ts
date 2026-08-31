import { Module } from "@nestjs/common";
import { NotificationConfigurationService } from "./notification-configuration.service";

@Module({
  providers: [NotificationConfigurationService],
  exports: [NotificationConfigurationService],
})
export class NotificationConfigurationModule {}
