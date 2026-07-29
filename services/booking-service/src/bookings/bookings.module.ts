import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { PointsModule } from "../points/points.module";
import { SlotsModule } from "../slots/slots.module";
import { BookingCreationService } from "./booking-creation.service";
import { BookingRepository } from "./booking.repository";
import { BookingValidationService } from "./booking-validation.service";
import { BookingsController } from "./bookings.controller";

@Module({
  imports: [
    ServiceAuthModule,
    BookingAuthorizationModule,
    SlotsModule,
    PointsModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingCreationService,
    BookingRepository,
    BookingValidationService,
  ],
  exports: [BookingCreationService, BookingValidationService],
})
export class BookingsModule {}
