import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { PointsModule } from "../points/points.module";
import { SlotsModule } from "../slots/slots.module";
import { BookingService } from "./booking.service";
import { BookingRepository } from "./booking.repository";
import { BookingsController } from "./bookings.controller";

@Module({
  imports: [
    ServiceAuthModule,
    BookingAuthorizationModule,
    SlotsModule,
    PointsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingService, BookingRepository],
  exports: [BookingService],
})
export class BookingsModule {}
