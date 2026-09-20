import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { BookingAuthorizationModule } from "../authorization/booking-authorization.module";
import { SlotsModule } from "../slots/slots.module";
import { DisputeRepository } from "./dispute.repository";
import { DisputeService } from "./dispute.service";
import { DisputesController } from "./disputes.controller";

@Module({
  imports: [ServiceAuthModule, BookingAuthorizationModule, SlotsModule],
  controllers: [DisputesController],
  providers: [DisputeService, DisputeRepository],
})
export class DisputesModule {}
