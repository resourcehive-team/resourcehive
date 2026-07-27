import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [PrismaModule, HealthModule, NotificationsModule],
})
export class AppModule {}
