import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { HealthModule } from "./health/health.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { KafkaModule } from "./kafka/kafka.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    PrismaModule,
    ServiceAuthModule,
    HealthModule,
    DeliveryModule,
    KafkaModule,
    NotificationsModule,
  ],
})
export class AppModule {}
