import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [PrismaModule, ServiceAuthModule, HealthModule, NotificationsModule],
})
export class AppModule {}
