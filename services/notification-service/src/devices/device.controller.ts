import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { DeviceService } from "./device.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";

@ApiTags("notification devices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications/devices")
export class DeviceController {
  constructor(private readonly devices: DeviceService) {}
  @Post()
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: RegisterDeviceDto,
  ) {
    return this.devices.register(user.userId, input);
  }
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.devices.list(user.userId);
  }
  @Delete(":deviceId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId", ParseUUIDPipe) id: string,
  ) {
    return this.devices.remove(id, user.userId);
  }
}
