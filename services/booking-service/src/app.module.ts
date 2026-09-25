import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "@resourcehive/database";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "./authorization/booking-authorization.module";
import { BookingsModule } from "./bookings/bookings.module";
import { HealthModule } from "./health/health.module";
import { PointsModule } from "./points/points.module";
import { SlotsModule } from "./slots/slots.module";
import { createKeyv } from "@keyv/redis";

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (): {
        ttl: number;
        stores?: ReturnType<typeof createKeyv>[];
      } => {
        const host = process.env.REDIS_HOST || "redis";
        const port = process.env.REDIS_PORT || 6379;

        if (process.env.NODE_ENV === "test") {
          return { ttl: 600000 };
        }

        return {
          stores: [createKeyv(`redis://${host}:${port}`)],
          ttl: 600000, // 10 minutes default ttl
        };
      },
    }),
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
