import { Module } from "@nestjs/common";
import { PrismaModule } from "@resourcehive/database";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}
