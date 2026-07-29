import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { SlotRepository } from "./slot.repository";
import { SlotsController } from "./slots.controller";
import { SlotsService } from "./slots.service";

@Module({
  imports: [ServiceAuthModule, BookingAuthorizationModule],
  controllers: [SlotsController],
  providers: [SlotRepository, SlotsService],
  exports: [SlotRepository, SlotsService],
})
export class SlotsModule {}
