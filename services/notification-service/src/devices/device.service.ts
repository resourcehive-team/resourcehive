import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { DeviceRepository } from "./device.repository";

@Injectable()
export class DeviceService {
  constructor(private readonly devices: DeviceRepository) {}
  async register(userId: string, input: RegisterDeviceDto) {
    const installationId = input.installationId.trim();
    const existing = await this.devices.findByInstallationId(installationId);
    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        "Device registration belongs to another user",
      );
    }
    const device = existing
      ? await this.devices.update(existing.id, {
          identifierType: input.identifierType,
          platform: input.platform,
          appVersion: input.appVersion,
        })
      : await this.devices.create(userId, { ...input, installationId });
    return this.view(device);
  }
  async list(userId: string) {
    return (await this.devices.list(userId)).map((device) => this.view(device));
  }
  async remove(id: string, userId: string) {
    if (!(await this.devices.remove(id, userId)))
      throw new NotFoundException("Device not found");
    return { removed: true };
  }
  private view(device: {
    id: string;
    identifierType: string;
    platform: string;
    status: string;
    appVersion: string | null;
    lastRegisteredAt: Date;
  }) {
    return {
      id: device.id,
      identifierType: device.identifierType,
      platform: device.platform,
      status: device.status,
      appVersion: device.appVersion,
      lastRegisteredAt: device.lastRegisteredAt,
    };
  }
}
