import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { PointsModule } from "../points/points.module";
import { SlotsModule } from "../slots/slots.module";
import { BookingCreationService } from "./booking-creation.service";
import { BookingCompletionService } from "./booking-completion.service";
import { BookingCancellationService } from "./booking-cancellation.service";
import { BookingReadService } from "./booking-read.service";
import { BookingValidationService } from "./booking-validation.service";
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
  providers: [
    BookingCreationService,
    BookingCompletionService,
    BookingCancellationService,
    BookingReadService,
    BookingValidationService,
    BookingRepository,
  ],
  exports: [BookingCreationService, BookingValidationService],
})
export class BookingsModule {}
