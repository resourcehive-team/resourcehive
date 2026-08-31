import { Module } from "@nestjs/common";
import { ServiceAuthModule } from "@resourcehive/service-auth";
import { DeviceController } from "./device.controller";
import { DeviceRepository } from "./device.repository";
import { DeviceService } from "./device.service";

@Module({
  imports: [ServiceAuthModule],
  controllers: [DeviceController],
  providers: [DeviceRepository, DeviceService],
})
export class DeviceModule {}
