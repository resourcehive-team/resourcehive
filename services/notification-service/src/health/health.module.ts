import { Module } from "@nestjs/common";
import { NotificationConfigurationModule } from "../config/notification-configuration.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [NotificationConfigurationModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
