import { Module } from "@nestjs/common";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { PointsModule } from "../points/points.module";
import { SlotsModule } from "../slots/slots.module";
import { BookingValidationService } from "./booking-validation.service";

@Module({
  imports: [BookingAuthorizationModule, SlotsModule, PointsModule],
  providers: [BookingValidationService],
  exports: [BookingValidationService],
})
export class BookingsModule {}
