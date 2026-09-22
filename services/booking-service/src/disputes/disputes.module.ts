import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { DisputeRepository } from "./dispute.repository";
import { DisputeService } from "./dispute.service";
import { DisputesController } from "./disputes.controller";

@Module({
  imports: [ServiceAuthModule],
  controllers: [DisputesController],
  providers: [DisputeService, DisputeRepository],
})
export class DisputesModule {}
