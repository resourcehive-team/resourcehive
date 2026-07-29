import { Module } from "@nestjs/common";
import { PointLedgerRepository } from "./point-ledger.repository";
import { PointLedgerService } from "./point-ledger.service";

@Module({
  providers: [PointLedgerRepository, PointLedgerService],
  exports: [PointLedgerRepository, PointLedgerService],
})
export class PointsModule {}
