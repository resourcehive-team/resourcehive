import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "./authorization/booking-authorization.module";
import { BookingsModule } from "./bookings/bookings.module";
import { HealthModule } from "./health/health.module";
import { PointsModule } from "./points/points.module";
import { SlotsModule } from "./slots/slots.module";

@Module({
  imports: [
    PrismaModule,
    ServiceAuthModule,
    BookingAuthorizationModule,
    BookingsModule,
    HealthModule,
    SlotsModule,
    PointsModule,
  ],
})
export class AppModule {}
