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
    const token = input.token.trim();
    const existing = await this.devices.findByToken(token);
    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        "Device registration belongs to another user",
      );
    }
    const device = existing
      ? await this.devices.update(existing.id, input.platform)
      : await this.devices.create(userId, { token, platform: input.platform });
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
    platform: string;
    active: boolean;
    updatedAt: Date;
  }) {
    return {
      id: device.id,
      platform: device.platform,
      active: device.active,
      updatedAt: device.updatedAt,
    };
  }
}
