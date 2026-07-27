import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { HealthModule } from "./health/health.module";
import { SlotsModule } from "./slots/slots.module";

@Module({
  imports: [PrismaModule, HealthModule, SlotsModule],
})
export class AppModule {}
