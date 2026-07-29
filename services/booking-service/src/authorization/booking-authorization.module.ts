import { Module } from "@nestjs/common";
import { BookingAuthorizationService } from "./booking-authorization.service";

@Module({
  providers: [BookingAuthorizationService],
  exports: [BookingAuthorizationService],
})
export class BookingAuthorizationModule {}
