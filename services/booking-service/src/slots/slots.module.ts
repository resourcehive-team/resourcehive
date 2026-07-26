import { Module } from "@nestjs/common";
import { SlotRepository } from "./slot.repository";

@Module({
  providers: [SlotRepository],
  exports: [SlotRepository],
})
export class SlotsModule {}
